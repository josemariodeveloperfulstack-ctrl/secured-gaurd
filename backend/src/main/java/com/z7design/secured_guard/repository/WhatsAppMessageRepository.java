package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.WhatsAppMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppMessageRepository extends JpaRepository<WhatsAppMessage, UUID> {

    List<WhatsAppMessage> findByConversation_IdOrderByCreatedAtAsc(UUID conversationId);

    List<WhatsAppMessage> findByConversation_IdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    Optional<WhatsAppMessage> findByExternalMessageId(String externalMessageId);

    boolean existsByConversation_IdAndBodyAndCreatedAtAfter(
            UUID conversationId, String body, LocalDateTime after);
}
