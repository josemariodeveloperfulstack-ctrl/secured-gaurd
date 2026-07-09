package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.SafetyEngineer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SafetyEngineerRepository extends JpaRepository<SafetyEngineer, UUID> {
    List<SafetyEngineer> findByCompanyIdOrderByNameAsc(UUID companyId);
    Optional<SafetyEngineer> findFirstByCompanyIdOrderByNameAsc(UUID companyId);
}
