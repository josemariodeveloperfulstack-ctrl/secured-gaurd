package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailWebhookEventRepository extends JpaRepository<EmailWebhookEvent, String> {
}
