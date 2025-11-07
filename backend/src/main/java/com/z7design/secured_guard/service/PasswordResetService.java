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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final BaileysRestService baileysRestService;
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
     * Versão melhorada com suporte a WhatsApp
     */
    public Map<String, Object> requestPasswordReset(String contact, String deliveryMethod, String ipAddress, String userAgent) {
        log.info("📧 Solicitação de recuperação de senha para: {} via {}", contact, deliveryMethod);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);

        boolean isWhatsapp = "whatsapp".equalsIgnoreCase(deliveryMethod);
        User user;
        if (isWhatsapp) {
            String normalized = contact != null ? contact.replaceAll("[^0-9]", "") : "";
            if (normalized.isEmpty()) {
                log.warn("⚠️ Nenhum número de WhatsApp informado");
                result.put("success", false);
                result.put("warning", "Informe o número de WhatsApp com DDD (somente números).");
                return result;
            }

            var userOpt = userRepository.findByWhatsapp(normalized);
            if (userOpt.isEmpty() && normalized.startsWith("55")) {
                String withoutCountry = normalized.substring(2);
                userOpt = userRepository.findByWhatsapp(withoutCountry);
            } else if (userOpt.isEmpty() && normalized.length() >= 10) {
                userOpt = userRepository.findByWhatsapp("55" + normalized);
            }

            if (userOpt.isEmpty()) {
                log.warn("⚠️ Nenhum usuário encontrado com WhatsApp {}", normalized);
                result.put("success", false);
                result.put("warning", "Não encontramos um cadastro com este número de WhatsApp. Verifique o número (DDI + DDD) ou escolha a opção de email.");
                return result;
            }

            user = userOpt.get();

            if (user.getWhatsapp() == null || user.getWhatsapp().trim().isEmpty()) {
                log.warn("⚠️ Usuário {} não possui WhatsApp cadastrado", user.getEmail());
                result.put("success", false);
                result.put("warning", "Seu cadastro não possui WhatsApp registrado. Use a opção de Email ou solicite ao administrador que atualize seus dados de contato.");
                return result;
            }
            if (user.getWhatsappConsent() == null || !user.getWhatsappConsent()) {
                log.warn("⚠️ Usuário {} não autorizou recebimento via WhatsApp", user.getEmail());
                result.put("success", false);
                result.put("warning", "Seu usuário ainda não autorizou o recebimento de notificações via WhatsApp. Use a opção de Email ou peça ao administrador para registrar o consentimento.");
                return result;
            }
        } else {
            var userOpt = userRepository.findByEmail(contact);
            if (userOpt.isEmpty()) {
                // Por segurança, não revelar se o email existe ou não
                log.warn("⚠️ Email não encontrado, mas retornando sucesso por segurança: {}", contact);
                result.put("message", "Se o email estiver cadastrado, você receberá um link para recuperação de senha.");
                return result;
            }
            user = userOpt.get();
        }

        // Invalidar tokens antigos
        tokenRepository.expireAllUserTokens(user.getId());

        // Gerar novo token
        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .email(user.getEmail())
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

        PasswordResetToken saved = tokenRepository.save(resetToken);

        // Enviar link de reset
        String resetLink = String.format("%s/reset-password?token=%s", appUrl, token);
        boolean sent = false;

        if (isWhatsapp) {
            sent = sendPasswordResetWhatsApp(user.getWhatsapp(), user.getName(), resetLink);
            if (sent) {
                log.info("✅ Mensagem de recuperação enviada via WhatsApp para: {}", user.getWhatsapp());
            }
        } else {
            sent = sendPasswordResetEmail(user.getEmail(), user.getName(), resetLink, token);
            if (sent) {
                log.info("✅ Email de recuperação enviado para: {}", user.getEmail());
            }
        }

        if (!sent) {
            String destination = isWhatsapp ? user.getWhatsapp() : user.getEmail();
            log.error("❌ Falha ao enviar recuperação via {} para: {}", deliveryMethod, destination);
            saved.markAsExpired();
            tokenRepository.save(saved);
            result.put("success", false);
            result.put("message", "Erro ao enviar link de recuperação. Tente novamente.");
            return result;
        }

        result.put("message", "Link de recuperação enviado com sucesso!");
        return result;
    }

    /**
     * Envia link de recuperação via WhatsApp
     */
    private boolean sendPasswordResetWhatsApp(String whatsapp, String userName, String resetLink) {
        if (baileysRestService == null) {
            log.error("❌ BaileysRestService não disponível!");
            return false;
        }

        String message = String.format(
                "🔑 *Recuperação de Senha - Secured Guard*\n\n" +
                "Olá, *%s*!\n\n" +
                "Você solicitou a recuperação de senha da sua conta.\n\n" +
                "Clique no link abaixo para criar uma nova senha:\n" +
                "%s\n\n" +
                "⏰ *Importante:*\n" +
                "• Este link expira em 1 hora\n" +
                "• Use-o apenas uma vez\n" +
                "• Não compartilhe com ninguém\n\n" +
                "Se você não solicitou a recuperação de senha, ignore esta mensagem.\n\n" +
                "_Secured Guard © 2025_",
                userName, resetLink);

        try {
            // Normalizar número de telefone
            String normalized = whatsapp.replaceAll("[^0-9]", "");
            if (!normalized.startsWith("55")) {
                normalized = "55" + normalized;
            }
            
            return baileysRestService.sendTextMessage(normalized, message);
        } catch (Exception e) {
            log.error("❌ Erro ao enviar WhatsApp de recuperação: {}", e.getMessage(), e);
            return false;
        }
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

