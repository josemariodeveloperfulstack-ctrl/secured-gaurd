package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.UserCustomPermission;
import com.z7design.secured_guard.repository.UserCustomPermissionRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserCustomPermissionService {

    private final UserCustomPermissionRepository permissionRepository;
    private final UserRepository userRepository;

    /**
     * Conceder uma permissão customizada a um usuário
     */
    @Transactional
    public UserCustomPermission grantPermission(UUID userId, String permissionKey, UUID grantedByUserId) {
        log.info("Concedendo permissão {} ao usuário {}", permissionKey, userId);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + userId));

        User grantedBy = userRepository.findById(grantedByUserId)
            .orElseThrow(() -> new RuntimeException("Usuário que concedeu não encontrado: " + grantedByUserId));

        // Verificar se já existe a permissão
        return permissionRepository.findByUserIdAndPermissionKey(userId, permissionKey)
            .map(existing -> {
                // Reativar se estiver desabilitada
                if (!existing.getEnabled()) {
                    existing.setEnabled(true);
                    existing.setGrantedAt(LocalDateTime.now());
                    existing.setGrantedBy(grantedBy);
                    existing.setRevokedAt(null);
                    log.info("Permissão {} reativada para usuário {}", permissionKey, userId);
                }
                return permissionRepository.save(existing);
            })
            .orElseGet(() -> {
                // Criar nova permissão
                UserCustomPermission newPermission = UserCustomPermission.builder()
                    .user(user)
                    .permissionKey(permissionKey)
                    .enabled(true)
                    .grantedBy(grantedBy)
                    .grantedAt(LocalDateTime.now())
                    .build();
                
                log.info("Nova permissão {} criada para usuário {}", permissionKey, userId);
                return permissionRepository.save(newPermission);
            });
    }

    /**
     * Revogar uma permissão customizada de um usuário
     */
    @Transactional
    public void revokePermission(UUID userId, String permissionKey) {
        log.info("Revogando permissão {} do usuário {}", permissionKey, userId);

        permissionRepository.findByUserIdAndPermissionKey(userId, permissionKey)
            .ifPresent(permission -> {
                permission.setEnabled(false);
                permission.setRevokedAt(LocalDateTime.now());
                permissionRepository.save(permission);
                log.info("Permissão {} revogada do usuário {}", permissionKey, userId);
            });
    }

    /**
     * Obter todas as permissões ativas de um usuário
     */
    public List<String> getActivePermissions(UUID userId) {
        return permissionRepository.findActivePermissionsByUserId(userId)
            .stream()
            .map(UserCustomPermission::getPermissionKey)
            .collect(Collectors.toList());
    }

    /**
     * Obter todas as permissões de um usuário (incluindo inativas)
     */
    public List<UserCustomPermission> getAllPermissions(UUID userId) {
        return permissionRepository.findAllByUserId(userId);
    }

    /**
     * Verificar se usuário tem uma permissão ativa específica
     */
    public boolean hasPermission(UUID userId, String permissionKey) {
        return permissionRepository.hasActivePermission(userId, permissionKey);
    }

    /**
     * Revogar todas as permissões de um usuário
     */
    @Transactional
    public void revokeAllPermissions(UUID userId) {
        log.info("Revogando todas as permissões do usuário {}", userId);
        
        List<UserCustomPermission> permissions = permissionRepository.findAllByUserId(userId);
        LocalDateTime now = LocalDateTime.now();
        
        permissions.forEach(permission -> {
            if (permission.getEnabled()) {
                permission.setEnabled(false);
                permission.setRevokedAt(now);
            }
        });
        
        permissionRepository.saveAll(permissions);
        log.info("{} permissões revogadas do usuário {}", permissions.size(), userId);
    }

    /**
     * Conceder múltiplas permissões de uma vez
     */
    @Transactional
    public void grantMultiplePermissions(UUID userId, List<String> permissionKeys, UUID grantedByUserId) {
        log.info("Concedendo {} permissões ao usuário {}", permissionKeys.size(), userId);
        
        for (String permissionKey : permissionKeys) {
            grantPermission(userId, permissionKey, grantedByUserId);
        }
    }

    /**
     * Substituir todas as permissões de um usuário
     */
    @Transactional
    public void replacePermissions(UUID userId, List<String> newPermissionKeys, UUID grantedByUserId) {
        log.info("Substituindo permissões do usuário {} por {} novas permissões", userId, newPermissionKeys.size());
        
        // Revogar todas as permissões existentes
        revokeAllPermissions(userId);
        
        // Conceder as novas permissões
        grantMultiplePermissions(userId, newPermissionKeys, grantedByUserId);
    }
}

