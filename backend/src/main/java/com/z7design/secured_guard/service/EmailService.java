package com.z7design.secured_guard.service;

import com.z7design.secured_guard.config.MailBranding;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import org.springframework.mail.MailException;
import java.io.File;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final MailBranding mailBranding;

    @Value("${spring.mail.username:securedguard@z7design.com.br}")
    private String fromEmail;

    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private boolean smtpAuth;

    @Value("${app.email.mock:false}")
    private boolean mockEmail;

    /**
     * Envia email genérico (HTML)
     */
    public boolean sendEmail(String toEmail, String subject, String htmlBody) {
        if (mockEmail) {
            log.info("📧 [MOCK] Simulação de envio de email para: {}", toEmail);
            log.info("📝 [MOCK] Assunto: {}", subject);
            log.info("📄 [MOCK] Conteúdo (HTML omitido): {} caracteres", htmlBody != null ? htmlBody.length() : 0);
            return true;
        }

        try {
            log.info("📧 Enviando email para: {} - Assunto: {}", toEmail, subject);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("✅ Email enviado com sucesso para {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("💥 Erro ao enviar email para {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    /**
     * Envia documento unificado por email
     */
    public boolean sendUnifiedDocument(String toEmail, String employeeName, String month, String year,
            String filePath) {
        if (mockEmail) {
            log.info("📧 [MOCK] Simulação de envio de Documento Unificado para: {}", toEmail);
            log.info("📝 [MOCK] Funcionário: {} - {}/{}", employeeName, month, year);
            log.info("📎 [MOCK] Arquivo: {}", filePath);
            return true;
        }

        try {
            log.info("📧 Enviando documento unificado por email para: {}", toEmail);
            log.info("Funcionário: {} - {}/{}", employeeName, month, year);
            log.info("Arquivo: {}", filePath);

            // Verificar se arquivo existe
            File file = new File(filePath);
            if (!file.exists()) {
                log.error("❌ Arquivo não encontrado: {}", filePath);
                return false;
            }

            // Criar email simples (sem anexo por enquanto)
            SimpleMailMessage emailMessage = new SimpleMailMessage();
            emailMessage.setFrom(fromEmail);
            emailMessage.setTo(toEmail);
            emailMessage.setSubject(String.format("Documento Unificado - %s - %s/%s", employeeName, month, year));

            // Corpo do email
            String emailBody = createEmailBody(employeeName, month, year);
            emailMessage.setText(emailBody);

            // Enviar email
            mailSender.send(emailMessage);
            log.info("✅ Email enviado com sucesso para: {}", toEmail);
            log.info("📎 Arquivo: {} ({} bytes) - Anexo não suportado nesta versão", file.getName(), file.length());
            return true;

        } catch (MailException e) {
            Throwable cause = e.getCause();
            if (cause instanceof jakarta.mail.AuthenticationFailedException) {
                log.error("❌ Erro de autenticação ao enviar email para {}: {}", toEmail, cause.getMessage());
                log.error("Verifique as credenciais SMTP (usuário e senha) nas configurações");
            } else if (cause instanceof jakarta.mail.MessagingException) {
                log.error("❌ Erro de mensagem ao enviar email para {}: {}", toEmail, cause.getMessage());
                log.error("Causa: {}", cause.getCause() != null ? cause.getCause().getMessage() : "Desconhecida");
                if (cause.getMessage() != null && cause.getMessage().contains("Could not connect to SMTP host")) {
                    log.error("⚠️ Não foi possível conectar ao servidor SMTP. Verifique:");
                    log.error("   - Host e porta estão corretos?");
                    log.error("   - Firewall/antivírus está bloqueando?");
                    log.error("   - Servidor SMTP está acessível?");
                } else if (cause.getMessage() != null && cause.getMessage().contains("550")
                        && cause.getMessage().contains("suspended")) {
                    log.error("🛑 ERRO CRÍTICO: CONTA DE EMAIL SUSPENSA PELO PROVEDOR");
                    log.error("   - O servidor SMTP recusou o envio informando que a conta está suspensa.");
                    log.error("   - AÇÃO NECESSÁRIA: Verifique no cPanel ou contate o suporte da hospedagem.");
                }
            } else {
                log.error("💥 Erro ao enviar email para {}: {}", toEmail, e.getMessage(), e);
                if (cause != null) {
                    log.error("Causa raiz: {}", cause.getMessage());
                }
            }
            return false;
        } catch (Exception e) {
            log.error("💥 Erro inesperado ao enviar email para {}: {}", toEmail, e.getMessage(), e);
            if (e.getCause() != null) {
                log.error("Causa raiz: {}", e.getCause().getMessage());
            }
            return false;
        }
    }

    /**
     * Envia email com anexo em bytes (PDF)
     */
    public boolean sendEmailWithAttachment(String toEmail, String subject, String htmlBody, byte[] attachmentBytes,
            String attachmentFileName) {
        if (mockEmail) {
            log.info("📧 [MOCK] Simulação de envio com anexo para: {}", toEmail);
            log.info("📝 [MOCK] Assunto: {}", subject);
            log.info("📎 [MOCK] Anexo: {} ({} bytes)", attachmentFileName,
                    attachmentBytes != null ? attachmentBytes.length : 0);
            return true;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Se não há anexo, não precisa de multipart
            boolean hasAttachment = attachmentBytes != null && attachmentBytes.length > 0 && attachmentFileName != null
                    && !attachmentFileName.trim().isEmpty();
            MimeMessageHelper helper = new MimeMessageHelper(message, hasAttachment, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            // Adicionar anexo apenas se fornecido
            if (hasAttachment && attachmentBytes != null && attachmentFileName != null) {
                helper.addAttachment(attachmentFileName,
                        new org.springframework.core.io.ByteArrayResource(attachmentBytes));
            }

            mailSender.send(message);

            if (hasAttachment && attachmentBytes != null && attachmentFileName != null) {
                log.info("✅ Email com anexo enviado para {} ({} bytes)", toEmail, attachmentBytes.length);
            } else {
                log.info("✅ Email enviado para {} (sem anexo)", toEmail);
            }
            return true;
        } catch (MailException e) {
            Throwable cause = e.getCause();
            if (cause instanceof jakarta.mail.AuthenticationFailedException) {
                log.error("❌ Erro de autenticação ao enviar email com anexo para {}: {}", toEmail, cause.getMessage());
                log.error("Verifique as credenciais SMTP (usuário e senha) nas configurações");
            } else if (cause instanceof jakarta.mail.MessagingException) {
                log.error("❌ Erro de mensagem ao enviar email com anexo para {}: {}", toEmail, cause.getMessage());
                log.error("Causa: {}", cause.getCause() != null ? cause.getCause().getMessage() : "Desconhecida");
                String causeMessage = cause.getMessage() != null ? cause.getMessage() : "";
                if (causeMessage.contains("Could not connect") || causeMessage.contains("Couldn't connect")) {
                    log.error("⚠️ Não foi possível conectar ao servidor SMTP. Verifique:");
                    log.error("   - Host e porta estão corretos?");
                    log.error("   - Firewall/antivírus está bloqueando?");
                    log.error("   - Servidor SMTP está acessível?");
                } else if (causeMessage.contains("timeout") || causeMessage.contains("Connection timed out")) {
                    log.error("⚠️ Timeout ao conectar ao servidor SMTP:");
                    log.error("   - A conexão expirou após 60 segundos");
                    log.error("   - Servidor pode estar inacessível da sua rede");
                    log.error("   - Verifique firewall e conectividade de rede");
                    log.error("   - Para desenvolvimento local, considere usar Gmail SMTP ou Mailtrap");
                }
            } else {
                log.error("💥 Erro ao enviar email com anexo para {}: {}", toEmail, e.getMessage(), e);
                if (cause != null) {
                    log.error("Causa raiz: {}", cause.getMessage());
                }
            }
            return false;
        } catch (Exception e) {
            log.error("💥 Erro ao enviar email com anexo para {}: {}", toEmail, e.getMessage(), e);
            if (e.getCause() != null) {
                log.error("Causa raiz: {}", e.getCause().getMessage());
            }
            return false;
        }
    }

    /**
     * Cria corpo do email em HTML
     */
    private String createEmailBody(String employeeName, String month, String year) {
        String brand = mailBranding.getBrandName();
        return String.format(
                """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                                .content { padding: 20px; }
                                .footer { background: #ecf0f1; padding: 15px; text-align: center; font-size: 12px; }
                                .button { background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h1>🏢 %s</h1>
                                <h2>Documento Unificado</h2>
                            </div>

                            <div class="content">
                                <h3>Olá!</h3>
                                <p>O documento unificado para <strong>%s</strong> referente ao período <strong>%s/%s</strong> foi gerado com sucesso.</p>

                                <p>Este documento contém:</p>
                                <ul>
                                    <li>📄 <strong>Holerite</strong> com informações salariais</li>
                                    <li>💰 <strong>Recibo de Pagamento</strong> com comprovante bancário</li>
                                </ul>

                                <p>O arquivo está anexado a este email para sua conveniência.</p>

                                <p style="margin-top: 30px;">
                                    <strong>Informações importantes:</strong>
                                </p>
                                <ul>
                                    <li>Guarde este documento para seus registros</li>
                                    <li>Use para declaração de imposto de renda</li>
                                    <li>Comprovante oficial de recebimento</li>
                                </ul>
                            </div>

                            <div class="footer">
                                <p>Este é um email automático do sistema %s.</p>
                                <p>Em caso de dúvidas, entre em contato com o departamento de RH.</p>
                                <p>© 2025 %s - Todos os direitos reservados</p>
                            </div>
                        </body>
                        </html>
                        """,
                brand, employeeName, month, year, brand, brand);
    }

    /**
     * Testa configuração de email
     */
    public boolean testEmailConfiguration() {
        if (mockEmail) {
            log.info("🧪 [MOCK] Teste de configuração: MODO MOCK ATIVADO");
            log.info("✅ [MOCK] Configuração de email considerada válida (simulação)");
            return true;
        }

        try {
            log.info("🧪 Testando configuração de email...");
            log.info("📧 Host: {}", mailSender);
            log.info("📧 From: {}", fromEmail);

            SimpleMailMessage testMessage = new SimpleMailMessage();
            testMessage.setFrom(fromEmail);
            testMessage.setTo("test@example.com");
            testMessage.setSubject(mailBranding.prefixSubject("Teste de Configuração"));
            testMessage.setText("Este é um email de teste para verificar a configuração do sistema.");

            mailSender.send(testMessage);
            log.info("✅ Configuração de email funcionando");
            return true;

        } catch (MailException e) {
            Throwable cause = e.getCause();
            if (cause instanceof jakarta.mail.AuthenticationFailedException) {
                log.error("❌ Erro de autenticação na configuração de email: {}", cause.getMessage());
                log.error("Verifique as credenciais SMTP (usuário e senha) nas configurações");
            } else if (cause instanceof jakarta.mail.MessagingException) {
                log.error("❌ Erro de mensagem na configuração de email: {}", cause.getMessage());
                log.error("Causa: {}", cause.getCause() != null ? cause.getCause().getMessage() : "Desconhecida");
                String causeMessage = cause.getMessage() != null ? cause.getMessage() : "";
                if (causeMessage.contains("Could not connect") || causeMessage.contains("Couldn't connect")) {
                    log.error("⚠️ Não foi possível conectar ao servidor SMTP. Verifique:");
                    log.error("   - Host e porta estão corretos?");
                    log.error("   - Firewall/antivírus está bloqueando?");
                    log.error("   - Servidor SMTP está acessível?");
                } else if (causeMessage.contains("timeout") || causeMessage.contains("Connection timed out")) {
                    log.error("⚠️ Timeout ao conectar ao servidor SMTP:");
                    log.error("   - A conexão expirou após 60 segundos");
                    log.error("   - Servidor pode estar inacessível da sua rede");
                    log.error("   - Verifique firewall e conectividade de rede");
                    log.error("   - Para desenvolvimento local, considere usar Gmail SMTP ou Mailtrap");
                }
            } else {
                log.error("❌ Erro na configuração de email: {}", e.getMessage(), e);
                if (cause != null) {
                    log.error("Causa raiz: {}", cause.getMessage());
                }
            }
            return false;
        } catch (Exception e) {
            log.error("❌ Erro na configuração de email: {}", e.getMessage(), e);
            if (e.getCause() != null) {
                log.error("Causa raiz: {}", e.getCause().getMessage());
            }
            return false;
        }
    }
}