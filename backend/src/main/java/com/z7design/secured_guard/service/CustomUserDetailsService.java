package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.PermissionRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.info("Carregando detalhes do usuário: {}", username);
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado: " + username));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();

        // Adicionar o role do usuário
        if (user.getRoles() != null) {
            log.info("Usuário {} tem {} roles", username, user.getRoles().size());
            for (var role : user.getRoles()) {
                String roleName = "ROLE_" + role.getName();
                authorities.add(new SimpleGrantedAuthority(roleName));
                log.info("Adicionado role: {}", roleName);
            }
        } else {
            log.warn("Usuário {} não tem roles definidos", username);
        }

        // Se for SUPER_ADMIN, dar permissões básicas (temporário para resolver problema de performance)
        if (user.getRoles() != null && user.getRoles().stream().anyMatch(r -> r.getName().equals("SUPER_ADMIN"))) {
            log.info("🔴 SUPER_ADMIN detectado! Adicionando permissões básicas.");
            // Adicionar permissões básicas para SUPER_ADMIN
            authorities.add(new SimpleGrantedAuthority("EQUIPMENTS_READ"));
            authorities.add(new SimpleGrantedAuthority("EQUIPMENTS_WRITE"));
            authorities.add(new SimpleGrantedAuthority("EQUIPMENTS_CREATE"));
            authorities.add(new SimpleGrantedAuthority("EQUIPMENTS_DELETE"));
            authorities.add(new SimpleGrantedAuthority("EQUIPMENTS_ASSIGN"));
            authorities.add(new SimpleGrantedAuthority("USERS_READ"));
            authorities.add(new SimpleGrantedAuthority("USERS_WRITE"));
            authorities.add(new SimpleGrantedAuthority("USERS_CREATE"));
            authorities.add(new SimpleGrantedAuthority("USERS_DELETE"));
            authorities.add(new SimpleGrantedAuthority("EMPLOYEES_READ"));
            authorities.add(new SimpleGrantedAuthority("EMPLOYEES_WRITE"));
            authorities.add(new SimpleGrantedAuthority("EMPLOYEES_CREATE"));
            authorities.add(new SimpleGrantedAuthority("EMPLOYEES_DELETE"));
            // Adicionar permissões de PAYSLIPS para SUPER_ADMIN
            authorities.add(new SimpleGrantedAuthority("PAYSLIPS_READ"));
            authorities.add(new SimpleGrantedAuthority("PAYSLIPS_WRITE"));
            authorities.add(new SimpleGrantedAuthority("PAYSLIPS_CREATE"));
            authorities.add(new SimpleGrantedAuthority("PAYSLIPS_DELETE"));
            authorities.add(new SimpleGrantedAuthority("PAYSLIPS_PUBLISH"));
            // Adicionar outras permissões importantes para SUPER_ADMIN
            authorities.add(new SimpleGrantedAuthority("GROUPS_READ"));
            authorities.add(new SimpleGrantedAuthority("GROUPS_WRITE"));
            authorities.add(new SimpleGrantedAuthority("GROUPS_CREATE"));
            authorities.add(new SimpleGrantedAuthority("GROUPS_DELETE"));
            authorities.add(new SimpleGrantedAuthority("CLIENTS_READ"));
            authorities.add(new SimpleGrantedAuthority("CLIENTS_WRITE"));
            authorities.add(new SimpleGrantedAuthority("CLIENTS_CREATE"));
            authorities.add(new SimpleGrantedAuthority("CLIENTS_DELETE"));
            authorities.add(new SimpleGrantedAuthority("CONTRACTS_READ"));
            authorities.add(new SimpleGrantedAuthority("CONTRACTS_WRITE"));
            authorities.add(new SimpleGrantedAuthority("CONTRACTS_CREATE"));
            authorities.add(new SimpleGrantedAuthority("CONTRACTS_DELETE"));
            authorities.add(new SimpleGrantedAuthority("FINANCIAL_READ"));
            authorities.add(new SimpleGrantedAuthority("FINANCIAL_WRITE"));
            authorities.add(new SimpleGrantedAuthority("FINANCIAL_CREATE"));
            authorities.add(new SimpleGrantedAuthority("FINANCIAL_DELETE"));
            authorities.add(new SimpleGrantedAuthority("REPORTS_READ"));
            authorities.add(new SimpleGrantedAuthority("REPORTS_GENERATE"));
            authorities.add(new SimpleGrantedAuthority("REPORTS_EXPORT"));
            authorities.add(new SimpleGrantedAuthority("MESSAGES_READ"));
            authorities.add(new SimpleGrantedAuthority("MESSAGES_WRITE"));
        } else {
            // Para outros usuários, carregar permissões dos grupos
            String sql = """
                SELECT DISTINCT ugp.permission_name
                FROM user_group_membership ugm
                JOIN user_groups ug ON ugm.group_id = ug.id
                JOIN user_group_permissions ugp ON ug.id = ugp.group_id
                WHERE ugm.user_id = ?
                """;
            
            try {
                List<String> permissions = jdbcTemplate.queryForList(sql, String.class, user.getId());
                log.info("Usuário {} tem {} permissões dos grupos", username, permissions.size());
                for (String permission : permissions) {
                    authorities.add(new SimpleGrantedAuthority(permission));
                    log.debug("Adicionada permissão do grupo: {}", permission);
                }
            } catch (Exception e) {
                log.error("Erro ao carregar permissões dos grupos para {}: {}", username, e.getMessage());
            }
        }

        log.info("Total de authorities para usuário {}: {}", username, authorities.size());
        log.debug("Authorities: {}", authorities);

        return new org.springframework.security.core.userdetails.User(
            user.getUsername(),
            user.getPassword(),
            user.isActive(),
            true, true, true,
            authorities
        );
    }
} 