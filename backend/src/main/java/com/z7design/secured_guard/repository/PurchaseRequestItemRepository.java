package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PurchaseRequestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseRequestItemRepository extends JpaRepository<PurchaseRequestItem, UUID> {

    List<PurchaseRequestItem> findByPurchaseRequestId(UUID purchaseRequestId);

    List<PurchaseRequestItem> findByPurchaseRequestIdOrderByItemNameAsc(UUID purchaseRequestId);

    long countByPurchaseRequestId(UUID purchaseRequestId);
}
