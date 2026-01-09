package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.FirstAccessRequestDTO;
import com.z7design.secured_guard.dto.SimpleResponseDTO;
import com.z7design.secured_guard.dto.TwoFactorActivationRequestDTO;
import com.z7design.secured_guard.dto.TwoFactorStatusDTO;
import com.z7design.secured_guard.model.TwoFactorCode;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.LogService;
import com.z7design.secured_guard.service.TwoFactorService;
import com.z7design.secured_guard.service.BaileysRestService;
import org.springframework.beans.factory.annotation.Autowired;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/first-access")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Primeiro Acesso", description = "Endpoints para mudança de senha e ativação 2FA no primeiro acesso")
public class FirstAccessController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TwoFactorService twoFactorService;
    private final LogService logService;
    
    @Autowired(required = false)
    private BaileysRestService baileysRestService;

    @Operation(summary = "Verifica status do primeiro acesso", description = "Retorna informações sobre primeiro acesso e 2FA")
    @GetMapping("/status")
    public ResponseEntity<TwoFactorStatusDTO> getStatus(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Boolean firstAccess = !Boolean.TRUE.equals(user.getFirstAccessCompleted());
        Boolean twoFactorEnabled = Boolean.TRUE.equals(user.getTwoFactorEnabled());
        
        TwoFactorStatusDTO status = TwoFactorStatusDTO.builder()
                .firstAccess(firstAccess)
                .enabled(twoFactorEnabled)
                .whatsappNumber(user.getWhatsapp())
                .message(firstAccess ? "É necessário alterar sua senha no primeiro acesso" : 
                        (!twoFactorEnabled ? "É necessário ativar autenticação de dois fatores" : "Conta configurada"))
                .build();

        return ResponseEntity.ok(status);
    }

    @Operation(summary = "Altera senha no primeiro acesso", description = "Permite ao usuário alterar sua senha no primeiro acesso")
    @PostMapping("/change-password")
    public ResponseEntity<SimpleResponseDTO> changePassword(
            @Valid @RequestBody FirstAccessRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("🔐 Iniciando mudança de senha no primeiro acesso para: {}", userDetails.getUsername());

            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

            // Validar senha atual
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                log.warn("❌ Senha atual incorreta");
                return ResponseEntity.badRequest().body(SimpleResponseDTO.builder()
                        .message("Senha atual incorreta")
                        .success(false)
                        .build());
            }

            // Validar confirmação de senha
            if (!request.getNewPassword().equals(request.getConfirmPassword())) {
                return ResponseEntity.badRequest().body(SimpleResponseDTO.builder()
                        .message("As senhas não coincidem")
                        .success(false)
                        .build());
            }

            // Atualizar senha
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            user.setFirstAccessCompleted(true);
            user.setLastPasswordChange(LocalDateTime.now());
            userRepository.save(user);

            log.info("✅ Senha alterada com sucesso para: {}", user.getUsername());
            
            // Log da atividade
            logService.logUserActivity(user.getUsername(), "FIRST_ACCESS_PASSWORD_CHANGE", 
                "Senha alterada no primeiro acesso");

            return ResponseEntity.ok(SimpleResponseDTO.builder()
                    .message("Senha alterada com sucesso! Agora você precisa ativar a autenticação de dois fatores.")
                    .success(true)
                    .build());

        } catch (Exception e) {
            log.error("💥 Erro ao alterar senha: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(SimpleResponseDTO.builder()
                    .message("Erro ao alterar senha: " + e.getMessage())
                    .success(false)
                    .build());
        }
    }

    @Operation(summary = "Solicita código 2FA", description = "Envia código de verificação via WhatsApp")
    @PostMapping("/request-2fa-code")
    public ResponseEntity<SimpleResponseDTO> requestTwoFactorCode(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            log.info("📱 Solicitando código 2FA para: {}", userDetails.getUsername());

            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

            // Verificar se usuário tem WhatsApp cadastrado
            if (user.getWhatsapp() == null || user.getWhatsapp().isEmpty()) {
                return ResponseEntity.badRequest().body(SimpleResponseDTO.builder()
                        .message("WhatsApp não cadastrado. Entre em contato com o administrador.")
                        .success(false)
                        .build());
            }

            // Gerar código
            TwoFactorCode twoFactorCode = twoFactorService.createCode(user, "ACTIVATION");

            log.info("📱 Código 2FA gerado: {} - Enviando via WhatsApp para: {}", 
                    twoFactorCode.getCode(), user.getWhatsapp());

            // Enviar via WhatsApp usando BaileysRestService
            // 🔒 ENCODING: Remover acentos e caracteres especiais para compatibilidade WhatsApp
            String message = String.format(
                "*SecuredGuard - Codigo de Ativacao*\n\n" +
                "Seu codigo de verificacao e: *%s*\n\n" +
                "Este codigo expira em 5 minutos.\n" +
                "Se voce nao solicitou este codigo, ignore esta mensagem.",
                twoFactorCode.getCode()
            );

            boolean sent = false;
            if (baileysRestService != null) {
                try {
                    sent = baileysRestService.sendTextMessage(user.getWhatsapp(), message);
                    if (sent) {
                        log.info("✅ Código 2FA enviado via WhatsApp com sucesso");
                    } else {
                        log.warn("⚠️ Falha ao enviar código via WhatsApp (serviço retornou false)");
                    }
                } catch (Exception e) {
                    log.error("❌ Erro ao enviar código via WhatsApp: {}", e.getMessage(), e);
                }
            } else {
                log.warn("⚠️ BaileysRestService não disponível - código não enviado via WhatsApp");
                log.info("📱 Código para teste manual: {}", twoFactorCode.getCode());
            }

            return ResponseEntity.ok(SimpleResponseDTO.builder()
                    .message(String.format("Código enviado para o WhatsApp: %s****%s", 
                            user.getWhatsapp().substring(0, 4), 
                            user.getWhatsapp().substring(user.getWhatsapp().length() - 2)))
                    .success(true)
                    .build());

        } catch (Exception e) {
            log.error("💥 Erro ao solicitar código 2FA: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(SimpleResponseDTO.builder()
                    .message("Erro ao enviar código: " + e.getMessage())
                    .success(false)
                    .build());
        }
    }

    @Operation(summary = "Ativa 2FA", description = "Valida código e ativa autenticação de dois fatores")
    @PostMapping("/activate-2fa")
    public ResponseEntity<SimpleResponseDTO> activateTwoFactor(
            @Valid @RequestBody TwoFactorActivationRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        try {
            log.info("🔐 Ativando 2FA para: {}", userDetails.getUsername());

            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

            // Validar código
            boolean isValid = twoFactorService.validateCode(user, request.getCode());

            if (!isValid) {
                log.warn("❌ Código 2FA inválido");
                return ResponseEntity.badRequest().body(SimpleResponseDTO.builder()
                        .message("Código inválido ou expirado")
                        .success(false)
                        .build());
            }

            // Ativar 2FA
            user.setTwoFactorEnabled(true);
            userRepository.save(user);

            log.info("✅ 2FA ativado com sucesso para: {}", user.getUsername());
            
            // Log da atividade
            logService.logUserActivity(user.getUsername(), "TWO_FACTOR_ACTIVATED", 
                "Autenticação de dois fatores ativada");

            return ResponseEntity.ok(SimpleResponseDTO.builder()
                    .message("Autenticação de dois fatores ativada com sucesso!")
                    .success(true)
                    .build());

        } catch (Exception e) {
            log.error("💥 Erro ao ativar 2FA: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(SimpleResponseDTO.builder()
                    .message("Erro ao ativar 2FA: " + e.getMessage())
                    .success(false)
                    .build());
        }
    }
}
