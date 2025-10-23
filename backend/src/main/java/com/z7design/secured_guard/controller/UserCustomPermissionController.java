package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.UserCustomPermission;
import com.z7design.secured_guard.service.UserCustomPermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/custom-permissions")
@RequiredArgsConstructor
@Slf4j
public class UserCustomPermissionController {

    private final UserCustomPermissionService permissionService;

    /**
     * Obter todas as permissões customizadas de um usuário
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<List<UserCustomPermission>> getAllPermissions(@PathVariable UUID userId) {
        try {
            log.info("Buscando permissões customizadas do usuário: {}", userId);
            List<UserCustomPermission> permissions = permissionService.getAllPermissions(userId);
            return ResponseEntity.ok(permissions);
        } catch (Exception e) {
            log.error("Erro ao buscar permissões do usuário {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Obter apenas as permissões ativas de um usuário
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<List<String>> getActivePermissions(@PathVariable UUID userId) {
        try {
            log.info("Buscando permissões ativas do usuário: {}", userId);
            List<String> permissions = permissionService.getActivePermissions(userId);
            return ResponseEntity.ok(permissions);
        } catch (Exception e) {
            log.error("Erro ao buscar permissões ativas do usuário {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Conceder uma permissão customizada a um usuário
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<UserCustomPermission> grantPermission(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            String permissionKey = request.get("permissionKey");
            if (permissionKey == null || permissionKey.isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            User currentUser = (User) authentication.getPrincipal();
            log.info("SUPER_ADMIN {} concedendo permissão {} ao usuário {}", 
                currentUser.getId(), permissionKey, userId);

            UserCustomPermission permission = permissionService.grantPermission(
                userId, permissionKey, currentUser.getId()
            );
            
            return ResponseEntity.ok(permission);
        } catch (Exception e) {
            log.error("Erro ao conceder permissão ao usuário {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Revogar uma permissão específica de um usuário
     */
    @DeleteMapping("/{permissionKey}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> revokePermission(
            @PathVariable UUID userId,
            @PathVariable String permissionKey) {
        try {
            log.info("Revogando permissão {} do usuário {}", permissionKey, userId);
            permissionService.revokePermission(userId, permissionKey);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao revogar permissão do usuário {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Revogar todas as permissões de um usuário
     */
    @DeleteMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> revokeAllPermissions(@PathVariable UUID userId) {
        try {
            log.info("Revogando todas as permissões do usuário {}", userId);
            permissionService.revokeAllPermissions(userId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao revogar todas as permissões do usuário {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Substituir todas as permissões de um usuário
     */
    @PutMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> replacePermissions(
            @PathVariable UUID userId,
            @RequestBody List<String> permissionKeys,
            Authentication authentication) {
        try {
            User currentUser = (User) authentication.getPrincipal();
            log.info("SUPER_ADMIN {} substituindo permissões do usuário {}", 
                currentUser.getId(), userId);

            permissionService.replacePermissions(userId, permissionKeys, currentUser.getId());
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao substituir permissões do usuário {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Verificar se usuário tem uma permissão específica
     */
    @GetMapping("/check/{permissionKey}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Boolean>> checkPermission(
            @PathVariable UUID userId,
            @PathVariable String permissionKey) {
        try {
            boolean hasPermission = permissionService.hasPermission(userId, permissionKey);
            return ResponseEntity.ok(Map.of("hasPermission", hasPermission));
        } catch (Exception e) {
            log.error("Erro ao verificar permissão do usuário {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }
}

