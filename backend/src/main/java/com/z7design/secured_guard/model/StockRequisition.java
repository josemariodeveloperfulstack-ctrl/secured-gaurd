package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "stock_requisitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockRequisition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "requisition_number", nullable = false, unique = true, length = 64)
    private String requisitionNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_user_id")
    private User requestedByUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_reason", nullable = false, length = 64)
    private MovementReason movementReason;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /** Snapshot do setor/posto/cargo do funcionário na criação (ex.: auditoria / PDF). */
    @Column(name = "employee_work_sector", length = 500)
    private String employeeWorkSector;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private StockRequisitionStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_user_id")
    private User approvedByUser;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivered_by_user_id")
    private User deliveredByUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_type", length = 20)
    private StockMovement.SignatureType signatureType;

    @Column(name = "digital_signature", columnDefinition = "TEXT")
    private String digitalSignature;

    @Column(name = "signature_at")
    private LocalDateTime signatureAt;

    @Column(name = "physical_signature_ack", columnDefinition = "TEXT")
    private String physicalSignatureAck;

    @OneToMany(mappedBy = "requisition", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StockRequisitionLine> lines = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void addLine(StockRequisitionLine line) {
        lines.add(line);
        line.setRequisition(this);
    }
}
