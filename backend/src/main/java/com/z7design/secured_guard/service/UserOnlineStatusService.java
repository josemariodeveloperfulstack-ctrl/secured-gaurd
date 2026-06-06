package com.z7design.secured_guard.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Serviço para rastrear e gerenciar o status online/offline dos usuários
 */
@Service
@Slf4j
public class UserOnlineStatusService {

    // Mapa de userId -> Set de sessionIds (um usuário pode ter múltiplas sessões)
    private final Map<UUID, Set<String>> onlineUsers = new ConcurrentHashMap<>();

    // sessionId -> userId (permite desconectar mesmo quando o Principal já sumiu)
    private final Map<String, UUID> sessionToUser = new ConcurrentHashMap<>();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Registra que um usuário está online
     * @param userId ID do usuário
     * @param sessionId ID da sessão WebSocket
     */
    public void userConnected(UUID userId, String sessionId) {
        if (userId == null || sessionId == null || sessionId.isBlank()) {
            return;
        }
        sessionToUser.put(sessionId, userId);
        onlineUsers.compute(userId, (key, sessions) -> {
            if (sessions == null) {
                sessions = ConcurrentHashMap.newKeySet();
            }
            boolean wasEmpty = sessions.isEmpty();
            boolean added = sessions.add(sessionId);

            // Primeira sessão deste usuário → broadcast online
            if (added && wasEmpty) {
                log.info("Usuário {} ficou online (sessão: {})", userId, sessionId);
                notifyUserStatusChange(userId, true);
            } else if (added) {
                log.debug("Usuário {} adicionou nova sessão: {} (total: {})", userId, sessionId, sessions.size());
            }

            return sessions;
        });
    }

    /**
     * Registra que um usuário está offline
     * @param userId ID do usuário
     * @param sessionId ID da sessão WebSocket
     */
    public void userDisconnected(UUID userId, String sessionId) {
        if (sessionId != null) {
            sessionToUser.remove(sessionId);
        }
        if (userId == null) {
            return;
        }
        onlineUsers.computeIfPresent(userId, (key, sessions) -> {
            sessions.remove(sessionId);

            // Se não há mais sessões, o usuário ficou offline
            if (sessions.isEmpty()) {
                log.info("Usuário {} ficou offline (última sessão removida: {})", userId, sessionId);
                notifyUserStatusChange(userId, false);
                return null; // Remove o usuário do mapa
            } else {
                log.debug("Usuário {} removeu sessão: {} (restantes: {})", userId, sessionId, sessions.size());
                return sessions;
            }
        });
    }

    /**
     * Resolve o usuário associado a uma sessão WebSocket (fallback na desconexão).
     */
    public Optional<UUID> resolveUserIdBySession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(sessionToUser.get(sessionId));
    }

    /**
     * Verifica se um usuário está online
     * @param userId ID do usuário
     * @return true se o usuário está online, false caso contrário
     */
    public boolean isUserOnline(UUID userId) {
        return onlineUsers.containsKey(userId) && !onlineUsers.get(userId).isEmpty();
    }

    /**
     * Obtém o número de usuários online
     * @return número de usuários online
     */
    public int getOnlineUserCount() {
        int count = onlineUsers.size();
        log.debug("Total de usuários online: {}", count);
        if (count > 0) {
            log.debug("IDs dos usuários online: {}", onlineUsers.keySet());
        }
        return count;
    }

    /**
     * Obtém todos os IDs de usuários online
     * @return Set de IDs de usuários online
     */
    public Set<UUID> getOnlineUserIds() {
        Set<UUID> ids = Set.copyOf(onlineUsers.keySet());
        log.debug("Retornando {} IDs de usuários online: {}", ids.size(), ids);
        return ids;
    }

    /**
     * Notifica todos os clientes sobre mudança de status de um usuário
     * @param userId ID do usuário
     * @param isOnline true se ficou online, false se ficou offline
     */
    private void notifyUserStatusChange(UUID userId, boolean isOnline) {
        try {
            UserStatusEvent event = new UserStatusEvent();
            event.setUserId(userId.toString());
            event.setOnline(isOnline);
            event.setTimestamp(System.currentTimeMillis());

            // Enviar para tópico público (broadcast)
            messagingTemplate.convertAndSend("/topic/user-status", event);
            
            // Enviar para fila específica do usuário (se necessário)
            messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/user-status",
                event
            );

            log.debug("Notificação de status enviada: usuário {} está {}", userId, isOnline ? "online" : "offline");
        } catch (Exception e) {
            log.error("Erro ao notificar mudança de status do usuário {}: {}", userId, e.getMessage(), e);
        }
    }

    /**
     * DTO interno para eventos de status
     */
    public static class UserStatusEvent {
        private String userId;
        @JsonProperty("isOnline")
        private boolean isOnline;
        private long timestamp;

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        @JsonProperty("isOnline")
        public boolean isOnline() {
            return isOnline;
        }

        @JsonProperty("isOnline")
        public void setOnline(boolean online) {
            isOnline = online;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }
    }
}


