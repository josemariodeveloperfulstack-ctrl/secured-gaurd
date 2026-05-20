package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EmailAttachmentRepository extends JpaRepository<EmailAttachment, UUID> {
}
