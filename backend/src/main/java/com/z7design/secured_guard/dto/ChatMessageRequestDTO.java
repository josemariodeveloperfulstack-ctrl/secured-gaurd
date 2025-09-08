package com.z7design.secured_guard.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import com.z7design.secured_guard.model.enums.ChatMessageType;

@Data
public class ChatMessageRequestDTO {
    
    @NotBlank(message = "Conteúdo da mensagem é obrigatório")
    private String content;
    
    private UUID recipientId;
    
    private UUID groupId;
    
    private UUID departmentId;
    
    private ChatMessageType type = ChatMessageType.TEXT;
    
    private UUID replyToId;
} 