package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "email_webhook_events")
public class EmailWebhookEvent {

    public EmailWebhookEvent() {
    }

    public EmailWebhookEvent(String sgEventId, Instant processedAt, String payloadSnippet) {
        this.sgEventId = sgEventId;
        this.processedAt = processedAt;
        this.payloadSnippet = payloadSnippet;
    }

    public static EmailWebhookEventBuilder builder() {
        return new EmailWebhookEventBuilder();
    }

    public static class EmailWebhookEventBuilder {
        private String sgEventId;
        private Instant processedAt;
        private String payloadSnippet;

        public EmailWebhookEventBuilder() {
        }

        public EmailWebhookEventBuilder sgEventId(String sgEventId) {
            this.sgEventId = sgEventId;
            return this;
        }

        public EmailWebhookEventBuilder processedAt(Instant processedAt) {
            this.processedAt = processedAt;
            return this;
        }

        public EmailWebhookEventBuilder payloadSnippet(String payloadSnippet) {
            this.payloadSnippet = payloadSnippet;
            return this;
        }

        public EmailWebhookEvent build() {
            return new EmailWebhookEvent(sgEventId, processedAt, payloadSnippet);
        }
    }

    @Id
    @Column(name = "sg_event_id", nullable = false, length = 128)
    private String sgEventId;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    @Column(name = "payload_snippet", length = 500)
    private String payloadSnippet;

    public String getSgEventId() {
        return sgEventId;
    }

    public void setSgEventId(String sgEventId) {
        this.sgEventId = sgEventId;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(Instant processedAt) {
        this.processedAt = processedAt;
    }

    public String getPayloadSnippet() {
        return payloadSnippet;
    }

    public void setPayloadSnippet(String payloadSnippet) {
        this.payloadSnippet = payloadSnippet;
    }
}
