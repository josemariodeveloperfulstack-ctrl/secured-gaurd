package com.z7design.secured_guard.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class InteractionHistoryDTO {
    private java.util.UUID id;
    private java.util.UUID opportunityId;
    private java.util.UUID leadId;
    private UUID userId;
    private String userName;
    private String action;
    private String note;
    private LocalDateTime createdAt;

    public java.util.UUID getId() { return id; }
    public void setId(java.util.UUID id) { this.id = id; }
    public java.util.UUID getOpportunityId() { return opportunityId; }
    public void setOpportunityId(java.util.UUID opportunityId) { this.opportunityId = opportunityId; }
    public java.util.UUID getLeadId() { return leadId; }
    public void setLeadId(java.util.UUID leadId) { this.leadId = leadId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }
} 