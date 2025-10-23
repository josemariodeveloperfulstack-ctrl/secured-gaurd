package com.z7design.secured_guard.dto;

import java.util.UUID;

import com.z7design.secured_guard.model.enums.TicketStatus;
import com.z7design.secured_guard.model.enums.TicketPriority;
import com.z7design.secured_guard.model.enums.TicketCategory;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTicketRequest {
    private String title;
    private String description;
    private TicketPriority priority;
    private TicketStatus status;
    private TicketCategory category;
    private UUID assignedToAgentId;
    private String customerPhone;
}

