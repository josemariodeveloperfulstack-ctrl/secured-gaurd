package com.z7design.secured_guard.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.z7design.secured_guard.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Endpoints de sessão fora de {@code /api/users/**} para evitar loops de redirect em
 * alguns proxies (CI) que tratam URLs com {@code /users/} de forma especial.
 */
@RestController
@RequestMapping("/api/session")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Sessão", description = "Sincronização de role e token")
public class SessionController {

    private final UserService userService;

    @GetMapping("/current-role")
    @Operation(summary = "Role atual (alias)", description = "Igual a GET /api/users/me/current-role — JWT e roles atualizados")
    public ResponseEntity<?> getCurrentRole() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).build();
            }
            return userService.buildCurrentRoleForUsername(authentication.getName())
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado")));
        } catch (Exception e) {
            log.error("Erro ao obter role atual (session): {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao obter role: " + e.getMessage()));
        }
    }
}
