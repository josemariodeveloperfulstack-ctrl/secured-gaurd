package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        System.out.println("🔍 CustomUserDetailsService: Buscando usuário: " + username);

        String login = username != null ? username.trim() : "";
        User user = userRepository.findByUsername(login)
                .or(() -> {
                    // Permite login com e-mail (campo da tela / AuthContext envia o identificador digitado)
                    if (login.contains("@")) {
                        return userRepository.findByEmailIgnoreCase(login);
                    }
                    return java.util.Optional.empty();
                })
                .orElseThrow(() -> {
                    System.out.println("❌ CustomUserDetailsService: Usuário não encontrado: " + login);
                    return new UsernameNotFoundException("Usuário não encontrado: " + login);
                });

        System.out.println("✅ CustomUserDetailsService: Usuário encontrado: " + user.getUsername() + ", Ativo: " + user.isActive());
        
        // Verificar roles antes de fazer stream (pode ser null)
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            System.out.println("🔍 CustomUserDetailsService: Roles: " + user.getRoles().stream()
                    .filter(role -> role != null)
                    .map(role -> role.getName())
                    .collect(Collectors.toList()));
        } else {
            System.out.println("⚠️ CustomUserDetailsService: Usuário não possui roles cadastradas");
        }

        // Retornar o próprio User da aplicação que implementa UserDetails
        return user;
    }
}