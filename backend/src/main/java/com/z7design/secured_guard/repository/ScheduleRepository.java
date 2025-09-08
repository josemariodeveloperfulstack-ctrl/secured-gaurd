package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {
    List<Schedule> findByScheduleDateBetween(LocalDate startDate, LocalDate endDate);
    List<Schedule> findByEmployeeId(UUID employeeId);
    List<Schedule> findByScheduleDate(LocalDate date);
} 