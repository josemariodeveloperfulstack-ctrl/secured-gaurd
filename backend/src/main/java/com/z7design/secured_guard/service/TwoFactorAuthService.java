package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.TwoFactorCode;
import com.z7design.secured_guard.model.TwoFactorCode.DeliveryChannel;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.TwoFactorCodeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TwoFactorAuthService {

    private final TwoFactorCodeRepository codeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    @Autowired(required = false)
    private com.z7design.secured_guard.service.whatsapp.WhatsAppAgentService whatsAppAgent;

    private static final Random RANDOM = new Random();

    /**
     * Gera e envia código 2FA
     */
    public TwoFactorCode generateAndSendCode(
        UUID userId,
        DeliveryChannel channel,
        String ipAddress,
        String userAgent
    ) {
        log.info("🔐 Gerando código 2FA para usuário {} via {}", userId, channel);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Invalidar códigos antigos
        codeRepository.expireAllUserCodes(userId);

        // Gerar código de 6 dígitos
        String code = generateCode();

        // Determinar destino
        String destination;
        if (channel == DeliveryChannel.WHATSAPP) {
            destination = user.getTwoFactorWhatsapp() != null 
                ? user.getTwoFactorWhatsapp() 
                : user.getWhatsapp();
            if (destination == null || destination.trim().isEmpty()) {
                throw new RuntimeException("Usuário não possui WhatsApp cadastrado");
            }
        } else if (channel == DeliveryChannel.EMAIL) {
            destination = user.getEmail();
        } else {
            throw new RuntimeException("Canal de entrega não suportado: " + channel);
        }

        // Criar registro
        TwoFactorCode twoFactorCode = TwoFactorCode.builder()
                .user(user)
                .code(code)
                .deliveryChannel(channel)
                .destination(destination)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

        TwoFactorCode saved = codeRepository.save(twoFactorCode);

        // Enviar código
        boolean sent = sendCode(code, destination, channel, user.getName());
        
        if (!sent) {
            log.error("❌ Falha ao enviar código 2FA para {}", destination);
            saved.markAsExpired();
            codeRepository.save(saved);
            throw new RuntimeException("Falha ao enviar código de verificação");
        }

        log.info("✅ Código 2FA enviado para {} via {}", destination, channel);
        return saved;
    }

    /**
     * Valida código 2FA
     */
    public boolean validateCode(UUID userId, String code) {
        log.info("🔍 Validando código 2FA para usuário {}", userId);

        var codeOpt = codeRepository.findValidCode(userId, code, LocalDateTime.now());

        if (codeOpt.isEmpty()) {
            log.warn("❌ Código 2FA inválido ou expirado para usuário {}", userId);
            // Incrementar tentativas em todos os códigos recentes
            var latest = codeRepository.findLatestByUserId(userId);
            latest.ifPresent(twoFactorCode -> {
                twoFactorCode.incrementAttempts();
                codeRepository.save(twoFactorCode);
            });
            return false;
        }

        TwoFactorCode twoFactorCode = codeOpt.get();
        twoFactorCode.markAsUsed();
        codeRepository.save(twoFactorCode);

        log.info("✅ Código 2FA validado com sucesso para usuário {}", userId);
        return true;
    }

    /**
     * Habilita 2FA para um usuário
     */
    public void enable2FA(UUID userId, String whatsappNumber) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.setTwoFactorEnabled(true);
        user.setTwoFactorWhatsapp(whatsappNumber);
        userRepository.save(user);

        log.info("✅ 2FA habilitado para usuário {}", userId);
    }

    /**
     * Desabilita 2FA para um usuário
     */
    public void disable2FA(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.setTwoFactorEnabled(false);
        userRepository.save(user);

        log.info("🔓 2FA desabilitado para usuário {}", userId);
    }

    /**
     * Verifica se usuário tem 2FA habilitado
     */
    public boolean is2FAEnabled(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return user.getTwoFactorEnabled() != null && user.getTwoFactorEnabled();
    }

    /**
     * Gera código aleatório de 6 dígitos
     */
    private String generateCode() {
        int code = RANDOM.nextInt(900000) + 100000; // Gera entre 100000 e 999999
        return String.valueOf(code);
    }

    /**
     * Envia código via canal especificado
     */
    private boolean sendCode(String code, String destination, DeliveryChannel channel, String userName) {
        try {
            if (channel == DeliveryChannel.WHATSAPP) {
                return sendViaWhatsApp(code, destination, userName);
            } else if (channel == DeliveryChannel.EMAIL) {
                return sendViaEmail(code, destination, userName);
            }
            return false;
        } catch (Exception e) {
            log.error("Erro ao enviar código 2FA: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Envia código via WhatsApp
     */
    private boolean sendViaWhatsApp(String code, String phoneNumber, String userName) {
        if (whatsAppAgent == null) {
            log.error("❌ WhatsAppAgentService não disponível!");
            return false;
        }

        String message = String.format(
                "🔐 *Secured Guard - Código de Verificação*\n\n" +
                "Olá, %s!\n\n" +
                "Seu código de verificação é:\n\n" +
                "*%s*\n\n" +
                "⏰ Este código expira em 5 minutos.\n" +
                "🔒 Não compartilhe este código com ninguém.\n\n" +
                "Se você não solicitou este código, ignore esta mensagem.",
                userName, code
        );

        return whatsAppAgent.sendTextMessage(phoneNumber, message);
    }

    /**
     * Envia código via Email
     */
    private boolean sendViaEmail(String code, String email, String userName) {
        String subject = "🔐 Código de Verificação - Secured Guard";
        String htmlBody = createEmailBody(code, userName);

        return emailService.sendEmailWithAttachment(email, subject, htmlBody, null, null);
    }

    /**
     * Cria corpo do email HTML
     */
    private String createEmailBody(String code, String userName) {
        return String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                        .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
                        .code { font-size: 32px; font-weight: bold; color: #dc2626; text-align: center; letter-spacing: 5px; padding: 20px; background: white; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Código de Verificação</h1>
                            <p>Autenticação de Dois Fatores</p>
                        </div>
                        <div class="content">
                            <p>Olá, <strong>%s</strong>!</p>
                            <p>Você solicitou um código de verificação para acessar o Secured Guard.</p>
                            <div class="code">%s</div>
                            <div class="warning">
                                <p><strong>⏰ Importante:</strong></p>
                                <ul style="margin: 5px 0;">
                                    <li>Este código expira em <strong>5 minutos</strong></li>
                                    <li>Use-o apenas uma vez</li>
                                    <li>Não compartilhe com ninguém</li>
                                </ul>
                            </div>
                            <p>Se você não solicitou este código, ignore este email e considere alterar sua senha.</p>
                        </div>
                        <div class="footer">
                            <p>Secured Guard &copy; 2025 - Sistema de Gestão de Segurança</p>
                            <p>Este é um email automático. Não responda.</p>
                        </div>
                    </div>
                </body>
                </html>
                """, userName, code);
    }

    /**
     * Limpa códigos expirados (executar via scheduler)
     */
    public void cleanupExpiredCodes() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        codeRepository.deleteExpiredCodes(cutoff);
        log.info("🧹 Códigos 2FA expirados removidos");
    }
}

