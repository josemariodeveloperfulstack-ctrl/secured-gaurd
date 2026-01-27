package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.DisciplinaryWarningRequest;
import com.z7design.secured_guard.service.DisciplinaryWarningStandardPdfService;
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
@RequestMapping("/api/disciplinary-warning")
@RequiredArgsConstructor
@Tag(name = "Documentos - Advertência Disciplinar", description = "Geração de Advertência Disciplinar")
public class DisciplinaryWarningController {

    private final DisciplinaryWarningStandardPdfService warningService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF de Advertência Disciplinar")
    public ResponseEntity<byte[]> generatePdf(@RequestBody DisciplinaryWarningRequest request) {
        byte[] pdfBytes = warningService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"advertencia.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF de Advertência Disciplinar")
    public ResponseEntity<byte[]> previewPdf(@RequestBody DisciplinaryWarningRequest request) {
        byte[] pdfBytes = warningService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"advertencia.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/generate-excel")
    @Operation(summary = "Gerar Excel de Advertência Disciplinar")
    public ResponseEntity<byte[]> generateExcel(@RequestBody DisciplinaryWarningRequest request) {
        byte[] excelBytes = warningService.generateExcel(request);

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"advertencia.xlsx\"")
                .body(excelBytes);
    }
}
