package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_receipts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Column(name = "employee_name", length = 255)
    private String employeeName;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "receipt_number", length = 50)
    private String receiptNumber;

    @Column(name = "payment_date")
    private LocalDateTime paymentDate;

    @Column(name = "gross_salary", precision = 10, scale = 2)
    private BigDecimal grossSalary;

    @Column(name = "net_salary", precision = 10, scale = 2)
    private BigDecimal netSalary;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "status", length = 20)
    @Enumerated(EnumType.STRING)
    private ReceiptStatus status;

    @Column(name = "notes", length = 1000)
    private String notes;

    // Campos bancários extraídos do PDF
    @Column(name = "debited_agency", length = 20)
    private String debitedAgency;

    @Column(name = "debited_account", length = 50)
    private String debitedAccount;

    @Column(name = "debited_name", length = 255)
    private String debitedName;

    @Column(name = "credited_agency", length = 20)
    private String creditedAgency;

    @Column(name = "credited_account", length = 50)
    private String creditedAccount;

    @Column(name = "credited_name", length = 255)
    private String creditedName;

    @Column(name = "control_number", length = 50)
    private String controlNumber;

    @Column(name = "authentication_code", length = 100)
    private String authenticationCode;

    @Column(name = "transfer_date", length = 50)
    private String transferDate;

    @Column(name = "transfer_time", length = 20)
    private String transferTime;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "transaction_type", length = 100)
    private String transactionType;

    @Column(name = "statement_identification", length = 255)
    private String statementIdentification;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public enum ReceiptStatus {
        PENDING("Pendente"),
        PROCESSED("Processado"),
        SENT("Enviado"),
        ERROR("Erro");

        private final String description;

        ReceiptStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
} 