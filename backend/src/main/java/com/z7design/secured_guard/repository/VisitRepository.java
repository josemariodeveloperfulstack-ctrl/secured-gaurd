// src/main/java/com/z7design/secured_guard/repository/VisitRepository.java
package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Visit;
import com.z7design.secured_guard.model.enums.VisitStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface VisitRepository extends JpaRepository<Visit, UUID> {
    List<Visit> findByVisitDate(LocalDate visitDate);
    List<Visit> findBySupervisorId(UUID supervisorId);
    org.springframework.data.domain.Page<Visit> findBySupervisorId(UUID supervisorId, org.springframework.data.domain.Pageable pageable);
    List<Visit> findByUnitId(UUID unitId);
    List<Visit> findByStatus(VisitStatus status);
    org.springframework.data.domain.Page<Visit> findByVisitDateBetween(LocalDate start, LocalDate end, org.springframework.data.domain.Pageable pageable);
    
    @org.springframework.data.jpa.repository.Query("SELECT v FROM Visit v WHERE v.visitDate = CURRENT_DATE AND v.status = com.z7design.secured_guard.model.enums.VisitStatus.PENDING")
    List<Visit> findScheduledVisitsForToday();
    
    @org.springframework.data.jpa.repository.Query("SELECT v FROM Visit v WHERE v.visitDate = CURRENT_DATE AND v.supervisor.id = :supervisorId")
    List<Visit> findSupervisorVisitsForToday(UUID supervisorId);
}
