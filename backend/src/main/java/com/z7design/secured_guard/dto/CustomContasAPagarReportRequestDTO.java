package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomContasAPagarReportRequestDTO {
    private LocalDate startDate;
    private LocalDate endDate;
    private String dateField; // "dueDate", "issueDate", "paymentDate"
    private ExpenseStatus status;
    private ExpenseType type;
    private UUID supplierId;
    private UUID unitId;
    private String workSector;
    private String companySigla;
    private String category;
    private UUID subcategoriaId;
    private UUID employeeId;
    
    /**
     * Lista de colunas solicitadas para o PDF.
     * Ex: "dueDate", "issueDate", "description", "supplier", "company", "unit", "workSector", "category", "amount", "status", "paymentDate"
     */
    private List<String> selectedColumns;
    
    /**
     * Tipo de agrupamento para exibição no PDF (ex: "UNIT_SECTOR", "STATUS", "SUPPLIER", "NONE")
     */
    private String groupBy = "UNIT_SECTOR";
}
