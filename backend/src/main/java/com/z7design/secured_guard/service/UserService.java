package com.z7design.secured_guard.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.UserStatus;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.model.Role;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.model.Permission;
import com.z7design.secured_guard.dto.ProfileUpdateRequest;
import com.z7design.secured_guard.dto.CreateUserRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public User createFromRequest(CreateUserRequest request) {
        System.out.println("🔧 UserService.createFromRequest - Iniciando");
        
        // Validações básicas
        if (!StringUtils.hasText(request.getName())) {
            throw new IllegalArgumentException("Nome não pode ser nulo ou vazio");
        }
        
        if (!StringUtils.hasText(request.getEmail())) {
            throw new IllegalArgumentException("Email não pode ser nulo ou vazio");
        }
        
        if (!StringUtils.hasText(request.getUsername())) {
            throw new IllegalArgumentException("Nome de usuário não pode ser nulo ou vazio");
        }
        
        if (!StringUtils.hasText(request.getPassword())) {
            throw new IllegalArgumentException("Senha não pode ser nula ou vazia");
        }
        
        if (request.getRoles() == null || request.getRoles().isEmpty()) {
            throw new IllegalArgumentException("Pelo menos uma função deve ser selecionada");
        }
        
        // Verificar se username já existe
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Nome de usuário já está em uso");
        }
        
        // Verificar se email já existe
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email já está em uso");
        }
        
        // Validar formato do email
        if (!request.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Formato de email inválido");
        }
        
        // Validar força da senha
        if (request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Senha deve ter pelo menos 6 caracteres");
        }
        
        // Permitir exceção para padrão cpf@2025
        boolean isCpfDefault = request.getPassword().matches("^\\d{11}@2025$");
        if (!isCpfDefault && !request.getPassword().matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*$")) {
            throw new IllegalArgumentException("Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial");
        }
        
        // Buscar roles do banco de dados pelos nomes (Array de Strings)
        System.out.println("🔍 Buscando roles: " + request.getRoles());
        List<Role> rolesFromDb = roleRepository.findByNames(request.getRoles());
        System.out.println("✅ Roles encontrados: " + rolesFromDb.size());
        
        if (rolesFromDb.isEmpty()) {
            throw new IllegalArgumentException("Nenhuma função válida encontrada. Certifique-se de que as funções existem no banco de dados.");
        }
        
        // Determinar status do usuário
        UserStatus status = UserStatus.ACTIVE;
        if (StringUtils.hasText(request.getStatus())) {
            try {
                status = UserStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Status de usuário inválido: " + request.getStatus());
            }
        }

        // Criar usuário
        User user = User.builder()
                .name(request.getName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .whatsapp(request.getWhatsapp() != null && !request.getWhatsapp().trim().isEmpty() ? request.getWhatsapp() : null)
                .roles(new java.util.HashSet<>(rolesFromDb))
                .active(request.getActive() != null ? request.getActive() : true)
                .status(status)
                .build();
        
        System.out.println("💾 Salvando usuário no banco...");
        User savedUser = userRepository.save(user);
        System.out.println("✅ Usuário salvo com ID: " + savedUser.getId());
        
        return savedUser;
    }
    
    public User create(User user) {
        // Validações básicas
        if (!StringUtils.hasText(user.getName())) {
            throw new IllegalArgumentException("Nome não pode ser nulo ou vazio");
        }
        
        if (!StringUtils.hasText(user.getEmail())) {
            throw new IllegalArgumentException("Email não pode ser nulo ou vazio");
        }
        
        if (!StringUtils.hasText(user.getUsername())) {
            throw new IllegalArgumentException("Nome de usuário não pode ser nulo ou vazio");
        }
        
        if (!StringUtils.hasText(user.getPassword())) {
            throw new IllegalArgumentException("Senha não pode ser nula ou vazia");
        }
        
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            throw new IllegalArgumentException("Função não pode ser nula");
        }
        
        // Buscar roles existentes pelo name
        var roleNames = user.getRoles().stream().map(Role::getName).toList();
        var rolesFromDb = roleRepository.findByNames(roleNames);
        if (rolesFromDb.isEmpty()) {
            throw new IllegalArgumentException("Nenhum role válido encontrado no banco");
        }
        user.setRoles(new java.util.HashSet<>(rolesFromDb));
        
        // Verificar se username já existe
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Nome de usuário já está em uso");
        }
        
        // Verificar se email já existe
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email já está em uso");
        }
        
        // Validar formato do email
        if (!user.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Formato de email inválido");
        }
        
        // Validar força da senha
        if (user.getPassword().length() < 6) {
            throw new IllegalArgumentException("Senha deve ter pelo menos 6 caracteres");
        }
        
        // Permitir exceção para padrão cpf@2025 usado em criação automática de COLABORADOR
        boolean isCpfDefault = user.getPassword().matches("^\\d{11}@2025$");
        if (!isCpfDefault && !user.getPassword().matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*$")) {
            throw new IllegalArgumentException("Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial");
        }
        
        // Definir valores padrão
        user.setActive(true);
        user.setStatus(UserStatus.ACTIVE);
        
        // Criptografar senha
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        return userRepository.save(user);
    }

    public User update(UUID id, User user) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!StringUtils.hasText(user.getName())) {
            throw new IllegalArgumentException("Name cannot be null or empty");
        }

        existingUser.setUsername(user.getUsername());
        existingUser.setEmail(user.getEmail());
        existingUser.setName(user.getName());
        // Buscar roles existentes pelo name
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            var roleNames = user.getRoles().stream().map(Role::getName).toList();
            var rolesFromDb = roleRepository.findByNames(roleNames);
            existingUser.setRoles(new java.util.HashSet<>(rolesFromDb));
        }
        existingUser.setStatus(user.getStatus());

        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        return userRepository.save(existingUser);
    }

    public User updateFromRequest(UUID id, com.z7design.secured_guard.dto.UpdateUserRequest request) {
        log.info("Atualizando usuário {} com dados: name={}, email={}, username={}, roles={}", 
                id, request.getName(), request.getEmail(), request.getUsername(), request.getRoles());
        
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (!StringUtils.hasText(request.getName())) {
            throw new IllegalArgumentException("Nome não pode ser vazio");
        }
        
        if (!StringUtils.hasText(request.getEmail())) {
            throw new IllegalArgumentException("Email não pode ser vazio");
        }
        
        if (!StringUtils.hasText(request.getUsername())) {
            throw new IllegalArgumentException("Username não pode ser vazio");
        }

        // Validar username único (se estiver sendo alterado)
        String existingUsername = existingUser.getUsername();
        String newUsername = request.getUsername();
        if (existingUsername == null || newUsername == null || !existingUsername.equals(newUsername)) {
            if (newUsername != null) {
                Optional<User> userWithUsername = userRepository.findByUsername(newUsername);
                if (userWithUsername.isPresent() && !userWithUsername.get().getId().equals(id)) {
                    throw new IllegalArgumentException("Nome de usuário já está em uso");
                }
            }
        }

        // Validar email único (se estiver sendo alterado)
        String existingEmail = existingUser.getEmail();
        String newEmail = request.getEmail();
        if (existingEmail == null || newEmail == null || !existingEmail.equals(newEmail)) {
            if (newEmail != null) {
                Optional<User> userWithEmail = userRepository.findByEmail(newEmail);
                if (userWithEmail.isPresent() && !userWithEmail.get().getId().equals(id)) {
                    throw new IllegalArgumentException("Email já está em uso");
                }
            }
        }

        // Atualizar campos básicos
        existingUser.setName(request.getName());
        existingUser.setEmail(request.getEmail());
        existingUser.setUsername(request.getUsername());
        
        // Atualizar WhatsApp se fornecido (aceita vazio ou null)
        if (request.getWhatsapp() != null) {
            existingUser.setWhatsapp(request.getWhatsapp().trim().isEmpty() ? null : request.getWhatsapp());
        }
        
        // Atualizar senha somente se fornecida
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        // Atualizar status se fornecido
        if (request.getActive() != null) {
            existingUser.setActive(request.getActive());
        }

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                existingUser.setStatus(UserStatus.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Status de usuário inválido: " + request.getStatus());
            }
        }
        
        // Atualizar roles se fornecidas
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            var roleNames = request.getRoles(); // Já é uma lista de strings
            var rolesFromDb = roleRepository.findByNames(roleNames);
            
            // Validar se pelo menos um role foi encontrado
            if (rolesFromDb.isEmpty()) {
                throw new IllegalArgumentException("Nenhum role válido encontrado. Roles fornecidos: " + roleNames);
            }
            
            // Verificar se todos os roles solicitados foram encontrados
            if (rolesFromDb.size() < roleNames.size()) {
                var foundRoleNames = rolesFromDb.stream().map(role -> role.getName()).collect(java.util.stream.Collectors.toSet());
                var missingRoles = roleNames.stream().filter(name -> !foundRoleNames.contains(name)).collect(java.util.stream.Collectors.toList());
                log.warn("Alguns roles não foram encontrados: {}", missingRoles);
            }
            
            existingUser.setRoles(new java.util.HashSet<>(rolesFromDb));
            log.info("Roles atualizadas para usuário {}: {}", id, rolesFromDb.stream().map(r -> r.getName()).collect(java.util.stream.Collectors.toList()));
        } else {
            log.info("Roles não fornecidas no request, mantendo roles existentes para usuário {}", id);
        }
        
        // Atualizar campos de informações adicionais (opcionais - só atualiza se fornecidos)
        if (request.getAvatar() != null) {
            existingUser.setAvatar(request.getAvatar().trim().isEmpty() ? null : request.getAvatar());
        }
        
        if (request.getDepartment() != null) {
            existingUser.setDepartment(request.getDepartment().trim().isEmpty() ? null : request.getDepartment());
        }
        
        if (request.getPosition() != null) {
            existingUser.setPosition(request.getPosition().trim().isEmpty() ? null : request.getPosition());
        }
        
        if (request.getEmployeeCode() != null) {
            existingUser.setEmployeeCode(request.getEmployeeCode().trim().isEmpty() ? null : request.getEmployeeCode());
        }
        
        if (request.getPhone() != null) {
            existingUser.setPhone(request.getPhone().trim().isEmpty() ? null : request.getPhone());
        }
        
        if (request.getAddress() != null) {
            existingUser.setAddress(request.getAddress().trim().isEmpty() ? null : request.getAddress());
        }

        try {
            User savedUser = userRepository.save(existingUser);
            log.info("Usuário {} atualizado com sucesso", id);
            return savedUser;
        } catch (Exception e) {
            log.error("Erro ao salvar usuário {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Erro ao salvar usuário: " + e.getMessage(), e);
        }
    }

    public void delete(UUID id) {
        userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.deleteById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public List<User> searchUsers(String query) {
        return userRepository.searchUsers(query);
    }
    
    public Optional<User> findByEmployeeCpf(String cpf) {
        return userRepository.findByEmployeeCpf(cpf);
    }

    public RoleRepository getRoleRepository() {
        return roleRepository;
    }

    public Set<Permission> getUserPermissions(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return user.getPermissions();
    }

    public Set<Permission> setUserPermissions(UUID userId, Set<Permission> permissions) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        user.setPermissions(permissions);
        userRepository.save(user);
        return user.getPermissions();
    }

    public Set<Permission> addUserPermissions(UUID userId, Set<Permission> permissionsToAdd) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        user.getPermissions().addAll(permissionsToAdd);
        userRepository.save(user);
        return user.getPermissions();
    }

    public Set<Permission> removeUserPermissions(UUID userId, Set<Permission> permissionsToRemove) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        user.getPermissions().removeAll(permissionsToRemove);
        userRepository.save(user);
        return user.getPermissions();
    }

    /**
     * Atualiza o perfil do próprio usuário logado
     */
    public User updateProfile(UUID userId, ProfileUpdateRequest request) {
        User existingUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Validar se o email não está sendo usado por outro usuário
        if (!existingUser.getEmail().equals(request.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Email já está em uso por outro usuário");
            }
        }

        // Validar formato do email
        if (!request.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Formato de email inválido");
        }

        // Atualizar dados básicos
        existingUser.setName(request.getName().trim());
        existingUser.setEmail(request.getEmail().trim());
        existingUser.setWhatsapp(request.getWhatsapp() != null ? request.getWhatsapp().trim() : null);

        // Se está alterando a senha, validar e atualizar
        if (request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
                throw new IllegalArgumentException("Senha atual é obrigatória para alterar a senha");
            }

            // Verificar se a senha atual está correta
            if (!passwordEncoder.matches(request.getCurrentPassword(), existingUser.getPassword())) {
                throw new IllegalArgumentException("Senha atual incorreta");
            }

            // Validar força da nova senha
            if (request.getNewPassword().length() < 6) {
                throw new IllegalArgumentException("Nova senha deve ter pelo menos 6 caracteres");
            }

            if (!request.getNewPassword().matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*$")) {
                throw new IllegalArgumentException("Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial");
            }

            // Criptografar e definir nova senha
            existingUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        return userRepository.save(existingUser);
    }
} 