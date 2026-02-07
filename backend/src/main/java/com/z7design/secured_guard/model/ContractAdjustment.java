package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.AdjustmentType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_adjustments")
public class ContractAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type", nullable = false)
    private AdjustmentType adjustmentType;

    @Column(name = "previous_value", precision = 15, scale = 2, nullable = false)
    private BigDecimal previousValue;

    @Column(name = "new_value", precision = 15, scale = 2, nullable = false)
    private BigDecimal newValue;

    @Column(name = "adjustment_date", nullable = false)
    private LocalDate adjustmentDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ContractAdjustment() {}

    public java.util.UUID getId() { return id; }
    public void setId(java.util.UUID id) { this.id = id; }

    public Contract getContract() { return contract; }
    public void setContract(Contract contract) { this.contract = contract; }

    public AdjustmentType getAdjustmentType() { return adjustmentType; }
    public void setAdjustmentType(AdjustmentType adjustmentType) { this.adjustmentType = adjustmentType; }

    public BigDecimal getPreviousValue() { return previousValue; }
    public void setPreviousValue(BigDecimal previousValue) { this.previousValue = previousValue; }

    public BigDecimal getNewValue() { return newValue; }
    public void setNewValue(BigDecimal newValue) { this.newValue = newValue; }

    public LocalDate getAdjustmentDate() { return adjustmentDate; }
    public void setAdjustmentDate(LocalDate adjustmentDate) { this.adjustmentDate = adjustmentDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
