package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.MovementReason;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    // Buscar movimentações por item
    List<StockMovement> findByStockItemIdOrderByMovementDateDesc(UUID stockItemId);

    // Buscar movimentações por funcionário
    List<StockMovement> findByEmployeeIdOrderByMovementDateDesc(UUID employeeId);

    // Buscar movimentações por tipo
    List<StockMovement> findByMovementTypeOrderByMovementDateDesc(MovementType movementType);

    // Buscar movimentações por período
    List<StockMovement> findByMovementDateBetweenOrderByMovementDateDesc(LocalDateTime startDate, LocalDateTime endDate);

    // Buscar movimentações por unidade
    List<StockMovement> findByUnitIdOrderByMovementDateDesc(UUID unitId);

    // Busca com filtros múltiplos - usando query JPQL que funciona corretamente
    @Query("SELECT sm FROM StockMovement sm " +
           "WHERE (:pStockItemId IS NULL OR sm.stockItem.id = :pStockItemId) AND " +
           "(:pEmployeeId IS NULL OR sm.employee.id = :pEmployeeId) AND " +
           "(:pMovementType IS NULL OR sm.movementType = :pMovementType) AND " +
           "(:pReason IS NULL OR sm.reason = :pReason) AND " +
           "(:pUnitId IS NULL OR sm.unit.id = :pUnitId) AND " +
           "(:pStartDate IS NULL OR sm.movementDate >= :pStartDate) AND " +
           "(:pEndDate IS NULL OR sm.movementDate <= :pEndDate) AND " +
           "(:pSearchTerm IS NULL OR :pSearchTerm = '' OR " +
           "(sm.stockItem.name IS NOT NULL AND LOWER(sm.stockItem.name) LIKE LOWER(CONCAT('%', :pSearchTerm, '%'))) OR " +
           "(sm.stockItem.code IS NOT NULL AND LOWER(sm.stockItem.code) LIKE LOWER(CONCAT('%', :pSearchTerm, '%'))) OR " +
           "(sm.employeeName IS NOT NULL AND LOWER(sm.employeeName) LIKE LOWER(CONCAT('%', :pSearchTerm, '%'))) OR " +
           "(sm.userName IS NOT NULL AND LOWER(sm.userName) LIKE LOWER(CONCAT('%', :pSearchTerm, '%'))) OR " +
           "(sm.documentNumber IS NOT NULL AND LOWER(sm.documentNumber) LIKE LOWER(CONCAT('%', :pSearchTerm, '%')))) " +
           "ORDER BY sm.movementDate DESC")
    Page<StockMovement> findByFilters(
            @Param("pStockItemId") UUID stockItemId,
            @Param("pEmployeeId") UUID employeeId,
            @Param("pMovementType") MovementType movementType,
            @Param("pReason") MovementReason reason,
            @Param("pUnitId") UUID unitId,
            @Param("pStartDate") LocalDateTime startDate,
            @Param("pEndDate") LocalDateTime endDate,
            @Param("pSearchTerm") String searchTerm,
            Pageable pageable
    );

    // Histórico de entregas por funcionário
    @Query("SELECT sm FROM StockMovement sm WHERE " +
           "sm.employee.id = :employeeId AND " +
           "sm.movementType = 'SAIDA' " +
           "ORDER BY sm.movementDate DESC")
    List<StockMovement> findDeliveryHistoryByEmployee(@Param("employeeId") UUID employeeId);

    // Últimas movimentações
    List<StockMovement> findTop10ByOrderByMovementDateDesc();

    // Movimentações por QR Code
    List<StockMovement> findByQrCodeUsed(String qrCode);

    // Estatísticas de movimentação por período
    @Query("SELECT sm.movementType, COUNT(sm), SUM(sm.quantity) FROM StockMovement sm WHERE " +
           "sm.movementDate BETWEEN :startDate AND :endDate " +
           "GROUP BY sm.movementType")
    List<Object[]> getMovementStatisticsByPeriod(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Valor total de movimentações por período
    @Query("SELECT SUM(sm.totalCost) FROM StockMovement sm WHERE " +
           "sm.movementDate BETWEEN :startDate AND :endDate AND " +
           "sm.movementType = :movementType AND " +
           "sm.totalCost IS NOT NULL")
    Double getTotalCostByPeriodAndType(@Param("startDate") LocalDateTime startDate, 
                                       @Param("endDate") LocalDateTime endDate, 
                                       @Param("movementType") MovementType movementType);

    // Itens mais movimentados
    @Query("SELECT sm.stockItem.id, sm.stockItem.name, COUNT(sm) as movementCount FROM StockMovement sm " +
           "WHERE sm.movementDate >= :startDate " +
           "GROUP BY sm.stockItem.id, sm.stockItem.name " +
           "ORDER BY movementCount DESC")
    List<Object[]> getMostMovedItems(@Param("startDate") LocalDateTime startDate, Pageable pageable);
}