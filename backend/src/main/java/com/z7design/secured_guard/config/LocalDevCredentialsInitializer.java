package com.z7design.secured_guard.config;

import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Garante credenciais conhecidas para desenvolvimento local (perfil {@code local}).
 */
@Configuration
@Profile("local")
@RequiredArgsConstructor
@Slf4j
public class LocalDevCredentialsInitializer {

    private static final String DEV_USERNAME = "jose.ramos";
    private static final String DEV_PASSWORD = "Admin1234";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.local.ensure-dev-credentials:true}")
    private boolean ensureDevCredentials;

    @Bean
    @Order(0)
    public CommandLineRunner ensureLocalDevAdminCredentials() {
        return args -> {
            if (!ensureDevCredentials) {
                return;
            }

            userRepository.findByUsername(DEV_USERNAME).ifPresentOrElse(user -> {
                if (!passwordEncoder.matches(DEV_PASSWORD, user.getPassword())) {
                    user.setPassword(passwordEncoder.encode(DEV_PASSWORD));
                    user.setActive(true);
                    userRepository.save(user);
                    log.info("Credenciais de desenvolvimento restauradas para {}", DEV_USERNAME);
                }
            }, () -> log.warn("Usuário {} não encontrado — pulando reset de senha local", DEV_USERNAME));
        };
    }
}
