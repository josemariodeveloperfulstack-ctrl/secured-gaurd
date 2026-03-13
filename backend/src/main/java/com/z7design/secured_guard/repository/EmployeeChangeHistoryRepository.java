package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmployeeChangeHistory;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface EmployeeChangeHistoryRepository extends JpaRepository<EmployeeChangeHistory, UUID> {

    Page<EmployeeChangeHistory> findByEmployeeIdOrderByChangedAtDesc(UUID employeeId, Pageable pageable);

    @Query("""
        SELECT h FROM EmployeeChangeHistory h
        WHERE h.employeeId = :employeeId
        AND (:dateFrom IS NULL OR h.changedAt >= :dateFrom)
        AND (:dateTo IS NULL OR h.changedAt <= :dateTo)
        AND (:category IS NULL OR h.category = :category)
        AND (:changedByUserId IS NULL OR h.changedByUser.id = :changedByUserId)
        ORDER BY h.changedAt DESC
        """)
    Page<EmployeeChangeHistory> findByEmployeeIdWithFilters(
        @Param("employeeId") UUID employeeId,
        @Param("dateFrom") Instant dateFrom,
        @Param("dateTo") Instant dateTo,
        @Param("category") EmployeeChangeCategory category,
        @Param("changedByUserId") UUID changedByUserId,
        Pageable pageable
    );
}
