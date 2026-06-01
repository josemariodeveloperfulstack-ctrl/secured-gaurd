package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.UserListResponseDTO;
import com.z7design.secured_guard.dto.UserPageResponse;
import org.springframework.data.domain.Page;
import com.z7design.secured_guard.dto.UserGroupDTO;
import com.z7design.secured_guard.dto.ProfileUpdateRequest;
import com.z7design.secured_guard.dto.ProfileResponse;
import com.z7design.secured_guard.dto.UpdateUserRequest;
import com.z7design.secured_guard.dto.CreateUserRequest;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.UserService;
import com.z7design.secured_guard.service.UserOnlineStatusService;
import com.z7design.secured_guard.service.LgpdConsentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import com.z7design.secured_guard.model.Permission;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Usuários", description = "Endpoints para gestão de usuários")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    private final UserOnlineStatusService userOnlineStatusService;
    private final LgpdConsentService lgpdConsentService;

    @GetMapping("/public/diagnostic")
    @Operation(summary = "Diagnóstico público", description = "Verifica se o controller responde sem autenticação")
    public ResponseEntity<Object> publicDiagnostic() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "controller", "UserController",
            "access", "public",
            "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar usuários", description = "Retorna uma lista de todos os usuários. Permite acesso para usuários autenticados (necessário para chat)")
    public ResponseEntity<List<UserListResponseDTO>> getAllUsers() {
        List<User> users = userService.findAll();

        // Log de debug: verificar quantos usuários online existem no serviço
        int onlineCount = userOnlineStatusService.getOnlineUserCount();
        log.info("📊 [UserController] Total de usuários online no serviço: {}", onlineCount);
        if (onlineCount > 0) {
            log.info("📊 [UserController] IDs dos usuários online: {}", userOnlineStatusService.getOnlineUserIds());
        }

        List<UserListResponseDTO> dtos = users.stream()
                .map(this::convertToDTO)
                .filter(dto -> dto != null)
                .collect(java.util.stream.Collectors.toList());

        // Log de debug: verificar quantos DTOs têm isOnline = true
        long onlineInResponse = dtos.stream().filter(dto -> Boolean.TRUE.equals(dto.getIsOnline())).count();
        log.info("📊 [UserController] Total de usuários retornados: {} | Usuários online na resposta: {}", dtos.size(),
                onlineInResponse);

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/paged")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar usuários (paginado)", description = "Retorna usuários paginados com busca e filtros opcionais")
    public ResponseEntity<UserPageResponse> getUsersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean onlineOnly) {
        boolean filterOnline = Boolean.TRUE.equals(onlineOnly);
        Page<User> userPage = userService.findAllPaged(page, size, search, role, filterOnline);

        List<UserListResponseDTO> content = userPage.getContent().stream()
                .map(this::convertToDTO)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        UserPageResponse response = new UserPageResponse(
                content,
                userPage.getTotalElements(),
                userPage.getTotalPages(),
                userPage.getNumber(),
                userPage.getSize(),
                userOnlineStatusService.getOnlineUserCount());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Buscar usuário por ID", description = "Retorna um usuário específico pelo ID. Permite acesso para usuários autenticados (necessário para chat)")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        try {
            // Validar ID
            if (id == null || id.trim().isEmpty()) {
                log.warn("ID de usuário inválido: {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "ID de usuário inválido"));
            }

            UUID userId;
            try {
                userId = UUID.fromString(id);
            } catch (IllegalArgumentException e) {
                log.warn("ID de usuário inválido (formato UUID): {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "ID de usuário inválido"));
            }

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null) {
                log.error("Autenticação é null");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Não autenticado"));
            }

            boolean isColaborador = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));

            User user = userService.findById(userId)
                    .orElse(null);

            if (user == null) {
                log.warn("Usuário não encontrado: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Usuário não encontrado"));
            }

            // Colaborador só pode ver seu próprio perfil
            if (isColaborador && !auth.getName().equals(user.getUsername())) {
                log.warn("Acesso negado: colaborador {} tentou acessar usuário {}", auth.getName(), user.getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Acesso negado"));
            }

            UserListResponseDTO dto = convertToDTO(user);

            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            log.error("Erro ao buscar usuário por ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro ao buscar usuário: "
                            + (e.getMessage() != null ? e.getMessage() : "Erro desconhecido")));
        }
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasAuthority('USERS_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Buscar usuário por username", description = "Retorna um usuário específico pelo username")
    public ResponseEntity<UserListResponseDTO> getUserByUsername(@PathVariable String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isColaborador = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));

        // Colaborador só pode buscar seu próprio username
        if (isColaborador && !auth.getName().equals(username)) {
            return ResponseEntity.status(403).build();
        }

        User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return ResponseEntity.ok(convertToDTO(user));
    }

    @GetMapping("/email/{email}")
    @PreAuthorize("hasAuthority('USERS_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Buscar usuário por email", description = "Retorna um usuário específico pelo email")
    public ResponseEntity<UserListResponseDTO> getUserByEmail(@PathVariable String email) {
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return ResponseEntity.ok(convertToDTO(user));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('USERS_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR') or hasRole('RH') or hasRole('DEPARTAMENTO_PESSOAL') or hasRole('GESTOR') or hasRole('ASSISTENCIA_RH')")
    @Operation(summary = "Buscar usuários", description = "Busca usuários por nome, email ou username com filtro dinâmico")
    public ResponseEntity<List<UserListResponseDTO>> searchUsers(
            @RequestParam(value = "query", required = false) String query) {
        List<User> users;

        if (query == null || query.trim().isEmpty()) {
            users = userService.findAll();
        } else {
            users = userService.searchUsers(query.trim());
        }

        List<UserListResponseDTO> dtos = users.stream()
                .map(this::convertToDTO)
                .filter(dto -> dto != null)
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/cpf/{cpf}")
    @PreAuthorize("hasAuthority('USERS_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Buscar usuário por CPF", description = "Busca usuário através do CPF do funcionário associado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Usuário encontrado"),
            @ApiResponse(responseCode = "404", description = "Usuário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<UserListResponseDTO> getUserByCpf(@PathVariable String cpf) {
        User user = userService.findByEmployeeCpf(cpf)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado para o CPF informado"));

        return ResponseEntity.ok(convertToDTO(user));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USERS_CREATE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Criar usuário", description = "Cria um novo usuário no sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Usuário criado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<UserListResponseDTO> create(@Valid @RequestBody CreateUserRequest request) {
        try {
            log.info("✅ UserController.create - Iniciando criação de usuário");
            log.debug("📋 Dados: {} | {} | {}", request.getName(), request.getEmail(), request.getUsername());
            log.debug("📱 WhatsApp: {}", request.getWhatsapp());
            log.debug("🔐 Roles: {}", request.getRoles());

            User createdUser = userService.createFromRequest(request);
            log.info("✅ Usuário criado: {}", createdUser.getId());

            return ResponseEntity.status(201).body(convertToDTO(createdUser));
        } catch (IllegalArgumentException e) {
            log.warn("❌ Erro de validação ao criar usuário: {}", e.getMessage());
            throw e; // Propaga para o GlobalExceptionHandler (retornará 400)
        } catch (Exception e) {
            log.error("❌ Erro ao criar usuário: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao criar usuário: " + e.getMessage(), e);
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USERS_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Atualizar usuário", description = "Atualiza os dados de um usuário existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Usuário atualizado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Usuário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<?> update(@PathVariable String id, @Valid @RequestBody UpdateUserRequest request) {
        try {
            // Validar ID
            if (id == null || id.trim().isEmpty()) {
                log.warn("ID de usuário inválido: {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "ID de usuário inválido"));
            }

            UUID userId;
            try {
                userId = UUID.fromString(id);
            } catch (IllegalArgumentException e) {
                log.warn("ID de usuário inválido (formato UUID): {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "ID de usuário inválido"));
            }

            if (request == null) {
                log.warn("Request body é null para atualização de usuário {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Dados de atualização não fornecidos"));
            }

            // Validar campos obrigatórios antes de chamar o service
            if (request.getName() == null || request.getName().trim().isEmpty()) {
                log.warn("Nome é obrigatório para atualização de usuário {}", id);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Nome é obrigatório"));
            }

            User updatedUser;
            try {
                updatedUser = userService.updateFromRequest(userId, request);
            } catch (RuntimeException e) {
                // RuntimeException geralmente indica usuário não encontrado
                if (e.getMessage() != null && e.getMessage().contains("não encontrado")) {
                    log.warn("Usuário não encontrado para atualização: {}", id);
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("error", e.getMessage()));
                }
                throw e; // Re-throw para ser tratado pelo catch genérico
            }

            if (updatedUser == null) {
                log.warn("Usuário não encontrado para atualização: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Usuário não encontrado"));
            }

            return ResponseEntity.ok(convertToDTO(updatedUser));
        } catch (IllegalArgumentException e) {
            log.warn("Erro de validação ao atualizar usuário {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Dados inválidos"));
        } catch (RuntimeException e) {
            log.error("Erro de runtime ao atualizar usuário {}: {}", id, e.getMessage(), e);
            // Retornar erro específico baseado na mensagem
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Erro ao atualizar usuário";
            if (errorMessage.contains("não encontrado") || errorMessage.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", errorMessage));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", errorMessage));
        } catch (Exception e) {
            log.error("Erro ao atualizar usuário {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro ao atualizar usuário: "
                            + (e.getMessage() != null ? e.getMessage() : "Erro desconhecido")));
        }
    }

    /**
     * Método helper para converter User para UserListResponseDTO
     */
    private UserListResponseDTO convertToDTO(User user) {
        if (user == null) {
            return null;
        }

        UserListResponseDTO dto = new UserListResponseDTO();
        dto.setId(user.getId().toString());
        dto.setName(user.getName());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setActive(user.isActive());
        dto.setStatus(user.getStatus());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());

        // Tratar roles de forma segura
        try {
            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                List<String> roleNames = user.getRoles().stream()
                        .filter(role -> role != null)
                        .map(role -> {
                            try {
                                return role.getName();
                            } catch (Exception e) {
                                log.warn("Erro ao obter nome da role: {}", e.getMessage());
                                return null;
                            }
                        })
                        .filter(name -> name != null)
                        .distinct()
                        .collect(java.util.stream.Collectors.toList());
                dto.setRoles(roleNames);
            } else {
                dto.setRoles(java.util.Collections.emptyList());
            }
        } catch (Exception e) {
            log.warn("Erro ao processar roles, usando lista vazia: {}", e.getMessage());
            dto.setRoles(java.util.Collections.emptyList());
        }

        // Campos de informações adicionais
        dto.setAvatar(user.getAvatar());
        dto.setDepartment(user.getDepartment());
        dto.setPosition(user.getPosition());
        dto.setEmployeeCode(user.getEmployeeCode());
        dto.setPhone(user.getPhone());
        dto.setAddress(user.getAddress());

        // Status online/offline
        try {
            UUID userId = UUID.fromString(dto.getId());
            boolean isOnline = userOnlineStatusService.isUserOnline(userId);
            dto.setIsOnline(isOnline);
            if (isOnline) {
                log.debug("Usuário {} ({}) está online", userId, dto.getName());
            }
        } catch (Exception e) {
            log.warn("Erro ao verificar status online do usuário {}: {}", user.getId(), e.getMessage());
            dto.setIsOnline(false);
        }

        // Grupos do usuário
        try {
            if (user.getGroups() != null && !user.getGroups().isEmpty()) {
                List<UserGroupDTO> groupDTOs = user.getGroups().stream()
                        .filter(Objects::nonNull)
                        .map(group -> {
                            UserGroupDTO g = new UserGroupDTO();
                            g.setId(group.getId());
                            g.setName(group.getGroupName() != null ? group.getGroupName().name() : null);
                            g.setGroupName(group.getGroupName() != null ? group.getGroupName().name() : null);
                            g.setDisplayName(group.getDisplayName());
                            g.setDescription(group.getDescription());
                            g.setPermissions(group.getPermissions());
                            // userCount pode ser preenchido em endpoints específicos de grupos
                            return g;
                        })
                        .collect(java.util.stream.Collectors.toList());
                dto.setGroups(groupDTOs);
            } else {
                dto.setGroups(java.util.Collections.emptyList());
            }
        } catch (Exception e) {
            log.warn("Erro ao processar grupos do usuário {}, usando lista vazia: {}", user.getId(), e.getMessage());
            dto.setGroups(java.util.Collections.emptyList());
        }

        return dto;
    }

    @PostMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('USERS_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Adicionar permissões ao usuário", description = "Adiciona permissões individuais ao usuário. Aceita UUIDs ou nomes de permissões.")
    public ResponseEntity<?> addUserPermissions(@PathVariable String id, @RequestBody List<String> permissionIdentifiers) {
        try {
            log.info("📝 Adicionando permissões ao usuário {}: {}", id, permissionIdentifiers);
            UUID userId = UUID.fromString(id);
            Set<Permission> updated = userService.addUserPermissionsByIdentifiers(userId, permissionIdentifiers);
            log.info("✅ Permissões adicionadas com sucesso ao usuário {}: {} permissões", id, updated.size());
            return ResponseEntity.ok(updated.stream()
                    .map(com.z7design.secured_guard.dto.PermissionDTO::fromEntity)
                    .collect(java.util.stream.Collectors.toList()));
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Erro de validação ao adicionar permissões: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erro ao adicionar permissões ao usuário {}: {}", id, e.getMessage(), e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Erro desconhecido";
            if (e.getCause() != null) {
                errorMsg = e.getCause().getMessage() != null ? e.getCause().getMessage() : errorMsg;
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", errorMsg));
        }
    }

    @DeleteMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('USERS_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Remover permissões do usuário", description = "Remove permissões individuais do usuário. Aceita UUIDs ou nomes de permissões.")
    public ResponseEntity<?> removeUserPermissions(@PathVariable String id, @RequestBody List<String> permissionIdentifiers) {
        try {
            UUID userId = UUID.fromString(id);
            Set<Permission> updated = userService.removeUserPermissionsByIdentifiers(userId, permissionIdentifiers);
            return ResponseEntity.ok(updated.stream()
                    .map(com.z7design.secured_guard.dto.PermissionDTO::fromEntity)
                    .collect(java.util.stream.Collectors.toList()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erro ao remover permissões: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USERS_DELETE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('ADMINISTRADOR')")
    @Operation(summary = "Excluir usuário", description = "Exclui um usuário do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Usuário excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Usuário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> delete(@PathVariable String id) {
        userService.delete(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile")
    @Operation(summary = "Buscar próprio perfil", description = "Retorna as informações do perfil do usuário logado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Perfil encontrado com sucesso"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "404", description = "Usuário não encontrado")
    })
    public ResponseEntity<ProfileResponse> getProfile() {
        // Obter o usuário atual do contexto de segurança
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String username = authentication.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        boolean lgpdAccepted = lgpdConsentService.hasAcceptedAllRequiredConsents(currentUser.getId());

        // Construir resposta
        ProfileResponse response = ProfileResponse.builder()
                .id(currentUser.getId())
                .username(currentUser.getUsername())
                .name(currentUser.getName())
                .email(currentUser.getEmail())
                .whatsapp(currentUser.getWhatsapp())
                .active(currentUser.isActive())
                .roles(currentUser.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(java.util.stream.Collectors.toList()))
                .lgpdAccepted(lgpdAccepted)
                .build();

        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    @Operation(summary = "Atualizar próprio perfil", description = "Permite ao usuário atualizar suas próprias informações")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Perfil atualizado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<ProfileResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        // Obter o usuário atual do contexto de segurança
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String username = authentication.getName();
        User currentUser = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Atualizar o perfil
        User updatedUser = userService.updateProfile(currentUser.getId(), request);

        boolean lgpdAccepted = lgpdConsentService.hasAcceptedAllRequiredConsents(updatedUser.getId());

        // Construir resposta
        ProfileResponse response = ProfileResponse.builder()
                .id(updatedUser.getId())
                .username(updatedUser.getUsername())
                .name(updatedUser.getName())
                .email(updatedUser.getEmail())
                .whatsapp(updatedUser.getWhatsapp())
                .active(updatedUser.isActive())
                .roles(updatedUser.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(java.util.stream.Collectors.toList()))
                .lgpdAccepted(lgpdAccepted)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Retorna o role atual do usuário logado diretamente do banco de dados e
     * um novo token JWT, permitindo ao frontend detectar mudanças de role sem
     * re-login.
     */
    @GetMapping("/me/current-role")
    @Operation(summary = "Verificar role atual", description = "Retorna o role atual do usuário no banco e um JWT atualizado")
    public ResponseEntity<?> getCurrentRole() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).build();
            }
            return userService.buildCurrentRoleForUsername(authentication.getName())
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado")));
        } catch (Exception e) {
            log.error("Erro ao obter role atual: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Erro ao obter role: " + e.getMessage()));
        }
    }
}