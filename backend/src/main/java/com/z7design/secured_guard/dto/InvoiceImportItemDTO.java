package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceImportItemDTO {
    private LocalDate dueDate;
    private LocalDate issueDate;
    private String companySigla;
    private String supplierName;
    private String type;
    private String description;
    private String notes;
    private BigDecimal amount;
    private String unitName;
    private String status;
    private String barcode;
}
