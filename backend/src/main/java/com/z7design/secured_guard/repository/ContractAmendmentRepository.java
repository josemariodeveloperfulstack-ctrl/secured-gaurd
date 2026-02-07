package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.ContractAmendment;
import com.z7design.secured_guard.model.enums.AmendmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ContractAmendmentRepository extends JpaRepository<ContractAmendment, UUID> {

    List<ContractAmendment> findByContract_IdOrderByCreatedAtDesc(UUID contractId);

    List<ContractAmendment> findByContract_IdAndStatus(UUID contractId, AmendmentStatus status);

    @Query("SELECT COUNT(a) FROM ContractAmendment a WHERE a.createdAt >= :since")
    long countCreatedSince(@Param("since") LocalDateTime since);
}
