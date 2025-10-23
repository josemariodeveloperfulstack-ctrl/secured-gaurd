package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.SpecificActivity;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.repository.SpecificActivityRepository;
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
public class SpecificActivityService {

    @Autowired
    private SpecificActivityRepository specificActivityRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    public List<SpecificActivity> getAllSpecificActivities() {
        return specificActivityRepository.findAll();
    }

    public Optional<SpecificActivity> getSpecificActivityById(UUID id) {
        return specificActivityRepository.findById(id);
    }

    public List<SpecificActivity> getSpecificActivitiesByEmployee(UUID employeeId) {
        return specificActivityRepository.findByEmployeeId(employeeId);
    }

    public List<SpecificActivity> getSpecificActivitiesByLocation(UUID locationId) {
        return specificActivityRepository.findByLocationId(locationId);
    }

    public List<SpecificActivity> getSpecificActivitiesByDate(LocalDate date) {
        return specificActivityRepository.findByActivityDate(date);
    }

    public List<SpecificActivity> getSpecificActivitiesByStatus(SpecificActivity.ActivityStatus status) {
        return specificActivityRepository.findByStatus(status);
    }

    public List<SpecificActivity> getSpecificActivitiesByType(SpecificActivity.ActivityType type) {
        return specificActivityRepository.findByActivityType(type);
    }

    public List<SpecificActivity> getSpecificActivitiesByDateRange(LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByDateRange(startDate, endDate);
    }

    public List<SpecificActivity> getSpecificActivitiesByEmployeeAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
    }

    public List<SpecificActivity> getSpecificActivitiesByLocationAndDateRange(UUID locationId, LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByLocationAndDateRange(locationId, startDate, endDate);
    }

    public List<SpecificActivity> getSpecificActivitiesByTypeAndDateRange(SpecificActivity.ActivityType type, LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByActivityTypeAndDateRange(type, startDate, endDate);
    }

    public SpecificActivity createSpecificActivity(SpecificActivity activity) {
        // Validar se o funcionário existe
        Employee employee = employeeRepository.findById(activity.getEmployee().getId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar se o local existe (se fornecido)
        if (activity.getLocation() != null) {
            WorkPost location = workPostRepository.findById(activity.getLocation().getId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            activity.setLocation(location);
        }

        activity.setEmployee(employee);
        return specificActivityRepository.save(activity);
    }

    public SpecificActivity updateSpecificActivity(UUID id, SpecificActivity updatedActivity) {
        SpecificActivity existingActivity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));

        // Atualizar campos permitidos conforme modelo atual
        existingActivity.setDescription(updatedActivity.getDescription());
        existingActivity.setActivityType(updatedActivity.getActivityType());
        existingActivity.setActivityDate(updatedActivity.getActivityDate());
        existingActivity.setStartTime(updatedActivity.getStartTime());
        existingActivity.setEndTime(updatedActivity.getEndTime());
        existingActivity.setStatus(updatedActivity.getStatus());
        existingActivity.setObservations(updatedActivity.getObservations());
        existingActivity.setUpdatedAt(java.time.LocalDateTime.now());

        // O modelo atual não possui campo responsibleEmployee; removido

        // Validar e atualizar local se fornecido
        if (updatedActivity.getLocation() != null) {
            WorkPost location = workPostRepository.findById(updatedActivity.getLocation().getId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            existingActivity.setLocation(location);
        }

        return specificActivityRepository.save(existingActivity);
    }

    public void deleteSpecificActivity(UUID id) {
        if (!specificActivityRepository.existsById(id)) {
            throw new RuntimeException("Atividade específica não encontrada");
        }
        specificActivityRepository.deleteById(id);
    }

    public SpecificActivity updateStatus(UUID id, SpecificActivity.ActivityStatus status) {
        SpecificActivity activity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));
        
        activity.setStatus(status);
        activity.setUpdatedAt(java.time.LocalDateTime.now());
        
        return specificActivityRepository.save(activity);
    }

    public SpecificActivity startActivity(UUID id) {
        SpecificActivity activity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));
        
        activity.setStatus(SpecificActivity.ActivityStatus.IN_PROGRESS);
        activity.setUpdatedAt(java.time.LocalDateTime.now());
        
        return specificActivityRepository.save(activity);
    }

    public SpecificActivity completeActivity(UUID id, String observations) {
        SpecificActivity activity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));
        
        activity.setStatus(SpecificActivity.ActivityStatus.COMPLETED);
        if (observations != null && !observations.trim().isEmpty()) {
            String existingObs = activity.getObservations() != null ? activity.getObservations() : "";
            activity.setObservations(existingObs + " | Concluída: " + observations);
        }
        activity.setUpdatedAt(java.time.LocalDateTime.now());
        
        return specificActivityRepository.save(activity);
    }

    public List<SpecificActivity> getTodayActivities() {
        return specificActivityRepository.findByActivityDate(LocalDate.now());
    }

    public List<SpecificActivity> getPendingActivities() {
        return specificActivityRepository.findByStatus(SpecificActivity.ActivityStatus.SCHEDULED);
    }

    public List<SpecificActivity> getPendingActivitiesByDate(LocalDate date) {
        return specificActivityRepository.findPendingActivitiesByDate(date);
    }

    public List<SpecificActivity> getOverdueActivities() {
        return specificActivityRepository.findOverdueActivities(LocalDate.now());
    }

    public List<SpecificActivity> getInProgressActivities() {
        return specificActivityRepository.findByStatus(SpecificActivity.ActivityStatus.IN_PROGRESS);
    }
}
