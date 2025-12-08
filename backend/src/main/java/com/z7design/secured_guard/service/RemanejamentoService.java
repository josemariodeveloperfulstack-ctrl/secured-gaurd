package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.RemanejamentoDTO;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.RemanejamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class RemanejamentoService {
    @Autowired
    private RemanejamentoRepository remanejamentoRepository;
    
    @Autowired
    private RemanejamentoHistoricoService historicoService;
    
    @Autowired
    private EmployeeRepository employeeRepository;

    /**
     * Cria um novo remanejamento e registra no histórico
     */
    public Remanejamento create(Remanejamento remanejamento, User usuarioQueExecutou, String motivoAlteracao) {
        Remanejamento saved = remanejamentoRepository.save(remanejamento);
        
        // Registrar no histórico
        historicoService.registrarAcao(
            saved, 
            AcaoHistorico.CRIACAO, 
            usuarioQueExecutou, 
            motivoAlteracao != null ? motivoAlteracao : "Criação de remanejamento"
        );
        
        return saved;
    }

    /**
     * Atualiza um remanejamento existente e registra no histórico
     */
    public Remanejamento update(UUID id, Remanejamento remanejamento, User usuarioQueExecutou, String motivoAlteracao) {
        // Buscar dados anteriores para comparação
        Optional<Remanejamento> existingOpt = remanejamentoRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Remanejamento não encontrado");
        }
        
        Remanejamento existing = existingOpt.get();
        remanejamento.setId(id);
        Remanejamento updated = remanejamentoRepository.save(remanejamento);
        
        // Registrar no histórico com dados anteriores
        historicoService.registrarAcao(
            updated, 
            AcaoHistorico.EDICAO, 
            usuarioQueExecutou, 
            motivoAlteracao != null ? motivoAlteracao : "Edição de remanejamento",
            existing,
            null // IP será capturado pelo controller
        );
        
        return updated;
    }

    /**
     * Exclui um remanejamento e registra no histórico
     */
    public void delete(UUID id, User usuarioQueExecutou, String motivoAlteracao) {
        Optional<Remanejamento> existingOpt = remanejamentoRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Remanejamento não encontrado");
        }
        
        Remanejamento existing = existingOpt.get();
        
        // Registrar no histórico antes de deletar
        historicoService.registrarAcao(
            existing, 
            AcaoHistorico.EXCLUSAO, 
            usuarioQueExecutou, 
            motivoAlteracao != null ? motivoAlteracao : "Exclusão de remanejamento"
        );
        
        remanejamentoRepository.deleteById(id);
    }

    /**
     * Métodos de consulta (não modificam dados, não registram histórico)
     */
    public Optional<Remanejamento> findById(UUID id) {
        return remanejamentoRepository.findById(id);
    }

    public List<Remanejamento> findAll() {
        return remanejamentoRepository.findAll();
    }

    public List<Remanejamento> findByEmployeeId(UUID employeeId) {
        return remanejamentoRepository.findByEmployeeId(employeeId);
    }
    
    /**
     * Métodos de conveniência para compatibilidade com código existente
     */
    public Remanejamento create(Remanejamento remanejamento) {
        // Usar um usuário padrão ou null para compatibilidade
        return create(remanejamento, null, "Criação automática");
    }

    public Remanejamento update(UUID id, Remanejamento remanejamento) {
        // Usar um usuário padrão ou null para compatibilidade
        return update(id, remanejamento, null, "Edição automática");
    }

    public void delete(UUID id) {
        // Usar um usuário padrão ou null para compatibilidade
        delete(id, null, "Exclusão automática");
    }
    
    // ============== MÉTODOS COM DTO ==============
    
    public RemanejamentoDTO createFromDTO(RemanejamentoDTO dto, User usuarioQueExecutou, String motivoAlteracao) {
        Remanejamento remanejamento = new Remanejamento();
        mapDTOToEntity(dto, remanejamento);
        
        Remanejamento saved = remanejamentoRepository.save(remanejamento);
        
        // Registrar no histórico
        historicoService.registrarAcao(
            saved, 
            AcaoHistorico.CRIACAO, 
            usuarioQueExecutou, 
            motivoAlteracao != null ? motivoAlteracao : "Criação de remanejamento"
        );
        
        return convertToDTO(saved);
    }
    
    public RemanejamentoDTO updateFromDTO(UUID id, RemanejamentoDTO dto, User usuarioQueExecutou, String motivoAlteracao) {
        Optional<Remanejamento> existingOpt = remanejamentoRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Remanejamento não encontrado");
        }
        
        Remanejamento existing = existingOpt.get();
        mapDTOToEntity(dto, existing);
        existing.setId(id);
        
        Remanejamento updated = remanejamentoRepository.save(existing);
        
        // Registrar no histórico
        historicoService.registrarAcao(
            updated, 
            AcaoHistorico.EDICAO, 
            usuarioQueExecutou, 
            motivoAlteracao != null ? motivoAlteracao : "Edição de remanejamento"
        );
        
        return convertToDTO(updated);
    }
    
    public List<RemanejamentoDTO> findAllAsDTO() {
        return remanejamentoRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public Optional<RemanejamentoDTO> findByIdAsDTO(UUID id) {
        return remanejamentoRepository.findById(id)
                .map(this::convertToDTO);
    }
    
    public List<RemanejamentoDTO> findByEmployeeIdAsDTO(UUID employeeId) {
        return remanejamentoRepository.findByEmployeeId(employeeId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    private void mapDTOToEntity(RemanejamentoDTO dto, Remanejamento entity) {
        if (dto.getEmployeeId() != null) {
            Employee employee = employeeRepository.findById(dto.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado com ID: " + dto.getEmployeeId()));
            entity.setEmployee(employee);
        }
        
        entity.setTipo(dto.getTipo());
        entity.setOrigem(dto.getOrigem());
        entity.setDestino(dto.getDestino());
        
        // Aceitar tanto dataRemanejamento quanto remanejamentoDate (compatibilidade com frontend)
        if (dto.getDataRemanejamento() != null) {
            entity.setDataRemanejamento(dto.getDataRemanejamento());
        } else if (dto.getRemanejamentoDate() != null) {
            entity.setDataRemanejamento(dto.getRemanejamentoDate());
        }
        
        // Aceitar tanto observacao quanto notes (compatibilidade com frontend)
        if (dto.getObservacao() != null) {
            entity.setObservacao(dto.getObservacao());
        } else if (dto.getNotes() != null) {
            entity.setObservacao(dto.getNotes());
        }
    }
    
    private RemanejamentoDTO convertToDTO(Remanejamento entity) {
        RemanejamentoDTO dto = new RemanejamentoDTO();
        dto.setId(entity.getId());
        
        // Forçar inicialização do employee (LAZY loading)
        if (entity.getEmployee() != null) {
            try {
                org.hibernate.Hibernate.initialize(entity.getEmployee());
                dto.setEmployeeId(entity.getEmployee().getId());
                dto.setEmployeeName(entity.getEmployee().getName());
            } catch (Exception e) {
                System.err.println("[WARNING] Erro ao carregar employee: " + e.getMessage());
                dto.setEmployeeId(null);
                dto.setEmployeeName(null);
            }
        }
        
        dto.setTipo(entity.getTipo());
        dto.setOrigem(entity.getOrigem());
        dto.setDestino(entity.getDestino());
        dto.setDataRemanejamento(entity.getDataRemanejamento());
        dto.setObservacao(entity.getObservacao());
        return dto;
    }
} 