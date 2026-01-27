package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.service.OsStandardPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/operational-service-order")
@Tag(name = "Documentos - OS Operacional", description = "Geração de Ordem de Serviço Operacional")
public class OperationalServiceOrderController {

    private final OsStandardPdfService osService;

    public OperationalServiceOrderController(OsStandardPdfService osService) {
        this.osService = osService;
    }

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF da OS Operacional")
    public ResponseEntity<byte[]> generatePdf(@RequestBody OperationalServiceOrderRequest request) {
        byte[] pdfBytes = osService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"os-operacional.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF da OS Operacional")
    public ResponseEntity<byte[]> previewPdf(@RequestBody OperationalServiceOrderRequest request) {
        byte[] pdfBytes = osService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"os-operacional.pdf\"")
                .body(pdfBytes);
    }
}
