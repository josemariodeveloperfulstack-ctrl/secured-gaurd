package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "tb_scheduled_email_attachment")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ScheduledEmailAttachment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheduled_email_id", nullable = false)
    private ScheduledEmail scheduledEmail;

    @Column(nullable = false)
    private String filename;

    @Column(name = "content_type")
    private String contentType;

    @Lob
    @Column(nullable = false, length = 30000000) // Support up to ~28-30MB
    private byte[] content;
}
