package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    System.out.println("❌ CustomUserDetailsService: Usuário não encontrado: " + username);
                    return new UsernameNotFoundException("Usuário não encontrado: " + username);
                });

        System.out.println("✅ CustomUserDetailsService: Usuário encontrado: " + user.getUsername() + ", Ativo: " + user.isActive());
        System.out.println("🔍 CustomUserDetailsService: Roles: " + user.getRoles().stream().map(role -> role.getName()).collect(Collectors.toList()));

        // Retornar o próprio User da aplicação que implementa UserDetails
        return user;
    }
}