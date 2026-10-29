package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class CustomContasAPagarReportRequestDTO {
    private LocalDate startDate;
    private LocalDate endDate;
    private String dateField; // "dueDate", "issueDate", "paymentDate"
    private ExpenseStatus status;
    private ExpenseType type;
    private UUID supplierId;
    private UUID unitId;
    private UUID companyId;
    private String workSector;
    private String companySigla;
    private String category;
    private UUID subcategoriaId;
    private UUID employeeId;
    
    /**
     * Filtro opcional para buscar apenas contas que vencem nos próximos N dias (ex: 7, 15, 30 dias)
     */
    private Integer expiringInDays;
    
    /**
     * Lista de colunas solicitadas para o PDF.
     * Ex: "dueDate", "issueDate", "description", "supplier", "company", "unit", "workSector", "category", "amount", "status", "paymentDate"
     */
    private List<String> selectedColumns;
    
    /**
     * Tipo de agrupamento para exibição no PDF (ex: "UNIT_SECTOR", "STATUS", "SUPPLIER", "NONE")
     */
    private String groupBy = "NONE";

    public CustomContasAPagarReportRequestDTO() {
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getDateField() {
        return dateField;
    }

    public void setDateField(String dateField) {
        this.dateField = dateField;
    }

    public ExpenseStatus getStatus() {
        return status;
    }

    public void setStatus(ExpenseStatus status) {
        this.status = status;
    }

    public ExpenseType getType() {
        return type;
    }

    public void setType(ExpenseType type) {
        this.type = type;
    }

    public UUID getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(UUID supplierId) {
        this.supplierId = supplierId;
    }

    public UUID getUnitId() {
        return unitId;
    }

    public void setUnitId(UUID unitId) {
        this.unitId = unitId;
    }

    public UUID getCompanyId() {
        return companyId != null ? companyId : unitId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public String getWorkSector() {
        return workSector;
    }

    public void setWorkSector(String workSector) {
        this.workSector = workSector;
    }

    public String getCompanySigla() {
        return companySigla;
    }

    public void setCompanySigla(String companySigla) {
        this.companySigla = companySigla;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public UUID getSubcategoriaId() {
        return subcategoriaId;
    }

    public void setSubcategoriaId(UUID subcategoriaId) {
        this.subcategoriaId = subcategoriaId;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public Integer getExpiringInDays() {
        return expiringInDays;
    }

    public void setExpiringInDays(Integer expiringInDays) {
        this.expiringInDays = expiringInDays;
    }

    public List<String> getSelectedColumns() {
        return selectedColumns;
    }

    public void setSelectedColumns(List<String> selectedColumns) {
        this.selectedColumns = selectedColumns;
    }

    public String getGroupBy() {
        return groupBy;
    }

    public void setGroupBy(String groupBy) {
        this.groupBy = groupBy;
    }
}
