package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.VisitControlEpiDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VisitControlEpiDeliveryRepository extends JpaRepository<VisitControlEpiDelivery, UUID> {
    List<VisitControlEpiDelivery> findByVisitControlIdOrderByDeliveredAtAsc(UUID visitControlId);
}
