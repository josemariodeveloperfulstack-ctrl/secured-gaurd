package com.z7design.secured_guard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.z7design.secured_guard.dto.AuthenticationRequest;
import com.z7design.secured_guard.dto.AuthenticationResponse;
import com.z7design.secured_guard.dto.RegisterRequest;
import com.z7design.secured_guard.dto.RefreshTokenRequest;
import com.z7design.secured_guard.dto.ErrorResponse;
import com.z7design.secured_guard.service.AuthenticationService;
import com.z7design.secured_guard.service.LogService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Autenticação", description = "Endpoints para registro, login e renovação de tokens.")
public class AuthenticationController {

    private final AuthenticationService authenticationService;
    private final LogService logService;

    @Operation(summary = "Realiza o login de um usuário",
               description = "Autentica um usuário com nome de usuário e senha e retorna tokens de acesso e refresh.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Login bem-sucedido",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = AuthenticationResponse.class),
                            examples = @ExampleObject(value = "{\"token\": \"eyJhbGci...\", \"refreshToken\": \"eyJhbGci...\", \"user\": {\"username\": \"testuser\", \"email\": \"test@example.com\", \"fullName\": \"Test User\", \"role\": \"VIGILANTE\"}}"))),
            @ApiResponse(responseCode = "401", description = "Credenciais inválidas",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class),
                            examples = @ExampleObject(value = "{\"timestamp\": \"2025-06-17T19:00:00.000\", \"status\": 401, \"error\": \"Unauthorized\", \"message\": \"Invalid username or password.\", \"path\": \"/api/auth/login\"}")))
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Objeto de requisição de autenticação",
            content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = AuthenticationRequest.class),
                    examples = @ExampleObject(value = "{\"username\": \"testuser\", \"password\": \"Password123!\"}")))
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthenticationRequest request) {
        String username = request != null ? request.getUsername() : "unknown";
        log.info("🔐 Iniciando processo de login para usuário: {}", username);
        
        try {
            log.debug("🔍 Chamando authenticationService.authenticate para usuário: {}", username);
            AuthenticationResponse response = authenticationService.authenticate(request);
            log.info("✅ Autenticação bem-sucedida para usuário: {}", username);
            
            // Log da atividade de login bem-sucedido (não deve bloquear o login)
            try {
                logService.logUserActivity(username, "LOGIN", 
                    "Login realizado com sucesso via " + username);
                log.debug("✅ Log de atividade registrado para usuário: {}", username);
            } catch (Exception logError) {
                // Log do erro mas não interromper o fluxo
                log.warn("⚠️ Erro ao registrar log de atividade (não crítico) para usuário {}: {}", 
                    username, logError.getMessage());
                // Não propagar o erro - o login foi bem-sucedido
            }
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.core.AuthenticationException e) {
            // Exceções de autenticação devem retornar 401, não 500
            log.warn("❌ Tentativa de login falhou para usuário {}: {}", username, e.getMessage());
            
            // Tentar registrar log de falha (não deve bloquear a resposta)
            try {
                logService.logUserActivity(username, "LOGIN_FAILED", 
                    "Tentativa de login falhou: " + e.getMessage());
            } catch (Exception logError) {
                log.debug("⚠️ Erro ao registrar log de falha (não crítico): {}", logError.getMessage());
            }
            
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Unauthorized", "message", "Invalid username or password."));
        } catch (Exception e) {
            // Log detalhado do erro
            log.error("💥 ERRO CRÍTICO ao processar login para usuário {}: {}", username, e.getMessage(), e);
            log.error("💥 Stack trace completo:", e);
            
            // Retornar erro 500 como último recurso, mas garantir que seja tratado
            try {
                logService.logUserActivity(username, "LOGIN_FAILED", 
                    "Erro ao processar login: " + e.getMessage());
            } catch (Exception logError) {
                log.warn("⚠️ Erro ao registrar log de falha (não crítico): {}", logError.getMessage());
            }
            
            // Retornar erro estruturado com mais detalhes para diagnóstico
            String errorMessage = "Erro ao processar login. Tente novamente mais tarde.";
            if (log.isDebugEnabled()) {
                errorMessage += " Detalhes: " + e.getMessage();
            }
            
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", "Internal Server Error", 
                    "message", errorMessage,
                    "timestamp", java.time.Instant.now().toString()
                ));
        }
    }

    @Operation(summary = "Registra um novo usuário",
               description = "Cria uma nova conta de usuário com as informações fornecidas e retorna tokens de acesso e refresh.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Registro bem-sucedido",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = AuthenticationResponse.class),
                            examples = @ExampleObject(value = "{\"token\": \"eyJhbGci...\", \"refreshToken\": \"eyJhbGci...\", \"user\": {\"username\": \"newuser\", \"email\": \"new@example.com\", \"fullName\": \"New User\", \"role\": \"VIGILANTE\"}}"))),
            @ApiResponse(responseCode = "400", description = "Dados de registro inválidos ou usuário/email existente",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class),
                            examples = @ExampleObject(value = "{\"timestamp\": \"2025-06-17T19:00:00.000\", \"status\": 400, \"error\": \"Validation Error\", \"message\": \"One or more fields are invalid.\", \"path\": \"/api/auth/register\", \"details\": {\"password\": \"Password must contain...\"}}")))
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Objeto de requisição de registro de usuário",
            content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = RegisterRequest.class),
                    examples = @ExampleObject(value = "{\"username\": \"newuser\", \"password\": \"StrongPass1!\", \"email\": \"new@example.com\", \"fullName\": \"New User\", \"role\": \"VIGILANTE\"}")))
    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(@RequestBody RegisterRequest request) {
        AuthenticationResponse response = authenticationService.register(request);
        
        // Log da atividade de registro
        logService.logUserActivity(request.getUsername(), "REGISTER", 
            "Novo usuário registrado: " + request.getFullName() + " (" + request.getEmail() + ")");
        
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Renova o token de acesso usando um token de refresh",
               description = "Fornece um token de refresh para obter um novo token de acesso e um novo token de refresh.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Token renovado com sucesso",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = AuthenticationResponse.class),
                            examples = @ExampleObject(value = "{\"token\": \"eyJhbGci...\", \"refreshToken\": \"eyJhbGci...\", \"user\": {\"username\": \"testuser\", \"email\": \"test@example.com\", \"fullName\": \"Test User\", \"role\": \"VIGILANTE\"}}"))),
            @ApiResponse(responseCode = "401", description = "Token de refresh inválido ou expirado",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class),
                            examples = @ExampleObject(value = "{\"timestamp\": \"2025-06-17T19:00:00.000\", \"status\": 401, \"error\": \"Unauthorized\", \"message\": \"Invalid Refresh Token\", \"path\": \"/api/auth/refresh-token\"}")))
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Objeto de requisição para renovação de token",
            content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = RefreshTokenRequest.class),
                    examples = @ExampleObject(value = "{\"refreshToken\": \"eyJhbGci...\"}")))
    @PostMapping("/refresh-token")
    public ResponseEntity<AuthenticationResponse> refreshToken(@RequestBody RefreshTokenRequest request) {
        AuthenticationResponse response = authenticationService.refreshToken(request);
        
        // Log da atividade de refresh token
        if (response.getUser() != null) {
            logService.logUserActivity(response.getUser().getUsername(), "REFRESH_TOKEN", 
                "Token de acesso renovado");
        }
        
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Teste de saúde da API",
               description = "Endpoint simples para testar se a API está funcionando.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "API funcionando",
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(value = "{\"status\": \"ok\", \"message\": \"API is running\"}")))
    })
    @GetMapping("/test/health")
    public ResponseEntity<Object> testHealth() {
        return ResponseEntity.ok(Map.of("status", "ok", "message", "API is running"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Não autenticado"));
        }

        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        List<String> permissions = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        Map<String, Object> userInfo = Map.of(
            "username", authentication.getName(),
            "authenticated", authentication.isAuthenticated(),
            "authorities", permissions,
            "principal", authentication.getPrincipal().toString()
        );

        return ResponseEntity.ok(userInfo);
    }
} 