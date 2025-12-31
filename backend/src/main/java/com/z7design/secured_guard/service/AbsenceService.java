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

    @Transactional(readOnly = true)
    public List<Absence> getAllAbsences() {
        try {
            log.info("🔍 Buscando todas as faltas com relacionamentos");
            List<Absence> absences = absenceRepository.findAllWithRelationships();
            log.info("✅ Faltas encontradas: {} registros", absences.size());
            
            // Inicializar objetos necessários dentro da transação para evitar LazyInitializationException
            for (Absence absence : absences) {
                if (absence.getEmployee() != null) {
                    // Forçar inicialização de campos básicos do Employee dentro da transação
                    absence.getEmployee().getName();
                    absence.getEmployee().getId();
                    absence.getEmployee().getRegistrationNumber();
                }
                if (absence.getCoverageEmployee() != null) {
                    absence.getCoverageEmployee().getName();
                    absence.getCoverageEmployee().getId();
                }
                if (absence.getApprovedBy() != null) {
                    absence.getApprovedBy().getName();
                    absence.getApprovedBy().getId();
                }
            }
            
            return absences;
        } catch (Exception e) {
            log.error("❌ Erro ao buscar faltas com relacionamentos", e);
            log.error("❌ Tipo de exceção: {}", e.getClass().getName());
            log.error("❌ Mensagem: {}", e.getMessage());
            if (e.getCause() != null) {
                log.error("❌ Causa: {}", e.getCause().getMessage());
                log.error("❌ Tipo da causa: {}", e.getCause().getClass().getName());
                if (e.getCause().getCause() != null) {
                    log.error("❌ Causa da causa: {}", e.getCause().getCause().getMessage());
                }
            }
            log.error("❌ Stack trace completo:", e);
            throw new RuntimeException("Erro ao buscar faltas: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Optional<Absence> getAbsenceById(UUID id) {
        try {
            Optional<Absence> absenceOpt = absenceRepository.findByIdWithRelationships(id);
            if (absenceOpt.isPresent()) {
                Absence absence = absenceOpt.get();
                // Inicializar objetos necessários dentro da transação
                if (absence.getEmployee() != null) {
                    absence.getEmployee().getName();
                    absence.getEmployee().getId();
                    absence.getEmployee().getRegistrationNumber();
                }
                if (absence.getCoverageEmployee() != null) {
                    absence.getCoverageEmployee().getName();
                    absence.getCoverageEmployee().getId();
                }
                if (absence.getApprovedBy() != null) {
                    absence.getApprovedBy().getName();
                    absence.getApprovedBy().getId();
                }
            }
            return absenceOpt;
        } catch (Exception e) {
            log.error("❌ Erro ao buscar falta por ID: {}", id, e);
            // Fallback para método padrão
            return absenceRepository.findById(id);
        }
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
        // IMPORTANTE: Atualizar absenceType sempre que fornecido (não null)
        if (updatedAbsence.getAbsenceType() != null) {
            existingAbsence.setAbsenceType(updatedAbsence.getAbsenceType());
            log.info("✅ Atualizando absenceType de '{}' para '{}'", existingAbsence.getAbsenceType(), updatedAbsence.getAbsenceType());
        } else {
            log.warn("⚠️ absenceType é null no update - mantendo valor atual: {}", existingAbsence.getAbsenceType());
        }
        
        if (updatedAbsence.getAbsenceDate() != null) {
            existingAbsence.setAbsenceDate(updatedAbsence.getAbsenceDate());
        }
        if (updatedAbsence.getReason() != null) {
            existingAbsence.setReason(updatedAbsence.getReason());
        }
        if (updatedAbsence.getMedicalCertificateDays() != null) {
            existingAbsence.setMedicalCertificateDays(updatedAbsence.getMedicalCertificateDays());
        }
        if (updatedAbsence.getDocumentUrl() != null) {
            existingAbsence.setDocumentUrl(updatedAbsence.getDocumentUrl());
        }
        if (updatedAbsence.getStatus() != null) {
            existingAbsence.setStatus(updatedAbsence.getStatus());
        }
        if (updatedAbsence.getIsJustified() != null) {
            existingAbsence.setIsJustified(updatedAbsence.getIsJustified());
        }
        if (updatedAbsence.getCoverageNotes() != null) {
            existingAbsence.setCoverageNotes(updatedAbsence.getCoverageNotes());
        }

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
        
        Absence savedAbsence = absenceRepository.save(absence);
        
        // Inicializar relacionamentos lazy dentro da transação para evitar LazyInitializationException
        try {
            if (savedAbsence.getEmployee() != null) {
                savedAbsence.getEmployee().getName();
                savedAbsence.getEmployee().getId();
                savedAbsence.getEmployee().getRegistrationNumber();
            }
            if (savedAbsence.getCoverageEmployee() != null) {
                savedAbsence.getCoverageEmployee().getName();
                savedAbsence.getCoverageEmployee().getId();
            }
            if (savedAbsence.getApprovedBy() != null) {
                savedAbsence.getApprovedBy().getName();
                savedAbsence.getApprovedBy().getId();
            }
        } catch (Exception e) {
            log.warn("Erro ao inicializar relacionamentos do afastamento {}: {}", absenceId, e.getMessage());
        }
        
        return savedAbsence;
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
        
        Absence savedAbsence = absenceRepository.save(absence);
        
        // Inicializar relacionamentos lazy dentro da transação para evitar LazyInitializationException
        try {
            if (savedAbsence.getEmployee() != null) {
                savedAbsence.getEmployee().getName();
                savedAbsence.getEmployee().getId();
                savedAbsence.getEmployee().getRegistrationNumber();
            }
            if (savedAbsence.getCoverageEmployee() != null) {
                savedAbsence.getCoverageEmployee().getName();
                savedAbsence.getCoverageEmployee().getId();
            }
            if (savedAbsence.getApprovedBy() != null) {
                savedAbsence.getApprovedBy().getName();
                savedAbsence.getApprovedBy().getId();
            }
        } catch (Exception e) {
            log.warn("Erro ao inicializar relacionamentos do afastamento {}: {}", absenceId, e.getMessage());
        }
        
        return savedAbsence;
    }
}
