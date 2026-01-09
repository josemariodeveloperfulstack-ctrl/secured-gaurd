package com.z7design.secured_guard.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.Message;
import com.z7design.secured_guard.model.enums.MessageType;
import com.z7design.secured_guard.model.enums.MessageStatus;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    
    /**
     * Busca mensagens enviadas por um usuário
     */
    Page<Message> findBySenderIdOrderByCreatedAtDesc(UUID senderId, Pageable pageable);
    
    /**
     * Busca mensagens recebidas por um usuário
     */
    @Query("SELECT m FROM Message m JOIN m.recipients r WHERE r.id = :userId ORDER BY m.createdAt DESC")
    Page<Message> findByRecipientId(@Param("userId") UUID userId, Pageable pageable);
    
    /**
     * Busca mensagens por tipo
     */
    List<Message> findByTypeOrderByCreatedAtDesc(MessageType type);
    
    /**
     * Busca mensagens não lidas por usuário
     */
    @Query("SELECT m FROM Message m JOIN m.recipients r WHERE r.id = :userId AND m.status = 'UNREAD' ORDER BY m.createdAt DESC")
    List<Message> findUnreadByUserId(@Param("userId") UUID userId);
    
    /**
     * Busca mensagens agendadas para envio
     */
    @Query("SELECT m FROM Message m WHERE m.scheduledAt IS NOT NULL AND m.scheduledAt <= :now AND m.sentAt IS NULL")
    List<Message> findScheduledMessages(@Param("now") LocalDateTime now);
    
    /**
     * Busca mensagens por departamento
     */
    @Query("SELECT m FROM Message m JOIN m.departments d WHERE d.id = :departmentId ORDER BY m.createdAt DESC")
    List<Message> findByDepartmentId(@Param("departmentId") UUID departmentId);
    
    /**
     * Conta mensagens não lidas por usuário
     */
    @Query("SELECT COUNT(m) FROM Message m JOIN m.recipients r WHERE r.id = :userId AND m.status = 'UNREAD'")
    Long countUnreadByUserId(@Param("userId") UUID userId);
    
    /**
     * Busca mensagens recebidas por usuário e tipo
     */
    @Query("SELECT m FROM Message m JOIN m.recipients r WHERE r.id = :userId AND m.type = :type ORDER BY m.createdAt DESC")
    List<Message> findByRecipientsIdAndTypeOrderByCreatedAtDesc(@Param("userId") UUID userId, @Param("type") MessageType type);
    
    /**
     * Busca mensagens enviadas por usuário e tipo
     */
    List<Message> findBySenderIdAndTypeOrderByCreatedAtDesc(UUID senderId, MessageType type);
    
    /**
     * Busca mensagens por departamento e tipo
     */
    @Query("SELECT m FROM Message m JOIN m.departments d WHERE d.id = :departmentId AND m.type = :type ORDER BY m.createdAt DESC")
    List<Message> findByDepartmentsIdAndTypeOrderByCreatedAtDesc(@Param("departmentId") UUID departmentId, @Param("type") MessageType type);
    
    /**
     * Conta mensagens não lidas por usuário e tipo
     */
    @Query("SELECT COUNT(m) FROM Message m JOIN m.recipients r WHERE r.id = :userId AND m.type = :type AND m.status = 'UNREAD'")
    Long countByRecipientsIdAndTypeAndStatusUnread(@Param("userId") UUID userId, @Param("type") MessageType type);
    
    /**
     * Busca mensagens por tipo e prioridade
     */
    @Query("SELECT m FROM Message m WHERE m.type = :type AND m.priority = :priority ORDER BY m.createdAt DESC")
    List<Message> findByTypeAndPriorityOrderByCreatedAtDesc(@Param("type") MessageType type, @Param("priority") com.z7design.secured_guard.model.enums.MessagePriority priority);
    
    /**
     * Busca mensagens por status
     */
    @Query("SELECT m FROM Message m JOIN m.recipients r WHERE r.id = :userId AND m.status = :status ORDER BY m.createdAt DESC")
    List<Message> findByRecipientIdAndStatus(@Param("userId") UUID userId, @Param("status") MessageStatus status);
    
    /**
     * Busca mensagens por status com paginação
     */
    @Query("SELECT m FROM Message m JOIN m.recipients r WHERE r.id = :userId AND m.status = :status ORDER BY m.createdAt DESC")
    Page<Message> findByRecipientIdAndStatus(@Param("userId") UUID userId, @Param("status") MessageStatus status, Pageable pageable);
    
    /**
     * Busca mensagens por status e tipo
     */
    @Query("SELECT m FROM Message m JOIN m.recipients r WHERE r.id = :userId AND m.status = :status AND m.type = :type ORDER BY m.createdAt DESC")
    List<Message> findByRecipientIdAndStatusAndType(@Param("userId") UUID userId, @Param("status") MessageStatus status, @Param("type") MessageType type);
    
    /**
     * Busca mensagens por status considerando remetente ou destinatário
     */
    @Query("SELECT DISTINCT m FROM Message m LEFT JOIN m.recipients r WHERE (m.sender.id = :userId OR r.id = :userId) AND m.status = :status ORDER BY m.createdAt DESC")
    Page<Message> findByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") MessageStatus status, Pageable pageable);
    
    /**
     * Busca mensagens por status considerando remetente ou destinatário (sem paginação)
     */
    @Query("SELECT DISTINCT m FROM Message m LEFT JOIN m.recipients r WHERE (m.sender.id = :userId OR r.id = :userId) AND m.status = :status ORDER BY m.createdAt DESC")
    List<Message> findByUserIdAndStatusList(@Param("userId") UUID userId, @Param("status") MessageStatus status);
    
    /**
     * Conta mensagens não lidas considerando remetente ou destinatário
     */
    @Query("SELECT COUNT(DISTINCT m) FROM Message m LEFT JOIN m.recipients r WHERE (m.sender.id = :userId OR r.id = :userId) AND m.status = 'UNREAD'")
    Long countUnreadByUserIdIncludingSender(@Param("userId") UUID userId);
    
    /**
     * Conta mensagens por status considerando remetente ou destinatário
     */
    @Query("SELECT COUNT(DISTINCT m) FROM Message m LEFT JOIN m.recipients r WHERE (m.sender.id = :userId OR r.id = :userId) AND m.status = :status")
    Long countByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") MessageStatus status);
    
    /**
     * Conta total de mensagens considerando remetente ou destinatário
     */
    @Query("SELECT COUNT(DISTINCT m) FROM Message m LEFT JOIN m.recipients r WHERE (m.sender.id = :userId OR r.id = :userId)")
    Long countTotalByUserId(@Param("userId") UUID userId);
    
    /**
     * Busca mensagens recebidas (não arquivadas) considerando remetente ou destinatário
     */
    @Query("SELECT DISTINCT m FROM Message m LEFT JOIN m.recipients r WHERE (m.sender.id = :userId OR r.id = :userId) AND m.status != 'ARCHIVED' ORDER BY m.createdAt DESC")
    Page<Message> findNonArchivedByUserId(@Param("userId") UUID userId, Pageable pageable);
}