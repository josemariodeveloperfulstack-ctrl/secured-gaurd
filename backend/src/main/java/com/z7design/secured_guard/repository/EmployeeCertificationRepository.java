package com.z7design.secured_guard.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.EmployeeCertification;
import com.z7design.secured_guard.model.enums.CertificationStatus;

@Repository
public interface EmployeeCertificationRepository extends JpaRepository<EmployeeCertification, UUID> {
    List<EmployeeCertification> findByEmployeeId(UUID employeeId);
    List<EmployeeCertification> findByEmployeeIdAndStatus(UUID employeeId, CertificationStatus status);
    List<EmployeeCertification> findByTrainingId(UUID trainingId);
    List<EmployeeCertification> findByExpirationDateBefore(LocalDate date);
    List<EmployeeCertification> findByExpirationDateBetween(LocalDate startDate, LocalDate endDate);
} 