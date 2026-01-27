package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.*;
import com.z7design.secured_guard.model.UserTermsConsent;
import com.z7design.secured_guard.service.UserTermsConsentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/user-terms-consent")
@Tag(name = "Consentimento LGPD", description = "API para gerenciamento de consentimentos de termos e privacidade")
public class UserTermsConsentController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserTermsConsentController.class);
    private final UserTermsConsentService consentService;

    public UserTermsConsentController(UserTermsConsentService consentService) {
        this.consentService = consentService;
    }

    @GetMapping("/check/{userId}/{userType}")
    @Operation(summary = "Verificar se usuário aceitou os termos")
    public ResponseEntity<Map<String, Object>> checkUserConsent(
            @PathVariable UUID userId,
            @PathVariable UserTermsConsent.UserType userType) {

        boolean hasAccepted = consentService.hasUserAcceptedTerms(userId, userType);
        boolean isRequired = consentService.isConsentRequired(userId, userType);

        return ResponseEntity.ok(Map.of(
                "hasAccepted", hasAccepted,
                "isRequired", isRequired,
                "userId", userId,
                "userType", userType));
    }

    @GetMapping("/check-by-cpf/{cpf}/{userType}")
    @Operation(summary = "Verificar consentimento por CPF")
    public ResponseEntity<Map<String, Object>> checkUserConsentByCpf(
            @PathVariable String cpf,
            @PathVariable UserTermsConsent.UserType userType) {

        boolean hasAccepted = consentService.hasUserAcceptedTermsByCpf(cpf, userType);
        boolean isRequired = consentService.isConsentRequiredByCpf(cpf, userType);

        return ResponseEntity.ok(Map.of(
                "hasAccepted", hasAccepted,
                "isRequired", isRequired,
                "cpf", cpf,
                "userType", userType));
    }

    @PostMapping("/accept")
    @Operation(summary = "Aceitar termos de uso")
    public ResponseEntity<UserTermsConsentDTO> acceptTerms(
            @Valid @RequestBody CreateUserTermsConsentDTO createDTO,
            HttpServletRequest request) {

        if (createDTO.getIpAddress() == null) {
            createDTO.setIpAddress(request.getRemoteAddr());
        }
        if (createDTO.getUserAgent() == null) {
            createDTO.setUserAgent(request.getHeader("User-Agent"));
        }

        UserTermsConsentDTO consent = consentService.createConsent(createDTO);
        return ResponseEntity.ok(consent);
    }

    @GetMapping("/latest/{userId}/{userType}")
    @Operation(summary = "Obter último consentimento")
    public ResponseEntity<UserTermsConsentDTO> getLatestConsent(
            @PathVariable UUID userId,
            @PathVariable UserTermsConsent.UserType userType) {

        UserTermsConsentDTO consent = consentService.getLatestConsent(userId, userType);
        if (consent == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(consent);
    }
}
