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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/user-terms-consent")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Consentimento LGPD", description = "API para gerenciamento de consentimentos de termos e privacidade")
public class UserTermsConsentController {
    
    private final UserTermsConsentService consentService;
    
    @GetMapping("/check/{userId}/{userType}")
    @Operation(summary = "Verificar se usuário aceitou os termos", description = "Verifica se um usuário já aceitou os termos de uso")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status do consentimento retornado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Map<String, Object>> checkUserConsent(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId,
            @Parameter(description = "Tipo do usuário") @PathVariable UserTermsConsent.UserType userType) {
        
        boolean hasAccepted = consentService.hasUserAcceptedTerms(userId, userType);
        boolean isRequired = consentService.isConsentRequired(userId, userType);
        
        return ResponseEntity.ok(Map.of(
            "hasAccepted", hasAccepted,
            "isRequired", isRequired,
            "userId", userId,
            "userType", userType
        ));
    }
    
    @GetMapping("/check-by-cpf/{cpf}/{userType}")
    @Operation(summary = "Verificar consentimento por CPF", description = "Verifica se um usuário já aceitou os termos pelo CPF")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status do consentimento retornado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Map<String, Object>> checkUserConsentByCpf(
            @Parameter(description = "CPF do usuário") @PathVariable String cpf,
            @Parameter(description = "Tipo do usuário") @PathVariable UserTermsConsent.UserType userType) {
        
        boolean hasAccepted = consentService.hasUserAcceptedTermsByCpf(cpf, userType);
        boolean isRequired = consentService.isConsentRequiredByCpf(cpf, userType);
        
        return ResponseEntity.ok(Map.of(
            "hasAccepted", hasAccepted,
            "isRequired", isRequired,
            "cpf", cpf,
            "userType", userType
        ));
    }
    
    @PostMapping("/accept")
    @Operation(summary = "Aceitar termos de uso", description = "Registra a aceitação dos termos de uso pelo usuário")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Consentimento registrado com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<UserTermsConsentDTO> acceptTerms(
            @Parameter(description = "Dados do consentimento") @Valid @RequestBody CreateUserTermsConsentDTO createDTO,
            HttpServletRequest request) {
        
        // Adicionar informações da requisição se não fornecidas
        if (createDTO.getIpAddress() == null) {
            createDTO.setIpAddress(getClientIpAddress(request));
        }
        if (createDTO.getUserAgent() == null) {
            createDTO.setUserAgent(request.getHeader("User-Agent"));
        }
        if (createDTO.getTermsVersion() == null) {
            createDTO.setTermsVersion(consentService.getCurrentTermsVersion());
        }
        if (createDTO.getPrivacyPolicyVersion() == null) {
            createDTO.setPrivacyPolicyVersion(consentService.getCurrentPrivacyPolicyVersion());
        }
        if (createDTO.getTermsContentHash() == null) {
            createDTO.setTermsContentHash(consentService.getTermsContentHash());
        }
        
        UserTermsConsentDTO consent = consentService.createConsent(createDTO);
        return ResponseEntity.ok(consent);
    }
    
    @GetMapping("/latest/{userId}/{userType}")
    @Operation(summary = "Obter último consentimento", description = "Retorna o último consentimento do usuário")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Último consentimento retornado"),
        @ApiResponse(responseCode = "404", description = "Nenhum consentimento encontrado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<UserTermsConsentDTO> getLatestConsent(
            @Parameter(description = "ID do usuário") @PathVariable UUID userId,
            @Parameter(description = "Tipo do usuário") @PathVariable UserTermsConsent.UserType userType) {
        
        UserTermsConsentDTO consent = consentService.getLatestConsent(userId, userType);
        if (consent == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(consent);
    }
    
    @GetMapping("/latest-by-cpf/{cpf}/{userType}")
    @Operation(summary = "Obter último consentimento por CPF", description = "Retorna o último consentimento do usuário pelo CPF")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Último consentimento retornado"),
        @ApiResponse(responseCode = "404", description = "Nenhum consentimento encontrado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<UserTermsConsentDTO> getLatestConsentByCpf(
            @Parameter(description = "CPF do usuário") @PathVariable String cpf,
            @Parameter(description = "Tipo do usuário") @PathVariable UserTermsConsent.UserType userType) {
        
        UserTermsConsentDTO consent = consentService.getLatestConsentByCpf(cpf, userType);
        if (consent == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(consent);
    }
    
    @GetMapping("/all")
    @Operation(summary = "Listar todos os consentimentos", description = "Retorna uma lista paginada de todos os consentimentos")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Lista de consentimentos retornada"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<Page<UserTermsConsentDTO>> getAllConsents(
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        Page<UserTermsConsentDTO> consents = consentService.getAllConsents(pageable);
        return ResponseEntity.ok(consents);
    }
    
    @GetMapping("/accepted")
    @Operation(summary = "Listar consentimentos aceitos", description = "Retorna uma lista de todos os consentimentos aceitos")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Lista de consentimentos aceitos retornada"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<List<UserTermsConsentDTO>> getAcceptedConsents() {
        List<UserTermsConsentDTO> consents = consentService.getAllAcceptedConsents();
        return ResponseEntity.ok(consents);
    }
    
    @GetMapping("/by-type/{userType}")
    @Operation(summary = "Listar consentimentos por tipo", description = "Retorna consentimentos filtrados por tipo de usuário")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Lista de consentimentos retornada"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<List<UserTermsConsentDTO>> getConsentsByUserType(
            @Parameter(description = "Tipo do usuário") @PathVariable UserTermsConsent.UserType userType) {
        List<UserTermsConsentDTO> consents = consentService.getConsentsByUserType(userType);
        return ResponseEntity.ok(consents);
    }
    
    @GetMapping("/count/{userType}")
    @Operation(summary = "Contar consentimentos aceitos", description = "Retorna o número de consentimentos aceitos por tipo")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Contagem retornada"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> countAcceptedConsents(
            @Parameter(description = "Tipo do usuário") @PathVariable UserTermsConsent.UserType userType) {
        long count = consentService.countAcceptedConsents(userType);
        return ResponseEntity.ok(Map.of("count", count, "userType", userType));
    }
    
    @GetMapping("/versions")
    @Operation(summary = "Obter versões atuais", description = "Retorna as versões atuais dos termos e política de privacidade")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Versões retornadas")
    })
    public ResponseEntity<Map<String, Object>> getCurrentVersions() {
        return ResponseEntity.ok(Map.of(
            "termsVersion", consentService.getCurrentTermsVersion(),
            "privacyPolicyVersion", consentService.getCurrentPrivacyPolicyVersion(),
            "termsContentHash", consentService.getTermsContentHash()
        ));
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
