package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.LeadBulkImportRequestDTO;
import com.z7design.secured_guard.dto.LeadBulkImportResultDTO;
import com.z7design.secured_guard.dto.LeadDTO;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.service.LeadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/leads")
@Tag(name = "Leads", description = "API para gestão de leads comerciais")
@Slf4j
public class LeadController {

    @Autowired
    private LeadService leadService;

    @GetMapping
    @Operation(summary = "Listar todos os leads", description = "Retorna uma lista paginada de todos os leads")
    public ResponseEntity<Page<Lead>> getAllLeads(Pageable pageable) {
        Page<Lead> leads = leadService.findAll(pageable);
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/all")
    @Operation(summary = "Listar todos os leads sem paginação", description = "Retorna uma lista completa de todos os leads")
    public ResponseEntity<List<LeadDTO>> getAllLeadsList() {
        return ResponseEntity.ok(leadService.findAllActiveAsDTO());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar lead por ID", description = "Retorna um lead específico pelo ID")
    @Transactional(readOnly = true)
    public ResponseEntity<Lead> getLeadById(@PathVariable String id) {
        Lead lead = leadService.findById(UUID.fromString(id));
        
        // Forçar inicialização completa do assignedTo antes da serialização JSON
        if (lead.getAssignedTo() != null) {
            try {
                // Acessar TODOS os campos do assignedTo para garantir inicialização completa
                // Isso força o Hibernate a carregar o objeto completo antes da serialização
                var assignedTo = lead.getAssignedTo();
                UUID assignedToId = assignedTo.getId();
                String name = assignedTo.getName();
                String username = assignedTo.getUsername();
                // Acessar mais campos para garantir que o objeto está totalmente carregado
                assignedTo.getEmail();
                assignedTo.isEnabled();
                assignedTo.isAccountNonExpired();
                // Popular assignedToName para facilitar serialização
                lead.setAssignedToName(name != null ? name : username);
                log.info("✅ Lead {} - AssignedTo inicializado no getLeadById: ID={}, Name={}, Username={}, AssignedToName={}", 
                    lead.getId(), assignedToId, name, username, lead.getAssignedToName());
            } catch (Exception e) {
                log.warn("❌ Erro ao acessar assignedTo do lead {} no getLeadById: {}", lead.getId(), e.getMessage());
            }
        } else {
            log.debug("⚠️ Lead {} - AssignedTo é null no getLeadById", lead.getId());
        }
        
        return ResponseEntity.ok(lead);
    }

    @PostMapping("/import")
    @Operation(
            summary = "Importar leads de planilha (marketing)",
            description = "Cria ou atualiza leads por e-mail. Usado após importação de lista para campanhas.")
    public ResponseEntity<LeadBulkImportResultDTO> importLeadsFromMarketing(
            @RequestBody(required = false) LeadBulkImportRequestDTO request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            return ResponseEntity.ok(new LeadBulkImportResultDTO());
        }
        if (request.getItems().size() > 2000) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserIdentifier = authentication != null ? authentication.getName() : "system";
        LeadBulkImportResultDTO result =
                leadService.bulkImportFromMarketing(request.getItems(), currentUserIdentifier);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @Operation(summary = "Criar novo lead", description = "Cria um novo lead no sistema")
    public ResponseEntity<Lead> createLead(@RequestBody LeadDTO leadDTO) {
        try {
            log.info("Criando novo lead: {}", leadDTO.getName());
            
            // Obter username do usuário atual do contexto de segurança
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String currentUserIdentifier = authentication != null ? authentication.getName() : "system";
            
            log.info("Usuário atual: {}", currentUserIdentifier);
            
            Lead createdLead = leadService.create(leadDTO, currentUserIdentifier);
            log.info("✅ Lead criado com sucesso: {}", createdLead.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdLead);
        } catch (Exception e) {
            log.error("❌ Erro ao criar lead: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar lead", description = "Atualiza um lead existente")
    @Transactional
    public ResponseEntity<Lead> updateLead(@PathVariable String id, @RequestBody LeadDTO leadDTO) {
        log.info("📡 RECEBIDO UPDATE LEAD ID: {}", id);
        log.info("📦 Payload: {}", leadDTO);
        Lead updatedLead = leadService.update(UUID.fromString(id), leadDTO);
        
        // Forçar inicialização completa do assignedTo antes da serialização JSON
        if (updatedLead.getAssignedTo() != null) {
            try {
                // Acessar TODOS os campos do assignedTo para garantir inicialização completa
                var assignedTo = updatedLead.getAssignedTo();
                UUID assignedToId = assignedTo.getId();
                String name = assignedTo.getName();
                String username = assignedTo.getUsername();
                // Acessar mais campos para garantir que o objeto está totalmente carregado
                assignedTo.getEmail();
                assignedTo.isEnabled();
                assignedTo.isAccountNonExpired();
                // Popular assignedToName para facilitar serialização
                updatedLead.setAssignedToName(name != null ? name : username);
                log.info("✅ Lead {} atualizado - AssignedTo inicializado: ID={}, Name={}, Username={}, AssignedToName={}", 
                    updatedLead.getId(), assignedToId, name, username, updatedLead.getAssignedToName());
            } catch (Exception e) {
                log.warn("❌ Erro ao acessar assignedTo do lead {} após atualização: {}", updatedLead.getId(), e.getMessage());
            }
        } else {
            log.debug("⚠️ Lead {} atualizado - AssignedTo é null", updatedLead.getId());
        }
        
        return ResponseEntity.ok(updatedLead);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status do lead", description = "Atualiza apenas o status de um lead")
    public ResponseEntity<Lead> updateLeadStatus(@PathVariable String id, @RequestBody java.util.Map<String, String> statusUpdate) {
        String status = statusUpdate.get("status");
        Lead updatedLead = leadService.updateStatus(UUID.fromString(id), status);
        return ResponseEntity.ok(updatedLead);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir lead", description = "Exclui um lead do sistema")
    public ResponseEntity<Void> deleteLead(@PathVariable String id, @RequestParam String reason) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = leadService.findUserByUsername(username);
        leadService.delete(UUID.fromString(id), reason, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    @Operation(summary = "Excluir todos os leads", description = "Exclui permanentemente todos os leads do sistema")
    public ResponseEntity<Void> deleteAllLeads(@RequestParam String reason) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = leadService.findUserByUsername(username);
        leadService.deleteAll(reason, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Excluir leads em massa", description = "Exclui múltiplos leads do sistema")
    public ResponseEntity<Void> deleteLeadsBulk(@RequestBody java.util.Map<String, Object> payload) {
        List<String> idsStr = (List<String>) payload.get("ids");
        String reason = (String) payload.get("reason");
        
        if (reason == null || reason.isEmpty()) {
            reason = "Exclusão em massa via sistema";
        }
        
        List<UUID> ids = idsStr.stream().map(UUID::fromString).collect(java.util.stream.Collectors.toList());
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = leadService.findUserByUsername(username);
        
        leadService.deleteBulk(ids, reason, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar leads por status", description = "Retorna leads filtrados por status")
    public ResponseEntity<List<Lead>> getLeadsByStatus(@PathVariable String status) {
        LeadStatus leadStatus = LeadStatus.valueOf(status.toUpperCase());
        List<Lead> leads = leadService.findByStatus(leadStatus);
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/source/{source}")
    @Operation(summary = "Buscar leads por fonte", description = "Retorna leads filtrados por fonte")
    public ResponseEntity<List<Lead>> getLeadsBySource(@PathVariable String source) {
        LeadSource leadSource = LeadSource.valueOf(source.toUpperCase());
        List<Lead> leads = leadService.findBySource(leadSource);
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/assigned/{userId}")
    @Operation(summary = "Buscar leads por responsável", description = "Retorna leads atribuídos a um usuário específico")
    public ResponseEntity<List<Lead>> getLeadsByAssignedTo(@PathVariable String userId) {
        List<Lead> leads = leadService.findByAssignedTo(UUID.fromString(userId));
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/created/{userId}")
    @Operation(summary = "Buscar leads por criador", description = "Retorna leads criados por um usuário específico")
    public ResponseEntity<List<Lead>> getLeadsByCreatedBy(@PathVariable String userId) {
        List<Lead> leads = leadService.findByCreatedBy(UUID.fromString(userId));
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/company/{company}")
    @Operation(summary = "Buscar leads por empresa", description = "Retorna leads filtrados por empresa")
    public ResponseEntity<List<Lead>> getLeadsByCompany(@PathVariable String company) {
        List<Lead> leads = leadService.findByCompany(company);
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/recent/{days}")
    @Operation(summary = "Buscar leads recentes", description = "Retorna leads criados nos últimos X dias")
    public ResponseEntity<List<Lead>> getRecentLeads(@PathVariable int days) {
        List<Lead> leads = leadService.findRecentLeads(days);
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/search")
    @Operation(summary = "Buscar leads", description = "Busca leads por termo de pesquisa")
    public ResponseEntity<List<Lead>> searchLeads(@RequestParam String term) {
        List<Lead> leads = leadService.searchLeads(term);
        return ResponseEntity.ok(leads);
    }

    @GetMapping("/stats/count-by-status")
    @Operation(summary = "Estatísticas por status", description = "Retorna contagem de leads por status")
    public ResponseEntity<java.util.Map<String, Long>> getCountByStatus() {
        java.util.Map<String, Long> stats = java.util.Map.of(
            "NEW", leadService.countByStatus(LeadStatus.NEW),
            "CONTACTED", leadService.countByStatus(LeadStatus.CONTACTED),
            "QUALIFIED", leadService.countByStatus(LeadStatus.QUALIFIED),
            "PROPOSAL_SENT", leadService.countByStatus(LeadStatus.PROPOSAL_SENT),
            "NEGOTIATION", leadService.countByStatus(LeadStatus.NEGOTIATION),
            "WON", leadService.countByStatus(LeadStatus.WON),
            "LOST", leadService.countByStatus(LeadStatus.LOST)
        );
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/count-by-source")
    @Operation(summary = "Estatísticas por fonte", description = "Retorna contagem de leads por fonte")
    public ResponseEntity<java.util.Map<String, Long>> getCountBySource() {
        java.util.Map<String, Long> stats = java.util.Map.of(
            "WEBSITE", leadService.countBySource(LeadSource.WEBSITE),
            "REFERRAL", leadService.countBySource(LeadSource.REFERRAL),
            "SOCIAL_MEDIA", leadService.countBySource(LeadSource.SOCIAL_MEDIA),
            "COLD_CALL", leadService.countBySource(LeadSource.COLD_CALL),
            "EVENT", leadService.countBySource(LeadSource.EVENT),
            "OTHER", leadService.countBySource(LeadSource.OTHER)
        );
        return ResponseEntity.ok(stats);
    }
} 