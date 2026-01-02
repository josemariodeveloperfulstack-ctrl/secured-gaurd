package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormItemDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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

        // Criar ficha
        EPIDeliveryForm form = EPIDeliveryForm.builder()
                .employee(employee)
                .company(company)
                .deliveryDate(dto.getDeliveryDate())
                .responsibleEmployee(responsibleEmployee)
                .observations(dto.getObservations())
                .pdfUrl(dto.getPdfUrl())
                .createdBy(createdBy)
                .build();

        // Adicionar itens
        if (dto.getItems() != null && !dto.getItems().isEmpty()) {
            for (EPIDeliveryFormItemDTO itemDto : dto.getItems()) {
                EPIDeliveryFormItem item = EPIDeliveryFormItem.builder()
                        .deliveryForm(form)
                        .epiName(itemDto.getEpiName())
                        .quantity(itemDto.getQuantity() != null ? itemDto.getQuantity() : 1)
                        .ca(itemDto.getCa())
                        .validityDate(itemDto.getValidityDate())
                        .uniformType(itemDto.getUniformType())
                        .uniformPiece(itemDto.getUniformPiece())
                        .observations(itemDto.getObservations())
                        .build();
                form.getItems().add(item);
            }
        }

        EPIDeliveryForm savedForm = epiDeliveryFormRepository.save(form);
        log.info("✅ Ficha de entrega de EPI criada com sucesso: {}", savedForm.getId());

        return EPIDeliveryFormDTO.fromEntity(savedForm);
    }

    public EPIDeliveryFormDTO findById(UUID id) {
        EPIDeliveryForm form = epiDeliveryFormRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + id));
        return EPIDeliveryFormDTO.fromEntity(form);
    }

    public Page<EPIDeliveryFormDTO> findAll(Pageable pageable) {
        return epiDeliveryFormRepository.findAll(pageable)
                .map(EPIDeliveryFormDTO::fromEntity);
    }

    public Page<EPIDeliveryFormDTO> findByFilters(UUID employeeId, UUID companyId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        return epiDeliveryFormRepository.findByFilters(employeeId, companyId, startDate, endDate, pageable)
                .map(EPIDeliveryFormDTO::fromEntity);
    }

    public List<EPIDeliveryFormDTO> findByEmployeeId(UUID employeeId) {
        return epiDeliveryFormRepository.findByEmployeeId(employeeId).stream()
                .map(EPIDeliveryFormDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<EPIDeliveryFormDTO> findByCompanyId(UUID companyId) {
        return epiDeliveryFormRepository.findByCompanyId(companyId).stream()
                .map(EPIDeliveryFormDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void delete(UUID id) {
        if (!epiDeliveryFormRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ficha de entrega de EPI não encontrada com id: " + id);
        }
        epiDeliveryFormRepository.deleteById(id);
        log.info("🗑️ Ficha de entrega de EPI deletada: {}", id);
    }
}


