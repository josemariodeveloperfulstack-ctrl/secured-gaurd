package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.WhatsAppConversationMode;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class WhatsAppConversationDTO {
    private UUID id;
    private String phoneNumber;
    private UUID leadId;
    private String leadName;
    private WhatsAppConversationMode mode;
    private UUID assignedUserId;
    private String assignedUserName;
    private String contactName;
    private String contextSummary;
    private LocalDateTime lastMessageAt;
    private String lastMessagePreview;
    private long messageCount;
}
