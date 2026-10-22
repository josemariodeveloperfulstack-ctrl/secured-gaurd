package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tb_email_rule")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EmailRule {

    public static class EmailRuleBuilder {
        public EmailRuleBuilder() {
        }
    }
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private EmailAccount account;

    @Column(nullable = false)
    private String conditionType; // DOMAIN, SUBJECT, SENDER

    @Column(nullable = false)
    private String conditionValue;

    @Column(nullable = false)
    private String actionType; // MOVE, DELETE

    @Column(name = "action_value")
    private String actionValue; // Folder name if MOVE

    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
