package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.prospection.ProspectionSearch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProspectionSearchRepository extends JpaRepository<ProspectionSearch, UUID> {

    Page<ProspectionSearch> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT s FROM ProspectionSearch s LEFT JOIN FETCH s.companies c LEFT JOIN FETCH c.contacts WHERE s.id = :id")
    ProspectionSearch findByIdWithCompaniesAndContacts(UUID id);
}
