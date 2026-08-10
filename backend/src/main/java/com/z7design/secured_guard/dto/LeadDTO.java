package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.model.enums.LeadStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class LeadDTO {
    
    private java.util.UUID id;
    
    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 255, message = "Nome deve ter no máximo 255 caracteres")
    private String name;
    
    @Email(message = "Email deve ser válido")
    @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
    private String email;
    
    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    private String phone;
    
    @Size(max = 20, message = "Celular deve ter no máximo 20 caracteres")
    private String mobile;
    
    @Size(max = 255, message = "Empresa deve ter no máximo 255 caracteres")
    private String company;
    
    @Size(max = 255, message = "Cargo deve ter no máximo 255 caracteres")
    private String position;
    
    @Size(max = 1000, message = "Descrição deve ter no máximo 1000 caracteres")
    private String description;
    
    private LeadStatus status;
    
    private LeadSource source;
    
    private BigDecimal estimatedValue;
    
    private String notes;
    
    private java.util.UUID assignedToId;
    
    private String assignedToName;
    
    private LocalDateTime nextFollowUp;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    // Constructors
    public LeadDTO() {}
    
    public LeadDTO(String name, String email) {
        this.name = name;
        this.email = email;
    }

    /** Projeção JPQL para listagem — evita carregar entidade User completa (roles/permissions EAGER). */
    public LeadDTO(
            java.util.UUID id,
            String name,
            String email,
            String phone,
            String mobile,
            String company,
            String position,
            LeadStatus status,
            LeadSource source,
            BigDecimal estimatedValue,
            String notes,
            java.util.UUID assignedToId,
            String assignedToName,
            LocalDateTime nextFollowUp,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.mobile = mobile;
        this.company = company;
        this.position = position;
        this.status = status;
        this.source = source;
        this.estimatedValue = estimatedValue;
        this.notes = notes;
        this.assignedToId = assignedToId;
        this.assignedToName = assignedToName;
        this.nextFollowUp = nextFollowUp;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    
    // Getters and Setters
    public java.util.UUID getId() {
        return id;
    }
    
    public void setId(java.util.UUID id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public String getMobile() {
        return mobile;
    }
    
    public void setMobile(String mobile) {
        this.mobile = mobile;
    }
    
    public String getCompany() {
        return company;
    }
    
    public void setCompany(String company) {
        this.company = company;
    }
    
    public String getPosition() {
        return position;
    }
    
    public void setPosition(String position) {
        this.position = position;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public LeadStatus getStatus() {
        return status;
    }
    
    public void setStatus(LeadStatus status) {
        this.status = status;
    }
    
    public LeadSource getSource() {
        return source;
    }
    
    public void setSource(LeadSource source) {
        this.source = source;
    }
    
    public BigDecimal getEstimatedValue() {
        return estimatedValue;
    }
    
    public void setEstimatedValue(BigDecimal estimatedValue) {
        this.estimatedValue = estimatedValue;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public java.util.UUID getAssignedToId() {
        return assignedToId;
    }
    
    public void setAssignedToId(java.util.UUID assignedToId) {
        this.assignedToId = assignedToId;
    }
    
    public String getAssignedToName() {
        return assignedToName;
    }
    
    public void setAssignedToName(String assignedToName) {
        this.assignedToName = assignedToName;
    }
    
    public LocalDateTime getNextFollowUp() {
        return nextFollowUp;
    }
    
    public void setNextFollowUp(LocalDateTime nextFollowUp) {
        this.nextFollowUp = nextFollowUp;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
} 