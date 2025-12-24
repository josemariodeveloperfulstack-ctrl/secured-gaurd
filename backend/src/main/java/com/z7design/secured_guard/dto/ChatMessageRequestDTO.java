package com.z7design.secured_guard.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import com.z7design.secured_guard.model.enums.ChatMessageType;

@Data
public class ChatMessageRequestDTO {
    
    // Conteúdo é opcional quando há arquivo
    private String content;
    
    private UUID recipientId;
    
    private UUID groupId;
    
    private UUID departmentId;
    
    private ChatMessageType type = ChatMessageType.TEXT;
    
    private UUID replyToId;
    
    // Informações do arquivo (preenchidas após upload)
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private String fileContentType;
} 