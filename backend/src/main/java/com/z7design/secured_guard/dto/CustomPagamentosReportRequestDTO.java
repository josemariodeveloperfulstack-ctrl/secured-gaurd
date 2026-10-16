package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.PaymentMethod;
import com.z7design.secured_guard.model.enums.ScheduledPaymentStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class CustomPagamentosReportRequestDTO {
    private LocalDate startDate;
    private LocalDate endDate;
    private String dateField; // "scheduledDate", "executionDate"
    private ScheduledPaymentStatus status;
    private PaymentMethod paymentMethod;
    private UUID clientId;
    private UUID subcategoriaId;
    
    /**
     * Filtro opcional para buscar apenas pagamentos agendados para os próximos N dias (ex: 7, 15, 30 dias)
     */
    private Integer expiringInDays;
    
    /**
     * Lista de colunas solicitadas para o PDF.
     * Ex: "scheduledDate", "executionDate", "invoiceNumber", "description", "client", "paymentMethod", "amount", "status"
     */
    private List<String> selectedColumns;
    
    /**
     * Tipo de agrupamento para exibição no PDF (ex: "CLIENT", "STATUS", "PAYMENT_METHOD", "PERIOD", "NONE")
     */
    private String groupBy = "CLIENT";

    public CustomPagamentosReportRequestDTO() {
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

    public ScheduledPaymentStatus getStatus() {
        return status;
    }

    public void setStatus(ScheduledPaymentStatus status) {
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
