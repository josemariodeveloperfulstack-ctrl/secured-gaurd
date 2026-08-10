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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.z7design.secured_guard.model.User;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/opportunities")
@Validated
public class OpportunityController {
    private static final Logger log = LoggerFactory.getLogger(OpportunityController.class);

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
    public ResponseEntity<?> delete(@PathVariable String id, @RequestParam String reason) {
        try {
            if (!opportunityService.findById(UUID.fromString(id)).isPresent()) {
                return ResponseEntity.notFound().build();
            }
            User user = resolveCurrentUserManaged();
            opportunityService.delete(UUID.fromString(id), reason, user);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao excluir oportunidade {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of("error", "Erro interno: " + e.getMessage()));
        }
    }

    @DeleteMapping("/all")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<?> deleteAll(@RequestParam String reason) {
        try {
            User user = resolveCurrentUserManaged();
            opportunityService.deleteAll(reason, user);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao excluir todas as oportunidades: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of("error", "Erro interno: " + e.getMessage()));
        }
    }

    @PostMapping("/bulk-delete")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<?> deleteBulk(@RequestBody java.util.Map<String, Object> payload) {
        try {
            List<UUID> ids = parseOpportunityIds(payload.get("ids"));
            if (ids.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(java.util.Map.of("error", "Nenhum ID válido fornecido"));
            }

            Object reasonObj = payload.get("reason");
            String reason = reasonObj != null ? String.valueOf(reasonObj).trim() : "";
            if (reason.isEmpty() || "null".equalsIgnoreCase(reason)) {
                reason = "Exclusão em massa via sistema";
            }

            User user = resolveCurrentUserManaged();
            opportunityService.deleteBulk(ids, reason, user);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao excluir oportunidades em massa (ids={}): {}", payload.get("ids"), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of("error", "Erro interno: " + e.getMessage()));
        }
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

    /**
     * Sempre recarrega o usuário no contexto de persistência (mesmo padrão do LeadController).
     * O principal JWT é o próprio User (detached) — resolve-se primeiro pelo ID (mais estável
     * que o username, que pode divergir após alterações/reset de banco) e recarrega a entidade.
     */
    private User resolveCurrentUserManaged() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResourceNotFoundException("Usuário não autenticado");
        }
        if (auth.getPrincipal() instanceof User principal) {
            if (principal.getId() != null) {
                return opportunityService.findUserById(principal.getId());
            }
            if (principal.getUsername() != null && !principal.getUsername().isBlank()) {
                return opportunityService.findUserByUsername(principal.getUsername());
            }
        }
        if (auth.getName() != null && !auth.getName().isBlank()) {
            return opportunityService.findUserByUsername(auth.getName());
        }
        throw new ResourceNotFoundException("Usuário não autenticado");
    }
} 