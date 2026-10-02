package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.InvoiceDTO;
import com.z7design.secured_guard.dto.InvoiceImportItemDTO;
import com.z7design.secured_guard.dto.InvoiceImportResultDTO;
import com.z7design.secured_guard.model.Invoice;
import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;
import com.z7design.secured_guard.repository.InvoiceRepository;
import com.z7design.secured_guard.repository.SupplierRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.Supplier;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.Unit;
import com.z7design.secured_guard.model.Subcategoria;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.SubcategoriaRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InvoiceService {
    
    private final InvoiceRepository invoiceRepository;
    private final SupplierRepository supplierRepository;
    private final ClientRepository clientRepository;
    private final ContractRepository contractRepository;
    private final UnitRepository unitRepository;
    private final SubcategoriaRepository subcategoriaRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    
    @Transactional(readOnly = true)
    public List<Invoice> findAll() {
        return invoiceRepository.findAll();
    }
    
    @Transactional(readOnly = true)
    public Page<Invoice> findAll(Pageable pageable) {
        return invoiceRepository.findAll(pageable);
    }
    
    public Optional<Invoice> findById(UUID id) {
        // Usar método com EntityGraph para carregar relacionamentos e evitar LazyInitializationException
        return invoiceRepository.findByIdWithRelations(id);
    }
    
    public List<Invoice> findByStatus(ExpenseStatus status) {
        return invoiceRepository.findByStatus(status);
    }
    
    public Page<Invoice> findByStatus(ExpenseStatus status, Pageable pageable) {
        return invoiceRepository.findByStatus(status, pageable);
    }
    
    public List<Invoice> findByType(ExpenseType type) {
        return invoiceRepository.findByType(type);
    }
    
    public Page<Invoice> findByType(ExpenseType type, Pageable pageable) {
        return invoiceRepository.findByType(type, pageable);
    }
    
    public List<Invoice> findBySupplier(UUID supplierId) {
        return invoiceRepository.findBySupplierId(supplierId);
    }
    
    public Page<Invoice> findBySupplier(UUID supplierId, Pageable pageable) {
        return invoiceRepository.findBySupplierId(supplierId, pageable);
    }
    
    public List<Invoice> findByClient(UUID clientId) {
        return invoiceRepository.findByClientId(clientId);
    }
    
    public Page<Invoice> findByClient(UUID clientId, Pageable pageable) {
        return invoiceRepository.findByClientId(clientId, pageable);
    }
    
    public List<Invoice> findByContract(UUID contractId) {
        return invoiceRepository.findByContractId(contractId);
    }
    
    public Page<Invoice> findByContract(UUID contractId, Pageable pageable) {
        return invoiceRepository.findByContractId(contractId, pageable);
    }
    
    public List<Invoice> findByDueDate(LocalDate dueDate) {
        return invoiceRepository.findByDueDate(dueDate);
    }
    
    public List<Invoice> findByDueDateBetween(LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.findByDueDateBetween(startDate, endDate);
    }
    
    public List<Invoice> findByPaymentDate(LocalDate paymentDate) {
        return invoiceRepository.findByPaymentDate(paymentDate);
    }
    
    public List<Invoice> findByPaymentDateBetween(LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.findByPaymentDateBetween(startDate, endDate);
    }
    
    public List<Invoice> findByCategory(String category) {
        return invoiceRepository.findByCategory(category);
    }
    
    public Page<Invoice> findByCategory(String category, Pageable pageable) {
        return invoiceRepository.findByCategory(category, pageable);
    }
    
    public List<Invoice> findByInvoiceNumber(String invoiceNumber) {
        return invoiceRepository.findByInvoiceNumberContaining(invoiceNumber);
    }
    
    public List<Invoice> findByDescription(String description) {
        return invoiceRepository.findByDescriptionContainingIgnoreCase(description);
    }
    
    public List<Invoice> findByBarcode(String barcode) {
        return invoiceRepository.findByBarcode(barcode);
    }
    
    public List<Invoice> findOverdueInvoices() {
        return invoiceRepository.findOverdueInvoices(LocalDate.now());
    }
    
    public List<Invoice> findInvoicesDueSoon(int days) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(days);
        return invoiceRepository.findInvoicesDueSoon(startDate, endDate);
    }
    
    public List<Invoice> findPaidInvoicesInPeriod(LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.findPaidInvoicesInPeriod(startDate, endDate);
    }
    
    public Page<Invoice> findByAdvancedFilters(ExpenseStatus status, ExpenseType type, UUID supplierId, 
                                             UUID clientId, UUID unitId, String category, String description, 
                                             LocalDate startDate, LocalDate endDate, 
                                             UUID subcategoriaId, UUID employeeId, Pageable pageable) {
        return invoiceRepository.findByAdvancedFilters(status, type, supplierId, clientId, unitId, category, description, startDate, endDate, subcategoriaId, employeeId, pageable);
    }
    
    public Invoice save(Invoice invoice) {
        // Garantir unidade válida: se não vier no DTO, usar a primeira unidade existente
        if (invoice.getUnit() == null || invoice.getUnit().getId() == null) {
            try {
                org.springframework.data.domain.PageRequest pr = org.springframework.data.domain.PageRequest.of(0, 1);
                Unit fallback = unitRepository.findAll(pr).stream().findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Nenhuma unidade cadastrada"));
                invoice.setUnit(fallback);
            } catch (Exception e) {
                throw new IllegalArgumentException("Unidade é obrigatória para faturas", e);
            }
        }
        return invoiceRepository.save(invoice);
    }

    public void assignCreatedByIfNew(Invoice invoice, UUID userId) {
        if (invoice.getId() != null || userId == null || invoice.getCreatedBy() != null) {
            return;
        }
        userRepository.findById(userId).ifPresent(invoice::setCreatedBy);
    }
    
    public Invoice create(InvoiceDTO invoiceDTO) {
        Invoice invoice = new Invoice();
        updateInvoiceFromDTO(invoice, invoiceDTO);
        return invoiceRepository.save(invoice);
    }
    
    public Invoice update(UUID id, InvoiceDTO invoiceDTO) {
        return update(id, invoiceDTO, null);
    }

    public Invoice update(UUID id, InvoiceDTO invoiceDTO, UUID userId) {
        log.info("Atualizando fatura com ID: {}", id);
        log.info("Dados do DTO: {}", invoiceDTO);
        
        try {
            return invoiceRepository.findById(id)
                    .map(invoice -> {
                        log.info("Fatura encontrada, atualizando dados...");
                        try {
                            updateInvoiceFromDTO(invoice, invoiceDTO);
                            if (invoice.getCreatedBy() == null && userId != null) {
                                userRepository.findById(userId).ifPresent(invoice::setCreatedBy);
                            }
                            log.info("Dados atualizados, salvando fatura...");
                            Invoice saved = invoiceRepository.save(invoice);
                            
                            // Inicializar relacionamentos lazy dentro da transação
                            initializeInvoiceRelationships(saved);
                            
                            log.info("Fatura salva com sucesso: {}", saved.getId());
                            return saved;
                        } catch (Exception e) {
                            log.error("Erro ao atualizar dados da fatura: {}", e.getMessage(), e);
                            throw new RuntimeException("Erro ao atualizar fatura: " + e.getMessage(), e);
                        }
                    })
                    .orElseThrow(() -> {
                        log.error("Fatura não encontrada com ID: {}", id);
                        return new RuntimeException("Fatura não encontrada com ID: " + id);
                    });
        } catch (Exception e) {
            log.error("Erro geral ao atualizar fatura {}: {}", id, e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Inicializa relacionamentos lazy de uma Invoice, tratando casos onde entidades foram deletadas
     */
    private void initializeInvoiceRelationships(Invoice invoice) {
        // Inicializar Supplier
        if (invoice.getSupplier() != null) {
            try {
                invoice.getSupplier().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // Supplier foi deletado ou não pode ser inicializado, definir como null
                invoice.setSupplier(null);
            }
        }
        
        // Inicializar Client
        if (invoice.getClient() != null) {
            try {
                invoice.getClient().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // Client foi deletado ou não pode ser inicializado, definir como null
                invoice.setClient(null);
            }
        }
        
        // Inicializar Contract
        if (invoice.getContract() != null) {
            try {
                invoice.getContract().getContractNumber(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // Contract foi deletado ou não pode ser inicializado, definir como null
                invoice.setContract(null);
            }
        }
        
        // Inicializar Unit
        if (invoice.getUnit() != null) {
            try {
                invoice.getUnit().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // Unit foi deletado ou não pode ser inicializado, definir como null
                invoice.setUnit(null);
            }
        }

        // Inicializar Subcategoria
        if (invoice.getSubcategoria() != null) {
            try {
                invoice.getSubcategoria().getNome(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                invoice.setSubcategoria(null);
            }
        }

        // Inicializar Employee
        if (invoice.getEmployee() != null) {
            try {
                invoice.getEmployee().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                invoice.setEmployee(null);
            }
        }

        // Inicializar CreatedBy
        if (invoice.getCreatedBy() != null) {
            try {
                invoice.getCreatedBy().getName();
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                invoice.setCreatedBy(null);
            }
        }
    }
    
    public void deleteById(UUID id) {
        invoiceRepository.deleteById(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public int deleteInBulk(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        int totalDeleted = 0;
        int batchSize = 500;
        for (int i = 0; i < ids.size(); i += batchSize) {
            List<UUID> batch = ids.subList(i, Math.min(i + batchSize, ids.size()));
            invoiceRepository.deleteAllByIdInBatch(batch);
            totalDeleted += batch.size();
        }
        return totalDeleted;
    }
    
    public Invoice updateStatus(UUID id, ExpenseStatus status) {
        return invoiceRepository.findById(id)
                .map(invoice -> {
                    invoice.setStatus(status);
                    return invoiceRepository.save(invoice);
                })
                .orElseThrow(() -> new RuntimeException("Fatura não encontrada"));
    }
    
    public Invoice markAsPaid(UUID id, LocalDate paymentDate) {
        return invoiceRepository.findById(id)
                .map(invoice -> {
                    invoice.setStatus(ExpenseStatus.PAGA);
                    invoice.setPaymentDate(paymentDate != null ? paymentDate : LocalDate.now());
                    return invoiceRepository.save(invoice);
                })
                .orElseThrow(() -> new RuntimeException("Fatura não encontrada"));
    }
    
    public Invoice cancel(UUID id) {
        return invoiceRepository.findById(id)
                .map(invoice -> {
                    invoice.setStatus(ExpenseStatus.CANCELADA);
                    return invoiceRepository.save(invoice);
                })
                .orElseThrow(() -> new RuntimeException("Fatura não encontrada"));
    }
    
    // Métodos de relatórios
    public List<Object[]> getAmountByStatus() {
        return invoiceRepository.sumAmountByStatus();
    }
    
    public List<Object[]> getAmountByType() {
        return invoiceRepository.sumAmountByType();
    }
    
    public List<Object[]> getAmountBySupplier() {
        return invoiceRepository.sumAmountBySupplier();
    }
    
    public List<Object[]> getAmountByCategory() {
        return invoiceRepository.sumAmountByCategory();
    }
    
    public List<Object[]> getCountByStatus() {
        return invoiceRepository.countByStatus();
    }
    
    public List<Object[]> getCountByType() {
        return invoiceRepository.countByType();
    }
    
    public BigDecimal getTotalPaidInPeriod(LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.getTotalPaidInPeriod(startDate, endDate);
    }
    
    public BigDecimal getTotalPending() {
        return invoiceRepository.getTotalPending();
    }
    
    public BigDecimal getTotalOverdue() {
        return invoiceRepository.getTotalOverdue(LocalDate.now());
    }
    
    // Novos métodos para busca por unidade
    public List<Invoice> findByUnit(UUID unitId) {
        return invoiceRepository.findByUnitId(unitId);
    }
    
    public Page<Invoice> findByUnit(UUID unitId, Pageable pageable) {
        return invoiceRepository.findByUnitId(unitId, pageable);
    }
    
    public List<Invoice> findByUnitAndStatus(UUID unitId, ExpenseStatus status) {
        return invoiceRepository.findByUnitIdAndStatus(unitId, status);
    }
    
    public Page<Invoice> findByUnitAndStatus(UUID unitId, ExpenseStatus status, Pageable pageable) {
        return invoiceRepository.findByUnitIdAndStatus(unitId, status, pageable);
    }
    
    public List<Invoice> findByUnitAndType(UUID unitId, ExpenseType type) {
        return invoiceRepository.findByUnitIdAndType(unitId, type);
    }
    
    public Page<Invoice> findByUnitAndType(UUID unitId, ExpenseType type, Pageable pageable) {
        return invoiceRepository.findByUnitIdAndType(unitId, type, pageable);
    }
    
    public List<Invoice> findByUnitAndCategory(UUID unitId, String category) {
        return invoiceRepository.findByCategoryAndUnitId(category, unitId);
    }
    
    public Page<Invoice> findByUnitAndCategory(UUID unitId, String category, Pageable pageable) {
        return invoiceRepository.findByCategoryAndUnitId(category, unitId, pageable);
    }
    
    public List<Invoice> findByUnits(List<UUID> unitIds) {
        return invoiceRepository.findByUnitIdIn(unitIds);
    }
    
    public Page<Invoice> findByUnits(List<UUID> unitIds, Pageable pageable) {
        return invoiceRepository.findByUnitIdIn(unitIds, pageable);
    }
    
    public List<Invoice> findByUnitsAndStatus(List<UUID> unitIds, ExpenseStatus status) {
        return invoiceRepository.findByUnitIdInAndStatus(unitIds, status);
    }
    
    public Page<Invoice> findByUnitsAndStatus(List<UUID> unitIds, ExpenseStatus status, Pageable pageable) {
        return invoiceRepository.findByUnitIdInAndStatus(unitIds, status, pageable);
    }
    
    public List<Invoice> findByUnitsAndPeriod(List<UUID> unitIds, LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.findByUnitIdInAndDueDateBetween(unitIds, startDate, endDate);
    }
    
    public Page<Invoice> findByUnitsAndPeriod(List<UUID> unitIds, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        return invoiceRepository.findByUnitIdInAndDueDateBetween(unitIds, startDate, endDate, pageable);
    }
    
    public List<Invoice> findOverdueInvoicesByUnit(UUID unitId) {
        return invoiceRepository.findOverdueInvoicesByUnit(unitId, LocalDate.now());
    }
    
    public List<Invoice> findInvoicesDueSoonByUnit(UUID unitId, int days) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(days);
        return invoiceRepository.findInvoicesDueSoonByUnit(unitId, startDate, endDate);
    }
    
    public List<Invoice> findPaidInvoicesInPeriodByUnit(UUID unitId, LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.findPaidInvoicesInPeriodByUnit(unitId, startDate, endDate);
    }
    
    // Métodos de relatórios por unidade
    public List<Object[]> getAmountByStatusAndUnit(UUID unitId) {
        return invoiceRepository.sumAmountByStatusAndUnit(unitId);
    }
    
    public List<Object[]> getAmountByTypeAndUnit(UUID unitId) {
        return invoiceRepository.sumAmountByTypeAndUnit(unitId);
    }
    
    public List<Object[]> getAmountBySupplierAndUnit(UUID unitId) {
        return invoiceRepository.sumAmountBySupplierAndUnit(unitId);
    }
    
    public List<Object[]> getAmountByCategoryAndUnit(UUID unitId) {
        return invoiceRepository.sumAmountByCategoryAndUnit(unitId);
    }
    
    public BigDecimal getTotalPaidInPeriodByUnit(UUID unitId, LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.getTotalPaidInPeriodByUnit(unitId, startDate, endDate);
    }
    
    public BigDecimal getTotalPendingByUnit(UUID unitId) {
        return invoiceRepository.getTotalPendingByUnit(unitId);
    }
    
    public BigDecimal getTotalOverdueByUnit(UUID unitId) {
        return invoiceRepository.getTotalOverdueByUnit(unitId, LocalDate.now());
    }
    
    // ---- Relatórios por Centro de Custo ----
    public BigDecimal getTotalByCostCenterAndPeriod(String centro, LocalDate start, LocalDate end) {
        return invoiceRepository.sumByCentroCustoAndPeriod(centro, start, end);
    }

    public List<Invoice> getInvoicesByCostCenterAndPeriod(String centro, LocalDate start, LocalDate end) {
        return invoiceRepository.findByCentroCustoAndPeriod(centro, start, end);
    }

    public long getInvoicesCountByCostCenter(String centro) {
        return invoiceRepository.countByCentroCusto(centro);
    }

    public void updateInvoiceFromDTO(Invoice invoice, InvoiceDTO dto) {
        log.info("Iniciando atualização de invoice com DTO: {}", dto);
        
        try {
            // Geração automática do número da fatura se não enviado
            String invoiceNumber = dto.getInvoiceNumber();
            if (invoiceNumber == null || invoiceNumber.trim().isEmpty()) {
                // Exemplo: FAT-2025-<UUID curto>
                String year = String.valueOf(java.time.LocalDate.now().getYear());
                invoiceNumber = "FAT-" + year + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            }
            invoice.setInvoiceNumber(invoiceNumber);
            log.debug("Número da fatura definido: {}", invoiceNumber);
            
            invoice.setDescription(dto.getDescription());
            invoice.setAmount(dto.getAmount());
            invoice.setStatus(dto.getStatus() != null ? dto.getStatus() : ExpenseStatus.PENDENTE);
            invoice.setType(dto.getType() != null ? dto.getType() : ExpenseType.VARIAVEL);
            invoice.setIssueDate(dto.getIssueDate() != null ? dto.getIssueDate() : LocalDate.now());
            invoice.setDueDate(dto.getDueDate());
            invoice.setPaymentDate(dto.getPaymentDate());
            invoice.setCategory(dto.getCategory());
            invoice.setCentroCusto(dto.getCentroCusto());
            invoice.setComprovanteUrl(dto.getComprovanteUrl());
            invoice.setBarcode(dto.getBarcode());
            invoice.setNotes(dto.getNotes());
            invoice.setCompanySigla(dto.getCompanySigla());
            invoice.setWorkSector(dto.getWorkSector());
            
            log.debug("Campos básicos definidos");
            
            // Relacionamentos
            Subcategoria subcategoria = null;
            if (dto.getSubcategoriaId() != null) {
                log.debug("Processando subcategoria: {}", dto.getSubcategoriaId());
                subcategoria = subcategoriaRepository.findById(dto.getSubcategoriaId())
                        .orElseThrow(() -> new RuntimeException("Subcategoria não encontrada: " + dto.getSubcategoriaId()));
                invoice.setSubcategoria(subcategoria);
                if (Boolean.TRUE.equals(subcategoria.getRequerVinculoFuncionario()) && dto.getEmployeeId() == null) {
                    throw new IllegalArgumentException(
                            "A conta \"" + subcategoria.getNome()
                                    + "\" exige informar o funcionário beneficiário do pagamento.");
                }
            } else {
                invoice.setSubcategoria(null);
            }

            boolean requiresEmployee = subcategoria != null
                    && Boolean.TRUE.equals(subcategoria.getRequerVinculoFuncionario());
            if (subcategoria == null && invoice.getSubcategoria() != null) {
                requiresEmployee = Boolean.TRUE.equals(invoice.getSubcategoria().getRequerVinculoFuncionario());
            }

            if (dto.getSupplierId() != null) {
                log.debug("Processando fornecedor: {}", dto.getSupplierId());
                Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                        .orElseThrow(() -> new RuntimeException("Fornecedor não encontrado: " + dto.getSupplierId()));
                invoice.setSupplier(supplier);
                log.debug("Fornecedor definido: {}", supplier.getName());
            } else if (requiresEmployee) {
                invoice.setSupplier(null);
            }

            if (!requiresEmployee && dto.getSupplierId() == null && invoice.getSupplier() == null) {
                throw new IllegalArgumentException("Fornecedor é obrigatório para contas que não são de Pessoal / RH.");
            }

            if (dto.getClientId() != null) {
                log.debug("Processando cliente: {}", dto.getClientId());
                Client client = clientRepository.findById(dto.getClientId())
                        .orElseThrow(() -> new RuntimeException("Cliente não encontrado: " + dto.getClientId()));
                invoice.setClient(client);
                log.debug("Cliente definido: {}", client.getName());
            }

            if (dto.getContractId() != null) {
                log.debug("Processando contrato: {}", dto.getContractId());
                Contract contract = contractRepository.findById(dto.getContractId())
                        .orElseThrow(() -> new RuntimeException("Contrato não encontrado: " + dto.getContractId()));
                invoice.setContract(contract);
                log.debug("Contrato definido: {}", contract.getContractNumber());
            }

            if (dto.getUnitId() != null) {
                log.debug("Processando unidade: {}", dto.getUnitId());
                try {
                    Unit unit = unitRepository.findById(dto.getUnitId())
                            .orElseThrow(() -> new RuntimeException("Unidade não encontrada: " + dto.getUnitId()));
                    invoice.setUnit(unit);
                    log.debug("Unidade definida: {}", unit.getName());
                } catch (Exception e) {
                    log.error("Erro ao buscar unidade {}: {}", dto.getUnitId(), e.getMessage());
                    throw new RuntimeException("Erro ao processar unidade: " + e.getMessage(), e);
                }
            }

            if (dto.getEmployeeId() != null) {
                log.debug("Processando employee: {}", dto.getEmployeeId());
                Employee employee = employeeRepository.findById(dto.getEmployeeId())
                        .orElseThrow(() -> new RuntimeException("Funcionário não encontrado: " + dto.getEmployeeId()));
                invoice.setEmployee(employee);
                if (dto.getCompanySigla() == null || dto.getCompanySigla().isBlank()) {
                    throw new IllegalArgumentException(
                            "Informe a empresa (SIGLA) quando o pagamento estiver vinculado a um funcionário.");
                }
                // Auto-preenche o setor de trabalho a partir do posto/departamento do funcionário
                // se o workSector não foi informado explicitamente pelo frontend
                if (dto.getWorkSector() == null || dto.getWorkSector().isBlank()) {
                    String autoSector = null;
                    try {
                        if (employee.getWorkPost() != null) {
                            autoSector = employee.getWorkPost().getName();
                        }
                    } catch (Exception ignored) {}
                    if (autoSector == null || autoSector.isBlank()) {
                        try {
                            if (employee.getDepartment() != null) {
                                autoSector = employee.getDepartment().getName();
                            }
                        } catch (Exception ignored) {}
                    }
                    if (autoSector != null && !autoSector.isBlank()) {
                        invoice.setWorkSector(autoSector);
                        log.debug("workSector auto-preenchido do funcionário: {}", autoSector);
                    }
                }
            } else {
                invoice.setEmployee(null);
            }
            
            log.info("Atualização de invoice concluída com sucesso");
        } catch (Exception e) {
            log.error("Erro ao atualizar invoice: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    public BigDecimal getTotalByTypeAndStatus(String type, String status) {
        // Considera apenas faturas com type e status informados
        List<Invoice> invoices = invoiceRepository.findAll();
        return invoices.stream()
            .filter(i -> {
                boolean typeMatch = false;
                if (type.equalsIgnoreCase("INCOME")) {
                    typeMatch = i.getType() != null && i.getType().name().equalsIgnoreCase("FIXA") || i.getType().name().equalsIgnoreCase("VARIAVEL");
                } else if (type.equalsIgnoreCase("EXPENSE")) {
                    typeMatch = i.getType() != null && i.getType().name().equalsIgnoreCase("FIXA") || i.getType().name().equalsIgnoreCase("VARIAVEL");
                }
                return typeMatch && i.getStatus() != null && i.getStatus().name().equalsIgnoreCase(status);
            })
            .map(Invoice::getAmount)
            .filter(a -> a != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    public BigDecimal getTotalExpensesByStatus(String status) {
        List<Invoice> invoices = invoiceRepository.findAll();
        return invoices.stream()
            .filter(i -> i.getStatus() != null && i.getStatus().name().equalsIgnoreCase(status))
            .map(Invoice::getAmount)
            .filter(a -> a != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    // Buscar categorias únicas
    public List<String> getDistinctCategories() {
        return invoiceRepository.findDistinctCategories();
    }
    
    // Buscar centros de custo únicos
    public List<String> getDistinctCostCenters() {
        return invoiceRepository.findAllCostCenterNames();
    }
    
    // Buscar centros de custo únicos da tabela invoices
    public List<String> getDistinctCostCentersFromInvoices() {
        return invoiceRepository.findDistinctCostCenters();
    }
    
    // Buscar todos os centros de custo da tabela cost_centers
    public List<String> getAllCostCenterNames() {
        return invoiceRepository.findAllCostCenterNames();
    }

    @Transactional
    public InvoiceImportResultDTO importInvoicesFromExcel(List<InvoiceImportItemDTO> items) {
        return importInvoicesFromExcel(items, null);
    }

    @Transactional
    public InvoiceImportResultDTO importInvoicesFromExcel(List<InvoiceImportItemDTO> items, UUID userId) {
        if (items == null || items.isEmpty()) {
            return InvoiceImportResultDTO.builder()
                    .totalRows(0)
                    .importedCount(0)
                    .newSuppliersCreatedCount(0)
                    .totalAmount(BigDecimal.ZERO)
                    .createdSupplierNames(List.of())
                    .importedInvoices(List.of())
                    .build();
        }

        User creator = userId != null ? userRepository.findById(userId).orElse(null) : null;

        int importedCount = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<String> createdSupplierNames = new java.util.ArrayList<>();
        List<InvoiceDTO> importedDtos = new java.util.ArrayList<>();

        // Buscar unidade padrão com fallback seguro
        Unit defaultUnit = unitRepository.findByNameContainingIgnoreCase("Uberl")
                .stream().findFirst()
                .orElseGet(() -> unitRepository.findAll().stream().findFirst().orElse(null));

        if (defaultUnit == null) {
            Unit newUnit = new Unit();
            newUnit.setName("Uberlândia");
            newUnit.setActive(true);
            defaultUnit = unitRepository.save(newUnit);
        }

        // Cache local de fornecedores para evitar duplicidade e excesso de queries no mesmo lote
        Map<String, Supplier> supplierCache = new java.util.HashMap<>();

        for (InvoiceImportItemDTO item : items) {
            if (item == null) continue;
            BigDecimal amount = item.getAmount();
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) continue;

            LocalDate dueDate = item.getDueDate() != null ? item.getDueDate() : LocalDate.now();

            // Tratar Fornecedor
            Supplier supplier = null;
            String rawSupplierName = item.getSupplierName() != null ? item.getSupplierName().trim() : "";
            if (!rawSupplierName.isEmpty()) {
                String supplierName = rawSupplierName.length() > 250 ? rawSupplierName.substring(0, 250) : rawSupplierName;
                final String finalSupplierName = supplierName;
                String cacheKey = finalSupplierName.toLowerCase();

                if (supplierCache.containsKey(cacheKey)) {
                    supplier = supplierCache.get(cacheKey);
                } else {
                    Optional<Supplier> existingOpt = supplierRepository.findFirstByNameIgnoreCase(finalSupplierName);
                    if (existingOpt.isPresent()) {
                        supplier = existingOpt.get();
                    } else {
                        Supplier newSupplier = new Supplier();
                        newSupplier.setName(finalSupplierName);
                        newSupplier.setIsActive(true);
                        supplier = supplierRepository.saveAndFlush(newSupplier);
                        if (!createdSupplierNames.contains(finalSupplierName)) {
                            createdSupplierNames.add(finalSupplierName);
                        }
                    }
                    supplierCache.put(cacheKey, supplier);
                }
            }

            // Tratar Unidade
            Unit unit = null;
            if (item.getUnitName() != null && !item.getUnitName().isBlank()) {
                String searchUnit = item.getUnitName().trim();
                String upperSearch = searchUnit.toUpperCase();
                
                // 1. Tenta correspondência direta
                unit = unitRepository.findByNameContainingIgnoreCase(searchUnit)
                        .stream().findFirst().orElse(null);
                
                // 2. Tenta por termos-chave conhecidos
                if (unit == null) {
                    if (upperSearch.contains("CONTAG")) {
                        unit = unitRepository.findByNameContainingIgnoreCase("Contag").stream().findFirst().orElse(null);
                    } else if (upperSearch.contains("UBERL")) {
                        unit = unitRepository.findByNameContainingIgnoreCase("Uberl").stream().findFirst().orElse(null);
                    }
                }
                
                // 3. Se ainda não encontrou, auto-cria a Unidade com o nome especificado
                if (unit == null) {
                    Unit newUnit = new Unit();
                    newUnit.setName(searchUnit);
                    newUnit.setActive(true);
                    unit = unitRepository.save(newUnit);
                }
            }
            if (unit == null) {
                unit = defaultUnit;
            }

            // Normalizar Sigla Empresa (VIG, TERC, ADM, UBERL)
            String sigla = item.getCompanySigla();
            if (sigla == null || sigla.isBlank()) {
                sigla = "VIG";
            } else if (sigla.length() > 10) {
                sigla = sigla.substring(0, 10);
            }

            Invoice invoice = new Invoice();
            invoice.setInvoiceNumber("IMP-" + System.currentTimeMillis() + "-" + (importedCount + 1));
            
            String desc = item.getDescription() != null && !item.getDescription().isBlank() 
                    ? item.getDescription() 
                    : (rawSupplierName.isEmpty() ? "Pagamento Importado" : rawSupplierName);
            if (desc.length() > 500) {
                desc = desc.substring(0, 497) + "...";
            }
            invoice.setDescription(desc);
            invoice.setAmount(amount);
            
            ExpenseType type = ExpenseType.VARIAVEL;
            if (item.getType() != null && item.getType().toUpperCase().contains("FIXA")) {
                type = ExpenseType.FIXA;
            }
            invoice.setType(type);

            ExpenseStatus status = ExpenseStatus.PENDENTE;
            if (item.getStatus() != null && item.getStatus().toUpperCase().contains("PAG")) {
                status = ExpenseStatus.PAGA;
            }
            invoice.setStatus(status);

            invoice.setDueDate(dueDate);
            invoice.setIssueDate(item.getIssueDate() != null ? item.getIssueDate() : LocalDate.now());
            if (status == ExpenseStatus.PAGA) {
                invoice.setPaymentDate(dueDate);
            }

            invoice.setCompanySigla(sigla.trim().toUpperCase());
            invoice.setSupplier(supplier);
            invoice.setUnit(unit);
            
            if (creator != null) {
                invoice.setCreatedBy(creator);
            }
            
            String barcode = item.getBarcode();
            if (barcode != null && barcode.length() > 255) {
                barcode = barcode.substring(0, 250);
            }
            invoice.setBarcode(barcode);

            String notes = item.getNotes();
            if (notes != null && notes.length() > 1000) {
                notes = notes.substring(0, 997) + "...";
            }
            invoice.setNotes(notes);

            invoiceRepository.save(invoice);
            totalAmount = totalAmount.add(amount);
            importedCount++;
        }

        return InvoiceImportResultDTO.builder()
                .totalRows(items.size())
                .importedCount(importedCount)
                .newSuppliersCreatedCount(createdSupplierNames.size())
                .totalAmount(totalAmount)
                .createdSupplierNames(createdSupplierNames)
                .importedInvoices(List.of())
                .build();
    }
} 