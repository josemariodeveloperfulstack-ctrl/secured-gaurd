package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmailRuleRepository extends JpaRepository<EmailRule, UUID> {
    List<EmailRule> findByAccountIdAndActiveTrue(UUID accountId);
}
