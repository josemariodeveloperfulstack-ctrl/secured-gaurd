package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
} 