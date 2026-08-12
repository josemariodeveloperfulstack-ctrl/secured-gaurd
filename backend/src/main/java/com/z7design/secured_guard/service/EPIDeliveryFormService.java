package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.DeliverStockRequisitionRequest;
import com.z7design.secured_guard.dto.EPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormItemDTO;
import com.z7design.secured_guard.dto.EpiConfirmationSendResponseDTO;
import com.z7design.secured_guard.dto.PublicEpiConfirmationDTO;
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
import com.z7design.secured_guard.model.enums.EmploymentStatus;
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
import com.z7design.secured_guard.service.whatsapp.WhatsAppAgentService;
import com.z7design.secured_guard.service.whatsapp.WhatsAppPhoneUtil;
import com.z7design.secured_guard.exception.BusinessException;

import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    private static final String SIGNATURE_WHATSAPP = "WHATSAPP_CONFIRM";
    private static final int CONFIRMATION_TTL_HOURS = 48;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EPIDeliveryFormRepository epiDeliveryFormRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PersonalProtectiveEquipmentRepository epiRepository;
    private final EmployeeChangeHistoryRepository employeeChangeHistoryRepository;
    private final StockItemRepository stockItemRepository;
    private final StockRequisitionRepository stockRequisitionRepository;
    private final StockMovementRepository stockMovementRepository;
    private final WhatsAppAgentService whatsAppAgentService;

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

        User createdBy = null;
        if (createdByUserId != null) {
            createdBy = userRepository.findById(createdByUserId).orElse(null);
        }

        Employee responsibleEmployee = resolveResponsibleEmployee(dto.getResponsibleEmployeeId(), createdBy);

        String workSectorSnapshot = dto.getEmployeeWorkSector() != null ? dto.getEmployeeWorkSector() : buildWorkSectorSnapshot(employee);
        EPIDeliveryType deliveryType = dto.getDeliveryType() != null ? dto.getDeliveryType() : EPIDeliveryType.PRIMEIRA_ENTREGA;
        EPIDeliveryFormStatus status = dto.getStatus() != null 
                ? dto.getStatus() 
                : EPIDeliveryFormStatus.DRAFT;
        String signatureType = dto.getSignatureType() != null ? dto.getSignatureType() : "ON_SCREEN";
        assertWhatsAppNotCompletedWithoutConfirm(status, signatureType, null);

        LocalDate resolvedDeliveryDate = resolveDeliveryDate(
                employee.getId(), null, deliveryType, dto.getDeliveryDate(), employee.getHireDate());

        EPIDeliveryForm form = EPIDeliveryForm.builder()

                .employee(employee)
                .company(company)
                .deliveryDate(resolvedDeliveryDate)
                .responsibleEmployee(responsibleEmployee)
                .deliveryType(deliveryType)
                .employeeWorkSector(workSectorSnapshot)
                .observations(dto.getObservations())
                .pdfUrl(dto.getPdfUrl())
                .createdBy(createdBy)
                .signatureBase64(dto.getSignatureBase64())
                .signatureType(signatureType)
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
                        .sizeNumber(resolveSizeNumber(itemDto.getSizeNumber(), itemDto.getStockItemId(), itemDto.getEpiName()))
                        .substitutedDate(itemDto.getSubstitutedDate())
                        .replacementReason(itemDto.getReplacementReason())
                        .build();
                form.getItems().add(item);
            }
        }

        EPIDeliveryForm savedForm = epiDeliveryFormRepository.save(form);
        
        // Concluir ficha: gera REQ-EPI e baixa estoque de todos os itens (exceto se já veio do almoxarifado)
        if (savedForm.getStatus() == EPIDeliveryFormStatus.COMPLETED) {
            applyStockDeductionIfNeeded(savedForm, createdByUserId);
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
        User updatedBy = updatedByUserId != null ? userRepository.findById(updatedByUserId).orElse(null) : null;
        if (dto.getResponsibleEmployeeId() != null || form.getResponsibleEmployee() == null) {
            Employee resp = resolveResponsibleEmployee(dto.getResponsibleEmployeeId(), updatedBy);
            if (resp != null) {
                form.setResponsibleEmployee(resp);
            }
        }

        EPIDeliveryType nextDeliveryType = dto.getDeliveryType() != null ? dto.getDeliveryType() : form.getDeliveryType();
        form.setDeliveryDate(resolveDeliveryDate(
                form.getEmployee().getId(),
                form.getId(),
                nextDeliveryType,
                dto.getDeliveryDate(),
                form.getEmployee().getHireDate()));
        form.setObservations(dto.getObservations());
        form.setDeliveryType(nextDeliveryType);
        form.setSignatureBase64(dto.getSignatureBase64());
        String nextSignatureType = dto.getSignatureType() != null ? dto.getSignatureType() : form.getSignatureType();
        form.setSignatureType(nextSignatureType);
        form.setEmployeeWorkSector(dto.getEmployeeWorkSector() != null ? dto.getEmployeeWorkSector() : form.getEmployeeWorkSector());
        EPIDeliveryFormStatus nextStatus = dto.getStatus() != null ? dto.getStatus() : form.getStatus();
        assertWhatsAppNotCompletedWithoutConfirm(nextStatus, nextSignatureType, form);
        form.setStatus(nextStatus);

        // Atualizar itens (remover antigos e adicionar novos para simplificar)
        Map<UUID, EPIDeliveryFormItem> existingItemsById = new HashMap<>();
        for (EPIDeliveryFormItem oldItem : form.getItems()) {
            if (oldItem.getId() != null) {
                existingItemsById.put(oldItem.getId(), oldItem);
            }
        }
        form.getItems().clear();
        if (dto.getItems() != null) {
            for (EPIDeliveryFormItemDTO itemDto : dto.getItems()) {
                EPIDeliveryFormItem existing = itemDto.getId() != null ? existingItemsById.get(itemDto.getId()) : null;
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
                        .sizeNumber(resolveSizeNumber(itemDto.getSizeNumber(), itemDto.getStockItemId(), itemDto.getEpiName()))
                        .substitutedDate(itemDto.getSubstitutedDate())
                        .replacementReason(itemDto.getReplacementReason())
                        .build();
                if (existing != null) {
                    item.setConfirmationToken(existing.getConfirmationToken());
                    item.setConfirmationCode(existing.getConfirmationCode());
                    item.setConfirmationExpiresAt(existing.getConfirmationExpiresAt());
                    item.setConfirmationSentAt(existing.getConfirmationSentAt());
                    item.setConfirmedAt(existing.getConfirmedAt());
                    item.setSignatureBase64(existing.getSignatureBase64());
                }
                form.getItems().add(item);
            }
        }

        EPIDeliveryForm savedForm = epiDeliveryFormRepository.save(form);
        
        if (savedForm.getStatus() == EPIDeliveryFormStatus.COMPLETED) {
            applyStockDeductionIfNeeded(savedForm, updatedByUserId);
        } else if (wasCompleted) {
            if (isEpiGeneratedRequisition(savedForm.getStockRequisitionId())) {
                cancelStockRequisition(savedForm, updatedByUserId);
            } else if (savedForm.getStockRequisitionId() != null) {
                log.warn("Ficha EPI {} deixou de estar concluída mas está vinculada à requisição {}; estorno automático de estoque não aplicado.",
                        savedForm.getId(), savedForm.getStockRequisitionId());
            }
        }


        recordHistoryForForm(savedForm, updatedBy, "ATUALIZAÇÃO");

        return EPIDeliveryFormDTO.fromEntity(savedForm);
    }

    /**
     * Resolve o responsável pela entrega: ID informado, senão funcionário vinculado ao usuário logado (userId/CPF).
     */
    private Employee resolveResponsibleEmployee(UUID responsibleEmployeeId, User actingUser) {
        if (responsibleEmployeeId != null) {
            return employeeRepository.findById(responsibleEmployeeId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Funcionário responsável não encontrado com id: " + responsibleEmployeeId));
        }
        if (actingUser == null || actingUser.getId() == null) {
            return null;
        }
        Optional<Employee> byUser = employeeRepository.findByUserId(actingUser.getId());
        if (byUser.isPresent()) {
            return byUser.get();
        }
        if (actingUser.getCpf() != null && !actingUser.getCpf().isBlank()) {
            String cpf = actingUser.getCpf().replaceAll("\\D", "");
            if (!cpf.isBlank()) {
                Optional<Employee> byCpf = employeeRepository.findByCpf(cpf);
                if (byCpf.isPresent()) {
                    return byCpf.get();
                }
                byCpf = employeeRepository.findByDocument(cpf);
                if (byCpf.isPresent()) {
                    return byCpf.get();
                }
            }
        }
        return null;
    }

    /**
     * Aplica baixa de estoque para ficha concluída.
     * Fichas geradas pelo almoxarifado (requisição que não é REQ-EPI-*) já tiveram baixa na aprovação.
     * Fichas criadas/alteradas pela própria tela de EPI sempre sincronizam (cancela REQ-EPI antiga e recria).
     */
    private void applyStockDeductionIfNeeded(EPIDeliveryForm form, UUID userId) {
        UUID reqId = form.getStockRequisitionId();
        if (reqId != null && !isEpiGeneratedRequisition(reqId)) {
            log.debug("Ficha EPI {} concluída com vínculo a requisição de almoxarifado {}; baixa já tratada fora da ficha.",
                    form.getId(), reqId);
            return;
        }
        syncWithStockRequisition(form, userId);
    }

    private boolean isEpiGeneratedRequisition(UUID stockRequisitionId) {
        if (stockRequisitionId == null) {
            return false;
        }
        StockRequisition req = stockRequisitionRepository.findById(stockRequisitionId).orElse(null);
        return req != null
                && req.getRequisitionNumber() != null
                && req.getRequisitionNumber().startsWith("REQ-EPI-");
    }

    private void validateAllItemsLinkedToStock(EPIDeliveryForm form) {
        if (form.getItems() == null || form.getItems().isEmpty()) {
            throw new IllegalArgumentException(
                    "Ficha concluída deve ter ao menos um item vinculado ao estoque para gerar a baixa.");
        }
        List<String> missing = new ArrayList<>();
        for (EPIDeliveryFormItem item : form.getItems()) {
            String label = item.getEpiName() != null && !item.getEpiName().isBlank()
                    ? item.getEpiName()
                    : "Item sem nome";
            if (item.getStockItemId() == null) {
                missing.add(label);
                continue;
            }
            if (!stockItemRepository.existsById(item.getStockItemId())) {
                missing.add(label + " (item de estoque inexistente)");
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException(
                    "Todos os itens da ficha concluída devem estar vinculados ao estoque para dar baixa. "
                            + "Sem vínculo: " + String.join(", ", missing));
        }
    }

    private void syncWithStockRequisition(EPIDeliveryForm form, UUID userId) {
        log.info("📦 Sincronizando ficha EPI {} com requisição de estoque (baixa de todos os itens)", form.getId());

        validateAllItemsLinkedToStock(form);

        // Se já existe uma REQ-EPI, cancelar movimentações e gerar nova (reflete alterações na lista)
        if (form.getStockRequisitionId() != null) {
            cancelStockRequisition(form, userId);
        }

        User actingUser = null;
        if (userId != null) {
            actingUser = userRepository.findById(userId).orElse(null);
        }
        if (actingUser == null) {
            throw new IllegalArgumentException(
                    "Usuário responsável pela baixa de estoque não identificado. Faça login novamente e tente gerar a ficha.");
        }

        StockRequisition requisition = StockRequisition.builder()
                .requisitionNumber("REQ-EPI-" + form.getId().toString().substring(0, 8).toUpperCase())
                .employee(form.getEmployee())
                .requestedByUser(actingUser)
                .movementReason(form.getDeliveryType() == EPIDeliveryType.PRIMEIRA_ENTREGA ?
                        MovementReason.ENTREGA_INICIAL :
                        MovementReason.REPOSICAO)
                .notes("Gerado automaticamente pela Ficha de EPI: " + form.getId())
                .employeeWorkSector(form.getEmployeeWorkSector())
                .status(StockRequisitionStatus.DELIVERED)
                .deliveredAt(LocalDateTime.now())
                .deliveredByUser(actingUser)
                .signatureType(StockMovement.SignatureType.DIGITAL)
                .digitalSignature(form.getSignatureBase64())
                .signatureAt(LocalDateTime.now())
                .build();

        for (EPIDeliveryFormItem item : form.getItems()) {
            if (item.getStockItemId() == null) {
                throw new IllegalArgumentException(
                        "Item sem vínculo de estoque: " + (item.getEpiName() != null ? item.getEpiName() : "sem nome"));
            }
            StockItem stockItem = stockItemRepository.findById(item.getStockItemId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Item de estoque não encontrado para: " + item.getEpiName()));

            int qty = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;

            StockRequisitionLine line = StockRequisitionLine.builder()
                    .stockItem(stockItem)
                    .quantity(qty)
                    .build();
            requisition.addLine(line);

            com.z7design.secured_guard.dto.StockMovementDTO movDto = new com.z7design.secured_guard.dto.StockMovementDTO();
            movDto.setStockItemId(stockItem.getId());
            movDto.setMovementType(MovementType.SAIDA);
            movDto.setReason(requisition.getMovementReason());
            movDto.setQuantity(qty);
            movDto.setEmployeeId(form.getEmployee().getId());
            movDto.setRequisitionNumber(requisition.getRequisitionNumber());
            movDto.setNotes("Baixa automática via Ficha de EPI");
            movDto.setSkipEpiDeliveryFormAutoRecord(true);
            movDto.setDigitalSignature(form.getSignatureBase64());
            movDto.setSignatureType(StockMovement.SignatureType.DIGITAL);
            movDto.setSignatureDate(LocalDateTime.now());

            stockService.createMovement(movDto, userId);
            log.info("📉 Baixa de estoque: {} x {} (ficha EPI {})", qty, stockItem.getFullName(), form.getId());
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

        UUID effectiveUserId = null;
        if (!movements.isEmpty()) {
            effectiveUserId = userId;
            if (effectiveUserId == null && form.getCreatedBy() != null) {
                effectiveUserId = form.getCreatedBy().getId();
            }
            if (effectiveUserId == null && movements.get(0).getUser() != null) {
                effectiveUserId = movements.get(0).getUser().getId();
            }
            if (effectiveUserId == null) {
                throw new IllegalArgumentException(
                        "Não foi possível identificar o usuário para registrar o estorno de estoque ao excluir a ficha EPI. "
                                + "Faça login novamente ou associe um criador à ficha.");
            }
        }

        for (StockMovement m : movements) {
            if (m.getStockItem() == null || m.getStockItem().getId() == null) {
                log.warn("Movimento {} sem item de estoque; estorno ignorado.", m.getId());
                continue;
            }
            // Criar entrada compensatória para devolver ao estoque
            com.z7design.secured_guard.dto.StockMovementDTO storno = new com.z7design.secured_guard.dto.StockMovementDTO();
            storno.setStockItemId(m.getStockItem().getId());
            storno.setMovementType(MovementType.ENTRADA);
            storno.setReason(MovementReason.AJUSTE_ENTRADA);
            storno.setQuantity(m.getQuantity());
            storno.setNotes("Estorno automático por alteração na Ficha de EPI: " + form.getId());
            stockService.createMovement(storno, effectiveUserId);
            
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
    public void delete(UUID id, UUID actingUserId) {
        EPIDeliveryForm form = epiDeliveryFormRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + id));
        
        // Devolver itens ao estoque via cancelamento de requisição (exige usuário para movimentação)
        cancelStockRequisition(form, actingUserId);
        
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
     * Gera token + código e envia (AUTO) ou monta link wa.me (MANUAL) para confirmação de recebimento.
     * Na primeira entrega (e funcionários não ativos) a confirmação é única por ficha.
     * Nas demais entregas com funcionário ativo no sistema, cada item recebe código e link próprios.
     */
    @Transactional
    public EpiConfirmationSendResponseDTO sendWhatsAppConfirmation(UUID formId, String mode, String frontendBaseUrl) {
        EPIDeliveryForm form = epiDeliveryFormRepository.findByIdWithDetails(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + formId));

        if (form.getStatus() == EPIDeliveryFormStatus.COMPLETED) {
            throw new BusinessException("Esta ficha já está concluída.");
        }
        if (form.getItems() == null || form.getItems().isEmpty()) {
            throw new BusinessException("Adicione pelo menos um EPI antes de enviar a confirmação.");
        }

        Employee employee = form.getEmployee();
        if (employee == null) {
            throw new BusinessException("Funcionário não encontrado na ficha.");
        }
        String phone = employee.getPhone();
        if (phone == null || phone.isBlank()) {
            throw new BusinessException("Funcionário sem telefone cadastrado. Atualize o cadastro para enviar pelo WhatsApp.");
        }

        String normalizedPhone = WhatsAppPhoneUtil.normalize(phone);
        if (normalizedPhone.length() < 12) {
            throw new BusinessException("Telefone do funcionário inválido para WhatsApp: " + phone);
        }

        String resolvedMode = mode != null && mode.equalsIgnoreCase("MANUAL") ? "MANUAL" : "AUTO";
        String baseUrl = sanitizeFrontendBaseUrl(frontendBaseUrl);

        if (isPerItemMode(form)) {
            return sendPerItemConfirmations(form, employee, normalizedPhone, resolvedMode, baseUrl);
        }

        UUID token = UUID.randomUUID();
        String code = generateSixDigitCode();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(CONFIRMATION_TTL_HOURS);

        form.setConfirmationToken(token);
        form.setConfirmationCode(code);
        form.setConfirmationExpiresAt(expiresAt);
        form.setConfirmationSentAt(LocalDateTime.now());
        form.setSignatureType(SIGNATURE_WHATSAPP);
        form.setStatus(EPIDeliveryFormStatus.DRAFT);
        form.setSignedAt(null);
        form.setSignatureOrigin(null);
        epiDeliveryFormRepository.save(form);

        String confirmUrl = baseUrl + "/epi-confirm/" + token;
        String messageBody = buildWhatsAppMessage(employee.getName(), form.getDeliveryDate(), code, confirmUrl);
        String whatsappUrl = "https://wa.me/" + normalizedPhone + "?text="
                + URLEncoder.encode(messageBody, StandardCharsets.UTF_8);

        boolean sent = false;
        if ("AUTO".equals(resolvedMode)) {
            sent = whatsAppAgentService.sendTextMessage(normalizedPhone, messageBody);
            if (!sent) {
                log.warn("Falha no envio automático WhatsApp da ficha EPI {}. Link wa.me disponível para envio manual.", formId);
            }
        }

        String msg = "AUTO".equals(resolvedMode)
                ? (sent ? "Mensagem enviada pelo WhatsApp." : "Não foi possível enviar automaticamente. Use o link manual.")
                : "Link WhatsApp gerado. Abra e envie manualmente.";

        return EpiConfirmationSendResponseDTO.builder()
                .formId(form.getId())
                .confirmationToken(token)
                .confirmationCode(code)
                .confirmUrl(confirmUrl)
                .whatsappUrl(whatsappUrl)
                .phoneMasked(maskPhone(normalizedPhone))
                .sent(sent)
                .mode(resolvedMode)
                .expiresAt(expiresAt)
                .message(msg)
                .build();
    }

    /**
     * Modo por item: entregas que não sejam a primeira, enquanto o funcionário estiver ativo no sistema.
     */
    private boolean isPerItemMode(EPIDeliveryForm form) {
        if (form.getDeliveryType() == null || form.getDeliveryType() == EPIDeliveryType.PRIMEIRA_ENTREGA) {
            return false;
        }
        Employee employee = form.getEmployee();
        return employee != null && employee.getStatus() == EmploymentStatus.ACTIVE;
    }

    /**
     * Gera código e link de confirmação individuais para cada item da ficha.
     */
    private EpiConfirmationSendResponseDTO sendPerItemConfirmations(
            EPIDeliveryForm form, Employee employee, String normalizedPhone, String resolvedMode, String baseUrl) {
        LocalDateTime sentAt = LocalDateTime.now();
        String dateStr = form.getDeliveryDate() != null
                ? form.getDeliveryDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "-";
        String firstName = employee.getName() != null && !employee.getName().isBlank()
                ? employee.getName().trim().split("\\s+")[0]
                : "colaborador";

        List<EpiConfirmationSendResponseDTO.ItemConfirmation> confirmations = new ArrayList<>();
        UUID firstToken = null;
        StringBuilder message = new StringBuilder();
        message.append("Olá ").append(firstName).append("!\n\n");
        message.append("Confirme o recebimento de cada EPI entregue em ").append(dateStr).append(".\n\n");

        boolean hasPendingItem = false;
        for (EPIDeliveryFormItem item : form.getItems()) {
            if (item.getConfirmedAt() != null) {
                continue;
            }
            hasPendingItem = true;
            UUID token = UUID.randomUUID();
            String code = generateSixDigitCode();
            LocalDateTime expiresAt = sentAt.plusHours(CONFIRMATION_TTL_HOURS);
            item.setConfirmationToken(token);
            item.setConfirmationCode(code);
            item.setConfirmationExpiresAt(expiresAt);
            item.setConfirmationSentAt(sentAt);
            item.setConfirmedAt(null);
            if (firstToken == null) {
                firstToken = token;
            }

            String url = baseUrl + "/epi-confirm/" + token;
            confirmations.add(EpiConfirmationSendResponseDTO.ItemConfirmation.builder()
                    .itemId(item.getId())
                    .epiName(item.getEpiName())
                    .confirmationCode(code)
                    .confirmUrl(url)
                    .expiresAt(expiresAt)
                    .confirmed(false)
                    .build());

            message.append("• ").append(item.getEpiName() != null && !item.getEpiName().isBlank()
                    ? item.getEpiName().toUpperCase() : "EPI");
            if (item.getCa() != null && !item.getCa().isBlank()) {
                message.append(" (CA ").append(item.getCa()).append(")");
            }
            message.append("\n    Código: *").append(code).append("*\n    Link: ").append(url).append("\n\n");
        }
        message.append("Validade: ").append(CONFIRMATION_TTL_HOURS).append("h.");

        if (!hasPendingItem || confirmations.isEmpty()) {
            throw new BusinessException("Todos os itens desta ficha já foram confirmados.");
        }

        form.setConfirmationToken(null);
        form.setConfirmationCode(null);
        form.setConfirmationExpiresAt(null);
        form.setConfirmationSentAt(sentAt);
        form.setSignatureType(SIGNATURE_WHATSAPP);
        form.setStatus(EPIDeliveryFormStatus.DRAFT);
        form.setSignedAt(null);
        form.setSignatureOrigin(null);
        epiDeliveryFormRepository.save(form);

        String messageBody = message.toString();
        String whatsappUrl = "https://wa.me/" + normalizedPhone + "?text="
                + URLEncoder.encode(messageBody, StandardCharsets.UTF_8);

        boolean sent = false;
        if ("AUTO".equals(resolvedMode)) {
            sent = whatsAppAgentService.sendTextMessage(normalizedPhone, messageBody);
            if (!sent) {
                log.warn("Falha no envio automático WhatsApp por item da ficha EPI {}. Link wa.me disponível.", form.getId());
            }
        }

        EpiConfirmationSendResponseDTO.ItemConfirmation first =
                confirmations.isEmpty() ? null : confirmations.get(0);
        String msg = "AUTO".equals(resolvedMode)
                ? (sent ? "Mensagem enviada pelo WhatsApp." : "Não foi possível enviar automaticamente. Use o link manual.")
                : "Link WhatsApp gerado. Abra e envie manualmente.";

        return EpiConfirmationSendResponseDTO.builder()
                .formId(form.getId())
                .confirmationToken(firstToken)
                .confirmationCode(first != null ? first.getConfirmationCode() : null)
                .confirmUrl(first != null ? first.getConfirmUrl() : null)
                .whatsappUrl(whatsappUrl)
                .phoneMasked(maskPhone(normalizedPhone))
                .sent(sent)
                .mode(resolvedMode)
                .expiresAt(first != null ? first.getExpiresAt() : sentAt.plusHours(CONFIRMATION_TTL_HOURS))
                .message(msg)
                .items(confirmations)
                .build();
    }

    @Transactional(readOnly = true)
    public PublicEpiConfirmationDTO getPublicConfirmation(UUID token) {
        Optional<EPIDeliveryForm> byForm = epiDeliveryFormRepository.findByConfirmationTokenWithDetails(token);
        if (byForm.isPresent()) {
            return buildFormPublicConfirmation(byForm.get());
        }
        EPIDeliveryForm form = epiDeliveryFormRepository.findByItemsConfirmationTokenWithDetails(token)
                .orElseThrow(() -> new ResourceNotFoundException("Link de confirmação inválido ou expirado."));
        EPIDeliveryFormItem item = findItemByToken(form, token);
        if (item == null) {
            throw new ResourceNotFoundException("Link de confirmação inválido ou expirado.");
        }
        return buildItemPublicConfirmation(form, item);
    }

    private PublicEpiConfirmationDTO buildFormPublicConfirmation(EPIDeliveryForm form) {
        boolean alreadyConfirmed = form.getStatus() == EPIDeliveryFormStatus.COMPLETED || form.getSignedAt() != null;
        boolean expired = !alreadyConfirmed
                && form.getConfirmationExpiresAt() != null
                && form.getConfirmationExpiresAt().isBefore(LocalDateTime.now());

        List<PublicEpiConfirmationDTO.Item> items = form.getItems() == null ? List.of()
                : form.getItems().stream()
                .map(i -> PublicEpiConfirmationDTO.Item.builder()
                        .id(i.getId())
                        .epiName(i.getEpiName())
                        .quantity(i.getQuantity())
                        .ca(i.getCa())
                        .caName(i.getCaName())
                        .confirmed(i.getConfirmedAt() != null)
                        .build())
                .collect(Collectors.toList());

        return PublicEpiConfirmationDTO.builder()
                .employeeName(form.getEmployee() != null ? form.getEmployee().getName() : null)
                .companyName(form.getCompany() != null ? form.getCompany().getName() : null)
                .deliveryDate(form.getDeliveryDate())
                .deliveryType(form.getDeliveryType() != null ? form.getDeliveryType().name() : null)
                .items(items)
                .alreadyConfirmed(alreadyConfirmed)
                .expired(expired)
                .awaitingConfirmation(!alreadyConfirmed && !expired)
                .build();
    }

    private PublicEpiConfirmationDTO buildItemPublicConfirmation(EPIDeliveryForm form, EPIDeliveryFormItem item) {
        boolean alreadyConfirmed = item.getConfirmedAt() != null;
        boolean expired = !alreadyConfirmed
                && item.getConfirmationExpiresAt() != null
                && item.getConfirmationExpiresAt().isBefore(LocalDateTime.now());

        return PublicEpiConfirmationDTO.builder()
                .employeeName(form.getEmployee() != null ? form.getEmployee().getName() : null)
                .companyName(form.getCompany() != null ? form.getCompany().getName() : null)
                .deliveryDate(form.getDeliveryDate())
                .deliveryType(form.getDeliveryType() != null ? form.getDeliveryType().name() : null)
                .perItem(true)
                .itemId(item.getId())
                .items(List.of(PublicEpiConfirmationDTO.Item.builder()
                        .id(item.getId())
                        .epiName(item.getEpiName())
                        .quantity(item.getQuantity())
                        .ca(item.getCa())
                        .caName(item.getCaName())
                        .confirmed(alreadyConfirmed)
                        .build()))
                .alreadyConfirmed(alreadyConfirmed)
                .expired(expired)
                .awaitingConfirmation(!alreadyConfirmed && !expired)
                .build();
    }

    @Transactional
    public PublicEpiConfirmationDTO confirmPublicReceipt(UUID token, String code, String signatureBase64,
                                                         String ip, String userAgent) {
        Optional<EPIDeliveryForm> byForm = epiDeliveryFormRepository.findByConfirmationTokenWithDetails(token);
        if (byForm.isPresent()) {
            applyConfirmation(byForm.get(), code, signatureBase64, "WHATSAPP_LINK", ip, userAgent, null);
            return getPublicConfirmation(token);
        }
        EPIDeliveryForm form = epiDeliveryFormRepository.findByItemsConfirmationTokenWithDetails(token)
                .orElseThrow(() -> new ResourceNotFoundException("Link de confirmação inválido ou expirado."));
        EPIDeliveryFormItem item = findItemByToken(form, token);
        if (item == null) {
            throw new ResourceNotFoundException("Link de confirmação inválido ou expirado.");
        }
        applyItemConfirmation(form, item, code, signatureBase64, "WHATSAPP_LINK", ip, userAgent, null);
        return getPublicConfirmation(token);
    }

    /**
     * Confirmação pelo operador digitando o código informado pelo funcionário.
     * Valida o código da ficha (modo por ficha) ou o código individual do item (modo por item).
     */
    @Transactional
    public EPIDeliveryFormDTO confirmWithCode(UUID formId, String code, UUID actingUserId) {
        EPIDeliveryForm form = epiDeliveryFormRepository.findByIdWithDetails(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + formId));
        if (form.getConfirmationCode() != null && form.getConfirmationExpiresAt() != null) {
            applyConfirmation(form, code, null, "ADMIN_CODE", null, null, actingUserId);
        } else {
            EPIDeliveryFormItem item = findItemByCode(form, normalizeCode(code));
            applyItemConfirmation(form, item, code, null, "ADMIN_CODE", null, null, actingUserId);
        }
        return EPIDeliveryFormDTO.fromEntity(form);
    }

    /**
     * Confirmação pelo próprio funcionário logado no portal.
     * Se a ficha tiver código WhatsApp pendente e o código for informado, valida o código.
     * Caso contrário (sem WhatsApp), confirma direto como recebimento no portal.
     */
    @Transactional
    public EPIDeliveryFormDTO confirmOwnReceipt(UUID formId, UUID authenticatedEmployeeId, String code, UUID actingUserId) {
        EPIDeliveryForm form = epiDeliveryFormRepository.findByIdWithDetails(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + formId));

        if (form.getEmployee() == null || !form.getEmployee().getId().equals(authenticatedEmployeeId)) {
            throw new BusinessException("Você só pode confirmar o recebimento das suas próprias fichas de EPI.");
        }
        if (form.getStatus() == EPIDeliveryFormStatus.COMPLETED || form.getSignedAt() != null) {
            throw new BusinessException("Recebimento já confirmado.");
        }

        boolean hasFormCode = form.getConfirmationCode() != null && form.getConfirmationExpiresAt() != null;
        if (hasFormCode) {
            applyConfirmation(form, code, null, "PORTAL_CODE", null, null, actingUserId);
        } else {
            boolean hasItemCodes = form.getItems() != null && form.getItems().stream()
                    .anyMatch(i -> i.getConfirmationCode() != null && i.getConfirmationExpiresAt() != null);
            if (hasItemCodes) {
                EPIDeliveryFormItem item = findItemByCode(form, normalizeCode(code));
                applyItemConfirmation(form, item, code, null, "PORTAL_CODE", null, null, actingUserId);
            } else {
                form.setStatus(EPIDeliveryFormStatus.COMPLETED);
                form.setSignedAt(LocalDateTime.now());
                form.setSignatureOrigin("PORTAL_SELF");
                form.setSignatureType("ON_SCREEN");
                EPIDeliveryForm saved = epiDeliveryFormRepository.save(form);
                applyStockDeductionIfNeeded(saved, actingUserId);
                User actingUser = actingUserId != null ? userRepository.findById(actingUserId).orElse(null) : null;
                recordHistoryForForm(saved, actingUser, "CONFIRMAÇÃO PORTAL FUNCIONÁRIO");
                log.info("✅ Recebimento EPI confirmado no portal pelo funcionário na ficha {}", form.getId());
                return EPIDeliveryFormDTO.fromEntity(saved);
            }
        }
        return EPIDeliveryFormDTO.fromEntity(form);
    }

    private void applyConfirmation(EPIDeliveryForm form, String code, String signatureBase64,
                                   String origin, String ip, String userAgent, UUID actingUserId) {
        if (form.getStatus() == EPIDeliveryFormStatus.COMPLETED || form.getSignedAt() != null) {
            throw new BusinessException("Recebimento já confirmado.");
        }
        if (form.getConfirmationCode() == null || form.getConfirmationExpiresAt() == null) {
            throw new BusinessException("Nenhuma confirmação WhatsApp foi gerada para esta ficha.");
        }
        if (form.getConfirmationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("O código de confirmação expirou. Gere um novo envio.");
        }
        String normalizedCode = code == null ? "" : code.trim().replaceAll("\\s+", "");
        if (!form.getConfirmationCode().equals(normalizedCode)) {
            throw new BusinessException("Código de confirmação inválido.");
        }

        form.setStatus(EPIDeliveryFormStatus.COMPLETED);
        form.setSignedAt(LocalDateTime.now());
        form.setSignatureOrigin(origin);
        form.setSignatureType(SIGNATURE_WHATSAPP);
        if (signatureBase64 != null && !signatureBase64.isBlank()) {
            form.setSignatureBase64(signatureBase64);
        }
        if (ip != null) {
            form.setAuditIp(ip.length() > 80 ? ip.substring(0, 80) : ip);
        }
        if (userAgent != null) {
            form.setAuditUserAgent(userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent);
        }

        EPIDeliveryForm saved = epiDeliveryFormRepository.save(form);
        applyStockDeductionIfNeeded(saved, actingUserId);

        User actingUser = actingUserId != null ? userRepository.findById(actingUserId).orElse(null) : null;
        recordHistoryForForm(saved, actingUser, "CONFIRMAÇÃO WHATSAPP");
        log.info("✅ Recebimento EPI confirmado via {} na ficha {}", origin, form.getId());
    }

    /**
     * Confirma o recebimento de um item individual (modo por item).
     * Ao confirmar todos os itens, conclui a ficha e aplica a baixa de estoque.
     */
    private void applyItemConfirmation(EPIDeliveryForm form, EPIDeliveryFormItem item, String code,
                                       String signatureBase64, String origin, String ip, String userAgent,
                                       UUID actingUserId) {
        if (item == null) {
            throw new BusinessException("Código de confirmação inválido.");
        }
        if (item.getConfirmedAt() != null) {
            throw new BusinessException("Este item já foi confirmado.");
        }
        if (item.getConfirmationCode() == null || item.getConfirmationExpiresAt() == null) {
            throw new BusinessException("Nenhuma confirmação WhatsApp foi gerada para este item.");
        }
        if (item.getConfirmationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("O código de confirmação expirou. Gere um novo envio.");
        }
        if (!item.getConfirmationCode().equals(normalizeCode(code))) {
            throw new BusinessException("Código de confirmação inválido.");
        }

        item.setConfirmedAt(LocalDateTime.now());
        if (signatureBase64 != null && !signatureBase64.isBlank()) {
            item.setSignatureBase64(signatureBase64);
        }
        if (ip != null) {
            form.setAuditIp(ip.length() > 80 ? ip.substring(0, 80) : ip);
        }
        if (userAgent != null) {
            form.setAuditUserAgent(userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent);
        }

        boolean allConfirmed = form.getItems() != null && form.getItems().stream()
                .allMatch(i -> i.getConfirmedAt() != null);
        User actingUser = actingUserId != null ? userRepository.findById(actingUserId).orElse(null) : null;

        if (allConfirmed) {
            form.setStatus(EPIDeliveryFormStatus.COMPLETED);
            form.setSignedAt(LocalDateTime.now());
            form.setSignatureOrigin(origin);
            form.setSignatureType(SIGNATURE_WHATSAPP);
            EPIDeliveryForm saved = epiDeliveryFormRepository.save(form);
            applyStockDeductionIfNeeded(saved, actingUserId);
            recordHistoryForForm(saved, actingUser, "CONFIRMAÇÃO WHATSAPP");
            log.info("✅ Recebimento EPI confirmado via {} na ficha {} (todos os itens)", origin, form.getId());
        } else {
            epiDeliveryFormRepository.save(form);
            recordHistoryForForm(form, actingUser, "CONFIRMAÇÃO ITEM WHATSAPP");
            log.info("✅ Item de EPI confirmado via {} na ficha {} (parcial)", origin, form.getId());
        }
    }

    private EPIDeliveryFormItem findItemByToken(EPIDeliveryForm form, UUID token) {
        if (form.getItems() == null || token == null) {
            return null;
        }
        return form.getItems().stream()
                .filter(i -> token.equals(i.getConfirmationToken()))
                .findFirst()
                .orElse(null);
    }

    private EPIDeliveryFormItem findItemByCode(EPIDeliveryForm form, String normalizedCode) {
        if (form.getItems() == null || normalizedCode == null) {
            return null;
        }
        return form.getItems().stream()
                .filter(i -> i.getConfirmationCode() != null && i.getConfirmationCode().equals(normalizedCode))
                .findFirst()
                .orElse(null);
    }

    private static String normalizeCode(String code) {
        return code == null ? "" : code.trim().replaceAll("\\s+", "");
    }

    private void assertWhatsAppNotCompletedWithoutConfirm(EPIDeliveryFormStatus status, String signatureType,
                                                          EPIDeliveryForm existing) {
        if (status != EPIDeliveryFormStatus.COMPLETED) {
            return;
        }
        if (!SIGNATURE_WHATSAPP.equals(signatureType)) {
            return;
        }
        if (existing != null && existing.getSignedAt() != null) {
            return;
        }
        throw new BusinessException(
                "Para concluir com confirmação WhatsApp, envie o link ao funcionário ou confirme com o código recebido.");
    }

    private static String generateSixDigitCode() {
        int n = SECURE_RANDOM.nextInt(1_000_000);
        return String.format("%06d", n);
    }

    private static String sanitizeFrontendBaseUrl(String frontendBaseUrl) {
        if (frontendBaseUrl == null || frontendBaseUrl.isBlank()) {
            throw new BusinessException("URL do frontend é obrigatória para gerar o link de confirmação.");
        }
        String base = frontendBaseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (!base.startsWith("http://") && !base.startsWith("https://")) {
            throw new BusinessException("URL do frontend inválida.");
        }
        return base;
    }

    private static String buildWhatsAppMessage(String employeeName, LocalDate deliveryDate, String code, String confirmUrl) {
        String dateStr = deliveryDate != null
                ? deliveryDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "-";
        String firstName = employeeName != null && !employeeName.isBlank()
                ? employeeName.trim().split("\\s+")[0]
                : "colaborador";
        return "Olá " + firstName + "!\n\n"
                + "Confirme o recebimento dos EPIs entregues em " + dateStr + ".\n\n"
                + "Seu código: *" + code + "*\n\n"
                + "Acesse o link e digite o código:\n"
                + confirmUrl + "\n\n"
                + "Validade: " + CONFIRMATION_TTL_HOURS + "h.";
    }

    private static String maskPhone(String normalized) {
        if (normalized == null || normalized.length() < 4) {
            return "****";
        }
        return "***" + normalized.substring(normalized.length() - 4);
    }

    /**
     * Registra um evento no histórico de alterações do funcionário.
     */
    /**
     * Primeira entrega concluída usa a data de admissão; entregas seguintes usam a data informada (ou hoje).
     */
    private LocalDate resolveDeliveryDate(
            UUID employeeId,
            UUID excludeFormId,
            EPIDeliveryType deliveryType,
            LocalDate requestedDate,
            LocalDate hireDate) {
        boolean hasPriorCompleted = hasCompletedDeliveries(employeeId, excludeFormId);
        if (!hasPriorCompleted && deliveryType == EPIDeliveryType.PRIMEIRA_ENTREGA && hireDate != null) {
            return hireDate;
        }
        if (requestedDate != null) {
            return requestedDate;
        }
        return LocalDate.now();
    }

    private boolean hasCompletedDeliveries(UUID employeeId, UUID excludeFormId) {
        if (employeeId == null) {
            return false;
        }
        if (excludeFormId == null) {
            return epiDeliveryFormRepository.countByEmployeeIdAndStatus(employeeId, EPIDeliveryFormStatus.COMPLETED) > 0;
        }
        return epiDeliveryFormRepository
                .findByEmployeeIdAndStatusWithItemsOrderByDeliveryDateAsc(employeeId, EPIDeliveryFormStatus.COMPLETED)
                .stream()
                .anyMatch(form -> !excludeFormId.equals(form.getId()));
    }

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

    private String resolveSizeNumber(String sizeNumber, UUID stockItemId, String epiName) {
        if (sizeNumber != null && !sizeNumber.isBlank()) {
            return sizeNumber.trim();
        }
        if (stockItemId != null) {
            String fromStock = stockItemRepository.findById(stockItemId)
                    .map(si -> si.getSizeVariation())
                    .orElse(null);
            if (fromStock != null && !fromStock.isBlank()) {
                return fromStock.trim();
            }
        }
        if (epiName != null && !epiName.isBlank()) {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                    "(?i)\\b(PP|P|M|G|GG|XG|XGG|EG|EGG|EXG|3[3-9]|4[0-9]|5[0-0])\\b$");
            java.util.regex.Matcher matcher = pattern.matcher(epiName.trim());
            if (matcher.find()) {
                return matcher.group(1).toUpperCase();
            }
        }
        return null;
    }
}
