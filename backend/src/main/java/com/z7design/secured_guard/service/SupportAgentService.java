package com.z7design.secured_guard.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.dto.CreateAgentRequest;
import com.z7design.secured_guard.dto.SupportAgentDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.SupportAgent;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.AgentStatus;
import com.z7design.secured_guard.repository.SupportAgentRepository;
import com.z7design.secured_guard.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@Transactional
public class SupportAgentService {
    
    @Autowired
    private SupportAgentRepository agentRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Criar novo agente
     */
    public SupportAgentDTO createAgent(CreateAgentRequest request) {
        log.info("Criando novo agente para o usuário: {}", request.getUserId());
        
        // Verificar se já existe agente para este usuário
        if (agentRepository.findByUserId(request.getUserId()).isPresent()) {
            throw new BusinessException("Já existe um agente cadastrado para este usuário");
        }
        
        User user = userRepository.findById(request.getUserId())
            .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        SupportAgent agent = new SupportAgent();
        agent.setUser(user);
        agent.setDepartment(request.getDepartment());
        agent.setActive(request.getActive() != null ? request.getActive() : true);
        agent.setStatus(AgentStatus.OFFLINE);
        agent.setTotalTickets(0);
        agent.setResolvedTickets(0);
        agent.setLastActivity(LocalDateTime.now());
        
        agent = agentRepository.save(agent);
        log.info("Agente criado com sucesso: {}", agent.getId());
        
        return SupportAgentDTO.fromEntity(agent);
    }
    
    /**
     * Buscar todos os agentes
     */
    public List<SupportAgentDTO> getAllAgents() {
        log.info("Buscando todos os agentes");
        return agentRepository.findAll().stream()
            .map(SupportAgentDTO::fromEntity)
            .collect(Collectors.toList());
    }
    
    /**
     * Buscar agentes ativos
     */
    public List<SupportAgentDTO> getActiveAgents() {
        log.info("Buscando agentes ativos");
        return agentRepository.findByActiveTrue().stream()
            .map(SupportAgentDTO::fromEntity)
            .collect(Collectors.toList());
    }
    
    /**
     * Buscar agente por ID
     */
    public SupportAgentDTO getAgentById(UUID id) {
        log.info("Buscando agente por ID: {}", id);
        SupportAgent agent = agentRepository.findById(id)
            .orElseThrow(() -> new BusinessException("Agente não encontrado"));
        return SupportAgentDTO.fromEntity(agent);
    }
    
    /**
     * Buscar agente por ID do usuário
     */
    public SupportAgentDTO getAgentByUserId(UUID userId) {
        log.info("Buscando agente por ID do usuário: {}", userId);
        SupportAgent agent = agentRepository.findByUserId(userId)
            .orElseThrow(() -> new BusinessException("Agente não encontrado para este usuário"));
        return SupportAgentDTO.fromEntity(agent);
    }
    
    /**
     * Atualizar status do agente
     */
    public SupportAgentDTO updateAgentStatus(UUID agentId, AgentStatus newStatus) {
        log.info("Atualizando status do agente {} para {}", agentId, newStatus);
        
        SupportAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new BusinessException("Agente não encontrado"));
        
        agent.setStatus(newStatus);
        agent.setLastActivity(LocalDateTime.now());
        
        agent = agentRepository.save(agent);
        return SupportAgentDTO.fromEntity(agent);
    }
    
    /**
     * Atualizar departamento do agente
     */
    public SupportAgentDTO updateAgentDepartment(UUID agentId, String department) {
        log.info("Atualizando departamento do agente {}", agentId);
        
        SupportAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new BusinessException("Agente não encontrado"));
        
        agent.setDepartment(department);
        agent = agentRepository.save(agent);
        
        return SupportAgentDTO.fromEntity(agent);
    }
    
    /**
     * Ativar/desativar agente
     */
    public SupportAgentDTO toggleAgentActive(UUID agentId) {
        log.info("Alternando status ativo do agente {}", agentId);
        
        SupportAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new BusinessException("Agente não encontrado"));
        
        agent.setActive(!agent.getActive());
        
        // Se desativar, colocar como offline
        if (!agent.getActive()) {
            agent.setStatus(AgentStatus.OFFLINE);
        }
        
        agent = agentRepository.save(agent);
        return SupportAgentDTO.fromEntity(agent);
    }
    
    /**
     * Incrementar contador de tickets do agente
     */
    public void incrementAgentTicketCount(UUID agentId) {
        SupportAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new BusinessException("Agente não encontrado"));
        
        agent.setTotalTickets(agent.getTotalTickets() + 1);
        agentRepository.save(agent);
    }
    
    /**
     * Incrementar contador de tickets resolvidos
     */
    public void incrementAgentResolvedCount(UUID agentId) {
        SupportAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new BusinessException("Agente não encontrado"));
        
        agent.setResolvedTickets(agent.getResolvedTickets() + 1);
        agentRepository.save(agent);
    }
    
    /**
     * Buscar agente disponível (com menor carga)
     */
    public SupportAgentDTO getAvailableAgent() {
        log.info("Buscando agente disponível");
        
        List<SupportAgent> availableAgents = agentRepository.findAvailableAgentsOrderByWorkload();
        
        if (availableAgents.isEmpty()) {
            throw new BusinessException("Nenhum agente disponível no momento");
        }
        
        return SupportAgentDTO.fromEntity(availableAgents.get(0));
    }
    
    /**
     * Buscar agentes por status
     */
    public List<SupportAgentDTO> getAgentsByStatus(AgentStatus status) {
        log.info("Buscando agentes com status: {}", status);
        return agentRepository.findByActiveTrueAndStatus(status).stream()
            .map(SupportAgentDTO::fromEntity)
            .collect(Collectors.toList());
    }
    
    /**
     * Deletar agente
     */
    public void deleteAgent(UUID agentId) {
        log.info("Deletando agente: {}", agentId);
        
        SupportAgent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new BusinessException("Agente não encontrado"));
        
        agentRepository.delete(agent);
        log.info("Agente deletado com sucesso");
    }
}

