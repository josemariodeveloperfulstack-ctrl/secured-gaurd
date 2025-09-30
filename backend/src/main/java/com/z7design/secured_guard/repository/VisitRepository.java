package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Visit;
import com.z7design.secured_guard.model.enums.VisitStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface VisitRepository extends JpaRepository<Visit, UUID> {

    // Buscar visitas por supervisor
    @Query("SELECT v FROM Visit v WHERE v.supervisor.id = :supervisorId ORDER BY v.visitDate DESC, v.visitTime DESC")
    Page<Visit> findBySupervisorId(@Param("supervisorId") UUID supervisorId, Pageable pageable);

    // Buscar visitas por data
    @Query("SELECT v FROM Visit v WHERE v.visitDate = :date ORDER BY v.visitTime DESC")
    List<Visit> findByVisitDate(@Param("date") LocalDate date);

    // Buscar visitas por período
    @Query("SELECT v FROM Visit v WHERE v.visitDate BETWEEN :startDate AND :endDate ORDER BY v.visitDate DESC, v.visitTime DESC")
    Page<Visit> findByVisitDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, Pageable pageable);

    // Buscar visitas por posto de trabalho
    @Query("SELECT v FROM Visit v WHERE v.workPost.id = :workPostId ORDER BY v.visitDate DESC, v.visitTime DESC")
    Page<Visit> findByWorkPostId(@Param("workPostId") UUID workPostId, Pageable pageable);

    // Buscar visitas por cliente
    @Query("SELECT v FROM Visit v WHERE v.client.id = :clientId ORDER BY v.visitDate DESC, v.visitTime DESC")
    Page<Visit> findByClientId(@Param("clientId") UUID clientId, Pageable pageable);

    // Buscar visitas por status
    @Query("SELECT v FROM Visit v WHERE v.status = :status ORDER BY v.visitDate DESC, v.visitTime DESC")
    Page<Visit> findByStatus(@Param("status") VisitStatus status, Pageable pageable);

    // Buscar visitas agendadas para hoje
    @Query("SELECT v FROM Visit v WHERE v.visitDate = CURRENT_DATE AND v.status = 'PENDING' ORDER BY v.visitTime ASC")
    List<Visit> findScheduledVisitsForToday();

    // Buscar visitas do supervisor para hoje
    @Query("SELECT v FROM Visit v WHERE v.supervisor.id = :supervisorId AND v.visitDate = CURRENT_DATE ORDER BY v.visitTime ASC")
    List<Visit> findSupervisorVisitsForToday(@Param("supervisorId") UUID supervisorId);

    // Estatísticas de visitas
    @Query("SELECT COUNT(v) FROM Visit v WHERE v.visitDate BETWEEN :startDate AND :endDate")
    Long countVisitsInPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(v) FROM Visit v WHERE v.supervisor.id = :supervisorId AND v.visitDate BETWEEN :startDate AND :endDate")
    Long countVisitsBySupervisorInPeriod(@Param("supervisorId") UUID supervisorId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(v) FROM Visit v WHERE v.status = :status AND v.visitDate BETWEEN :startDate AND :endDate")
    Long countVisitsByStatusInPeriod(@Param("status") VisitStatus status, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Buscar visitas com funcionários presentes - Temporariamente comentado
    // @Query("SELECT v FROM Visit v JOIN v.presentEmployees pe WHERE pe = :employeeId ORDER BY v.visitDate DESC")
    // Page<Visit> findVisitsByPresentEmployee(@Param("employeeId") UUID employeeId, Pageable pageable);
}