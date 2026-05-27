package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.WhatsAppMessageDirection;
import com.z7design.secured_guard.model.enums.WhatsAppMessageSenderType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class WhatsAppMessageDTO {
    private UUID id;
    private UUID conversationId;
    private WhatsAppMessageDirection direction;
    private WhatsAppMessageSenderType senderType;
    private UUID senderUserId;
    private String senderUserName;
    private String body;
    private String mediaUrl;
    private String mediaType;
    private LocalDateTime createdAt;
}
