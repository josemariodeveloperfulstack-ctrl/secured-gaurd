package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.DeliverStockRequisitionRequest;
import com.z7design.secured_guard.dto.EPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormItemDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EmployeeChangeHistory;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockRequisition;
import com.z7design.secured_guard.model.StockRequisitionLine;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.PersonalProtectiveEquipment;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.StockCategory;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import com.z7design.secured_guard.model.*;

import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeChangeHistoryRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.PersonalProtectiveEquipmentRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StockRequisitionRepository;
import com.z7design.secured_guard.repository.StockMovementRepository;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.z7design.secured_guard.service.StockService;

import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EPIDeliveryFormService {

    private final EPIDeliveryFormRepository epiDeliveryFormRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PersonalProtectiveEquipmentRepository epiRepository;
    private final EmployeeChangeHistoryRepository employeeChangeHistoryRepository;
    private final StockItemRepository stockItemRepository;
    private final StockRequisitionRepository stockRequisitionRepository;
    private final StockMovementRepository stockMovementRepository;

    @Autowired
    @Lazy
    private StockService stockService;

    @Transactional

    public EPIDeliveryFormDTO create(CreateEPIDeliveryFormDTO dto, UUID createdByUserId) {
        log.info("📝 Criando nova ficha de entrega de EPI para funcionário: {}", dto.getEmployeeId());

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado com id: " + dto.getEmployeeId()));

        Company company = null;
        if (dto.getCompanyId() != null) {
            company = companyRepository.findById(dto.getCompanyId())
                    .orElse(null);
            if (company == null) {
                log.warn("⚠️ Empresa com id {} não encontrada, continuando sem vínculo de empresa.", dto.getCompanyId());
            }
        } else if (employee.getCompany() != null) {
            company = employee.getCompany();
            log.info("🏢 Usando empresa do funcionário: {}", company.getName());
        }

        Employee responsibleEmployee = null;
        if (dto.getResponsibleEmployeeId() != null) {
            responsibleEmployee = employeeRepository.findById(dto.getResponsibleEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Funcionário responsável não encontrado com id: " + dto.getResponsibleEmployeeId()));
        }

        User createdBy = null;
        if (createdByUserId != null) {
            createdBy = userRepository.findById(createdByUserId).orElse(null);
        }

        String workSectorSnapshot = dto.getEmployeeWorkSector() != null ? dto.getEmployeeWorkSector() : buildWorkSectorSnapshot(employee);
        EPIDeliveryType deliveryType = dto.getDeliveryType() != null ? dto.getDeliveryType() : EPIDeliveryType.PRIMEIRA_ENTREGA;
        EPIDeliveryFormStatus status = dto.getStatus() != null 
                ? dto.getStatus() 
                : EPIDeliveryFormStatus.DRAFT;

        EPIDeliveryForm form = EPIDeliveryForm.builder()

                .employee(employee)
                .company(company)
                .deliveryDate(dto.getDeliveryDate())
                .responsibleEmployee(responsibleEmployee)
                .deliveryType(deliveryType)
                .employeeWorkSector(workSectorSnapshot)
                .observations(dto.getObservations())
                .pdfUrl(dto.getPdfUrl())
                .createdBy(createdBy)
                .signatureBase64(dto.getSignatureBase64())
                .signatureType(dto.getSignatureType() != null ? dto.getSignatureType() : "ON_SCREEN")
                .status(status)
                .stockRequisitionId(dto.getStockRequisitionId())
                .build();

        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (EPIDeliveryFormItemDTO itemDto : dto.getItems()) {
                EPIDeliveryFormItem item = EPIDeliveryFormItem.builder()
                        .deliveryForm(form)
                        .epiName(itemDto.getEpiName())
                        .quantity(itemDto.getQuantity() != null ? itemDto.getQuantity() : 1)
                        .ca(itemDto.getCa())
                        .caName(itemDto.getCaName())
                        .validityDate(itemDto.getValidityDate())
                        .uniformType(itemDto.getUniformType())
                        .uniformPiece(itemDto.getUniformPiece())
                        .observations(itemDto.getObservations())
                        .stockItemId(itemDto.getStockItemId())
                        .build();
                form.getItems().add(item);
            }
        }

        EPIDeliveryForm savedForm = epiDeliveryFormRepository.save(form);
        
        // Concluir ficha sem vínculo a requisição de almoxarifado: gera REQ-EPI e baixa estoque
        if (savedForm.getStatus() == EPIDeliveryFormStatus.COMPLETED && savedForm.getStockRequisitionId() == null) {
            syncWithStockRequisition(savedForm, createdByUserId);
        }

        log.info("✅ Ficha de entrega de EPI criada com sucesso: {}", savedForm.getId());
        recordHistoryForForm(savedForm, createdBy, "CRIAÇÃO");

        return EPIDeliveryFormDTO.fromEntity(savedForm);
    }

    @Transactional
    public EPIDeliveryFormDTO update(UUID id, CreateEPIDeliveryFormDTO dto, UUID updatedByUserId) {
        log.info("📝 Atualizando ficha de entrega de EPI: {}", id);
        
        EPIDeliveryForm form = epiDeliveryFormRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + id));

        // Se já estava concluída, precisamos lidar com a requisição existente
        boolean wasCompleted = form.getStatus() == com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus.COMPLETED;
        
        // Atualizar campos básicos
        if (dto.getResponsibleEmployeeId() != null) {
            Employee resp = employeeRepository.findById(dto.getResponsibleEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Responsável não encontrado"));
            form.setResponsibleEmployee(resp);
        }
        
        form.setDeliveryDate(dto.getDeliveryDate());
        form.setObservations(dto.getObservations());
        form.setDeliveryType(dto.getDeliveryType() != null ? dto.getDeliveryType() : form.getDeliveryType());
        form.setSignatureBase64(dto.getSignatureBase64());
        form.setSignatureType(dto.getSignatureType() != null ? dto.getSignatureType() : form.getSignatureType());
        form.setEmployeeWorkSector(dto.getEmployeeWorkSector() != null ? dto.getEmployeeWorkSector() : form.getEmployeeWorkSector());
        form.setStatus(dto.getStatus() != null ? dto.getStatus() : form.getStatus());

        // Atualizar itens (remover antigos e adicionar novos para simplificar)
        form.getItems().clear();
        if (dto.getItems() != null) {
            for (EPIDeliveryFormItemDTO itemDto : dto.getItems()) {
                EPIDeliveryFormItem item = EPIDeliveryFormItem.builder()
                        .deliveryForm(form)
                        .epiName(itemDto.getEpiName())
                        .quantity(itemDto.getQuantity() != null ? itemDto.getQuantity() : 1)
                        .ca(itemDto.getCa())
                        .caName(itemDto.getCaName())
                        .validityDate(itemDto.getValidityDate())
                        .uniformType(itemDto.getUniformType())
                        .uniformPiece(itemDto.getUniformPiece())
                        .observations(itemDto.getObservations())
                        .stockItemId(itemDto.getStockItemId())
                        .build();
                form.getItems().add(item);
            }
        }

        EPIDeliveryForm savedForm = epiDeliveryFormRepository.save(form);
        
        if (savedForm.getStatus() == EPIDeliveryFormStatus.COMPLETED) {
            if (savedForm.getStockRequisitionId() == null) {
                syncWithStockRequisition(savedForm, updatedByUserId);
            } else {
                log.debug("Ficha EPI {} concluída com vínculo a requisição de estoque {}; baixa já tratada fora da ficha.",
                        savedForm.getId(), savedForm.getStockRequisitionId());
            }
        } else if (wasCompleted) {
            if (savedForm.getStockRequisitionId() == null) {
                cancelStockRequisition(savedForm, updatedByUserId);
            } else {
                log.warn("Ficha EPI {} deixou de estar concluída mas está vinculada à requisição {}; estorno automático de estoque não aplicado.",
                        savedForm.getId(), savedForm.getStockRequisitionId());
            }
        }


        User updatedBy = updatedByUserId != null ? userRepository.findById(updatedByUserId).orElse(null) : null;
        recordHistoryForForm(savedForm, updatedBy, "ATUALIZAÇÃO");

        return EPIDeliveryFormDTO.fromEntity(savedForm);
    }

    private void syncWithStockRequisition(EPIDeliveryForm form, UUID userId) {
        log.info("📦 Sincronizando ficha EPI {} com requisição de estoque", form.getId());
        
        // Se já existe uma requisição, vamos cancelar ela e as movimentações para gerar uma nova
        // (Isso garante que alterações na lista de itens sejam refletidas corretamente no estoque)
        if (form.getStockRequisitionId() != null) {
            cancelStockRequisition(form, userId);
        }

        // Criar nova requisição de estoque
        StockRequisition requisition = StockRequisition.builder()
                .requisitionNumber("REQ-EPI-" + form.getId().toString().substring(0, 8).toUpperCase())
                .employee(form.getEmployee())
                .requestedByUser(userRepository.findById(userId).orElse(null))
                .movementReason(form.getDeliveryType() == EPIDeliveryType.PRIMEIRA_ENTREGA ? 
                        MovementReason.ENTREGA_INICIAL : 
                        MovementReason.REPOSICAO)
                .notes("Gerado automaticamente pela Ficha de EPI: " + form.getId())
                .employeeWorkSector(form.getEmployeeWorkSector())
                .status(StockRequisitionStatus.DELIVERED)
                .deliveredAt(LocalDateTime.now())
                .deliveredByUser(userRepository.findById(userId).orElse(null))
                .signatureType(StockMovement.SignatureType.DIGITAL)
                .digitalSignature(form.getSignatureBase64())
                .signatureAt(LocalDateTime.now())
                .build();

        for (EPIDeliveryFormItem item : form.getItems()) {
            // Regra: Vincular ao estoque apenas se houver ID do item de estoque
            // O frontend garante que Uniforme de Trabalho - Individual SEJA obrigatório ter stockItemId
            if (item.getStockItemId() != null) {
                StockItem stockItem = stockItemRepository.findById(item.getStockItemId())
                        .orElse(null);
                
                if (stockItem != null) {
                    StockRequisitionLine line = StockRequisitionLine.builder()
                            .stockItem(stockItem)
                            .quantity(item.getQuantity())
                            .build();
                    requisition.addLine(line);
                    
                    // Gerar movimentação de saída imediata
                    com.z7design.secured_guard.dto.StockMovementDTO movDto = new com.z7design.secured_guard.dto.StockMovementDTO();
                    movDto.setStockItemId(stockItem.getId());
                    movDto.setMovementType(MovementType.SAIDA);
                    movDto.setReason(requisition.getMovementReason());
                    movDto.setQuantity(item.getQuantity());
                    movDto.setEmployeeId(form.getEmployee().getId());
                    movDto.setRequisitionNumber(requisition.getRequisitionNumber());
                    movDto.setNotes("Baixa automática via Ficha de EPI");
                    movDto.setDigitalSignature(form.getSignatureBase64());
                    movDto.setSignatureType(StockMovement.SignatureType.DIGITAL);
                    movDto.setSignatureDate(LocalDateTime.now());
                    
                    stockService.createMovement(movDto, userId);
                }
            }
        }

        StockRequisition savedReq = stockRequisitionRepository.save(requisition);

        form.setStockRequisitionId(savedReq.getId());
        epiDeliveryFormRepository.save(form);
    }

    private void cancelStockRequisition(EPIDeliveryForm form, UUID userId) {
        if (form.getStockRequisitionId() == null) return;
        
        log.info("🗑️ Cancelando requisição de estoque legada {} da ficha EPI", form.getStockRequisitionId());
        
        StockRequisition req = stockRequisitionRepository.findById(form.getStockRequisitionId())
                .orElse(null);
        
        if (req == null) {
            form.setStockRequisitionId(null);
            return;
        }
        if (req.getRequisitionNumber() == null || !req.getRequisitionNumber().startsWith("REQ-EPI-")) {
            log.info("Requisição {} não foi criada pela sincronização REQ-EPI; cancelamento automático ignorado.",
                    req.getRequisitionNumber());
            return;
        }
        
        // Estornar movimentações vinculadas
        List<StockMovement> movements = stockMovementRepository.findByRequisitionNumberOrderByMovementDateAsc(req.getRequisitionNumber());
        for (StockMovement m : movements) {
            // Criar entrada compensatória para devolver ao estoque
            com.z7design.secured_guard.dto.StockMovementDTO storno = new com.z7design.secured_guard.dto.StockMovementDTO();
            storno.setStockItemId(m.getStockItem().getId());
            storno.setMovementType(MovementType.ENTRADA);
            storno.setReason(MovementReason.AJUSTE_ENTRADA);
            storno.setQuantity(m.getQuantity());
            storno.setNotes("Estorno automático por alteração na Ficha de EPI: " + form.getId());
            stockService.createMovement(storno, userId);
            
            // Marcar movimento original como cancelado (se houver campo) ou apenas deletar se permitido
            // Aqui vamos apenas deletar para limpar o histórico, ou marcar como deletado se tiver soft delete
            stockMovementRepository.delete(m);
        }
        
        stockRequisitionRepository.delete(req);
        form.setStockRequisitionId(null);
    }


    private void recordHistoryForForm(EPIDeliveryForm form, User user, String action) {
        StringBuilder itemsSummary = new StringBuilder();
        for (EPIDeliveryFormItem item : form.getItems()) {
            if (itemsSummary.length() > 0) itemsSummary.append(", ");
            itemsSummary.append(item.getQuantity()).append("x ").append(item.getEpiName());
        }

        String historyDetail = String.format(
                "%s | Status: %s | Itens: %s",
                action,
                form.getStatus(),
                itemsSummary.toString()
        );

        recordHistory(
                form.getEmployee().getId(),
                user,
                "FICHA_EPI",
                "Ficha de Entrega de EPI",
                historyDetail,
                form.getObservations()
        );
    }

    /**
     * Após aprovação da requisição de almoxarifado (baixa no estoque): cria ficha de EPI em rascunho com todos os itens
     * elegíveis (EPI, uniformes, calçados), vinculada ao ID da requisição.
     */
    @Transactional
    public void ensureDraftEpiFormFromApprovedStockRequisition(StockRequisition r, UUID actingUserId) {
        List<StockRequisitionLine> eligibleLines = r.getLines().stream()
                .filter(line -> line.getStockItem() != null && isStockItemEligibleForEpiFicha(line.getStockItem()))
                .collect(Collectors.toList());

        Optional<EPIDeliveryForm> existingOpt = epiDeliveryFormRepository.findFirstByStockRequisitionIdOrderByCreatedAtDesc(r.getId());

        if (eligibleLines.isEmpty()) {
            existingOpt.ifPresent(f -> {
                epiDeliveryFormRepository.delete(f);
                log.info("Removida ficha EPI vinculada à requisição {} — sem itens elegíveis para ficha.", r.getRequisitionNumber());
            });
            return;
        }

        existingOpt.ifPresent(epiDeliveryFormRepository::delete);

        Employee emp = r.getEmployee();
        UUID companyId = emp.getCompany() != null ? emp.getCompany().getId() : null;
        if (companyId == null) {
            log.warn("Funcionário {} sem empresa vinculada; ficha EPI a partir da requisição {} não criada.",
                    emp.getId(), r.getRequisitionNumber());
            return;
        }

        CreateEPIDeliveryFormDTO dto = new CreateEPIDeliveryFormDTO();
        dto.setEmployeeId(emp.getId());
        dto.setCompanyId(companyId);
        dto.setDeliveryDate(LocalDate.now());
        dto.setEmployeeWorkSector(r.getEmployeeWorkSector());
        dto.setDeliveryType(mapMovementReasonToEpiDeliveryType(r.getMovementReason()));
        String baseObs = "Gerado pela requisição de almoxarifado " + r.getRequisitionNumber();
        if (r.getNotes() != null && !r.getNotes().isBlank()) {
            baseObs = baseObs + ". Obs. requisição: " + r.getNotes();
        }
        dto.setObservations(baseObs);
        dto.setStockRequisitionId(r.getId());
        dto.setStatus(EPIDeliveryFormStatus.DRAFT);

        List<EPIDeliveryFormItemDTO> items = eligibleLines.stream().map(line -> {
            StockItem si = line.getStockItem();
            EPIDeliveryFormItemDTO i = new EPIDeliveryFormItemDTO();
            i.setEpiName(si.getFullName());
            i.setQuantity(line.getQuantity());
            i.setStockItemId(si.getId());
            return i;
        }).collect(Collectors.toList());
        dto.setItems(items);

        create(dto, actingUserId);
        log.info("Ficha EPI (rascunho) criada para requisição {} com {} item(ns) elegíveis.", r.getRequisitionNumber(), items.size());
    }

    /**
     * Na confirmação de entrega (assinatura), conclui a ficha de EPI vinculada à mesma requisição, sem nova baixa de estoque.
     */
    @Transactional
    public void completeLinkedEpiFormAfterStockRequisitionDelivery(StockRequisition r,
                                                                   DeliverStockRequisitionRequest req,
                                                                   UUID delivererUserId) {
        Optional<EPIDeliveryForm> opt = epiDeliveryFormRepository.findFirstByStockRequisitionIdOrderByCreatedAtDesc(r.getId());
        if (opt.isEmpty()) {
            return;
        }
        EPIDeliveryForm form = opt.get();
        LocalDate deliveryDay = r.getDeliveredAt() != null ? r.getDeliveredAt().toLocalDate() : LocalDate.now();
        form.setDeliveryDate(deliveryDay);
        form.setStatus(EPIDeliveryFormStatus.COMPLETED);

        if (req.getSignatureType() == StockMovement.SignatureType.DIGITAL) {
            form.setSignatureBase64(req.getDigitalSignature());
            form.setSignatureType("ON_SCREEN");
        } else {
            form.setSignatureBase64(null);
            form.setSignatureType("PHYSICAL");
            String ack = req.getPhysicalAcknowledgment();
            if (ack != null && !ack.isBlank()) {
                String obs = form.getObservations() != null ? form.getObservations() : "";
                form.setObservations(obs + (obs.isBlank() ? "" : "\n") + "Recebimento físico: " + ack);
            }
        }

        epiDeliveryFormRepository.save(form);
        User deliverer = delivererUserId != null ? userRepository.findById(delivererUserId).orElse(null) : null;
        recordHistoryForForm(form, deliverer, "CONCLUSÃO_PÓS_REQUISIÇÃO_ALMOXARIFADO");
        log.info("Ficha EPI {} concluída após entrega da requisição {}", form.getId(), r.getRequisitionNumber());
    }

    private static boolean isStockItemEligibleForEpiFicha(StockItem item) {
        if (item.getCategory() == null) {
            return false;
        }
        StockCategory c = item.getCategory();
        if (c == StockCategory.EPI || c == StockCategory.CALCADOS) {
            return true;
        }
        return c.name().startsWith("UNIFORME");
    }

    private static EPIDeliveryType mapMovementReasonToEpiDeliveryType(MovementReason reason) {
        if (reason == null) {
            return EPIDeliveryType.PRIMEIRA_ENTREGA;
        }
        return switch (reason) {
            case REPOSICAO -> EPIDeliveryType.SUBSTITUICAO;
            case TROCA -> EPIDeliveryType.TROCA;
            case DEVOLUCAO -> EPIDeliveryType.DEVOLUCAO;
            default -> EPIDeliveryType.PRIMEIRA_ENTREGA;
        };
    }

    @Transactional(readOnly = true)
    public EPIDeliveryFormDTO findById(UUID id) {
        EPIDeliveryForm form = epiDeliveryFormRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + id));
        return EPIDeliveryFormDTO.fromEntity(form);
    }

    @Transactional(readOnly = true)
    public EPIDeliveryForm findByIdEntity(UUID id) {
        return epiDeliveryFormRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + id));
    }

    @Transactional(readOnly = true)
    public Page<EPIDeliveryFormDTO> findAll(Pageable pageable) {
        return epiDeliveryFormRepository.findAll(pageable)
                .map(EPIDeliveryFormDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<EPIDeliveryFormDTO> findByFilters(UUID employeeId, UUID companyId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Specification<EPIDeliveryForm> spec = (root, query, cb) -> {
            // Fetch joins para evitar LazyInitializationException (apenas associações single-valued;
            // items é collection - fetch com paginação causa HHH000104)
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("employee", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("company", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("responsibleEmployee", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("createdBy", jakarta.persistence.criteria.JoinType.LEFT);
            }
            List<Predicate> predicates = new ArrayList<>();
            if (employeeId != null) {
                predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
            }
            if (companyId != null) {
                predicates.add(cb.equal(root.get("company").get("id"), companyId));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("deliveryDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("deliveryDate"), endDate));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return epiDeliveryFormRepository.findAll(spec, pageable).map(EPIDeliveryFormDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<EPIDeliveryFormDTO> findByEmployeeId(UUID employeeId) {
        return epiDeliveryFormRepository.findByEmployeeId(employeeId).stream()
                .map(EPIDeliveryFormDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EPIDeliveryFormDTO> findByCompanyId(UUID companyId) {
        return epiDeliveryFormRepository.findByCompanyId(companyId).stream()
                .map(EPIDeliveryFormDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(UUID id) {
        EPIDeliveryForm form = epiDeliveryFormRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + id));
        
        // Devolver itens ao estoque via cancelamento de requisição
        cancelStockRequisition(form, null);
        
        epiDeliveryFormRepository.deleteById(id);
        log.info("🗑️ Ficha de entrega de EPI deletada: {}", id);
    }

    /**
     * Resolve um EPI pelo nome, usando cache para evitar buscas duplicadas no mesmo transaction.
     * Prioriza match exato e ativo, depois qualquer ativo que contenha o nome.
     */
    private PersonalProtectiveEquipment resolveEpi(String epiName, Map<UUID, PersonalProtectiveEquipment> cache) {
        // Verificar se já temos no cache pelo nome
        for (PersonalProtectiveEquipment cached : cache.values()) {
            if (cached.getName().equalsIgnoreCase(epiName)) {
                return cached;
            }
        }

        List<PersonalProtectiveEquipment> epis = epiRepository.findByNameContainingIgnoreCase(epiName);
        PersonalProtectiveEquipment epi = null;

        // Tentar encontrar EPI exato primeiro
        for (PersonalProtectiveEquipment e : epis) {
            if (e.getName().equalsIgnoreCase(epiName) && e.getIsActive()) {
                epi = e;
                break;
            }
        }

        // Se não encontrou exato, pegar o primeiro ativo
        if (epi == null && !epis.isEmpty()) {
            epi = epis.stream()
                    .filter(e -> e.getIsActive())
                    .findFirst()
                    .orElse(null);
        }

        if (epi != null) {
            cache.put(epi.getId(), epi);
        }
        return epi;
    }

    /**
     * Captura um snapshot do setor/posto/cargo do funcionário no momento da entrega.
     */
    private static String buildWorkSectorSnapshot(Employee employee) {
        if (employee == null) return null;
        List<String> parts = new ArrayList<>();
        if (employee.getDepartment() != null && employee.getDepartment().getName() != null
                && !employee.getDepartment().getName().isBlank()) {
            parts.add("Setor: " + employee.getDepartment().getName());
        }
        if (employee.getWorkPost() != null && employee.getWorkPost().getName() != null
                && !employee.getWorkPost().getName().isBlank()) {
            parts.add("Posto: " + employee.getWorkPost().getName());
        }
        if (employee.getPosition() != null && employee.getPosition().getName() != null
                && !employee.getPosition().getName().isBlank()) {
            parts.add("Cargo: " + employee.getPosition().getName());
        }
        // Fallback: unit
        if (parts.isEmpty() && employee.getUnit() != null && employee.getUnit().getName() != null
                && !employee.getUnit().getName().isBlank()) {
            parts.add("Unidade: " + employee.getUnit().getName());
        }
        return parts.isEmpty() ? null : String.join(" | ", parts);
    }

    /**
     * Registra um evento no histórico de alterações do funcionário.
     */
    private void recordHistory(UUID employeeId, User changedBy, String fieldName, String fieldLabel,
                               String newValue, String reason) {
        try {
            EmployeeChangeHistory history = EmployeeChangeHistory.builder()
                    .employeeId(employeeId)
                    .changedAt(Instant.now())
                    .changedByUser(changedBy)
                    .category(EmployeeChangeCategory.OUTROS)
                    .fieldName(fieldName)
                    .fieldLabel(fieldLabel)
                    .newValue(newValue)
                    .reason(reason)
                    .build();
            employeeChangeHistoryRepository.save(history);
        } catch (Exception e) {
            log.warn("⚠️ Não foi possível registrar histórico de EPI para funcionário {}: {}", employeeId, e.getMessage());
        }
    }
}
