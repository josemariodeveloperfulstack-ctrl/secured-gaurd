package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.*;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.ContactValidationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Controller para validação de contatos antes do envio de documentos
 */
@RestController
@RequestMapping("/api/contact-validation")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ContactValidationController {
    
    private final ContactValidationService contactValidationService;
    
    /**
     * Valida contatos de funcionários para envio
     */
    @PostMapping("/validate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER')")
    public ResponseEntity<ContactValidationResponse> validateContacts(
            @Valid @RequestBody ContactValidationRequest request) {
        
        log.info("📋 Recebida solicitação de validação para {} funcionários", 
                request.getEmployeeIds().size());
        
        try {
            ContactValidationResponse response = contactValidationService.validateContacts(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro ao validar contatos: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ContactValidationResponse.builder()
                            .message("Erro ao validar contatos: " + e.getMessage())
                            .allReady(false)
                            .build());
        }
    }
    
    /**
     * Cria usuário rapidamente para um funcionário
     */
    @PostMapping("/quick-create-user")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'HR')")
    public ResponseEntity<Map<String, Object>> quickCreateUser(
            @Valid @RequestBody QuickUserCreateRequest request) {
        
        log.info("👤 Recebida solicitação de criação rápida de usuário para funcionário: {}", 
                request.getEmployeeId());
        
        try {
            User user = contactValidationService.quickCreateUser(request);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "success", true,
                    "message", "Usuário criado com sucesso",
                    "userId", user.getId().toString(),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "whatsapp", user.getWhatsapp() != null ? user.getWhatsapp() : "",
                    "defaultPassword", user.getUsername().replaceAll("[^0-9]", "") + "@2025"
            ));
            
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("⚠️ Erro de validação: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
            
        } catch (Exception e) {
            log.error("❌ Erro ao criar usuário: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Erro interno ao criar usuário: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Atualiza número de WhatsApp de um usuário
     */
    @PatchMapping("/users/{userId}/whatsapp")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'HR')")
    public ResponseEntity<Map<String, Object>> updateUserWhatsApp(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateWhatsAppRequest request) {
        
        log.info("📱 Recebida solicitação de atualização de WhatsApp para usuário: {}", userId);
        
        try {
            User user = contactValidationService.updateUserWhatsApp(userId, request);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "WhatsApp atualizado com sucesso",
                    "userId", user.getId().toString(),
                    "username", user.getUsername(),
                    "whatsapp", user.getWhatsapp()
            ));
            
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Erro de validação: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
            
        } catch (Exception e) {
            log.error("❌ Erro ao atualizar WhatsApp: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Erro interno ao atualizar WhatsApp: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Endpoint de teste de conectividade
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "contact-validation",
                "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }
}

