package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Role;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleMigrationService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void migrateRolesOnStartup() {
        try {
            log.info("Iniciando migração de roles do enum para entidades JPA (assíncrono)...");
            
            // Executar em background com timeout de 30 segundos
            CompletableFuture<Void> migrationFuture = CompletableFuture.runAsync(() -> {
                try {
                    // Verificar se existem usuários antes de tentar migrar
                    long userCount = userRepository.count();
                    if (userCount == 0) {
                        log.info("Nenhum usuário encontrado no banco. Pulando migração de roles.");
                        return;
                    }
                    
                    migrateExistingUsers();
                    log.info("Migração de roles concluída com sucesso!");
                } catch (Exception e) {
                    log.error("❌ Erro durante migração de roles: {}", e.getMessage(), e);
                }
            });
            
            // Aguardar no máximo 30 segundos
            migrationFuture.get(30, TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            log.warn("⚠️ Migração de roles demorou mais de 30 segundos. Continuando em background...");
        } catch (Exception e) {
            log.error("❌ Erro durante migração de roles: {}", e.getMessage(), e);
            // Não re-lançar exceção para não crashar a aplicação
            // A migração de roles não é crítica para o funcionamento básico
        }
    }

    @Transactional
    private void migrateExistingUsers() {
        // Usar paginação para evitar carregar todos os usuários de uma vez
        int pageSize = 100;
        int page = 0;
        List<User> users;
        
        do {
            users = userRepository.findAll(org.springframework.data.domain.PageRequest.of(page, pageSize)).getContent();
            page++;
            
            for (User user : users) {
                try {
                    // Se o usuário já tem role_id, pular
                    if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                        log.debug("Usuário {} já tem role JPA, pulando...", user.getUsername());
                        continue;
                    }

                    // Tentar migrar baseado no campo role enum (se ainda existir)
                    // Como o modelo foi refatorado, vamos buscar o role pelo nome do usuário
                    // ou criar um role padrão
                    
                    String roleName = determineUserRoleName(user);
                    Optional<Role> roleOpt = roleRepository.findByName(roleName);
                    
                    if (roleOpt.isPresent()) {
                        user.setRoles(new java.util.HashSet<>(java.util.List.of(roleOpt.get())));
                        userRepository.save(user);
                        log.info("Usuário {} migrado para role: {}", user.getUsername(), roleName);
                    } else {
                        // Se não encontrar o role, usar SUPER_ADMIN como padrão
                        Optional<Role> defaultRole = roleRepository.findByName("SUPER_ADMIN");
                        if (defaultRole.isPresent()) {
                            user.setRoles(new java.util.HashSet<>(java.util.List.of(defaultRole.get())));
                            userRepository.save(user);
                            log.warn("Usuário {} migrado para role padrão SUPER_ADMIN", user.getUsername());
                        } else {
                            log.error("Não foi possível encontrar role SUPER_ADMIN para usuário: {}", user.getUsername());
                        }
                    }
                    
                } catch (Exception e) {
                    log.error("Erro ao migrar usuário {}: {}", user.getUsername(), e.getMessage(), e);
                }
            }
        } while (!users.isEmpty());
    }

    private String determineUserRoleName(User user) {
        // Como o modelo foi refatorado, vamos usar uma lógica baseada no username
        // ou grupos do usuário para determinar o role
        
        if (user.getUsername().equals("jose.ramos")) {
            return "SUPER_ADMIN";
        }
        
        // Verificar grupos do usuário
        if (user.getGroups() != null && !user.getGroups().isEmpty()) {
            for (var group : user.getGroups()) {
                String groupName = group.getGroupName().name();
                if (groupName.contains("SUPER_ADMIN")) {
                    return "SUPER_ADMIN";
                } else if (groupName.contains("ADMIN")) {
                    return "ADMIN";
                } else if (groupName.contains("RH")) {
                    return "RH";
                } else if (groupName.contains("FINANCEIRO")) {
                    return "FINANCEIRO";
                } else if (groupName.contains("SUPERVISOR")) {
                    return "SUPERVISOR";
                } else if (groupName.contains("TI")) {
                    return "TI_SUPORTE";
                } else if (groupName.contains("AUDITOR")) {
                    return "AUDITOR";
                }
            }
        }
        
        // Role padrão
        return "USER";
    }

    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void createDefaultRolesIfNotExist() {
        try {
            log.info("Verificando e criando roles padrão (assíncrono)...");
            
            // Executar em background com timeout de 10 segundos
            CompletableFuture<Void> rolesFuture = CompletableFuture.runAsync(() -> {
                try {
                    // Verificar se já existem roles
                    long roleCount = roleRepository.count();
                    if (roleCount > 0) {
                        log.info("Roles já existem no banco. Pulando criação de roles padrão.");
                        return;
                    }
                    
                    createDefaultRoles();
                    log.info("Roles padrão criadas com sucesso!");
                } catch (Exception e) {
                    log.error("❌ Erro durante criação de roles padrão: {}", e.getMessage(), e);
                }
            });
            
            // Aguardar no máximo 10 segundos
            rolesFuture.get(10, TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            log.warn("⚠️ Criação de roles padrão demorou mais de 10 segundos. Continuando em background...");
        } catch (Exception e) {
            log.error("❌ Erro durante criação de roles padrão: {}", e.getMessage(), e);
            // Não re-lançar exceção para não crashar a aplicação
            // A criação de roles padrão não é crítica para o funcionamento básico
        }
    }

    private void createDefaultRoles() {
        // Criar roles padrão se não existirem
        String[] defaultRoles = {
            "SUPER_ADMIN",
            "ADMIN", 
            "RH",
            "FINANCEIRO",
            "SUPERVISOR",
            "TI_SUPORTE",
            "AUDITOR",
            "USER"
        };
        
        for (String roleName : defaultRoles) {
            if (!roleRepository.findByName(roleName).isPresent()) {
                Role role = Role.builder()
                    .name(roleName)
                    .description("Role " + roleName)
                    .build();
                roleRepository.save(role);
                log.info("Role criada: {}", roleName);
            }
        }
    }
} 