package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.AccountsReceivableDTO;
import com.z7design.secured_guard.model.AccountsReceivable;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.MeasurementBulletin;
import com.z7design.secured_guard.model.ScheduledPayment;
import com.z7design.secured_guard.model.enums.ReceivableStatus;
import com.z7design.secured_guard.model.Subcategoria;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.repository.AccountsReceivableRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.MeasurementBulletinRepository;
import com.z7design.secured_guard.repository.ScheduledPaymentRepository;
import com.z7design.secured_guard.repository.SubcategoriaRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AccountsReceivableService {
    
    private final AccountsReceivableRepository accountsReceivableRepository;
    private final ClientRepository clientRepository;
    private final UnitRepository unitRepository;
    private final MeasurementBulletinRepository measurementBulletinRepository;
    private final WorkPostRepository workPostRepository;
    private final SubcategoriaRepository subcategoriaRepository;
    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final ScheduledPaymentService scheduledPaymentService;
    
    /**
     * Buscar todas as contas a receber com paginação
     */
    @Transactional(readOnly = true)
    public Page<AccountsReceivableDTO> getAllAccountsReceivable(Pageable pageable) {
        log.info("Buscando todas as contas a receber com paginação");
        Page<AccountsReceivable> accounts = accountsReceivableRepository.findAllOrderByDueDate(pageable);
        return accounts.map(AccountsReceivableDTO::fromEntity);
    }
    
    /**
     * Buscar todas as contas a receber sem paginação
     */
    @Transactional(readOnly = true)
    public List<AccountsReceivableDTO> getAllAccountsReceivable() {
        log.info("Buscando todas as contas a receber");
        List<AccountsReceivable> accounts = accountsReceivableRepository.findAll();
        return accounts.stream()
                .map(AccountsReceivableDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar conta a receber por ID
     */
    @Transactional(readOnly = true)
    public AccountsReceivableDTO getAccountsReceivableById(UUID id) {
        log.info("Buscando conta a receber por ID: {}", id);
        AccountsReceivable account = accountsReceivableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta a receber não encontrada com ID: " + id));
        return AccountsReceivableDTO.fromEntity(account);
    }
    
    /**
     * Criar nova conta a receber
     */
    public AccountsReceivableDTO createAccountsReceivable(AccountsReceivableDTO dto) {
        log.info("Criando nova conta a receber para cliente: {}", dto.getClientId());
        
        // Buscar cliente
        Client client = clientRepository.findById(dto.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + dto.getClientId()));
        
        // Criar entidade
        AccountsReceivable account = new AccountsReceivable();
        account.setClient(client);
        account.setInvoiceNumber(dto.getInvoiceNumber());
        applyMeasurement(account, dto);
        account.setDescription(dto.getDescription());
        account.setAmount(dto.getAmount());
        account.setAmountPaid(dto.getAmountPaid() != null ? dto.getAmountPaid() : BigDecimal.ZERO);
        account.setIssueDate(dto.getIssueDate());
        account.setDueDate(dto.getDueDate());
        account.setPaymentDate(dto.getPaymentDate());
        account.setStatus(dto.getStatus() != null ? dto.getStatus() : ReceivableStatus.PENDING);
        
        // Validar categoria obrigatória
        if (dto.getCategory() == null) {
            throw new IllegalArgumentException("Categoria é obrigatória");
        }
        account.setCategory(dto.getCategory());
        
        // Validar forma de pagamento obrigatória
        if (dto.getPaymentMethod() == null) {
            throw new IllegalArgumentException("Forma de pagamento é obrigatória");
        }
        account.setPaymentMethod(dto.getPaymentMethod());
        
        account.setOverdueDays(dto.getOverdueDays() != null ? dto.getOverdueDays() : 0);
        account.setLateFee(dto.getLateFee() != null ? dto.getLateFee() : BigDecimal.ZERO);
        account.setLatePenalty(dto.getLatePenalty() != null ? dto.getLatePenalty() : BigDecimal.ZERO);
        account.setNotes(dto.getNotes());
        
        // Buscar e definir unidade se unitId foi fornecido
        if (dto.getUnitId() != null) {
            account.setUnit(unitRepository.findById(dto.getUnitId()).orElse(null));
        }
        
        // Definir posto de trabalho se fornecido
        if (dto.getWorkPostId() != null) {
            account.setWorkPost(workPostRepository.findById(dto.getWorkPostId())
                    .orElseThrow(() -> new ResourceNotFoundException("Posto de trabalho não encontrado com ID: " + dto.getWorkPostId())));
        }
        
        // Definir subcategoria do Plano de Contas se fornecida
        account.setSubcategoria(resolveSubcategoria(dto.getSubcategoriaId()));
        
        // Calcular dias em atraso
        account.calculateOverdueDays();
        
        // Salvar
        AccountsReceivable savedAccount = accountsReceivableRepository.save(account);
        log.info("Conta a receber criada com sucesso: {}", savedAccount.getId());
        
        // Agendamento automático: herda subcategoria e dados da conta de origem
        syncScheduledPaymentIfRequested(savedAccount, dto);
        
        return AccountsReceivableDTO.fromEntity(savedAccount);
    }
    
    /**
     * Atualizar conta a receber
     */
    public AccountsReceivableDTO updateAccountsReceivable(UUID id, AccountsReceivableDTO dto) {
        log.info("Atualizando conta a receber: {}", id);
        
        // Buscar conta existente
        AccountsReceivable account = accountsReceivableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta a receber não encontrada com ID: " + id));
        
        // Buscar cliente se foi alterado
        if (!account.getClient().getId().equals(dto.getClientId())) {
            Client client = clientRepository.findById(dto.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + dto.getClientId()));
            account.setClient(client);
        }
        
        // Atualizar campos
        account.setInvoiceNumber(dto.getInvoiceNumber());
        applyMeasurement(account, dto);
        account.setDescription(dto.getDescription());
        account.setAmount(dto.getAmount());
        account.setAmountPaid(dto.getAmountPaid() != null ? dto.getAmountPaid() : BigDecimal.ZERO);
        account.setIssueDate(dto.getIssueDate());
        account.setDueDate(dto.getDueDate());
        account.setPaymentDate(dto.getPaymentDate());
        
        // Atualizar status se fornecido
        if (dto.getStatus() != null) {
            account.setStatus(dto.getStatus());
        }
        
        // Atualizar categoria se fornecida (obrigatória se fornecida)
        if (dto.getCategory() != null) {
            account.setCategory(dto.getCategory());
        }
        
        // Atualizar forma de pagamento se fornecida (obrigatória se fornecida)
        if (dto.getPaymentMethod() != null) {
            account.setPaymentMethod(dto.getPaymentMethod());
        }
        
        account.setOverdueDays(dto.getOverdueDays() != null ? dto.getOverdueDays() : 0);
        account.setLateFee(dto.getLateFee() != null ? dto.getLateFee() : BigDecimal.ZERO);
        account.setLatePenalty(dto.getLatePenalty() != null ? dto.getLatePenalty() : BigDecimal.ZERO);
        account.setNotes(dto.getNotes());
        
        // Atualizar unidade se unitId foi fornecido
        if (dto.getUnitId() != null) {
            account.setUnit(unitRepository.findById(dto.getUnitId()).orElse(null));
        } else if (dto.getUnitId() == null && account.getUnit() != null) {
            // Se unitId for null explicitamente, remover a unidade
            account.setUnit(null);
        }
        
        // Atualizar posto de trabalho se fornecido
        if (dto.getWorkPostId() != null) {
            account.setWorkPost(workPostRepository.findById(dto.getWorkPostId())
                    .orElseThrow(() -> new ResourceNotFoundException("Posto de trabalho não encontrado com ID: " + dto.getWorkPostId())));
        } else {
            account.setWorkPost(null);
        }
        
        // Atualizar subcategoria do Plano de Contas
        account.setSubcategoria(resolveSubcategoria(dto.getSubcategoriaId()));
        
        // Calcular dias em atraso
        account.calculateOverdueDays();
        
        // Salvar
        AccountsReceivable savedAccount = accountsReceivableRepository.save(account);
        log.info("Conta a receber atualizada com sucesso: {}", savedAccount.getId());
        
        // Agendamento automático: herda subcategoria e dados da conta de origem
        syncScheduledPaymentIfRequested(savedAccount, dto);
        
        return AccountsReceivableDTO.fromEntity(savedAccount);
    }
    
    /**
     * Resolve a vinculação com o Boletim de Medição.
     *
     * <p>Quando o cliente envia {@code measurementId}, carregamos o boletim e
     * preenchemos também o {@code measurementNumber} com um texto amigável
     * derivado do contrato/NF (mantém compatibilidade com filtros legados que
     * usam apenas o texto). Se vier apenas {@code measurementNumber}, deixamos
     * o vínculo nulo e gravamos só o texto livre.
     */
    /**
     * Resolve a subcategoria do Plano de Contas vinculada à conta a receber.
     * Retorna null quando nenhum ID é informado ou a subcategoria não existe.
     */
    private Subcategoria resolveSubcategoria(UUID subcategoriaId) {
        if (subcategoriaId == null) {
            return null;
        }
        return subcategoriaRepository.findById(subcategoriaId).orElse(null);
    }

    /**
     * Cria ou atualiza o pagamento agendado quando o cadastro/edição da conta a
     * receber veio com {@code agendarPagamento = true} e {@code dataAgendamento}.
     * O agendamento herda automaticamente cliente, descrição, valor, forma de
     * pagamento e a subcategoria do Plano de Contas da conta a receber de origem.
     */
    private void syncScheduledPaymentIfRequested(AccountsReceivable savedAccount, AccountsReceivableDTO dto) {
        if (!Boolean.TRUE.equals(dto.getAgendarPagamento()) || dto.getDataAgendamento() == null) {
            return;
        }
        java.util.Optional<ScheduledPayment> existing = scheduledPaymentRepository.findByAccountsReceivableId(savedAccount.getId());
        if (existing.isPresent()) {
            ScheduledPayment payment = existing.get();
            payment.setScheduledDate(dto.getDataAgendamento());
            payment.setDescription(savedAccount.getDescription());
            payment.setAmount(savedAccount.getAmount());
            payment.setPaymentMethod(savedAccount.getPaymentMethod());
            payment.setInvoiceNumber(savedAccount.getInvoiceNumber());
            payment.setNotes(savedAccount.getNotes());
            payment.setSubcategoria(savedAccount.getSubcategoria());
            scheduledPaymentRepository.save(payment);
            log.info("Agendamento {} atualizado com herança da conta a receber {}",
                    payment.getId(), savedAccount.getId());
        } else {
            scheduledPaymentService.createScheduledPaymentFromReceivable(savedAccount, dto.getDataAgendamento());
            log.info("Agendamento criado com herança da conta a receber {}", savedAccount.getId());
        }
    }

    private void applyMeasurement(AccountsReceivable account, AccountsReceivableDTO dto) {
        if (dto.getMeasurementId() != null) {
            MeasurementBulletin bulletin = measurementBulletinRepository.findById(dto.getMeasurementId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Boletim de medição não encontrado com ID: " + dto.getMeasurementId()));
            account.setMeasurement(bulletin);
            // Se o cliente enviou um número específico, respeitamos; senão derivamos do boletim
            if (dto.getMeasurementNumber() != null && !dto.getMeasurementNumber().isBlank()) {
                account.setMeasurementNumber(dto.getMeasurementNumber().trim());
            } else if (bulletin.getNfNumber() != null && !bulletin.getNfNumber().isBlank()) {
                account.setMeasurementNumber(bulletin.getNfNumber().trim());
            } else if (bulletin.getContractNumber() != null && !bulletin.getContractNumber().isBlank()) {
                account.setMeasurementNumber(bulletin.getContractNumber().trim());
            } else {
                account.setMeasurementNumber(null);
            }
        } else {
            account.setMeasurement(null);
            String number = dto.getMeasurementNumber();
            account.setMeasurementNumber(number != null && !number.isBlank() ? number.trim() : null);
        }
    }

    /**
     * Excluir conta a receber.
     *
     * <p>DELETE é idempotente por convenção REST: deletar um registro que já
     * não existe é sucesso silencioso. Caso contrário, telas que ficam abertas
     * por horas (e cujo cache mostra contas já apagadas em outra janela ou
     * por outro usuário) recebem 404 ao clicar em excluir, o que confunde o
     * usuário final. O front recarrega a lista logo após e a UI fica consistente.
     */
    public void deleteAccountsReceivable(UUID id) {
        log.info("Excluindo conta a receber: {}", id);

        if (accountsReceivableRepository.countByReceivableId(id) == 0) {
            log.warn("Conta a receber {} já não existe no banco — tratando DELETE como idempotente (no-op).", id);
            return;
        }

        // Cancelar automaticamente o agendamento de pagamento vinculado à conta excluída
        scheduledPaymentService.cancelByAccountsReceivableId(id);

        accountsReceivableRepository.deleteByIds(List.of(id));
        log.info("Conta a receber excluída com sucesso: {}", id);
    }
    
    /**
     * Buscar contas por cliente
     */
    @Transactional(readOnly = true)
    public List<AccountsReceivableDTO> getAccountsReceivableByClient(UUID clientId) {
        log.info("Buscando contas a receber por cliente: {}", clientId);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findByClientId(clientId);
        return accounts.stream()
                .map(AccountsReceivableDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar contas por status
     */
    @Transactional(readOnly = true)
    public List<AccountsReceivableDTO> getAccountsReceivableByStatus(ReceivableStatus status) {
        log.info("Buscando contas a receber por status: {}", status);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findByStatus(status);
        return accounts.stream()
                .map(AccountsReceivableDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar contas vencidas
     */
    @Transactional(readOnly = true)
    public List<AccountsReceivableDTO> getOverdueAccounts() {
        log.info("Buscando contas a receber vencidas");
        List<AccountsReceivable> accounts = accountsReceivableRepository.findOverdueAccounts(LocalDate.now());
        return accounts.stream()
                .map(AccountsReceivableDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar contas por período
     */
    @Transactional(readOnly = true)
    public List<AccountsReceivableDTO> getAccountsReceivableByPeriod(LocalDate startDate, LocalDate endDate) {
        log.info("Buscando contas a receber por período: {} a {}", startDate, endDate);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findByIssueDateBetween(startDate, endDate);
        return accounts.stream()
                .map(AccountsReceivableDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar números de fatura para autocomplete
     */
    @Transactional(readOnly = true)
    public List<String> searchInvoiceNumbers(String term) {
        log.info("Buscando números de fatura para termo: {}", term);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findByInvoiceNumberContainingIgnoreCase(term);
        return accounts.stream()
                .map(AccountsReceivable::getInvoiceNumber)
                .distinct()
                .limit(10)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar números de medição para autocomplete
     */
    @Transactional(readOnly = true)
    public List<String> searchMeasurementNumbers(String term) {
        log.info("Buscando números de medição para termo: {}", term);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findByMeasurementNumberContainingIgnoreCase(term);
        return accounts.stream()
                .map(AccountsReceivable::getMeasurementNumber)
                .filter(Objects::nonNull)
                .distinct()
                .limit(10)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar categorias para autocomplete
     */
    @Transactional(readOnly = true)
    public List<String> searchCategories(String term) {
        log.info("Buscando categorias para termo: {}", term);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findAll();
        return accounts.stream()
                .map(AccountsReceivable::getCategory)
                .filter(Objects::nonNull)
                .map(Enum::name)
                .filter(category -> category.toLowerCase().contains(term.toLowerCase()))
                .distinct()
                .limit(10)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar formas de pagamento para autocomplete
     */
    @Transactional(readOnly = true)
    public List<String> searchPaymentMethods(String term) {
        log.info("Buscando formas de pagamento para termo: {}", term);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findAll();
        return accounts.stream()
                .map(AccountsReceivable::getPaymentMethod)
                .filter(Objects::nonNull)
                .map(Enum::name)
                .filter(method -> method.toLowerCase().contains(term.toLowerCase()))
                .distinct()
                .limit(10)
                .collect(Collectors.toList());
    }
    
    /**
     * Marcar conta como paga
     */
    public AccountsReceivableDTO markAsPaid(UUID id, LocalDate paymentDate) {
        log.info("Marcando conta a receber como paga: {}", id);
        
        AccountsReceivable account = accountsReceivableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conta a receber não encontrada com ID: " + id));
        
        account.setStatus(ReceivableStatus.PAID);
        account.setPaymentDate(paymentDate);
        account.setAmountPaid(account.getAmount());
        account.setOverdueDays(0);
        
        AccountsReceivable savedAccount = accountsReceivableRepository.save(account);
        log.info("Conta a receber marcada como paga: {}", savedAccount.getId());
        
        return AccountsReceivableDTO.fromEntity(savedAccount);
    }
    
    /**
     * Atualizar status de todas as contas vencidas
     */
    @Transactional
    public void updateOverdueStatus() {
        log.info("Atualizando status de contas vencidas");
        
        List<AccountsReceivable> overdueAccounts = accountsReceivableRepository.findOverdueAccounts(LocalDate.now());
        
        for (AccountsReceivable account : overdueAccounts) {
            if (account.getStatus() == ReceivableStatus.PENDING) {
                account.setStatus(ReceivableStatus.OVERDUE);
                account.calculateOverdueDays();
            }
        }
        
        accountsReceivableRepository.saveAll(overdueAccounts);
        log.info("Status de {} contas vencidas atualizado", overdueAccounts.size());
    }
    
    /**
     * Buscar contas a receber vencendo em 3 dias
     */
    @Transactional(readOnly = true)
    public List<AccountsReceivableDTO> getAccountsReceivableDueInThreeDays() {
        log.info("Buscando contas a receber vencendo em 3 dias");
        LocalDate threeDaysFromNow = LocalDate.now().plusDays(3);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findByDueDateBetween(
                threeDaysFromNow, threeDaysFromNow);
        return accounts.stream()
                .filter(account -> account.getStatus() == ReceivableStatus.PENDING)
                .map(AccountsReceivableDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar contas a receber vencendo em X dias
     */
    @Transactional(readOnly = true)
    public List<AccountsReceivableDTO> getAccountsReceivableDueInDays(int days) {
        log.info("Buscando contas a receber vencendo em {} dias", days);
        LocalDate targetDate = LocalDate.now().plusDays(days);
        List<AccountsReceivable> accounts = accountsReceivableRepository.findByDueDateBetween(
                targetDate, targetDate);
        return accounts.stream()
                .filter(account -> account.getStatus() == ReceivableStatus.PENDING)
                .map(AccountsReceivableDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Enviar alertas para contas a receber vencendo em 3 dias
     */
    @Transactional
    public void sendAlertsForAccountsDueInThreeDays() {
        log.info("Enviando alertas para contas a receber vencendo em 3 dias");
        
        List<AccountsReceivableDTO> accountsDueInThreeDays = getAccountsReceivableDueInThreeDays();
        
        for (AccountsReceivableDTO account : accountsDueInThreeDays) {
            try {
                // Enviar notificação
                sendAccountDueAlert(account);
                log.info("Alerta enviado para conta a receber: {} - Cliente: {} - Valor: {}", 
                        account.getId(), account.getClient().getName(), account.getAmount());
            } catch (Exception e) {
                log.error("Erro ao enviar alerta para conta a receber {}: {}", account.getId(), e.getMessage());
            }
        }
        
        log.info("Alertas enviados para {} contas a receber", accountsDueInThreeDays.size());
    }
    
    /**
     * Enviar alerta individual para conta a receber
     */
    private void sendAccountDueAlert(AccountsReceivableDTO account) {
        // Aqui você pode implementar a lógica de envio de notificação
        // Por exemplo, criar uma notificação no sistema ou enviar email
        log.info("Enviando alerta para conta a receber vencendo em 3 dias: {} - Cliente: {} - Valor: {}", 
                account.getId(), account.getClient().getName(), account.getAmount());
        
        // TODO: Implementar envio de notificação via NotificationService
        // notificationService.createNotification(...);
    }
}
