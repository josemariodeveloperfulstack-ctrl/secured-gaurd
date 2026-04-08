package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockItemLocation;
import com.z7design.secured_guard.model.StorageShelf;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
