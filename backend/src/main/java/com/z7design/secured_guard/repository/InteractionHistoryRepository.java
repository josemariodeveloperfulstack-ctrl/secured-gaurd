package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.InteractionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InteractionHistoryRepository extends JpaRepository<InteractionHistory, java.util.UUID> {
    List<InteractionHistory> findByLeadIdOrderByCreatedAtDesc(UUID leadId);
    List<InteractionHistory> findByOpportunityIdOrderByCreatedAtDesc(UUID opportunityId);
} 