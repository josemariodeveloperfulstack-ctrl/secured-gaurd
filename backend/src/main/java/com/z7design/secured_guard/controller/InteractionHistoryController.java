package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.InteractionHistoryDTO;
import com.z7design.secured_guard.model.InteractionHistory;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.Opportunity;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.InteractionHistoryService;
import com.z7design.secured_guard.service.LeadService;
import com.z7design.secured_guard.service.OpportunityService;
import com.z7design.secured_guard.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/interaction-history")
@Validated
public class InteractionHistoryController {
    @Autowired
    private InteractionHistoryService interactionHistoryService;
    @Autowired
    private LeadService leadService;
    @Autowired
    private OpportunityService opportunityService;
    @Autowired
    private UserService userService;

    private InteractionHistoryDTO toDTO(InteractionHistory h) {
        InteractionHistoryDTO dto = new InteractionHistoryDTO();
        dto.setId(h.getId());
        dto.setOpportunityId(h.getOpportunity() != null ? h.getOpportunity().getId() : null);
        dto.setLeadId(h.getLead() != null ? h.getLead().getId() : null);
        dto.setUserId(h.getUser() != null ? h.getUser().getId() : null);
        dto.setUserName(h.getUser() != null ? h.getUser().getName() : null);
        dto.setAction(h.getAction());
        dto.setNote(h.getNote());
        dto.setCreatedAt(h.getCreatedAt());
        return dto;
    }

    @GetMapping
    public List<InteractionHistoryDTO> getAll() {
        return interactionHistoryService.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InteractionHistoryDTO> getById(@PathVariable String id) {
        Optional<InteractionHistory> history = interactionHistoryService.findById(UUID.fromString(id));
        return history.map(h -> ResponseEntity.ok(toDTO(h))).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-lead/{leadId}")
    public List<InteractionHistoryDTO> getByLead(@PathVariable String leadId) {
        return interactionHistoryService.findByLeadId(UUID.fromString(leadId))
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @GetMapping("/by-opportunity/{opportunityId}")
    public List<InteractionHistoryDTO> getByOpportunity(@PathVariable String opportunityId) {
        return interactionHistoryService.findByOpportunityId(UUID.fromString(opportunityId))
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody InteractionHistoryDTO dto) {
        try {
            InteractionHistory h = new InteractionHistory();
            h.setNote(dto.getNote());
            h.setAction(dto.getAction());

            if (dto.getLeadId() != null) {
                Lead lead = leadService.findById(dto.getLeadId());
                h.setLead(lead);
            }
            if (dto.getOpportunityId() != null) {
                Opportunity opp = opportunityService.findById(dto.getOpportunityId())
                    .orElseThrow(() -> new RuntimeException("Oportunidade não encontrada: " + dto.getOpportunityId()));
                h.setOpportunity(opp);
            }

            // Resolve usuário: prioridade para userId do DTO, fallback para usuário autenticado
            User user;
            if (dto.getUserId() != null) {
                user = userService.findById(dto.getUserId())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + dto.getUserId()));
            } else {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                String username = auth.getName();
                user = userService.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado: " + username));
            }
            h.setUser(user);

            InteractionHistory saved = interactionHistoryService.save(h);
            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @Valid @RequestBody InteractionHistoryDTO dto) {
        try {
            Optional<InteractionHistory> existing = interactionHistoryService.findById(UUID.fromString(id));
            if (!existing.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            InteractionHistory h = existing.get();
            if (dto.getNote() != null) h.setNote(dto.getNote());
            if (dto.getAction() != null) h.setAction(dto.getAction());
            InteractionHistory saved = interactionHistoryService.save(h);
            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!interactionHistoryService.findById(UUID.fromString(id)).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        interactionHistoryService.delete(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }
}
