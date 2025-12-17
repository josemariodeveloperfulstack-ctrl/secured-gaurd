package com.z7design.secured_guard.service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.dto.CreateEmployeeCertificationRequest;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EmployeeCertification;
import com.z7design.secured_guard.model.Training;
import com.z7design.secured_guard.model.enums.CertificationStatus;
import com.z7design.secured_guard.repository.EmployeeCertificationRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.TrainingRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeCertificationService {
    
    private final EmployeeCertificationRepository certificationRepository;
    private final EmployeeRepository employeeRepository;
    private final TrainingRepository trainingRepository;
    private final com.z7design.secured_guard.repository.WorkPostRepository workPostRepository;
    
    @Transactional
    public EmployeeCertification create(CreateEmployeeCertificationRequest request) {
        // Buscar Employee e Training
        Employee employee = employeeRepository.findById(request.getEmployeeId())
            .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
        
        Training training = trainingRepository.findById(request.getTrainingId())
            .orElseThrow(() -> new ResourceNotFoundException("Treinamento não encontrado"));
        
        // Buscar WorkPost se fornecido (por ID ou nome)
        com.z7design.secured_guard.model.WorkPost workPost = null;
        if (request.getWorkPostId() != null) {
            workPost = workPostRepository.findById(request.getWorkPostId()).orElse(null);
        } else if (request.getWorkPostName() != null && !request.getWorkPostName().trim().isEmpty()) {
            // Buscar por nome exato
            workPost = workPostRepository.findByName(request.getWorkPostName()).orElse(null);
        }
        
        // Criar entidade EmployeeCertification
        EmployeeCertification certification = EmployeeCertification.builder()
            .employee(employee)
            .training(training)
            .workPost(workPost)
            .certificationNumber(request.getCertificationNumber())
            .issueDate(request.getIssueDate())
            .expirationDate(request.getExpirationDate())
            .documentUrl(request.getDocumentUrl() != null && !request.getDocumentUrl().trim().isEmpty() 
                ? request.getDocumentUrl() 
                : "N/A")
            .status(CertificationStatus.ACTIVE)
            .build();
        
        System.out.println("✅ EmployeeCertificationService.create - Certificação criada: " + certification.getId() + 
            (workPost != null ? " com WorkPost: " + workPost.getName() : ""));
        
        validateCertification(certification);
        return certificationRepository.save(certification);
    }
    
    @Transactional
    public EmployeeCertification create(EmployeeCertification certification) {
        validateCertification(certification);
        certification.setStatus(CertificationStatus.ACTIVE);
        return certificationRepository.save(certification);
    }
    
    @Transactional
    public EmployeeCertification update(UUID id, EmployeeCertification certification) {
        EmployeeCertification existingCertification = findById(id);
        validateCertification(certification);
        
        existingCertification.setCertificationNumber(certification.getCertificationNumber());
        existingCertification.setIssueDate(certification.getIssueDate());
        existingCertification.setExpirationDate(certification.getExpirationDate());
        existingCertification.setDocumentUrl(certification.getDocumentUrl());
        
        return certificationRepository.save(existingCertification);
    }
    
    @Transactional
    public EmployeeCertification update(UUID id, com.z7design.secured_guard.dto.UpdateEmployeeCertificationRequest request) {
        EmployeeCertification existingCertification = findById(id);
        
        // Converter DTO para entidade para validação
        EmployeeCertification certificationForValidation = new EmployeeCertification();
        certificationForValidation.setIssueDate(request.getIssueDate());
        certificationForValidation.setExpirationDate(request.getExpirationDate());
        validateCertification(certificationForValidation);
        
        // Buscar WorkPost se fornecido (por ID ou nome)
        if (request.getWorkPostId() != null) {
            com.z7design.secured_guard.model.WorkPost workPost = workPostRepository.findById(request.getWorkPostId()).orElse(null);
            existingCertification.setWorkPost(workPost);
        } else if (request.getWorkPostName() != null && !request.getWorkPostName().trim().isEmpty()) {
            com.z7design.secured_guard.model.WorkPost workPost = workPostRepository.findByName(request.getWorkPostName()).orElse(null);
            existingCertification.setWorkPost(workPost);
        }
        
        // Atualizar campos da certificação existente
        existingCertification.setCertificationNumber(request.getCertificationNumber());
        existingCertification.setIssueDate(request.getIssueDate());
        existingCertification.setExpirationDate(request.getExpirationDate());
        if (request.getDocumentUrl() != null) {
            existingCertification.setDocumentUrl(request.getDocumentUrl());
        }
        
        System.out.println("✅ EmployeeCertificationService.update - Certificação atualizada: " + id + 
            (existingCertification.getWorkPost() != null ? " com WorkPost: " + existingCertification.getWorkPost().getName() : ""));
        
        return certificationRepository.save(existingCertification);
    }
    
    @Transactional
    public EmployeeCertification renew(UUID id, LocalDate newExpirationDate) {
        EmployeeCertification certification = findById(id);
        certification.setExpirationDate(newExpirationDate);
        certification.setStatus(CertificationStatus.RENEWED);
        return certificationRepository.save(certification);
    }
    
    @Transactional
    public void cancel(UUID id) {
        EmployeeCertification certification = findById(id);
        System.out.println("🗑️ EmployeeCertificationService.cancel - Deletando certificação: " + id);
        certificationRepository.delete(certification);
        System.out.println("✅ EmployeeCertificationService.cancel - Certificação deletada com sucesso");
    }
    
    public EmployeeCertification findById(UUID id) {
        return certificationRepository.findWithDetailsById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Certificação não encontrada"));
    }
    
    public List<EmployeeCertification> findByEmployeeId(UUID employeeId) {
        return certificationRepository.findByEmployeeId(employeeId);
    }
    
    public List<EmployeeCertification> findByEmployeeIdAndStatus(UUID employeeId, CertificationStatus status) {
        return certificationRepository.findByEmployeeIdAndStatus(employeeId, status);
    }
    
    public List<EmployeeCertification> findByTrainingId(UUID trainingId) {
        return certificationRepository.findByTrainingId(trainingId);
    }
    
    public List<EmployeeCertification> findExpiringSoon(LocalDate date) {
        return certificationRepository.findByExpirationDateBefore(date);
    }
    
    public List<EmployeeCertification> findExpiringBetween(LocalDate startDate, LocalDate endDate) {
        return certificationRepository.findByExpirationDateBetween(startDate, endDate);
    }
    
    @Transactional(readOnly = true)
    public List<EmployeeCertification> findAll() {
        // O findAll() já usa @EntityGraph para carregar relacionamentos
        return certificationRepository.findAll();
    }
    
    private void validateCertification(EmployeeCertification certification) {
        if (certification.getIssueDate() == null) {
            throw new IllegalArgumentException("Data de emissão é obrigatória");
        }
        
        if (certification.getExpirationDate() != null && 
            certification.getIssueDate().isAfter(certification.getExpirationDate())) {
            throw new IllegalArgumentException("Data de emissão não pode ser posterior à data de expiração");
        }
    }
} 