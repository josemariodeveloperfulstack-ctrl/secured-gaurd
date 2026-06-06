package com.z7design.secured_guard.config;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.security.JwtService;
import com.z7design.secured_guard.service.UserOnlineStatusService;
import com.z7design.secured_guard.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;

/**
 * Configuração de segurança para WebSocket
 * Autentica conexões WebSocket usando JWT
 */
@Configuration
@ConditionalOnProperty(name = "app.websocket.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    @Lazy
    private UserOnlineStatusService userOnlineStatusService;

    @Autowired
    @Lazy
    private UserService userService;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    log.debug("Tentando autenticar conexão WebSocket - sessionId: {}", accessor.getSessionId());
                    
                    // Extrair token do header Authorization
                    List<String> authHeaders = accessor.getNativeHeader("Authorization");
                    
                    if (authHeaders != null && !authHeaders.isEmpty()) {
                        String authHeader = authHeaders.get(0);
                        
                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                            String token = authHeader.substring(7);
                            
                            try {
                                // Extrair username do token
                                String username = jwtService.extractUsername(token);
                                log.debug("Username extraído do token: {}", username);
                                
                                if (username != null) {
                                    // Carregar UserDetails
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                    
                                    // Validar token
                                    if (jwtService.isTokenValid(token, userDetails)) {
                                        // Criar autenticação
                                        Authentication authentication = new UsernamePasswordAuthenticationToken(
                                            userDetails,
                                            null,
                                            userDetails.getAuthorities()
                                        );
                                        
                                        // Definir o principal na sessão
                                        accessor.setUser(authentication);
                                        registerOnlineUser(username, accessor.getSessionId());
                                        
                                        log.info("✅ WebSocket autenticado para usuário: {} (sessionId: {})", username, accessor.getSessionId());
                                    } else {
                                        log.warn("⚠️ Token JWT inválido para conexão WebSocket (username: {})", username);
                                    }
                                } else {
                                    log.warn("⚠️ Não foi possível extrair username do token JWT");
                                }
                            } catch (Exception e) {
                                log.error("❌ Erro ao autenticar conexão WebSocket: {}", e.getMessage(), e);
                                // Não bloquear a conexão, apenas logar o erro
                            }
                        } else {
                            log.warn("⚠️ Header Authorization não encontrado ou formato inválido na conexão WebSocket");
                        }
                    } else {
                        // Tentar extrair do header X-Username (fallback)
                        List<String> usernameHeaders = accessor.getNativeHeader("X-Username");
                        if (usernameHeaders != null && !usernameHeaders.isEmpty()) {
                            String username = usernameHeaders.get(0);
                            log.debug("Tentando autenticar via X-Username: {}", username);
                            try {
                                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                Authentication authentication = new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                                );
                                accessor.setUser(authentication);
                                registerOnlineUser(username, accessor.getSessionId());
                                log.info("✅ WebSocket autenticado via X-Username para usuário: {} (sessionId: {})", username, accessor.getSessionId());
                            } catch (Exception e) {
                                log.error("❌ Erro ao autenticar via X-Username (username: {}): {}", username, e.getMessage(), e);
                            }
                        } else {
                            log.warn("⚠️ Nenhum método de autenticação encontrado para conexão WebSocket (sessionId: {})", accessor.getSessionId());
                        }
                    }
                }
                
                if (accessor != null && StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                    String sessionId = accessor.getSessionId();
                    UUID userId = resolveUserId(accessor);
                    if (userId == null && sessionId != null) {
                        userId = userOnlineStatusService.resolveUserIdBySession(sessionId).orElse(null);
                    }
                    if (userId != null) {
                        log.info("WebSocket DISCONNECT: usuário {} (sessionId: {})", userId, sessionId);
                        userOnlineStatusService.userDisconnected(userId, sessionId);
                    }
                }

                return message;
            }
        });
    }

    private void registerOnlineUser(String username, String sessionId) {
        if (username == null || sessionId == null) {
            return;
        }
        try {
            Optional<User> user = userService.findByUsername(username);
            user.ifPresent(u -> userOnlineStatusService.userConnected(u.getId(), sessionId));
        } catch (Exception e) {
            log.error("Erro ao registrar usuário online via WebSocket ({}): {}", username, e.getMessage(), e);
        }
    }

    private UUID resolveUserId(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            return null;
        }
        try {
            return userService.findByUsername(accessor.getUser().getName())
                    .map(User::getId)
                    .orElse(null);
        } catch (Exception e) {
            log.warn("Não foi possível resolver userId do principal {}: {}", accessor.getUser().getName(), e.getMessage());
            return null;
        }
    }
}

