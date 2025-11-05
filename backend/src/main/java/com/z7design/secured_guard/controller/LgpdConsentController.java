package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.UserConsent;
import com.z7design.secured_guard.model.UserConsent.ConsentType;
import com.z7design.secured_guard.service.LgpdConsentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/lgpd")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "LGPD", description = "Endpoints para gestão de consentimentos LGPD")
public class LgpdConsentController {

    private final LgpdConsentService consentService;

    @PostMapping("/consent")
    @Operation(summary = "Registrar consentimento LGPD", description = "Registra aceite dos termos LGPD")
    public ResponseEntity<?> registerConsent(
            @RequestBody ConsentRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            UUID userId = request.getUserId();

            String ipAddress = getClientIP(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            UserConsent consent = consentService.registerConsent(
                    userId,
                    request.getConsentType(),
                    ipAddress,
                    userAgent,
                    request.getLatitude(),
                    request.getLongitude()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "consentId", consent.getId().toString(),
                    "message", "Consentimento registrado com sucesso"
            ));
        } catch (Exception e) {
            log.error("Erro ao registrar consentimento: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/status/{userId}")
    @Operation(summary = "Verificar status dos consentimentos", description = "Retorna se usuário aceitou todos os termos")
    public ResponseEntity<?> getConsentStatus(@PathVariable UUID userId) {
        boolean hasAccepted = consentService.hasAcceptedAllRequiredConsents(userId);
        boolean firstAccessCompleted = consentService.hasCompletedFirstAccess(userId);

        return ResponseEntity.ok(Map.of(
                "hasAcceptedAllTerms", hasAccepted,
                "firstAccessCompleted", firstAccessCompleted,
                "needsToAcceptTerms", !hasAccepted || !firstAccessCompleted
        ));
    }

    @GetMapping("/consents/{userId}")
    @Operation(summary = "Listar consentimentos", description = "Lista todos os consentimentos de um usuário")
    public ResponseEntity<List<UserConsent>> getUserConsents(@PathVariable UUID userId) {
        List<UserConsent> consents = consentService.getUserConsents(userId);
        return ResponseEntity.ok(consents);
    }

    @PostMapping("/complete-first-access/{userId}")
    @Operation(summary = "Completar primeiro acesso", description = "Marca primeiro acesso como completo")
    public ResponseEntity<?> completeFirstAccess(@PathVariable UUID userId) {
        consentService.markFirstAccessCompleted(userId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Primeiro acesso completado"
        ));
    }

    @PostMapping("/revoke/{consentId}")
    @Operation(summary = "Revogar consentimento", description = "Revoga um consentimento LGPD")
    public ResponseEntity<?> revokeConsent(
            @PathVariable UUID consentId,
            @RequestParam String reason
    ) {
        consentService.revokeConsent(consentId, reason);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Consentimento revogado"
        ));
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    // DTO
    public static class ConsentRequest {
        private UUID userId;
        private ConsentType consentType;
        private BigDecimal latitude;
        private BigDecimal longitude;

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        public ConsentType getConsentType() { return consentType; }
        public void setConsentType(ConsentType consentType) { this.consentType = consentType; }
        public BigDecimal getLatitude() { return latitude; }
        public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }
        public BigDecimal getLongitude() { return longitude; }
        public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }
    }
}

