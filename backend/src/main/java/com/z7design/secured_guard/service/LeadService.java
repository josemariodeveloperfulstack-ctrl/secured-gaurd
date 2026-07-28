package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.LeadBulkImportResultDTO;
import com.z7design.secured_guard.dto.LeadDTO;
import com.z7design.secured_guard.dto.LeadImportItemDTO;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.KanbanStatusRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.Opportunity;
import com.z7design.secured_guard.model.KanbanStatus;
import com.z7design.secured_guard.model.InteractionHistory;
import jakarta.persistence.EntityNotFoundException;
import org.hibernate.Hibernate;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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

    @Autowired
    private KanbanStatusRepository kanbanStatusRepository;

    @Autowired
    private OpportunityService opportunityService;

    @Autowired
    private InteractionHistoryService interactionHistoryService;

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
                        // Popular assignedToName para facilitar serialização
                        lead.setAssignedToName(userName != null ? userName : userUsername);
                        log.info("✅ AssignedTo inicializado: ID={}, Name={}, Username={}, Email={}, AssignedToName={}", 
                            assignedUserId, userName, userUsername, userEmail, lead.getAssignedToName());
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
                        // Popular assignedToName para facilitar serialização
                        lead.setAssignedToName(userName != null ? userName : userUsername);
                        log.info("✅ AssignedTo já inicializado: ID={}, Name={}, Username={}, Email={}, AssignedToName={}", 
                            userId, userName, userUsername, userEmail, lead.getAssignedToName());
                    }
                }
            } catch (EntityNotFoundException | org.hibernate.LazyInitializationException e) {
                // User foi deletado ou não pode ser inicializado, definir como null
                log.warn("Erro ao inicializar assignedTo: {}. Definindo como null.", e.getMessage());
                lead.setAssignedTo(null);
                lead.setAssignedToName(null);
            } catch (Exception e) {
                // Outros erros também resultam em null para evitar problemas
                log.error("Erro inesperado ao inicializar assignedTo: {}", e.getMessage(), e);
                lead.setAssignedTo(null);
                lead.setAssignedToName(null);
            }
        } else {
            log.debug("Lead {} não tem assignedTo", lead.getId());
            lead.setAssignedToName(null);
        }
    }

    @Transactional(readOnly = true)
    public List<LeadDTO> findAllActiveAsDTO() {
        return leadRepository.findAllActiveAsDTO();
    }

    public LeadDTO mapToDTO(Lead lead) {
        if (lead == null) {
            return null;
        }

        LeadDTO dto = new LeadDTO();
        dto.setId(lead.getId());
        dto.setName(lead.getName());
        dto.setEmail(lead.getEmail());
        dto.setPhone(lead.getPhone());
        dto.setMobile(lead.getMobile());
        dto.setCompany(lead.getCompany());
        dto.setPosition(lead.getPosition());
        dto.setStatus(lead.getStatus());
        dto.setSource(lead.getSource());
        dto.setEstimatedValue(lead.getEstimatedValue());
        dto.setNotes(lead.getNotes());
        dto.setNextFollowUp(lead.getNextFollowUp());
        dto.setCreatedAt(lead.getCreatedAt());
        dto.setUpdatedAt(lead.getUpdatedAt());

        try {
            if (lead.getAssignedTo() != null) {
                dto.setAssignedToId(lead.getAssignedTo().getId());
                String name = lead.getAssignedTo().getName();
                dto.setAssignedToName(name != null ? name : lead.getAssignedTo().getUsername());
            } else if (lead.getAssignedToName() != null) {
                dto.setAssignedToName(lead.getAssignedToName());
            }
        } catch (Exception e) {
            log.debug("Lead {} — assignedTo indisponível: {}", lead.getId(), e.getMessage());
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public List<Lead> findAllActive() {
        List<Lead> leads = leadRepository.findAllActive();
        // Inicializar relacionamentos lazy dentro da transação
        for (Lead lead : leads) {
            initializeLeadRelationships(lead);
            // Forçar serialização do assignedTo acessando seus campos ANTES da serialização JSON
            if (lead.getAssignedTo() != null) {
                try {
                    User assignedUser = lead.getAssignedTo();
                    // Acessar todos os campos necessários para forçar inicialização completa
                    UUID id = assignedUser.getId();
                    String name = assignedUser.getName();
                    String username = assignedUser.getUsername();
                    assignedUser.getEmail();
                    // Popular assignedToName para facilitar serialização
                    lead.setAssignedToName(name != null ? name : username);
                } catch (Exception e) {
                    log.warn("❌ Erro ao acessar assignedTo do lead {}: {}", lead.getId(), e.getMessage());
                    lead.setAssignedTo(null);
                    lead.setAssignedToName(null);
                }
            }
        }
        return leads;
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
                    lead.setAssignedToName(null);
                }
            } else {
                log.debug("⚠️ Lead {} - AssignedTo é null", lead.getId());
                lead.setAssignedToName(null);
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
            // Popular assignedToName para facilitar serialização
            if (lead.getAssignedTo() != null) {
                try {
                    User assignedUser = lead.getAssignedTo();
                    String name = assignedUser.getName();
                    String username = assignedUser.getUsername();
                    lead.setAssignedToName(name != null ? name : username);
                } catch (Exception e) {
                    log.warn("Erro ao popular assignedToName do lead {}: {}", lead.getId(), e.getMessage());
                    lead.setAssignedToName(null);
                }
            } else {
                lead.setAssignedToName(null);
            }
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
        // IMPORTANTE: Popular assignedToName para facilitar serialização
        if (lead.getAssignedTo() != null) {
            try {
                User assignedUser = lead.getAssignedTo();
                UUID assignedToId = assignedUser.getId();
                String name = assignedUser.getName();
                String username = assignedUser.getUsername();
                assignedUser.getEmail();
                // Popular assignedToName para facilitar serialização
                lead.setAssignedToName(name != null ? name : username);
                log.info("✅ Lead {} encontrado - AssignedTo: ID={}, Name={}, AssignedToName={}", 
                    lead.getId(), assignedToId, name, lead.getAssignedToName());
            } catch (Exception e) {
                log.warn("❌ Erro ao acessar assignedTo do lead {}: {}", lead.getId(), e.getMessage());
                lead.setAssignedToName(null);
            }
        } else {
            log.debug("⚠️ Lead {} encontrado - AssignedTo é null", lead.getId());
            lead.setAssignedToName(null);
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
        
        User currentUser = userOptional.get();
        lead.setCreatedBy(currentUser);

        // Se nenhum responsável for informado, atribuir automaticamente ao usuário logado
        if (leadDTO.getAssignedToId() != null) {
            try {
                String assignedToIdStr = leadDTO.getAssignedToId().toString().trim();
                if (!assignedToIdStr.isEmpty() && !assignedToIdStr.equalsIgnoreCase("null") && !assignedToIdStr.equalsIgnoreCase("undefined")) {
                    UUID assignedToUUID = UUID.fromString(assignedToIdStr);
                    var assignedUserOptional = userRepository.findById(assignedToUUID);
                    if (assignedUserOptional.isPresent()) {
                        lead.setAssignedTo(assignedUserOptional.get());
                    } else {
                        log.warn("Usuário responsável não encontrado com ID: {}. Atribuindo ao usuário logado.", assignedToIdStr);
                        lead.setAssignedTo(currentUser);
                    }
                } else {
                    lead.setAssignedTo(currentUser);
                }
            } catch (IllegalArgumentException e) {
                log.warn("ID do usuário responsável inválido: {}. Atribuindo ao usuário logado.", leadDTO.getAssignedToId());
                lead.setAssignedTo(currentUser);
            }
        } else {
            lead.setAssignedTo(currentUser);
        }

        Lead savedLead = leadRepository.save(lead);

        // Registrar histórico de criação
        try {
            InteractionHistory history = new InteractionHistory();
            history.setLead(savedLead);
            history.setUser(currentUser);
            history.setAction("CREATED");
            history.setNote("Lead criado por " + currentUser.getName() + " com status " + savedLead.getStatus());
            interactionHistoryService.save(history);
        } catch (Exception e) {
            log.warn("Erro ao salvar histórico de criação do lead {}: {}", savedLead.getId(), e.getMessage());
        }

        // Criar automaticamente uma Oportunidade no Kanban vinculada a este Lead
        try {
            List<KanbanStatus> statuses = kanbanStatusRepository.findAll();
            if (!statuses.isEmpty()) {
                KanbanStatus defaultStatus = statuses.stream()
                    .min(java.util.Comparator.comparingInt(KanbanStatus::getOrderIndex))
                    .orElse(statuses.get(0));

                Opportunity opportunity = new Opportunity();
                opportunity.setTitle(savedLead.getName());
                opportunity.setDescription(savedLead.getNotes());
                opportunity.setLead(savedLead);
                opportunity.setEstimatedValue(savedLead.getEstimatedValue());

                opportunityService.create(opportunity, defaultStatus.getId(),
                    savedLead.getId(), null,
                    savedLead.getAssignedTo() != null ? savedLead.getAssignedTo().getId() : null);

                log.info("✅ Oportunidade criada automaticamente para o lead {}", savedLead.getId());

                // Registrar histórico da oportunidade criada
                try {
                    InteractionHistory oppHistory = new InteractionHistory();
                    oppHistory.setLead(savedLead);
                    oppHistory.setUser(currentUser);
                    oppHistory.setAction("OPPORTUNITY_CREATED");
                    oppHistory.setNote("Oportunidade criada automaticamente no Kanban");
                    interactionHistoryService.save(oppHistory);
                } catch (Exception e) {
                    log.warn("Erro ao salvar histórico de oportunidade para lead {}: {}", savedLead.getId(), e.getMessage());
                }
            } else {
                log.warn("⚠️ Nenhum status Kanban encontrado - oportunidade não criada para o lead {}", savedLead.getId());
            }
        } catch (Exception e) {
            log.error("❌ Erro ao criar oportunidade para lead {}: {}", savedLead.getId(), e.getMessage(), e);
        }

        return savedLead;
    }

    @Transactional
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
            log.info("🔄 Atualizando status de {} para {}", lead.getStatus(), leadDTO.getStatus());
            lead.setStatus(leadDTO.getStatus());
            log.info("✅ Status atualizado para: {}", lead.getStatus());
        } else {
            log.warn("⚠️ Status não fornecido no DTO - mantendo status existente: {}", lead.getStatus());
        }
        
        // Atualizar assignedTo baseado no assignedToId fornecido
        // IMPORTANTE: 
        // - Se assignedToId for fornecido e válido (UUID), atualizar
        // - Se assignedToId for null (enviado explicitamente), remover assignedTo
        // - Se assignedToId não for fornecido (campo ausente no JSON), manter o valor existente
        // 
        // Como o Jackson não distingue facilmente entre "campo ausente" e "campo null",
        // vamos processar sempre que o campo estiver presente no JSON.
        // O frontend sempre envia assignedToId no updateData, então vamos processar sempre.
        
        // Verificar se assignedToId foi fornecido
        // Se for null, significa que o frontend enviou explicitamente null para remover
        // Se for um UUID válido, atualizar
        // Se for string vazia (não deve acontecer com UUID, mas vamos tratar), remover
        
        UUID assignedToIdFromDTO = leadDTO.getAssignedToId();
        
        if (assignedToIdFromDTO != null) {
            // assignedToId foi fornecido e não é null - tentar atualizar
            try {
                var userOptional = userRepository.findById(assignedToIdFromDTO);
                if (userOptional.isPresent()) {
                    lead.setAssignedTo(userOptional.get());
                    log.info("✅ AssignedTo ATUALIZADO para: ID={}, Name={}", 
                        userOptional.get().getId(), userOptional.get().getName());
                } else {
                    // Se o usuário não existir, definir como null em vez de lançar exceção
                    log.error("❌ FALHA AO ATUALIZAR: Usuário não encontrado com ID: {}", assignedToIdFromDTO);
                    log.warn("Usuário responsável não encontrado com ID: {}. Definindo como null.", assignedToIdFromDTO);
                    lead.setAssignedTo(null);
                }
            } catch (Exception e) {
                log.warn("Erro ao processar assignedToId {}: {}. Mantendo assignedTo existente.", assignedToIdFromDTO, e.getMessage());
                // Não alterar o assignedTo se houver erro
            }
        } else {
            // assignedToId é null - pode ser que foi enviado explicitamente para remover
            // ou pode ser que não foi enviado.
            // Como o frontend sempre envia assignedToId no updateData (mesmo que seja o valor existente),
            // se chegou aqui como null, significa que o frontend enviou null explicitamente para remover
            log.info("🔄 AssignedToId é null - removendo assignedTo (enviado explicitamente)");
            lead.setAssignedTo(null);
        }

        Lead savedLead = leadRepository.save(lead);

        // Registrar histórico de atualização
        try {
            User historyUser = savedLead.getAssignedTo() != null ? savedLead.getAssignedTo() : null;
            if (historyUser == null) {
                try {
                    var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null) {
                        historyUser = userRepository.findByUsername(auth.getName()).orElse(null);
                    }
                } catch (Exception ignored) {}
            }
            if (historyUser == null) {
                historyUser = lead.getCreatedBy();
            }

            InteractionHistory history = new InteractionHistory();
            history.setLead(savedLead);
            history.setUser(historyUser);
            history.setAction("UPDATED");
            history.setNote("Lead atualizado: " + buildUpdateDescription(leadDTO));
            interactionHistoryService.save(history);
        } catch (Exception e) {
            log.warn("Erro ao salvar histórico de atualização do lead {}: {}", savedLead.getId(), e.getMessage());
        }

        // Log para debug - verificar se o assignedTo foi salvo
        if (savedLead.getAssignedTo() != null) {
            log.info("✅ Lead {} atualizado - AssignedTo: ID={}, Name={}", 
                savedLead.getId(), savedLead.getAssignedTo().getId(), savedLead.getAssignedTo().getName());
        } else {
            log.info("⚠️ Lead {} atualizado - AssignedTo é null", savedLead.getId());
        }
        
        // Inicializar relacionamentos antes de retornar
        initializeLeadRelationships(savedLead);
        
        // IMPORTANTE: Popular assignedToName após inicializar relacionamentos
        // Isso garante que o campo transiente seja populado corretamente para serialização JSON
        if (savedLead.getAssignedTo() != null) {
            try {
                User assignedUser = savedLead.getAssignedTo();
                String name = assignedUser.getName();
                String username = assignedUser.getUsername();
                savedLead.setAssignedToName(name != null ? name : username);
                log.info("✅ Lead {} - AssignedToName populado: {}", savedLead.getId(), savedLead.getAssignedToName());
            } catch (Exception e) {
                log.warn("⚠️ Erro ao popular assignedToName do lead {}: {}", savedLead.getId(), e.getMessage());
            }
        } else {
            // Se assignedTo for null, limpar assignedToName
            savedLead.setAssignedToName(null);
            log.debug("⚠️ Lead {} - AssignedToName limpo (assignedTo é null)", savedLead.getId());
        }
        
        return savedLead;
    }

    public Lead updateStatus(UUID id, String status) {
        Lead lead = findById(id);
        LeadStatus oldStatus = lead.getStatus();
        lead.setStatus(LeadStatus.valueOf(status));
        Lead savedLead = leadRepository.save(lead);

        // Registrar histórico de mudança de status
        try {
            User historyUser = null;
            try {
                var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null) {
                    historyUser = userRepository.findByUsername(auth.getName()).orElse(null);
                }
            } catch (Exception ignored) {}
            if (historyUser == null) {
                historyUser = lead.getCreatedBy();
            }

            InteractionHistory history = new InteractionHistory();
            history.setLead(savedLead);
            history.setUser(historyUser);
            history.setAction("STATUS_CHANGED");
            history.setNote("Status alterado de " + oldStatus + " para " + status);
            interactionHistoryService.save(history);
        } catch (Exception e) {
            log.warn("Erro ao salvar histórico de status do lead {}: {}", savedLead.getId(), e.getMessage());
        }

        return savedLead;
    }

    public void delete(UUID id, String reason, User user) {
        Lead lead = findById(id);
        lead.setDeleted(true);
        lead.setDeletionReason(reason);
        lead.setDeletedAt(java.time.LocalDateTime.now());
        lead.setDeletedBy(user);
        leadRepository.save(lead);
    }

    @Transactional
    public void deleteAll(String reason, User user) {
        log.info("🗑️ Excluindo todos os leads do sistema (soft delete)...");
        List<Lead> allLeads = leadRepository.findAllActive();
        for (Lead lead : allLeads) {
            lead.setDeleted(true);
            lead.setDeletionReason(reason);
            lead.setDeletedAt(java.time.LocalDateTime.now());
            lead.setDeletedBy(user);
        }
        leadRepository.saveAll(allLeads);
        log.info("✅ Todos os leads foram excluídos com sucesso.");
    }

    @Transactional
    public void deleteBulk(List<UUID> ids, String reason, User user) {
        log.info("🗑️ Excluindo {} leads em massa (soft delete)...", ids.size());
        List<Lead> leads = leadRepository.findAllById(ids);
        for (Lead lead : leads) {
            lead.setDeleted(true);
            lead.setDeletionReason(reason);
            lead.setDeletedAt(java.time.LocalDateTime.now());
            lead.setDeletedBy(user);
        }
        leadRepository.saveAll(leads);
        log.info("✅ Leads excluídos com sucesso.");
    }

    public User findUserByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + username));
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

    @Transactional(readOnly = true)
    public long count() {
        return leadRepository.count();
    }

    @Transactional(readOnly = true)
    public long countActive() {
        return leadRepository.countActive();
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

    @Transactional(readOnly = true)
    public long countByCreatedAtRange(LocalDateTime startInclusive, LocalDateTime endExclusive) {
        return leadRepository.countByCreatedAtRange(startInclusive, endExclusive);
    }

    @Transactional(readOnly = true)
    public long countByStatusAndCreatedAtRange(LeadStatus status, LocalDateTime startInclusive, LocalDateTime endExclusive) {
        return leadRepository.countByStatusAndCreatedAtRange(status, startInclusive, endExclusive);
    }

    /**
     * Importa ou atualiza leads a partir de planilha de marketing (upsert por e-mail).
     */
    public LeadBulkImportResultDTO bulkImportFromMarketing(List<LeadImportItemDTO> items, String currentUserIdentifier) {
        LeadBulkImportResultDTO result = new LeadBulkImportResultDTO();
        if (items == null || items.isEmpty()) {
            return result;
        }

        var userOptional = userRepository.findByUsername(currentUserIdentifier);
        if (userOptional.isEmpty()) {
            userOptional = userRepository.findByEmail(currentUserIdentifier);
        }
        if (userOptional.isEmpty()) {
            throw new ResourceNotFoundException("Usuário não encontrado com username/email: " + currentUserIdentifier);
        }
        User createdBy = userOptional.get();

        List<LeadBulkImportResultDTO.LeadImportLeadRefDTO> refs = new ArrayList<>();
        int created = 0;
        int updated = 0;
        int skipped = 0;

        for (LeadImportItemDTO item : items) {
            if (item == null || item.getEmail() == null || item.getEmail().isBlank()) {
                skipped++;
                continue;
            }
            String email = truncateField(item.getEmail().trim().toLowerCase(), 255);
            if (!isPlausibleEmail(email)) {
                skipped++;
                continue;
            }

            String name = resolveImportName(truncateField(item.getName(), 255), email);
            String notes = buildMarketingImportNotes(item);

            try {
                Optional<Lead> existingOpt = leadRepository.findTopByEmailIncludingDeleted(email);
                if (existingOpt.isPresent()) {
                    Lead existing = existingOpt.get();
                    if (existing.isDeleted()) {
                        existing.setDeleted(false);
                        existing.setDeletionReason(null);
                        existing.setDeletedAt(null);
                        existing.setDeletedBy(null);
                    }
                    if (item.getName() != null && !item.getName().isBlank()) {
                        existing.setName(truncateField(item.getName().trim(), 255));
                    } else if (existing.getName() == null || existing.getName().isBlank()) {
                        existing.setName(name);
                    }
                    if (item.getCompany() != null && !item.getCompany().isBlank()) {
                        existing.setCompany(truncateField(item.getCompany().trim(), 255));
                    }
                    if (item.getPosition() != null && !item.getPosition().isBlank()) {
                        existing.setPosition(truncateField(item.getPosition().trim(), 255));
                    }
                    if (item.getPhone() != null && !item.getPhone().isBlank()) {
                        existing.setPhone(truncateOrNull(item.getPhone(), 20));
                    }
                    if (notes != null) {
                        existing.setNotes(notes);
                    }
                    Lead saved = leadRepository.save(existing);
                    refs.add(new LeadBulkImportResultDTO.LeadImportLeadRefDTO(saved.getId(), saved.getEmail()));
                    updated++;
                } else {
                    Lead lead = new Lead();
                    lead.setName(name);
                    lead.setEmail(email);
                    lead.setCompany(truncateOrNull(item.getCompany(), 255));
                    lead.setPosition(truncateOrNull(item.getPosition(), 255));
                    lead.setPhone(truncateOrNull(item.getPhone(), 20));
                    lead.setSource(LeadSource.EMAIL_MARKETING);
                    lead.setStatus(LeadStatus.NEW);
                    lead.setNotes(notes);
                    lead.setCreatedBy(createdBy);
                    Lead saved = leadRepository.save(lead);
                    refs.add(new LeadBulkImportResultDTO.LeadImportLeadRefDTO(saved.getId(), saved.getEmail()));
                    created++;
                }
            } catch (Exception e) {
                log.warn("Importação marketing: falha ao gravar lead {} — {}", email, e.getMessage());
                skipped++;
            }
        }

        result.setCreated(created);
        result.setUpdated(updated);
        result.setSkipped(skipped);
        result.setLeads(refs);
        log.info("Importação marketing: {} criados, {} atualizados, {} ignorados", created, updated, skipped);
        return result;
    }

    private static String resolveImportName(String name, String email) {
        if (name != null && !name.isBlank()) {
            return name.trim();
        }
        int at = email.indexOf('@');
        if (at > 0) {
            return email.substring(0, at).replace('.', ' ').replace('_', ' ').trim();
        }
        return "Contato";
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String truncateOrNull(String value, int maxLen) {
        String t = trimOrNull(value);
        if (t == null) {
            return null;
        }
        return truncateField(t, maxLen);
    }

    private static String truncateField(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        if (t.length() <= maxLen) {
            return t;
        }
        return t.substring(0, maxLen);
    }

    private static boolean isPlausibleEmail(String email) {
        return email != null && email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    private static String buildMarketingImportNotes(LeadImportItemDTO item) {
        StringBuilder sb = new StringBuilder();
        String city = truncateOrNull(item.getCity(), 120);
        String state = truncateOrNull(item.getState(), 10);
        String companyType = truncateOrNull(item.getCompanyType(), 120);
        if (city != null) {
            sb.append("Cidade: ").append(city);
        }
        if (state != null) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append("UF: ").append(state);
        }
        if (companyType != null) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append("Tipo empresa: ").append(companyType);
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    private static String buildUpdateDescription(LeadDTO dto) {
        StringBuilder sb = new StringBuilder();
        if (dto.getName() != null) sb.append("Nome: ").append(dto.getName()).append(" | ");
        if (dto.getStatus() != null) sb.append("Status: ").append(dto.getStatus()).append(" | ");
        if (dto.getAssignedToId() != null) sb.append("Responsável ID: ").append(dto.getAssignedToId()).append(" | ");
        if (dto.getEstimatedValue() != null) sb.append("Valor: ").append(dto.getEstimatedValue()).append(" | ");
        if (dto.getPhone() != null) sb.append("Telefone: ").append(dto.getPhone()).append(" | ");
        if (dto.getEmail() != null) sb.append("E-mail: ").append(dto.getEmail()).append(" | ");
        String result = sb.toString();
        return result.endsWith(" | ") ? result.substring(0, result.length() - 3) : (result.isEmpty() ? "Sem detalhes" : result);
    }
} 