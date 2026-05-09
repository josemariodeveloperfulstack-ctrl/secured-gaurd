package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.UserGroupDTO;
import com.z7design.secured_guard.dto.UserResponseDTO;
import com.z7design.secured_guard.service.UserGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
public class UserGroupController {
    
    @Autowired
    private UserGroupService userGroupService;
    
    @GetMapping
    public ResponseEntity<List<UserGroupDTO>> getAllGroups() {
        List<UserGroupDTO> groups = userGroupService.getAllGroups();
        return ResponseEntity.ok(groups);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserGroupDTO> getGroupById(@PathVariable UUID id) {
        UserGroupDTO group = userGroupService.getGroupById(id);
        return ResponseEntity.ok(group);
    }
    
    @GetMapping("/user/{userId}")
    // Permissão já gerenciada pelo SecurityConfig - permite acesso autenticado
    public ResponseEntity<List<UserGroupDTO>> getGroupsByUserId(@PathVariable String userId) {
        try {
            UUID uuid = UUID.fromString(userId);
            List<UserGroupDTO> groups = userGroupService.getGroupsByUserId(uuid);
            return ResponseEntity.ok(groups);
        } catch (IllegalArgumentException e) {
            // Se não for um UUID válido, retornar lista vazia
            return ResponseEntity.ok(List.of());
        } catch (Throwable t) {
            // Log do erro para debug
            System.err.println("ERRO CRÍTICO ao buscar grupos do usuário " + userId + ": " + t.getMessage());
            t.printStackTrace();
            
            // Tentar identificar a causa raiz
            String rootMsg = t.getMessage() != null ? t.getMessage().replaceAll("[\\r\\n]", " ") : "Unknown error";
            if (t.getCause() != null && t.getCause().getMessage() != null) {
                rootMsg += " | Cause: " + t.getCause().getMessage().replaceAll("[\\r\\n]", " ");
            }
            
            // Retornar 500 com a mensagem para debug se for o caso
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("X-Error-Message", rootMsg)
                    .body(new ArrayList<UserGroupDTO>());
        }
    }
    
    @GetMapping("/user/{userId}/permissions")
    // Permissão já gerenciada pelo SecurityConfig - permite acesso autenticado
    public ResponseEntity<Set<String>> getUserPermissions(@PathVariable String userId) {
        try {
            UUID uuid = UUID.fromString(userId);
            Set<String> permissions = userGroupService.getUserPermissions(uuid);
            return ResponseEntity.ok(permissions);
        } catch (IllegalArgumentException e) {
            // Se não for um UUID válido, retornar conjunto vazio
            return ResponseEntity.ok(Set.of());
        } catch (Exception e) {
            // Log do erro para debug
            System.err.println("Erro ao buscar permissões do usuário " + userId + ": " + e.getMessage());
            e.printStackTrace();
            // Retornar conjunto vazio em caso de erro para não quebrar o frontend
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