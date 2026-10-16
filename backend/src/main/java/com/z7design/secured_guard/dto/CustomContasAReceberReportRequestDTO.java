package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.PaymentMethod;
import com.z7design.secured_guard.model.enums.ReceivableStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class CustomContasAReceberReportRequestDTO {
    private LocalDate startDate;
    private LocalDate endDate;
    private String dateField; // "dueDate", "issueDate", "paymentDate"
    private ReceivableStatus status;
    private PaymentMethod paymentMethod;
    private UUID clientId;
    private UUID unitId;
    private UUID companyId;
    private String companySigla;
    private String category;
    private UUID subcategoriaId;
    
    /**
     * Filtro opcional para buscar apenas contas que vencem nos próximos N dias (ex: 7, 15, 30 dias)
     */
    private Integer expiringInDays;
    
    /**
     * Segmento do relatório (GERAL, RECEBIDOS, A_VENCER, VENCIDOS, INADIMPLENCIA)
     */
    private String reportSegment;

    /**
     * Lista de colunas solicitadas para o PDF.
     * Ex: "dueDate", "issueDate", "invoiceNumber", "description", "client", "unit", "category", "amount", "amountPaid", "status", "paymentDate"
     */
    private List<String> selectedColumns;
    
    /**
     * Tipo de agrupamento para exibição no PDF (ex: "CLIENT", "UNIT", "STATUS", "PERIOD", "NONE")
     */
    private String groupBy = "CLIENT";

    public CustomContasAReceberReportRequestDTO() {
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

    public ReceivableStatus getStatus() {
        return status;
    }

    public void setStatus(ReceivableStatus status) {
        this.status = status;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public UUID getClientId() {
        return clientId;
    }

    public void setClientId(UUID clientId) {
        this.clientId = clientId;
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

    public Integer getExpiringInDays() {
        return expiringInDays;
    }

    public void setExpiringInDays(Integer expiringInDays) {
        this.expiringInDays = expiringInDays;
    }

    public String getReportSegment() {
        return reportSegment;
    }

    public void setReportSegment(String reportSegment) {
        this.reportSegment = reportSegment;
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
