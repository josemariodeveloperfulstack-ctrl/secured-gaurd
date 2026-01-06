package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CorrectiveActionDTO;
import com.z7design.secured_guard.dto.CreateCorrectiveActionDTO;
import com.z7design.secured_guard.model.CorrectiveAction;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.CorrectiveActionRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Serviço para gerenciamento de ações corretivas
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CorrectiveActionService {

    private final CorrectiveActionRepository actionRepository;
    private final UserRepository userRepository;
    private final AuthenticationService authenticationService;

    /**
     * Cria uma nova ação corretiva
     */
    public CorrectiveAction createAction(CreateCorrectiveActionDTO dto, Authentication authentication) {
        log.info("Criando ação corretiva: {}", dto.getTitle());
        
        User currentUser = authenticationService.getCurrentUser(authentication);
        
        CorrectiveAction action = CorrectiveAction.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .origin(dto.getOrigin())
                .priority(dto.getPriority())
                .status(dto.getStatus() != null ? dto.getStatus() : "PENDENTE")
                .dueDate(dto.getDueDate())
                .department(dto.getDepartment())
                .notes(dto.getNotes())
                .createdByUser(currentUser)
                .build();
        
        // Definir responsável
        if (dto.getResponsibleUserId() != null) {
            User responsible = userRepository.findById(dto.getResponsibleUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Usuário responsável não encontrado"));
            action.setResponsibleUser(responsible);
            action.setResponsibleName(responsible.getName());
        } else if (dto.getResponsibleName() != null && !dto.getResponsibleName().trim().isEmpty()) {
            action.setResponsibleName(dto.getResponsibleName());
        }
        
        // Relacionamentos opcionais
        // TODO: Implementar quando as entidades relacionadas estiverem disponíveis
        
        return actionRepository.save(action);
    }

    /**
     * Busca todas as ações corretivas
     */
    @Transactional(readOnly = true)
    public List<CorrectiveAction> getAllActions() {
        return actionRepository.findAll();
    }

    /**
     * Busca ação por ID
     */
    @Transactional(readOnly = true)
    public CorrectiveAction getActionById(UUID id) {
        return actionRepository.findById(id).orElse(null);
    }

    /**
     * Atualiza ação corretiva
     */
    public CorrectiveAction updateAction(UUID id, CreateCorrectiveActionDTO dto) {
        log.info("Atualizando ação corretiva: {}", id);
        
        return actionRepository.findById(id)
                .map(existing -> {
                    existing.setTitle(dto.getTitle());
                    existing.setDescription(dto.getDescription());
                    existing.setOrigin(dto.getOrigin());
                    existing.setPriority(dto.getPriority());
                    if (dto.getStatus() != null) {
                        existing.setStatus(dto.getStatus());
                    }
                    existing.setDueDate(dto.getDueDate());
                    existing.setDepartment(dto.getDepartment());
                    existing.setNotes(dto.getNotes());
                    
                    // Atualizar responsável
                    if (dto.getResponsibleUserId() != null) {
                        User responsible = userRepository.findById(dto.getResponsibleUserId())
                                .orElseThrow(() -> new IllegalArgumentException("Usuário responsável não encontrado"));
                        existing.setResponsibleUser(responsible);
                        existing.setResponsibleName(responsible.getName());
                    } else if (dto.getResponsibleName() != null && !dto.getResponsibleName().trim().isEmpty()) {
                        existing.setResponsibleName(dto.getResponsibleName());
                        existing.setResponsibleUser(null);
                    }
                    
                    return actionRepository.save(existing);
                })
                .orElse(null);
    }

    /**
     * Marca ação como concluída
     */
    public CorrectiveAction completeAction(UUID id) {
        log.info("Concluindo ação corretiva: {}", id);
        
        return actionRepository.findById(id)
                .map(action -> {
                    action.setStatus("CONCLUIDA");
                    action.setCompletionDate(LocalDate.now());
                    return actionRepository.save(action);
                })
                .orElse(null);
    }

    /**
     * Exclui ação corretiva
     */
    public void deleteAction(UUID id) {
        log.info("Excluindo ação corretiva: {}", id);
        actionRepository.deleteById(id);
    }

    /**
     * Busca ações pendentes
     */
    @Transactional(readOnly = true)
    public List<CorrectiveAction> getPendingActions() {
        return actionRepository.findPendingActions();
    }

    /**
     * Busca ações vencidas
     */
    @Transactional(readOnly = true)
    public List<CorrectiveAction> getOverdueActions() {
        return actionRepository.findOverdueActions(LocalDate.now());
    }

    /**
     * Converte entidade para DTO
     */
    public CorrectiveActionDTO toDTO(CorrectiveAction action) {
        return CorrectiveActionDTO.builder()
                .id(action.getId())
                .title(action.getTitle())
                .description(action.getDescription())
                .origin(action.getOrigin())
                .priority(action.getPriority())
                .status(action.getStatus())
                .responsibleUserId(action.getResponsibleUser() != null ? action.getResponsibleUser().getId() : null)
                .responsibleName(action.getResponsibleName())
                .dueDate(action.getDueDate())
                .completionDate(action.getCompletionDate())
                .department(action.getDepartment())
                .notes(action.getNotes())
                .relatedInspectionId(action.getRelatedInspection() != null ? action.getRelatedInspection().getId() : null)
                .relatedAccidentId(action.getRelatedAccident() != null ? action.getRelatedAccident().getId() : null)
                .relatedNonConformityId(action.getRelatedNonConformity() != null ? action.getRelatedNonConformity().getId() : null)
                .createdByUserId(action.getCreatedByUser() != null ? action.getCreatedByUser().getId() : null)
                .createdAt(action.getCreatedAt())
                .updatedAt(action.getUpdatedAt())
                .build();
    }
}

