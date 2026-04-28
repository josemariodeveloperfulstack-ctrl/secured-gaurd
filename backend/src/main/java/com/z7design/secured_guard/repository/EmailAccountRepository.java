package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmailAccountRepository extends JpaRepository<EmailAccount, UUID> {
    List<EmailAccount> findByUserId(UUID userId);
    List<EmailAccount> findByStatus(String status);
}
