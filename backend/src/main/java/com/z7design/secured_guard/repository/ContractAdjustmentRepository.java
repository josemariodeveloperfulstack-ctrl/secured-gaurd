package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.ContractAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContractAdjustmentRepository extends JpaRepository<ContractAdjustment, UUID> {

    List<ContractAdjustment> findByContract_IdOrderByAdjustmentDateDesc(UUID contractId);
}
