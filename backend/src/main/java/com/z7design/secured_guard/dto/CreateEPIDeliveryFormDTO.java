package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class CreateEPIDeliveryFormDTO {

    @NotNull(message = "Funcionário é obrigatório")
    private UUID employeeId;

    @NotNull(message = "Empresa é obrigatória")
    private UUID companyId;

    @NotNull(message = "Data de entrega é obrigatória")
    private LocalDate deliveryDate;

    private UUID responsibleEmployeeId;
    private String observations;
    private String pdfUrl;

    @NotEmpty(message = "É necessário pelo menos um item de EPI")
    private List<EPIDeliveryFormItemDTO> items;

    public CreateEPIDeliveryFormDTO() {
    }

    // Manual Getters and Setters
    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public LocalDate getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDate deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public UUID getResponsibleEmployeeId() {
        return responsibleEmployeeId;
    }

    public void setResponsibleEmployeeId(UUID responsibleEmployeeId) {
        this.responsibleEmployeeId = responsibleEmployeeId;
    }

    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }

    public String getPdfUrl() {
        return pdfUrl;
    }

    public void setPdfUrl(String pdfUrl) {
        this.pdfUrl = pdfUrl;
    }

    public List<EPIDeliveryFormItemDTO> getItems() {
        return items;
    }

    public void setItems(List<EPIDeliveryFormItemDTO> items) {
        this.items = items;
    }
}
