package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.ExtractedHoleriteData;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ExtractedHoleriteDataRepository extends JpaRepository<ExtractedHoleriteData, UUID> {
} 