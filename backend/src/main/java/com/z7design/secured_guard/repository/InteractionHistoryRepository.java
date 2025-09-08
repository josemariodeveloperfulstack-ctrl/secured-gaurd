package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.InteractionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InteractionHistoryRepository extends JpaRepository<InteractionHistory, java.util.UUID> {
} 