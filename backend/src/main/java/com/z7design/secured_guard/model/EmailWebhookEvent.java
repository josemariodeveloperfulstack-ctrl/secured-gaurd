package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "email_webhook_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailWebhookEvent {

    @Id
    @Column(name = "sg_event_id", nullable = false, length = 128)
    private String sgEventId;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    @Column(name = "payload_snippet", length = 500)
    private String payloadSnippet;
}
