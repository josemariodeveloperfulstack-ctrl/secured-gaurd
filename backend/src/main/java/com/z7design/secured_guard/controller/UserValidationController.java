package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user-validation")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "User Validation", description = "Validação de usuários para envio de documentos")
@CrossOrigin(origins = "*")
public class UserValidationController {

    private final UserRepository userRepository;

    @GetMapping("/validate-by-cpf/{cpf}")
    @Operation(summary = "Validar usuário por CPF", 
               description = "Verifica se usuário existe, tem contatos cadastrados e está apto para receber documentos")
    public ResponseEntity<Map<String, Object>> validateUserByCpf(@PathVariable String cpf) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🔍 Validando usuário por CPF: {}", cpf);
            
            // Normalizar CPF (remover caracteres especiais)
            String normalizedCpf = cpf.replaceAll("[^0-9]", "");
            
            // Buscar usuário por username (que é o CPF)
            Optional<User> userOpt = userRepository.findByUsername(normalizedCpf);
            
            if (userOpt.isEmpty()) {
                log.warn("❌ Usuário não encontrado para CPF: {}", normalizedCpf);
                response.put("valid", false);
                response.put("exists", false);
                response.put("error", "CPF não cadastrado no sistema");
                response.put("cpf", formatCpf(normalizedCpf));
                return ResponseEntity.ok(response);
            }
            
            User user = userOpt.get();
            log.info("✅ Usuário encontrado: {}", user.getName());
            
            // Verificar contatos
            boolean hasEmail = user.getEmail() != null && !user.getEmail().trim().isEmpty();
            boolean hasWhatsApp = user.getWhatsapp() != null && !user.getWhatsapp().trim().isEmpty();
            boolean hasWhatsAppConsent = user.getWhatsappConsent() != null && user.getWhatsappConsent();
            
            log.info("📧 Email: {} | 📱 WhatsApp: {} | ✅ Consentimento: {}", 
                    hasEmail ? "Cadastrado" : "Não cadastrado",
                    hasWhatsApp ? "Cadastrado" : "Não cadastrado",
                    hasWhatsAppConsent ? "Ativo" : "Inativo");
            
            // Montar resposta
            response.put("valid", true);
            response.put("exists", true);
            response.put("userId", user.getId().toString());
            response.put("cpf", formatCpf(normalizedCpf));
            response.put("name", user.getName());
            response.put("username", user.getUsername());
            
            // Contatos
            response.put("hasEmail", hasEmail);
            response.put("email", hasEmail ? user.getEmail() : null);
            
            response.put("hasWhatsApp", hasWhatsApp);
            response.put("whatsapp", hasWhatsApp ? user.getWhatsapp() : null);
            response.put("whatsappConsent", hasWhatsAppConsent);
            
            // Status de aptidão para envio
            response.put("canSendEmail", hasEmail);
            response.put("canSendWhatsApp", hasWhatsApp && hasWhatsAppConsent);
            
            response.put("needsEmail", !hasEmail);
            response.put("needsWhatsApp", !hasWhatsApp);
            response.put("needsWhatsAppConsent", hasWhatsApp && !hasWhatsAppConsent);
            
            // Status geral
            boolean isReady = hasEmail || (hasWhatsApp && hasWhatsAppConsent);
            response.put("isReady", isReady);
            response.put("message", isReady 
                    ? "Usuário apto para receber documentos" 
                    : "Usuário precisa cadastrar contatos");
            
            log.info("✅ Validação concluída - Apto: {}", isReady);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao validar usuário: {}", e.getMessage(), e);
            response.put("valid", false);
            response.put("error", "Erro ao validar usuário: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Formata CPF para exibição (000.000.000-00)
     */
    private String formatCpf(String cpf) {
        if (cpf == null || cpf.length() != 11) {
            return cpf;
        }
        return String.format("%s.%s.%s-%s", 
            cpf.substring(0, 3),
            cpf.substring(3, 6),
            cpf.substring(6, 9),
            cpf.substring(9, 11)
        );
    }
}

