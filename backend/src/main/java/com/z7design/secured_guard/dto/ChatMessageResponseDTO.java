package com.z7design.secured_guard.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Data;

import com.z7design.secured_guard.model.enums.ChatMessageType;

@Data
public class ChatMessageResponseDTO {
    
    private UUID id;
    
    private String content;
    
    private UserResponseDTO sender;
    
    private UserResponseDTO recipient;
    
    private UserGroupDTO group;
    
    private DepartmentDTO department;
    
    private ChatMessageType type;
    
    private Boolean isRead;
    
    private LocalDateTime readAt;
    
    private LocalDateTime editedAt;
    
    private UUID replyToId;
    
    private java.util.List<ReactionSummaryDTO> reactions;
    
    // Informações do arquivo
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private String fileContentType;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
} 