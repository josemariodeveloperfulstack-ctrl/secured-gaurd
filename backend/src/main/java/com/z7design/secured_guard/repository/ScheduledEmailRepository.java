package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.ScheduledEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduledEmailRepository extends JpaRepository<ScheduledEmail, UUID> {
    List<ScheduledEmail> findByStatusAndScheduledTimeBefore(String status, LocalDateTime time);
    List<ScheduledEmail> findByAccountIdOrderByScheduledTimeDesc(UUID accountId);
}
