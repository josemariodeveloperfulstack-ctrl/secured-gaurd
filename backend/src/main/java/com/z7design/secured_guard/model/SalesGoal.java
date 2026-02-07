package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.GoalPeriod;
import com.z7design.secured_guard.model.enums.GoalType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sales_goals")
public class SalesGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Se null, é meta de equipe. Se preenchido, é meta individual. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "goal_type", nullable = false)
    private GoalType type;

    @Column(name = "target_value", precision = 15, scale = 2, nullable = false)
    private BigDecimal targetValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "goal_period", nullable = false)
    private GoalPeriod period;

    @Column(name = "reference_month", nullable = false)
    private int referenceMonth;

    @Column(name = "reference_year", nullable = false)
    private int referenceYear;

    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Constructors
    public SalesGoal() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public GoalType getType() { return type; }
    public void setType(GoalType type) { this.type = type; }

    public BigDecimal getTargetValue() { return targetValue; }
    public void setTargetValue(BigDecimal targetValue) { this.targetValue = targetValue; }

    public GoalPeriod getPeriod() { return period; }
    public void setPeriod(GoalPeriod period) { this.period = period; }

    public int getReferenceMonth() { return referenceMonth; }
    public void setReferenceMonth(int referenceMonth) { this.referenceMonth = referenceMonth; }

    public int getReferenceYear() { return referenceYear; }
    public void setReferenceYear(int referenceYear) { this.referenceYear = referenceYear; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
