package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.RadioChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RadioChecklistRepository extends JpaRepository<RadioChecklist, Long> {

    List<RadioChecklist> findAllByOrderByChecklistDateDescChecklistTimeDesc();

    @Query("SELECT r FROM RadioChecklist r WHERE " +
           "(:startDate IS NULL OR r.checklistDate >= :startDate) AND " +
           "(:endDate IS NULL OR r.checklistDate <= :endDate) AND " +
           "(:type IS NULL OR r.movementType = :type) AND " +
           "(:workPost IS NULL OR LOWER(r.workPostName) LIKE LOWER(CONCAT('%', :workPost, '%'))) AND " +
           "(:vigilante IS NULL OR LOWER(r.vigilanteName) LIKE LOWER(CONCAT('%', :vigilante, '%'))) " +
           "ORDER BY r.checklistDate DESC, r.checklistTime DESC")
    List<RadioChecklist> findWithFilters(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("type") RadioChecklist.MovementType type,
            @Param("workPost") String workPost,
            @Param("vigilante") String vigilante
    );
}
