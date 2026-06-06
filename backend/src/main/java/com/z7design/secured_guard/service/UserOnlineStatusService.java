package com.z7design.secured_guard.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
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
@RequiredArgsConstructor
public class UserOnlineStatusService {

    private final Map<UUID, Set<String>> onlineUsers = new ConcurrentHashMap<>();
    private final Map<String, UUID> sessionToUser = new ConcurrentHashMap<>();
    private final ObjectProvider<SimpMessagingTemplate> messagingTemplateProvider;

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

            if (added && wasEmpty) {
                log.info("Usuário {} ficou online (sessão: {})", userId, sessionId);
                notifyUserStatusChange(userId, true);
            } else if (added) {
                log.debug("Usuário {} adicionou nova sessão: {} (total: {})", userId, sessionId, sessions.size());
            }

            return sessions;
        });
    }

    public void userDisconnected(UUID userId, String sessionId) {
        if (sessionId != null) {
            sessionToUser.remove(sessionId);
        }
        if (userId == null) {
            return;
        }
        onlineUsers.computeIfPresent(userId, (key, sessions) -> {
            sessions.remove(sessionId);

            if (sessions.isEmpty()) {
                log.info("Usuário {} ficou offline (última sessão removida: {})", userId, sessionId);
                notifyUserStatusChange(userId, false);
                return null;
            } else {
                log.debug("Usuário {} removeu sessão: {} (restantes: {})", userId, sessionId, sessions.size());
                return sessions;
            }
        });
    }

    public Optional<UUID> resolveUserIdBySession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(sessionToUser.get(sessionId));
    }

    public boolean isUserOnline(UUID userId) {
        return onlineUsers.containsKey(userId) && !onlineUsers.get(userId).isEmpty();
    }

    public int getOnlineUserCount() {
        int count = onlineUsers.size();
        log.debug("Total de usuários online: {}", count);
        if (count > 0) {
            log.debug("IDs dos usuários online: {}", onlineUsers.keySet());
        }
        return count;
    }

    public Set<UUID> getOnlineUserIds() {
        Set<UUID> ids = Set.copyOf(onlineUsers.keySet());
        log.debug("Retornando {} IDs de usuários online: {}", ids.size(), ids);
        return ids;
    }

    private void notifyUserStatusChange(UUID userId, boolean isOnline) {
        SimpMessagingTemplate messagingTemplate = messagingTemplateProvider.getIfAvailable();
        if (messagingTemplate == null) {
            log.debug("SimpMessagingTemplate indisponível; status do usuário {} não broadcastado", userId);
            return;
        }

        try {
            UserStatusEvent event = new UserStatusEvent();
            event.setUserId(userId.toString());
            event.setOnline(isOnline);
            event.setTimestamp(System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/user-status", event);
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
