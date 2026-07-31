package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.MedicalDocumentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalDocumentHistoryRepository extends JpaRepository<MedicalDocumentHistory, UUID> {
    List<MedicalDocumentHistory> findByMedicalDocumentIdOrderByCreatedAtDesc(UUID medicalDocumentId);
}
