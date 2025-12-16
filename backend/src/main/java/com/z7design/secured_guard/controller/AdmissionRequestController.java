package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.AdmissionRequestDTO;
import com.z7design.secured_guard.dto.CreateAdmissionRequestDTO;
import com.z7design.secured_guard.model.enums.AdmissionRequestStatus;
import com.z7design.secured_guard.model.enums.AdmissionRequestType;
import com.z7design.secured_guard.service.AdmissionRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admission-requests")
@RequiredArgsConstructor
@Tag(name = "Admission Requests", description = "API para gerenciamento de solicitações de admissão e demissão")
public class AdmissionRequestController {
    
    private final AdmissionRequestService admissionRequestService;
    
    /**
     * Valida e converte uma string para UUID
     * @param id String a ser convertida
     * @return UUID válido
     * @throws IllegalArgumentException se o formato não for válido
     */
    private UUID parseUUID(String id) {
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("ID inválido. Esperado formato UUID, recebido: " + id);
        }
    }
    
    @GetMapping
    @Operation(summary = "Listar solicitações", description = "Lista todas as solicitações de admissão/demissão")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> list() {
        List<AdmissionRequestDTO> requests = admissionRequestService.findAll();
        return ResponseEntity.ok(requests);
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar solicitação por ID", description = "Retorna uma solicitação específica")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<AdmissionRequestDTO> findById(@PathVariable String id) {
        AdmissionRequestDTO request = admissionRequestService.findById(parseUUID(id));
        return ResponseEntity.ok(request);
    }
    
    @PostMapping
    @Operation(summary = "Criar solicitação", description = "Cria uma nova solicitação de admissão ou demissão")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<AdmissionRequestDTO> create(@Valid @RequestBody CreateAdmissionRequestDTO dto) {
        AdmissionRequestDTO createdRequest = admissionRequestService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRequest);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar solicitação", description = "Atualiza uma solicitação existente")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<AdmissionRequestDTO> update(
            @PathVariable String id,
            @Valid @RequestBody CreateAdmissionRequestDTO dto) {
        AdmissionRequestDTO updatedRequest = admissionRequestService.update(UUID.fromString(id), dto);
        return ResponseEntity.ok(updatedRequest);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir solicitação", description = "Exclui uma solicitação")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        admissionRequestService.delete(parseUUID(id));
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/approve")
    @Operation(summary = "Aprovar solicitação", description = "Aprova uma solicitação pendente")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<AdmissionRequestDTO> approve(
            @PathVariable String id,
            @RequestParam(required = false) String approverName,
            @RequestParam(required = false) String approvalNotes) {
        AdmissionRequestDTO approvedRequest = admissionRequestService.approve(
            parseUUID(id),
            approverName,
            approvalNotes
        );
        return ResponseEntity.ok(approvedRequest);
    }
    
    @PostMapping("/{id}/reject")
    @Operation(summary = "Rejeitar solicitação", description = "Rejeita uma solicitação pendente")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<AdmissionRequestDTO> reject(
            @PathVariable String id,
            @RequestParam String rejectorName,
            @RequestParam String rejectionReason) {
        AdmissionRequestDTO rejectedRequest = admissionRequestService.reject(
            parseUUID(id),
            rejectorName,
            rejectionReason
        );
        return ResponseEntity.ok(rejectedRequest);
    }
    
    @PostMapping("/{id}/complete")
    @Operation(summary = "Completar solicitação", description = "Marca uma solicitação aprovada como completada")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<AdmissionRequestDTO> complete(@PathVariable String id) {
        AdmissionRequestDTO completedRequest = admissionRequestService.complete(parseUUID(id));
        return ResponseEntity.ok(completedRequest);
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar por status", description = "Lista solicitações por status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> findByStatus(@PathVariable String status) {
        AdmissionRequestStatus requestStatus = AdmissionRequestStatus.valueOf(status.toUpperCase());
        List<AdmissionRequestDTO> requests = admissionRequestService.findByStatus(requestStatus);
        return ResponseEntity.ok(requests);
    }
    
    @GetMapping("/type/{type}")
    @Operation(summary = "Buscar por tipo", description = "Lista solicitações por tipo (ADMISSION ou DISMISSAL)")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> findByType(@PathVariable String type) {
        AdmissionRequestType requestType = AdmissionRequestType.valueOf(type.toUpperCase());
        List<AdmissionRequestDTO> requests = admissionRequestService.findByType(requestType);
        return ResponseEntity.ok(requests);
    }
    
    @GetMapping("/priority/{priority}")
    @Operation(summary = "Buscar por prioridade", description = "Lista solicitações por prioridade")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> findByPriority(@PathVariable String priority) {
        // Implementar se necessário
        return ResponseEntity.ok(List.of());
    }
    
    @GetMapping("/requester/{requesterId}")
    @Operation(summary = "Buscar por solicitante", description = "Lista solicitações de um solicitante específico")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> findByRequester(@PathVariable String requesterId) {
        // Implementar se necessário
        return ResponseEntity.ok(List.of());
    }
    
    @GetMapping("/approver/{approverId}")
    @Operation(summary = "Buscar por aprovador", description = "Lista solicitações de um aprovador específico")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> findByApprover(@PathVariable String approverId) {
        // Implementar se necessário
        return ResponseEntity.ok(List.of());
    }
    
    @GetMapping("/unit/{unitId}")
    @Operation(summary = "Buscar por unidade", description = "Lista solicitações de uma unidade específica")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> findByUnit(@PathVariable String unitId) {
        // Implementar se necessário
        return ResponseEntity.ok(List.of());
    }
    
    @GetMapping("/pending-approval")
    @Operation(summary = "Buscar pendentes de aprovação", description = "Lista solicitações pendentes de aprovação")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> findPendingApproval() {
        List<AdmissionRequestDTO> requests = admissionRequestService.findPendingApprovalRequests();
        return ResponseEntity.ok(requests);
    }
    
    @GetMapping("/search")
    @Operation(summary = "Buscar com filtros", description = "Busca solicitações com filtros opcionais")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<List<AdmissionRequestDTO>> search(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<AdmissionRequestDTO> requests = admissionRequestService.searchRequests(
            type,
            searchTerm,
            startDate,
            endDate
        );
        return ResponseEntity.ok(requests);
    }
    
    @GetMapping("/stats/count/{status}")
    @Operation(summary = "Contar por status", description = "Retorna a quantidade de solicitações por status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<Long> countByStatus(@PathVariable String status) {
        AdmissionRequestStatus requestStatus = AdmissionRequestStatus.valueOf(status.toUpperCase());
        long count = admissionRequestService.countByStatus(requestStatus);
        return ResponseEntity.ok(count);
    }
    
    @GetMapping("/stats/type-count/{type}")
    @Operation(summary = "Contar por tipo", description = "Retorna a quantidade de solicitações por tipo")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RH')")
    public ResponseEntity<Long> countByType(@PathVariable String type) {
        AdmissionRequestType requestType = AdmissionRequestType.valueOf(type.toUpperCase());
        long count = admissionRequestService.countByType(requestType);
        return ResponseEntity.ok(count);
    }
}


