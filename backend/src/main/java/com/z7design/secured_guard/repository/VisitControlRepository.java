// src/main/java/com/z7design/secured_guard/repository/VisitControlRepository.java
package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.VisitControl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface VisitControlRepository extends JpaRepository<VisitControl, UUID> {
    List<VisitControl> findByStatus(VisitControl.VisitStatus status);
    List<VisitControl> findByAssignedTo(String assignedTo);
    List<VisitControl> findBySupervisor(String supervisor);
    List<VisitControl> findByScheduledAtBetween(LocalDateTime start, LocalDateTime end);
}
