package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ScheduledPaymentDTO;
import com.z7design.secured_guard.model.AccountsReceivable;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.ScheduledPayment;
import com.z7design.secured_guard.model.Subcategoria;
import com.z7design.secured_guard.model.enums.PaymentMethod;
import com.z7design.secured_guard.model.enums.ScheduledPaymentStatus;
import com.z7design.secured_guard.repository.AccountsReceivableRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.ScheduledPaymentRepository;
import com.z7design.secured_guard.repository.SubcategoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ScheduledPaymentService {
    
    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final ClientRepository clientRepository;
    private final SubcategoriaRepository subcategoriaRepository;
    private final AccountsReceivableRepository accountsReceivableRepository;
    private final NotificationService notificationService;
    private final ScheduledPaymentNotificationService scheduledPaymentNotificationService;
    
    /**
     * Buscar todos os pagamentos agendados com paginação
     */
    @Transactional(readOnly = true)
    public Page<ScheduledPaymentDTO> getAllScheduledPayments(Pageable pageable) {
        log.info("Buscando todos os pagamentos agendados com paginação");
        Page<ScheduledPayment> payments = scheduledPaymentRepository.findAllByOrderByScheduledDateAsc(pageable);
        return payments.map(ScheduledPaymentDTO::fromEntity);
    }
    
    /**
     * Buscar todos os pagamentos agendados sem paginação
     */
    @Transactional(readOnly = true)
    public List<ScheduledPaymentDTO> getAllScheduledPayments() {
        log.info("Buscando todos os pagamentos agendados");
        List<ScheduledPayment> payments = scheduledPaymentRepository.findAll();
        return payments.stream()
                .map(ScheduledPaymentDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar pagamento agendado por ID
     */
    @Transactional(readOnly = true)
    public ScheduledPaymentDTO getScheduledPaymentById(UUID id) {
        log.info("Buscando pagamento agendado por ID: {}", id);
        ScheduledPayment payment = scheduledPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pagamento agendado não encontrado com ID: " + id));
        return ScheduledPaymentDTO.fromEntity(payment);
    }
    
    /**
     * Criar novo pagamento agendado.
     *
     * <p>Quando {@code accountsReceivableId} (ou {@code paymentId}) é informado,
     * o agendamento herda automaticamente cliente, descrição, valor, forma de
     * pagamento, número da fatura e a subcategoria do Plano de Contas da conta
     * a receber de origem.</p>
     */
    public ScheduledPaymentDTO createScheduledPayment(ScheduledPaymentDTO dto) {
        log.info("Criando novo pagamento agendado para conta de origem: {}", dto.getAccountsReceivableId());
        
        // Herdar dados da conta a receber de origem, quando informada
        AccountsReceivable origin = null;
        if (dto.getAccountsReceivableId() != null) {
            origin = accountsReceivableRepository.findById(dto.getAccountsReceivableId())
                    .orElseThrow(() -> new RuntimeException(
                            "Conta a receber de origem não encontrada com ID: " + dto.getAccountsReceivableId()));
            applyInheritanceFromOrigin(dto, origin);
        }
        
        // Validação manual (a herança preenche os campos quando há origem)
        validateRequiredFields(dto);
        
        // Buscar cliente
        Client client = clientRepository.findById(dto.getClientId())
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado com ID: " + dto.getClientId()));
        
        // Criar entidade
        ScheduledPayment payment = dto.toEntity();
        payment.setClient(client);
        payment.setStatus(ScheduledPaymentStatus.SCHEDULED);
        payment.setAlertSent(false);
        payment.setAccountsReceivable(origin);
        payment.setSubcategoria(resolveSubcategoria(dto.getSubcategoriaId()));
        
        // Salvar
        ScheduledPayment savedPayment = scheduledPaymentRepository.save(payment);
        log.info("Pagamento agendado criado com sucesso: {} (herdou subcategoria: {})",
                savedPayment.getId(),
                payment.getSubcategoria() != null ? payment.getSubcategoria().getNome() : "nenhuma");
        
        return ScheduledPaymentDTO.fromEntity(savedPayment);
    }

    /**
     * Cria um pagamento agendado a partir de uma conta a receber já persistida
     * (fluxo de agendamento no cadastro/edição da conta a receber).
     * Herda automaticamente todos os dados e a subcategoria da conta de origem.
     */
    public ScheduledPaymentDTO createScheduledPaymentFromReceivable(AccountsReceivable account, LocalDate scheduledDate) {
        ScheduledPaymentDTO dto = new ScheduledPaymentDTO();
        dto.setAccountsReceivableId(account.getId());
        dto.setScheduledDate(scheduledDate);
        applyInheritanceFromOrigin(dto, account);
        return createScheduledPayment(dto);
    }

    /**
     * Valida os campos obrigatórios após a herança. Quando não há conta de
     * origem, todos os campos precisam vir da requisição.
     */
    private void validateRequiredFields(ScheduledPaymentDTO dto) {
        if (dto.getClientId() == null) {
            throw new IllegalArgumentException("Cliente é obrigatório");
        }
        if (dto.getDescription() == null || dto.getDescription().isBlank()) {
            throw new IllegalArgumentException("Descrição é obrigatória");
        }
        if (dto.getAmount() == null || dto.getAmount().signum() <= 0) {
            throw new IllegalArgumentException("Valor deve ser maior que zero");
        }
        if (dto.getPaymentMethod() == null) {
            throw new IllegalArgumentException("Forma de pagamento é obrigatória");
        }
        if (dto.getScheduledDate() == null) {
            throw new IllegalArgumentException("Data de agendamento é obrigatória");
        }
    }

    /**
     * Aplica herança automática dos dados da conta a receber de origem no DTO.
     * Preenche apenas os campos ainda não informados pelo cliente.
     */
    private void applyInheritanceFromOrigin(ScheduledPaymentDTO dto, AccountsReceivable origin) {
        if (dto.getClientId() == null) {
            dto.setClientId(origin.getClient() != null ? origin.getClient().getId() : null);
        }
        if (dto.getDescription() == null || dto.getDescription().isBlank()) {
            dto.setDescription(origin.getDescription());
        }
        if (dto.getAmount() == null) {
            dto.setAmount(origin.getAmount());
        }
        if (dto.getPaymentMethod() == null && origin.getPaymentMethod() != null) {
            dto.setPaymentMethod(origin.getPaymentMethod());
        }
        if (dto.getInvoiceNumber() == null || dto.getInvoiceNumber().isBlank()) {
            dto.setInvoiceNumber(origin.getInvoiceNumber());
        }
        if ((dto.getSubcategoriaId() == null) && origin.getSubcategoria() != null) {
            dto.setSubcategoriaId(origin.getSubcategoria().getId());
            log.info("Herança automática: agendamento recebeu subcategoria '{} - {}' da conta a receber {}",
                    origin.getSubcategoria().getCodigo(), origin.getSubcategoria().getNome(), origin.getId());
        }
    }
    
    /**
     * Atualizar pagamento agendado
     */
    public ScheduledPaymentDTO updateScheduledPayment(UUID id, ScheduledPaymentDTO dto) {
        log.info("Atualizando pagamento agendado: {}", id);
        
        ScheduledPayment existingPayment = scheduledPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pagamento agendado não encontrado com ID: " + id));
        
        // Herdar dados da conta a receber de origem quando informada (e ainda não vinculada)
        if (dto.getAccountsReceivableId() != null && existingPayment.getAccountsReceivable() == null) {
            AccountsReceivable origin = accountsReceivableRepository.findById(dto.getAccountsReceivableId())
                    .orElseThrow(() -> new RuntimeException(
                            "Conta a receber de origem não encontrada com ID: " + dto.getAccountsReceivableId()));
            applyInheritanceFromOrigin(dto, origin);
            existingPayment.setAccountsReceivable(origin);
        }
        
        // Validação manual: apenas campos realmente obrigatórios ao atualizar
        validateRequiredFields(dto);
        
        // Atualizar campos (apenas valores não nulos, preservando os existentes)
        if (dto.getDescription() != null) existingPayment.setDescription(dto.getDescription());
        if (dto.getAmount() != null) existingPayment.setAmount(dto.getAmount());
        if (dto.getScheduledDate() != null) existingPayment.setScheduledDate(dto.getScheduledDate());
        if (dto.getPaymentMethod() != null) existingPayment.setPaymentMethod(dto.getPaymentMethod());
        if (dto.getInvoiceNumber() != null) existingPayment.setInvoiceNumber(dto.getInvoiceNumber());
        if (dto.getNotes() != null) existingPayment.setNotes(dto.getNotes());
        existingPayment.setSubcategoria(resolveSubcategoria(dto.getSubcategoriaId()));
        
        // Se mudou a data, resetar alerta
        if (existingPayment.getScheduledDate() != null && dto.getScheduledDate() != null
                && !existingPayment.getScheduledDate().equals(dto.getScheduledDate())) {
            existingPayment.setAlertSent(false);
            existingPayment.setAlertSentDate(null);
        }
        
        ScheduledPayment updatedPayment = scheduledPaymentRepository.save(existingPayment);
        log.info("Pagamento agendado atualizado com sucesso: {}", updatedPayment.getId());
        
        return ScheduledPaymentDTO.fromEntity(updatedPayment);
    }
    
    private Subcategoria resolveSubcategoria(UUID subcategoriaId) {
        if (subcategoriaId == null) {
            return null;
        }
        return subcategoriaRepository.findById(subcategoriaId).orElse(null);
    }

    /**
     * Deletar pagamento agendado
     */
    public void deleteScheduledPayment(UUID id) {
        log.info("Deletando pagamento agendado: {}", id);
        
        if (!scheduledPaymentRepository.existsById(id)) {
            throw new RuntimeException("Pagamento agendado não encontrado com ID: " + id);
        }
        
        scheduledPaymentRepository.deleteById(id);
        log.info("Pagamento agendado deletado com sucesso: {}", id);
    }
    
    /**
     * Buscar pagamentos agendados por cliente
     */
    @Transactional(readOnly = true)
    public List<ScheduledPaymentDTO> getScheduledPaymentsByClient(UUID clientId) {
        log.info("Buscando pagamentos agendados por cliente: {}", clientId);
        List<ScheduledPayment> payments = scheduledPaymentRepository.findByClientId(clientId);
        return payments.stream()
                .map(ScheduledPaymentDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar pagamentos agendados por status
     */
    @Transactional(readOnly = true)
    public List<ScheduledPaymentDTO> getScheduledPaymentsByStatus(ScheduledPaymentStatus status) {
        log.info("Buscando pagamentos agendados por status: {}", status);
        List<ScheduledPayment> payments = scheduledPaymentRepository.findByStatus(status);
        return payments.stream()
                .map(ScheduledPaymentDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar pagamentos vencendo em 3 dias
     */
    @Transactional(readOnly = true)
    public List<ScheduledPaymentDTO> getPaymentsDueInThreeDays() {
        log.info("Buscando pagamentos vencendo em 3 dias");
        LocalDate threeDaysFromNow = LocalDate.now().plusDays(3);
        List<ScheduledPayment> payments = scheduledPaymentRepository.findPaymentsDueInThreeDays(threeDaysFromNow);
        return payments.stream()
                .map(ScheduledPaymentDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar pagamentos vencidos
     */
    @Transactional(readOnly = true)
    public List<ScheduledPaymentDTO> getOverduePayments() {
        log.info("Buscando pagamentos vencidos");
        List<ScheduledPayment> payments = scheduledPaymentRepository.findOverduePayments(LocalDate.now());
        return payments.stream()
                .map(ScheduledPaymentDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Marcar pagamento como executado
     */
    public ScheduledPaymentDTO markAsExecuted(UUID id, LocalDate executionDate) {
        log.info("Marcando pagamento agendado como executado: {}", id);
        
        ScheduledPayment payment = scheduledPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pagamento agendado não encontrado com ID: " + id));
        
        payment.setStatus(ScheduledPaymentStatus.EXECUTED);
        payment.setExecutionDate(executionDate);
        
        ScheduledPayment updatedPayment = scheduledPaymentRepository.save(payment);
        log.info("Pagamento agendado marcado como executado: {}", updatedPayment.getId());
        
        return ScheduledPaymentDTO.fromEntity(updatedPayment);
    }
    
    /**
     * Cancelar pagamento agendado
     */
    public ScheduledPaymentDTO cancelScheduledPayment(UUID id) {
        log.info("Cancelando pagamento agendado: {}", id);
        
        ScheduledPayment payment = scheduledPaymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pagamento agendado não encontrado com ID: " + id));
        
        payment.setStatus(ScheduledPaymentStatus.CANCELLED);
        
        ScheduledPayment updatedPayment = scheduledPaymentRepository.save(payment);
        log.info("Pagamento agendado cancelado: {}", updatedPayment.getId());
        
        return ScheduledPaymentDTO.fromEntity(updatedPayment);
    }
    
    /**
     * Cancelar automaticamente o agendamento de pagamento vinculado a uma conta a receber.
     * Chamado na exclusão da conta a receber de origem para manter o histórico consistente.
     * Somente agendamentos ainda pendentes (SCHEDULED) são cancelados; agendamentos já
     * executados permanecem como registro histórico.
     */
    public void cancelByAccountsReceivableId(UUID accountsReceivableId) {
        scheduledPaymentRepository.findByAccountsReceivableId(accountsReceivableId)
                .filter(payment -> payment.getStatus() == ScheduledPaymentStatus.SCHEDULED)
                .ifPresent(payment -> {
                    log.info("Cancelando agendamento {} vinculado à conta a receber {} (exclusão da origem)",
                            payment.getId(), accountsReceivableId);
                    payment.setStatus(ScheduledPaymentStatus.CANCELLED);
                    scheduledPaymentRepository.save(payment);
                    // Notificar o cliente sobre o cancelamento (best-effort, nunca interrompe a exclusão)
                    scheduleClientCancellationNotice(payment);
                });
    }
    
    /**
     * Prepara a notificação de cancelamento ao cliente e agenda o envio para APÓS o commit
     * da transação de exclusão. Assim, se a exclusão da conta a receber falhar e houver
     * rollback, o cliente não recebe um aviso de cancelamento falso.
     */
    private void scheduleClientCancellationNotice(ScheduledPayment payment) {
        try {
            // Captura os dados dentro da transação (lazy loading seguro) para envio pós-commit
            ScheduledPaymentNotificationService.CancellationNotice notice =
                    ScheduledPaymentNotificationService.CancellationNotice.from(payment);
            if (notice.email() == null && notice.telefoneNormalizado() == null) {
                log.info("Cliente {} sem e-mail e telefone cadastrados — notificação de cancelamento não enviada.",
                        notice.clienteNome());
                return;
            }
            if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                try {
                    scheduledPaymentNotificationService.sendCancellationNotice(notice);
                } catch (Exception e) {
                    log.error("Erro ao despachar notificação assíncrona de cancelamento: {}", e.getMessage());
                }
                return;
            }
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    // Envio assíncrono (@Async) — o DELETE não espera o e-mail/WhatsApp
                    try {
                        scheduledPaymentNotificationService.sendCancellationNotice(notice);
                    } catch (Exception e) {
                        log.error("Erro ao despachar notificação assíncrona de cancelamento: {}", e.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            log.error("Erro ao preparar notificação de cancelamento do agendamento {}: {}",
                    payment.getId(), e.getMessage());
        }
    }
    
    /**
     * Enviar alertas para pagamentos vencendo em 3 dias
     */
    @Transactional
    public void sendAlertsForPaymentsDueInThreeDays() {
        log.info("Enviando alertas para pagamentos vencendo em 3 dias");
        
        LocalDate threeDaysFromNow = LocalDate.now().plusDays(3);
        List<ScheduledPayment> payments = scheduledPaymentRepository.findPaymentsDueOnDateWithoutAlert(threeDaysFromNow);
        
        for (ScheduledPayment payment : payments) {
            try {
                // Enviar notificação
                sendPaymentDueAlert(payment);
                
                // Marcar alerta como enviado
                payment.setAlertSent(true);
                payment.setAlertSentDate(LocalDateTime.now());
                scheduledPaymentRepository.save(payment);
                
                log.info("Alerta enviado para pagamento: {}", payment.getId());
            } catch (Exception e) {
                log.error("Erro ao enviar alerta para pagamento {}: {}", payment.getId(), e.getMessage());
            }
        }
        
        log.info("Alertas enviados para {} pagamentos", payments.size());
    }
    
    /**
     * Enviar alerta individual para pagamento
     */
    private void sendPaymentDueAlert(ScheduledPayment payment) {
        // Aqui você pode implementar a lógica de envio de notificação
        // Por exemplo, criar uma notificação no sistema ou enviar email
        log.info("Enviando alerta para pagamento vencendo em 3 dias: {} - Cliente: {} - Valor: {}", 
                payment.getId(), payment.getClient().getName(), payment.getAmount());
        
        // TODO: Implementar envio de notificação via NotificationService
        // notificationService.createNotification(...);
    }
}
