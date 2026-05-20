package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.AccountsReceivable;
import com.z7design.secured_guard.model.enums.PaymentMethod;
import com.z7design.secured_guard.model.enums.ReceivableCategory;
import com.z7design.secured_guard.model.enums.ReceivableStatus;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class AccountsReceivableDTO {
    
    private UUID id;
    
    @NotNull(message = "Cliente é obrigatório")
    private UUID clientId;
    
    private ClientDTO client;
    
    @NotBlank(message = "Número da fatura é obrigatório")
    @Size(max = 100, message = "Número da fatura deve ter no máximo 100 caracteres")
    private String invoiceNumber;
    
    @Size(max = 100, message = "Número da medição deve ter no máximo 100 caracteres")
    private String measurementNumber;

    // Suporte a vinculação por ID da medição (opcional)
    private UUID measurementId;

    // Texto amigável da medição para exibição em listas (ex.: "CTC-CBM 148/295/2025 — 01/05/2026 a 31/05/2026")
    private String measurementInfo;
    
    @NotBlank(message = "Descrição é obrigatória")
    @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
    private String description;
    
    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.0", inclusive = false, message = "Valor deve ser maior que zero")
    private BigDecimal amount;
    
    private BigDecimal amountPaid = BigDecimal.ZERO;
    
    private BigDecimal pendingAmount;
    
    @NotNull(message = "Data de emissão é obrigatória")
    private LocalDate issueDate;
    
    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dueDate;
    
    private LocalDate paymentDate;
    
    private ReceivableStatus status = ReceivableStatus.PENDING;
    
    @NotNull(message = "Categoria é obrigatória")
    private ReceivableCategory category;
    
    @NotNull(message = "Forma de pagamento é obrigatória")
    private PaymentMethod paymentMethod;
    
    private Integer overdueDays = 0;
    
    private BigDecimal lateFee = BigDecimal.ZERO;
    
    private BigDecimal latePenalty = BigDecimal.ZERO;
    
    private String notes;
    
    private UUID unitId;
    
    private UUID workPostId;
    
    private String workPostName;
    
    // Constructors
    public AccountsReceivableDTO() {}
    
    public AccountsReceivableDTO(AccountsReceivable entity) {
        this.id = entity.getId();
        this.clientId = entity.getClient().getId();
        this.client = ClientDTO.fromEntity(entity.getClient());
        this.invoiceNumber = entity.getInvoiceNumber();
        this.measurementNumber = entity.getMeasurementNumber();

        if (entity.getMeasurement() != null) {
            this.measurementId = entity.getMeasurement().getId();
            this.measurementInfo = buildMeasurementInfo(entity.getMeasurement());
        } else if (this.measurementNumber != null && !this.measurementNumber.isBlank()) {
            this.measurementInfo = this.measurementNumber;
        }

        this.description = entity.getDescription();
        this.amount = entity.getAmount();
        this.amountPaid = entity.getAmountPaid();
        this.pendingAmount = entity.getPendingAmount();
        this.issueDate = entity.getIssueDate();
        this.dueDate = entity.getDueDate();
        this.paymentDate = entity.getPaymentDate();
        this.status = entity.getStatus();
        this.category = entity.getCategory();
        this.paymentMethod = entity.getPaymentMethod();
        this.overdueDays = entity.getOverdueDays();
        this.lateFee = entity.getLateFee();
        this.latePenalty = entity.getLatePenalty();
        this.notes = entity.getNotes();
        this.unitId = entity.getUnit() != null ? entity.getUnit().getId() : null;
        if (entity.getWorkPost() != null) {
            this.workPostId = entity.getWorkPost().getId();
            this.workPostName = entity.getWorkPost().getName();
        }
    }
    
    // Static factory method
    public static AccountsReceivableDTO fromEntity(AccountsReceivable entity) {
        return new AccountsReceivableDTO(entity);
    }

    private static String buildMeasurementInfo(com.z7design.secured_guard.model.MeasurementBulletin m) {
        StringBuilder sb = new StringBuilder();
        if (m.getContractNumber() != null && !m.getContractNumber().isBlank()) {
            sb.append(m.getContractNumber());
        } else if (m.getNfNumber() != null && !m.getNfNumber().isBlank()) {
            sb.append("NF ").append(m.getNfNumber());
        } else {
            sb.append("Medição ").append(m.getId().toString(), 0, 8);
        }
        if (m.getPeriodStart() != null && m.getPeriodEnd() != null) {
            sb.append(" — ")
                    .append(m.getPeriodStart())
                    .append(" a ")
                    .append(m.getPeriodEnd());
        }
        return sb.toString();
    }
    
    // Helper methods
    public boolean isOverdue() {
        return LocalDate.now().isAfter(dueDate) && status != ReceivableStatus.PAID;
    }
    
    public boolean isPaid() {
        return status == ReceivableStatus.PAID;
    }
    
    public boolean isPending() {
        return status == ReceivableStatus.PENDING;
    }
}
