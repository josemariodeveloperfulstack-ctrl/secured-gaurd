package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockItemLocation;
import com.z7design.secured_guard.model.StorageShelf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StockItemLocationRepository extends JpaRepository<StockItemLocation, UUID> {
    
    List<StockItemLocation> findByStockItem(StockItem stockItem);
    
    List<StockItemLocation> findByStockItemId(UUID stockItemId);
    
    List<StockItemLocation> findByShelf(StorageShelf shelf);
    
    Optional<StockItemLocation> findByStockItemIdAndShelfIdAndFloor(UUID stockItemId, UUID shelfId, String floor);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE StockItemLocation l SET l.quantity = 0 WHERE l.stockItem.id IN (SELECT s.id FROM StockItem s WHERE s.active = true)")
    int resetLocationQuantitiesForActiveStockItems();

    /**
     * Quantidade total por prateleira/andar (apenas itens ativos).
     */
    @Query("""
            SELECT sh.identification, COALESCE(sil.floor, ''), SUM(sil.quantity)
            FROM StockItemLocation sil
            JOIN sil.shelf sh
            JOIN sil.stockItem si
            WHERE si.active = true
            GROUP BY sh.id, sh.identification, sil.floor
            HAVING SUM(sil.quantity) > 0
            ORDER BY sh.identification, sil.floor
            """)
    List<Object[]> aggregateQuantityByShelfAndFloor();
}
