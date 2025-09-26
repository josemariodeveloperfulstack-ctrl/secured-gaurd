package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.*;
import com.z7design.secured_guard.model.Service;
import com.z7design.secured_guard.service.ServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/services")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Services", description = "API para gerenciamento de serviços")
public class ServiceController {
    
    private final ServiceService serviceService;
    
    // ===== CRUD OPERATIONS =====
    
    @GetMapping
    @Operation(summary = "Listar serviços", description = "Lista todos os serviços com filtros opcionais")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<ServiceDTO>> list(
            @Parameter(description = "Status do serviço") 
            @RequestParam(required = false) Service.ServiceStatus status,
            @Parameter(description = "Categoria do serviço") 
            @RequestParam(required = false) String category,
            @Parameter(description = "Se é faturável") 
            @RequestParam(required = false) Boolean isBillable,
            @Parameter(description = "Termo de busca") 
            @RequestParam(required = false) String searchTerm) {
        
        log.info("Listando serviços - status: {}, category: {}, isBillable: {}, searchTerm: {}", 
                status, category, isBillable, searchTerm);
        
        List<ServiceDTO> services = serviceService.findByFilters(status, category, isBillable, searchTerm);
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/paginated")
    @Operation(summary = "Listar serviços paginados", description = "Lista serviços com paginação")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<Page<ServiceDTO>> listPaginated(
            @Parameter(description = "Status do serviço") 
            @RequestParam(required = false) Service.ServiceStatus status,
            @Parameter(description = "Categoria do serviço") 
            @RequestParam(required = false) String category,
            @Parameter(description = "Se é faturável") 
            @RequestParam(required = false) Boolean isBillable,
            @Parameter(description = "Termo de busca") 
            @RequestParam(required = false) String searchTerm,
            Pageable pageable) {
        
        log.info("Listando serviços paginados - status: {}, category: {}, isBillable: {}, searchTerm: {}", 
                status, category, isBillable, searchTerm);
        
        Page<ServiceDTO> services = serviceService.findByFilters(status, category, isBillable, searchTerm, pageable);
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/all")
    @Operation(summary = "Listar todos os serviços", description = "Lista todos os serviços sem filtros")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<ServiceDTO>> listAll() {
        log.info("Listando todos os serviços");
        List<ServiceDTO> services = serviceService.findAll();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/active")
    @Operation(summary = "Listar serviços ativos", description = "Lista apenas serviços ativos")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<ServiceDTO>> listActive() {
        log.info("Listando serviços ativos");
        List<ServiceDTO> services = serviceService.findActiveServices();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/billable")
    @Operation(summary = "Listar serviços faturáveis", description = "Lista apenas serviços faturáveis")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<ServiceDTO>> listBillable() {
        log.info("Listando serviços faturáveis");
        List<ServiceDTO> services = serviceService.findBillableServices();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar serviço por ID", description = "Retorna um serviço específico")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<ServiceDTO> findById(@PathVariable UUID id) {
        log.info("Buscando serviço por ID: {}", id);
        ServiceDTO service = serviceService.findById(id);
        return ResponseEntity.ok(service);
    }
    
    @GetMapping("/code/{code}")
    @Operation(summary = "Buscar serviço por código", description = "Retorna um serviço específico pelo código")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<ServiceDTO> findByCode(@PathVariable String code) {
        log.info("Buscando serviço por código: {}", code);
        ServiceDTO service = serviceService.findByCode(code);
        return ResponseEntity.ok(service);
    }
    
    @PostMapping
    @Operation(summary = "Criar serviço", description = "Cria um novo serviço")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<ServiceDTO> create(@Valid @RequestBody CreateServiceDTO dto) {
        log.info("Criando novo serviço: {}", dto.getName());
        
        // TODO: Obter ID do usuário logado do contexto de segurança
        UUID currentUserId = UUID.randomUUID(); // Temporário
        dto.setCreatedBy(currentUserId);
        
        ServiceDTO createdService = serviceService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdService);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar serviço", description = "Atualiza um serviço existente")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<ServiceDTO> update(
            @PathVariable UUID id, 
            @Valid @RequestBody UpdateServiceDTO dto) {
        log.info("Atualizando serviço: {}", id);
        
        // TODO: Obter ID do usuário logado do contexto de segurança
        UUID currentUserId = UUID.randomUUID(); // Temporário
        dto.setUpdatedBy(currentUserId);
        
        ServiceDTO updatedService = serviceService.update(id, dto);
        return ResponseEntity.ok(updatedService);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir serviço", description = "Exclui um serviço")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        log.info("Excluindo serviço: {}", id);
        serviceService.delete(id);
        return ResponseEntity.noContent().build();
    }
    
    // ===== SPECIFIC SEARCHES =====
    
    @GetMapping("/category/{category}")
    @Operation(summary = "Listar serviços por categoria", description = "Lista serviços de uma categoria específica")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<ServiceDTO>> findByCategory(@PathVariable String category) {
        log.info("Buscando serviços por categoria: {}", category);
        List<ServiceDTO> services = serviceService.findByCategory(category);
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/requiring-equipment")
    @Operation(summary = "Listar serviços que requerem equipamento", description = "Lista serviços que requerem equipamento")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<ServiceDTO>> findServicesRequiringEquipment() {
        log.info("Buscando serviços que requerem equipamento");
        List<ServiceDTO> services = serviceService.findServicesRequiringEquipment();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/requiring-certification")
    @Operation(summary = "Listar serviços que requerem certificação", description = "Lista serviços que requerem certificação")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<ServiceDTO>> findServicesRequiringCertification() {
        log.info("Buscando serviços que requerem certificação");
        List<ServiceDTO> services = serviceService.findServicesRequiringCertification();
        return ResponseEntity.ok(services);
    }
    
    // ===== UTILITY ENDPOINTS =====
    
    @GetMapping("/categories")
    @Operation(summary = "Listar categorias", description = "Lista todas as categorias distintas")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<List<String>> getCategories() {
        log.info("Listando categorias distintas");
        List<String> categories = serviceService.getDistinctCategories();
        return ResponseEntity.ok(categories);
    }
    
    @GetMapping("/statistics")
    @Operation(summary = "Estatísticas dos serviços", description = "Retorna estatísticas dos serviços")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<Object> getStatistics() {
        log.info("Gerando estatísticas dos serviços");
        
        return ResponseEntity.ok(Map.of(
            "totalServices", serviceService.countByStatus(null),
            "activeServices", serviceService.countActiveServices(),
            "billableServices", serviceService.countBillableServices(),
            "inactiveServices", serviceService.countByStatus(Service.ServiceStatus.INACTIVE)
        ));
    }
    
    @GetMapping("/exists/code/{code}")
    @Operation(summary = "Verificar se código existe", description = "Verifica se um código de serviço já existe")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('GESTOR')")
    public ResponseEntity<Object> existsByCode(@PathVariable String code) {
        log.info("Verificando se código existe: {}", code);
        boolean exists = serviceService.existsByCode(code);
        
        return ResponseEntity.ok(Map.of(
            "code", code,
            "exists", exists
        ));
    }
}
