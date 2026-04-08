package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.model.enums.MovementType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID>, JpaSpecificationExecutor<StockMovement> {

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

    // Histórico de entregas por funcionário
    @Query("SELECT sm FROM StockMovement sm WHERE " +
           "sm.employee.id = :employeeId AND " +
           "sm.movementType = com.z7design.secured_guard.model.enums.MovementType.SAIDA " +
           "ORDER BY sm.movementDate DESC")
    List<StockMovement> findDeliveryHistoryByEmployee(@Param("employeeId") UUID employeeId);

    // Últimas movimentações
    @Query("SELECT DISTINCT sm FROM StockMovement sm " +
           "LEFT JOIN FETCH sm.stockItem si " +
           "LEFT JOIN FETCH si.unit " +
           "LEFT JOIN FETCH sm.unit " +
           "LEFT JOIN FETCH sm.employee e " +
           "LEFT JOIN FETCH sm.user u " +
           "LEFT JOIN FETCH sm.itemLocation il " +
           "LEFT JOIN FETCH il.shelf " +
           "ORDER BY sm.movementDate DESC")
    List<StockMovement> findRecentMovements(Pageable pageable);

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
           "ORDER BY COUNT(sm) DESC")
    List<Object[]> getMostMovedItems(@Param("startDate") LocalDateTime startDate, Pageable pageable);
}