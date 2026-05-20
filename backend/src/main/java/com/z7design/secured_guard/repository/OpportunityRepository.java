package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Opportunity;
import com.z7design.secured_guard.model.KanbanStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OpportunityRepository extends JpaRepository<Opportunity, java.util.UUID> {
    long countByStatus(KanbanStatus status);
    
    @EntityGraph(attributePaths = {"lead", "status", "assignedTo", "client"})
    @Query("SELECT o FROM Opportunity o WHERE o.isDeleted = false")
    List<Opportunity> findAllActiveWithRelationships();

    @Query("SELECT o FROM Opportunity o WHERE o.isDeleted = false")
    List<Opportunity> findAllActive();
} 