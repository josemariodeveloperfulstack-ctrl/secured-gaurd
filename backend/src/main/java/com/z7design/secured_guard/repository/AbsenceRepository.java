package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Absence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AbsenceRepository extends JpaRepository<Absence, UUID> {
    
    List<Absence> findByEmployeeId(UUID employeeId);
    
    List<Absence> findByAbsenceDate(LocalDate absenceDate);
    
    List<Absence> findByStatus(Absence.AbsenceStatus status);
    
    List<Absence> findByAbsenceType(Absence.AbsenceType absenceType);
    
    @Query("SELECT a FROM Absence a WHERE " +
           "a.employee.id = :employeeId AND " +
           "a.absenceDate BETWEEN :startDate AND :endDate")
    List<Absence> findByEmployeeAndDateRange(@Param("employeeId") UUID employeeId,
                                            @Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);
    
    @Query("SELECT a FROM Absence a WHERE " +
           "a.absenceDate BETWEEN :startDate AND :endDate")
    List<Absence> findByDateRange(@Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);
    
    @Query("SELECT a FROM Absence a WHERE " +
           "a.absenceDate BETWEEN :startDate AND :endDate AND " +
           "a.status = :status")
    List<Absence> findByDateRangeAndStatus(@Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate,
                                          @Param("status") Absence.AbsenceStatus status);
    
    @Query("SELECT COUNT(a) FROM Absence a WHERE " +
           "a.employee.id = :employeeId AND " +
           "a.absenceDate BETWEEN :startDate AND :endDate AND " +
           "a.status IN ('APPROVED', 'COVERED')")
    Long countApprovedAbsencesByEmployeeAndDateRange(@Param("employeeId") UUID employeeId,
                                                    @Param("startDate") LocalDate startDate,
                                                    @Param("endDate") LocalDate endDate);
    
    long countByStatus(Absence.AbsenceStatus status);
}
