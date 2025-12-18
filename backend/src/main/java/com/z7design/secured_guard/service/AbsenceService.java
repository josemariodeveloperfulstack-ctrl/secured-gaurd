package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.AbsenceRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Service
@Transactional
@Slf4j
public class AbsenceService {

    @Autowired
    private AbsenceRepository absenceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    public List<Absence> getAllAbsences() {
        try {
            log.info("Buscando todas as faltas com relacionamentos");
            // Primeiro tentar com JPQL
            try {
                List<Absence> absences = absenceRepository.findAllWithRelationships();
                log.info("✅ Faltas encontradas com JPQL: {} registros", absences.size());
                return absences;
            } catch (Exception e1) {
                log.warn("⚠️ Erro com JPQL, tentando método padrão: {}", e1.getMessage());
                // Se falhar, usar findAll() padrão e carregar relações manualmente
                List<Absence> absences = absenceRepository.findAll();
                log.info("✅ Faltas encontradas (método padrão): {} registros", absences.size());
                // Forçar inicialização das relações dentro da transação
                for (Absence absence : absences) {
                    try {
                        if (absence.getEmployee() != null) {
                            absence.getEmployee().getName(); // Forçar inicialização
                        }
                        if (absence.getCoverageEmployee() != null) {
                            absence.getCoverageEmployee().getName(); // Forçar inicialização
                        }
                        if (absence.getApprovedBy() != null) {
                            absence.getApprovedBy().getName(); // Forçar inicialização
                        }
                    } catch (Exception e2) {
                        log.warn("⚠️ Erro ao inicializar relações da falta {}: {}", absence.getId(), e2.getMessage());
                    }
                }
                return absences;
            }
        } catch (Exception e) {
            log.error("❌ Erro ao buscar faltas", e);
            log.error("❌ Tipo de exceção: {}", e.getClass().getName());
            log.error("❌ Mensagem: {}", e.getMessage());
            if (e.getCause() != null) {
                log.error("❌ Causa: {}", e.getCause().getMessage());
                log.error("❌ Tipo da causa: {}", e.getCause().getClass().getName());
            }
            throw new RuntimeException("Erro ao buscar faltas: " + e.getMessage(), e);
        }
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


    public List<Absence> getPendingAbsences() {
        return absenceRepository.findByStatus(Absence.AbsenceStatus.PENDING);
    }

    public List<Absence> getTodayAbsences() {
        return absenceRepository.findByAbsenceDate(LocalDate.now());
    }

    public Long getEmployeeAbsenceCount(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return absenceRepository.countApprovedAbsencesByEmployeeAndDateRange(employeeId, startDate, endDate);
    }

    @Transactional
    public Absence approveAbsence(UUID absenceId, String observacoes) {
        Absence absence = absenceRepository.findById(absenceId)
            .orElseThrow(() -> new RuntimeException("Afastamento não encontrado"));
        
        if (absence.getStatus() != Absence.AbsenceStatus.PENDING) {
            throw new IllegalArgumentException("Apenas afastamentos pendentes podem ser aprovados");
        }
        
        absence.setStatus(Absence.AbsenceStatus.APPROVED);
        // TODO: Buscar o usuário atual do contexto de segurança para setar approvedBy
        
        return absenceRepository.save(absence);
    }

    @Transactional
    public Absence rejectAbsence(UUID absenceId, String motivo) {
        Absence absence = absenceRepository.findById(absenceId)
            .orElseThrow(() -> new RuntimeException("Afastamento não encontrado"));
        
        if (absence.getStatus() != Absence.AbsenceStatus.PENDING) {
            throw new IllegalArgumentException("Apenas afastamentos pendentes podem ser rejeitados");
        }
        
        absence.setStatus(Absence.AbsenceStatus.REJECTED);
        // TODO: Buscar o usuário atual do contexto de segurança para setar approvedBy
        
        return absenceRepository.save(absence);
    }
}
