package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.DocumentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDocumentRequest {
    private DocumentType type;
    private String number;
    private LocalDate issueDate;
    private LocalDate expirationDate;
    private String description;
    private UUID employeeId;
}
