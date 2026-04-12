package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhysicalInventoryImportResultDTO {
    /** DETAIL = linhas com código + quantidade nas abas; SUMMARY = apenas aba Resumo por categoria. */
    private String importMode;
    private String requisitionNumber;
    private LocalDateTime importedAt;
    private String fileName;
    @Builder.Default
    private List<PhysicalInventoryImportLineResultDTO> lines = new ArrayList<>();
    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}
