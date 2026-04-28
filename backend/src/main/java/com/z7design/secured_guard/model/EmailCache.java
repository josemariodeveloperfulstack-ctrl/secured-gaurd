package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_email_cache", indexes = {
    @Index(name = "idx_email_cache_account", columnList = "conta_email_id"),
    @Index(name = "idx_email_cache_uid", columnList = "uid_provedor")
})
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EmailCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_email_id", nullable = false)
    private EmailAccount account;

    @Column(name = "uid_provedor", nullable = false)
    private Long providerUid; // IMAP UID

    @Column(name = "message_id", length = 255)
    private String messageId;

    @Column(nullable = false, length = 150)
    private String folder; // INBOX, Sent, Junk, etc.

    @Column(nullable = false, length = 255)
    private String sender;

    @Column(length = 500)
    private String subject;

    @Column(name = "received_date")
    private LocalDateTime receivedDate;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "has_attachment", nullable = false)
    @Builder.Default
    private Boolean hasAttachment = false;

    @Column(name = "is_spam", nullable = false)
    @Builder.Default
    private Boolean isSpam = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
