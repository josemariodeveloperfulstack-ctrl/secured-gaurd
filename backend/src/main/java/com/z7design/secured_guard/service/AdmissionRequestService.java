package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.AdmissionRequestDTO;
import com.z7design.secured_guard.dto.CreateAdmissionRequestDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.AdmissionRequest;
import com.z7design.secured_guard.model.Unit;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.AdmissionRequestStatus;
import com.z7design.secured_guard.model.enums.AdmissionRequestType;
import com.z7design.secured_guard.model.enums.AdmissionRequestPriority;
import com.z7design.secured_guard.repository.AdmissionRequestRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdmissionRequestService {
    
    private final AdmissionRequestRepository admissionRequestRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;
    
    public List<AdmissionRequestDTO> findAll() {
        List<AdmissionRequest> requests = admissionRequestRepository.findAll();
        return requests.stream()
                .map(AdmissionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public AdmissionRequestDTO findById(UUID id) {
        AdmissionRequest request = admissionRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitação não encontrada com ID: " + id));
        return AdmissionRequestDTO.fromEntity(request);
    }
    
    public AdmissionRequestDTO create(CreateAdmissionRequestDTO dto) {
        log.info("Criando nova solicitação de admissão/demissão: {}", dto);
        
        AdmissionRequest request = AdmissionRequest.builder()
                .type(dto.getType())
                .employeeName(dto.getEmployeeName())
                .employeeCpf(dto.getEmployeeCpf())
                .employeeRg(dto.getEmployeeRg())
                .employeeEmail(dto.getEmployeeEmail())
                .employeePhone(dto.getEmployeePhone())
                .position(dto.getPosition())
                .department(dto.getDepartment())
                .unit(dto.getUnitId() != null ? unitRepository.findById(dto.getUnitId()).orElse(null) : null)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .reason(dto.getReason())
                .justification(dto.getJustification())
                .priority(dto.getPriority() != null ? dto.getPriority() : AdmissionRequestPriority.MEDIUM)
                .status(AdmissionRequestStatus.PENDING)
                .requestDate(LocalDate.now())
                .requesterName(dto.getRequesterName())
                .requester(dto.getRequesterId() != null ? userRepository.findById(dto.getRequesterId()).orElse(null) : null)
                .approver(dto.getApproverId() != null ? userRepository.findById(dto.getApproverId()).orElse(null) : null)
                .notes(dto.getNotes())
                .build();
        
        AdmissionRequest savedRequest = admissionRequestRepository.save(request);
        log.info("Solicitação criada com sucesso: {}", savedRequest.getId());
        return AdmissionRequestDTO.fromEntity(savedRequest);
    }
    
    public AdmissionRequestDTO update(UUID id, CreateAdmissionRequestDTO dto) {
        log.info("Atualizando solicitação: {}", id);
        
        AdmissionRequest existingRequest = admissionRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitação não encontrada com ID: " + id));
        
        // Atualizar campos
        existingRequest.setType(dto.getType());
        existingRequest.setEmployeeName(dto.getEmployeeName());
        existingRequest.setEmployeeCpf(dto.getEmployeeCpf());
        existingRequest.setEmployeeRg(dto.getEmployeeRg());
        existingRequest.setEmployeeEmail(dto.getEmployeeEmail());
        existingRequest.setEmployeePhone(dto.getEmployeePhone());
        existingRequest.setPosition(dto.getPosition());
        existingRequest.setDepartment(dto.getDepartment());
        existingRequest.setUnit(dto.getUnitId() != null ? unitRepository.findById(dto.getUnitId()).orElse(null) : null);
        existingRequest.setStartDate(dto.getStartDate());
        existingRequest.setEndDate(dto.getEndDate());
        existingRequest.setReason(dto.getReason());
        existingRequest.setJustification(dto.getJustification());
        if (dto.getPriority() != null) {
            existingRequest.setPriority(dto.getPriority());
        }
        existingRequest.setRequesterName(dto.getRequesterName());
        existingRequest.setRequester(dto.getRequesterId() != null ? userRepository.findById(dto.getRequesterId()).orElse(null) : null);
        existingRequest.setApprover(dto.getApproverId() != null ? userRepository.findById(dto.getApproverId()).orElse(null) : null);
        existingRequest.setNotes(dto.getNotes());
        
        AdmissionRequest updatedRequest = admissionRequestRepository.save(existingRequest);
        log.info("Solicitação atualizada com sucesso: {}", updatedRequest.getId());
        return AdmissionRequestDTO.fromEntity(updatedRequest);
    }
    
    public void delete(UUID id) {
        log.info("Excluindo solicitação: {}", id);
        if (!admissionRequestRepository.existsById(id)) {
            throw new ResourceNotFoundException("Solicitação não encontrada com ID: " + id);
        }
        admissionRequestRepository.deleteById(id);
        log.info("Solicitação excluída com sucesso: {}", id);
    }
    
    public AdmissionRequestDTO approve(UUID id, String approverName, String approvalNotes) {
        log.info("Aprovando solicitação: {}", id);
        
        AdmissionRequest request = admissionRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitação não encontrada com ID: " + id));
        
        if (request.getStatus() != AdmissionRequestStatus.PENDING) {
            throw new IllegalStateException("Apenas solicitações pendentes podem ser aprovadas");
        }
        
        request.setStatus(AdmissionRequestStatus.APPROVED);
        request.setApprovalDate(LocalDate.now());
        request.setApprovalNotes(approvalNotes);
        // TODO: Buscar usuário atual do contexto de segurança
        if (approverName != null) {
            request.setApprovedByName(approverName);
        }
        
        AdmissionRequest approvedRequest = admissionRequestRepository.save(request);
        log.info("Solicitação aprovada com sucesso: {}", approvedRequest.getId());
        return AdmissionRequestDTO.fromEntity(approvedRequest);
    }
    
    public AdmissionRequestDTO reject(UUID id, String rejectorName, String rejectionReason) {
        log.info("Rejeitando solicitação: {}", id);
        
        AdmissionRequest request = admissionRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitação não encontrada com ID: " + id));
        
        if (request.getStatus() != AdmissionRequestStatus.PENDING) {
            throw new IllegalStateException("Apenas solicitações pendentes podem ser rejeitadas");
        }
        
        request.setStatus(AdmissionRequestStatus.REJECTED);
        request.setRejectionReason(rejectionReason);
        request.setRejectedByName(rejectorName);
        // TODO: Buscar usuário atual do contexto de segurança e setar rejectedBy
        
        AdmissionRequest rejectedRequest = admissionRequestRepository.save(request);
        log.info("Solicitação rejeitada com sucesso: {}", rejectedRequest.getId());
        return AdmissionRequestDTO.fromEntity(rejectedRequest);
    }
    
    public AdmissionRequestDTO complete(UUID id) {
        log.info("Completando solicitação: {}", id);
        
        AdmissionRequest request = admissionRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitação não encontrada com ID: " + id));
        
        if (request.getStatus() != AdmissionRequestStatus.APPROVED) {
            throw new IllegalStateException("Apenas solicitações aprovadas podem ser completadas");
        }
        
        request.setStatus(AdmissionRequestStatus.COMPLETED);
        request.setCompletionDate(LocalDate.now());
        
        AdmissionRequest completedRequest = admissionRequestRepository.save(request);
        log.info("Solicitação completada com sucesso: {}", completedRequest.getId());
        return AdmissionRequestDTO.fromEntity(completedRequest);
    }
    
    public List<AdmissionRequestDTO> findByStatus(AdmissionRequestStatus status) {
        List<AdmissionRequest> requests = admissionRequestRepository.findByStatus(status);
        return requests.stream()
                .map(AdmissionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public List<AdmissionRequestDTO> findByType(AdmissionRequestType type) {
        List<AdmissionRequest> requests = admissionRequestRepository.findByType(type);
        return requests.stream()
                .map(AdmissionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public List<AdmissionRequestDTO> findPendingApprovalRequests() {
        List<AdmissionRequest> requests = admissionRequestRepository.findPendingApprovalRequests();
        return requests.stream()
                .map(AdmissionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public List<AdmissionRequestDTO> searchRequests(String type, String searchTerm, LocalDate startDate, LocalDate endDate) {
        AdmissionRequestType requestType = null;
        if (type != null && !type.isEmpty()) {
            try {
                requestType = AdmissionRequestType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Tipo de solicitação inválido: {}", type);
            }
        }
        
        List<AdmissionRequest> requests = admissionRequestRepository.searchWithFilters(
            requestType,
            searchTerm,
            startDate,
            endDate
        );
        
        return requests.stream()
                .map(AdmissionRequestDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public long countByStatus(AdmissionRequestStatus status) {
        return admissionRequestRepository.countByStatus(status);
    }
    
    public long countByType(AdmissionRequestType type) {
        return admissionRequestRepository.countByType(type);
    }
}

