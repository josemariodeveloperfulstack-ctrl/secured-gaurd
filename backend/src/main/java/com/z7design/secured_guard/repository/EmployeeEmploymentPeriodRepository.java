package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmployeeEmploymentPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeEmploymentPeriodRepository extends JpaRepository<EmployeeEmploymentPeriod, UUID> {

    List<EmployeeEmploymentPeriod> findByEmployeeIdOrderByHireDateDesc(UUID employeeId);

    Optional<EmployeeEmploymentPeriod> findFirstByEmployeeIdAndStatusOrderByHireDateDesc(UUID employeeId, String status);
}
