package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Remanejamento;
import com.z7design.secured_guard.model.enums.RemanejamentoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RemanejamentoRepository extends JpaRepository<Remanejamento, UUID> {
    List<Remanejamento> findByEmployeeId(UUID employeeId);
    
    List<Remanejamento> findByEmployeeIdAndDataRemanejamento(UUID employeeId, java.time.LocalDate dataRemanejamento);
    
    @Query("SELECT DISTINCT r FROM Remanejamento r " +
           "LEFT JOIN FETCH r.employee " +
           "LEFT JOIN FETCH r.originWorkstation " +
           "LEFT JOIN FETCH r.destinationWorkstation " +
           "ORDER BY r.dataRemanejamento DESC")
    List<Remanejamento> findAllWithEmployee();
    
    @Query("SELECT DISTINCT r FROM Remanejamento r " +
           "LEFT JOIN FETCH r.employee " +
           "LEFT JOIN FETCH r.originWorkstation " +
           "LEFT JOIN FETCH r.destinationWorkstation " +
           "WHERE r.employee.id = :employeeId " +
           "ORDER BY r.dataRemanejamento DESC")
    List<Remanejamento> findByEmployeeIdWithRelations(@org.springframework.data.repository.query.Param("employeeId") UUID employeeId);
    
    @Query("SELECT r FROM Remanejamento r " +
           "LEFT JOIN FETCH r.employee " +
           "LEFT JOIN FETCH r.originWorkstation " +
           "LEFT JOIN FETCH r.destinationWorkstation " +
           "WHERE r.id = :id")
    java.util.Optional<Remanejamento> findByIdWithRelations(@org.springframework.data.repository.query.Param("id") UUID id);

    @Query("SELECT DISTINCT r FROM Remanejamento r " +
           "LEFT JOIN FETCH r.employee e " +
           "LEFT JOIN FETCH e.company " +
           "LEFT JOIN FETCH r.originWorkstation " +
           "LEFT JOIN FETCH r.destinationWorkstation " +
           "ORDER BY r.dataRemanejamento DESC")
    List<Remanejamento> findAllWithEmployeeAndCompany();

    /* ===================================================================== */
    /* Fluxo de aprovação (Onda 3)                                            */
    /* ===================================================================== */

    /** Solicitações em determinado status, com relacionamentos pré-carregados. */
    @Query("SELECT DISTINCT r FROM Remanejamento r " +
           "LEFT JOIN FETCH r.employee " +
           "LEFT JOIN FETCH r.coverageEmployee " +
           "LEFT JOIN FETCH r.originWorkstation " +
           "LEFT JOIN FETCH r.destinationWorkstation " +
           "LEFT JOIN FETCH r.requestedBy " +
           "WHERE r.status = :status " +
           "ORDER BY r.requestedAt ASC NULLS LAST")
    List<Remanejamento> findByStatusWithRelations(
        @org.springframework.data.repository.query.Param("status") RemanejamentoStatus status);

    /** Solicitações abertas pelo supervisor logado. */
    @Query("SELECT DISTINCT r FROM Remanejamento r " +
           "LEFT JOIN FETCH r.employee " +
           "LEFT JOIN FETCH r.coverageEmployee " +
           "LEFT JOIN FETCH r.originWorkstation " +
           "LEFT JOIN FETCH r.destinationWorkstation " +
           "WHERE r.requestedBy.id = :userId " +
           "ORDER BY r.requestedAt DESC NULLS LAST")
    List<Remanejamento> findByRequestedByIdWithRelations(
        @org.springframework.data.repository.query.Param("userId") UUID userId);

    long countByStatus(RemanejamentoStatus status);
}
