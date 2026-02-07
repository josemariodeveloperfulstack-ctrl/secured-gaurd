package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.AdjustmentType;
import com.z7design.secured_guard.model.enums.ContractOrigin;
import com.z7design.secured_guard.model.enums.TerminationReason;
import com.z7design.secured_guard.model.enums.ContractStatus;
import com.z7design.secured_guard.model.enums.ContractType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contracts")
public class Contract {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;
    
    @NotBlank(message = "Número do contrato é obrigatório")
    @Size(max = 50, message = "Número do contrato deve ter no máximo 50 caracteres")
    @Column(name = "contract_number", nullable = false, unique = true)
    private String contractNumber;
    
    @NotBlank(message = "Descrição é obrigatória")
    @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
    @Column(name = "description", nullable = false)
    private String description;
    
    @NotNull(message = "Data de início é obrigatória")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    
    @Column(name = "end_date")
    private LocalDate endDate;
    
    @NotNull(message = "Valor é obrigatório")
    @Column(name = "value", nullable = false, precision = 15, scale = 2)
    private BigDecimal value;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ContractStatus status = ContractStatus.ACTIVE;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_origin")
    private ContractOrigin contractOrigin;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type")
    private ContractType contractType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_commercial_id")
    private User responsibleCommercial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_manager_id")
    private User responsibleManager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id")
    private Proposal proposal;

    @Column(name = "monthly_value", precision = 15, scale = 2)
    private BigDecimal monthlyValue;

    @Column(name = "annual_value", precision = 15, scale = 2)
    private BigDecimal annualValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type")
    private AdjustmentType adjustmentType;

    @Column(name = "next_adjustment_date")
    private LocalDate nextAdjustmentDate;

    @Column(name = "auto_renewal")
    private Boolean autoRenewal = false;

    @Column(name = "replacement_time_hours")
    private Integer replacementTimeHours;

    @Column(name = "max_absence_minutes")
    private Integer maxAbsenceMinutes;

    @Column(name = "patrol_frequency", length = 255)
    private String patrolFrequency;

    @Column(name = "reports_required", columnDefinition = "TEXT")
    private String reportsRequired;

    @Column(name = "obligations_contractor", columnDefinition = "TEXT")
    private String obligationsContractor;

    @Column(name = "obligations_contracted", columnDefinition = "TEXT")
    private String obligationsContracted;

    @Column(name = "penalties", columnDefinition = "TEXT")
    private String penalties;

    @Enumerated(EnumType.STRING)
    @Column(name = "termination_reason")
    private TerminationReason terminationReason;

    @Column(name = "termination_date")
    private LocalDate terminationDate;

    @Column(name = "termination_checklist", columnDefinition = "TEXT")
    private String terminationChecklist;

    // Constructors
    public Contract() {}
    
    public Contract(String contractNumber, String description, LocalDate startDate, BigDecimal value, Client client) {
        this.contractNumber = contractNumber;
        this.description = description;
        this.startDate = startDate;
        this.value = value;
        this.client = client;
    }
    
    // Getters and Setters
    public java.util.UUID getId() {
        return id;
    }
    
    public void setId(java.util.UUID id) {
        this.id = id;
    }
    
    public String getContractNumber() {
        return contractNumber;
    }
    
    public void setContractNumber(String contractNumber) {
        this.contractNumber = contractNumber;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
    
    public BigDecimal getValue() {
        return value;
    }
    
    public void setValue(BigDecimal value) {
        this.value = value;
    }
    
    public ContractStatus getStatus() {
        return status;
    }
    
    public void setStatus(ContractStatus status) {
        this.status = status;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
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
    
    public Client getClient() {
        return client;
    }
    
    public void setClient(Client client) {
        this.client = client;
    }

    public ContractOrigin getContractOrigin() { return contractOrigin; }
    public void setContractOrigin(ContractOrigin contractOrigin) { this.contractOrigin = contractOrigin; }

    public ContractType getContractType() { return contractType; }
    public void setContractType(ContractType contractType) { this.contractType = contractType; }

    public User getResponsibleCommercial() { return responsibleCommercial; }
    public void setResponsibleCommercial(User responsibleCommercial) { this.responsibleCommercial = responsibleCommercial; }

    public User getResponsibleManager() { return responsibleManager; }
    public void setResponsibleManager(User responsibleManager) { this.responsibleManager = responsibleManager; }

    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }

    public BigDecimal getMonthlyValue() { return monthlyValue; }
    public void setMonthlyValue(BigDecimal monthlyValue) { this.monthlyValue = monthlyValue; }

    public BigDecimal getAnnualValue() { return annualValue; }
    public void setAnnualValue(BigDecimal annualValue) { this.annualValue = annualValue; }

    public AdjustmentType getAdjustmentType() { return adjustmentType; }
    public void setAdjustmentType(AdjustmentType adjustmentType) { this.adjustmentType = adjustmentType; }

    public LocalDate getNextAdjustmentDate() { return nextAdjustmentDate; }
    public void setNextAdjustmentDate(LocalDate nextAdjustmentDate) { this.nextAdjustmentDate = nextAdjustmentDate; }

    public Boolean getAutoRenewal() { return autoRenewal != null ? autoRenewal : false; }
    public void setAutoRenewal(Boolean autoRenewal) { this.autoRenewal = autoRenewal; }

    public Integer getReplacementTimeHours() { return replacementTimeHours; }
    public void setReplacementTimeHours(Integer replacementTimeHours) { this.replacementTimeHours = replacementTimeHours; }

    public Integer getMaxAbsenceMinutes() { return maxAbsenceMinutes; }
    public void setMaxAbsenceMinutes(Integer maxAbsenceMinutes) { this.maxAbsenceMinutes = maxAbsenceMinutes; }

    public String getPatrolFrequency() { return patrolFrequency; }
    public void setPatrolFrequency(String patrolFrequency) { this.patrolFrequency = patrolFrequency; }

    public String getReportsRequired() { return reportsRequired; }
    public void setReportsRequired(String reportsRequired) { this.reportsRequired = reportsRequired; }

    public String getObligationsContractor() { return obligationsContractor; }
    public void setObligationsContractor(String obligationsContractor) { this.obligationsContractor = obligationsContractor; }

    public String getObligationsContracted() { return obligationsContracted; }
    public void setObligationsContracted(String obligationsContracted) { this.obligationsContracted = obligationsContracted; }

    public String getPenalties() { return penalties; }
    public void setPenalties(String penalties) { this.penalties = penalties; }

    public TerminationReason getTerminationReason() { return terminationReason; }
    public void setTerminationReason(TerminationReason terminationReason) { this.terminationReason = terminationReason; }

    public LocalDate getTerminationDate() { return terminationDate; }
    public void setTerminationDate(LocalDate terminationDate) { this.terminationDate = terminationDate; }

    public String getTerminationChecklist() { return terminationChecklist; }
    public void setTerminationChecklist(String terminationChecklist) { this.terminationChecklist = terminationChecklist; }
} 