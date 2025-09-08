package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Opportunity;
import com.z7design.secured_guard.model.KanbanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OpportunityRepository extends JpaRepository<Opportunity, java.util.UUID> {
    long countByStatus(KanbanStatus status);
} 