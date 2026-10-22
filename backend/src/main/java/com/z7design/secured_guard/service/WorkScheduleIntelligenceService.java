package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.CertificationStatus;
import com.z7design.secured_guard.model.enums.VacationStatus;
import com.z7design.secured_guard.repository.AbsenceRepository;
import com.z7design.secured_guard.repository.EmployeeCertificationRepository;
import com.z7design.secured_guard.repository.RemanejamentoRepository;
import com.z7design.secured_guard.repository.VacationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class WorkScheduleIntelligenceService {

    private final VacationRepository vacationRepository;
    private final AbsenceRepository absenceRepository;
    private final EmployeeCertificationRepository certificationRepository;
    private final RemanejamentoRepository remanejamentoRepository;

    public WorkScheduleIntelligenceService(
            VacationRepository vacationRepository,
            AbsenceRepository absenceRepository,
            EmployeeCertificationRepository certificationRepository,
            RemanejamentoRepository remanejamentoRepository) {
        this.vacationRepository = vacationRepository;
        this.absenceRepository = absenceRepository;
        this.certificationRepository = certificationRepository;
        this.remanejamentoRepository = remanejamentoRepository;
    }

    /**
     * Sugere a sigla correta para uma escala baseada nas regras de inteligência
     */
    public String suggestSigla(UUID employeeId, LocalDate date, boolean isMonitoria, boolean isHoraExtra) {
        // 1. Monitoria (Prioridade alta)
        if (isMonitoria) return "MT";
        
        // 2. Hora Extra (Prioridade alta)
        if (isHoraExtra) return "HE";

        // 3. Remanejamento (RM)
        List<Remanejamento> remanejamentos = remanejamentoRepository.findByEmployeeIdAndDataRemanejamento(employeeId, date);
        if (!remanejamentos.isEmpty()) return "RM";

        // 4. Férias (FE)
        boolean onVacation = vacationRepository.findByEmployeeIdAndStatus(employeeId, VacationStatus.APPROVED)
                .stream()
                .anyMatch(v -> !date.isBefore(v.getStartDate()) && !date.isAfter(v.getEndDate()));
        if (onVacation) return "FE";

        // 5. Afastamento/Atestado (AT/FT)
        List<Absence> absences = absenceRepository.findByEmployeeAndDateRange(employeeId, date, date);
        if (!absences.isEmpty()) {
            Absence absence = absences.get(0);
            if (absence.getAbsenceType() == Absence.AbsenceType.SICK_LEAVE || 
                absence.getAbsenceType() == Absence.AbsenceType.MEDICAL_APPOINTMENT) {
                return "AT";
            }
            return "FT";
        }

        // 6. Plantão (PL) - Padrão se não houver outros impedimentos
        return "PL";
    }

    /**
     * Verifica se o vigilante está com a reciclagem em dia para assumir um plantão (PL)
     * Retorna false se a reciclagem estiver vencida ou prestes a vencer (30 dias)
     */
    public boolean isReciclagemValid(UUID employeeId, LocalDate date) {
        List<EmployeeCertification> certifications = certificationRepository.findByEmployeeId(employeeId);
        
        // Procurar certificação de reciclagem ativa
        // O PRD diz que avisa 30 dias antes. Se não renovar, bloqueia PL.
        // Aqui verificamos se a data da escala é posterior à expiração.
        return certifications.stream()
                .filter(c -> c.getTraining() != null && c.getTraining().getName().toUpperCase().contains("RECICLAGEM"))
                .allMatch(c -> c.getExpirationDate() == null || !c.getExpirationDate().isBefore(date));
    }
    
    /**
     * Verifica se há um alerta para a reciclagem (30 dias antes do vencimento)
     */
    public boolean hasReciclagemWarning(UUID employeeId, LocalDate date) {
        List<EmployeeCertification> certifications = certificationRepository.findByEmployeeId(employeeId);
        LocalDate warningThreshold = date.plusDays(30);
        
        return certifications.stream()
                .filter(c -> c.getTraining() != null && c.getTraining().getName().toUpperCase().contains("RECICLAGEM"))
                .anyMatch(c -> c.getExpirationDate() != null && 
                               c.getExpirationDate().isAfter(date) && 
                               !c.getExpirationDate().isAfter(warningThreshold));
    }
}
