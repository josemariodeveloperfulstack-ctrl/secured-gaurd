package com.z7design.secured_guard.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.ChatMessageFavorite;

@Repository
public interface ChatMessageFavoriteRepository extends JpaRepository<ChatMessageFavorite, UUID> {
    
    Optional<ChatMessageFavorite> findByMessageIdAndUserId(UUID messageId, UUID userId);
    
    boolean existsByMessageIdAndUserId(UUID messageId, UUID userId);
    
    void deleteByMessageIdAndUserId(UUID messageId, UUID userId);
}

