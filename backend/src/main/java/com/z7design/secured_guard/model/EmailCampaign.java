package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.z7design.secured_guard.model.enums.EmailCampaignStatus;
import com.z7design.secured_guard.model.enums.EmailProviderType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "email_campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "template_id")
    private String templateId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_template_id")
    private EmailTemplate defaultTemplate;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 20)
    @Builder.Default
    private EmailProviderType providerType = EmailProviderType.SENDGRID;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EmailCampaignStatus status = EmailCampaignStatus.DRAFT;

    /**
     * Limite total de envios para a campanha (null = sem limite).
     * Mapeado para a coluna {@code max_emails} (legado da V1028__email_marketing_phase2).
     */
    @Column(name = "max_emails")
    private Integer totalLimit;

    /** Quantidade máxima de envios por dia (null = sem limite). */
    @Column(name = "daily_limit")
    private Integer dailyLimit;

    /** Quantidade máxima de envios por hora (null = sem limite). */
    @Column(name = "hourly_limit")
    private Integer hourlyLimit;

    /** Intervalo mínimo (segundos) entre dois envios consecutivos (null = imediato). */
    @Column(name = "min_interval_seconds")
    private Integer minIntervalSeconds;

    /** Momento para iniciar o envio (null = imediato após disparo). */
    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    /** Usuário que criou a campanha (usado como dono padrão de leads auto-criados). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @JsonManagedReference
    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<EmailCampaignRecipient> recipients = new ArrayList<>();
}
