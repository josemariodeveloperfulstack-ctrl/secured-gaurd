package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.WhatsAppConversation;
import com.z7design.secured_guard.model.enums.WhatsAppConversationMode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppConversationRepository extends JpaRepository<WhatsAppConversation, UUID> {

    Optional<WhatsAppConversation> findByPhoneNumber(String phoneNumber);

    Page<WhatsAppConversation> findByMode(WhatsAppConversationMode mode, Pageable pageable);

    Page<WhatsAppConversation> findAllByOrderByLastMessageAtDesc(Pageable pageable);
}
