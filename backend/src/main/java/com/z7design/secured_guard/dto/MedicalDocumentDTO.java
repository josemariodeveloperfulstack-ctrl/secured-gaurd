package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.MedicalDocument;
import com.z7design.secured_guard.model.enums.MedicalDocumentType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MedicalDocumentDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeCpf;
    private String employeeDepartment;
    private String employeePosition;
    private UUID companyId;
    private String companyName;
    private MedicalDocumentType documentType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer days;
    private BigDecimal hours;
    private String cidCode;
    private String cidDescription;
    private String specialty;
    private String crm;
    private String doctorName;
    private String documentUrl;
    private String observations;
    private Boolean inssAlert;
    private String inssAlertMessage;
    private Integer relatedDaysInWindow;
    private String status;
    private UUID createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MedicalDocumentDTO fromEntity(MedicalDocument doc) {
        MedicalDocumentDTO dto = new MedicalDocumentDTO();
        dto.setId(doc.getId());
        try {
            if (doc.getEmployee() != null) {
                dto.setEmployeeId(doc.getEmployee().getId());
                dto.setEmployeeName(doc.getEmployee().getName());
                dto.setEmployeeCpf(doc.getEmployee().getCpf() != null
                        ? doc.getEmployee().getCpf()
                        : doc.getEmployee().getDocument());
                try {
                    if (doc.getEmployee().getDepartment() != null) {
                        dto.setEmployeeDepartment(doc.getEmployee().getDepartment().getName());
                    }
                } catch (Exception ignored) {
                    // associação órfã / lazy
                }
                try {
                    if (doc.getEmployee().getPosition() != null) {
                        dto.setEmployeePosition(doc.getEmployee().getPosition().getName());
                    }
                } catch (Exception ignored) {
                    // associação órfã / lazy
                }
            }
        } catch (Exception ignored) {
            // employee lazy/indisponível
        }
        try {
            if (doc.getCompany() != null) {
                dto.setCompanyId(doc.getCompany().getId());
                dto.setCompanyName(doc.getCompany().getName());
            }
        } catch (Exception ignored) {
            // company lazy/indisponível
        }
        dto.setDocumentType(doc.getDocumentType());
        dto.setStartDate(doc.getStartDate());
        dto.setEndDate(doc.getEndDate());
        dto.setDays(doc.getDays());
        dto.setHours(doc.getHours());
        dto.setCidCode(doc.getCidCode());
        dto.setCidDescription(doc.getCidDescription());
        dto.setSpecialty(doc.getSpecialty());
        dto.setCrm(doc.getCrm());
        dto.setDoctorName(doc.getDoctorName());
        dto.setDocumentUrl(doc.getDocumentUrl());
        dto.setObservations(doc.getObservations());
        dto.setInssAlert(Boolean.TRUE.equals(doc.getInssAlert()));
        dto.setInssAlertMessage(doc.getInssAlertMessage());
        dto.setRelatedDaysInWindow(doc.getRelatedDaysInWindow());
        dto.setStatus(doc.getStatus());
        try {
            if (doc.getCreatedBy() != null) {
                dto.setCreatedById(doc.getCreatedBy().getId());
                dto.setCreatedByName(doc.getCreatedBy().getName());
            }
        } catch (Exception ignored) {
            // createdBy lazy/indisponível
        }
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setUpdatedAt(doc.getUpdatedAt());
        return dto;
    }
}
