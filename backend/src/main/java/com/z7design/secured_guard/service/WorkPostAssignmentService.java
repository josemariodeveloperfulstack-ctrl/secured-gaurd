package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.WorkPostAssignmentResponse;
import com.z7design.secured_guard.model.WorkPostAssignment;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.repository.WorkPostAssignmentRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkPostAssignmentService {

    @Autowired
    private WorkPostAssignmentRepository workPostAssignmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getAllWorkPostAssignments() {
        return workPostAssignmentRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<WorkPostAssignmentResponse> getWorkPostAssignmentById(UUID id) {
        return workPostAssignmentRepository.findById(id).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByEmployee(UUID employeeId) {
        return workPostAssignmentRepository.findByEmployeeId(employeeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByWorkPost(UUID workPostId) {
        return workPostAssignmentRepository.findByWorkPostId(workPostId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByDate(LocalDate date) {
        return workPostAssignmentRepository.findByAssignmentDate(date).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByStatus(WorkPostAssignment.AssignmentStatus status) {
        return workPostAssignmentRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByDateRange(LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByDateRange(startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByEmployeeAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByWorkPostAndDateRange(UUID workPostId, LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByWorkPostAndDateRange(workPostId, startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public WorkPostAssignmentResponse createWorkPostAssignment(WorkPostAssignment assignment) {
        // Validar se o funcionário existe
        Employee employee = employeeRepository.findById(assignment.getEmployee().getId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar se o posto de trabalho existe
        WorkPost workPost = workPostRepository.findById(assignment.getWorkPost().getId())
                .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));

        // Verificar conflitos de horário para o mesmo funcionário na mesma data
        List<WorkPostAssignment> existingAssignments = workPostAssignmentRepository
                .findActiveAssignmentsByDateAndEmployee(assignment.getAssignmentDate(), employee.getId());
        
        if (!existingAssignments.isEmpty()) {
            throw new RuntimeException("Funcionário já possui atribuição ativa nesta data");
        }

        // Verificar conflitos de horário para o mesmo posto na mesma data
        List<WorkPostAssignment> existingPostAssignments = workPostAssignmentRepository
                .findActiveAssignmentsByDateAndPost(assignment.getAssignmentDate(), workPost.getId());
        
        if (!existingPostAssignments.isEmpty()) {
            throw new RuntimeException("Posto de trabalho já possui atribuição ativa nesta data");
        }

        assignment.setEmployee(employee);
        assignment.setWorkPost(workPost);
        assignment.setCreatedAt(java.time.LocalDateTime.now());
        assignment.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(workPostAssignmentRepository.save(assignment));
    }

    public WorkPostAssignmentResponse updateWorkPostAssignment(UUID id, WorkPostAssignment updatedAssignment) {
        WorkPostAssignment existingAssignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));

        // Atualizar campos permitidos
        existingAssignment.setAssignmentDate(updatedAssignment.getAssignmentDate());
        existingAssignment.setShiftType(updatedAssignment.getShiftType());
        existingAssignment.setStartTime(updatedAssignment.getStartTime());
        existingAssignment.setEndTime(updatedAssignment.getEndTime());
        existingAssignment.setStatus(updatedAssignment.getStatus());
        existingAssignment.setObservations(updatedAssignment.getObservations());
        existingAssignment.setUpdatedAt(java.time.LocalDateTime.now());

        // Validar e atualizar funcionário se fornecido
        if (updatedAssignment.getEmployee() != null) {
            Employee employee = employeeRepository.findById(updatedAssignment.getEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));
            existingAssignment.setEmployee(employee);
        }

        // Validar e atualizar posto de trabalho se fornecido
        if (updatedAssignment.getWorkPost() != null) {
            WorkPost workPost = workPostRepository.findById(updatedAssignment.getWorkPost().getId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            existingAssignment.setWorkPost(workPost);
        }

        return mapToResponse(workPostAssignmentRepository.save(existingAssignment));
    }

    public void deleteWorkPostAssignment(UUID id) {
        if (!workPostAssignmentRepository.existsById(id)) {
            throw new RuntimeException("Atribuição de posto não encontrada");
        }
        workPostAssignmentRepository.deleteById(id);
    }

    public WorkPostAssignmentResponse updateStatus(UUID id, WorkPostAssignment.AssignmentStatus status) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));
        
        assignment.setStatus(status);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());
        
        return mapToResponse(workPostAssignmentRepository.save(assignment));
    }

    public WorkPostAssignmentResponse confirmAssignment(UUID id) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));
        
        assignment.setStatus(WorkPostAssignment.AssignmentStatus.CONFIRMED);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());
        
        return mapToResponse(workPostAssignmentRepository.save(assignment));
    }

    public WorkPostAssignmentResponse completeAssignment(UUID id) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));
        
        assignment.setStatus(WorkPostAssignment.AssignmentStatus.COMPLETED);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());
        
        return mapToResponse(workPostAssignmentRepository.save(assignment));
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getTodayAssignments() {
        return workPostAssignmentRepository.findByAssignmentDate(LocalDate.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getPendingAssignments() {
        return workPostAssignmentRepository.findByStatus(WorkPostAssignment.AssignmentStatus.PENDING).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getActiveAssignments() {
        return workPostAssignmentRepository.findByStatus(WorkPostAssignment.AssignmentStatus.CONFIRMED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private WorkPostAssignmentResponse mapToResponse(WorkPostAssignment assignment) {
        WorkPostAssignmentResponse.SimpleEmployee employeeData = null;
        if (assignment.getEmployee() != null) {
            employeeData = new WorkPostAssignmentResponse.SimpleEmployee(
                    assignment.getEmployee().getId(),
                    assignment.getEmployee().getName()
            );
        }

        WorkPostAssignmentResponse.SimpleWorkPost workPostData = null;
        if (assignment.getWorkPost() != null) {
            workPostData = new WorkPostAssignmentResponse.SimpleWorkPost(
                    assignment.getWorkPost().getId(),
                    assignment.getWorkPost().getName()
            );
        }

        String shift = assignment.getShiftType() != null ? assignment.getShiftType().name() : null;

        String status = null;
        if (assignment.getStatus() != null) {
            switch (assignment.getStatus()) {
                case PENDING -> status = "SCHEDULED";
                case ACTIVE, CONFIRMED -> status = "CONFIRMED";
                case COMPLETED -> status = "COMPLETED";
                case CANCELLED -> status = "CANCELLED";
                case MODIFIED -> status = "MODIFIED";
                default -> status = assignment.getStatus().name();
            }
        }

        return WorkPostAssignmentResponse.builder()
                .id(assignment.getId())
                .employee(employeeData)
                .workPost(workPostData)
                .assignmentDate(assignment.getAssignmentDate())
                .shift(shift)
                .startTime(assignment.getStartTime())
                .endTime(assignment.getEndTime())
                .status(status)
                .primaryAssignment(assignment.getIsPrimaryAssignment())
                .backupAssignment(assignment.getIsBackupAssignment())
                .observations(assignment.getObservations())
                .specialInstructions(assignment.getSpecialInstructions())
                .assignedById(assignment.getAssignedBy() != null ? assignment.getAssignedBy().getId() : null)
                .assignmentDateTime(assignment.getAssignmentDateTime())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }
}
