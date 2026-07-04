package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "purchase_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, length = 50)
    private String requestNumber;
    
    @Column(nullable = false, length = 100)
    private String title;
    
    @Column(length = 500)
    private String description;
    
    @Column(length = 20)
    private String priority; // LOW, MEDIUM, HIGH, URGENT
    
    @Column(length = 20)
    private String status; // DRAFT, SUBMITTED, APPROVED, REJECTED, IN_PROCESS, COMPLETED, CANCELLED
    
    @Column(length = 100)
    private String requesterName;
    
    @Column(length = 100)
    private String department;
    
    @Column(length = 100)
    private String justification;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal estimatedTotal;
    
    @Column(length = 20)
    private String urgency; // NORMAL, URGENT, CRITICAL
    
    @Column(name = "required_date")
    private LocalDateTime requiredDate;
    
    @Column(name = "request_date")
    private LocalDateTime requestDate;
    
    @Column(name = "approval_date")
    private LocalDateTime approvalDate;
    
    @Column(name = "completion_date")
    private LocalDateTime completionDate;
    
    @Column(length = 100)
    private String approvedBy;
    
    @Column(length = 500)
    private String approvalNotes;
    
    @Column(length = 100)
    private String supplier;
    
    @Column(length = 20)
    private String paymentMethod;
    
    @Column(name = "installments")
    private Integer installments;
    
    @Column(length = 20)
    private String deliveryMethod;
    
    @Column(length = 200)
    private String deliveryAddress;
    
    @Column(length = 100)
    private String contactPerson;
    
    @Column(length = 50)
    private String contactPhone;
    
    @Column(length = 100)
    private String contactEmail;
    
    @Column(length = 500)
    private String notes;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id")
    private Unit unit;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id")
    private User requester;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id")
    private User approver;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(length = 50)
    private String category;

    @Column(name = "unit_of_measure", length = 20)
    private String unitOfMeasure;

    @Column(name = "item_number", length = 100)
    private String itemNumber;

    @Column(precision = 10, scale = 2)
    private BigDecimal quantity;

    /** JSON: [{"size":"42","quantity":3}] */
    @Column(name = "size_breakdown", columnDefinition = "TEXT")
    private String sizeBreakdown;

    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PurchaseRequestItem> items = new ArrayList<>();
    
    // Métodos de negócio
    public boolean isUrgent() {
        return "URGENT".equals(priority) || "CRITICAL".equals(urgency);
    }
    
    public boolean canBeApproved() {
        return "SUBMITTED".equals(status);
    }
    
    public boolean isOverdue() {
        return requiredDate != null && LocalDateTime.now().isAfter(requiredDate) && !"COMPLETED".equals(status);
    }
    
    public long getDaysUntilRequired() {
        if (requiredDate == null) return 0;
        return java.time.Duration.between(LocalDateTime.now(), requiredDate).toDays();
    }
}