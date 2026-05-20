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
import com.z7design.secured_guard.dto.EmployeeCertificationResponse;
import com.z7design.secured_guard.dto.CertificationStatsResponse;
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
        if (certification.getTraining() == null) {
            throw new IllegalArgumentException("Treinamento é obrigatório para nova certificação");
        }
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
    public EmployeeCertification update(UUID id,
            com.z7design.secured_guard.dto.UpdateEmployeeCertificationRequest request) {
        EmployeeCertification existingCertification = findById(id);

        // Garantir que employee nunca seja null (evita employee_id=NULL no UPDATE - Hibernate batch pode perder referência)
        UUID empId = request.getEmployeeId();
        if (empId != null) {
            Employee emp = employeeRepository.findById(empId)
                    .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
            existingCertification.setEmployee(emp);
        } else if (existingCertification.getEmployee() == null) {
            throw new IllegalArgumentException("Funcionário é obrigatório para a certificação");
        }

        // Converter DTO para entidade para validação
        EmployeeCertification certificationForValidation = new EmployeeCertification();
        certificationForValidation.setIssueDate(request.getIssueDate());
        certificationForValidation.setExpirationDate(request.getExpirationDate());
        validateCertification(certificationForValidation);

        // Buscar WorkPost se fornecido (por ID ou nome)
        if (request.getWorkPostId() != null) {
            com.z7design.secured_guard.model.WorkPost workPost = workPostRepository.findById(request.getWorkPostId())
                    .orElse(null);
            existingCertification.setWorkPost(workPost);
        } else if (request.getWorkPostName() != null && !request.getWorkPostName().trim().isEmpty()) {
            com.z7design.secured_guard.model.WorkPost workPost = workPostRepository
                    .findByName(request.getWorkPostName()).orElse(null);
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
                (existingCertification.getWorkPost() != null
                        ? " com WorkPost: " + existingCertification.getWorkPost().getName()
                        : ""));

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

    @Transactional(readOnly = true)
    public List<EmployeeCertificationResponse> findByEmployeeId(UUID employeeId) {
        UUID actualEmployeeId = employeeRepository.findByUserId(employeeId)
            .map(e -> e.getId())
            .orElse(employeeId);
        return convertToResponse(certificationRepository.findByEmployeeId(actualEmployeeId));
    }

    @Transactional(readOnly = true)
    public List<EmployeeCertificationResponse> findByEmployeeIdAndStatus(UUID employeeId, CertificationStatus status) {
        UUID actualEmployeeId = employeeRepository.findByUserId(employeeId)
            .map(e -> e.getId())
            .orElse(employeeId);
        return convertToResponse(certificationRepository.findByEmployeeIdAndStatus(actualEmployeeId, status));
    }

    @Transactional(readOnly = true)
    public List<EmployeeCertificationResponse> findByTrainingId(UUID trainingId) {
        return convertToResponse(certificationRepository.findByTrainingId(trainingId));
    }

    @Transactional(readOnly = true)
    public List<EmployeeCertificationResponse> findExpiringSoon(LocalDate date) {
        return convertToResponse(certificationRepository.findByExpirationDateBefore(date));
    }

    @Transactional(readOnly = true)
    public List<EmployeeCertificationResponse> findExpiringBetween(LocalDate startDate, LocalDate endDate) {
        return convertToResponse(certificationRepository.findByExpirationDateBetween(startDate, endDate));
    }

    @Transactional(readOnly = true)
    public List<EmployeeCertificationResponse> findAll() {
        List<EmployeeCertification> entities = certificationRepository.findAllWithDetails();
        System.out
                .println("📋 EmployeeCertificationService.findAll - Entidades encontradas no Repo: " + entities.size());
        List<EmployeeCertificationResponse> responses = convertToResponse(entities);
        System.out.println("📋 EmployeeCertificationService.findAll - Responses convertidas: " + responses.size());
        return responses;
    }

    private List<EmployeeCertificationResponse> convertToResponse(List<EmployeeCertification> entities) {
        if (entities == null)
            return List.of();
        return entities.stream()
                .map(cert -> {
                    try {
                        return EmployeeCertificationResponse.fromEntity(cert);
                    } catch (Exception e) {
                        System.err.println("❌ Erro ao converter certificação para DTO: "
                                + (cert != null ? cert.getId() : "null") + " - " + e.getMessage());
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EmployeeCertificationResponse> findByStatus(CertificationStatus status) {
        return convertToResponse(certificationRepository.findByStatus(status));
    }

    @Transactional(readOnly = true)
    public CertificationStatsResponse getStats() {
        return computeStats(certificationRepository.findAll());
    }

    /**
     * Estatísticas restritas a um único funcionário. Aceita ID do User ou do Employee
     * (mesma resolução usada em {@link #findByEmployeeId(UUID)}).
     */
    @Transactional(readOnly = true)
    public CertificationStatsResponse getStatsByEmployee(UUID employeeOrUserId) {
        UUID actualEmployeeId = employeeRepository.findByUserId(employeeOrUserId)
                .map(e -> e.getId())
                .orElse(employeeOrUserId);
        return computeStats(certificationRepository.findByEmployeeId(actualEmployeeId));
    }

    private CertificationStatsResponse computeStats(List<EmployeeCertification> all) {
        LocalDate now = LocalDate.now();
        LocalDate expiringThreshold = now.plusDays(30);

        long total = all.size();
        long active = all.stream().filter(c -> c.getStatus() == CertificationStatus.ACTIVE).count();
        long expired = all.stream().filter(c -> c.getStatus() == CertificationStatus.EXPIRED
                || (c.getExpirationDate() != null && c.getExpirationDate().isBefore(now))).count();
        long pending = 0; // PENDING status not available in enum
        long cancelled = all.stream().filter(c -> c.getStatus() == CertificationStatus.CANCELLED).count();
        long expiringSoon = all.stream().filter(c -> c.getExpirationDate() != null
                && c.getExpirationDate().isAfter(now)
                && c.getExpirationDate().isBefore(expiringThreshold)).count();

        java.util.Map<String, Long> byOrganization = all.stream()
                .filter(c -> c.getTraining() != null && c.getTraining().getProvider() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        c -> c.getTraining().getProvider(),
                        java.util.stream.Collectors.counting()));

        return CertificationStatsResponse.builder()
                .total(total)
                .active(active)
                .expired(expired)
                .pending(pending)
                .cancelled(cancelled)
                .expiringSoon(expiringSoon)
                .totalCost(0.0) // No cost field in model
                .byType(java.util.Map.of()) // No type field in model
                .byOrganization(byOrganization)
                .build();
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