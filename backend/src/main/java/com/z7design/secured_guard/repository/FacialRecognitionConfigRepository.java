package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.FacialRecognitionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FacialRecognitionConfigRepository extends JpaRepository<FacialRecognitionConfig, UUID> {
    
    Optional<FacialRecognitionConfig> findByConfigKey(String configKey);
    
    boolean existsByConfigKey(String configKey);
}
