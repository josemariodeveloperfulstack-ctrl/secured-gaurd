package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.MovementReason;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stock_movements")
@Data
@EqualsAndHashCode(callSuper = false)
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_item_id", nullable = false)
    private StockItem stockItem;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private MovementType movementType;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false)
    private MovementReason reason;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "previous_quantity", nullable = false)
    private Integer previousQuantity;

    @Column(name = "new_quantity", nullable = false)
    private Integer newQuantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee; // Funcionário que recebeu (para saídas)

    @Column(name = "employee_name")
    private String employeeName; // Nome do funcionário (backup)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // Usuário que fez a movimentação

    @Column(name = "user_name")
    private String userName; // Nome do usuário (backup)

    @Column(name = "document_number")
    private String documentNumber; // Número da nota fiscal, recibo, etc.

    @Column(name = "supplier")
    private String supplier; // Fornecedor (para entradas)

    @Column(name = "unit_cost", precision = 10, scale = 2)
    private java.math.BigDecimal unitCost;

    @Column(name = "total_cost", precision = 10, scale = 2)
    private java.math.BigDecimal totalCost;

    @CreationTimestamp
    @Column(name = "movement_date", nullable = false, updatable = false)
    private LocalDateTime movementDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "qr_code_used")
    private String qrCodeUsed; // QR Code usado na movimentação

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_location_id")
    private StockItemLocation itemLocation; // Localização específica (prateleira/andar) usada na movimentação

    @Column(name = "digital_signature", columnDefinition = "TEXT")
    private String digitalSignature; // Assinatura digital (Base64)

    @Column(name = "signature_date")
    private LocalDateTime signatureDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_type")
    private SignatureType signatureType;

    @Column(name = "requisition_url")
    private String requisitionUrl; // URL ou path do PDF da requisição

    @Enumerated(EnumType.STRING)
    @Column(name = "requisition_sent_type")
    private RequisitionSentType requisitionSentType;

    public enum SignatureType {
        PHYSICAL, DIGITAL
    }

    public enum RequisitionSentType {
        EMAIL, WHATSAPP, NONE
    }

    // Método para calcular custo total e definir nomes como backup
    @PrePersist
    @PreUpdate
    public void prepareForPersistence() {
        // Calcular custo total
        if (unitCost != null && quantity != null) {
            totalCost = unitCost.multiply(java.math.BigDecimal.valueOf(quantity));
        }
        
        // Definir nomes como backup
        if (employee != null && employeeName == null) {
            employeeName = employee.getName();
        }
        if (user != null && userName == null) {
            userName = user.getName();
        }
    }
}