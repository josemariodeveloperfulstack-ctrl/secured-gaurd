package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.WhatsAppMessageDirection;
import com.z7design.secured_guard.model.enums.WhatsAppMessageSenderType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "whatsapp_messages")
@Data
public class WhatsAppMessage {

    public WhatsAppMessage() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private WhatsAppConversation conversation;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false, length = 15)
    private WhatsAppMessageDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, length = 20)
    private WhatsAppMessageSenderType senderType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_user_id")
    private User senderUser;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @Column(name = "media_url", columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(name = "media_type", length = 50)
    private String mediaType;

    @Column(name = "external_message_id", length = 120)
    private String externalMessageId;

    @Column(name = "provider_type", length = 30)
    private String providerType;

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
