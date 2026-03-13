package com.z7design.secured_guard.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.model.Occurrence;
import com.z7design.secured_guard.model.OccurrenceType;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.repository.OccurrenceRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
public class OccurrenceService {
    
    private final OccurrenceRepository occurrenceRepository;
    private final EmployeeChangeHistoryService employeeChangeHistoryService;
    
    @Transactional
    public Occurrence create(Occurrence occurrence) {
        Occurrence saved = occurrenceRepository.save(occurrence);
        if (saved.getEmployee() != null) {
            String desc = String.format("%s - %s", saved.getType(), saved.getDescription());
            employeeChangeHistoryService.recordChange(saved.getEmployee().getId(), EmployeeChangeCategory.OCORRENCIA,
                    "ocorrencia", "Ocorrência", null, desc, getCurrentUserId());
        }
        return saved;
    }
    
    @Transactional
    public Occurrence update(UUID id, Occurrence occurrence) {
        Occurrence existingOccurrence = findById(id);
        occurrence.setId(id);
        Occurrence saved = occurrenceRepository.save(occurrence);
        if (saved.getEmployee() != null) {
            String oldDesc = String.format("%s - %s", existingOccurrence.getType(), existingOccurrence.getDescription());
            String newDesc = String.format("%s - %s", saved.getType(), saved.getDescription());
            employeeChangeHistoryService.recordChange(saved.getEmployee().getId(), EmployeeChangeCategory.OCORRENCIA,
                    "ocorrencia", "Ocorrência", oldDesc, newDesc, getCurrentUserId());
        }
        return saved;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            return ((User) auth.getPrincipal()).getId();
        }
        return null;
    }
    
    @Transactional
    public void delete(UUID id) {
        Occurrence occurrence = findById(id);
        occurrenceRepository.delete(occurrence);
    }
    
    public Occurrence findById(UUID id) {
        return occurrenceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ocorrência não encontrada"));
    }
    
    public List<Occurrence> findByEmployeeId(UUID employeeId) {
        return occurrenceRepository.findByEmployeeId(employeeId);
    }
    
    public List<Occurrence> findByType(OccurrenceType type) {
        return occurrenceRepository.findByType(type);
    }
    
    public List<Occurrence> findByStatus(String status) {
        return occurrenceRepository.findByStatus(status);
    }
    
    public List<Occurrence> findByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return occurrenceRepository.findByOccurrenceDateBetween(startDate, endDate);
    }
    
    public List<Occurrence> findByEmployeeIdAndType(UUID employeeId, OccurrenceType type) {
        return occurrenceRepository.findByEmployeeIdAndType(employeeId, type);
    }
    
    public List<Occurrence> findByEmployeeIdAndDateRange(UUID employeeId, LocalDateTime startDate, LocalDateTime endDate) {
        return occurrenceRepository.findByEmployeeIdAndOccurrenceDateBetween(employeeId, startDate, endDate);
    }
    
    public List<Occurrence> findAll() {
        return occurrenceRepository.findAll();
    }
} 