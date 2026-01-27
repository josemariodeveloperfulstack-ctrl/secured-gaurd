package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.DeclarationRequest;
import com.z7design.secured_guard.service.DeclarationStandardPdfService;
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
@RequestMapping("/api/declaration")
@RequiredArgsConstructor
@Tag(name = "Documentos - Declaração", description = "Geração de Declaração Genérica")
public class DeclarationController {

    private final DeclarationStandardPdfService declarationService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF de Declaração")
    public ResponseEntity<byte[]> generatePdf(@RequestBody DeclarationRequest request) {
        byte[] pdfBytes = declarationService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"declaracao.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF de Declaração")
    public ResponseEntity<byte[]> previewPdf(@RequestBody DeclarationRequest request) {
        byte[] pdfBytes = declarationService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"declaracao.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/generate-excel")
    @Operation(summary = "Gerar Excel de Declaração")
    public ResponseEntity<byte[]> generateExcel(@RequestBody DeclarationRequest request) {
        byte[] excelBytes = declarationService.generateExcel(request);

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"declaracao.xlsx\"")
                .body(excelBytes);
    }
}
