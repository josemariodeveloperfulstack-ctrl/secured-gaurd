package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_marketing_rejected_addresses")
@Getter
@Setter
public class EmailMarketingRejectedAddress {

    public EmailMarketingRejectedAddress() {
    }

    public EmailMarketingRejectedAddress(UUID id, String email, String name, String reason, EmailCampaign campaign, UUID recipientId, UUID leadId, Instant rejectedAt, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.reason = reason;
        this.campaign = campaign;
        this.recipientId = recipientId;
        this.leadId = leadId;
        this.rejectedAt = rejectedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(length = 500)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private EmailCampaign campaign;

    @Column(name = "recipient_id")
    private UUID recipientId;

    @Column(name = "lead_id")
    private UUID leadId;

    @Column(name = "rejected_at", nullable = false)
    private Instant rejectedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static EmailMarketingRejectedAddressBuilder builder() {
        return new EmailMarketingRejectedAddressBuilder();
    }

    public static class EmailMarketingRejectedAddressBuilder {
        private UUID id;
        private String email;
        private String name;
        private String reason;
        private EmailCampaign campaign;
        private UUID recipientId;
        private UUID leadId;
        private Instant rejectedAt;
        private Instant createdAt;
        private Instant updatedAt;

        public EmailMarketingRejectedAddressBuilder() {
        }

        public EmailMarketingRejectedAddressBuilder id(UUID id) {
            this.id = id;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder email(String email) {
            this.email = email;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder name(String name) {
            this.name = name;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder reason(String reason) {
            this.reason = reason;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder campaign(EmailCampaign campaign) {
            this.campaign = campaign;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder recipientId(UUID recipientId) {
            this.recipientId = recipientId;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder leadId(UUID leadId) {
            this.leadId = leadId;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder rejectedAt(Instant rejectedAt) {
            this.rejectedAt = rejectedAt;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public EmailMarketingRejectedAddressBuilder updatedAt(Instant updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public EmailMarketingRejectedAddress build() {
            return new EmailMarketingRejectedAddress(id, email, name, reason, campaign, recipientId, leadId, rejectedAt, createdAt, updatedAt);
        }
    }
}
