package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.ContractDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContractDocumentRepository extends JpaRepository<ContractDocument, UUID> {

    List<ContractDocument> findByContract_IdOrderByCreatedAtDesc(UUID contractId);
}
