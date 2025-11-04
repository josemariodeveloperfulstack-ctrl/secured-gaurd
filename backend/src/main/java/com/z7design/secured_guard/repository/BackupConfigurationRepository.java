package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.BackupConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BackupConfigurationRepository extends JpaRepository<BackupConfiguration, UUID> {
    
    Optional<BackupConfiguration> findByName(String name);
    
    Optional<BackupConfiguration> findByType(String type);
}

