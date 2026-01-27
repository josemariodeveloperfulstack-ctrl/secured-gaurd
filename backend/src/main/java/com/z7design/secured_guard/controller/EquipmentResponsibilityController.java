package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EquipmentResponsibilityRequest;
import com.z7design.secured_guard.service.EquipmentResponsibilityStandardPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/equipment-responsibility")
@RequiredArgsConstructor
@Tag(name = "Documentos - Responsabilidade Equipamento", description = "Geração de Termo de Responsabilidade")
public class EquipmentResponsibilityController {

    private final EquipmentResponsibilityStandardPdfService equipmentService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Termo de Responsabilidade")
    public ResponseEntity<byte[]> generatePdf(@RequestBody EquipmentResponsibilityRequest request) {
        byte[] pdfBytes = equipmentService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"termo-equipamento.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Termo de Responsabilidade")
    public ResponseEntity<byte[]> previewPdf(@RequestBody EquipmentResponsibilityRequest request) {
        byte[] pdfBytes = equipmentService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"termo-equipamento.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/generate-excel")
    @Operation(summary = "Gerar Excel do Termo de Responsabilidade")
    public ResponseEntity<byte[]> generateExcel(@RequestBody EquipmentResponsibilityRequest request) {
        byte[] excelBytes = equipmentService.generateExcel(request);

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"termo-equipamento.xlsx\"")
                .body(excelBytes);
    }
}
