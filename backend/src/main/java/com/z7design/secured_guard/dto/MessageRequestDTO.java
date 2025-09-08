package com.z7design.secured_guard.dto;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import com.z7design.secured_guard.model.enums.MessageType;
import com.z7design.secured_guard.model.enums.MessagePriority;

@Data
public class MessageRequestDTO {
    
    @NotBlank(message = "Título é obrigatório")
    private String title;
    
    @NotBlank(message = "Conteúdo é obrigatório")
    private String content;
    
    @NotNull(message = "Tipo de mensagem é obrigatório")
    private MessageType type;
    
    private MessagePriority priority = MessagePriority.NORMAL;
    
    private Set<UUID> recipientIds;
    
    private Set<UUID> groupIds;
    
    private Set<UUID> departmentIds;
    
    private Boolean sendEmail = false;
    
    private Boolean sendNotification = true;
    
    private LocalDateTime scheduledAt;
} 