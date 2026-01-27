package com.z7design.secured_guard.config;

import com.z7design.secured_guard.service.UserOnlineStatusService;
import com.z7design.secured_guard.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.security.Principal;
import java.util.UUID;

/**
 * Listener de eventos WebSocket para rastrear conexões e desconexões de usuários
 */
@Component
@Slf4j
public class WebSocketEventListener {

    @Autowired
    private UserOnlineStatusService userOnlineStatusService;

    @Autowired
    private UserService userService;

    /**
     * Evento disparado quando uma sessão WebSocket é conectada
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Principal principal = headerAccessor.getUser();

        // Log TODOS os eventos de conexão, mesmo sem principal
        log.info("🔌 [WebSocket] Evento de conexão recebido - sessionId: {}, principal: {}", 
            sessionId, principal != null ? principal.getName() : "null");

        if (principal != null) {
            try {
                String username = principal.getName();
                log.info("🔍 [WebSocket] Tentando encontrar usuário com username: {}", username);
                
                UUID userId = userService.findByUsername(username)
                    .map(user -> {
                        log.info("✅ [WebSocket] Usuário encontrado: {} (ID: {})", username, user.getId());
                        return user.getId();
                    })
                    .orElse(null);

                if (userId != null) {
                    log.info("✅ [WebSocket] CONECTADO: usuário {} (ID: {}, sessionId: {})", username, userId, sessionId);
                    userOnlineStatusService.userConnected(userId, sessionId);
                    
                    // Log de debug: listar todos os usuários online após esta conexão
                    int onlineCount = userOnlineStatusService.getOnlineUserCount();
                    log.info("📊 [WebSocket] Total de usuários online após conexão: {}", onlineCount);
                    if (onlineCount > 0) {
                        log.info("📊 [WebSocket] IDs dos usuários online: {}", userOnlineStatusService.getOnlineUserIds());
                    }
                } else {
                    log.warn("⚠️ [WebSocket] Usuário não encontrado para username: {} (sessionId: {})", username, sessionId);
                }
            } catch (Exception e) {
                log.error("❌ [WebSocket] Erro ao processar conexão (sessionId: {}): {}", sessionId, e.getMessage(), e);
            }
        } else {
            log.warn("⚠️ [WebSocket] Conexão SEM PRINCIPAL (sessionId: {}) - Isso pode indicar problema de autenticação", sessionId);
            // Tentar obter informações alternativas do header
            String authHeader = headerAccessor.getFirstNativeHeader("Authorization");
            String usernameHeader = headerAccessor.getFirstNativeHeader("X-Username");
            log.warn("⚠️ [WebSocket] Headers disponíveis - Authorization: {}, X-Username: {}", 
                authHeader != null ? "presente" : "ausente",
                usernameHeader != null ? usernameHeader : "ausente");
            
            // Tentar autenticar usando o header X-Username como fallback
            if (usernameHeader != null && !usernameHeader.isEmpty()) {
                try {
                    log.info("🔄 [WebSocket] Tentando autenticar via X-Username: {}", usernameHeader);
                    UUID userId = userService.findByUsername(usernameHeader)
                        .map(user -> {
                            log.info("✅ [WebSocket] Usuário encontrado via X-Username: {} (ID: {})", usernameHeader, user.getId());
                            return user.getId();
                        })
                        .orElse(null);
                    
                    if (userId != null) {
                        log.info("✅ [WebSocket] CONECTADO via X-Username: {} (ID: {}, sessionId: {})", usernameHeader, userId, sessionId);
                        userOnlineStatusService.userConnected(userId, sessionId);
                        int onlineCount = userOnlineStatusService.getOnlineUserCount();
                        log.info("📊 [WebSocket] Total de usuários online após conexão: {}", onlineCount);
                    }
                } catch (Exception e) {
                    log.error("❌ [WebSocket] Erro ao autenticar via X-Username: {}", e.getMessage(), e);
                }
            }
        }
    }

    /**
     * Evento disparado quando uma sessão WebSocket é desconectada
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            try {
                String username = principal.getName();
                UUID userId = userService.findByUsername(username)
                    .map(user -> user.getId())
                    .orElse(null);

                if (userId != null) {
                    log.info("WebSocket desconectado: usuário {} (sessionId: {})", username, sessionId);
                    userOnlineStatusService.userDisconnected(userId, sessionId);
                } else {
                    log.warn("Usuário não encontrado para username: {}", username);
                }
            } catch (Exception e) {
                log.error("Erro ao processar desconexão WebSocket: {}", e.getMessage(), e);
            }
        } else {
            log.warn("Desconexão WebSocket sem principal (sessionId: {})", sessionId);
        }
    }

    /**
     * Evento disparado quando um cliente se subscreve a um tópico
     */
    @EventListener
    public void handleWebSocketSubscribeListener(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String destination = headerAccessor.getDestination();
        Principal principal = headerAccessor.getUser();

        if (principal != null && destination != null) {
            log.debug("Subscrição WebSocket: usuário {} subscreveu a {} (sessionId: {})", 
                principal.getName(), destination, sessionId);
        }
    }

    /**
     * Evento disparado quando um cliente cancela subscrição a um tópico
     */
    @EventListener
    public void handleWebSocketUnsubscribeListener(SessionUnsubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            log.debug("Cancelamento de subscrição WebSocket: usuário {} (sessionId: {})", 
                principal.getName(), sessionId);
        }
    }
}


