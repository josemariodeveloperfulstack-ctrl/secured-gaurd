package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.OpportunityDTO;
import com.z7design.secured_guard.dto.OpportunityResponse;
import com.z7design.secured_guard.model.Opportunity;
import com.z7design.secured_guard.service.OpportunityService;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/opportunities")
@Validated
public class OpportunityController {
    @Autowired
    private OpportunityService opportunityService;

    // Converter Opportunity para OpportunityDTO (simplificado) - usado para criação/atualização
    private OpportunityDTO toDTO(Opportunity o) {
        OpportunityDTO dto = new OpportunityDTO();
        dto.setId(o.getId());
        dto.setTitle(o.getTitle());
        dto.setDescription(o.getDescription());
        dto.setClientId(o.getClient() != null ? o.getClient().getId() : null);
        dto.setLeadId(o.getLead() != null ? o.getLead().getId() : null);
        dto.setStatusId(o.getStatus() != null ? o.getStatus().getId() : null);
        dto.setAssignedToId(o.getAssignedTo() != null ? o.getAssignedTo().getId() : null);
        dto.setEstimatedValue(o.getEstimatedValue());
        dto.setCloseDate(o.getCloseDate());
        dto.setCreatedAt(o.getCreatedAt());
        dto.setUpdatedAt(o.getUpdatedAt());
        return dto;
    }
    
    private Opportunity fromDTO(OpportunityDTO dto) {
        Opportunity o = new Opportunity();
        o.setId(dto.getId());
        o.setTitle(dto.getTitle());
        o.setDescription(dto.getDescription());
        // Associações (Client, Lead, Status, AssignedTo) devem ser resolvidas no service
        o.setEstimatedValue(dto.getEstimatedValue());
        o.setCloseDate(dto.getCloseDate());
        return o;
    }

    @GetMapping
    public List<OpportunityResponse> getAll() {
        return opportunityService.findAllActive().stream()
                .map(OpportunityResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OpportunityResponse> getById(@PathVariable String id) {
        Optional<Opportunity> opportunity = opportunityService.findById(UUID.fromString(id));
        return opportunity.map(OpportunityResponse::fromEntity)
            .map(ResponseEntity::ok)
            .orElseThrow(() -> new ResourceNotFoundException("Oportunidade não encontrada"));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public OpportunityDTO create(@Valid @RequestBody OpportunityDTO dto) {
        Opportunity o = fromDTO(dto);
        Opportunity saved = opportunityService.create(
            o,
            dto.getStatusId(),
            dto.getLeadId(),
            dto.getClientId(),
            dto.getAssignedToId()
        );
        return toDTO(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<OpportunityDTO> update(@PathVariable String id, @Valid @RequestBody OpportunityDTO dto) {
        if (!opportunityService.findById(UUID.fromString(id)).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Opportunity o = fromDTO(dto);
        Opportunity saved = opportunityService.update(
            UUID.fromString(id),
            o,
            dto.getStatusId(),
            dto.getLeadId(),
            dto.getClientId(),
            dto.getAssignedToId()
        );
        return ResponseEntity.ok(toDTO(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestParam String reason) {
        if (!opportunityService.findById(UUID.fromString(id)).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        // Obter usuário logado (simulado ou via SecurityContext)
        // No contexto atual, assumimos que o SecurityContext está configurado
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        com.z7design.secured_guard.model.User user = opportunityService.findUserByUsername(username);
        
        opportunityService.delete(UUID.fromString(id), reason, user);
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/all")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<Void> deleteAll(@RequestParam String reason) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        com.z7design.secured_guard.model.User user = opportunityService.findUserByUsername(username);
        
        opportunityService.deleteAll(reason, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<Void> deleteBulk(@RequestBody java.util.Map<String, Object> payload) {
        List<UUID> ids = parseOpportunityIds(payload.get("ids"));
        if (ids.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        Object reasonObj = payload.get("reason");
        String reason = reasonObj != null ? String.valueOf(reasonObj).trim() : "";
        if (reason.isEmpty() || "null".equalsIgnoreCase(reason)) {
            reason = "Exclusão em massa via sistema";
        }

        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        com.z7design.secured_guard.model.User user = opportunityService.findUserByUsername(username);

        opportunityService.deleteBulk(ids, reason, user);
        return ResponseEntity.noContent().build();
    }

    /**
     * Aceita lista JSON de strings ou números (Jackson pode deserializar de formas distintas).
     */
    private static List<UUID> parseOpportunityIds(Object idsRaw) {
        if (!(idsRaw instanceof List<?> rawList)) {
            return List.of();
        }
        List<UUID> ids = new ArrayList<>();
        for (Object o : rawList) {
            if (o == null) {
                continue;
            }
            String s = String.valueOf(o).trim();
            if (s.isEmpty()) {
                continue;
            }
            try {
                ids.add(UUID.fromString(s));
            } catch (IllegalArgumentException ignored) {
                // ignora entradas inválidas
            }
        }
        return ids;
    }
} 