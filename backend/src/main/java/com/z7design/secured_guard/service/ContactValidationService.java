package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.*;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.UserStatus;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactValidationService {
    
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    
    /**
     * Valida contatos de funcionários para envio
     */
    @Transactional(readOnly = true)
    public ContactValidationResponse validateContacts(ContactValidationRequest request) {
        log.info("🔍 Validando contatos para {} funcionários - Tipo: {}", 
                request.getEmployeeIds().size(), request.getType());
        
        List<ContactValidationDetail> details = new ArrayList<>();
        
        for (UUID empId : request.getEmployeeIds()) {
            Optional<Employee> empOpt = employeeRepository.findById(empId);
            
            if (empOpt.isEmpty()) {
                log.warn("⚠️ Funcionário não encontrado: {}", empId);
                ContactValidationDetail detail = ContactValidationDetail.builder()
                        .employeeId(empId)
                        .status("error")
                        .generalError("Funcionário não encontrado")
                        .build();
                details.add(detail);
                continue;
            }
            
            Employee emp = empOpt.get();
            ContactValidationDetail detail = validateEmployee(emp, request.getType());
            details.add(detail);
        }
        
        // Calcular estatísticas
        long readyToSend = details.stream()
                .filter(d -> "ready".equals(d.getStatus()))
                .count();
        
        long needingAction = details.stream()
                .filter(d -> "needs_action".equals(d.getStatus()))
                .count();
        
        long withErrors = details.stream()
                .filter(d -> "error".equals(d.getStatus()))
                .count();
        
        boolean allReady = readyToSend == details.size();
        
        String message;
        if (allReady) {
            message = String.format("Todos os %d funcionários estão prontos para envio!", details.size());
        } else if (needingAction > 0) {
            message = String.format("%d funcionário(s) precisam de ação antes do envio", needingAction);
        } else {
            message = String.format("%d funcionário(s) com erros", withErrors);
        }
        
        return ContactValidationResponse.builder()
                .details(details)
                .totalEmployees(details.size())
                .readyToSend(readyToSend)
                .needingAction(needingAction)
                .withErrors(withErrors)
                .allReady(allReady)
                .message(message)
                .build();
    }
    
    /**
     * Valida um funcionário específico
     */
    private ContactValidationDetail validateEmployee(Employee emp, String type) {
        ContactValidationDetail detail = ContactValidationDetail.builder()
                .employeeId(emp.getId())
                .employeeName(emp.getName())
                .employeeCpf(emp.getDocument())
                .employeeEmail(emp.getEmail())
                .employeePhone(emp.getPhone())
                .build();
        
        // Buscar User correspondente pelo CPF
        Optional<User> userOpt = userRepository.findByUsername(emp.getDocument());
        
        if (userOpt.isEmpty()) {
            detail.setHasUser(false);
            detail.setNeedsUserCreation(true);
            detail.setStatus("needs_action");
            detail.setStatusMessage("Usuário não cadastrado no sistema");
            
            if ("email".equals(type)) {
                detail.setCanSendEmail(emp.getEmail() != null && !emp.getEmail().trim().isEmpty());
                if (!detail.isCanSendEmail()) {
                    detail.setEmailError("Email não cadastrado no funcionário");
                }
            } else if ("whatsapp".equals(type) || "both".equals(type)) {
                detail.setCanSendWhatsApp(false);
                detail.setWhatsappError("Necessário criar usuário primeiro");
            }
            
            return detail;
        }
        
        // User existe - validar campos
        User user = userOpt.get();
        detail.setHasUser(true);
        detail.setUserId(user.getId());
        detail.setUserEmail(user.getEmail());
        detail.setUserWhatsapp(user.getWhatsapp());
        boolean hasWhatsAppConsent = Boolean.TRUE.equals(user.getWhatsappConsent());
        detail.setHasWhatsAppConsent(hasWhatsAppConsent);
        detail.setWhatsappConsentDate(user.getWhatsappConsentDate());
        
        // Validar Email
        if ("email".equals(type) || "both".equals(type)) {
            String emailToUse = user.getEmail() != null ? user.getEmail() : emp.getEmail();
            detail.setCanSendEmail(emailToUse != null && !emailToUse.trim().isEmpty());
            
            if (!detail.isCanSendEmail()) {
                detail.setEmailError("Email não cadastrado");
                detail.setNeedsEmailUpdate(true);
            }
        }
        
        // Validar WhatsApp: primeiro em users, depois em employees
        if ("whatsapp".equals(type) || "both".equals(type)) {
            String whatsapp = user.getWhatsapp();
            
            // Se não encontrou em users, verificar em employees
            if (whatsapp == null || whatsapp.trim().isEmpty()) {
                String employeeWhatsapp = emp.getPhone();
                if (employeeWhatsapp != null && !employeeWhatsapp.trim().isEmpty()) {
                    whatsapp = employeeWhatsapp;
                    log.info("✅ WhatsApp encontrado em employees para CPF {}: {}", emp.getDocument(), whatsapp);
                    // Atualizar o user com o WhatsApp do employee
                    user.setWhatsapp(whatsapp);
                    userRepository.save(user);
                    log.info("✅ WhatsApp atualizado na tabela users");
                    // Atualizar o detail também
                    detail.setUserWhatsapp(whatsapp);
                }
            }
            
            if (whatsapp == null || whatsapp.trim().isEmpty()) {
                detail.setCanSendWhatsApp(false);
                detail.setWhatsappError("WhatsApp não cadastrado em users nem em employees");
                detail.setNeedsWhatsAppUpdate(true);
            } else {
                // Validar formato
                String normalized = whatsapp.replaceAll("[^0-9]", "");
                if (normalized.length() >= 10 && normalized.length() <= 13) {
                    if (hasWhatsAppConsent) {
                        detail.setCanSendWhatsApp(true);
                        detail.setNeedsWhatsAppConsent(false);
                    } else {
                        detail.setCanSendWhatsApp(false);
                        detail.setNeedsWhatsAppConsent(true);
                        detail.setWhatsappError("Consentimento WhatsApp não registrado");
                    }
                } else {
                    detail.setCanSendWhatsApp(false);
                    detail.setWhatsappError("Número de WhatsApp em formato inválido");
                    detail.setNeedsWhatsAppUpdate(true);
                }
            }
        }
        
        // Determinar status final
        boolean isReady = false;
        
        if ("email".equals(type)) {
            isReady = detail.isCanSendEmail();
        } else if ("whatsapp".equals(type)) {
            isReady = detail.isCanSendWhatsApp();
        } else if ("both".equals(type)) {
            isReady = detail.isCanSendEmail() && detail.isCanSendWhatsApp();
        }
        
        if (isReady) {
            detail.setStatus("ready");
            detail.setStatusMessage("Pronto para envio");
        } else if (detail.isNeedsUserCreation() || detail.isNeedsWhatsAppUpdate() || detail.isNeedsWhatsAppConsent() || detail.isNeedsEmailUpdate()) {
            detail.setStatus("needs_action");
            
            List<String> actions = new ArrayList<>();
            if (detail.isNeedsUserCreation()) actions.add("criar usuário");
            if (detail.isNeedsWhatsAppUpdate()) actions.add("adicionar WhatsApp");
            if (detail.isNeedsWhatsAppConsent()) actions.add("confirmar consentimento WhatsApp");
            if (detail.isNeedsEmailUpdate()) actions.add("adicionar email");
            
            detail.setStatusMessage("Ação necessária: " + String.join(", ", actions));
        } else {
            detail.setStatus("error");
            detail.setStatusMessage("Erro na validação");
        }
        
        return detail;
    }
    
    /**
     * Cria usuário rapidamente para um funcionário
     */
    @Transactional
    public User quickCreateUser(QuickUserCreateRequest request) {
        log.info("👤 Criando usuário rápido para funcionário: {}", request.getEmployeeId());
        
        Employee emp = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new IllegalArgumentException("Funcionário não encontrado"));
        
        // Verificar se já existe usuário com este CPF
        Optional<User> existingUser = userRepository.findByUsername(emp.getDocument());
        if (existingUser.isPresent()) {
            throw new IllegalStateException("Já existe usuário cadastrado para este CPF");
        }
        
        // Determinar email
        String email = request.getEmail() != null ? request.getEmail() : emp.getEmail();
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email é obrigatório");
        }
        
        // Senha padrão: CPF@2025
        String defaultPassword = emp.getDocument().replaceAll("[^0-9]", "") + "@2025";
        
        // Criar usuário
        User user = User.builder()
                .username(emp.getDocument()) // CPF
                .password(passwordEncoder.encode(defaultPassword))
                .email(email)
                .name(emp.getName())
                .whatsapp(request.getWhatsapp())
                .status(UserStatus.ACTIVE)
                .active(true)
                .roles(new HashSet<>(Collections.singletonList(
                        roleRepository.findByName("ROLE_COLABORADOR")
                                .orElseThrow(() -> new IllegalStateException("Role COLABORADOR não encontrada"))
                )))
                .build();
        
        User savedUser = userRepository.save(user);
        log.info("✅ Usuário criado: {} - ID: {}", savedUser.getUsername(), savedUser.getId());
        
        // Vincular ao Employee
        emp.setUser(savedUser);
        employeeRepository.save(emp);
        log.info("✅ Usuário vinculado ao funcionário");
        
        // Enviar email de boas-vindas (se solicitado)
        if (request.isSendWelcomeEmail()) {
            try {
                sendWelcomeEmail(savedUser, defaultPassword);
            } catch (Exception e) {
                log.error("❌ Erro ao enviar email de boas-vindas: {}", e.getMessage());
                // Não falhar a criação por causa do email
            }
        }
        
        return savedUser;
    }
    
    /**
     * Atualiza WhatsApp de um usuário
     */
    @Transactional
    public User updateUserWhatsApp(UUID userId, UpdateWhatsAppRequest request) {
        log.info("📱 Atualizando WhatsApp do usuário: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        
        // Validar formato (apenas números)
        String normalized = request.getWhatsapp().replaceAll("[^0-9]", "");
        if (normalized.length() < 10 || normalized.length() > 13) {
            throw new IllegalArgumentException("Número de WhatsApp inválido (deve ter 10-13 dígitos)");
        }
        
        user.setWhatsapp(normalized);
        User updated = userRepository.save(user);
        
        log.info("✅ WhatsApp atualizado: {} -> {}", user.getUsername(), normalized);
        
        return updated;
    }

    /**
     * Atualiza email de um usuário
     */
    @Transactional
    public User updateUserEmail(UUID userId, UpdateEmailRequest request) {
        log.info("📧 Atualizando email do usuário: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        if (email.isEmpty() || !email.contains("@")) {
            throw new IllegalArgumentException("Email inválido");
        }

        user.setEmail(email);
        User updated = userRepository.save(user);

        log.info("✅ Email atualizado: {} -> {}", user.getUsername(), email);

        return updated;
    }
    
    /**
     * Envia email de boas-vindas com credenciais
     */
    private void sendWelcomeEmail(User user, String password) {
        String subject = "Bem-vindo ao Secured Guard - Suas Credenciais de Acesso";
        
        String htmlBody = String.format("""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #333;">Olá, %s!</h2>
                    <p>Seu usuário foi criado no sistema <strong>Secured Guard</strong>.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Suas credenciais de acesso:</h3>
                        <p><strong>Usuário:</strong> %s</p>
                        <p><strong>Senha:</strong> %s</p>
                    </div>
                    
                    <p style="color: #e53935;"><strong>⚠️ Por favor, altere sua senha no primeiro acesso.</strong></p>
                    
                    <p>
                        <a href="https://ci.z7botsolutions.com.br/login" 
                           style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Acessar Sistema
                        </a>
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #777; font-size: 12px;">
                        Atenciosamente,<br>
                        <strong>Equipe Secured Guard</strong>
                    </p>
                </body>
                </html>
                """, user.getName(), user.getUsername(), password);
        
        // Usa o método existente sendEmailWithAttachment sem anexo
        emailService.sendEmailWithAttachment(user.getEmail(), subject, htmlBody, null, null);
        log.info("📧 Email de boas-vindas enviado para: {}", user.getEmail());
    }
}

