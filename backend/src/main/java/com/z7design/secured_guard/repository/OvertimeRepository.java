package com.z7design.secured_guard.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.Overtime;
import com.z7design.secured_guard.model.enums.OvertimeStatus;
import com.z7design.secured_guard.model.enums.OvertimeType;

@Repository
public interface OvertimeRepository extends JpaRepository<Overtime, UUID> {
    List<Overtime> findByEmployeeId(UUID employeeId);
    List<Overtime> findByEmployeeIdAndStatus(UUID employeeId, OvertimeStatus status);
    List<Overtime> findByEmployeeIdAndType(UUID employeeId, OvertimeType type);
    List<Overtime> findByEmployeeIdAndOvertimeDateBetween(UUID employeeId, LocalDate startDate, LocalDate endDate);

    List<Overtime> findByEmployeeIdAndOvertimeDate(UUID employeeId, LocalDate overtimeDate);

    List<Overtime> findByStatus(OvertimeStatus status);

    @Query("SELECT DISTINCT o FROM Overtime o LEFT JOIN FETCH o.employee LEFT JOIN FETCH o.workPost ORDER BY o.overtimeDate DESC, o.id")
    List<Overtime> findAllWithEmployeeAndWorkPost();

    @Query("SELECT DISTINCT o FROM Overtime o LEFT JOIN FETCH o.employee LEFT JOIN FETCH o.workPost WHERE o.status = :status ORDER BY o.overtimeDate DESC, o.id")
    List<Overtime> findByStatusWithEmployeeAndWorkPost(@Param("status") OvertimeStatus status);

    List<Overtime> findByStatusAndOvertimeDateBetween(OvertimeStatus status, LocalDate startDate, LocalDate endDate);

    @Query("SELECT DISTINCT o FROM Overtime o LEFT JOIN FETCH o.employee LEFT JOIN FETCH o.workPost WHERE o.status = :status AND o.overtimeDate BETWEEN :start AND :end ORDER BY o.overtimeDate, o.id")
    List<Overtime> findApprovedByPeriodWithFetch(@Param("status") OvertimeStatus status, @Param("start") LocalDate start, @Param("end") LocalDate end);
} 