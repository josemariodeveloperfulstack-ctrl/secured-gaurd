package com.z7design.secured_guard.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.UserStatus;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.model.Role;
import com.z7design.secured_guard.model.UserGroupEntity;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.repository.UserGroupRepository;
import com.z7design.secured_guard.repository.PermissionRepository;
import com.z7design.secured_guard.model.Permission;
import com.z7design.secured_guard.security.JwtService;
import com.z7design.secured_guard.dto.ProfileUpdateRequest;
import com.z7design.secured_guard.dto.CreateUserRequest;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class UserService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final UserGroupRepository userGroupRepository;
    private final PermissionRepository permissionRepository;
    private final JwtService jwtService;
    private final UserOnlineStatusService userOnlineStatusService;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            RoleRepository roleRepository,
            UserGroupRepository userGroupRepository,
            PermissionRepository permissionRepository,
            JwtService jwtService,
            @Lazy UserOnlineStatusService userOnlineStatusService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleRepository = roleRepository;
        this.userGroupRepository = userGroupRepository;
        this.permissionRepository = permissionRepository;
        this.jwtService = jwtService;
        this.userOnlineStatusService = userOnlineStatusService;
    }

    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    public List<User> findAll() {
        return new java.util.ArrayList<>(userRepository.findAllDistinct());
    }

    @Transactional(readOnly = true)
    public List<com.z7design.secured_guard.dto.UserSelectDTO> findAllActiveForSelect() {
        return userRepository.findAllActiveForSelect();
    }

    @Transactional(readOnly = true)
    public Page<User> findAllPaged(int page, int size, String search, String role, boolean onlineOnly) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "name"));

        String searchParam = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String roleParam = (role != null && !role.trim().isEmpty() && !"all".equalsIgnoreCase(role.trim()))
                ? role.trim()
                : null;

        if (onlineOnly) {
            Set<UUID> onlineIds = userOnlineStatusService.getOnlineUserIds();
            if (onlineIds == null || onlineIds.isEmpty()) {
                return Page.empty(pageable);
            }
            return userRepository.findPagedFilteredOnline(searchParam, roleParam, onlineIds, pageable);
        }

        return userRepository.findPagedFiltered(searchParam, roleParam, pageable);
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

        request.setEmail(normalizeEmail(request.getEmail()));
        request.setUsername(request.getUsername().trim());

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

        // Verificar se email já existe (case-insensitive)
        if (userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
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

        // Permitir senha padrão de funcionários (CPF@PromoverAAAA, CPF@2025, 1234556)
        if (!isAllowedEmployeeOrStrongPassword(request.getPassword())) {
            throw new IllegalArgumentException(
                    "Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial, ou ser no formato CPF@PromoverAAAA");
        }

        List<String> roleNamesToLookup = resolveRoleNamesForLookup(request.getRoles());
        log.info("Buscando roles para criação: {}", roleNamesToLookup);
        List<Role> rolesFromDb = roleRepository.findByNames(roleNamesToLookup);

        if (rolesFromDb.isEmpty()) {
            throw new IllegalArgumentException(
                    "Nenhuma função válida encontrada. Roles informados: " + request.getRoles());
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
                .whatsapp(
                        request.getWhatsapp() != null && !request.getWhatsapp().trim().isEmpty() ? request.getWhatsapp()
                                : null)
                .roles(new java.util.HashSet<>(rolesFromDb))
                .active(request.getActive() != null ? request.getActive() : true)
                .status(status)
                .build();

        System.out.println("💾 Salvando usuário no banco...");
        User savedUser = userRepository.save(user);
        if (request.getPermissions() != null && !request.getPermissions().isEmpty()) {
            try {
                addUserPermissionsByIdentifiers(savedUser.getId(), request.getPermissions());
            } catch (Exception permEx) {
                log.warn("Erro ao atribuir permissões na criação do usuário: {}", permEx.getMessage());
            }
        }
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

        // Permitir padrão cpf@PromoverAAAA / cpf@2025 usado em criação automática
        if (!isAllowedEmployeeOrStrongPassword(user.getPassword())) {
            throw new IllegalArgumentException(
                    "Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial, ou ser no formato CPF@PromoverAAAA");
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

    @Transactional
    public User updateFromRequest(UUID id, com.z7design.secured_guard.dto.UpdateUserRequest request) {
        log.info("Atualizando usuário {} com dados: name={}, email={}, username={}, roles={}",
                id, request.getName(), request.getEmail(), request.getUsername(), request.getRoles());

        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Grupos podem ser alterados via API nativa (user_group_membership); sincroniza antes do save
        syncUserGroupsFromDatabase(existingUser);

        if (!StringUtils.hasText(request.getName())) {
            throw new IllegalArgumentException("Nome não pode ser vazio");
        }

        if (!StringUtils.hasText(request.getEmail())) {
            throw new IllegalArgumentException("Email não pode ser vazio");
        }

        if (!StringUtils.hasText(request.getUsername())) {
            throw new IllegalArgumentException("Username não pode ser vazio");
        }

        request.setEmail(normalizeEmail(request.getEmail()));
        request.setUsername(request.getUsername().trim());

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
            existingUser.setWhatsapp(normalizePhoneDigits(request.getWhatsapp()));
        }

        // Atualizar senha somente se fornecida
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            validatePasswordStrength(request.getPassword().trim());
            existingUser.setPassword(passwordEncoder.encode(request.getPassword().trim()));
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

        // Atualizar roles se fornecidas (ou se lista vazia para remover todas)
        if (request.getRoles() != null) {
            var roleNames = request.getRoles();
            var rolesFromDb = roleRepository.findByNames(resolveRoleNamesForLookup(roleNames));
            var uniqueRoles = new java.util.HashSet<>(rolesFromDb);

            if (!roleNames.isEmpty() && uniqueRoles.isEmpty()) {
                throw new IllegalArgumentException("Nenhum role válido encontrado. Roles fornecidos: " + roleNames);
            }

            existingUser.setRoles(new java.util.HashSet<>(uniqueRoles));
            log.info("Roles atualizadas para usuário {}: {}", id,
                    uniqueRoles.stream().map(Role::getName).collect(Collectors.toList()));
        } else {
            log.info("Roles não fornecidas no request, mantendo roles existentes para usuário {}", id);
        }

        // Atualizar campos de informações adicionais (opcionais - só atualiza se
        // fornecidos)
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
            existingUser.setPhone(normalizePhoneDigits(request.getPhone()));
        }

        if (request.getAddress() != null) {
            existingUser.setAddress(request.getAddress().trim().isEmpty() ? null : request.getAddress());
        }

        try {
            User savedUser = userRepository.save(existingUser);
            log.info("Usuário {} atualizado com sucesso", id);
            return savedUser;
        } catch (DataIntegrityViolationException e) {
            log.warn("Violação de integridade ao atualizar usuário {}: {}", id, e.getMessage());
            throw new IllegalArgumentException(
                    "Não foi possível salvar o usuário. Verifique username, email ou roles duplicados.");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao salvar usuário {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Erro ao salvar usuário: " + e.getMessage(), e);
        }
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * ADMINISTRADOR no frontend; bancos antigos podem ter apenas ADMIN.
     */
    private List<String> resolveRoleNamesForLookup(List<String> roleNames) {
        if (roleNames == null || roleNames.isEmpty()) {
            return roleNames;
        }
        List<String> resolved = new ArrayList<>();
        for (String name : roleNames) {
            if (name == null || name.trim().isEmpty()) {
                continue;
            }
            String normalized = name.trim().replaceFirst("^ROLE_", "");
            if ("ADMINISTRADOR".equals(normalized) && roleRepository.findByName("ADMINISTRADOR").isEmpty()) {
                resolved.add("ADMIN");
            } else if ("ADMIN".equals(normalized)
                    && roleRepository.findByName("ADMIN").isEmpty()
                    && roleRepository.findByName("ADMINISTRADOR").isPresent()) {
                resolved.add("ADMINISTRADOR");
            } else {
                resolved.add(normalized);
            }
        }
        return resolved.stream().distinct().collect(Collectors.toList());
    }

    private String normalizePhoneDigits(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("\\D", "");
        return digits.isEmpty() ? null : digits;
    }

    private void validatePasswordStrength(String password) {
        if (password.length() < 6) {
            throw new IllegalArgumentException("Senha deve ter no mínimo 6 caracteres");
        }
        if (!isAllowedEmployeeOrStrongPassword(password)) {
            throw new IllegalArgumentException(
                    "Senha deve ser forte (maiúscula, minúscula, dígito, especial) ou no formato CPF@PromoverAAAA");
        }
    }

    /** Senha forte OU padrões de funcionário: CPF@PromoverAAAA, CPF@2025, 1234556. */
    private static boolean isAllowedEmployeeOrStrongPassword(String password) {
        if (password == null) {
            return false;
        }
        if ("1234556".equals(password)) {
            return true;
        }
        if (password.matches("^\\d{11}@Promover\\d{4}$")) {
            return true;
        }
        if (password.matches("^\\d{11}@2025$")) {
            return true;
        }
        return password.matches("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*$");
    }

    /**
     * Alinha a coleção JPA de grupos com user_group_membership após remoções via SQL nativo.
     */
    private void syncUserGroupsFromDatabase(User user) {
        List<UserGroupEntity> groupsFromDb = userGroupRepository.findByUserId(user.getId());
        if (user.getGroups() == null) {
            user.setGroups(new java.util.HashSet<>());
        } else {
            user.getGroups().clear();
        }
        user.getGroups().addAll(groupsFromDb);
    }

    public void delete(UUID id) {
        userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepository.deleteById(id);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Payload para sincronização de role/token (polling do frontend). Centralizado para
     * {@code /api/users/me/current-role} e {@code /api/session/current-role}.
     */
    public Optional<Map<String, Object>> buildCurrentRoleForUsername(String username) {
        User currentUser = userRepository.findByUsername(username).orElse(null);
        if (currentUser == null) {
            return Optional.empty();
        }
        String primaryRole = "COLABORADOR";
        List<String> allRoles = new ArrayList<>();
        if (currentUser.getRoles() != null && !currentUser.getRoles().isEmpty()) {
            allRoles = currentUser.getRoles().stream()
                    .filter(Objects::nonNull)
                    .map(Role::getName)
                    .collect(Collectors.toList());
            primaryRole = allRoles.get(0);
        } else {
            allRoles.add("COLABORADOR");
        }
        String newToken = jwtService.generateToken(currentUser);
        Map<String, Object> body = new HashMap<>();
        body.put("role", primaryRole);
        body.put("roles", allRoles);
        body.put("token", newToken);
        body.put("userId", currentUser.getId().toString());
        return Optional.of(body);
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

    @Transactional(readOnly = true)
    public Set<Permission> getUserPermissions(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return user.getPermissions();
    }

    @Transactional
    public Set<Permission> setUserPermissions(UUID userId, Set<Permission> permissions) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        user.setPermissions(permissions);
        userRepository.save(user);
        return user.getPermissions();
    }

    @Transactional
    public Set<Permission> addUserPermissions(UUID userId, Set<Permission> permissionsToAdd) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        user.getPermissions().addAll(permissionsToAdd);
        userRepository.save(user);
        return user.getPermissions();
    }

    @Transactional
    public Set<Permission> removeUserPermissions(UUID userId, Set<Permission> permissionsToRemove) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        user.getPermissions().removeAll(permissionsToRemove);
        userRepository.save(user);
        return user.getPermissions();
    }

    @Transactional
    public Set<Permission> addUserPermissionsByIds(UUID userId, List<UUID> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            return getUserPermissions(userId);
        }

        log.info("📝 Adicionando permissões ao usuário {}: IDs={}", userId, permissionIds);
        List<Permission> permissionsToAdd = permissionRepository.findAllById(permissionIds);
        log.info("📝 Permissões encontradas no banco: {}", permissionsToAdd.size());
        
        if (permissionsToAdd.isEmpty()) {
            log.warn("⚠️ Nenhuma permissão encontrada para os IDs: {}", permissionIds);
            return getUserPermissions(userId);
        }

        return addUserPermissions(userId, new java.util.HashSet<>(permissionsToAdd));
    }

    @Transactional
    public Set<Permission> removeUserPermissionsByIds(UUID userId, List<UUID> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            return getUserPermissions(userId);
        }

        List<Permission> permissionsToRemove = permissionRepository.findAllById(permissionIds);
        return removeUserPermissions(userId, new java.util.HashSet<>(permissionsToRemove));
    }

    @Transactional
    public Set<Permission> addUserPermissionsByIdentifiers(UUID userId, List<String> identifiers) {
        if (identifiers == null || identifiers.isEmpty()) {
            return getUserPermissions(userId);
        }

        List<Permission> permissionsToAdd = new java.util.ArrayList<>();
        List<UUID> uuids = new java.util.ArrayList<>();
        List<String> names = new java.util.ArrayList<>();

        for (String idOrName : identifiers) {
            if (idOrName == null || idOrName.trim().isEmpty()) {
                continue;
            }
            try {
                uuids.add(UUID.fromString(idOrName.trim()));
            } catch (IllegalArgumentException e) {
                names.add(idOrName.trim());
            }
        }

        if (!uuids.isEmpty()) {
            permissionsToAdd.addAll(permissionRepository.findAllById(uuids));
        }
        if (!names.isEmpty()) {
            for (String name : names) {
                var foundList = permissionRepository.findAllByName(name);
                if (!foundList.isEmpty()) {
                    permissionsToAdd.add(foundList.get(0));
                } else {
                    Permission newPerm = new Permission();
                    newPerm.setName(name);
                    newPerm.setDescription(name);
                    permissionsToAdd.add(permissionRepository.save(newPerm));
                }
            }
        }

        if (permissionsToAdd.isEmpty()) {
            log.warn("⚠️ Nenhuma permissão encontrada para os identificadores: {}", identifiers);
            return getUserPermissions(userId);
        }

        return addUserPermissions(userId, new java.util.HashSet<>(permissionsToAdd));
    }

    @Transactional
    public Set<Permission> removeUserPermissionsByIdentifiers(UUID userId, List<String> identifiers) {
        if (identifiers == null || identifiers.isEmpty()) {
            return getUserPermissions(userId);
        }

        List<Permission> permissionsToRemove = new java.util.ArrayList<>();
        List<UUID> uuids = new java.util.ArrayList<>();
        List<String> names = new java.util.ArrayList<>();

        for (String idOrName : identifiers) {
            if (idOrName == null || idOrName.trim().isEmpty()) {
                continue;
            }
            try {
                uuids.add(UUID.fromString(idOrName.trim()));
            } catch (IllegalArgumentException e) {
                names.add(idOrName.trim());
            }
        }

        if (!uuids.isEmpty()) {
            permissionsToRemove.addAll(permissionRepository.findAllById(uuids));
        }
        if (!names.isEmpty()) {
            permissionsToRemove.addAll(permissionRepository.findByNames(names));
        }

        return removeUserPermissions(userId, new java.util.HashSet<>(permissionsToRemove));
    }

    /**
     * Atualiza o perfil do próprio usuário logado
     */
    public User updateProfile(UUID userId, ProfileUpdateRequest request) {
        User existingUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        String normalizedEmail = normalizeEmail(request.getEmail());
        request.setEmail(normalizedEmail);

        // Validar se o email não está sendo usado por outro usuário
        if (!existingUser.getEmail().equalsIgnoreCase(normalizedEmail)) {
            if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                throw new IllegalArgumentException("Email já está em uso por outro usuário");
            }
        }

        // Validar formato do email
        if (!normalizedEmail.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Formato de email inválido");
        }

        // Atualizar dados básicos
        existingUser.setName(request.getName().trim());
        existingUser.setEmail(normalizedEmail);
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
                throw new IllegalArgumentException(
                        "Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial");
            }

            // Criptografar e definir nova senha
            existingUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        return userRepository.save(existingUser);
    }
}