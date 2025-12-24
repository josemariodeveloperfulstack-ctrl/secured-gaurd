package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
            log.info("📧 Configuração SMTP - Host: {}, Port: {}", mailHost, mailPort);
            
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
            
            if (cause != null) {
                if (cause instanceof jakarta.mail.AuthenticationFailedException) {
                    errorType = "AUTHENTICATION_FAILED";
                    errorMessage = "Falha na autenticação SMTP. Verifique usuário e senha.";
                } else if (cause instanceof jakarta.mail.MessagingException) {
                    errorType = "MESSAGING_EXCEPTION";
                    if (cause.getMessage() != null && cause.getMessage().contains("Could not connect")) {
                        errorMessage = "Não foi possível conectar ao servidor SMTP. Verifique host, porta e firewall.";
                    } else if (cause.getMessage() != null && cause.getMessage().contains("timeout")) {
                        errorMessage = "Timeout ao conectar ao servidor SMTP. Tente usar porta 587 com STARTTLS.";
                    }
                }
            }
            
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", errorMessage,
                "to", toEmail != null ? toEmail : "N/A",
                "error", errorType,
                "details", cause != null ? cause.getMessage() : e.getMessage()
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
    public ResponseEntity<?> getEmailConfig(
        @org.springframework.beans.factory.annotation.Value("${spring.mail.host}") String host,
        @org.springframework.beans.factory.annotation.Value("${spring.mail.port}") String port,
        @org.springframework.beans.factory.annotation.Value("${spring.mail.username}") String username,
        @org.springframework.beans.factory.annotation.Value("${spring.mail.properties.mail.smtp.ssl.enable}") String sslEnabled
    ) {
        return ResponseEntity.ok(Map.of(
            "host", host,
            "port", port,
            "username", username,
            "ssl", sslEnabled,
            "configured", true
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

