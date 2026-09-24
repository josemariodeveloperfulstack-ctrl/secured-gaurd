package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class EPIDeliveryFormDTO {
        private UUID id;
        private UUID employeeId;
        private String employeeName;
        private String employeeCpf;
        private UUID companyId;
        private String companyName;
        private String companyCnpj;
        private LocalDate deliveryDate;
        private UUID responsibleEmployeeId;
        private String responsibleEmployeeName;
        private String observations;
        private String pdfUrl;
        private UUID createdById;
        private String createdByName;
        private EPIDeliveryType deliveryType;
        private String employeeWorkSector;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<EPIDeliveryFormItemDTO> items;
        private String signatureBase64;
        private String signatureType;
        private com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus status;
        private UUID stockRequisitionId;
        private LocalDateTime confirmationSentAt;
        private LocalDateTime confirmationExpiresAt;
        private boolean confirmationPending;
        private LocalDateTime refusedAt;
        private String refusalReason;

        public EPIDeliveryFormDTO() {
        }

        public LocalDateTime getRefusedAt() {
                return refusedAt;
        }

        public void setRefusedAt(LocalDateTime refusedAt) {
                this.refusedAt = refusedAt;
        }

        public String getRefusalReason() {
                return refusalReason;
        }

        public void setRefusalReason(String refusalReason) {
                this.refusalReason = refusalReason;
        }

        public LocalDateTime getConfirmationSentAt() {
                return confirmationSentAt;
        }

        public void setConfirmationSentAt(LocalDateTime confirmationSentAt) {
                this.confirmationSentAt = confirmationSentAt;
        }

        public LocalDateTime getConfirmationExpiresAt() {
                return confirmationExpiresAt;
        }

        public void setConfirmationExpiresAt(LocalDateTime confirmationExpiresAt) {
                this.confirmationExpiresAt = confirmationExpiresAt;
        }

        public boolean isConfirmationPending() {
                return confirmationPending;
        }

        public void setConfirmationPending(boolean confirmationPending) {
                this.confirmationPending = confirmationPending;
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

        public UUID getStockRequisitionId() {
                return stockRequisitionId;
        }

        public void setStockRequisitionId(UUID stockRequisitionId) {
                this.stockRequisitionId = stockRequisitionId;
        }
        public UUID getId() {
                return id;
        }

        public void setId(UUID id) {
                this.id = id;
        }

        public UUID getEmployeeId() {
                return employeeId;
        }

        public void setEmployeeId(UUID employeeId) {
                this.employeeId = employeeId;
        }

        public String getEmployeeName() {
                return employeeName;
        }

        public void setEmployeeName(String employeeName) {
                this.employeeName = employeeName;
        }

        public String getEmployeeCpf() {
                return employeeCpf;
        }

        public void setEmployeeCpf(String employeeCpf) {
                this.employeeCpf = employeeCpf;
        }

        public UUID getCompanyId() {
                return companyId;
        }

        public void setCompanyId(UUID companyId) {
                this.companyId = companyId;
        }

        public String getCompanyName() {
                return companyName;
        }

        public void setCompanyName(String companyName) {
                this.companyName = companyName;
        }

        public String getCompanyCnpj() {
                return companyCnpj;
        }

        public void setCompanyCnpj(String companyCnpj) {
                this.companyCnpj = companyCnpj;
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

        public String getResponsibleEmployeeName() {
                return responsibleEmployeeName;
        }

        public void setResponsibleEmployeeName(String responsibleEmployeeName) {
                this.responsibleEmployeeName = responsibleEmployeeName;
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

        public UUID getCreatedById() {
                return createdById;
        }

        public void setCreatedById(UUID createdById) {
                this.createdById = createdById;
        }

        public String getCreatedByName() {
                return createdByName;
        }

        public void setCreatedByName(String createdByName) {
                this.createdByName = createdByName;
        }

        public LocalDateTime getCreatedAt() {
                return createdAt;
        }

        public void setCreatedAt(LocalDateTime createdAt) {
                this.createdAt = createdAt;
        }

        public LocalDateTime getUpdatedAt() {
                return updatedAt;
        }

        public void setUpdatedAt(LocalDateTime updatedAt) {
                this.updatedAt = updatedAt;
        }

        public List<EPIDeliveryFormItemDTO> getItems() {
                return items;
        }

        public void setItems(List<EPIDeliveryFormItemDTO> items) {
                this.items = items;
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

        public static EPIDeliveryFormDTO fromEntity(EPIDeliveryForm form) {
                EPIDeliveryFormDTO dto = new EPIDeliveryFormDTO();
                dto.setId(form.getId());
                try {
                        if (form.getEmployee() != null) {
                                dto.setEmployeeId(form.getEmployee().getId());
                                dto.setEmployeeName(form.getEmployee().getName());
                                dto.setEmployeeCpf(form.getEmployee().getDocument());
                        }
                } catch (Exception e) {
                        // Trata proxy ou chave estrangeira inexistente de forma segura
                }
                try {
                        if (form.getCompany() != null) {
                                dto.setCompanyId(form.getCompany().getId());
                                dto.setCompanyName(form.getCompany().getName());
                                dto.setCompanyCnpj(form.getCompany().getCnpj());
                        }
                } catch (Exception e) {
                        // Trata proxy ou chave estrangeira inexistente de forma segura
                }
                dto.setDeliveryDate(form.getDeliveryDate());
                try {
                        if (form.getResponsibleEmployee() != null) {
                                dto.setResponsibleEmployeeId(form.getResponsibleEmployee().getId());
                                dto.setResponsibleEmployeeName(form.getResponsibleEmployee().getName());
                        } else if (form.getCreatedBy() != null && form.getCreatedBy().getName() != null) {
                                dto.setResponsibleEmployeeName(form.getCreatedBy().getName());
                        }
                } catch (Exception e) {
                        // Trata proxy ou chave estrangeira inexistente de forma segura
                }
                dto.setObservations(form.getObservations());
                dto.setPdfUrl(form.getPdfUrl());
                dto.setDeliveryType(form.getDeliveryType());
                dto.setEmployeeWorkSector(form.getEmployeeWorkSector());
                try {
                        if (form.getCreatedBy() != null) {
                                dto.setCreatedById(form.getCreatedBy().getId());
                                dto.setCreatedByName(form.getCreatedBy().getName());
                        }
                } catch (Exception e) {
                        // Trata proxy ou chave estrangeira inexistente de forma segura
                }
                dto.setCreatedAt(form.getCreatedAt());
                dto.setUpdatedAt(form.getUpdatedAt());
                dto.setSignatureBase64(form.getSignatureBase64());
                dto.setSignatureType(form.getSignatureType());
                dto.setStatus(form.getStatus());
                dto.setStockRequisitionId(form.getStockRequisitionId());
                dto.setConfirmationSentAt(form.getConfirmationSentAt());
                dto.setConfirmationExpiresAt(form.getConfirmationExpiresAt());
                dto.setRefusedAt(form.getRefusedAt());
                dto.setRefusalReason(form.getRefusalReason());
                boolean pending = form.getConfirmationToken() != null
                                && form.getSignedAt() == null
                                && form.getStatus() != com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus.COMPLETED;
                if (!pending && form.getItems() != null) {
                        // Item pendente = teve confirmação emitida (token do link OU código WhatsApp)
                        // e ainda não foi confirmado.
                        pending = form.getItems().stream()
                                        .anyMatch(i -> (i.getConfirmationToken() != null || i.getConfirmationCode() != null)
                                                        && i.getConfirmedAt() == null);
                }
                dto.setConfirmationPending(pending);

                if (form.getItems() != null) {
                        dto.setItems(form.getItems().stream()
                                        .sorted(java.util.Comparator
                                                        .comparing((EPIDeliveryFormItem i) -> i.getLineOrder() != null ? i.getLineOrder() : 0)
                                                        .thenComparing(i -> i.getId() != null ? i.getId().toString() : ""))
                                        .map(item -> {
                                                EPIDeliveryFormItemDTO itemDto = new EPIDeliveryFormItemDTO();
                                                itemDto.setId(item.getId());
                                                itemDto.setEpiName(item.getEpiName());
                                                itemDto.setQuantity(item.getQuantity());
                                                itemDto.setCa(item.getCa());
                                                itemDto.setCaName(item.getCaName());
                                                itemDto.setValidityDate(item.getValidityDate());
                                                itemDto.setUniformType(item.getUniformType());
                                                itemDto.setUniformPiece(item.getUniformPiece());
                                                itemDto.setSizeNumber(item.getSizeNumber());
                                                itemDto.setObservations(item.getObservations());
                                                itemDto.setStockItemId(item.getStockItemId());
                                                itemDto.setLineOrder(item.getLineOrder());
                                                itemDto.setSubstitutedDate(item.getSubstitutedDate());
                                                itemDto.setReplacementReason(item.getReplacementReason());
                                                itemDto.setReturnedDate(item.getReturnedDate());
                                                itemDto.setReturnReason(item.getReturnReason());
                                                itemDto.setConfirmationCode(item.getConfirmationCode());
                                                itemDto.setConfirmationExpiresAt(item.getConfirmationExpiresAt());
                                                itemDto.setConfirmationSentAt(item.getConfirmationSentAt());
                                                itemDto.setConfirmedAt(item.getConfirmedAt());
                                                return itemDto;
                                        })
                                        .collect(Collectors.toList()));
                }
                return dto;
        }
}
