package com.z7design.secured_guard.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.model.EPI;
import com.z7design.secured_guard.model.EPIStatus;
import com.z7design.secured_guard.repository.EPIRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EPIService {
    
    private final EPIRepository epiRepository;
    
    @Transactional
    public EPI create(EPI epi) {
        return epiRepository.save(epi);
    }
    
    @Transactional
    public EPI update(UUID id, EPI epi) {
        EPI existingEPI = findById(id);
        epi.setId(existingEPI.getId());
        return epiRepository.save(epi);
    }
    
    @Transactional
    public void delete(UUID id) {
        epiRepository.deleteById(id);
    }
    
    public EPI findById(UUID id) {
        return epiRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("EPI not found"));
    }
    
    public List<EPI> findByEmployeeId(UUID employeeId) {
        return epiRepository.findByEmployeeId(employeeId);
    }
    
    public List<EPI> findByPositionId(UUID positionId) {
        return epiRepository.findByPositionId(positionId);
    }
    
    public List<EPI> findByStatus(EPIStatus status) {
        return epiRepository.findByStatus(status);
    }
    
    public List<EPI> findExpiringEPIs() {
        LocalDateTime thirtyDaysFromNow = LocalDateTime.now().plusDays(30);
        return epiRepository.findByExpirationDateBefore(thirtyDaysFromNow);
    }
    
    public List<EPI> findExpiredEPIs() {
        return epiRepository.findByExpirationDateBefore(LocalDateTime.now());
    }
    
    public List<EPI> findByEmployeeIdAndStatus(UUID employeeId, EPIStatus status) {
        return epiRepository.findByEmployeeIdAndStatus(employeeId, status);
    }
    
    public List<EPI> findByPositionIdAndStatus(UUID positionId, EPIStatus status) {
        return epiRepository.findByPositionIdAndStatus(positionId, status);
    }
    
    public List<EPI> findAll() {
        return epiRepository.findAll();
    }
    
    @Transactional
    public EPI updateStatus(UUID id, EPIStatus status) {
        EPI epi = findById(id);
        epi.setStatus(status);
        return epiRepository.save(epi);
    }
} 