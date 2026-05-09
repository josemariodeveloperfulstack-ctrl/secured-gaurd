package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.EPIDeliveryType;
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
    private EPIDeliveryType deliveryType;
    private String signatureBase64;
    private String signatureType;
    private String employeeWorkSector;
    private com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus status;

    @NotEmpty(message = "É necessário pelo menos um item de EPI")
    private List<EPIDeliveryFormItemDTO> items;

    public CreateEPIDeliveryFormDTO() {
    }

    // Manual Getters and Setters
    public String getSignatureBase64() {
        return signatureBase64;
    }

    public void setSignatureBase64(String signatureBase64) {
        this.signatureBase64 = signatureBase64;
    }

    public String getSignatureType() {
        return signatureType;
    }

    public void setSignatureType(String signatureType) {
        this.signatureType = signatureType;
    }

    public com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus getStatus() {
        return status;
    }

    public void setStatus(com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus status) {
        this.status = status;
    }
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

    public EPIDeliveryType getDeliveryType() {
        return deliveryType;
    }

    public void setDeliveryType(EPIDeliveryType deliveryType) {
        this.deliveryType = deliveryType;
    }

    public String getEmployeeWorkSector() {
        return employeeWorkSector;
    }

    public void setEmployeeWorkSector(String employeeWorkSector) {
        this.employeeWorkSector = employeeWorkSector;
    }

    public List<EPIDeliveryFormItemDTO> getItems() {
        return items;
    }

    public void setItems(List<EPIDeliveryFormItemDTO> items) {
        this.items = items;
    }
}
