package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_unsubscribes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailUnsubscribe {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 320, unique = true)
    private String email;

    @Column(length = 64, unique = true)
    private String token;

    @Column(columnDefinition = "TEXT")
    private String reason;

    /** Como o descadastro foi feito: USER_CLICK, BOUNCE, COMPLAINT, MANUAL, etc. */
    @Column(length = 40)
    private String source;

    @Column(name = "is_unsubscribed", nullable = false)
    @Builder.Default
    private Boolean isUnsubscribed = Boolean.FALSE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private EmailCampaign campaign;

    @CreationTimestamp
    @Column(name = "unsubscribed_at", nullable = false, updatable = false)
    private Instant unsubscribedAt;

    /** Preenchido quando o utilizador confirma o descadastro pelo link (pode diferir de {@link #unsubscribedAt}). */
    @Column(name = "unsubscribe_confirmed_at")
    private Instant unsubscribeConfirmedAt;
}
