package com.z7design.secured_guard.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.MessageService;
import com.z7design.secured_guard.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Alias de {@code GET /api/v1/messages/unread/count} em caminho sem {@code /v1/}, para ambientes
 * em que proxies geram {@code ERR_TOO_MANY_REDIRECTS} na URL antiga.
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Mensagens", description = "Alias de contagem não lidas")
public class MessageUnreadCountAliasController {

    private final MessageService messageService;
    private final UserService userService;

    @GetMapping("/unread/count")
    @Operation(summary = "Contagem não lidas (alias)", description = "Igual a GET /api/v1/messages/unread/count")
    public ResponseEntity<Long> countUnreadMessages(Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.ok(0L);
            }
            String username = authentication.getName();
            if (username == null || username.isEmpty()) {
                return ResponseEntity.ok(0L);
            }
            UUID userId = userService.findByUsername(username).map(User::getId).orElse(null);
            if (userId == null) {
                return ResponseEntity.ok(0L);
            }
            Long count = messageService.countUnreadMessages(userId);
            return ResponseEntity.ok(count != null ? count : 0L);
        } catch (Exception e) {
            log.error("Erro ao contar mensagens não lidas (alias): {}", e.getMessage(), e);
            return ResponseEntity.ok(0L);
        }
    }
}
