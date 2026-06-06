package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.SupervisorVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface SupervisorVisitRepository extends JpaRepository<SupervisorVisit, UUID> {

    List<SupervisorVisit> findByVisitDateBetweenOrderByVisitDateDescVisitTimeDesc(
        LocalDate startDate, LocalDate endDate);

    @Query("SELECT sv FROM SupervisorVisit sv " +
           "WHERE sv.visitDate BETWEEN :startDate AND :endDate " +
           "AND (:supervisorId IS NULL OR sv.supervisor.id = :supervisorId) " +
           "AND (:workPostId IS NULL OR sv.workPost.id = :workPostId) " +
           "ORDER BY sv.visitDate DESC, sv.visitTime DESC")
    List<SupervisorVisit> findForReport(@Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate,
                                        @Param("supervisorId") UUID supervisorId,
                                        @Param("workPostId") UUID workPostId);

    List<SupervisorVisit> findBySupervisorIdAndVisitDate(UUID supervisorId, LocalDate visitDate);

    /**
     * Histórico de confirmações de presença de um funcionário: todas as visitas em que o
     * supervisor confirmou a presença dele no posto (mais recentes primeiro).
     */
    @Query("SELECT sv FROM SupervisorVisit sv " +
           "WHERE sv.checkedEmployee.id = :employeeId " +
           "ORDER BY sv.visitDate DESC, sv.visitTime DESC")
    List<SupervisorVisit> findByCheckedEmployee(@Param("employeeId") UUID employeeId);
}
