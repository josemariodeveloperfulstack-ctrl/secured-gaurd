package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.VisitControlIssue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VisitControlIssueRepository extends JpaRepository<VisitControlIssue, UUID> {
    List<VisitControlIssue> findByVisitControlIdOrderByReportedAtDesc(UUID visitControlId);
}
