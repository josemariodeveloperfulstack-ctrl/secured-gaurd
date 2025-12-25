package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.LeadDTO;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
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

    @Transactional(readOnly = true)
    public List<Lead> findAll() {
        List<Lead> leads = leadRepository.findAll();
        // Inicializar relacionamentos lazy dentro da transação
        for (Lead lead : leads) {
            if (lead.getCreatedBy() != null) {
                lead.getCreatedBy().getUsername(); // Força inicialização
            }
            if (lead.getAssignedTo() != null) {
                lead.getAssignedTo().getUsername(); // Força inicialização
            }
        }
        return leads;
    }

    @Transactional(readOnly = true)
    public Page<Lead> findAll(Pageable pageable) {
        Page<Lead> leads = leadRepository.findAll(pageable);
        // Inicializar relacionamentos lazy dentro da transação
        for (Lead lead : leads.getContent()) {
            if (lead.getCreatedBy() != null) {
                lead.getCreatedBy().getUsername(); // Força inicialização
            }
            if (lead.getAssignedTo() != null) {
                lead.getAssignedTo().getUsername(); // Força inicialização
            }
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

    public List<Lead> findByStatus(LeadStatus status) {
        return leadRepository.findByStatus(status);
    }

    public List<Lead> findBySource(LeadSource source) {
        return leadRepository.findBySource(source);
    }

    public List<Lead> findByAssignedTo(UUID userId) {
        return leadRepository.findByAssignedToId(userId);
    }

    public List<Lead> findByCreatedBy(UUID userId) {
        return leadRepository.findByCreatedById(userId);
    }

    public List<Lead> findByCompany(String company) {
        return leadRepository.findByCompanyContainingIgnoreCase(company);
    }

    public List<Lead> findRecentLeads(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return leadRepository.findByCreatedAtAfter(since);
    }

    public long countByStatus(LeadStatus status) {
        return leadRepository.countByStatus(status);
    }

    public long countBySource(LeadSource source) {
        return leadRepository.countBySource(source);
    }

    public List<Lead> searchLeads(String searchTerm) {
        return leadRepository.searchLeads(searchTerm);
    }
} 