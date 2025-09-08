package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.KanbanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KanbanStatusRepository extends JpaRepository<KanbanStatus, java.util.UUID> {
} 