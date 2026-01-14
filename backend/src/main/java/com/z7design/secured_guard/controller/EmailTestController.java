package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Email Test", description = "Endpoints para testar envio de emails")
public class EmailTestController {

    private final EmailService emailService;
    private final Environment environment;
    
    @Value("${spring.mail.host:mail.z7design.com.br}")
    private String mailHost;
    
    @Value("${spring.mail.port:587}")
    private String mailPort;

    @RequestMapping(value = "/test", method = {RequestMethod.GET, RequestMethod.POST})
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Testar envio de email", description = "Envia um email de teste para verificar configuração SMTP")
    public ResponseEntity<?> testEmail(@RequestParam(required = false) String toEmail) {
        try {
            if (toEmail == null || toEmail.trim().isEmpty()) {
                log.warn("⚠️ Email de destino não fornecido");
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Email de destino é obrigatório",
                    "error", "MISSING_EMAIL_PARAMETER"
                ));
            }
            
            String email = toEmail.trim();
            log.info("📧 Testando envio de email para: {}", email);
            
            // Log detalhado da configuração
            String mailHostEnv = System.getenv("MAIL_HOST");
            String mailPortEnv = System.getenv("MAIL_PORT");
            String mailUsernameEnv = System.getenv("MAIL_USERNAME");
            String mailPasswordEnv = System.getenv("MAIL_PASSWORD");
            String mailPasswordProperty = environment.getProperty("spring.mail.password");
            // Verificar se senha está configurada (variável de ambiente OU propriedade do Spring)
            boolean hasPassword = (mailPasswordEnv != null && !mailPasswordEnv.isEmpty()) 
                                || (mailPasswordProperty != null && !mailPasswordProperty.isEmpty());
            
            log.info("📧 Configuração SMTP - Host: {} (env: {}), Port: {} (env: {})", 
                    mailHost, mailHostEnv, mailPort, mailPortEnv);
            log.info("📧 Username: {} (env: {}), Password configurado: {} (env: {}, property: {})", 
                    environment.getProperty("spring.mail.username"), mailUsernameEnv, hasPassword,
                    mailPasswordEnv != null ? "SIM" : "NÃO",
                    mailPasswordProperty != null && !mailPasswordProperty.isEmpty() ? "SIM" : "NÃO");
            log.info("📧 SSL: {}, STARTTLS: {}", 
                    environment.getProperty("spring.mail.properties.mail.smtp.ssl.enable", "false"),
                    environment.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "false"));
            log.info("📧 Perfil ativo: {}", String.join(",", environment.getActiveProfiles()));
            
            boolean success = emailService.sendEmailWithAttachment(
                email,
                "🧪 Teste de Email - Secured Guard",
                createTestEmailBody(),
                null, // Sem anexo
                null
            );
            
            if (success) {
                log.info("✅ Email de teste enviado com sucesso para: {}", email);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email enviado com sucesso para " + email,
                    "from", "securedguard@z7design.com.br",
                    "to", email
                ));
            } else {
                log.error("❌ Falha ao enviar email de teste para: {}", email);
                return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Falha ao enviar email. Verifique os logs do backend para mais detalhes.",
                    "to", email,
                    "error", "EMAIL_SEND_FAILED",
                    "hint", "Verifique se o servidor SMTP está acessível e as credenciais estão corretas"
                ));
            }
            
        } catch (org.springframework.mail.MailException e) {
            log.error("💥 Erro de email ao testar envio: {}", e.getMessage(), e);
            Throwable cause = e.getCause();
            String errorMessage = e.getMessage();
            String errorType = "MAIL_EXCEPTION";
            String suggestion = "";
            
            if (cause != null) {
                if (cause instanceof jakarta.mail.AuthenticationFailedException) {
                    errorType = "AUTHENTICATION_FAILED";
                    errorMessage = "Falha na autenticação SMTP. Verifique usuário e senha.";
                    suggestion = "Verifique se as credenciais SMTP estão corretas nas variáveis de ambiente MAIL_USERNAME e MAIL_PASSWORD.";
                } else if (cause instanceof jakarta.mail.MessagingException) {
                    errorType = "MESSAGING_EXCEPTION";
                    String causeMessage = cause.getMessage() != null ? cause.getMessage() : "";
                    if (causeMessage.contains("Could not connect") || causeMessage.contains("Couldn't connect")) {
                        errorMessage = "Não foi possível conectar ao servidor SMTP " + mailHost + ":" + mailPort;
                        suggestion = "O servidor SMTP não está acessível. Verifique:\n" +
                                    "1. Firewall/antivírus não está bloqueando a porta " + mailPort + "\n" +
                                    "2. Servidor SMTP está online e acessível\n" +
                                    "3. Para desenvolvimento local, considere usar Gmail SMTP (smtp.gmail.com:587) ou Mailtrap (smtp.mailtrap.io:2525)";
                    } else if (causeMessage.contains("timeout") || causeMessage.contains("Connection timed out")) {
                        errorMessage = "Timeout ao conectar ao servidor SMTP " + mailHost + ":" + mailPort;
                        suggestion = "A conexão com o servidor SMTP expirou após 60 segundos. Possíveis causas:\n" +
                                    "1. Servidor SMTP não está acessível da sua rede\n" +
                                    "2. Firewall bloqueando a porta " + mailPort + "\n" +
                                    "3. Para desenvolvimento local, use um servidor SMTP alternativo (Gmail ou Mailtrap)";
                    } else {
                        errorMessage = "Erro ao enviar email: " + causeMessage;
                        suggestion = "Verifique a configuração SMTP e os logs do backend para mais detalhes.";
                    }
                }
            }
            
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", errorMessage,
                "to", toEmail != null ? toEmail : "N/A",
                "error", errorType,
                "details", cause != null ? cause.getMessage() : e.getMessage(),
                "suggestion", suggestion,
                "smtp_host", mailHost,
                "smtp_port", mailPort
            ));
        } catch (Exception e) {
            log.error("💥 Erro inesperado ao testar envio de email: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Erro inesperado: " + (e.getMessage() != null ? e.getMessage() : "Erro desconhecido"),
                "to", toEmail != null ? toEmail : "N/A",
                "error", e.getClass().getSimpleName(),
                "details", e.toString()
            ));
        }
    }

    @GetMapping("/config")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Ver configuração de email", description = "Retorna configuração atual de email (sem senha)")
    public ResponseEntity<?> getEmailConfig() {
        // PRIORIDADE 1: Variáveis de ambiente (têm precedência absoluta)
        String mailHostEnv = System.getenv("MAIL_HOST");
        String mailPortEnv = System.getenv("MAIL_PORT");
        String mailUsernameEnv = System.getenv("MAIL_USERNAME");
        String mailSslEnableEnv = System.getenv("MAIL_SSL_ENABLE");
        String mailStarttlsEnableEnv = System.getenv("MAIL_STARTTLS_ENABLE");
        
        // PRIORIDADE 2: Propriedades do Spring Environment (do perfil ativo)
        String host = environment.getProperty("spring.mail.host", "não configurado");
        String port = environment.getProperty("spring.mail.port", "não configurado");
        String username = environment.getProperty("spring.mail.username", "não configurado");
        String sslEnabled = environment.getProperty("spring.mail.properties.mail.smtp.ssl.enable", "false");
        String starttlsEnabled = environment.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "false");
        
        // Obter perfil ativo
        String[] activeProfiles = environment.getActiveProfiles();
        String activeProfile = activeProfiles.length > 0 ? activeProfiles[0] : "default";
        
        // Usar variáveis de ambiente se disponíveis (têm prioridade absoluta)
        if (mailHostEnv != null && !mailHostEnv.trim().isEmpty()) {
            host = mailHostEnv.trim();
            log.info("📧 Usando MAIL_HOST da variável de ambiente: {}", host);
        }
        if (mailPortEnv != null && !mailPortEnv.trim().isEmpty()) {
            port = mailPortEnv.trim();
            log.info("📧 Usando MAIL_PORT da variável de ambiente: {}", port);
        }
        if (mailUsernameEnv != null && !mailUsernameEnv.trim().isEmpty()) {
            username = mailUsernameEnv.trim();
            log.info("📧 Usando MAIL_USERNAME da variável de ambiente: {}", username);
        }
        if (mailSslEnableEnv != null && !mailSslEnableEnv.trim().isEmpty()) {
            sslEnabled = mailSslEnableEnv.trim();
            log.info("📧 Usando MAIL_SSL_ENABLE da variável de ambiente: {}", sslEnabled);
        }
        if (mailStarttlsEnableEnv != null && !mailStarttlsEnableEnv.trim().isEmpty()) {
            starttlsEnabled = mailStarttlsEnableEnv.trim();
            log.info("📧 Usando MAIL_STARTTLS_ENABLE da variável de ambiente: {}", starttlsEnabled);
        }
        
        log.info("📧 Configuração de email solicitada - Perfil ativo: {}", activeProfile);
        log.info("📧 Host: {} (env: {}), Port: {} (env: {}), Username: {} (env: {})", 
                host, mailHostEnv, port, mailPortEnv, username, mailUsernameEnv);
        log.info("📧 SSL: {} (env: {}), STARTTLS: {} (env: {})", 
                sslEnabled, mailSslEnableEnv, starttlsEnabled, mailStarttlsEnableEnv);
        
        // Determinar se SSL ou STARTTLS está habilitado
        boolean ssl = "true".equalsIgnoreCase(sslEnabled);
        boolean starttls = "true".equalsIgnoreCase(starttlsEnabled);
        String sslTlsStatus = ssl ? "Habilitado (SSL)" : (starttls ? "Habilitado (STARTTLS)" : "Desabilitado");
        
        // Determinar fonte da configuração
        String source = "properties";
        if (mailHostEnv != null && !mailHostEnv.trim().isEmpty()) {
            source = "environment";
        }
        
        return ResponseEntity.ok(Map.of(
            "host", host,
            "port", port,
            "username", username,
            "ssl", sslEnabled,
            "starttls", starttlsEnabled,
            "sslTlsStatus", sslTlsStatus,
            "activeProfile", activeProfile,
            "configured", true,
            "source", source
        ));
    }

    private String createTestEmailBody() {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                    .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .success { color: #16a34a; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🧪 Teste de Email</h1>
                        <p>Secured Guard - Ambiente CI</p>
                    </div>
                    <div class="content">
                        <p class="success">✅ Configuração de email funcionando corretamente!</p>
                        <p><strong>Servidor SMTP:</strong> mail.z7design.com.br</p>
                        <p><strong>Porta:</strong> 465 (SSL/TLS)</p>
                        <p><strong>Remetente:</strong> securedguard@z7design.com.br</p>
                        <p><strong>Status:</strong> Email enviado com sucesso</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        <p><strong>Próximos passos:</strong></p>
                        <ul>
                            <li>✅ Configuração SMTP validada</li>
                            <li>✅ Conexão SSL/TLS estabelecida</li>
                            <li>✅ Sistema pronto para envio de documentos</li>
                        </ul>
                    </div>
                    <div class="footer">
                        <p>Secured Guard &copy; 2025 - Sistema de Gestão de Segurança</p>
                        <p>Este é um email automático de teste. Não responda.</p>
                    </div>
                </div>
            </body>
            </html>
            """;
    }
}

