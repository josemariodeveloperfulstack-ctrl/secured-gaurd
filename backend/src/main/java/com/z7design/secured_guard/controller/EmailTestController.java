package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Email Test", description = "Endpoints para testar envio de emails")
public class EmailTestController {

    private final EmailService emailService;

    @PostMapping("/test")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Testar envio de email", description = "Envia um email de teste para verificar configuração SMTP")
    public ResponseEntity<?> testEmail(@RequestParam String toEmail) {
        try {
            log.info("📧 Testando envio de email para: {}", toEmail);
            
            boolean success = emailService.sendEmailWithAttachment(
                toEmail,
                "🧪 Teste de Email - Secured Guard CI",
                createTestEmailBody(),
                null, // Sem anexo
                null
            );
            
            if (success) {
                log.info("✅ Email de teste enviado com sucesso para: {}", toEmail);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email enviado com sucesso para " + toEmail,
                    "from", "securedguard@z7design.com.br",
                    "to", toEmail
                ));
            } else {
                log.error("❌ Falha ao enviar email de teste para: {}", toEmail);
                return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Falha ao enviar email. Verifique os logs do backend.",
                    "to", toEmail
                ));
            }
            
        } catch (Exception e) {
            log.error("💥 Erro ao testar envio de email: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "Erro: " + e.getMessage(),
                "to", toEmail
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

