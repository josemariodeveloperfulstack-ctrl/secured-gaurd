package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddTicketMessageRequest {
    
    @NotBlank(message = "Conteúdo da mensagem é obrigatório")
    private String content;
    
    @NotBlank(message = "Nome do remetente é obrigatório")
    private String senderName;
    
    private String senderEmail;
    
    private Boolean isSupport = false;
}

