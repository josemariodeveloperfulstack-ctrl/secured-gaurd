package com.z7design.secured_guard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.MessageReaction;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, UUID> {
    
    /**
     * Busca todas as reações de uma mensagem
     */
    List<MessageReaction> findByMessageId(UUID messageId);
    
    /**
     * Busca reação específica de um usuário em uma mensagem
     */
    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);
    
    /**
     * Busca todas as reações de um usuário em uma mensagem
     */
    List<MessageReaction> findByMessageIdAndUserId(UUID messageId, UUID userId);
    
    /**
     * Conta quantos usuários reagiram com um emoji específico em uma mensagem
     */
    @Query("SELECT COUNT(DISTINCT mr.user.id) FROM MessageReaction mr WHERE mr.message.id = :messageId AND mr.emoji = :emoji")
    Long countUsersByMessageIdAndEmoji(@Param("messageId") UUID messageId, @Param("emoji") String emoji);
    
    /**
     * Busca todas as reações agrupadas por emoji para uma mensagem
     */
    @Query("SELECT mr.emoji, COUNT(DISTINCT mr.user.id) FROM MessageReaction mr WHERE mr.message.id = :messageId GROUP BY mr.emoji")
    List<Object[]> countReactionsByEmoji(@Param("messageId") UUID messageId);
    
    /**
     * Remove todas as reações de uma mensagem
     */
    void deleteByMessageId(UUID messageId);
}

