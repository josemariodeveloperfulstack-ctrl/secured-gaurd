package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.EPIDeliveryForm;
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

        public EPIDeliveryFormDTO() {
        }

        // Manual Getters and Setters
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
                if (form.getEmployee() != null) {
                        dto.setEmployeeId(form.getEmployee().getId());
                        dto.setEmployeeName(form.getEmployee().getName());
                        dto.setEmployeeCpf(form.getEmployee().getDocument());
                }
                if (form.getCompany() != null) {
                        dto.setCompanyId(form.getCompany().getId());
                        dto.setCompanyName(form.getCompany().getName());
                        dto.setCompanyCnpj(form.getCompany().getCnpj());
                }
                dto.setDeliveryDate(form.getDeliveryDate());
                if (form.getResponsibleEmployee() != null) {
                        dto.setResponsibleEmployeeId(form.getResponsibleEmployee().getId());
                        dto.setResponsibleEmployeeName(form.getResponsibleEmployee().getName());
                }
                dto.setObservations(form.getObservations());
                dto.setPdfUrl(form.getPdfUrl());
                dto.setDeliveryType(form.getDeliveryType());
                dto.setEmployeeWorkSector(form.getEmployeeWorkSector());
                if (form.getCreatedBy() != null) {
                        dto.setCreatedById(form.getCreatedBy().getId());
                        dto.setCreatedByName(form.getCreatedBy().getName());
                }
                dto.setCreatedAt(form.getCreatedAt());
                dto.setUpdatedAt(form.getUpdatedAt());
                if (form.getItems() != null) {
                        dto.setItems(form.getItems().stream()
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
                                                itemDto.setObservations(item.getObservations());
                                                return itemDto;
                                        })
                                        .collect(Collectors.toList()));
                }
                return dto;
        }
}
