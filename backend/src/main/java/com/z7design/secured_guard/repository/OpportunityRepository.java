package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Opportunity;
import com.z7design.secured_guard.model.KanbanStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OpportunityRepository extends JpaRepository<Opportunity, java.util.UUID> {
    long countByStatus(KanbanStatus status);
    
    @EntityGraph(attributePaths = {"lead", "status", "assignedTo", "client"})
    @Query("SELECT o FROM Opportunity o WHERE o.isDeleted = false")
    List<Opportunity> findAllActiveWithRelationships();

    @Query("SELECT o FROM Opportunity o WHERE o.isDeleted = false")
    List<Opportunity> findAllActive();

    @Query("SELECT COUNT(o) FROM Opportunity o WHERE o.isDeleted = false")
    long countActive();

    @Query("SELECT COALESCE(SUM(o.estimatedValue), 0) FROM Opportunity o WHERE o.isDeleted = false")
    BigDecimal sumActiveEstimatedValue();

    /**
     * Soft delete via JPQL (evita StaleStateException de cascade/orphanRemoval no save da entidade).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Opportunity o SET o.isDeleted = true, o.deletionReason = :reason, "
            + "o.deletedAt = :deletedAt, o.deletedBy = :deletedBy, o.updatedAt = :deletedAt "
            + "WHERE o.id = :id AND o.isDeleted = false")
    int softDeleteById(@Param("id") UUID id,
                        @Param("reason") String reason,
                        @Param("deletedAt") LocalDateTime deletedAt,
                        @Param("deletedBy") com.z7design.secured_guard.model.User deletedBy);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Opportunity o SET o.isDeleted = true, o.deletionReason = :reason, "
            + "o.deletedAt = :deletedAt, o.deletedBy = :deletedBy, o.updatedAt = :deletedAt "
            + "WHERE o.id IN :ids AND o.isDeleted = false")
    int softDeleteByIds(@Param("ids") Collection<UUID> ids,
                        @Param("reason") String reason,
                        @Param("deletedAt") LocalDateTime deletedAt,
                        @Param("deletedBy") com.z7design.secured_guard.model.User deletedBy);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Opportunity o SET o.isDeleted = true, o.deletionReason = :reason, "
            + "o.deletedAt = :deletedAt, o.deletedBy = :deletedBy, o.updatedAt = :deletedAt "
            + "WHERE o.isDeleted = false")
    int softDeleteAllActive(@Param("reason") String reason,
                            @Param("deletedAt") LocalDateTime deletedAt,
                            @Param("deletedBy") com.z7design.secured_guard.model.User deletedBy);
} 