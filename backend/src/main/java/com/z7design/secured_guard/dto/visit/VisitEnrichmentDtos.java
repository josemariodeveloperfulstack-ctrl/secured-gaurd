package com.z7design.secured_guard.dto.visit;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTOs para o controller de enriquecimento de visita.
 * Mantidos juntos para reduzir explosão de arquivos pequenos.
 */
public class VisitEnrichmentDtos {

    private VisitEnrichmentDtos() {
    }

    /* ===================================================================== */
    /* 1) Fotos                                                              */
    /* ===================================================================== */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PhotoDTO {
        private UUID id;
        private String fileUrl;
        private VisitPhotoType photoType;
        private String caption;
        @JsonFormat(shape = JsonFormat.Shape.STRING) private LocalDateTime takenAt;
        private UUID uploadedBy;

        public static PhotoDTO from(VisitControlPhoto p) {
            return PhotoDTO.builder()
                .id(p.getId())
                .fileUrl(p.getFileUrl())
                .photoType(p.getPhotoType())
                .caption(p.getCaption())
                .takenAt(p.getTakenAt())
                .uploadedBy(p.getUploadedBy())
                .build();
        }
    }

    /* ===================================================================== */
    /* 2) Problemas reportados                                                */
    /* ===================================================================== */
    @Data @NoArgsConstructor
    public static class IssueCreateDTO {
        private VisitIssueCategory category;
        private VisitIssueSeverity severity;
        @NotBlank private String description;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IssueDTO {
        private UUID id;
        private VisitIssueCategory category;
        private VisitIssueSeverity severity;
        private String description;
        @JsonFormat(shape = JsonFormat.Shape.STRING) private LocalDateTime reportedAt;
        @JsonFormat(shape = JsonFormat.Shape.STRING) private LocalDateTime resolvedAt;
        private String resolutionNotes;

        public static IssueDTO from(VisitControlIssue i) {
            return IssueDTO.builder()
                .id(i.getId())
                .category(i.getCategory())
                .severity(i.getSeverity())
                .description(i.getDescription())
                .reportedAt(i.getReportedAt())
                .resolvedAt(i.getResolvedAt())
                .resolutionNotes(i.getResolutionNotes())
                .build();
        }
    }

    /* ===================================================================== */
    /* 3) Inventário rápido (equipamentos/veículos no posto)                  */
    /* ===================================================================== */
    @Data @NoArgsConstructor
    public static class PostAssetCreateDTO {
        private VisitAssetType assetType;
        private UUID referenceId;
        @NotBlank private String description;
        private VisitAssetStatus status;
        private String notes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PostAssetDTO {
        private UUID id;
        private VisitAssetType assetType;
        private UUID referenceId;
        private String description;
        private VisitAssetStatus status;
        private String notes;

        public static PostAssetDTO from(VisitControlPostAsset a) {
            return PostAssetDTO.builder()
                .id(a.getId())
                .assetType(a.getAssetType())
                .referenceId(a.getReferenceId())
                .description(a.getDescription())
                .status(a.getStatus())
                .notes(a.getNotes())
                .build();
        }
    }

    /* ===================================================================== */
    /* 4) EPI entregue na visita                                              */
    /* ===================================================================== */
    @Data @NoArgsConstructor
    public static class EpiDeliveryCreateDTO {
        private UUID employeeId;
        @NotBlank private String epiItemDescription;
        private Integer quantity = 1;
        private Boolean employeeConfirmed = false;
        private String notes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EpiDeliveryDTO {
        private UUID id;
        private UUID employeeId;
        private String employeeName;
        private String epiItemDescription;
        private Integer quantity;
        private String photoUrl;
        private Boolean employeeConfirmed;
        @JsonFormat(shape = JsonFormat.Shape.STRING) private LocalDateTime deliveredAt;
        private String notes;

        public static EpiDeliveryDTO from(VisitControlEpiDelivery d) {
            return EpiDeliveryDTO.builder()
                .id(d.getId())
                .employeeId(d.getEmployee() != null ? d.getEmployee().getId() : null)
                .employeeName(d.getEmployee() != null ? d.getEmployee().getName() : null)
                .epiItemDescription(d.getEpiItemDescription())
                .quantity(d.getQuantity())
                .photoUrl(d.getPhotoUrl())
                .employeeConfirmed(d.getEmployeeConfirmed())
                .deliveredAt(d.getDeliveredAt())
                .notes(d.getNotes())
                .build();
        }
    }

    /* ===================================================================== */
    /* Bundle: tudo de uma visita                                             */
    /* ===================================================================== */
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VisitFullDTO {
        private UUID visitControlId;
        private List<PhotoDTO> photos;
        private List<IssueDTO> issues;
        private List<PostAssetDTO> postAssets;
        private List<EpiDeliveryDTO> epiDeliveries;
    }
}
