package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.UserConsent;
import com.z7design.secured_guard.service.LgpdConsentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/lgpd")
@Tag(name = "LGPD Consent", description = "Gerenciamento de consentimentos LGPD")
@CrossOrigin(origins = "*")
@Slf4j
public class LgpdConsentController {

    private final LgpdConsentService lgpdConsentService;

    public LgpdConsentController(LgpdConsentService lgpdConsentService) {
        this.lgpdConsentService = lgpdConsentService;
    }

    @PostMapping("/consent")
    @Operation(summary = "Registrar consentimento LGPD")
    public ResponseEntity<Map<String, Object>> registerConsent(
            @RequestBody Map<String, Object> request,
            HttpServletRequest httpRequest) {
        try {
            log.info("📝 Recebida solicitação de consentimento LGPD: {}", request);

            // Extrair dados do request
            String userIdStr = (String) request.get("userId");
            String consentTypeStr = (String) request.get("consentType");

            if (userIdStr == null || consentTypeStr == null) {
                log.error("❌ Dados obrigatórios ausentes: userId={}, consentType={}", userIdStr, consentTypeStr);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "userId e consentType são obrigatórios"));
            }

            UUID userId = UUID.fromString(userIdStr);
            UserConsent.ConsentType consentType = UserConsent.ConsentType.valueOf(consentTypeStr);

            // Extrair informações opcionais
            String ipAddress = getClientIp(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            BigDecimal latitude = null;
            BigDecimal longitude = null;

            if (request.get("latitude") != null) {
                latitude = new BigDecimal(request.get("latitude").toString());
            }
            if (request.get("longitude") != null) {
                longitude = new BigDecimal(request.get("longitude").toString());
            }

            // Registrar consentimento
            UserConsent consent = lgpdConsentService.registerConsent(
                    userId,
                    consentType,
                    ipAddress,
                    userAgent,
                    latitude,
                    longitude);

            log.info("✅ Consentimento registrado com sucesso: {}", consent.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "consentId", consent.getId(),
                    "message", "Consentimento registrado com sucesso"));

        } catch (IllegalArgumentException e) {
            log.error("❌ Tipo de consentimento inválido: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Tipo de consentimento inválido: " + e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erro ao registrar consentimento", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erro ao registrar consentimento: " + e.getMessage()));
        }
    }

    @PostMapping("/complete-first-access/{userId}")
    @Operation(summary = "Marcar primeiro acesso como completo")
    public ResponseEntity<Map<String, Object>> completeFirstAccess(@PathVariable String userId) {
        try {
            log.info("✅ Marcando primeiro acesso como completo para usuário: {}", userId);

            UUID userUuid = UUID.fromString(userId);
            lgpdConsentService.markFirstAccessCompleted(userUuid);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Primeiro acesso marcado como completo"));
        } catch (Exception e) {
            log.error("❌ Erro ao marcar primeiro acesso como completo", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erro ao completar primeiro acesso: " + e.getMessage()));
        }
    }

    @GetMapping("/check-first-access/{userId}")
    @Operation(summary = "Verificar se usuário completou primeiro acesso")
    public ResponseEntity<Map<String, Object>> checkFirstAccess(@PathVariable String userId) {
        try {
            UUID userUuid = UUID.fromString(userId);
            boolean completed = lgpdConsentService.hasCompletedFirstAccess(userUuid);

            return ResponseEntity.ok(Map.of(
                    "userId", userId,
                    "firstAccessCompleted", completed));
        } catch (Exception e) {
            log.error("❌ Erro ao verificar primeiro acesso", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erro ao verificar primeiro acesso: " + e.getMessage()));
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // Se houver múltiplos IPs (proxy chain), pegar o primeiro
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
