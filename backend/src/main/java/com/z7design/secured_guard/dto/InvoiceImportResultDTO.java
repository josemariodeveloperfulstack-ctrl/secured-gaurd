package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceImportResultDTO {
    private int totalRows;
    private int importedCount;
    private int newSuppliersCreatedCount;
    private BigDecimal totalAmount;
    private List<String> createdSupplierNames;
    private List<InvoiceDTO> importedInvoices;
}
