package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ContractDocumentType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateContractDocumentRequest {

    @NotNull(message = "Tipo do documento é obrigatório")
    private ContractDocumentType type;
    private String fileUrl;
    private String fileName;
}
