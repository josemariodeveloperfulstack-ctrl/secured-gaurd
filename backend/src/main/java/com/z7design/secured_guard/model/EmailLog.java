package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.EmailLogStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "email_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private EmailCampaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private EmailCampaignRecipient recipient;

    @Column(name = "provider_message_id")
    private String providerMessageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    @Builder.Default
    private EmailLogStatus status = EmailLogStatus.PENDING;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "clicked_at")
    private Instant clickedAt;

    @Column(name = "replied_at")
    private Instant repliedAt;

    @Column(name = "bounce_reason", columnDefinition = "TEXT")
    private String bounceReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "emailLog", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EmailAttachment> attachments = new ArrayList<>();
}
