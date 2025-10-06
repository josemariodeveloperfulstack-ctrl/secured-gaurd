package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.AbsenceRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Service
@Transactional
public class AbsenceService {

    @Autowired
    private AbsenceRepository absenceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    public List<Absence> getAllAbsences() {
        return absenceRepository.findAll();
    }

    public Optional<Absence> getAbsenceById(UUID id) {
        return absenceRepository.findById(id);
    }

    public List<Absence> getAbsencesByEmployee(UUID employeeId) {
        return absenceRepository.findByEmployeeId(employeeId);
    }

    public List<Absence> getAbsencesByDate(LocalDate date) {
        return absenceRepository.findByAbsenceDate(date);
    }

    public List<Absence> getAbsencesByStatus(Absence.AbsenceStatus status) {
        return absenceRepository.findByStatus(status);
    }

    public List<Absence> getAbsencesByType(Absence.AbsenceType type) {
        return absenceRepository.findByAbsenceType(type);
    }

    public List<Absence> getAbsencesByDateRange(LocalDate startDate, LocalDate endDate) {
        return absenceRepository.findByDateRange(startDate, endDate);
    }

    public List<Absence> getAbsencesByEmployeeAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return absenceRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
    }

    public Absence createAbsence(Absence absence) {
        // Validar se o funcionário existe
        Employee employee = employeeRepository.findById(absence.getEmployee().getId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar se o funcionário que cobriu a falta existe (se fornecido)
        if (absence.getCoverageEmployee() != null) {
            Employee coverageEmployee = employeeRepository.findById(absence.getCoverageEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Funcionário que cobriu a falta não encontrado"));
            absence.setCoverageEmployee(coverageEmployee);
        }

        absence.setEmployee(employee);

        return absenceRepository.save(absence);
    }

    public Absence updateAbsence(UUID id, Absence updatedAbsence) {
        Absence existingAbsence = absenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Falta não encontrada"));

        // Atualizar campos permitidos
        existingAbsence.setAbsenceDate(updatedAbsence.getAbsenceDate());
        existingAbsence.setAbsenceType(updatedAbsence.getAbsenceType());
        existingAbsence.setReason(updatedAbsence.getReason());
        existingAbsence.setMedicalCertificateDays(updatedAbsence.getMedicalCertificateDays());
        existingAbsence.setDocumentUrl(updatedAbsence.getDocumentUrl());
        existingAbsence.setStatus(updatedAbsence.getStatus());
        existingAbsence.setIsJustified(updatedAbsence.getIsJustified());
        existingAbsence.setCoverageNotes(updatedAbsence.getCoverageNotes());

        // Validar e atualizar funcionário que cobriu a falta se fornecido
        if (updatedAbsence.getCoverageEmployee() != null) {
            Employee coverageEmployee = employeeRepository.findById(updatedAbsence.getCoverageEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Funcionário que cobriu a falta não encontrado"));
            existingAbsence.setCoverageEmployee(coverageEmployee);
        }

        return absenceRepository.save(existingAbsence);
    }

    public void deleteAbsence(UUID id) {
        if (!absenceRepository.existsById(id)) {
            throw new RuntimeException("Falta não encontrada");
        }
        absenceRepository.deleteById(id);
    }

    public Absence updateStatus(UUID id, Absence.AbsenceStatus status) {
        Absence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Falta não encontrada"));
        
        absence.setStatus(status);
        absence.setUpdatedAt(java.time.LocalDateTime.now());
        
        return absenceRepository.save(absence);
    }

    public Absence approveAbsence(UUID id, UUID approvedByEmployeeId) {
        Absence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Falta não encontrada"));
        
        Employee approvedBy = employeeRepository.findById(approvedByEmployeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário aprovador não encontrado"));
        
        absence.setStatus(Absence.AbsenceStatus.APPROVED);
        absence.setUpdatedAt(java.time.LocalDateTime.now());
        
        return absenceRepository.save(absence);
    }

    public Absence rejectAbsence(UUID id, String reason) {
        Absence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Falta não encontrada"));
        
        absence.setStatus(Absence.AbsenceStatus.REJECTED);
        absence.setCoverageNotes((absence.getCoverageNotes() != null ? absence.getCoverageNotes() + " | " : "") + "Rejeitado: " + reason);
        
        return absenceRepository.save(absence);
    }

    public List<Absence> getPendingAbsences() {
        return absenceRepository.findByStatus(Absence.AbsenceStatus.PENDING);
    }

    public List<Absence> getTodayAbsences() {
        return absenceRepository.findByAbsenceDate(LocalDate.now());
    }

    public Long getEmployeeAbsenceCount(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return absenceRepository.countApprovedAbsencesByEmployeeAndDateRange(employeeId, startDate, endDate);
    }
}
