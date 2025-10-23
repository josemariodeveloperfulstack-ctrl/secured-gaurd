package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.MessageDeletionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface MessageDeletionLogRepository extends JpaRepository<MessageDeletionLog, UUID> {
    
    /**
     * Busca logs de exclusão por ID da mensagem
     */
    List<MessageDeletionLog> findByMessageIdOrderByDeletedAtDesc(UUID messageId);
    
    /**
     * Busca logs de exclusão por usuário que deletou
     */
    Page<MessageDeletionLog> findByDeletedByIdOrderByDeletedAtDesc(UUID userId, Pageable pageable);
    
    /**
     * Busca logs de exclusão em um período
     */
    @Query("SELECT l FROM MessageDeletionLog l WHERE l.deletedAt BETWEEN :startDate AND :endDate ORDER BY l.deletedAt DESC")
    List<MessageDeletionLog> findByPeriod(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    /**
     * Conta logs de exclusão por usuário
     */
    Long countByDeletedById(UUID userId);
}
