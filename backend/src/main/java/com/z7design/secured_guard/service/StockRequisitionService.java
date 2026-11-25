package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateStockRequisitionRequest;
import com.z7design.secured_guard.dto.DeliverStockRequisitionRequest;
import com.z7design.secured_guard.dto.StockMovementDTO;
import com.z7design.secured_guard.dto.StockRequisitionDTO;
import com.z7design.secured_guard.dto.StockRequisitionListItemDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EmployeeChangeHistory;
import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.model.StockRequisition;
import com.z7design.secured_guard.model.StockRequisitionLine;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import com.z7design.secured_guard.repository.EmployeeChangeHistoryRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StockMovementRepository;
import com.z7design.secured_guard.repository.StockRequisitionRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StockRequisitionService {

    private final StockRequisitionRepository stockRequisitionRepository;
    private final StockMovementRepository stockMovementRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final StockItemRepository stockItemRepository;
    private final EmployeeChangeHistoryRepository employeeChangeHistoryRepository;
    private final StockService stockService;
    private final StockRequisitionPdfService stockRequisitionPdfService;
    private final EPIDeliveryFormService epiDeliveryFormService;
    private final EPIDeliveryFormRepository epiDeliveryFormRepository;

    private String nextRequisitionNumber() {
        return "REQ-EST-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"))
                + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
    }

    public StockRequisitionDTO create(CreateStockRequisitionRequest req, UUID userId) {
        User requester = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + userId));
        Employee employee = employeeRepository.findWithOrgContextById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado: " + req.getEmployeeId()));
        String sectorSnapshot = buildWorkSectorSnapshot(employee);

        StockRequisition r = StockRequisition.builder()
                .requisitionNumber(nextRequisitionNumber())
                .employee(employee)
                .requestedByUser(requester)
                .movementReason(req.getMovementReason())
                .notes(req.getNotes())
                .employeeWorkSector(sectorSnapshot)
                .status(StockRequisitionStatus.APPROVED)
                .approvedByUser(requester)
                .approvedAt(LocalDateTime.now())
                .build();

        for (CreateStockRequisitionRequest.Line line : req.getLines()) {
            StockItem item = stockItemRepository.findById(line.getStockItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item não encontrado: " + line.getStockItemId()));
            StockRequisitionLine l = StockRequisitionLine.builder()
                    .stockItem(item)
                    .quantity(line.getQuantity())
                    .build();
            r.addLine(l);
        }

        stockRequisitionRepository.save(r);

        // Baixa imediata no estoque para todos os itens da requisição (Opção A)
        createOutboundMovementsForRequisition(r, userId,
                "Baixa imediata no estoque na requisição criada por " + requester.getName());

        // Se contiver itens de EPI elegíveis, lança/sincroniza na Ficha de EPI do funcionário
        try {
            epiDeliveryFormService.ensureDraftEpiFormFromApprovedStockRequisition(r, userId);
        } catch (Exception ex) {
            log.warn("Sincronização de EPI da requisição {}: {}", r.getRequisitionNumber(), ex.getMessage());
        }
        String historyDetail = String.format(
                "Nº %s | Motivo: %s | Setor (snapshot): %s | Itens: %s | Solicitante (usuário): %s | Perfis/cargos do solicitante: %s",
                r.getRequisitionNumber(),
                req.getMovementReason().getDescription(),
                sectorSnapshot != null ? sectorSnapshot : "—",
                buildLinesSummary(r),
                requester.getName(),
                formatUserRoles(requester));
        recordHistory(employee.getId(), requester, "REQUISICAO_ESTOQUE",
                "Requisição de estoque (almoxarifado)",
                historyDetail,
                req.getNotes());

        return StockRequisitionDTO.fromEntity(loadFetched(r.getId()));
    }

    /**
     * Atualiza cabeçalho e linhas da requisição de almoxarifado.
     * Se a requisição já tiver baixado estoque (aprovada ou entregue), estorna as saídas anteriores
     * e aplica as novas saídas proporcionalmente.
     */
    @Transactional
    public StockRequisitionDTO update(UUID id, CreateStockRequisitionRequest req) {
        StockRequisition r = loadFetched(id);
        if (r.getStatus() == StockRequisitionStatus.CANCELLED) {
            throw new IllegalArgumentException("Não é possível alterar uma requisição cancelada.");
        }

        boolean wasDeducted = (r.getStatus() == StockRequisitionStatus.APPROVED || r.getStatus() == StockRequisitionStatus.DELIVERED);

        if (wasDeducted && r.getLines() != null) {
            for (StockRequisitionLine oldLine : r.getLines()) {
                if (oldLine.getStockItem() != null && oldLine.getQuantity() != null && oldLine.getQuantity() > 0) {
                    StockItem item = oldLine.getStockItem();
                    int cur = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
                    item.setCurrentQuantity(cur + oldLine.getQuantity());
                    stockItemRepository.save(item);
                }
            }
            if (r.getRequisitionNumber() != null && !r.getRequisitionNumber().isBlank()) {
                List<StockMovement> oldMovements = stockMovementRepository.findByRequisitionNumberOrderByMovementDateAsc(r.getRequisitionNumber());
                if (!oldMovements.isEmpty()) {
                    stockMovementRepository.deleteAll(oldMovements);
                }
            }
        }

        Employee employee = employeeRepository.findWithOrgContextById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado: " + req.getEmployeeId()));
        String sectorSnapshot = buildWorkSectorSnapshot(employee);

        r.setEmployee(employee);
        r.setMovementReason(req.getMovementReason());
        r.setNotes(req.getNotes());
        r.setEmployeeWorkSector(sectorSnapshot);

        r.getLines().clear();
        for (CreateStockRequisitionRequest.Line line : req.getLines()) {
            StockItem item = stockItemRepository.findById(line.getStockItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item não encontrado: " + line.getStockItemId()));
            StockRequisitionLine l = StockRequisitionLine.builder()
                    .stockItem(item)
                    .quantity(line.getQuantity())
                    .build();
            r.addLine(l);
        }

        if (wasDeducted) {
            UUID actingUserId = r.getApprovedByUser() != null ? r.getApprovedByUser().getId() :
                    (r.getRequestedByUser() != null ? r.getRequestedByUser().getId() : null);
            createOutboundMovementsForRequisition(r, actingUserId, "Baixa no estoque por atualização de requisição de almoxarifado");
            epiDeliveryFormService.ensureDraftEpiFormFromApprovedStockRequisition(r, actingUserId);
        }

        stockRequisitionRepository.save(r);
        return StockRequisitionDTO.fromEntity(loadFetched(id));
    }

    /**
     * Exclui requisição de almoxarifado.
     * Se já estiver aprovada ou entregue, estorna o estoque devolvendo as quantidades e remove as movimentações vinculadas.
     */
    @Transactional
    public void delete(UUID id) {
        StockRequisition r = loadFetched(id);

        if (r.getStatus() == StockRequisitionStatus.APPROVED || r.getStatus() == StockRequisitionStatus.DELIVERED) {
            log.info("↩️ Estornando estoque ao deletar requisição: {}", r.getRequisitionNumber());
            if (r.getLines() != null) {
                for (StockRequisitionLine line : r.getLines()) {
                    if (line.getStockItem() != null && line.getQuantity() != null && line.getQuantity() > 0) {
                        StockItem item = line.getStockItem();
                        int oldStock = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
                        item.setCurrentQuantity(oldStock + line.getQuantity());
                        stockItemRepository.save(item);
                        log.info("Estoque do item {} estornado: {} -> {}", item.getCode(), oldStock, item.getCurrentQuantity());
                    }
                }
            }

            if (r.getRequisitionNumber() != null && !r.getRequisitionNumber().isBlank()) {
                List<StockMovement> movements = stockMovementRepository.findByRequisitionNumberOrderByMovementDateAsc(r.getRequisitionNumber());
                if (!movements.isEmpty()) {
                    stockMovementRepository.deleteAll(movements);
                    log.info("Removidas {} movimentações associadas à requisição {}", movements.size(), r.getRequisitionNumber());
                }
            }

            try {
                epiDeliveryFormRepository.findFirstByStockRequisitionIdOrderByCreatedAtDesc(r.getId()).ifPresent(form -> {
                    if (form.getStatus() == EPIDeliveryFormStatus.DRAFT) {
                        epiDeliveryFormRepository.delete(form);
                    } else {
                        form.setStockRequisitionId(null);
                        epiDeliveryFormRepository.save(form);
                    }
                });
            } catch (Exception ex) {
                log.warn("Erro ao desvincular ficha EPI ao excluir requisição: {}", ex.getMessage());
            }
        }

        stockRequisitionRepository.delete(r);
        log.info("✅ Requisição {} excluída com sucesso", r.getRequisitionNumber());
    }

    @Transactional
    public void deleteMultiple(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        for (UUID id : ids) {
            if (id != null) {
                delete(id);
            }
        }
    }

    public StockRequisitionDTO approve(UUID id, UUID approverUserId) {
        StockRequisition r = loadFetched(id);
        if (r.getStatus() == StockRequisitionStatus.APPROVED || r.getStatus() == StockRequisitionStatus.DELIVERED) {
            return StockRequisitionDTO.fromEntity(r);
        }
        if (r.getStatus() != StockRequisitionStatus.PENDING) {
            throw new IllegalArgumentException("Somente requisições pendentes podem ser aprovadas.");
        }
        User approver = userRepository.findById(approverUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + approverUserId));

        createOutboundMovementsForRequisition(r, approverUserId,
                "Baixa no estoque na aprovação da requisição por " + approver.getName());

        r.setStatus(StockRequisitionStatus.APPROVED);
        r.setApprovedByUser(approver);
        r.setApprovedAt(LocalDateTime.now());
        stockRequisitionRepository.save(r);

        String apprDetail = "Nº " + r.getRequisitionNumber() + " — Aprovador: " + approver.getName()
                + " | Perfis do aprovador: " + formatUserRoles(approver)
                + " | Estoque baixado na aprovação em "
                + r.getApprovedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        if (r.getEmployeeWorkSector() != null && !r.getEmployeeWorkSector().isBlank()) {
            apprDetail += " | Setor registrado na requisição: " + r.getEmployeeWorkSector();
        }
        recordHistory(r.getEmployee().getId(), approver, "REQUISICAO_ESTOQUE_APROVADA",
                "Requisição de estoque aprovada (baixa no estoque)",
                apprDetail,
                null);

        epiDeliveryFormService.ensureDraftEpiFormFromApprovedStockRequisition(loadFetched(id), approverUserId);

        return StockRequisitionDTO.fromEntity(loadFetched(id));
    }

    public StockRequisitionDTO deliver(UUID id, DeliverStockRequisitionRequest req, UUID delivererUserId) {
        StockRequisition r = loadFetched(id);
        if (r.getStatus() != StockRequisitionStatus.APPROVED) {
            throw new IllegalArgumentException("Apenas requisições aprovadas podem ter o recebimento confirmado (assinatura do funcionário).");
        }
        if (req.getSignatureType() == StockMovement.SignatureType.DIGITAL
                && (req.getDigitalSignature() == null || req.getDigitalSignature().isBlank())) {
            throw new IllegalArgumentException("Informe a assinatura digital ou escolha assinatura física.");
        }

        User deliverer = userRepository.findById(delivererUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + delivererUserId));

        String reqNum = r.getRequisitionNumber();
        List<StockMovement> movements = stockMovementRepository.findByRequisitionNumberOrderByMovementDateAsc(reqNum);
        if (movements.isEmpty()) {
            createOutboundMovementsForRequisition(r, delivererUserId,
                    "Baixa retroativa na confirmação de entrega (requisição aprovada antes da versão com baixa na aprovação)");
            movements = stockMovementRepository.findByRequisitionNumberOrderByMovementDateAsc(reqNum);
        }

        LocalDateTime sigAt = LocalDateTime.now();
        if (req.getSignatureType() == StockMovement.SignatureType.DIGITAL) {
            String sig = req.getDigitalSignature();
            for (StockMovement m : movements) {
                m.setDigitalSignature(sig);
                m.setSignatureType(StockMovement.SignatureType.DIGITAL);
                m.setSignatureDate(sigAt);
                stockMovementRepository.save(m);
            }
        } else {
            for (StockMovement m : movements) {
                m.setSignatureType(StockMovement.SignatureType.PHYSICAL);
                m.setSignatureDate(sigAt);
                m.setDigitalSignature(null);
                stockMovementRepository.save(m);
            }
        }

        r.setStatus(StockRequisitionStatus.DELIVERED);
        r.setDeliveredAt(LocalDateTime.now());
        r.setDeliveredByUser(deliverer);
        r.setSignatureType(req.getSignatureType());
        r.setSignatureAt(LocalDateTime.now());
        if (req.getSignatureType() == StockMovement.SignatureType.DIGITAL) {
            r.setDigitalSignature(req.getDigitalSignature());
            r.setPhysicalSignatureAck(null);
        } else {
            r.setDigitalSignature(null);
            r.setPhysicalSignatureAck(req.getPhysicalAcknowledgment());
        }
        stockRequisitionRepository.save(r);

        recordHistory(r.getEmployee().getId(), deliverer, "REQUISICAO_ESTOQUE_ENTREGA",
                "Confirmação de recebimento (assinatura do funcionário)",
                "Nº " + reqNum + " — Assinatura registrada por " + deliverer.getName() + " em "
                        + r.getDeliveredAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                        + " (" + req.getSignatureType() + ")",
                req.getPhysicalAcknowledgment());

        epiDeliveryFormService.completeLinkedEpiFormAfterStockRequisitionDelivery(loadFetched(id), req, delivererUserId);

        return StockRequisitionDTO.fromEntity(loadFetched(id));
    }

    /**
     * Adiciona itens adicionais a uma requisição existente (pendente, aprovada ou entregue).
     * Se já estiver aprovada ou entregue, baixa automaticamente o estoque dos novos itens.
     */
    @Transactional
    public StockRequisitionDTO addItems(UUID id, List<CreateStockRequisitionRequest.Line> newLines, UUID actingUserId) {
        StockRequisition r = loadFetched(id);
        if (r.getStatus() == StockRequisitionStatus.CANCELLED) {
            throw new IllegalArgumentException("Não é possível adicionar itens a uma requisição cancelada.");
        }
        if (newLines == null || newLines.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos um item para adicionar.");
        }

        List<StockRequisitionLine> newlyAddedLines = new ArrayList<>();
        for (CreateStockRequisitionRequest.Line lineReq : newLines) {
            StockItem item = stockItemRepository.findById(lineReq.getStockItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Item de estoque não encontrado: " + lineReq.getStockItemId()));

            Optional<StockRequisitionLine> existingLineOpt = r.getLines().stream()
                    .filter(l -> l.getStockItem().getId().equals(item.getId()))
                    .findFirst();

            if (existingLineOpt.isPresent()) {
                StockRequisitionLine targetLine = existingLineOpt.get();
                targetLine.setQuantity(targetLine.getQuantity() + lineReq.getQuantity());
            } else {
                StockRequisitionLine targetLine = StockRequisitionLine.builder()
                        .stockItem(item)
                        .quantity(lineReq.getQuantity())
                        .build();
                r.addLine(targetLine);
            }

            newlyAddedLines.add(StockRequisitionLine.builder()
                    .stockItem(item)
                    .quantity(lineReq.getQuantity())
                    .build());
        }

        // Se a requisição já tiver sido aprovada ou entregue, baixa imediatamente o estoque dos novos itens
        if (r.getStatus() == StockRequisitionStatus.APPROVED || r.getStatus() == StockRequisitionStatus.DELIVERED) {
            String reqNum = r.getRequisitionNumber();
            UUID empId = r.getEmployee().getId();
            var reason = r.getMovementReason();
            String note = "Item adicional incluído na requisição " + reqNum;

            for (StockRequisitionLine line : newlyAddedLines) {
                StockMovementDTO mov = new StockMovementDTO();
                mov.setStockItemId(line.getStockItem().getId());
                mov.setMovementType(MovementType.SAIDA);
                mov.setReason(reason);
                mov.setQuantity(line.getQuantity());
                mov.setEmployeeId(empId);
                mov.setEmployeeName(r.getEmployee() != null ? r.getEmployee().getName() : null);
                mov.setRequisitionNumber(reqNum);
                mov.setNotes(note);
                mov.setSkipEpiDeliveryFormAutoRecord(true);
                stockService.createMovement(mov, actingUserId);
            }

            // Registra no histórico do colaborador
            User actingUser = userRepository.findById(actingUserId).orElse(null);
            String actingName = actingUser != null ? actingUser.getName() : "Almoxarifado";
            recordHistory(r.getEmployee().getId(), actingUser, "REQUISICAO_ESTOQUE_ITENS_ADICIONADOS",
                    "Itens adicionais incluídos na requisição de estoque",
                    "Nº " + r.getRequisitionNumber() + " — " + newlyAddedLines.size() + " novo(s) item(ns) incluído(s) por " + actingName,
                    null);

            // Garante sincronização com ficha de EPI se aplicável
            try {
                epiDeliveryFormService.ensureDraftEpiFormFromApprovedStockRequisition(loadFetched(id), actingUserId);
            } catch (Exception ex) {
                log.warn("Sincronização com ficha de EPI para novos itens: {}", ex.getMessage());
            }
        }

        stockRequisitionRepository.save(r);
        return StockRequisitionDTO.fromEntity(loadFetched(id));
    }

    /**
     * Cria saídas de estoque (uma movimentação por linha). Usado na aprovação; na entrega legado se não houver movimentos.
     */
    private void createOutboundMovementsForRequisition(StockRequisition r, UUID actingUserId, String extraNote) {
        String reqNum = r.getRequisitionNumber();
        UUID empId = r.getEmployee().getId();
        var reason = r.getMovementReason();
        String baseNotes = "Requisição " + reqNum + (r.getNotes() != null && !r.getNotes().isBlank() ? ". " + r.getNotes() : "");
        String fullNotes = baseNotes + ". " + extraNote;

        for (StockRequisitionLine line : r.getLines()) {
            StockMovementDTO mov = new StockMovementDTO();
            mov.setStockItemId(line.getStockItem().getId());
            mov.setMovementType(MovementType.SAIDA);
            mov.setReason(reason);
            mov.setQuantity(line.getQuantity());
            mov.setEmployeeId(empId);
            mov.setEmployeeName(r.getEmployee() != null ? r.getEmployee().getName() : null);
            mov.setRequisitionNumber(reqNum);
            mov.setNotes(fullNotes);
            mov.setSkipEpiDeliveryFormAutoRecord(true);
            stockService.createMovement(mov, actingUserId);
        }
    }

    @Transactional(readOnly = true)
    public StockRequisitionDTO get(UUID id) {
        return StockRequisitionDTO.fromEntity(loadFetched(id));
    }

    @Transactional(readOnly = true)
    public List<StockRequisitionListItemDTO> listAll() {
        return stockRequisitionRepository.findAllListItems();
    }

    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID id) {
        StockRequisition r = loadFetched(id);
        return stockRequisitionPdfService.generateMultiLineRequisitionPdf(r);
    }

    private StockRequisition loadFetched(UUID id) {
        return stockRequisitionRepository.findByIdFetched(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requisição não encontrada: " + id));
    }

    private String buildLinesSummary(StockRequisition r) {
        return r.getLines().stream()
                .map(l -> l.getQuantity() + "x " + l.getStockItem().getCode())
                .collect(Collectors.joining(", "));
    }

    private static String buildWorkSectorSnapshot(Employee employee) {
        if (employee == null) {
            return null;
        }
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
        return parts.isEmpty() ? null : String.join(" | ", parts);
    }

    private static String formatUserRoles(User user) {
        if (user == null || user.getRoles() == null || user.getRoles().isEmpty()) {
            return "sem perfil associado";
        }
        return user.getRoles().stream()
                .map(r -> r.getName() != null ? r.getName() : "")
                .filter(s -> !s.isBlank())
                .sorted()
                .collect(Collectors.joining(", "));
    }

    private void recordHistory(UUID employeeId, User changedBy, String fieldName, String fieldLabel,
                               String newValue, String reason) {
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
    }
}
