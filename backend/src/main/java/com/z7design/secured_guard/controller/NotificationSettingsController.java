package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.NotificationSettingsDTO;
import com.z7design.secured_guard.service.NotificationSettingsService;
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
@RequestMapping("/api/notification-settings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Configurações de Notificações", description = "API para gerenciamento de configurações de notificações")
public class NotificationSettingsController {
    
    private final NotificationSettingsService notificationSettingsService;
    
    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR')")
    @Operation(summary = "Buscar configurações de notificação da empresa", description = "Retorna as configurações de notificação de uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Configurações encontradas"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<NotificationSettingsDTO> getCompanyNotificationSettings(@PathVariable UUID companyId) {
        log.info("GET /api/notification-settings/company/{} - Buscando configurações de notificação", companyId);
        
        try {
            NotificationSettingsDTO settings = notificationSettingsService.getCompanyNotificationSettings(companyId);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Erro ao buscar configurações de notificação para empresa {}: {}", companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/company/{companyId}/user/{userId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR') or #userId.toString() == authentication.principal.id")
    @Operation(summary = "Buscar configurações de notificação do usuário", description = "Retorna as configurações de notificação de um usuário específico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Configurações encontradas"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<NotificationSettingsDTO> getUserNotificationSettings(
            @PathVariable UUID companyId, 
            @PathVariable UUID userId) {
        log.info("GET /api/notification-settings/company/{}/user/{} - Buscando configurações de notificação", companyId, userId);
        
        try {
            NotificationSettingsDTO settings = notificationSettingsService.getUserNotificationSettings(companyId, userId);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Erro ao buscar configurações de notificação para usuário {} da empresa {}: {}", userId, companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','ROLE_SUPER_ADMIN','ROLE_ADMIN')")
    @Operation(summary = "Listar todas as configurações", description = "Retorna todas as configurações de notificação do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de configurações"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<NotificationSettingsDTO>> getAllNotificationSettings() {
        log.info("GET /api/notification-settings - Listando todas as configurações de notificação");
        
        try {
            List<NotificationSettingsDTO> settings = notificationSettingsService.getAllNotificationSettings();
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("Erro ao listar configurações de notificação: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','ROLE_SUPER_ADMIN','ROLE_ADMIN')")
    @Operation(summary = "Criar configurações de notificação", description = "Cria novas configurações de notificação")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Configurações criadas com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<NotificationSettingsDTO> createNotificationSettings(@Valid @RequestBody NotificationSettingsDTO settingsDTO) {
        log.info("POST /api/notification-settings - Criando configurações de notificação para empresa: {}", settingsDTO.getCompanyId());
        
        try {
            NotificationSettingsDTO createdSettings = notificationSettingsService.createNotificationSettings(settingsDTO);
            return ResponseEntity.status(201).body(createdSettings);
        } catch (Exception e) {
            log.error("Erro ao criar configurações de notificação: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR')")
    @Operation(summary = "Atualizar configurações de notificação da empresa", description = "Atualiza as configurações de notificação de uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Configurações atualizadas com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<NotificationSettingsDTO> updateCompanyNotificationSettings(
            @PathVariable UUID companyId, 
            @Valid @RequestBody NotificationSettingsDTO settingsDTO) {
        log.info("PUT /api/notification-settings/company/{} - Atualizando configurações de notificação", companyId);
        
        try {
            NotificationSettingsDTO updatedSettings = notificationSettingsService.updateCompanyNotificationSettings(companyId, settingsDTO);
            return ResponseEntity.ok(updatedSettings);
        } catch (Exception e) {
            log.error("Erro ao atualizar configurações de notificação para empresa {}: {}", companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/company/{companyId}/user/{userId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR') or #userId.toString() == authentication.principal.id")
    @Operation(summary = "Atualizar configurações de notificação do usuário", description = "Atualiza as configurações de notificação de um usuário específico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Configurações atualizadas com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<NotificationSettingsDTO> updateUserNotificationSettings(
            @PathVariable UUID companyId, 
            @PathVariable UUID userId,
            @Valid @RequestBody NotificationSettingsDTO settingsDTO) {
        log.info("PUT /api/notification-settings/company/{}/user/{} - Atualizando configurações de notificação", companyId, userId);
        
        try {
            NotificationSettingsDTO updatedSettings = notificationSettingsService.updateUserNotificationSettings(companyId, userId, settingsDTO);
            return ResponseEntity.ok(updatedSettings);
        } catch (Exception e) {
            log.error("Erro ao atualizar configurações de notificação para usuário {} da empresa {}: {}", userId, companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @DeleteMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','ROLE_SUPER_ADMIN','ROLE_ADMIN')")
    @Operation(summary = "Deletar configurações de notificação", description = "Remove as configurações de notificação de uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Configurações deletadas com sucesso"),
            @ApiResponse(responseCode = "404", description = "Configurações não encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> deleteNotificationSettings(@PathVariable UUID companyId) {
        log.info("DELETE /api/notification-settings/company/{} - Deletando configurações de notificação", companyId);
        
        try {
            notificationSettingsService.deleteNotificationSettings(companyId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao deletar configurações de notificação para empresa {}: {}", companyId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/test")
    @Operation(summary = "Teste de configurações", description = "Endpoint para testar se as configurações de notificação estão funcionando")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Teste realizado com sucesso")
    })
    public ResponseEntity<Object> testNotificationSettings() {
        log.info("GET /api/notification-settings/test - Testando configurações de notificação");
        
        return ResponseEntity.ok().body(
            new Object() {
                public final String message = "Configurações de notificação funcionando corretamente";
                public final String timestamp = java.time.LocalDateTime.now().toString();
                public final String status = "OK";
            }
        );
    }
}
