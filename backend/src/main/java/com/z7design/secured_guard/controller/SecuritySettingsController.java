package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.SecuritySettingsDTO;
import com.z7design.secured_guard.service.SecuritySettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/security-settings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Configurações de Segurança", description = "API para gerenciamento de configurações de segurança")
public class SecuritySettingsController {
    
    private final SecuritySettingsService securitySettingsService;
    
    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR')")
    @Operation(summary = "Buscar configurações de segurança", description = "Retorna as configurações de segurança de uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Configurações encontradas"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<SecuritySettingsDTO> getSecuritySettings(@PathVariable UUID companyId) {
        log.info("GET /api/security-settings/company/{} - Buscando configurações de segurança", companyId);
        
        try {
            SecuritySettingsDTO settings = securitySettingsService.getSecuritySettings(companyId);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Erro ao buscar configurações de segurança para empresa {}: {}", companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','ROLE_SUPER_ADMIN','ROLE_ADMIN')")
    @Operation(summary = "Listar todas as configurações", description = "Retorna todas as configurações de segurança do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de configurações"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<SecuritySettingsDTO>> getAllSecuritySettings() {
        log.info("GET /api/security-settings - Listando todas as configurações de segurança");
        
        try {
            List<SecuritySettingsDTO> settings = securitySettingsService.getAllSecuritySettings();
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Erro ao listar configurações de segurança: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','ROLE_SUPER_ADMIN','ROLE_ADMIN')")
    @Operation(summary = "Criar configurações de segurança", description = "Cria novas configurações de segurança para uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Configurações criadas com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<SecuritySettingsDTO> createSecuritySettings(@Valid @RequestBody SecuritySettingsDTO settingsDTO) {
        log.info("POST /api/security-settings - Criando configurações de segurança para empresa: {}", settingsDTO.getCompanyId());
        
        try {
            SecuritySettingsDTO createdSettings = securitySettingsService.createSecuritySettings(settingsDTO);
            return ResponseEntity.status(201).body(createdSettings);
        } catch (Exception e) {
            log.error("Erro ao criar configurações de segurança: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR')")
    @Operation(summary = "Atualizar configurações de segurança", description = "Atualiza as configurações de segurança de uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Configurações atualizadas com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<SecuritySettingsDTO> updateSecuritySettings(
            @PathVariable UUID companyId, 
            @Valid @RequestBody SecuritySettingsDTO settingsDTO) {
        log.info("PUT /api/security-settings/company/{} - Atualizando configurações de segurança", companyId);
        
        try {
            SecuritySettingsDTO updatedSettings = securitySettingsService.updateSecuritySettings(companyId, settingsDTO);
            return ResponseEntity.ok(updatedSettings);
        } catch (Exception e) {
            log.error("Erro ao atualizar configurações de segurança para empresa {}: {}", companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @DeleteMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','ROLE_SUPER_ADMIN','ROLE_ADMIN')")
    @Operation(summary = "Deletar configurações de segurança", description = "Remove as configurações de segurança de uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Configurações deletadas com sucesso"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> deleteSecuritySettings(@PathVariable UUID companyId) {
        log.info("DELETE /api/security-settings/company/{} - Deletando configurações de segurança", companyId);
        
        try {
            securitySettingsService.deleteSecuritySettings(companyId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao deletar configurações de segurança para empresa {}: {}", companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/test")
    @Operation(summary = "Teste de configurações", description = "Endpoint para testar se as configurações de segurança estão funcionando")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Teste realizado com sucesso")
    })
    public ResponseEntity<Object> testSecuritySettings() {
        log.info("GET /api/security-settings/test - Testando configurações de segurança");
        
        return ResponseEntity.ok().body(
            new Object() {
                public final String message = "Configurações de segurança funcionando corretamente";
                public final String timestamp = java.time.LocalDateTime.now().toString();
                public final String status = "OK";
            }
        );
    }
}
