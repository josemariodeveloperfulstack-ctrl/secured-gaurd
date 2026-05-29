package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Opportunity;
import com.z7design.secured_guard.model.KanbanStatus;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.OpportunityRepository;
import com.z7design.secured_guard.repository.KanbanStatusRepository;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class OpportunityService {
    @Autowired
    private OpportunityRepository opportunityRepository;
    
    @Autowired
    private KanbanStatusRepository kanbanStatusRepository;
    
    @Autowired
    private LeadRepository leadRepository;
    
    @Autowired
    private ClientRepository clientRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Opportunity> findAllActive() {
        try {
            List<Opportunity> opportunities = opportunityRepository.findAllActiveWithRelationships();
            // Inicializar objetos necessários dentro da transação para evitar LazyInitializationException
            for (Opportunity opportunity : opportunities) {
                initializeRelationships(opportunity);
            }
            return opportunities;
        } catch (Exception e) {
            // Fallback para método padrão
            return opportunityRepository.findAllActive();
        }
    }

    private void initializeRelationships(Opportunity opportunity) {
        if (opportunity.getLead() != null) {
            opportunity.getLead().getId();
            opportunity.getLead().getName();
        }
        if (opportunity.getStatus() != null) {
            opportunity.getStatus().getId();
            opportunity.getStatus().getName();
        }
        if (opportunity.getAssignedTo() != null) {
            opportunity.getAssignedTo().getId();
            opportunity.getAssignedTo().getName();
        }
        if (opportunity.getClient() != null) {
            opportunity.getClient().getId();
            opportunity.getClient().getName();
        }
    }

    @Transactional(readOnly = true)
    public List<Opportunity> findAll() {
        try {
            List<Opportunity> opportunities = opportunityRepository.findAllActiveWithRelationships();
            // Inicializar objetos necessários dentro da transação para evitar LazyInitializationException
            for (Opportunity opportunity : opportunities) {
                if (opportunity.getLead() != null) {
                    // Forçar inicialização de campos básicos do Lead dentro da transação
                    opportunity.getLead().getId();
                    opportunity.getLead().getName();
                    opportunity.getLead().getCompany();
                    opportunity.getLead().getEmail();
                    opportunity.getLead().getPhone();
                    opportunity.getLead().getStatus();
                    opportunity.getLead().getSource();
                    opportunity.getLead().getCreatedAt();
                }
                if (opportunity.getStatus() != null) {
                    opportunity.getStatus().getId();
                    opportunity.getStatus().getName();
                }
                if (opportunity.getAssignedTo() != null) {
                    opportunity.getAssignedTo().getId();
                    opportunity.getAssignedTo().getName();
                }
                if (opportunity.getClient() != null) {
                    opportunity.getClient().getId();
                    opportunity.getClient().getName();
                }
            }
            return opportunities;
        } catch (Exception e) {
            // Fallback para método padrão
            return opportunityRepository.findAll();
        }
    }

    @Transactional(readOnly = true)
    public Optional<Opportunity> findById(UUID id) {
        try {
            // Buscar oportunidade e tentar inicializar relacionamentos
            Optional<Opportunity> opportunityOpt = opportunityRepository.findById(id);
            if (opportunityOpt.isPresent()) {
                Opportunity opportunity = opportunityOpt.get();
                // Inicializar objetos necessários dentro da transação
                if (opportunity.getLead() != null) {
                    opportunity.getLead().getId();
                    opportunity.getLead().getName();
                    opportunity.getLead().getCompany();
                    opportunity.getLead().getEmail();
                    opportunity.getLead().getPhone();
                    opportunity.getLead().getStatus();
                    opportunity.getLead().getSource();
                    opportunity.getLead().getCreatedAt();
                }
                if (opportunity.getStatus() != null) {
                    opportunity.getStatus().getId();
                    opportunity.getStatus().getName();
                }
                if (opportunity.getAssignedTo() != null) {
                    opportunity.getAssignedTo().getId();
                    opportunity.getAssignedTo().getName();
                }
                if (opportunity.getClient() != null) {
                    opportunity.getClient().getId();
                    opportunity.getClient().getName();
                }
            }
            return opportunityOpt;
        } catch (Exception e) {
            // Fallback para método padrão
            return opportunityRepository.findById(id);
        }
    }

    public Opportunity save(Opportunity opportunity) {
        // Resolver relacionamentos se os IDs estiverem presentes
        if (opportunity.getStatus() != null && opportunity.getStatus().getId() != null) {
            KanbanStatus status = kanbanStatusRepository.findById(opportunity.getStatus().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Status não encontrado com ID: " + opportunity.getStatus().getId()));
            opportunity.setStatus(status);
        }
        
        // Se a oportunidade tem apenas o ID do status (vindo do DTO), buscar a entidade
        // Isso será tratado no controller antes de chamar o service
        
        return opportunityRepository.save(opportunity);
    }
    
    public Opportunity create(Opportunity opportunity, UUID statusId, UUID leadId, UUID clientId, UUID assignedToId) {
        if (statusId == null) {
            throw new IllegalArgumentException("StatusId é obrigatório para criar uma oportunidade");
        }
        
        KanbanStatus status = kanbanStatusRepository.findById(statusId)
            .orElseThrow(() -> new ResourceNotFoundException("Status não encontrado com ID: " + statusId));
        opportunity.setStatus(status);
        
        if (leadId != null) {
            Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado com ID: " + leadId));
            opportunity.setLead(lead);
        }
        
        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + clientId));
            opportunity.setClient(client);
        }
        
        if (assignedToId != null) {
            User user = userRepository.findById(assignedToId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + assignedToId));
            opportunity.setAssignedTo(user);
        }
        
        return opportunityRepository.save(opportunity);
    }
    
    public Opportunity update(UUID id, Opportunity opportunity, UUID statusId, UUID leadId, UUID clientId, UUID assignedToId) {
        Opportunity existing = findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oportunidade não encontrada com ID: " + id));
        
        existing.setTitle(opportunity.getTitle());
        existing.setDescription(opportunity.getDescription());
        existing.setEstimatedValue(opportunity.getEstimatedValue());
        existing.setCloseDate(opportunity.getCloseDate());
        
        if (statusId != null) {
            KanbanStatus status = kanbanStatusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Status não encontrado com ID: " + statusId));
            existing.setStatus(status);
        } else {
            // Se statusId for null na atualização, manter o status atual
            // Não alterar o status se não for fornecido
        }
        
        if (leadId != null) {
            Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado com ID: " + leadId));
            existing.setLead(lead);
        } else {
            existing.setLead(null);
        }
        
        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + clientId));
            existing.setClient(client);
        } else {
            existing.setClient(null);
        }
        
        if (assignedToId != null) {
            User user = userRepository.findById(assignedToId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado com ID: " + assignedToId));
            existing.setAssignedTo(user);
        } else {
            existing.setAssignedTo(null);
        }
        
        return opportunityRepository.save(existing);
    }

    public User findUserByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + username));
    }

    @Transactional
    public void delete(UUID id, String reason, User user) {
        Opportunity opportunity = findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Oportunidade não encontrada com ID: " + id));
        
        opportunity.setDeleted(true);
        opportunity.setDeletionReason(reason);
        opportunity.setDeletedAt(java.time.LocalDateTime.now());
        opportunity.setDeletedBy(user);
        
        opportunityRepository.save(opportunity);
    }
    @Transactional
    public void deleteAll(String reason, User user) {
        List<Opportunity> allOpportunities = opportunityRepository.findAllActive();
        for (Opportunity opportunity : allOpportunities) {
            opportunity.setDeleted(true);
            opportunity.setDeletionReason(reason);
            opportunity.setDeletedAt(java.time.LocalDateTime.now());
            opportunity.setDeletedBy(user);
        }
        opportunityRepository.saveAll(allOpportunities);
    }

    @Transactional
    public void deleteBulk(List<UUID> ids, String reason, User user) {
        List<Opportunity> opportunities = opportunityRepository.findAllById(ids);
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        for (Opportunity opportunity : opportunities) {
            opportunity.setDeleted(true);
            opportunity.setDeletionReason(reason);
            opportunity.setDeletedAt(now);
            opportunity.setDeletedBy(user);
            opportunityRepository.save(opportunity);
        }
    }
} 