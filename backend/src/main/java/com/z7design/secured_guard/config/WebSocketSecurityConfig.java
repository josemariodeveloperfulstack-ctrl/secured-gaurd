package com.z7design.secured_guard.config;

import com.z7design.secured_guard.security.JwtService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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

/**
 * Configuração de segurança para WebSocket
 * Autentica conexões WebSocket usando JWT
 */
@Configuration
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extrair token do header Authorization
                    List<String> authHeaders = accessor.getNativeHeader("Authorization");
                    
                    if (authHeaders != null && !authHeaders.isEmpty()) {
                        String authHeader = authHeaders.get(0);
                        
                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                            String token = authHeader.substring(7);
                            
                            try {
                                // Extrair username do token
                                String username = jwtService.extractUsername(token);
                                
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
                                        
                                        log.info("WebSocket autenticado para usuário: {}", username);
                                    } else {
                                        log.warn("Token JWT inválido para conexão WebSocket");
                                    }
                                } else {
                                    log.warn("Não foi possível extrair username do token JWT");
                                }
                            } catch (Exception e) {
                                log.error("Erro ao autenticar conexão WebSocket: {}", e.getMessage(), e);
                            }
                        } else {
                            log.warn("Header Authorization não encontrado ou formato inválido na conexão WebSocket");
                        }
                    } else {
                        // Tentar extrair do header X-Username (fallback)
                        List<String> usernameHeaders = accessor.getNativeHeader("X-Username");
                        if (usernameHeaders != null && !usernameHeaders.isEmpty()) {
                            String username = usernameHeaders.get(0);
                            try {
                                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                Authentication authentication = new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                                );
                                accessor.setUser(authentication);
                                log.info("WebSocket autenticado via X-Username para usuário: {}", username);
                            } catch (Exception e) {
                                log.error("Erro ao autenticar via X-Username: {}", e.getMessage(), e);
                            }
                        } else {
                            log.warn("Nenhum método de autenticação encontrado para conexão WebSocket");
                        }
                    }
                }
                
                return message;
            }
        });
    }
}

