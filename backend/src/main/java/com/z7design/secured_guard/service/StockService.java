package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.StockItemDTO;
import com.z7design.secured_guard.dto.StockMovementDTO;
import com.z7design.secured_guard.dto.StockAlertDTO;
import com.z7design.secured_guard.dto.StockItemReportDTO;
import com.z7design.secured_guard.dto.MovementSummaryDTO;
import com.z7design.secured_guard.dto.MovementsReportDTO;
import com.z7design.secured_guard.dto.LowStockReportDTO;
import com.z7design.secured_guard.dto.DateRangeReportDTO;
import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.model.StockAlert;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.Unit;
import com.z7design.secured_guard.model.enums.StockCategory;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StockMovementRepository;
import com.z7design.secured_guard.repository.StockAlertRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.repository.StockItemLocationRepository;
import com.z7design.secured_guard.repository.StorageShelfRepository;
import com.z7design.secured_guard.repository.EmployeeChangeHistoryRepository;
import com.z7design.secured_guard.repository.PersonalProtectiveEquipmentRepository;
import com.z7design.secured_guard.model.StockItemLocation;
import com.z7design.secured_guard.model.EmployeeChangeHistory;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.model.StorageShelf;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StockService {

    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockAlertRepository stockAlertRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final UnitRepository unitRepository;
    private final StockItemLocationRepository stockItemLocationRepository;
    private final StorageShelfRepository storageShelfRepository;
    private final EmployeeChangeHistoryRepository employeeChangeHistoryRepository;
    private final StockRequisitionPdfService stockRequisitionPdfService;
    private final EmailService emailService;
    private final PersonalProtectiveEquipmentRepository epiRepository;
    private final EPIDeliveryFormService epiDeliveryFormService;

    // ===== GESTÃO DE ITENS =====

    public List<StockItemDTO> getAllItems() {
        log.info("Buscando todos os itens de estoque");
        return stockItemRepository.findByActiveTrue().stream()
                .map(StockItemDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public Page<StockItemDTO> getItemsWithFilters(
            StockCategory category,
            Boolean active,
            UUID unitId,
            Boolean lowStock,
            String searchTerm,
            Pageable pageable) {

        log.info("Buscando itens com filtros - Categoria: {}, Ativo: {}, Baixo estoque: {}",
                category, active, lowStock);

        return stockItemRepository.findByFilters(category, active, unitId, lowStock, searchTerm, pageable)
                .map(StockItemDTO::fromEntity);
    }

    public StockItemDTO getItemById(UUID id) {
        log.info("Buscando item por ID: {}", id);
        StockItem item = stockItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item de estoque não encontrado: " + id));
        StockItemDTO dto = StockItemDTO.fromEntity(item);
        
        // Buscar localizações
        List<StockItemLocation> locations = stockItemLocationRepository.findByStockItem(item);
        dto.setLocations(locations.stream()
                .map(com.z7design.secured_guard.dto.StockItemLocationDTO::fromEntity)
                .collect(Collectors.toList()));
        
        return dto;
    }

    public StockItemDTO getItemByCode(String code) {
        log.info("Buscando item por código: {}", code);
        StockItem item = stockItemRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Item não encontrado com código: " + code));
        return StockItemDTO.fromEntity(item);
    }

    public StockItemDTO getItemByQrCode(String qrCode) {
        log.info("Buscando item por QR Code: {}", qrCode);
        StockItem item = stockItemRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new ResourceNotFoundException("Item não encontrado com QR Code: " + qrCode));
        return StockItemDTO.fromEntity(item);
    }

    public StockItemDTO createItem(StockItemDTO dto) {
        log.info("Criando novo item de estoque: {}", dto.getName());

        // Verificar se código já existe
        if (dto.getCode() != null && stockItemRepository.existsByCode(dto.getCode())) {
            throw new IllegalArgumentException("Já existe um item com o código: " + dto.getCode());
        }

        StockItem item = StockItemDTO.toEntity(dto);

        // Associar unidade se especificada
        if (dto.getUnitId() != null) {
            Unit unit = unitRepository.findById(dto.getUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada: " + dto.getUnitId()));
            item.setUnit(unit);
        }

        item = stockItemRepository.save(item);

        // Associar localização inicial se especificada
        if (dto.getInitialShelfId() != null) {
            StorageShelf shelf = storageShelfRepository.findById(dto.getInitialShelfId())
                    .orElseThrow(() -> new ResourceNotFoundException("Prateleira não encontrada: " + dto.getInitialShelfId()));
            
            StockItemLocation location = new StockItemLocation();
            location.setStockItem(item);
            location.setShelf(shelf);
            location.setFloor(dto.getInitialFloor());
            location.setQuantity(item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0);
            stockItemLocationRepository.save(location);
        }

        // Criar alerta se quantidade inicial for baixa
        checkAndCreateLowStockAlert(item);

        log.info("Item criado com sucesso - ID: {}, Código: {}", item.getId(), item.getCode());
        return StockItemDTO.fromEntity(item);
    }

    public StockItemDTO updateItem(UUID id, StockItemDTO dto) {
        log.info("Atualizando item de estoque: {}", id);

        StockItem existingItem = stockItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item de estoque não encontrado: " + id));

        // Verificar se código já existe em outro item
        if (dto.getCode() != null && !dto.getCode().equals(existingItem.getCode()) &&
                stockItemRepository.existsByCodeAndIdNot(dto.getCode(), id)) {
            throw new IllegalArgumentException("Já existe outro item com o código: " + dto.getCode());
        }

        // Atualizar campos
        existingItem.setCode(dto.getCode());
        existingItem.setName(dto.getName());
        existingItem.setCategory(dto.getCategory());
        existingItem.setSizeVariation(dto.getSizeVariation());
        existingItem.setDescription(dto.getDescription());
        if (dto.getCurrentQuantity() != null) {
            existingItem.setCurrentQuantity(dto.getCurrentQuantity());
        }
        if (dto.getMinimumQuantity() != null) {
            existingItem.setMinimumQuantity(dto.getMinimumQuantity());
        }
        existingItem.setUnitCost(dto.getUnitCost());
        existingItem.setSupplier(dto.getSupplier());
        existingItem.setBarcode(dto.getBarcode());
        if (dto.getActive() != null) {
            existingItem.setActive(dto.getActive());
        }
        existingItem.setNotes(dto.getNotes());

        // Atualizar unidade se especificada
        if (dto.getUnitId() != null) {
            Unit unit = unitRepository.findById(dto.getUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada: " + dto.getUnitId()));
            existingItem.setUnit(unit);
        }

        existingItem = stockItemRepository.save(existingItem);

        // Verificar se precisa criar/resolver alertas
        checkAndCreateLowStockAlert(existingItem);

        log.info("Item atualizado com sucesso: {}", id);
        return StockItemDTO.fromEntity(existingItem);
    }

    public void deleteItem(UUID id) {
        log.info("Excluindo item de estoque: {}", id);

        StockItem item = stockItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item de estoque não encontrado: " + id));

        // Marcar como inativo em vez de excluir (para manter histórico)
        item.setActive(false);
        stockItemRepository.save(item);

        log.info("Item marcado como inativo: {}", id);
    }

    // ===== MOVIMENTAÇÕES =====

    public StockMovementDTO createMovement(StockMovementDTO dto, UUID userId) {
        log.info("Criando movimentação - Tipo: {}, Item: {}, Quantidade: {}",
                dto.getMovementType(), dto.getStockItemId(), dto.getQuantity());

        StockItem item = stockItemRepository.findById(dto.getStockItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item não encontrado: " + dto.getStockItemId()));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + userId));

        StockMovement movement = StockMovementDTO.toEntity(dto);
        movement.setStockItem(item);
        movement.setUser(user);
        movement.setMovementDate(LocalDateTime.now());
        movement.setPreviousQuantity(item.getCurrentQuantity());

        // Calcular nova quantidade total do item
        int newQuantity;
        if (dto.getMovementType() == MovementType.ENTRADA) {
            newQuantity = item.getCurrentQuantity() + dto.getQuantity();
        } else {
            newQuantity = item.getCurrentQuantity() - dto.getQuantity();
            if (newQuantity < 0) {
                throw new IllegalArgumentException(
                        "Quantidade insuficiente em estoque. Disponível: " + item.getCurrentQuantity());
            }
        }

        movement.setNewQuantity(newQuantity);

        // Associar funcionário se for saída
        Employee employee = null;
        if (dto.getEmployeeId() != null) {
            employee = employeeRepository.findById(dto.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado: " + dto.getEmployeeId()));
            movement.setEmployee(employee);
        }

        // Associar unidade
        if (dto.getUnitId() != null) {
            Unit unit = unitRepository.findById(dto.getUnitId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada: " + dto.getUnitId()));
            movement.setUnit(unit);
        }

        // Lidar com Localização (Prateleira)
        if (dto.getItemLocationId() != null) {
            com.z7design.secured_guard.model.StockItemLocation location = stockItemLocationRepository.findById(dto.getItemLocationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Localização não encontrada: " + dto.getItemLocationId()));
            
            if (dto.getMovementType() == MovementType.SAIDA && location.getQuantity() < dto.getQuantity()) {
                throw new IllegalArgumentException("Quantidade insuficiente nesta localização específica. Disponível: " + location.getQuantity());
            }

            location.updateQuantity(dto.getMovementType() == MovementType.ENTRADA ? dto.getQuantity() : -dto.getQuantity());
            stockItemLocationRepository.save(location);
            movement.setItemLocation(location);
        }

        // Salvar movimentação
        movement = stockMovementRepository.save(movement);

        // Atualizar quantidade total do item
        item.setCurrentQuantity(newQuantity);
        stockItemRepository.save(item);

        // Registrar no histórico do funcionário se for saída
        if (dto.getMovementType() == MovementType.SAIDA && employee != null) {
            recordEmployeeStockHistory(movement, employee, user);
            
            // Se for EPI, registrar entrega de EPI também
            if (item.getCategory() == StockCategory.EPI) {
                try {
                    recordEPIDelivery(movement, employee, user);
                } catch (Exception e) {
                    log.error("Erro ao registrar entrega de EPI: {}", e.getMessage());
                }
            }
        }

        // Verificar alertas
        checkAndCreateLowStockAlert(item);

        log.info("Movimentação criada com sucesso - ID: {}, Nova quantidade: {}", movement.getId(), newQuantity);
        return StockMovementDTO.fromEntity(movement);
    }

    private void recordEmployeeStockHistory(StockMovement movement, Employee employee, User user) {
        log.info("Registrando movimentação no histórico do funcionário: {}", employee.getId());
        
        EmployeeChangeHistory history = EmployeeChangeHistory.builder()
                .employeeId(employee.getId())
                .changedAt(java.time.Instant.now())
                .changedByUser(user)
                .category(EmployeeChangeCategory.OUTROS)
                .fieldName("ESTOQUE_MOVIMENTACAO")
                .fieldLabel("Retirada de Material")
                .newValue(String.format("Retirou %d %s de %s (Ref: %s)", 
                        movement.getQuantity(), 
                        movement.getStockItem().getUnit() != null ? movement.getStockItem().getUnit().getAbbreviation() : "UN",
                        movement.getStockItem().getFullName(),
                        movement.getId().toString().substring(0, 8).toUpperCase()))
                .reason(movement.getNotes())
                .build();
        
        employeeChangeHistoryRepository.save(history);
    }

    private void recordEPIDelivery(StockMovement movement, Employee employee, User user) {
        log.info("Registrando entrega de EPI para funcionário: {}", employee.getId());
        
        // Criar ficha de entrega de EPI simplificada
        com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO epiDto = new com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO();
        epiDto.setEmployeeId(employee.getId());
        epiDto.setDeliveryDate(java.time.LocalDate.now());
        epiDto.setCompanyId(employee.getCompany() != null ? employee.getCompany().getId() : null);
        epiDto.setObservations("Gerado via movimentação de estoque: " + movement.getId());
        
        com.z7design.secured_guard.dto.EPIDeliveryFormItemDTO itemDto = new com.z7design.secured_guard.dto.EPIDeliveryFormItemDTO();
        itemDto.setEpiName(movement.getStockItem().getFullName());
        itemDto.setQuantity(movement.getQuantity());
        
        epiDto.setItems(List.of(itemDto));
        
        // Nota: O service de EPI delivery já dá baixa no estoque de PersonalProtectiveEquipment.
        // Como estamos usando StockItem, pode haver duplicidade se ambos sistemas forem usados.
        // Por enquanto, apenas registramos a ficha sem afetar o estoque 'legado' de EPIs se possível,
        // mas o service atual faz isso. Para evitar conflito, idealmente unificaríamos os modelos futuramente.
        epiDeliveryFormService.create(epiDto, user.getId());
    }

    public StockMovementDTO signMovement(UUID movementId, String signatureBase64) {
        log.info("Registrando assinatura digital para movimentação: {}", movementId);
        StockMovement movement = stockMovementRepository.findById(movementId)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação não encontrada: " + movementId));
        
        movement.setDigitalSignature(signatureBase64);
        movement.setSignatureDate(LocalDateTime.now());
        movement.setSignatureType(StockMovement.SignatureType.DIGITAL);
        
        movement = stockMovementRepository.save(movement);
        return StockMovementDTO.fromEntity(movement);
    }

    public byte[] getRequisitionPdf(UUID movementId) {
        return stockRequisitionPdfService.generateRequisitionPdf(movementId);
    }

    public void sendRequisition(UUID movementId, StockMovement.RequisitionSentType type, String destination) {
        log.info("Enviando requisição {} via {}", movementId, type);
        StockMovement movement = stockMovementRepository.findById(movementId)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação não encontrada: " + movementId));
        
        byte[] pdfContent = getRequisitionPdf(movementId);
        String fileName = "Requisicao_" + movement.getId().toString().substring(0, 8) + ".pdf";

        if (type == StockMovement.RequisitionSentType.EMAIL) {
            if (destination == null || destination.isEmpty()) {
                destination = movement.getEmployee() != null ? movement.getEmployee().getEmail() : null;
            }
            if (destination != null) {
                emailService.sendEmailWithAttachment(destination, "Requisição de Estoque", 
                    "Segue em anexo a sua requisição de estoque.", pdfContent, fileName);
            }
        } else if (type == StockMovement.RequisitionSentType.WHATSAPP) {
            // Placeholder para WhatsApp integration (usando BaileysRestService se disponível)
            log.info("WhatsApp integration placeholder for destination: {}", destination);
        }

        movement.setRequisitionSentType(type);
        stockMovementRepository.save(movement);
    }

    public Page<StockMovementDTO> getMovementsWithFilters(
            UUID stockItemId,
            UUID employeeId,
            MovementType movementType,
            MovementReason reason,
            UUID unitId,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String searchTerm,
            Pageable pageable) {

        try {
            log.info("Buscando movimentações com filtros - Item: {}, Funcionário: {}, Tipo: {}",
                    stockItemId, employeeId, movementType);

            // Criar Specification dinamicamente
            Specification<StockMovement> spec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();

                // Filtro por item de estoque
                if (stockItemId != null) {
                    predicates.add(cb.equal(root.get("stockItem").get("id"), stockItemId));
                }

                // Filtro por funcionário
                if (employeeId != null) {
                    predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
                }

                // Filtro por tipo de movimentação
                if (movementType != null) {
                    predicates.add(cb.equal(root.get("movementType"), movementType));
                }

                // Filtro por motivo
                if (reason != null) {
                    predicates.add(cb.equal(root.get("reason"), reason));
                }

                // Filtro por unidade
                if (unitId != null) {
                    predicates.add(cb.equal(root.get("unit").get("id"), unitId));
                }

                // Filtro por data inicial
                if (startDate != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("movementDate"), startDate));
                }

                // Filtro por data final
                if (endDate != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("movementDate"), endDate));
                }

                // Filtro por termo de busca
                if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                    String searchPattern = "%" + searchTerm.toLowerCase() + "%";
                    Predicate itemNamePred = cb.and(
                            cb.isNotNull(root.get("stockItem").get("name")),
                            cb.like(cb.lower(root.get("stockItem").get("name")), searchPattern));
                    Predicate itemCodePred = cb.and(
                            cb.isNotNull(root.get("stockItem").get("code")),
                            cb.like(cb.lower(root.get("stockItem").get("code")), searchPattern));
                    Predicate employeeNamePred = cb.and(
                            cb.isNotNull(root.get("employeeName")),
                            cb.like(cb.lower(root.get("employeeName")), searchPattern));
                    Predicate userNamePred = cb.and(
                            cb.isNotNull(root.get("userName")),
                            cb.like(cb.lower(root.get("userName")), searchPattern));
                    Predicate documentNumberPred = cb.and(
                            cb.isNotNull(root.get("documentNumber")),
                            cb.like(cb.lower(root.get("documentNumber")), searchPattern));

                    predicates
                            .add(cb.or(itemNamePred, itemCodePred, employeeNamePred, userNamePred, documentNumberPred));
                }

                // Ordenar por data de movimentação (mais recente primeiro)
                query.orderBy(cb.desc(root.get("movementDate")));

                return cb.and(predicates.toArray(new Predicate[0]));
            };

            Page<StockMovement> movements = stockMovementRepository.findAll(spec, pageable);

            log.info("Encontradas {} movimentações", movements.getTotalElements());

            // Converter movimentações para DTO, filtrando nulos
            List<StockMovementDTO> dtos = movements.getContent().stream()
                    .map(movement -> {
                        try {
                            return StockMovementDTO.fromEntity(movement);
                        } catch (Exception e) {
                            log.error("Erro ao converter movimentação {}: {}", movement.getId(), e.getMessage());
                            return null;
                        }
                    })
                    .filter(dto -> dto != null)
                    .collect(Collectors.toList());

            // Criar nova página com os DTOs convertidos
            return new PageImpl<>(
                    dtos,
                    pageable,
                    movements.getTotalElements());

        } catch (Exception e) {
            log.error("Erro ao buscar movimentações com filtros: {}", e.getMessage(), e);
            // Return empty page instead of throwing exception
            return Page.empty(pageable);
        }
    }

    public List<StockMovementDTO> getMovementsByItem(UUID itemId) {
        return stockMovementRepository.findByStockItemIdOrderByMovementDateDesc(itemId).stream()
                .map(StockMovementDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<StockMovementDTO> getDeliveryHistoryByEmployee(UUID employeeId) {
        log.info("Buscando histórico de entregas do funcionário: {}", employeeId);
        return stockMovementRepository.findDeliveryHistoryByEmployee(employeeId).stream()
                .map(StockMovementDTO::fromEntity)
                .collect(Collectors.toList());
    }

    // ===== ALERTAS =====

    public List<StockAlertDTO> getActiveAlerts() {
        try {
            log.info("Buscando alertas ativos...");
            List<StockAlert> alerts = stockAlertRepository.findByIsResolvedFalseOrderByPriorityDescCreatedAtDesc();
            log.info("Encontrados {} alertas ativos", alerts.size());

            return alerts.stream()
                    .map(alert -> {
                        try {
                            return StockAlertDTO.fromEntity(alert);
                        } catch (Exception e) {
                            log.error("Erro ao converter alerta {}: {}", alert.getId(), e.getMessage());
                            return null;
                        }
                    })
                    .filter(alert -> alert != null)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erro ao buscar alertas ativos: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public List<StockAlertDTO> getUnreadAlerts() {
        try {
            log.info("Buscando alertas não lidos...");
            List<StockAlert> alerts = stockAlertRepository.findByIsReadFalseOrderByPriorityDescCreatedAtDesc();
            log.info("Encontrados {} alertas não lidos", alerts.size());

            return alerts.stream()
                    .map(alert -> {
                        try {
                            return StockAlertDTO.fromEntity(alert);
                        } catch (Exception e) {
                            log.error("Erro ao converter alerta {}: {}", alert.getId(), e.getMessage());
                            return null;
                        }
                    })
                    .filter(alert -> alert != null)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erro ao buscar alertas não lidos: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public void markAlertAsRead(UUID alertId) {
        StockAlert alert = stockAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta não encontrado: " + alertId));
        alert.markAsRead();
        stockAlertRepository.save(alert);
    }

    public void resolveAlert(UUID alertId, UUID userId) {
        StockAlert alert = stockAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta não encontrado: " + alertId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + userId));

        alert.resolve(user);
        stockAlertRepository.save(alert);
    }

    // ===== RELATÓRIOS =====

    public Map<String, Object> getStockReport() {
        log.info("Gerando relatório de estoque");

        List<StockItem> allItems = stockItemRepository.findByActiveTrue();
        List<StockItem> lowStockItems = stockItemRepository.findLowStockItems();
        List<StockItem> outOfStockItems = stockItemRepository.findOutOfStockItems();

        Long totalItems = (long) allItems.size();
        Long lowStockCount = (long) lowStockItems.size();
        Long outOfStockCount = (long) outOfStockItems.size();
        Double totalValue = stockItemRepository.getTotalStockValue();

        Map<StockCategory, Long> itemsByCategory = allItems.stream()
                .collect(Collectors.groupingBy(StockItem::getCategory, Collectors.counting()));

        Long activeAlerts = stockAlertRepository.countByIsResolvedFalse();
        Long criticalAlerts = stockAlertRepository.countCriticalUnresolvedAlerts();

        return Map.of(
                "totalItems", totalItems,
                "lowStockCount", lowStockCount,
                "outOfStockCount", outOfStockCount,
                "totalValue", totalValue != null ? totalValue : 0.0,
                "itemsByCategory", itemsByCategory,
                "activeAlerts", activeAlerts,
                "criticalAlerts", criticalAlerts,
                "lowStockItems", lowStockItems.stream().map(StockItemDTO::fromEntity).collect(Collectors.toList()),
                "outOfStockItems", outOfStockItems.stream().map(StockItemDTO::fromEntity).collect(Collectors.toList()));
    }

    // ===== RELATÓRIOS DETALHADOS =====

    @Transactional(readOnly = true)
    public StockItemReportDTO getItemReport(UUID itemId) {
        log.info("Gerando relatório detalhado para item: {}", itemId);

        StockItem item = stockItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item não encontrado: " + itemId));

        List<StockMovement> movements = stockMovementRepository.findByStockItemIdOrderByMovementDateDesc(itemId);

        long totalMovements = movements.size();
        long totalEntries = movements.stream().filter(m -> m.getMovementType() == MovementType.ENTRADA).count();
        long totalExits = movements.stream().filter(m -> m.getMovementType() == MovementType.SAIDA).count();

        int totalQuantityEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        int totalQuantityExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        BigDecimal totalCostEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCostExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime lastMovementDate = movements.isEmpty() ? null : movements.get(0).getMovementDate();

        // Calcular giro de estoque (quantidade média movimentada por mês nos últimos 6
        // meses)
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);
        List<StockMovement> recentMovements = movements.stream()
                .filter(m -> m.getMovementDate().isAfter(sixMonthsAgo))
                .collect(Collectors.toList());

        int recentQuantityExited = recentMovements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        double turnoverRate = recentQuantityExited > 0 && item.getCurrentQuantity() > 0
                ? (double) recentQuantityExited / (6.0 * item.getCurrentQuantity())
                : 0.0;

        int averageMonthlyConsumption = recentMovements.size() > 0
                ? recentQuantityExited / 6
                : 0;

        String status = item.getCurrentQuantity() == 0 ? "OUT"
                : item.getCurrentQuantity() <= item.getMinimumQuantity() ? "LOW"
                        : item.getCurrentQuantity() > (item.getMinimumQuantity() * 3) ? "OVER" : "NORMAL";

        BigDecimal totalValue = item.getUnitCost() != null && item.getCurrentQuantity() != null
                ? item.getUnitCost().multiply(BigDecimal.valueOf(item.getCurrentQuantity()))
                : BigDecimal.ZERO;

        List<MovementSummaryDTO> recentMovementsDTO = movements.stream()
                .limit(10)
                .map(this::convertToMovementSummaryDTO)
                .collect(Collectors.toList());

        return StockItemReportDTO.builder()
                .id(item.getId())
                .code(item.getCode())
                .name(item.getName())
                .category(item.getCategory())
                .sizeVariation(item.getSizeVariation())
                .currentQuantity(item.getCurrentQuantity())
                .minimumQuantity(item.getMinimumQuantity())
                .unitCost(item.getUnitCost())
                .totalValue(totalValue)
                .supplier(item.getSupplier())
                .unitName(item.getUnit() != null ? item.getUnit().getName() : null)
                .lastMovementDate(lastMovementDate)
                .totalMovements(totalMovements)
                .totalEntries(totalEntries)
                .totalExits(totalExits)
                .totalQuantityEntered(totalQuantityEntered)
                .totalQuantityExited(totalQuantityExited)
                .totalCostEntered(totalCostEntered)
                .totalCostExited(totalCostExited)
                .turnoverRate(turnoverRate)
                .averageMonthlyConsumption(averageMonthlyConsumption)
                .status(status)
                .recentMovements(recentMovementsDTO)
                .build();
    }

    @Transactional(readOnly = true)
    public MovementsReportDTO getMovementsReport(LocalDateTime startDate, LocalDateTime endDate, UUID itemId,
            UUID employeeId, MovementType movementType) {
        log.info("Gerando relatório de movimentações de {} até {}", startDate, endDate);

        Specification<StockMovement> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("movementDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("movementDate"), endDate));
            }
            if (itemId != null) {
                predicates.add(cb.equal(root.get("stockItem").get("id"), itemId));
            }
            if (employeeId != null) {
                predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
            }
            if (movementType != null) {
                predicates.add(cb.equal(root.get("movementType"), movementType));
            }

            query.orderBy(cb.desc(root.get("movementDate")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<StockMovement> movements = stockMovementRepository.findAll(spec);

        long totalMovements = movements.size();
        long totalEntries = movements.stream().filter(m -> m.getMovementType() == MovementType.ENTRADA).count();
        long totalExits = movements.stream().filter(m -> m.getMovementType() == MovementType.SAIDA).count();

        int totalQuantityEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        int totalQuantityExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        BigDecimal totalCostEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCostExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> movementsByType = movements.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getMovementType().name(),
                        Collectors.counting()));

        Map<String, Long> movementsByReason = movements.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getReason().name(),
                        Collectors.counting()));

        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Integer> movementsByDay = movements.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getMovementDate().format(dayFormatter),
                        Collectors.summingInt(StockMovement::getQuantity)));

        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        Map<String, Integer> movementsByMonth = movements.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getMovementDate().format(monthFormatter),
                        Collectors.summingInt(StockMovement::getQuantity)));

        // Top itens mais movimentados
        Map<UUID, MovementsReportDTO.ItemMovementSummaryDTO> itemMap = new HashMap<>();
        for (StockMovement m : movements) {
            UUID itemIdKey = m.getStockItem().getId();
            MovementsReportDTO.ItemMovementSummaryDTO summary = itemMap.getOrDefault(itemIdKey,
                    MovementsReportDTO.ItemMovementSummaryDTO.builder()
                            .itemId(itemIdKey.toString())
                            .itemName(m.getStockItem().getName())
                            .itemCode(m.getStockItem().getCode())
                            .movementCount(0L)
                            .totalQuantity(0)
                            .totalCost(BigDecimal.ZERO)
                            .build());

            summary.setMovementCount(summary.getMovementCount() + 1);
            summary.setTotalQuantity(summary.getTotalQuantity() + m.getQuantity());
            if (m.getTotalCost() != null) {
                summary.setTotalCost(summary.getTotalCost().add(m.getTotalCost()));
            }
            itemMap.put(itemIdKey, summary);
        }

        List<MovementsReportDTO.ItemMovementSummaryDTO> topMovedItems = itemMap.values().stream()
                .sorted((a, b) -> Long.compare(b.getMovementCount(), a.getMovementCount()))
                .limit(10)
                .collect(Collectors.toList());

        // Top funcionários
        Map<UUID, MovementsReportDTO.EmployeeMovementSummaryDTO> employeeMap = new HashMap<>();
        for (StockMovement m : movements) {
            if (m.getEmployee() != null) {
                UUID empId = m.getEmployee().getId();
                MovementsReportDTO.EmployeeMovementSummaryDTO summary = employeeMap.getOrDefault(empId,
                        MovementsReportDTO.EmployeeMovementSummaryDTO.builder()
                                .employeeId(empId.toString())
                                .employeeName(m.getEmployeeName())
                                .movementCount(0L)
                                .totalQuantity(0)
                                .itemsReceived(new ArrayList<>())
                                .build());

                summary.setMovementCount(summary.getMovementCount() + 1);
                summary.setTotalQuantity(summary.getTotalQuantity() + m.getQuantity());
                if (!summary.getItemsReceived().contains(m.getStockItem().getName())) {
                    summary.getItemsReceived().add(m.getStockItem().getName());
                }
                employeeMap.put(empId, summary);
            }
        }

        List<MovementsReportDTO.EmployeeMovementSummaryDTO> topEmployees = employeeMap.values().stream()
                .sorted((a, b) -> Long.compare(b.getMovementCount(), a.getMovementCount()))
                .limit(10)
                .collect(Collectors.toList());

        List<MovementSummaryDTO> movementsDTO = movements.stream()
                .map(this::convertToMovementSummaryDTO)
                .collect(Collectors.toList());

        return MovementsReportDTO.builder()
                .startDate(startDate)
                .endDate(endDate)
                .totalMovements(totalMovements)
                .totalEntries(totalEntries)
                .totalExits(totalExits)
                .totalQuantityEntered(totalQuantityEntered)
                .totalQuantityExited(totalQuantityExited)
                .totalCostEntered(totalCostEntered)
                .totalCostExited(totalCostExited)
                .movements(movementsDTO)
                .movementsByType(movementsByType)
                .movementsByReason(movementsByReason)
                .movementsByDay(movementsByDay)
                .movementsByMonth(movementsByMonth)
                .topMovedItems(topMovedItems)
                .topEmployees(topEmployees)
                .build();
    }

    @Transactional(readOnly = true)
    public LowStockReportDTO getLowStockReport() {
        log.info("Gerando relatório de estoque baixo");

        List<StockItem> allItems = stockItemRepository.findByActiveTrue();
        List<StockItem> lowStockItems = stockItemRepository.findLowStockItems();
        List<StockItem> outOfStockItems = stockItemRepository.findOutOfStockItems();

        // Itens críticos (estoque <= 10% do mínimo)
        List<StockItem> criticalItems = allItems.stream()
                .filter(item -> item.getMinimumQuantity() > 0 &&
                        item.getCurrentQuantity() <= (item.getMinimumQuantity() * 0.1))
                .collect(Collectors.toList());

        BigDecimal totalValueAtRisk = lowStockItems.stream()
                .filter(item -> item.getUnitCost() != null)
                .map(item -> item.getUnitCost().multiply(BigDecimal.valueOf(item.getCurrentQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<StockItemReportDTO> itemsDTO = lowStockItems.stream()
                .map(item -> convertToItemReportDTO(item, false))
                .collect(Collectors.toList());

        List<StockItemReportDTO> criticalItemsDTO = criticalItems.stream()
                .map(item -> convertToItemReportDTO(item, false))
                .collect(Collectors.toList());

        List<StockItemReportDTO> outOfStockItemsDTO = outOfStockItems.stream()
                .map(item -> convertToItemReportDTO(item, false))
                .collect(Collectors.toList());

        return LowStockReportDTO.builder()
                .totalItems((long) allItems.size())
                .lowStockItems((long) lowStockItems.size())
                .outOfStockItems((long) outOfStockItems.size())
                .criticalItems((long) criticalItems.size())
                .totalValueAtRisk(totalValueAtRisk)
                .items(itemsDTO)
                .criticalItemsList(criticalItemsDTO)
                .outOfStockItemsList(outOfStockItemsDTO)
                .build();
    }

    @Transactional(readOnly = true)
    public DateRangeReportDTO getDateRangeReport(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Gerando relatório por período de {} até {}", startDate, endDate);

        List<StockMovement> movements = stockMovementRepository.findByMovementDateBetweenOrderByMovementDateDesc(
                startDate, endDate);

        long totalMovements = movements.size();
        long totalEntries = movements.stream().filter(m -> m.getMovementType() == MovementType.ENTRADA).count();
        long totalExits = movements.stream().filter(m -> m.getMovementType() == MovementType.SAIDA).count();

        int totalQuantityEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        int totalQuantityExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        BigDecimal totalCostEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCostExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Resumo diário
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, DateRangeReportDTO.DailySummaryDTO> dailySummaries = new HashMap<>();
        for (StockMovement m : movements) {
            String dateKey = m.getMovementDate().format(dayFormatter);
            DateRangeReportDTO.DailySummaryDTO daily = dailySummaries.getOrDefault(dateKey,
                    DateRangeReportDTO.DailySummaryDTO.builder()
                            .date(dateKey)
                            .movements(0L)
                            .entries(0)
                            .exits(0)
                            .costEntered(BigDecimal.ZERO)
                            .costExited(BigDecimal.ZERO)
                            .build());

            daily.setMovements(daily.getMovements() + 1);
            if (m.getMovementType() == MovementType.ENTRADA) {
                daily.setEntries(daily.getEntries() + m.getQuantity());
                if (m.getTotalCost() != null) {
                    daily.setCostEntered(daily.getCostEntered().add(m.getTotalCost()));
                }
            } else {
                daily.setExits(daily.getExits() + m.getQuantity());
                if (m.getTotalCost() != null) {
                    daily.setCostExited(daily.getCostExited().add(m.getTotalCost()));
                }
            }
            dailySummaries.put(dateKey, daily);
        }

        // Resumo mensal
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        Map<String, DateRangeReportDTO.MonthlySummaryDTO> monthlySummaries = new HashMap<>();
        for (StockMovement m : movements) {
            String monthKey = m.getMovementDate().format(monthFormatter);
            DateRangeReportDTO.MonthlySummaryDTO monthly = monthlySummaries.getOrDefault(monthKey,
                    DateRangeReportDTO.MonthlySummaryDTO.builder()
                            .month(monthKey)
                            .movements(0L)
                            .entries(0)
                            .exits(0)
                            .costEntered(BigDecimal.ZERO)
                            .costExited(BigDecimal.ZERO)
                            .build());

            monthly.setMovements(monthly.getMovements() + 1);
            if (m.getMovementType() == MovementType.ENTRADA) {
                monthly.setEntries(monthly.getEntries() + m.getQuantity());
                if (m.getTotalCost() != null) {
                    monthly.setCostEntered(monthly.getCostEntered().add(m.getTotalCost()));
                }
            } else {
                monthly.setExits(monthly.getExits() + m.getQuantity());
                if (m.getTotalCost() != null) {
                    monthly.setCostExited(monthly.getCostExited().add(m.getTotalCost()));
                }
            }
            monthlySummaries.put(monthKey, monthly);
        }

        // Itens com movimentações
        Set<UUID> itemIds = movements.stream()
                .map(m -> m.getStockItem().getId())
                .collect(Collectors.toSet());

        List<StockItemReportDTO> itemsWithMovements = itemIds.stream()
                .map(id -> {
                    StockItem item = stockItemRepository.findById(id).orElse(null);
                    return item != null ? convertToItemReportDTO(item, true) : null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // Resumo por categoria
        Map<StockCategory, DateRangeReportDTO.CategorySummaryDTO> categoryMap = new HashMap<>();
        for (StockMovement m : movements) {
            StockCategory category = m.getStockItem().getCategory();
            DateRangeReportDTO.CategorySummaryDTO summary = categoryMap.getOrDefault(category,
                    DateRangeReportDTO.CategorySummaryDTO.builder()
                            .category(category.name())
                            .totalMovements(0L)
                            .totalQuantity(0)
                            .totalCost(BigDecimal.ZERO)
                            .itemsCount(0L)
                            .build());

            summary.setTotalMovements(summary.getTotalMovements() + 1);
            summary.setTotalQuantity(summary.getTotalQuantity() + m.getQuantity());
            if (m.getTotalCost() != null) {
                summary.setTotalCost(summary.getTotalCost().add(m.getTotalCost()));
            }
            categoryMap.put(category, summary);
        }

        // Contar itens únicos por categoria
        for (StockCategory category : categoryMap.keySet()) {
            long uniqueItems = movements.stream()
                    .filter(m -> m.getStockItem().getCategory() == category)
                    .map(m -> m.getStockItem().getId())
                    .distinct()
                    .count();
            categoryMap.get(category).setItemsCount(uniqueItems);
        }

        List<DateRangeReportDTO.CategorySummaryDTO> categorySummaries = new ArrayList<>(categoryMap.values());

        return DateRangeReportDTO.builder()
                .startDate(startDate)
                .endDate(endDate)
                .totalMovements(totalMovements)
                .totalEntries(totalEntries)
                .totalExits(totalExits)
                .totalQuantityEntered(totalQuantityEntered)
                .totalQuantityExited(totalQuantityExited)
                .totalCostEntered(totalCostEntered)
                .totalCostExited(totalCostExited)
                .dailySummaries(dailySummaries)
                .monthlySummaries(monthlySummaries)
                .itemsWithMovements(itemsWithMovements)
                .categorySummaries(categorySummaries)
                .build();
    }

    // ===== MÉTODOS AUXILIARES PARA RELATÓRIOS =====

    private MovementSummaryDTO convertToMovementSummaryDTO(StockMovement movement) {
        return MovementSummaryDTO.builder()
                .id(movement.getId())
                .movementDate(movement.getMovementDate())
                .movementType(movement.getMovementType())
                .reason(movement.getReason())
                .quantity(movement.getQuantity())
                .previousQuantity(movement.getPreviousQuantity())
                .newQuantity(movement.getNewQuantity())
                .unitCost(movement.getUnitCost())
                .totalCost(movement.getTotalCost())
                .employeeName(movement.getEmployeeName())
                .userName(movement.getUserName())
                .documentNumber(movement.getDocumentNumber())
                .itemName(movement.getStockItem().getName())
                .itemCode(movement.getStockItem().getCode())
                .build();
    }

    private StockItemReportDTO convertToItemReportDTO(StockItem item, boolean includeMovements) {
        List<StockMovement> movements = includeMovements
                ? stockMovementRepository.findByStockItemIdOrderByMovementDateDesc(item.getId())
                : new ArrayList<>();

        long totalMovements = movements.size();
        long totalEntries = movements.stream().filter(m -> m.getMovementType() == MovementType.ENTRADA).count();
        long totalExits = movements.stream().filter(m -> m.getMovementType() == MovementType.SAIDA).count();

        int totalQuantityEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        int totalQuantityExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA)
                .mapToInt(StockMovement::getQuantity)
                .sum();

        BigDecimal totalCostEntered = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCostExited = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA && m.getTotalCost() != null)
                .map(StockMovement::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime lastMovementDate = movements.isEmpty() ? null : movements.get(0).getMovementDate();

        String status = item.getCurrentQuantity() == 0 ? "OUT"
                : item.getCurrentQuantity() <= item.getMinimumQuantity() ? "LOW"
                        : item.getCurrentQuantity() > (item.getMinimumQuantity() * 3) ? "OVER" : "NORMAL";

        BigDecimal totalValue = item.getUnitCost() != null && item.getCurrentQuantity() != null
                ? item.getUnitCost().multiply(BigDecimal.valueOf(item.getCurrentQuantity()))
                : BigDecimal.ZERO;

        List<MovementSummaryDTO> recentMovementsDTO = includeMovements
                ? movements.stream()
                        .limit(10)
                        .map(this::convertToMovementSummaryDTO)
                        .collect(Collectors.toList())
                : new ArrayList<>();

        return StockItemReportDTO.builder()
                .id(item.getId())
                .code(item.getCode())
                .name(item.getName())
                .category(item.getCategory())
                .sizeVariation(item.getSizeVariation())
                .currentQuantity(item.getCurrentQuantity())
                .minimumQuantity(item.getMinimumQuantity())
                .unitCost(item.getUnitCost())
                .totalValue(totalValue)
                .supplier(item.getSupplier())
                .unitName(item.getUnit() != null ? item.getUnit().getName() : null)
                .lastMovementDate(lastMovementDate)
                .totalMovements(totalMovements)
                .totalEntries(totalEntries)
                .totalExits(totalExits)
                .totalQuantityEntered(totalQuantityEntered)
                .totalQuantityExited(totalQuantityExited)
                .totalCostEntered(totalCostEntered)
                .totalCostExited(totalCostExited)
                .status(status)
                .recentMovements(recentMovementsDTO)
                .build();
    }

    // ===== MÉTODOS AUXILIARES =====

    private void checkAndCreateLowStockAlert(StockItem item) {
        // Verificar se já existe alerta ativo para este item
        boolean hasActiveAlert = stockAlertRepository.existsByStockItemIdAndAlertTypeAndIsResolvedFalse(
                item.getId(), "LOW_STOCK");

        if (item.isLowStock() && !hasActiveAlert) {
            // Criar alerta de baixo estoque
            StockAlert alert = new StockAlert();
            alert.setStockItem(item);
            alert.setAlertType("LOW_STOCK");
            alert.setMessage(String.format("Item '%s' com baixo estoque: %d unidades (mínimo: %d)",
                    item.getFullName(), item.getCurrentQuantity(), item.getMinimumQuantity()));
            alert.setCurrentQuantity(item.getCurrentQuantity());
            alert.setMinimumQuantity(item.getMinimumQuantity());
            alert.setPriority(item.getCurrentQuantity() == 0 ? 4 : 3); // Crítica se zerado, alta se baixo

            stockAlertRepository.save(alert);
            log.info("Alerta de baixo estoque criado para item: {}", item.getFullName());
        }

        // Se não está mais em baixo estoque, resolver alertas ativos
        if (!item.isLowStock() && hasActiveAlert) {
            List<StockAlert> activeAlerts = stockAlertRepository.findByStockItemIdAndIsResolvedFalse(item.getId());
            for (StockAlert alert : activeAlerts) {
                if ("LOW_STOCK".equals(alert.getAlertType())) {
                    alert.setIsResolved(true);
                    alert.setResolvedAt(LocalDateTime.now());
                    stockAlertRepository.save(alert);
                    log.info("Alerta de baixo estoque resolvido automaticamente para item: {}", item.getFullName());
                }
            }
        }
    }

    // ===== MÉTODOS ESPECÍFICOS =====

    public List<StockItemDTO> getLowStockItems() {
        return stockItemRepository.findLowStockItems().stream()
                .map(StockItemDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<StockItemDTO> getItemsByCategory(StockCategory category) {
        return stockItemRepository.findByCategoryAndActiveTrue(category).stream()
                .map(StockItemDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<StockMovementDTO> getRecentMovements(int limit) {
        try {
            log.info("Buscando as {} movimentações mais recentes...", limit);
            List<StockMovement> recentMovements = stockMovementRepository.findRecentMovements(
                org.springframework.data.domain.PageRequest.of(0, limit));
            log.info("Encontrados {} movimentações recentes", recentMovements.size());

            return recentMovements.stream()
                    .map(movement -> {
                        try {
                            return StockMovementDTO.fromEntity(movement);
                        } catch (Exception e) {
                            log.error("Erro ao converter movimentação {}: {}", movement.getId(), e.getMessage());
                            return null;
                        }
                    })
                    .filter(movement -> movement != null)
                    .limit(limit)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Erro ao buscar movimentações recentes: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    public List<StockMovementDTO> getMovementsByDateRange(LocalDateTime start, LocalDateTime end) {
        log.info("Buscando movimentações de {} até {}", start, end);
        return stockMovementRepository.findByMovementDateBetweenOrderByMovementDateDesc(start, end)
                .stream()
                .map(StockMovementDTO::fromEntity)
                .collect(Collectors.toList());
    }
}
