package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.dto.StockRequisitionListItemDTO;
import com.z7design.secured_guard.model.StockRequisition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockRequisitionRepository extends JpaRepository<StockRequisition, UUID> {

    Optional<StockRequisition> findByRequisitionNumber(String requisitionNumber);

    boolean existsByRequisitionNumber(String requisitionNumber);

    @Query("""
            SELECT new com.z7design.secured_guard.dto.StockRequisitionListItemDTO(
              r.id, r.requisitionNumber, r.status, e.name, r.movementReason, r.createdAt, u.name,
              (SELECT COUNT(l.id) FROM StockRequisitionLine l WHERE l.requisition.id = r.id)
            )
            FROM StockRequisition r
            LEFT JOIN r.employee e
            LEFT JOIN r.requestedByUser u
            ORDER BY r.createdAt DESC
            """)
    List<StockRequisitionListItemDTO> findAllListItems();

    @Query("""
            SELECT new com.z7design.secured_guard.dto.StockRequisitionListItemDTO(
              r.id, r.requisitionNumber, r.status, e.name, r.movementReason, r.createdAt, u.name,
              (SELECT COUNT(l.id) FROM StockRequisitionLine l WHERE l.requisition.id = r.id)
            )
            FROM StockRequisition r
            LEFT JOIN r.employee e
            LEFT JOIN r.requestedByUser u
            WHERE r.createdAt >= :start AND r.createdAt <= :end
            ORDER BY r.createdAt DESC
            """)
    List<StockRequisitionListItemDTO> findAllListItemsCreatedBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("""
            SELECT DISTINCT r FROM StockRequisition r
            LEFT JOIN FETCH r.lines l
            LEFT JOIN FETCH l.stockItem si
            LEFT JOIN FETCH si.unit
            LEFT JOIN FETCH r.employee
            LEFT JOIN FETCH r.requestedByUser
            LEFT JOIN FETCH r.approvedByUser
            LEFT JOIN FETCH r.deliveredByUser
            WHERE r.id = :id
            """)
    Optional<StockRequisition> findByIdFetched(@Param("id") UUID id);

    long countByStatus(com.z7design.secured_guard.model.enums.StockRequisitionStatus status);
}
