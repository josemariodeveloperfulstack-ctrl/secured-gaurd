package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.PasswordResetToken;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.PasswordResetTokenRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    /**
     * Inicia processo de recuperação de senha
     */
    public boolean requestPasswordReset(String email, String ipAddress, String userAgent) {
        log.info("📧 Solicitação de recuperação de senha para: {}", email);

        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Por segurança, não revelar se o email existe ou não
            log.warn("⚠️ Email não encontrado, mas retornando sucesso por segurança: {}", email);
            return true;
        }

        User user = userOpt.get();

        // Invalidar tokens antigos
        tokenRepository.expireAllUserTokens(user.getId());

        // Gerar novo token
        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .email(email)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

        PasswordResetToken saved = tokenRepository.save(resetToken);

        // Enviar email com link de reset
        String resetLink = String.format("%s/reset-password?token=%s", appUrl, token);
        boolean sent = sendPasswordResetEmail(email, user.getName(), resetLink, token);

        if (!sent) {
            log.error("❌ Falha ao enviar email de recuperação para: {}", email);
            saved.markAsExpired();
            tokenRepository.save(saved);
            return false;
        }

        log.info("✅ Email de recuperação enviado para: {}", email);
        return true;
    }

    /**
     * Valida token de reset
     */
    public boolean validateToken(String token) {
        var tokenOpt = tokenRepository.findValidToken(token, LocalDateTime.now());
        return tokenOpt.isPresent();
    }

    /**
     * Reseta a senha usando o token
     */
    public boolean resetPassword(String token, String newPassword) {
        log.info("🔑 Tentando resetar senha com token");

        var tokenOpt = tokenRepository.findValidToken(token, LocalDateTime.now());
        if (tokenOpt.isEmpty()) {
            log.warn("❌ Token inválido ou expirado");
            return false;
        }

        PasswordResetToken resetToken = tokenOpt.get();
        User user = resetToken.getUser();

        // Validar força da senha
        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Senha deve ter pelo menos 6 caracteres");
        }

        boolean isCpfDefault = newPassword.matches("^\\d{11}@2025$");
        if (!isCpfDefault && !newPassword.matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*$")) {
            throw new IllegalArgumentException(
                "Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial"
            );
        }

        // Atualizar senha
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setLastPasswordChange(LocalDateTime.now());
        user.setRequirePasswordChange(false);
        userRepository.save(user);

        // Marcar token como usado
        resetToken.markAsUsed();
        tokenRepository.save(resetToken);

        log.info("✅ Senha resetada com sucesso para usuário {}", user.getId());
        return true;
    }

    /**
     * Envia email de recuperação de senha
     */
    private boolean sendPasswordResetEmail(String email, String userName, String resetLink, String token) {
        String subject = "🔑 Recuperação de Senha - Secured Guard";
        String htmlBody = String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                        .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
                        .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px; margin: 10px 0; }
                        .token { font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 5px; word-break: break-all; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔑 Recuperação de Senha</h1>
                            <p>Secured Guard</p>
                        </div>
                        <div class="content">
                            <p>Olá, <strong>%s</strong>!</p>
                            <p>Você solicitou a recuperação de senha da sua conta no Secured Guard.</p>
                            <p>Clique no botão abaixo para criar uma nova senha:</p>
                            <div style="text-align: center;">
                                <a href="%s" class="button">Redefinir Senha</a>
                            </div>
                            <p>Ou copie e cole este link no seu navegador:</p>
                            <div class="token">%s</div>
                            <div class="warning">
                                <p><strong>⏰ Importante:</strong></p>
                                <ul style="margin: 5px 0;">
                                    <li>Este link expira em <strong>1 hora</strong></li>
                                    <li>Use-o apenas uma vez</li>
                                    <li>Não compartilhe com ninguém</li>
                                </ul>
                            </div>
                            <p>Se você não solicitou a recuperação de senha, ignore este email. Sua senha atual permanecerá ativa.</p>
                        </div>
                        <div class="footer">
                            <p>Secured Guard &copy; 2025 - Sistema de Gestão de Segurança</p>
                            <p>Este é um email automático. Não responda.</p>
                        </div>
                    </div>
                </body>
                </html>
                """, userName, resetLink, resetLink);

        return emailService.sendEmailWithAttachment(email, subject, htmlBody, null, null);
    }

    /**
     * Limpa tokens expirados (executar via scheduler)
     */
    public void cleanupExpiredTokens() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        tokenRepository.deleteExpiredTokens(cutoff);
        log.info("🧹 Tokens de reset expirados removidos");
    }
}

