package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateServiceDTO;
import com.z7design.secured_guard.dto.ServiceDTO;
import com.z7design.secured_guard.dto.UpdateServiceDTO;
import com.z7design.secured_guard.model.Service;
import com.z7design.secured_guard.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ServiceService {
    
    private final ServiceRepository serviceRepository;
    
    // ===== CRUD OPERATIONS =====
    
    @Transactional(readOnly = true)
    public List<ServiceDTO> findAll() {
        log.info("Buscando todos os serviços");
        List<Service> services = serviceRepository.findAllOrderByName();
        return services.stream()
                .map(ServiceDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public Page<ServiceDTO> findAll(Pageable pageable) {
        log.info("Buscando serviços com paginação");
        Page<Service> services = serviceRepository.findAllOrderByName(pageable);
        return services.map(ServiceDTO::fromEntity);
    }
    
    @Transactional(readOnly = true)
    public ServiceDTO findById(UUID id) {
        log.info("Buscando serviço por ID: {}", id);
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado com ID: " + id));
        return ServiceDTO.fromEntity(service);
    }
    
    @Transactional(readOnly = true)
    public ServiceDTO findByCode(String code) {
        log.info("Buscando serviço por código: {}", code);
        Service service = serviceRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado com código: " + code));
        return ServiceDTO.fromEntity(service);
    }
    
    public ServiceDTO create(CreateServiceDTO dto) {
        log.info("Criando novo serviço: {}", dto.getName());
        
        // Verificar se o código já existe
        if (dto.getCode() != null && serviceRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Já existe um serviço com o código: " + dto.getCode());
        }
        
        Service service = Service.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .code(dto.getCode())
                .unitPrice(dto.getUnitPrice())
                .unit(dto.getUnit())
                .status(Service.ServiceStatus.ACTIVE)
                .isBillable(dto.getIsBillable() != null ? dto.getIsBillable() : true)
                .requiresEquipment(dto.getRequiresEquipment() != null ? dto.getRequiresEquipment() : false)
                .requiresCertification(dto.getRequiresCertification() != null ? dto.getRequiresCertification() : false)
                .estimatedDurationHours(dto.getEstimatedDurationHours())
                .minEmployeesRequired(dto.getMinEmployeesRequired() != null ? dto.getMinEmployeesRequired() : 1)
                .maxEmployeesAllowed(dto.getMaxEmployeesAllowed())
                .notes(dto.getNotes())
                .createdBy(dto.getCreatedBy())
                .build();
        
        Service savedService = serviceRepository.save(service);
        log.info("Serviço criado com sucesso: {}", savedService.getId());
        
        return ServiceDTO.fromEntity(savedService);
    }
    
    public ServiceDTO update(UUID id, UpdateServiceDTO dto) {
        log.info("Atualizando serviço: {}", id);
        
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado com ID: " + id));
        
        // Verificar se o código já existe em outro serviço
        if (dto.getCode() != null && !service.getCode().equals(dto.getCode()) && 
            serviceRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Já existe um serviço com o código: " + dto.getCode());
        }
        
        service.setName(dto.getName());
        service.setDescription(dto.getDescription());
        service.setCategory(dto.getCategory());
        service.setCode(dto.getCode());
        service.setUnitPrice(dto.getUnitPrice());
        service.setUnit(dto.getUnit());
        if (dto.getStatus() != null) {
            service.setStatus(dto.getStatus());
        }
        if (dto.getIsBillable() != null) {
            service.setIsBillable(dto.getIsBillable());
        }
        if (dto.getRequiresEquipment() != null) {
            service.setRequiresEquipment(dto.getRequiresEquipment());
        }
        if (dto.getRequiresCertification() != null) {
            service.setRequiresCertification(dto.getRequiresCertification());
        }
        service.setEstimatedDurationHours(dto.getEstimatedDurationHours());
        if (dto.getMinEmployeesRequired() != null) {
            service.setMinEmployeesRequired(dto.getMinEmployeesRequired());
        }
        service.setMaxEmployeesAllowed(dto.getMaxEmployeesAllowed());
        service.setNotes(dto.getNotes());
        service.setUpdatedBy(dto.getUpdatedBy());
        
        Service savedService = serviceRepository.save(service);
        log.info("Serviço atualizado com sucesso: {}", savedService.getId());
        
        return ServiceDTO.fromEntity(savedService);
    }
    
    public void delete(UUID id) {
        log.info("Excluindo serviço: {}", id);
        
        Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Serviço não encontrado com ID: " + id));
        
        serviceRepository.delete(service);
        log.info("Serviço excluído com sucesso: {}", id);
    }
    
    // ===== FILTERED SEARCHES =====
    
    @Transactional(readOnly = true)
    public List<ServiceDTO> findByFilters(Service.ServiceStatus status, String category, 
                                         Boolean isBillable, String searchTerm) {
        log.info("Buscando serviços com filtros - status: {}, category: {}, isBillable: {}, searchTerm: {}", 
                status, category, isBillable, searchTerm);
        
        List<Service> services = serviceRepository.findByFiltersList(status, category, isBillable, searchTerm);
        return services.stream()
                .map(ServiceDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public Page<ServiceDTO> findByFilters(Service.ServiceStatus status, String category, 
                                         Boolean isBillable, String searchTerm, Pageable pageable) {
        log.info("Buscando serviços com filtros paginados - status: {}, category: {}, isBillable: {}, searchTerm: {}", 
                status, category, isBillable, searchTerm);
        
        Page<Service> services = serviceRepository.findByFilters(status, category, isBillable, searchTerm, pageable);
        return services.map(ServiceDTO::fromEntity);
    }
    
    // ===== SPECIFIC SEARCHES =====
    
    @Transactional(readOnly = true)
    public List<ServiceDTO> findActiveServices() {
        log.info("Buscando serviços ativos");
        List<Service> services = serviceRepository.findActiveServices();
        return services.stream()
                .map(ServiceDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ServiceDTO> findBillableServices() {
        log.info("Buscando serviços faturáveis");
        List<Service> services = serviceRepository.findBillableServices();
        return services.stream()
                .map(ServiceDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ServiceDTO> findByCategory(String category) {
        log.info("Buscando serviços por categoria: {}", category);
        List<Service> services = serviceRepository.findByCategory(category);
        return services.stream()
                .map(ServiceDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ServiceDTO> findServicesRequiringEquipment() {
        log.info("Buscando serviços que requerem equipamento");
        List<Service> services = serviceRepository.findServicesRequiringEquipment();
        return services.stream()
                .map(ServiceDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<ServiceDTO> findServicesRequiringCertification() {
        log.info("Buscando serviços que requerem certificação");
        List<Service> services = serviceRepository.findServicesRequiringCertification();
        return services.stream()
                .map(ServiceDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    // ===== UTILITY METHODS =====
    
    @Transactional(readOnly = true)
    public List<String> getDistinctCategories() {
        log.info("Buscando categorias distintas");
        return serviceRepository.findDistinctCategories();
    }
    
    @Transactional(readOnly = true)
    public Long countByStatus(Service.ServiceStatus status) {
        return serviceRepository.countByStatus(status);
    }
    
    @Transactional(readOnly = true)
    public Long countActiveServices() {
        return serviceRepository.countActiveServices();
    }
    
    @Transactional(readOnly = true)
    public Long countBillableServices() {
        return serviceRepository.countBillableServices();
    }
    
    @Transactional(readOnly = true)
    public boolean existsByCode(String code) {
        return serviceRepository.existsByCode(code);
    }
}
