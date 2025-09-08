package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.PaymentReceipt;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PaymentReceiptDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private Integer month;
    private Integer year;
    private String receiptNumber;
    private LocalDateTime paymentDate;
    private BigDecimal grossSalary;
    private BigDecimal netSalary;
    private String filePath;
    private String fileName;
    private Long fileSize;
    private PaymentReceipt.ReceiptStatus status;
    private String notes;
    
    // Campos bancários extraídos do PDF
    private String debitedAgency;
    private String debitedAccount;
    private String debitedName;
    private String creditedAgency;
    private String creditedAccount;
    private String creditedName;
    private String controlNumber;
    private String authenticationCode;
    private String transferDate;
    private String transferTime;
    private String bankName;
    private String transactionType;
    private String statementIdentification;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdBy;
    private UUID updatedBy;

    public static PaymentReceiptDTO fromEntity(PaymentReceipt entity) {
        PaymentReceiptDTO dto = new PaymentReceiptDTO();
        dto.setId(entity.getId());
        if (entity.getEmployee() != null) {
            dto.setEmployeeId(entity.getEmployee().getId());
        }
        dto.setEmployeeName(entity.getEmployeeName());
        dto.setMonth(entity.getMonth());
        dto.setYear(entity.getYear());
        dto.setReceiptNumber(entity.getReceiptNumber());
        dto.setPaymentDate(entity.getPaymentDate());
        dto.setGrossSalary(entity.getGrossSalary());
        dto.setNetSalary(entity.getNetSalary());
        dto.setFilePath(entity.getFilePath());
        dto.setFileName(entity.getFileName());
        dto.setFileSize(entity.getFileSize());
        dto.setStatus(entity.getStatus());
        dto.setNotes(entity.getNotes());
        
        // Campos bancários
        dto.setDebitedAgency(entity.getDebitedAgency());
        dto.setDebitedAccount(entity.getDebitedAccount());
        dto.setDebitedName(entity.getDebitedName());
        dto.setCreditedAgency(entity.getCreditedAgency());
        dto.setCreditedAccount(entity.getCreditedAccount());
        dto.setCreditedName(entity.getCreditedName());
        dto.setControlNumber(entity.getControlNumber());
        dto.setAuthenticationCode(entity.getAuthenticationCode());
        dto.setTransferDate(entity.getTransferDate());
        dto.setTransferTime(entity.getTransferTime());
        dto.setBankName(entity.getBankName());
        dto.setTransactionType(entity.getTransactionType());
        dto.setStatementIdentification(entity.getStatementIdentification());
        
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setCreatedBy(entity.getCreatedBy());
        dto.setUpdatedBy(entity.getUpdatedBy());
        return dto;
    }

    public PaymentReceipt toEntity() {
        PaymentReceipt entity = new PaymentReceipt();
        entity.setId(this.id);
        entity.setEmployeeName(this.employeeName);
        entity.setMonth(this.month);
        entity.setYear(this.year);
        entity.setReceiptNumber(this.receiptNumber);
        entity.setPaymentDate(this.paymentDate);
        entity.setGrossSalary(this.grossSalary);
        entity.setNetSalary(this.netSalary);
        entity.setFilePath(this.filePath);
        entity.setFileName(this.fileName);
        entity.setFileSize(this.fileSize);
        entity.setStatus(this.status);
        entity.setNotes(this.notes);
        
        // Campos bancários
        entity.setDebitedAgency(this.debitedAgency);
        entity.setDebitedAccount(this.debitedAccount);
        entity.setDebitedName(this.debitedName);
        entity.setCreditedAgency(this.creditedAgency);
        entity.setCreditedAccount(this.creditedAccount);
        entity.setCreditedName(this.creditedName);
        entity.setControlNumber(this.controlNumber);
        entity.setAuthenticationCode(this.authenticationCode);
        entity.setTransferDate(this.transferDate);
        entity.setTransferTime(this.transferTime);
        entity.setBankName(this.bankName);
        entity.setTransactionType(this.transactionType);
        entity.setStatementIdentification(this.statementIdentification);
        
        entity.setCreatedBy(this.createdBy);
        entity.setUpdatedBy(this.updatedBy);
        return entity;
    }
}
