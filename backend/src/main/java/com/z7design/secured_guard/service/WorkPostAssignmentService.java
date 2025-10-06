package com.z7design.secured_guard.service;

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

@Service
@Transactional
public class WorkPostAssignmentService {

    @Autowired
    private WorkPostAssignmentRepository workPostAssignmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    public List<WorkPostAssignment> getAllWorkPostAssignments() {
        return workPostAssignmentRepository.findAll();
    }

    public Optional<WorkPostAssignment> getWorkPostAssignmentById(UUID id) {
        return workPostAssignmentRepository.findById(id);
    }

    public List<WorkPostAssignment> getWorkPostAssignmentsByEmployee(UUID employeeId) {
        return workPostAssignmentRepository.findByEmployeeId(employeeId);
    }

    public List<WorkPostAssignment> getWorkPostAssignmentsByWorkPost(UUID workPostId) {
        return workPostAssignmentRepository.findByWorkPostId(workPostId);
    }

    public List<WorkPostAssignment> getWorkPostAssignmentsByDate(LocalDate date) {
        return workPostAssignmentRepository.findByAssignmentDate(date);
    }

    public List<WorkPostAssignment> getWorkPostAssignmentsByStatus(WorkPostAssignment.AssignmentStatus status) {
        return workPostAssignmentRepository.findByStatus(status);
    }

    public List<WorkPostAssignment> getWorkPostAssignmentsByDateRange(LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByDateRange(startDate, endDate);
    }

    public List<WorkPostAssignment> getWorkPostAssignmentsByEmployeeAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
    }

    public List<WorkPostAssignment> getWorkPostAssignmentsByWorkPostAndDateRange(UUID workPostId, LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByWorkPostAndDateRange(workPostId, startDate, endDate);
    }

    public WorkPostAssignment createWorkPostAssignment(WorkPostAssignment assignment) {
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

        return workPostAssignmentRepository.save(assignment);
    }

    public WorkPostAssignment updateWorkPostAssignment(UUID id, WorkPostAssignment updatedAssignment) {
        WorkPostAssignment existingAssignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));

        // Atualizar campos permitidos
        existingAssignment.setAssignmentDate(updatedAssignment.getAssignmentDate());
        existingAssignment.setShift(updatedAssignment.getShift());
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

        return workPostAssignmentRepository.save(existingAssignment);
    }

    public void deleteWorkPostAssignment(UUID id) {
        if (!workPostAssignmentRepository.existsById(id)) {
            throw new RuntimeException("Atribuição de posto não encontrada");
        }
        workPostAssignmentRepository.deleteById(id);
    }

    public WorkPostAssignment updateStatus(UUID id, WorkPostAssignment.AssignmentStatus status) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));
        
        assignment.setStatus(status);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());
        
        return workPostAssignmentRepository.save(assignment);
    }

    public WorkPostAssignment confirmAssignment(UUID id) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));
        
        assignment.setStatus(WorkPostAssignment.AssignmentStatus.CONFIRMED);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());
        
        return workPostAssignmentRepository.save(assignment);
    }

    public WorkPostAssignment completeAssignment(UUID id) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));
        
        assignment.setStatus(WorkPostAssignment.AssignmentStatus.COMPLETED);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());
        
        return workPostAssignmentRepository.save(assignment);
    }

    public List<WorkPostAssignment> getTodayAssignments() {
        return workPostAssignmentRepository.findByAssignmentDate(LocalDate.now());
    }

    public List<WorkPostAssignment> getPendingAssignments() {
        return workPostAssignmentRepository.findByStatus(WorkPostAssignment.AssignmentStatus.SCHEDULED);
    }

    public List<WorkPostAssignment> getActiveAssignments() {
        return workPostAssignmentRepository.findByStatus(WorkPostAssignment.AssignmentStatus.CONFIRMED);
    }
}
