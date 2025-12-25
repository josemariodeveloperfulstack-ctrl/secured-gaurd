package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.LeadDTO;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class LeadService {

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Inicializa relacionamentos lazy de um Lead, tratando casos onde o User foi deletado
     */
    private void initializeLeadRelationships(Lead lead) {
        // Inicializar createdBy
        if (lead.getCreatedBy() != null) {
            try {
                lead.getCreatedBy().getUsername(); // Força inicialização
            } catch (EntityNotFoundException e) {
                // User foi deletado, definir como null
                lead.setCreatedBy(null);
            }
        }
        
        // Inicializar assignedTo
        if (lead.getAssignedTo() != null) {
            try {
                lead.getAssignedTo().getUsername(); // Força inicialização
            } catch (EntityNotFoundException e) {
                // User foi deletado, definir como null
                lead.setAssignedTo(null);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Lead> findAll() {
        List<Lead> leads = leadRepository.findAll();
        // Inicializar relacionamentos lazy dentro da transação
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    @Transactional(readOnly = true)
    public Page<Lead> findAll(Pageable pageable) {
        Page<Lead> leads = leadRepository.findAll(pageable);
        // Inicializar relacionamentos lazy dentro da transação
        for (Lead lead : leads.getContent()) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    public Lead findById(UUID id) {
        return leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado com ID: " + id));
    }

    public Lead create(LeadDTO leadDTO, String currentUserIdentifier) {
        Lead lead = new Lead();
        lead.setName(leadDTO.getName());
        lead.setEmail(leadDTO.getEmail());
        lead.setPhone(leadDTO.getPhone());
        lead.setCompany(leadDTO.getCompany());
        lead.setPosition(leadDTO.getPosition());
        lead.setSource(leadDTO.getSource());
        lead.setStatus(LeadStatus.NEW);
        // Mapear description para notes se notes estiver vazio
        if (leadDTO.getNotes() != null && !leadDTO.getNotes().isEmpty()) {
            lead.setNotes(leadDTO.getNotes());
        } else if (leadDTO.getDescription() != null && !leadDTO.getDescription().isEmpty()) {
            lead.setNotes(leadDTO.getDescription());
        }
        lead.setEstimatedValue(leadDTO.getEstimatedValue());
        
        // Tentar buscar usuário por username primeiro, depois por email
        var userOptional = userRepository.findByUsername(currentUserIdentifier);
        if (userOptional.isEmpty()) {
            userOptional = userRepository.findByEmail(currentUserIdentifier);
        }
        
        if (userOptional.isEmpty()) {
            throw new ResourceNotFoundException("Usuário não encontrado com username/email: " + currentUserIdentifier);
        }
        
        lead.setCreatedBy(userOptional.get());
        
        if (leadDTO.getAssignedToId() != null) {
            lead.setAssignedTo(userRepository.findById(UUID.fromString(leadDTO.getAssignedToId().toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado")));
        }

        return leadRepository.save(lead);
    }

    public Lead update(UUID id, LeadDTO leadDTO) {
        Lead lead = findById(id);
        lead.setName(leadDTO.getName());
        lead.setEmail(leadDTO.getEmail());
        lead.setPhone(leadDTO.getPhone());
        lead.setCompany(leadDTO.getCompany());
        lead.setPosition(leadDTO.getPosition());
        lead.setSource(leadDTO.getSource());
        
        if (leadDTO.getAssignedToId() != null) {
            lead.setAssignedTo(userRepository.findById(UUID.fromString(leadDTO.getAssignedToId().toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado")));
        } else {
            lead.setAssignedTo(null);
        }

        return leadRepository.save(lead);
    }

    public Lead updateStatus(UUID id, String status) {
        Lead lead = findById(id);
        lead.setStatus(LeadStatus.valueOf(status));
        return leadRepository.save(lead);
    }

    public void delete(UUID id) {
        Lead lead = findById(id);
        leadRepository.delete(lead);
    }

    @Transactional(readOnly = true)
    public List<Lead> findByStatus(LeadStatus status) {
        List<Lead> leads = leadRepository.findByStatus(status);
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    @Transactional(readOnly = true)
    public List<Lead> findBySource(LeadSource source) {
        List<Lead> leads = leadRepository.findBySource(source);
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    @Transactional(readOnly = true)
    public List<Lead> findByAssignedTo(UUID userId) {
        List<Lead> leads = leadRepository.findByAssignedToId(userId);
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    @Transactional(readOnly = true)
    public List<Lead> findByCreatedBy(UUID userId) {
        List<Lead> leads = leadRepository.findByCreatedById(userId);
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    @Transactional(readOnly = true)
    public List<Lead> findByCompany(String company) {
        List<Lead> leads = leadRepository.findByCompanyContainingIgnoreCase(company);
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    @Transactional(readOnly = true)
    public List<Lead> findRecentLeads(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<Lead> leads = leadRepository.findByCreatedAtAfter(since);
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }

    public long countByStatus(LeadStatus status) {
        return leadRepository.countByStatus(status);
    }

    public long countBySource(LeadSource source) {
        return leadRepository.countBySource(source);
    }

    @Transactional(readOnly = true)
    public List<Lead> searchLeads(String searchTerm) {
        List<Lead> leads = leadRepository.searchLeads(searchTerm);
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
        }
        return leads;
    }
} 