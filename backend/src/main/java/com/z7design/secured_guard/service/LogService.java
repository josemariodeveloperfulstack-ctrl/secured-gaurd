package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.UserActivityLog;
import com.z7design.secured_guard.model.ErrorLog;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.UserActivityLogRepository;
import com.z7design.secured_guard.repository.ErrorLogRepository;
import com.z7design.secured_guard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class LogService {

    private final UserActivityLogRepository userActivityLogRepository;
    private final ErrorLogRepository errorLogRepository;
    private final UserRepository userRepository;

    @Autowired
    public LogService(UserActivityLogRepository userActivityLogRepository,
            ErrorLogRepository errorLogRepository,
            UserRepository userRepository) {
        this.userActivityLogRepository = userActivityLogRepository;
        this.errorLogRepository = errorLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = Exception.class)
    public void logUserActivity(String username, String action, String details, String ipAddress, String userAgent, String sessionId) {
        try {
            // Validar parâmetros básicos
            if (username == null || username.trim().isEmpty()) {
                System.out.println("⚠️ LogService: Username vazio ou null, pulando log");
                return;
            }

            System.out.println("🔍 LogService: Buscando usuário: " + username);

            UserActivityLog log = new UserActivityLog();

            // Buscar usuário pelo username (com timeout implícito)
            try {
                Optional<User> userOpt = userRepository.findByUsername(username);
                if (userOpt.isPresent()) {
                    log.setUser(userOpt.get());
                    log.setUsername(username);
                    System.out.println("✅ LogService: Usuário encontrado: " + userOpt.get().getId());
                } else {
                    System.out.println("⚠️ LogService: Usuário não encontrado: " + username + " - salvando log sem referência de usuário");
                    // Salvar log mesmo sem usuário para rastreabilidade
                    log.setUsername(username);
                }
            } catch (Exception dbError) {
                System.err.println("⚠️ LogService: Erro ao buscar usuário no banco (não crítico): " + dbError.getMessage());
                // Continuar mesmo sem usuário - salvar log com username apenas
                log.setUsername(username);
            }

            log.setAction(action != null ? action : "UNKNOWN");
            log.setDetails(details != null ? details : "");
            log.setIpAddress(ipAddress != null ? ipAddress : "127.0.0.1");
            log.setUserAgent(userAgent != null ? userAgent : "Unknown");
            log.setSessionId(sessionId != null ? sessionId : "session_unknown");
            log.setStatus("SUCCESS");
            log.setCreatedAt(LocalDateTime.now());

            System.out.println("🔍 LogService: Salvando log - Action: " + action + ", Details: " + details + ", IP: " + ipAddress);

            // Tentar salvar o log (pode falhar silenciosamente)
            try {
                UserActivityLog savedLog = userActivityLogRepository.save(log);
                System.out.println("✅ LogService: Log salvo com ID: " + savedLog.getId());
            } catch (Exception saveError) {
                // Se falhar ao salvar, apenas logar o erro mas não propagar
                System.err.println("⚠️ LogService: Erro ao salvar log no banco (não crítico): " + saveError.getMessage());
                // Não propagar exceção - o log é opcional
            }
        } catch (Exception e) {
            // Capturar qualquer exceção não tratada e não propagar
            System.err.println("❌ LogService: Erro inesperado ao processar log (não crítico): " + e.getMessage());
            // Não fazer printStackTrace em produção para evitar poluição de logs
            // e.printStackTrace();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = Exception.class)
    public void logUserActivity(String username, String action, String details) {
        // Método de compatibilidade - chama o novo método com valores padrão
        // Usar noRollbackFor para garantir que erros não afetem transações principais
        try {
            logUserActivity(username, action, details, "127.0.0.1", "Unknown", "session_unknown");
        } catch (Exception e) {
            // Garantir que exceções não sejam propagadas
            System.err.println("⚠️ LogService: Erro no método de compatibilidade (não crítico): " + e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logCurrentUserActivity(String action, String details) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            System.out.println("🔍 LogService: Verificando autenticação...");

            if (authentication != null && authentication.isAuthenticated()) {
                String username = authentication.getName();
                System.out.println("🔍 LogService: Usuário autenticado: " + username);

                logUserActivity(username, action, details);
                System.out.println("✅ LogService: Atividade registrada para usuário: " + username);
            } else {
                System.out.println("⚠️ LogService: Usuário não autenticado ou authentication é null");
            }
        } catch (Exception e) {
            System.err.println("❌ LogService: Erro ao registrar atividade: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logError(String message, String stackTrace, String endpoint) {
        ErrorLog log = new ErrorLog();
        log.setMessage(message);
        log.setStackTrace(stackTrace);
        log.setEndpoint(endpoint);
        log.setTimestamp(LocalDateTime.now());

        errorLogRepository.save(log);
    }
}