package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormItemDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EmployeeChangeHistory;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.PersonalProtectiveEquipment;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeChangeHistoryRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.PersonalProtectiveEquipmentRepository;
import com.z7design.secured_guard.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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

    @Transactional
    public EPIDeliveryFormDTO create(CreateEPIDeliveryFormDTO dto, UUID createdByUserId) {
        log.info("📝 Criando nova ficha de entrega de EPI para funcionário: {}", dto.getEmployeeId());

        // Buscar entidades relacionadas
        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado com id: " + dto.getEmployeeId()));

        Company company = companyRepository.findById(dto.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com id: " + dto.getCompanyId()));

        Employee responsibleEmployee = null;
        if (dto.getResponsibleEmployeeId() != null) {
            responsibleEmployee = employeeRepository.findById(dto.getResponsibleEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Funcionário responsável não encontrado com id: " + dto.getResponsibleEmployeeId()));
        }

        User createdBy = null;
        if (createdByUserId != null) {
            createdBy = userRepository.findById(createdByUserId)
                    .orElse(null);
        }

        // Capturar setor do funcionário (snapshot)
        String workSectorSnapshot = buildWorkSectorSnapshot(employee);

        // Determinar tipo de entrega
        EPIDeliveryType deliveryType = dto.getDeliveryType() != null
                ? dto.getDeliveryType()
                : EPIDeliveryType.PRIMEIRA_ENTREGA;

        // Criar ficha
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
                .build();

        // Adicionar itens e dar baixa no estoque
        StringBuilder itemsSummary = new StringBuilder();
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (EPIDeliveryFormItemDTO itemDto : dto.getItems()) {
                String epiName = itemDto.getEpiName();
                if (epiName == null || epiName.trim().isEmpty()) {
                    log.warn("⚠️ Item de EPI sem nome informado. Usando valor padrão.");
                    epiName = "EPI";
                }
                Integer quantity = itemDto.getQuantity() != null ? itemDto.getQuantity() : 1;
                
                // Buscar EPI pelo nome no estoque
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
                
                // Se encontrou o EPI no estoque, verificar e dar baixa
                if (epi != null) {
                    Integer availableStock = epi.getCurrentStock();

                    if (availableStock == null) {
                        log.warn("⚠️ Estoque atual do EPI '{}' está indefinido. Entrega registrada sem baixa.", epiName);
                    } else if (availableStock < quantity) {
                        log.warn("⚠️ Estoque insuficiente para o EPI '{}'. Disponível: {}, Solicitado: {}. Entrega registrada sem baixa.",
                            epiName, availableStock, quantity);
                    } else {
                        Integer newStock = availableStock - quantity;
                        epi.setCurrentStock(newStock);
                        epiRepository.save(epi);

                        log.info("📦 Baixa no estoque: EPI '{}' - Quantidade: {} - Estoque anterior: {} - Estoque atual: {}",
                            epiName, quantity, availableStock, newStock);

                        if (epi.getMinimumStock() != null && newStock <= epi.getMinimumStock()) {
                            log.warn("⚠️ Estoque baixo para o EPI '{}': {} unidades (mínimo: {})",
                                epiName, newStock, epi.getMinimumStock());
                        }
                    }
                } else {
                    log.warn("⚠️ EPI '{}' não encontrado no estoque. Entrega registrada sem baixa no estoque.", epiName);
                }
                
                // Criar item da ficha
                EPIDeliveryFormItem item = EPIDeliveryFormItem.builder()
                        .deliveryForm(form)
                        .epiName(epiName)
                        .quantity(quantity)
                        .ca(itemDto.getCa())
                        .caName(itemDto.getCaName())
                        .validityDate(itemDto.getValidityDate())
                        .uniformType(itemDto.getUniformType())
                        .uniformPiece(itemDto.getUniformPiece())
                        .observations(itemDto.getObservations())
                        .build();
                form.getItems().add(item);

                // Construir resumo para histórico
                if (itemsSummary.length() > 0) itemsSummary.append(", ");
                itemsSummary.append(quantity).append("x ").append(epiName);
                if (itemDto.getCa() != null && !itemDto.getCa().isBlank()) {
                    itemsSummary.append(" (CA: ").append(itemDto.getCa()).append(")");
                }
            }
        }

        EPIDeliveryForm savedForm = epiDeliveryFormRepository.save(form);
        log.info("✅ Ficha de entrega de EPI criada com sucesso: {}", savedForm.getId());

        // Registrar no histórico do funcionário
        String historyDetail = String.format(
                "Tipo: %s | Data: %s | Itens: %s | Setor: %s | Empresa: %s",
                deliveryType.getDescription(),
                dto.getDeliveryDate(),
                itemsSummary.toString(),
                workSectorSnapshot != null ? workSectorSnapshot : "—",
                company.getName());
        if (responsibleEmployee != null) {
            historyDetail += " | Responsável: " + responsibleEmployee.getName();
        }

        recordHistory(
                employee.getId(),
                createdBy,
                "ENTREGA_EPI",
                "Ficha de Entrega de EPI (" + deliveryType.getDescription() + ")",
                historyDetail,
                dto.getObservations());

        return EPIDeliveryFormDTO.fromEntity(savedForm);
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
        
        // Devolver itens ao estoque antes de deletar
        if (form.getItems() != null && !form.getItems().isEmpty()) {
            for (EPIDeliveryFormItem item : form.getItems()) {
                String epiName = item.getEpiName();
                Integer quantity = item.getQuantity() != null ? item.getQuantity() : 1;
                
                // Buscar EPI pelo nome no estoque
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
                
                // Se encontrou o EPI, devolver ao estoque
                if (epi != null) {
                    Integer currentStock = epi.getCurrentStock();
                    Integer newStock = currentStock + quantity;
                    epi.setCurrentStock(newStock);
                    epiRepository.save(epi);
                    
                    log.info("📦 Devolução ao estoque: EPI '{}' - Quantidade: {} - Estoque anterior: {} - Estoque atual: {}", 
                        epiName, quantity, currentStock, newStock);
                } else {
                    log.warn("⚠️ EPI '{}' não encontrado no estoque. Não foi possível devolver ao estoque.", epiName);
                }
            }
        }
        
        epiDeliveryFormRepository.deleteById(id);
        log.info("🗑️ Ficha de entrega de EPI deletada: {}", id);
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
