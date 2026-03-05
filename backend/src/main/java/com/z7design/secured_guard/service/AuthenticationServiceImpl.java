package com.z7design.secured_guard.service;

import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.dto.AuthenticationRequest;
import com.z7design.secured_guard.dto.AuthenticationResponse;
import com.z7design.secured_guard.dto.RegisterRequest;
import com.z7design.secured_guard.dto.RefreshTokenRequest;
import com.z7design.secured_guard.dto.UserResponse;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.Role;
import com.z7design.secured_guard.model.enums.UserStatus;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.security.JwtService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final UserCustomPermissionService customPermissionService;
    private final LgpdConsentService lgpdConsentService;
    private final TwoFactorAuthService twoFactorAuthService;

    public AuthenticationServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Lazy AuthenticationManager authenticationManager,
            UserDetailsService userDetailsService,
            UserCustomPermissionService customPermissionService,
            LgpdConsentService lgpdConsentService,
            TwoFactorAuthService twoFactorAuthService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.customPermissionService = customPermissionService;
        this.lgpdConsentService = lgpdConsentService;
        this.twoFactorAuthService = twoFactorAuthService;
    }

    @Override
    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        log.info("Starting user registration for username: {}", request.getUsername());

        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Username already exists: {}", request.getUsername());
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Email already exists: {}", request.getEmail());
            throw new IllegalArgumentException("Email already exists");
        }

        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            log.warn("Full name is required for registration");
            throw new IllegalArgumentException("Full name is required");
        }

        java.util.List<String> requestedRoles = request.getRoles();
        java.util.Set<Role> userRoles;
        if (requestedRoles != null && !requestedRoles.isEmpty()) {
            userRoles = new java.util.HashSet<>(roleRepository.findByNames(requestedRoles));
            if (userRoles.isEmpty()) {
                log.error("Nenhum dos roles informados foi encontrado: {}", requestedRoles);
                throw new IllegalArgumentException("Nenhum dos roles informados foi encontrado: " + requestedRoles);
            }
        } else {
            Role defaultRole = roleRepository.findByName("COLABORADOR")
                    .orElseThrow(() -> new IllegalArgumentException("Role padrão COLABORADOR não encontrado"));
            userRoles = java.util.Set.of(defaultRole);
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .name(request.getFullName().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(userRoles)
                .status(UserStatus.ACTIVE)
                .active(true)
                .build();

        log.info("Saving user: {}", user.getUsername());
        User savedUser = userRepository.save(user);
        log.info("User saved successfully with ID: {}", savedUser.getId());

        // Verify the user was actually saved
        User verifyUser = userRepository.findById(savedUser.getId()).orElse(null);
        if (verifyUser == null) {
            log.error("User was not persisted to database after save!");
            throw new IllegalStateException("Failed to persist user to database");
        }
        log.info("User verified in database: {}", verifyUser.getUsername());

        String jwtToken = jwtService.generateToken(savedUser);
        String refreshToken = jwtService.generateRefreshToken(savedUser);

        // Buscar permissões customizadas
        java.util.List<String> customPermissions = customPermissionService.getActivePermissions(savedUser.getId());

        log.info("Registration completed successfully for user: {}", savedUser.getUsername());

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken)
                .user(UserResponse.builder()
                        .id(savedUser.getId().toString())
                        .username(savedUser.getUsername())
                        .email(savedUser.getEmail())
                        .fullName(savedUser.getName())
                        .roles(savedUser.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                        .customPermissions(customPermissions)
                        .build())
                .build();
    }

    @Override
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        try {
            log.info("🔐 Tentando autenticar usuário: {}", request.getUsername());

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            log.info("✅ Usuário encontrado: {} (ID: {})", user.getUsername(), user.getId());

            String jwtToken = jwtService.generateToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);

            log.info("🔑 Tokens gerados com sucesso");

            // Buscar permissões customizadas (com tratamento de erro)
            java.util.List<String> customPermissions = java.util.Collections.emptyList();
            try {
                customPermissions = customPermissionService.getActivePermissions(user.getId());
                log.info("✅ Permissões customizadas carregadas: {}", customPermissions.size());
            } catch (Exception e) {
                log.error("⚠️ Erro ao buscar permissões customizadas (usando lista vazia): {}", e.getMessage());
            }

            // Buscar roles (com verificação de null)
            java.util.List<String> roles = java.util.Collections.emptyList();
            try {
                if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                    roles = user.getRoles().stream()
                            .filter(role -> role != null) // Filtrar roles nulas
                            .map(role -> {
                                try {
                                    return role.getName();
                                } catch (Exception e) {
                                    log.warn("⚠️ Erro ao obter nome da role: {}", e.getMessage());
                                    return null;
                                }
                            })
                            .filter(name -> name != null) // Filtrar nomes nulos
                            .collect(Collectors.toList());
                    log.info("✅ Roles do usuário: {}", roles);
                } else {
                    log.warn("⚠️ Usuário {} não possui roles cadastradas (roles é null ou vazio)", user.getUsername());
                }
            } catch (Exception e) {
                log.error("⚠️ Erro ao buscar roles (usando lista vazia): {}", e.getMessage(), e);
            }

            // Verificar status de LGPD e segurança (com tratamento de erro)
            boolean requiresLgpdConsent = false;
            try {
                requiresLgpdConsent = !lgpdConsentService.hasAcceptedAllRequiredConsents(user.getId());
                log.info("✅ Status LGPD verificado: requiresConsent={}", requiresLgpdConsent);
            } catch (Exception e) {
                log.error("⚠️ Erro ao verificar consentimento LGPD (assumindo false): {}", e.getMessage());
            }

            boolean requires2FA = false;
            try {
                requires2FA = twoFactorAuthService.is2FAEnabled(user.getId());
                log.info("✅ Status 2FA verificado: enabled={}", requires2FA);
            } catch (Exception e) {
                log.error("⚠️ Erro ao verificar 2FA (assumindo false): {}", e.getMessage());
            }

            boolean requiresPasswordChange = user.getRequirePasswordChange() != null && user.getRequirePasswordChange();
            boolean firstAccessCompleted = user.getFirstAccessCompleted() != null && user.getFirstAccessCompleted();

            log.info("✅ Autenticação concluída com sucesso para usuário: {}", user.getUsername());

            return AuthenticationResponse.builder()
                    .token(jwtToken)
                    .refreshToken(refreshToken)
                    .user(UserResponse.builder()
                            .id(user.getId().toString())
                            .username(user.getUsername())
                            .email(user.getEmail())
                            .fullName(user.getName())
                            .roles(roles)
                            .customPermissions(customPermissions)
                            .build())
                    .requiresLgpdConsent(requiresLgpdConsent)
                    .requires2FA(requires2FA)
                    .requiresPasswordChange(requiresPasswordChange)
                    .firstAccessCompleted(firstAccessCompleted)
                    .build();
        } catch (org.springframework.security.core.AuthenticationException e) {
            log.warn("❌ Falha na autenticação para usuário {}: {}", request.getUsername(), e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("💥 ERRO CRÍTICO NO LOGIN para usuário {}: {}", request.getUsername(), e.getMessage(), e);
            throw new RuntimeException("Erro ao processar autenticação: " + e.getMessage(), e);
        }
    }

    @Override
    public AuthenticationResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        String username = jwtService.extractUsername(refreshToken);

        if (username != null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
            if (jwtService.isTokenValid(refreshToken, userDetails)) {
                User user = (User) userDetails; // Cast to your User model if necessary
                String accessToken = jwtService.generateToken(user);
                String newRefreshToken = jwtService.generateRefreshToken(user);

                // Buscar permissões customizadas
                java.util.List<String> customPermissions = customPermissionService.getActivePermissions(user.getId());

                return AuthenticationResponse.builder()
                        .token(accessToken)
                        .refreshToken(newRefreshToken)
                        .user(UserResponse.builder()
                                .id(user.getId().toString())
                                .username(user.getUsername())
                                .email(user.getEmail())
                                .fullName(user.getName())
                                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                                .customPermissions(customPermissions)
                                .build())
                        .build();
            }
        }
        throw new RuntimeException("Invalid Refresh Token");
    }

    @Override
    public User getCurrentUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Override
    public User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("No authentication found");
        }

        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}