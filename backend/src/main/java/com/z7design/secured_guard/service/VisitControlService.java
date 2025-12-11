package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.VisitControlDTO;
import com.z7design.secured_guard.dto.VisitControlStatsDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.VisitControl;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.VisitControlStatus;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.VisitControlRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VisitControlService {

    private final VisitControlRepository visitControlRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkPostRepository workPostRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<VisitControlDTO> getAllVisitControls() {
        return visitControlRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<VisitControlDTO> getVisitControlById(UUID id) {
        return visitControlRepository.findById(id)
                .map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<VisitControlDTO> getTodayVisits() {
        return visitControlRepository.findTodayVisits(LocalDate.now()).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VisitControlDTO> getRecentVisits() {
        return visitControlRepository.findRecentVisits().stream()
                .limit(3)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VisitControlDTO> getVisitsByStatus(VisitControlStatus status) {
        return visitControlRepository.findByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VisitControlDTO> getVisitsBySupervisor(UUID supervisorId) {
        return visitControlRepository.findBySupervisorId(supervisorId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VisitControlStatsDTO getVisitStats() {
        LocalDate today = LocalDate.now();
        
        Long todayCount = visitControlRepository.countTodayVisits(today);
        Long completedCount = visitControlRepository.countByStatus(VisitControlStatus.COMPLETED);
        Long pendingCount = visitControlRepository.countByStatus(VisitControlStatus.SCHEDULED) 
                          + visitControlRepository.countByStatus(VisitControlStatus.PENDING);
        Long activeSupervisors = visitControlRepository.countActiveSupervisors();
        Double successRate = visitControlRepository.calculateSuccessRate();

        if (successRate == null) {
            successRate = 0.0;
        }

        return new VisitControlStatsDTO(
            todayCount,
            completedCount,
            pendingCount,
            successRate,
            activeSupervisors
        );
    }

    @Transactional
    public VisitControlDTO createVisitControl(VisitControlDTO dto) {
        VisitControl visitControl = new VisitControl();
        mapDTOToEntity(dto, visitControl);
        
        VisitControl saved = visitControlRepository.save(visitControl);
        return convertToDTO(saved);
    }

    @Transactional
    public VisitControlDTO updateVisitControl(UUID id, VisitControlDTO dto) {
        VisitControl visitControl = visitControlRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Visita não encontrada com ID: " + id));
        
        mapDTOToEntity(dto, visitControl);
        
        VisitControl updated = visitControlRepository.save(visitControl);
        return convertToDTO(updated);
    }

    @Transactional
    public VisitControlDTO startVisit(UUID id) {
        VisitControl visitControl = visitControlRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Visita não encontrada com ID: " + id));
        
        visitControl.setStatus(VisitControlStatus.IN_PROGRESS);
        visitControl.setStartedAt(LocalDateTime.now());
        
        VisitControl updated = visitControlRepository.save(visitControl);
        return convertToDTO(updated);
    }

    @Transactional
    public VisitControlDTO completeVisit(UUID id, String findings, Boolean isSuccessful) {
        VisitControl visitControl = visitControlRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Visita não encontrada com ID: " + id));
        
        visitControl.setStatus(VisitControlStatus.COMPLETED);
        visitControl.setCompletedAt(LocalDateTime.now());
        visitControl.setFindings(findings);
        visitControl.setIsSuccessful(isSuccessful != null ? isSuccessful : true);
        
        VisitControl updated = visitControlRepository.save(visitControl);
        return convertToDTO(updated);
    }

    @Transactional
    public void deleteVisitControl(UUID id) {
        if (!visitControlRepository.existsById(id)) {
            throw new RuntimeException("Visita não encontrada com ID: " + id);
        }
        visitControlRepository.deleteById(id);
    }

    private void mapDTOToEntity(VisitControlDTO dto, VisitControl entity) {
        entity.setLocation(dto.getLocation());
        entity.setAssignedTo(dto.getAssignedTo());
        entity.setVisitDate(dto.getVisitDate());
        entity.setScheduledAt(dto.getScheduledAt());
        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : VisitControlStatus.SCHEDULED);
        entity.setObservations(dto.getObservations());
        entity.setFindings(dto.getFindings());
        entity.setReportUrl(dto.getReportUrl());
        entity.setIsSuccessful(dto.getIsSuccessful() != null ? dto.getIsSuccessful() : false);

        if (dto.getSupervisorId() != null) {
            Employee supervisor = employeeRepository.findById(dto.getSupervisorId())
                    .orElse(null);
            entity.setSupervisor(supervisor);
        }

        if (dto.getWorkPostId() != null) {
            WorkPost workPost = workPostRepository.findById(dto.getWorkPostId())
                    .orElse(null);
            entity.setWorkPost(workPost);
        }

        if (dto.getCreatedBy() != null) {
            User user = userRepository.findById(dto.getCreatedBy())
                    .orElse(null);
            entity.setCreatedBy(user);
        }

        if (dto.getStartedAt() != null) {
            entity.setStartedAt(dto.getStartedAt());
        }

        if (dto.getCompletedAt() != null) {
            entity.setCompletedAt(dto.getCompletedAt());
        }
    }

    private VisitControlDTO convertToDTO(VisitControl entity) {
        VisitControlDTO dto = new VisitControlDTO();
        dto.setId(entity.getId());
        dto.setLocation(entity.getLocation());
        dto.setAssignedTo(entity.getAssignedTo());
        dto.setVisitDate(entity.getVisitDate());
        dto.setScheduledAt(entity.getScheduledAt());
        dto.setStartedAt(entity.getStartedAt());
        dto.setCompletedAt(entity.getCompletedAt());
        dto.setStatus(entity.getStatus());
        dto.setObservations(entity.getObservations());
        dto.setFindings(entity.getFindings());
        dto.setReportUrl(entity.getReportUrl());
        dto.setIsSuccessful(entity.getIsSuccessful());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getSupervisor() != null) {
            dto.setSupervisorId(entity.getSupervisor().getId());
            dto.setSupervisorName(entity.getSupervisor().getName());
        }

        if (entity.getWorkPost() != null) {
            dto.setWorkPostId(entity.getWorkPost().getId());
            dto.setWorkPostName(entity.getWorkPost().getName());
        }

        if (entity.getCreatedBy() != null) {
            dto.setCreatedBy(entity.getCreatedBy().getId());
            dto.setCreatedByName(entity.getCreatedBy().getUsername());
        }

        return dto;
    }
}














