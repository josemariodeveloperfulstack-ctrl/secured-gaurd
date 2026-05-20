package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tb_scheduled_email")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ScheduledEmail {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private EmailAccount account;

    @Column(name = "to_address", nullable = false)
    private String toAddress;

    @Column(name = "cc_address")
    private String ccAddress;

    @Column(name = "bcc_address")
    private String bccAddress;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "scheduled_time", nullable = false)
    private LocalDateTime scheduledTime;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SENT, FAILED

    @OneToMany(mappedBy = "scheduledEmail", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScheduledEmailAttachment> attachments;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
