package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.LeadDTO;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.User;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.Hibernate;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;

@Slf4j
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
                // Verificar se é um proxy Hibernate
                if (lead.getCreatedBy() instanceof HibernateProxy) {
                    HibernateProxy proxy = (HibernateProxy) lead.getCreatedBy();
                    UUID userId = (UUID) proxy.getHibernateLazyInitializer().getIdentifier();
                    
                    // Verificar se o User existe antes de inicializar
                    if (userId != null && !userRepository.existsById(userId)) {
                        // User não existe mais, definir como null
                        lead.setCreatedBy(null);
                    } else {
                        // User existe, inicializar normalmente
                        Hibernate.initialize(lead.getCreatedBy());
                        lead.getCreatedBy().getUsername(); // Força inicialização completa
                    }
                } else {
                    // Já está inicializado, apenas verificar se existe
                    UUID userId = lead.getCreatedBy().getId();
                    if (userId != null && !userRepository.existsById(userId)) {
                        lead.setCreatedBy(null);
                    }
                }
            } catch (EntityNotFoundException | org.hibernate.LazyInitializationException e) {
                // User foi deletado ou não pode ser inicializado, definir como null
                lead.setCreatedBy(null);
            } catch (Exception e) {
                // Outros erros também resultam em null para evitar problemas
                lead.setCreatedBy(null);
            }
        }
        
        // Inicializar assignedTo
        if (lead.getAssignedTo() != null) {
            try {
                // Verificar se é um proxy Hibernate
                if (lead.getAssignedTo() instanceof HibernateProxy) {
                    HibernateProxy proxy = (HibernateProxy) lead.getAssignedTo();
                    UUID userId = (UUID) proxy.getHibernateLazyInitializer().getIdentifier();
                    
                    // Verificar se o User existe antes de inicializar
                    if (userId != null && !userRepository.existsById(userId)) {
                        // User não existe mais, definir como null
                        log.warn("Usuário assignedTo não encontrado com ID: {}. Definindo como null.", userId);
                        lead.setAssignedTo(null);
                    } else {
                        // User existe, inicializar normalmente
                        Hibernate.initialize(lead.getAssignedTo());
                        // Força inicialização completa acessando vários campos
                        User assignedUser = lead.getAssignedTo();
                        // Acessar TODOS os campos para garantir que o objeto seja totalmente carregado
                        // Isso é necessário para que o Jackson possa serializar corretamente
                        UUID assignedUserId = assignedUser.getId();
                        String userName = assignedUser.getName();
                        String userUsername = assignedUser.getUsername();
                        String userEmail = assignedUser.getEmail();
                        // Acessar mais campos para garantir inicialização completa
                        assignedUser.isEnabled();
                        assignedUser.isAccountNonExpired();
                        log.info("✅ AssignedTo inicializado: ID={}, Name={}, Username={}, Email={}", 
                            assignedUserId, userName, userUsername, userEmail);
                    }
                } else {
                    // Já está inicializado, apenas verificar se existe
                    UUID assignedUserId = lead.getAssignedTo().getId();
                    if (assignedUserId != null && !userRepository.existsById(assignedUserId)) {
                        log.warn("Usuário assignedTo não encontrado com ID: {}. Definindo como null.", assignedUserId);
                        lead.setAssignedTo(null);
                    } else {
                        // Garantir que os campos estão acessíveis e totalmente inicializados
                        User assignedUser = lead.getAssignedTo();
                        UUID userId = assignedUser.getId();
                        String userName = assignedUser.getName();
                        String userUsername = assignedUser.getUsername();
                        String userEmail = assignedUser.getEmail();
                        assignedUser.isEnabled();
                        assignedUser.isAccountNonExpired();
                        log.info("✅ AssignedTo já inicializado: ID={}, Name={}, Username={}, Email={}", 
                            userId, userName, userUsername, userEmail);
                    }
                }
            } catch (EntityNotFoundException | org.hibernate.LazyInitializationException e) {
                // User foi deletado ou não pode ser inicializado, definir como null
                log.warn("Erro ao inicializar assignedTo: {}. Definindo como null.", e.getMessage());
                lead.setAssignedTo(null);
            } catch (Exception e) {
                // Outros erros também resultam em null para evitar problemas
                log.error("Erro inesperado ao inicializar assignedTo: {}", e.getMessage(), e);
                lead.setAssignedTo(null);
            }
        } else {
            log.debug("Lead {} não tem assignedTo", lead.getId());
        }
    }

    @Transactional(readOnly = true)
    public List<Lead> findAll() {
        List<Lead> leads = leadRepository.findAll();
        // Inicializar relacionamentos lazy dentro da transação
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
            // Forçar serialização do assignedTo acessando seus campos ANTES da serialização JSON
            if (lead.getAssignedTo() != null) {
                try {
                    User assignedUser = lead.getAssignedTo();
                    // Acessar todos os campos necessários para forçar inicialização completa
                    // Isso garante que o Jackson possa serializar o objeto
                    UUID id = assignedUser.getId();
                    String name = assignedUser.getName();
                    String username = assignedUser.getUsername();
                    // Acessar outros campos para garantir inicialização completa
                    assignedUser.getEmail();
                    // Popular assignedToName para facilitar serialização
                    lead.setAssignedToName(name != null ? name : username);
                    log.info("✅ Lead {} - AssignedTo inicializado: ID={}, Name={}, Username={}, AssignedToName={}", 
                        lead.getId(), id, name, username, lead.getAssignedToName());
                } catch (Exception e) {
                    log.warn("❌ Erro ao acessar assignedTo do lead {}: {}", lead.getId(), e.getMessage(), e);
                    lead.setAssignedTo(null);
                }
            } else {
                log.debug("⚠️ Lead {} - AssignedTo é null", lead.getId());
            }
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

    @Transactional(readOnly = true)
    public Lead findById(UUID id) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado com ID: " + id));
        // Inicializar relacionamentos lazy dentro da transação
        initializeLeadRelationships(lead);
        
        // Forçar acesso ao assignedTo antes de retornar para garantir serialização
        if (lead.getAssignedTo() != null) {
            try {
                User assignedUser = lead.getAssignedTo();
                assignedUser.getId();
                assignedUser.getName();
                assignedUser.getUsername();
                log.info("✅ Lead {} encontrado - AssignedTo: ID={}, Name={}", 
                    lead.getId(), assignedUser.getId(), assignedUser.getName());
            } catch (Exception e) {
                log.warn("❌ Erro ao acessar assignedTo do lead {}: {}", lead.getId(), e.getMessage());
            }
        } else {
            log.debug("⚠️ Lead {} encontrado - AssignedTo é null", lead.getId());
        }
        
        return lead;
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
        lead.setNextFollowUp(leadDTO.getNextFollowUp());
        
        // Tentar buscar usuário por username primeiro, depois por email
        var userOptional = userRepository.findByUsername(currentUserIdentifier);
        if (userOptional.isEmpty()) {
            userOptional = userRepository.findByEmail(currentUserIdentifier);
        }
        
        if (userOptional.isEmpty()) {
            throw new ResourceNotFoundException("Usuário não encontrado com username/email: " + currentUserIdentifier);
        }
        
        lead.setCreatedBy(userOptional.get());
        
        // Atualizar assignedTo apenas se assignedToId for fornecido e válido
        if (leadDTO.getAssignedToId() != null) {
            try {
                String assignedToIdStr = leadDTO.getAssignedToId().toString().trim();
                // Verificar se não é uma string vazia ou "null"
                if (!assignedToIdStr.isEmpty() && !assignedToIdStr.equalsIgnoreCase("null") && !assignedToIdStr.equalsIgnoreCase("undefined")) {
                    UUID assignedToUUID = UUID.fromString(assignedToIdStr);
                    var assignedUserOptional = userRepository.findById(assignedToUUID);
                    if (assignedUserOptional.isPresent()) {
                        lead.setAssignedTo(assignedUserOptional.get());
                    } else {
                        // Se o usuário não existir, definir como null em vez de lançar exceção
                        log.warn("Usuário responsável não encontrado com ID: {}. Criando lead sem responsável.", assignedToIdStr);
                        lead.setAssignedTo(null);
                    }
                } else {
                    lead.setAssignedTo(null);
                }
            } catch (IllegalArgumentException e) {
                log.warn("ID do usuário responsável inválido: {}. Criando lead sem responsável.", leadDTO.getAssignedToId());
                lead.setAssignedTo(null);
            }
        } else {
            lead.setAssignedTo(null);
        }

        return leadRepository.save(lead);
    }

    public Lead update(UUID id, LeadDTO leadDTO) {
        log.info("🔄 Iniciando atualização do lead ID: {}", id);
        log.info("📦 DTO recebido: Name={}, Status={}, AssignedToId={}", 
                 leadDTO.getName(), leadDTO.getStatus(), leadDTO.getAssignedToId());
        
        Lead lead = findById(id);
        lead.setName(leadDTO.getName());
        lead.setEmail(leadDTO.getEmail());
        lead.setPhone(leadDTO.getPhone());
        lead.setCompany(leadDTO.getCompany());
        lead.setPosition(leadDTO.getPosition());
        lead.setSource(leadDTO.getSource());
        lead.setNextFollowUp(leadDTO.getNextFollowUp());
        
        // Atualizar notes se description foi fornecido
        if (leadDTO.getNotes() != null && !leadDTO.getNotes().isEmpty()) {
            lead.setNotes(leadDTO.getNotes());
        } else if (leadDTO.getDescription() != null && !leadDTO.getDescription().isEmpty()) {
            lead.setNotes(leadDTO.getDescription());
        }
        
        // Atualizar estimatedValue se fornecido
        if (leadDTO.getEstimatedValue() != null) {
            lead.setEstimatedValue(leadDTO.getEstimatedValue());
        }
        
        // Atualizar status se fornecido
        if (leadDTO.getStatus() != null) {
            lead.setStatus(leadDTO.getStatus());
        }
        
        // Atualizar assignedTo apenas se assignedToId for fornecido e válido
        // IMPORTANTE: Se assignedToId não for fornecido, manter o valor existente (não definir como null)
        if (leadDTO.getAssignedToId() != null) {
            try {
                String assignedToIdStr = leadDTO.getAssignedToId().toString().trim();
                // Verificar se não é uma string vazia ou "null"
                if (!assignedToIdStr.isEmpty() && !assignedToIdStr.equalsIgnoreCase("null") && !assignedToIdStr.equalsIgnoreCase("undefined")) {
                    UUID assignedToUUID = UUID.fromString(assignedToIdStr);
                    var userOptional = userRepository.findById(assignedToUUID);
                    if (userOptional.isPresent()) {
                        lead.setAssignedTo(userOptional.get());
                        log.info("✅ AssignedTo ATUALIZADO para: ID={}, Name={}", 
                            userOptional.get().getId(), userOptional.get().getName());
                    } else {
                        // Se o usuário não existir, definir como null em vez de lançar exceção
                        log.error("❌ FALHA AO ATUALIZAR: Usuário não encontrado com ID: {}", assignedToIdStr);
                        log.warn("Usuário responsável não encontrado com ID: {}. Definindo como null.", assignedToIdStr);
                        lead.setAssignedTo(null);
                    }
                } else {
                    // String vazia ou "null" - remover assignedTo
                    log.info("AssignedToId vazio ou 'null' - removendo assignedTo");
                    lead.setAssignedTo(null);
                }
            } catch (IllegalArgumentException e) {
                log.warn("ID do usuário responsável inválido: {}. Mantendo assignedTo existente.", leadDTO.getAssignedToId());
                // Não alterar o assignedTo se o ID for inválido
            }
        } else {
            // Se assignedToId não for fornecido, manter o valor existente
            log.debug("AssignedToId não fornecido - mantendo assignedTo existente: {}", 
                lead.getAssignedTo() != null ? lead.getAssignedTo().getId() : "null");
        }

        Lead savedLead = leadRepository.save(lead);
        
        // Log para debug - verificar se o assignedTo foi salvo
        if (savedLead.getAssignedTo() != null) {
            log.info("✅ Lead {} atualizado - AssignedTo: ID={}, Name={}", 
                savedLead.getId(), savedLead.getAssignedTo().getId(), savedLead.getAssignedTo().getName());
        } else {
            log.info("⚠️ Lead {} atualizado - AssignedTo é null", savedLead.getId());
        }
        
        // Inicializar relacionamentos antes de retornar
        initializeLeadRelationships(savedLead);
        
        return savedLead;
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