package com.z7design.secured_guard.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Vacation;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.VacationStatus;
import com.z7design.secured_guard.model.enums.VacationType;
import com.z7design.secured_guard.repository.VacationRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VacationService {
    
    private final VacationRepository vacationRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    
    @Transactional
    public Vacation create(Vacation vacation) {
        validateVacationDates(vacation);
        calculateVacationDays(vacation);
        if (vacation.getStatus() == null) {
            vacation.setStatus(VacationStatus.PENDING);
        }
        if (vacation.getVacationType() == null) {
            vacation.setVacationType(VacationType.NORMAL);
        }
        return vacationRepository.save(vacation);
    }
    
    @Transactional
    public Vacation update(UUID id, Vacation vacation) {
        Vacation existingVacation = findById(id);
        validateVacationDatesForUpdate(vacation);
        calculateVacationDays(vacation);
        
        existingVacation.setStartDate(vacation.getStartDate());
        existingVacation.setEndDate(vacation.getEndDate());
        existingVacation.setDaysTaken(vacation.getDaysTaken());
        existingVacation.setRemainingDays(vacation.getRemainingDays());
        
        // Atualizar status se fornecido
        if (vacation.getStatus() != null) {
            existingVacation.setStatus(vacation.getStatus());
        }
        
        // Atualizar tipo se fornecido
        if (vacation.getVacationType() != null) {
            existingVacation.setVacationType(vacation.getVacationType());
        }
        
        return vacationRepository.save(existingVacation);
    }
    
    @Transactional
    public Vacation approve(UUID id, UUID approvedBy) {
        Vacation vacation = findById(id);
        User approver = userRepository.findById(approvedBy)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + approvedBy));
        vacation.setStatus(VacationStatus.APPROVED);
        vacation.setApprovedBy(approver);
        vacation.setApprovalDate(LocalDate.now());
        return vacationRepository.save(vacation);
    }
    
    @Transactional
    public Vacation reject(UUID id) {
        Vacation vacation = findById(id);
        vacation.setStatus(VacationStatus.REJECTED);
        return vacationRepository.save(vacation);
    }
    
    @Transactional
    public Vacation cancel(UUID id) {
        Vacation vacation = findById(id);
        vacation.setStatus(VacationStatus.CANCELLED);
        return vacationRepository.save(vacation);
    }
    
    @Transactional
    public void delete(UUID id) {
        if (!vacationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Vacation not found with id: " + id);
        }
        vacationRepository.deleteById(id);
    }
    
    public Vacation findById(UUID id) {
        return vacationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Vacation not found with id: " + id));
    }
    
    public List<Vacation> findByEmployeeId(UUID employeeId) {
        return employeeRepository.findByUserId(employeeId)
            .map(e -> vacationRepository.findByEmployeeId(e.getId()))
            .orElseGet(() -> vacationRepository.findByEmployeeId(employeeId));
    }
    
    public List<Vacation> findByEmployeeIdAndStatus(UUID employeeId, VacationStatus status) {
        return employeeRepository.findByUserId(employeeId)
            .map(e -> vacationRepository.findByEmployeeIdAndStatus(e.getId(), status))
            .orElseGet(() -> vacationRepository.findByEmployeeIdAndStatus(employeeId, status));
    }
    
    public List<Vacation> findByStartDateBetween(LocalDate startDate, LocalDate endDate) {
        return vacationRepository.findByStartDateBetween(startDate, endDate);
    }
    
    public List<Vacation> findAll() {
        return vacationRepository.findAllWithEmployee();
    }
    
    public List<Vacation> findByStatus(VacationStatus status) {
        return vacationRepository.findByStatusWithEmployee(status);
    }
    
    private void validateVacationDates(Vacation vacation) {
        if (vacation.getStartDate().isAfter(vacation.getEndDate())) {
            throw new IllegalArgumentException("Data de início não pode ser posterior à data de fim");
        }
        
        if (vacation.getStartDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Data de início não pode ser anterior à data atual");
        }
    }
    
    private void validateVacationDatesForUpdate(Vacation vacation) {
        // Validação para atualização: permite editar férias mesmo que a data de início seja no passado
        // Apenas valida que a data de início não seja posterior à data de fim
        if (vacation.getStartDate().isAfter(vacation.getEndDate())) {
            throw new IllegalArgumentException("Data de início não pode ser posterior à data de fim");
        }
    }
    
    private void calculateVacationDays(Vacation vacation) {
        long days = ChronoUnit.DAYS.between(vacation.getStartDate(), vacation.getEndDate()) + 1;
        vacation.setDaysTaken((int) days);
        // TODO: Implementar cálculo de dias restantes baseado no histórico do funcionário
        // Definir um valor padrão de 30 dias de férias disponíveis
        vacation.setRemainingDays(Math.max(1, 30 - (int) days));
    }

    @Transactional
    public Vacation approveVacation(UUID vacationId, String observacoes) {
        Vacation vacation = vacationRepository.findById(vacationId)
            .orElseThrow(() -> new ResourceNotFoundException("Solicitação de férias não encontrada"));
        
        if (vacation.getStatus() != VacationStatus.PENDING) {
            throw new IllegalArgumentException("Apenas solicitações pendentes podem ser aprovadas");
        }
        
        vacation.setStatus(VacationStatus.APPROVED);
        vacation.setApprovalDate(LocalDate.now());
        // TODO: Buscar o usuário atual do contexto de segurança para setar approvedBy
        
        return vacationRepository.save(vacation);
    }

    @Transactional
    public Vacation rejectVacation(UUID vacationId, String motivo) {
        Vacation vacation = vacationRepository.findById(vacationId)
            .orElseThrow(() -> new ResourceNotFoundException("Solicitação de férias não encontrada"));
        
        if (vacation.getStatus() != VacationStatus.PENDING) {
            throw new IllegalArgumentException("Apenas solicitações pendentes podem ser rejeitadas");
        }
        
        vacation.setStatus(VacationStatus.REJECTED);
        vacation.setApprovalDate(LocalDate.now());
        // TODO: Buscar o usuário atual do contexto de segurança para setar approvedBy
        
        return vacationRepository.save(vacation);
    }
} 