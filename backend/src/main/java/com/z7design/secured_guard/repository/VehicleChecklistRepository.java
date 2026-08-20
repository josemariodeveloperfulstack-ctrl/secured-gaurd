package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.VehicleChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface VehicleChecklistRepository extends JpaRepository<VehicleChecklist, Long> {

    List<VehicleChecklist> findAllByOrderByChecklistDateDescChecklistTimeDesc();

    @Query("SELECT v FROM VehicleChecklist v WHERE " +
           "(:startDate IS NULL OR v.checklistDate >= :startDate) AND " +
           "(:endDate IS NULL OR v.checklistDate <= :endDate) AND " +
           "(:shift IS NULL OR v.shift = :shift) AND " +
           "(:search IS NULL OR (" +
           "LOWER(v.plate) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.model) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.employeeName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.supervisorName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(v.employeeRegistration) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ")) " +
           "ORDER BY v.checklistDate DESC, v.checklistTime DESC")
    List<VehicleChecklist> findWithFilters(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("shift") VehicleChecklist.ShiftType shift,
            @Param("search") String search
    );
}
