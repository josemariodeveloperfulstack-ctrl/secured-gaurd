package com.z7design.secured_guard.dto;

import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReactionSummaryDTO {
    
    private String emoji;
    
    private Long count;
    
    private List<UUID> userIds; // IDs dos usuários que reagiram com este emoji
    
    private Boolean currentUserReacted; // Se o usuário atual reagiu com este emoji
}

