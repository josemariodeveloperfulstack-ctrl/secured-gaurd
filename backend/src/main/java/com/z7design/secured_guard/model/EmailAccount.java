package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_conta_email")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EmailAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(name = "imap_host", nullable = false, length = 150)
    private String imapHost;

    @Column(name = "imap_port", nullable = false)
    private Integer imapPort;

    @Column(name = "smtp_host", nullable = false, length = 150)
    private String smtpHost;

    @Column(name = "smtp_port", nullable = false)
    private Integer smtpPort;

    @Column(name = "senha_cifrada", nullable = false, length = 500)
    private String encryptedPassword;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, ERROR

    @Column(name = "last_sync_error", length = 500)
    private String lastSyncError;

    @Column(name = "assinatura", columnDefinition = "TEXT")
    private String signature;

    @Column(name = "last_sync_date")
    private LocalDateTime lastSyncDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
