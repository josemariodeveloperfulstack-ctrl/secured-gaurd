package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.ErrorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ErrorLogRepository extends JpaRepository<ErrorLog, UUID> {
} 