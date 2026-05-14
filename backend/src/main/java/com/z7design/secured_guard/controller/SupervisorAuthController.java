package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.*;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.UserTermsConsent;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.SeetaFace2Service;
import com.z7design.secured_guard.service.SupervisorService;
import com.z7design.secured_guard.service.UserTermsConsentService;
import com.z7design.secured_guard.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/supervisor-auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Autenticação de Supervisores", description = "API para autenticação de supervisores via CPF ou reconhecimento facial")
public class SupervisorAuthController {
    
    private final SupervisorService supervisorService;
    private final SeetaFace2Service seetaFace2Service;
    private final UserTermsConsentService consentService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    
    @PostMapping("/login-cpf")
    @Operation(summary = "Login por CPF", description = "Autentica supervisor usando CPF")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login realizado com sucesso"),
        @ApiResponse(responseCode = "400", description = "CPF inválido"),
        @ApiResponse(responseCode = "404", description = "Supervisor não encontrado"),
        @ApiResponse(responseCode = "403", description = "Supervisor inativo")
    })
    public ResponseEntity<Map<String, Object>> loginByCpf(
            @Parameter(description = "CPF do supervisor") @RequestParam String cpf,
            HttpServletRequest request) {
        
        log.info("Tentativa de login por CPF: {}", cpf);
        
        // 1) Tenta o cadastro dedicado em 'supervisors' (comportamento original)
        try {
            SupervisorDTO supervisor = supervisorService.getSupervisorByCpf(cpf);

            if (Boolean.FALSE.equals(supervisor.getIsActive())) {
                return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", "Supervisor inativo"
                ));
            }

            boolean needsConsent = isConsentRequiredSafe(cpf, UserTermsConsent.UserType.SUPERVISOR);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("supervisor", supervisor);
            response.put("needsConsent", needsConsent);

            if (!needsConsent) {
                String token = jwtService.generateToken(supervisor.getId().toString(), "SUPERVISOR");
                response.put("token", token);
                response.put("message", "Login realizado com sucesso");
            } else {
                response.put("message", "Necessário aceitar termos de uso");
            }

            log.info("Login por CPF (supervisor dedicado) realizado: {}", supervisor.getName());
            return ResponseEntity.ok(response);

        } catch (Exception supervisorLookupError) {
            log.info("Supervisor não encontrado na tabela 'supervisors' para CPF '{}'. Tentando fallback em usuários do sistema.", cpf);
        }

        // 2) Fallback: usuário cadastrado em 'users' com role SUPERVISOR e CPF correspondente
        try {
            Optional<User> userOpt = findActiveSupervisorUser(cpf);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Supervisor não encontrado ou inativo"
                ));
            }

            User user = userOpt.get();
            if (!user.isActive()) {
                return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", "Supervisor inativo"
                ));
            }

            SupervisorDTO supervisor = SupervisorDTO.fromUser(user);

            // Verificar termos LGPD pelo CPF normalizado armazenado no usuário
            String userCpf = user.getCpf() != null ? user.getCpf() : cpf;
            boolean needsConsent = isConsentRequiredSafe(userCpf, UserTermsConsent.UserType.SUPERVISOR);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("supervisor", supervisor);
            response.put("needsConsent", needsConsent);

            if (!needsConsent) {
                // Para usuários do sistema, gerar token padrão (subject = username)
                String token = jwtService.generateToken(user);
                response.put("token", token);
                response.put("message", "Login realizado com sucesso");
            } else {
                response.put("message", "Necessário aceitar termos de uso");
            }

            log.info("Login por CPF (usuário do sistema com role SUPERVISOR) realizado: {} ({})", user.getName(), user.getUsername());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Erro no fallback de login por CPF para '{}'", cpf, e);
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "error", "Supervisor não encontrado ou inativo"
            ));
        }
    }

    /**
     * Busca um usuário do sistema com role SUPERVISOR ativo a partir de um
     * CPF ou matrícula informado no login. Tenta múltiplas formas para
     * tolerar tanto CPF formatado quanto apenas dígitos, e também aceita
     * matrícula passada no mesmo campo (procurando por username).
     */
    private Optional<User> findActiveSupervisorUser(String rawInput) {
        if (rawInput == null || rawInput.isBlank()) {
            return Optional.empty();
        }

        String trimmed = rawInput.trim();
        String digits = trimmed.replaceAll("\\D", "");

        // Match exato no CPF (como digitado) — útil quando o input já vem formatado
        Optional<User> byExact = userRepository.findByCpf(trimmed)
                .filter(this::isUserActiveSupervisor);
        if (byExact.isPresent()) return byExact;

        // Match por dígitos (normaliza ambos os lados via REPLACE no JPQL)
        if (!digits.isEmpty()) {
            Optional<User> byDigits = userRepository.findActiveSupervisorByCpfDigits(digits);
            if (byDigits.isPresent()) return byDigits;
        }

        // Aceita também matrícula/username informado no mesmo campo
        Optional<User> byUsername = userRepository.findByUsername(trimmed)
                .filter(this::isUserActiveSupervisor);
        if (byUsername.isPresent()) return byUsername;

        if (!digits.isEmpty() && !digits.equals(trimmed)) {
            return userRepository.findByUsername(digits)
                    .filter(this::isUserActiveSupervisor);
        }

        return Optional.empty();
    }

    private boolean isUserActiveSupervisor(User user) {
        if (!user.isActive()) return false;
        if (user.getRoles() == null || user.getRoles().isEmpty()) return false;
        return user.getRoles().stream()
                .filter(r -> r != null && r.getName() != null)
                .anyMatch(r -> "SUPERVISOR".equalsIgnoreCase(r.getName()));
    }

    /**
     * Wrapper defensivo para verificação de consentimento LGPD. Se a consulta
     * falhar por qualquer motivo (ex.: tabela ausente em um ambiente
     * desatualizado), assume que o consentimento NÃO é obrigatório para que o
     * login não seja indevidamente bloqueado. O incidente é registrado em
     * warning para acompanhamento operacional.
     */
    private boolean isConsentRequiredSafe(String cpf, UserTermsConsent.UserType userType) {
        try {
            return consentService.isConsentRequiredByCpf(cpf, userType);
        } catch (Exception ex) {
            log.warn("Falha ao verificar consentimento LGPD para CPF '{}' (userType={}): {}. Prosseguindo sem exigir aceite.",
                    cpf, userType, ex.getMessage());
            return false;
        }
    }
    
    @PostMapping("/login-facial")
    @Operation(summary = "Login por reconhecimento facial", description = "Autentica supervisor usando reconhecimento facial")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login realizado com sucesso"),
        @ApiResponse(responseCode = "400", description = "Arquivo inválido"),
        @ApiResponse(responseCode = "404", description = "Face não reconhecida"),
        @ApiResponse(responseCode = "500", description = "Erro no reconhecimento")
    })
    public ResponseEntity<Map<String, Object>> loginByFacialRecognition(
            @Parameter(description = "Arquivo de imagem da face") @RequestParam("image") MultipartFile imageFile,
            HttpServletRequest request) {
        
        log.info("Tentativa de login por reconhecimento facial");
        
        try {
            // Validar arquivo
            if (imageFile.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Arquivo de imagem não fornecido"
                ));
            }
            
            // Realizar reconhecimento facial
            String ipAddress = getClientIpAddress(request);
            String userAgent = request.getHeader("User-Agent");
            
            var result = seetaFace2Service.recognizeSupervisorFace(imageFile, ipAddress, userAgent);
            
            if (result.isSuccess()) {
                // Buscar dados do supervisor
                SupervisorDTO supervisor = supervisorService.getSupervisorByCpf(result.getCpf());
                
                if (!supervisor.getIsActive()) {
                    return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Supervisor inativo"
                    ));
                }
                
                // Verificar se precisa aceitar termos LGPD
                boolean needsConsent = consentService.isConsentRequiredByCpf(result.getCpf(), UserTermsConsent.UserType.SUPERVISOR);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("supervisor", supervisor);
                response.put("needsConsent", needsConsent);
                response.put("confidence", result.getConfidence());
                response.put("quality", result.getQuality());
                
                if (!needsConsent) {
                    // Gerar JWT token
                    String token = jwtService.generateToken(supervisor.getId().toString(), "SUPERVISOR");
                    response.put("token", token);
                    response.put("message", "Login realizado com sucesso");
                } else {
                    response.put("message", "Necessário aceitar termos de uso");
                }
                
                log.info("Login por reconhecimento facial realizado com sucesso: {} (confiança: {})", 
                    supervisor.getName(), result.getConfidence());
                
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", result.getErrorMessage(),
                    "quality", result.getQuality()
                ));
            }
            
        } catch (Exception e) {
            log.error("Erro no login por reconhecimento facial", e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Erro interno do servidor: " + e.getMessage()
            ));
        }
    }
    
    @PostMapping("/accept-terms")
    @Operation(summary = "Aceitar termos LGPD", description = "Registra a aceitação dos termos de uso pelo supervisor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Termos aceitos com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos"),
        @ApiResponse(responseCode = "500", description = "Erro interno")
    })
    public ResponseEntity<Map<String, Object>> acceptTerms(
            @Parameter(description = "CPF do supervisor") @RequestParam String cpf,
            HttpServletRequest request) {

        log.info("Aceitação de termos LGPD para supervisor: {}", cpf);

        // 1) Tenta primeiro o cadastro dedicado em 'supervisors'
        try {
            SupervisorDTO supervisor = supervisorService.getSupervisorByCpf(cpf);

            CreateUserTermsConsentDTO consentDTO = new CreateUserTermsConsentDTO();
            consentDTO.setUserId(supervisor.getId());
            consentDTO.setUserType(UserTermsConsent.UserType.SUPERVISOR);
            consentDTO.setUserCpf(cpf);
            consentDTO.setAccepted(true);
            consentDTO.setIpAddress(getClientIpAddress(request));
            consentDTO.setUserAgent(request.getHeader("User-Agent"));

            UserTermsConsentDTO consent = consentService.createConsent(consentDTO);
            String token = jwtService.generateToken(supervisor.getId().toString(), "SUPERVISOR");

            log.info("Termos LGPD aceitos com sucesso para supervisor: {}", supervisor.getName());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Termos aceitos com sucesso",
                "token", token,
                "supervisor", supervisor,
                "consent", consent
            ));

        } catch (Exception supervisorLookupError) {
            log.info("Supervisor não encontrado em 'supervisors' para CPF '{}'. Tentando fallback em usuários do sistema.", cpf);
        }

        // 2) Fallback: usuário do sistema com role SUPERVISOR
        try {
            Optional<User> userOpt = findActiveSupervisorUser(cpf);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Supervisor não encontrado ou inativo"
                ));
            }

            User user = userOpt.get();
            SupervisorDTO supervisor = SupervisorDTO.fromUser(user);
            String userCpf = user.getCpf() != null ? user.getCpf() : cpf;

            CreateUserTermsConsentDTO consentDTO = new CreateUserTermsConsentDTO();
            consentDTO.setUserId(user.getId());
            consentDTO.setUserType(UserTermsConsent.UserType.SUPERVISOR);
            consentDTO.setUserCpf(userCpf);
            consentDTO.setAccepted(true);
            consentDTO.setIpAddress(getClientIpAddress(request));
            consentDTO.setUserAgent(request.getHeader("User-Agent"));

            UserTermsConsentDTO consent = consentService.createConsent(consentDTO);
            String token = jwtService.generateToken(user);

            log.info("Termos LGPD aceitos (via usuário do sistema com role SUPERVISOR): {} ({})", user.getName(), user.getUsername());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Termos aceitos com sucesso",
                "token", token,
                "supervisor", supervisor,
                "consent", consent
            ));

        } catch (Exception e) {
            log.error("Erro ao aceitar termos LGPD para supervisor: {}", cpf, e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Erro ao registrar aceitação dos termos: " + e.getMessage()
            ));
        }
    }
    
    @GetMapping("/check-terms/{cpf}")
    @Operation(summary = "Verificar status dos termos", description = "Verifica se supervisor precisa aceitar termos LGPD")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status verificado"),
        @ApiResponse(responseCode = "404", description = "Supervisor não encontrado")
    })
    public ResponseEntity<Map<String, Object>> checkTermsStatus(
            @Parameter(description = "CPF do supervisor") @PathVariable String cpf) {

        // 1) Cadastro dedicado em 'supervisors'
        try {
            SupervisorDTO supervisor = supervisorService.getSupervisorByCpf(cpf);
            boolean needsConsent = isConsentRequiredSafe(cpf, UserTermsConsent.UserType.SUPERVISOR);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "needsConsent", needsConsent,
                "supervisor", supervisor
            ));
        } catch (Exception ignored) {
            log.debug("Supervisor não encontrado em 'supervisors' para CPF '{}'; tentando fallback em usuários.", cpf);
        }

        // 2) Fallback: usuário do sistema com role SUPERVISOR
        try {
            Optional<User> userOpt = findActiveSupervisorUser(cpf);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Supervisor não encontrado"
                ));
            }

            User user = userOpt.get();
            SupervisorDTO supervisor = SupervisorDTO.fromUser(user);
            boolean needsConsent = isConsentRequiredSafe(cpf, UserTermsConsent.UserType.SUPERVISOR);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "needsConsent", needsConsent,
                "supervisor", supervisor
            ));
        } catch (Exception e) {
            log.error("Erro ao verificar status dos termos para CPF '{}'", cpf, e);
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "error", "Supervisor não encontrado"
            ));
        }
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
