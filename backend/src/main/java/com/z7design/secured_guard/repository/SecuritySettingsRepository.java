package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.SecuritySettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SecuritySettingsRepository extends JpaRepository<SecuritySettings, UUID> {
    
    Optional<SecuritySettings> findByCompanyId(UUID companyId);
    
    boolean existsByCompanyId(UUID companyId);
}
