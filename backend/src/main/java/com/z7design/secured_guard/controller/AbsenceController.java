package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.dto.AbsenceDTO;
import com.z7design.secured_guard.service.AbsenceService;
import com.z7design.secured_guard.service.EmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/absences")
@CrossOrigin(origins = "*")
public class AbsenceController {

    @Autowired
    private AbsenceService absenceService;
    
    @Autowired
    private EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<List<AbsenceDTO>> getAllAbsences() {
        List<Absence> absences = absenceService.getAllAbsences();
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AbsenceDTO> getAbsenceById(@PathVariable UUID id) {
        return absenceService.getAbsenceById(id)
                .map(absence -> ResponseEntity.ok(AbsenceDTO.fromEntity(absence)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<AbsenceDTO>> getAbsencesByEmployee(@PathVariable UUID employeeId) {
        List<Absence> absences = absenceService.getAbsencesByEmployee(employeeId);
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<AbsenceDTO>> getAbsencesByDate(@PathVariable LocalDate date) {
        List<Absence> absences = absenceService.getAbsencesByDate(date);
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AbsenceDTO>> getAbsencesByStatus(@PathVariable Absence.AbsenceStatus status) {
        List<Absence> absences = absenceService.getAbsencesByStatus(status);
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/absence-type/{absenceType}")
    public ResponseEntity<List<AbsenceDTO>> getAbsencesByType(@PathVariable Absence.AbsenceType absenceType) {
        List<Absence> absences = absenceService.getAbsencesByType(absenceType);
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<AbsenceDTO>> getAbsencesByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<Absence> absences = absenceService.getAbsencesByDateRange(startDate, endDate);
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/employee/{employeeId}/date-range")
    public ResponseEntity<List<AbsenceDTO>> getAbsencesByEmployeeAndDateRange(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<Absence> absences = absenceService.getAbsencesByEmployeeAndDateRange(employeeId, startDate, endDate);
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<AbsenceDTO>> getPendingAbsences() {
        List<Absence> absences = absenceService.getPendingAbsences();
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/today")
    public ResponseEntity<List<AbsenceDTO>> getTodayAbsences() {
        List<Absence> absences = absenceService.getTodayAbsences();
        List<AbsenceDTO> absenceDTOs = absences.stream()
            .map(AbsenceDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(absenceDTOs);
    }

    @GetMapping("/employee/{employeeId}/count")
    public ResponseEntity<Long> getEmployeeAbsenceCount(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        Long count = absenceService.getEmployeeAbsenceCount(employeeId, startDate, endDate);
        return ResponseEntity.ok(count);
    }

    @PostMapping
    public ResponseEntity<AbsenceDTO> createAbsence(@RequestBody AbsenceDTO absenceDTO) {
        try {
            // Buscar o funcionário pelo ID
            Employee employee = employeeService.findById(absenceDTO.getEmployeeId());
            Absence absence = absenceDTO.toEntity();
            absence.setEmployee(employee);
            
            Absence createdAbsence = absenceService.createAbsence(absence);
            return ResponseEntity.ok(AbsenceDTO.fromEntity(createdAbsence));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Absence> updateAbsence(@PathVariable UUID id, @RequestBody Absence absence) {
        try {
            Absence updatedAbsence = absenceService.updateAbsence(id, absence);
            return ResponseEntity.ok(updatedAbsence);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Absence> updateStatus(@PathVariable UUID id, @RequestParam Absence.AbsenceStatus status) {
        try {
            Absence updatedAbsence = absenceService.updateStatus(id, status);
            return ResponseEntity.ok(updatedAbsence);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAbsence(@PathVariable UUID id) {
        try {
            absenceService.deleteAbsence(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('HR_APPROVE', 'HR_READ', 'HR_WRITE', 'HR_DELETE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'RECURSOS_HUMANOS', 'RH', 'DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<AbsenceDTO> approveAbsence(
            @PathVariable UUID id,
            @RequestBody(required = false) ApprovalRequest request) {
        try {
            Absence absence = absenceService.approveAbsence(id, request != null ? request.getObservacoes() : null);
            return ResponseEntity.ok(AbsenceDTO.fromEntity(absence));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('HR_APPROVE', 'HR_READ', 'HR_WRITE', 'HR_DELETE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'RECURSOS_HUMANOS', 'RH', 'DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<AbsenceDTO> rejectAbsence(
            @PathVariable UUID id,
            @RequestBody ApprovalRequest request) {
        try {
            Absence absence = absenceService.rejectAbsence(id, request.getObservacoes());
            return ResponseEntity.ok(AbsenceDTO.fromEntity(absence));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Classe interna para requests de aprovação
    public static class ApprovalRequest {
        private String observacoes;

        public String getObservacoes() {
            return observacoes;
        }

        public void setObservacoes(String observacoes) {
            this.observacoes = observacoes;
        }
    }
}
