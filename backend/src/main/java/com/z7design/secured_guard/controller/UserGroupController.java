package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.UserGroupDTO;
import com.z7design.secured_guard.dto.UserResponseDTO;
import com.z7design.secured_guard.service.UserGroupService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@Slf4j
public class UserGroupController {
    
    @Autowired
    private UserGroupService userGroupService;
    
    @GetMapping
    public ResponseEntity<List<UserGroupDTO>> getAllGroups() {
        List<UserGroupDTO> groups = userGroupService.getAllGroups();
        return ResponseEntity.ok(groups);
    }

    /** Rotas literais /user/... antes de /{id} para o Spring nunca confundir com variável de path. */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<UserGroupDTO>> getGroupsByUserId(@PathVariable String userId) {
        try {
            UUID uuid = UUID.fromString(userId);
            List<UserGroupDTO> groups = userGroupService.getGroupsByUserId(uuid);
            return ResponseEntity.ok(groups);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(List.of());
        } catch (Throwable t) {
            log.error("Falha ao buscar grupos do usuário {}: {}", userId, t.getMessage(), t);
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/user/{userId}/permissions")
    public ResponseEntity<Set<String>> getUserPermissions(@PathVariable String userId) {
        try {
            UUID uuid = UUID.fromString(userId);
            Set<String> permissions = userGroupService.getUserPermissions(uuid);
            return ResponseEntity.ok(permissions);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(Set.of());
        } catch (Exception e) {
            log.warn("Erro ao buscar permissões do usuário {}: {}", userId, e.getMessage());
            return ResponseEntity.ok(Set.of());
        }
    }

    @GetMapping("/{groupId}/users")
    public ResponseEntity<List<UserResponseDTO>> getUsersByGroup(@PathVariable UUID groupId) {
        List<UserResponseDTO> users = userGroupService.getUsersByGroup(groupId);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{groupId}/available-users")
    public ResponseEntity<List<UserResponseDTO>> getAvailableUsersForGroup(@PathVariable UUID groupId) {
        List<UserResponseDTO> users = userGroupService.getAvailableUsersForGroup(groupId);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserGroupDTO> getGroupById(@PathVariable UUID id) {
        UserGroupDTO group = userGroupService.getGroupById(id);
        return ResponseEntity.ok(group);
    }
    
    @PostMapping
    public ResponseEntity<UserGroupDTO> createGroup(@RequestBody UserGroupDTO groupDTO) {
        UserGroupDTO createdGroup = userGroupService.createGroup(groupDTO);
        return ResponseEntity.ok(createdGroup);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<UserGroupDTO> updateGroup(@PathVariable UUID id, @RequestBody UserGroupDTO groupDTO) {
        UserGroupDTO updatedGroup = userGroupService.updateGroup(id, groupDTO);
        return ResponseEntity.ok(updatedGroup);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable UUID id) {
        userGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{groupId}/users/{userId}")
    public ResponseEntity<?> addUserToGroup(@PathVariable UUID groupId, @PathVariable String userId) {
        try {
            UUID uuid = UUID.fromString(userId);
            userGroupService.addUserToGroup(uuid, groupId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "ID de usuário inválido"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
    
    @DeleteMapping("/{groupId}/users/{userId}")
    public ResponseEntity<?> removeUserFromGroup(@PathVariable UUID groupId, @PathVariable String userId) {
        try {
            UUID uuid = UUID.fromString(userId);
            userGroupService.removeUserFromGroup(uuid, groupId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "ID de usuário inválido"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
    
    @PostMapping("/initialize")
    public ResponseEntity<Void> initializeDefaultGroups() {
        userGroupService.initializeDefaultGroups();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sync-users")
    public ResponseEntity<Void> syncUsersWithGroups() {
        userGroupService.syncUsersWithGroups();
        return ResponseEntity.ok().build();
    }
} 