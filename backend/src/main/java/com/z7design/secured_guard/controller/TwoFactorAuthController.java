package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.TwoFactorCode;
import com.z7design.secured_guard.model.TwoFactorCode.DeliveryChannel;
import com.z7design.secured_guard.service.TwoFactorAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/2fa")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "2FA", description = "Autenticação de Dois Fatores")
public class TwoFactorAuthController {

    private final TwoFactorAuthService twoFactorAuthService;

    @PostMapping("/send-code")
    @Operation(summary = "Enviar código 2FA", description = "Gera e envia código de verificação via WhatsApp ou Email")
    public ResponseEntity<?> sendCode(
            @RequestBody SendCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            String ipAddress = getClientIP(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            TwoFactorCode code = twoFactorAuthService.generateAndSendCode(
                    request.getUserId(),
                    request.getChannel(),
                    ipAddress,
                    userAgent
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Código enviado via " + request.getChannel(),
                    "destination", code.getDestination(),
                    "expiresIn", "5 minutos"
            ));
        } catch (Exception e) {
            log.error("Erro ao enviar código 2FA: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/validate-code")
    @Operation(summary = "Validar código 2FA", description = "Valida código de verificação informado pelo usuário")
    public ResponseEntity<?> validateCode(@RequestBody ValidateCodeRequest request) {
        try {
            boolean valid = twoFactorAuthService.validateCode(request.getUserId(), request.getCode());

            if (valid) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Código validado com sucesso"
                ));
            } else {
                return ResponseEntity.status(400).body(Map.of(
                        "success", false,
                        "message", "Código inválido ou expirado"
                ));
            }
        } catch (Exception e) {
            log.error("Erro ao validar código 2FA: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/enable")
    @Operation(summary = "Habilitar 2FA", description = "Habilita autenticação de dois fatores para um usuário")
    public ResponseEntity<?> enable2FA(@RequestBody Enable2FARequest request) {
        try {
            twoFactorAuthService.enable2FA(request.getUserId(), request.getWhatsappNumber());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "2FA habilitado com sucesso"
            ));
        } catch (Exception e) {
            log.error("Erro ao habilitar 2FA: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/disable/{userId}")
    @Operation(summary = "Desabilitar 2FA", description = "Desabilita autenticação de dois fatores")
    public ResponseEntity<?> disable2FA(@PathVariable UUID userId) {
        try {
            twoFactorAuthService.disable2FA(userId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "2FA desabilitado"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/status/{userId}")
    @Operation(summary = "Status do 2FA", description = "Verifica se usuário tem 2FA habilitado")
    public ResponseEntity<?> get2FAStatus(@PathVariable UUID userId) {
        boolean enabled = twoFactorAuthService.is2FAEnabled(userId);
        return ResponseEntity.ok(Map.of(
                "enabled", enabled
        ));
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    // DTOs
    public static class SendCodeRequest {
        private UUID userId;
        private DeliveryChannel channel;

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        public DeliveryChannel getChannel() { return channel; }
        public void setChannel(DeliveryChannel channel) { this.channel = channel; }
    }

    public static class ValidateCodeRequest {
        private UUID userId;
        private String code;

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
    }

    public static class Enable2FARequest {
        private UUID userId;
        private String whatsappNumber;

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        public String getWhatsappNumber() { return whatsappNumber; }
        public void setWhatsappNumber(String whatsappNumber) { this.whatsappNumber = whatsappNumber; }
    }
}

