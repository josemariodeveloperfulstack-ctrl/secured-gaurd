package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Patrol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PatrolRepository extends JpaRepository<Patrol, UUID> {
    List<Patrol> findByRouteId(UUID routeId);
    List<Patrol> findByStartTimeBetween(LocalDateTime startTime, LocalDateTime endTime);
    List<Patrol> findByEmployeeId(UUID employeeId);
} 