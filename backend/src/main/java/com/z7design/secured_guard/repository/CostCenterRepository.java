package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.CostCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface CostCenterRepository extends JpaRepository<CostCenter, UUID> {
    Optional<CostCenter> findByCode(String code);
    Optional<CostCenter> findByNameIgnoreCase(String name);
    List<CostCenter> findByStatus(CostCenter.Status status);
    Page<CostCenter> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<CostCenter> findByStatusAndNameContainingIgnoreCase(CostCenter.Status status, String name, Pageable pageable);
}


