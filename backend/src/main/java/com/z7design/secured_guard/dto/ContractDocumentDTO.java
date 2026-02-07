package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ContractDocumentType;
import com.z7design.secured_guard.model.enums.DocumentSignatureStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractDocumentDTO {

    private UUID id;
    private UUID contractId;
    private ContractDocumentType type;
    private String fileUrl;
    private String fileName;
    private DocumentSignatureStatus signatureStatus;
    private LocalDateTime signedAt;
    private UUID signedById;
    private String signedByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
