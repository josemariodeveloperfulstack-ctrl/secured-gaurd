package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ServiceProviderAwarenessRequest;
import com.z7design.secured_guard.service.ServiceProviderAwarenessStandardPdfService;
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
@RequestMapping("/api/service-provider-awareness")
@RequiredArgsConstructor
@Tag(name = "Documentos - Ciência Prestador", description = "Geração de Termo de Ciência do Prestador")
public class ServiceProviderAwarenessController {

    private final ServiceProviderAwarenessStandardPdfService providerService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Termo de Ciência")
    public ResponseEntity<byte[]> generatePdf(@RequestBody ServiceProviderAwarenessRequest request) {
        byte[] pdfBytes = providerService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"termo-prestador.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Termo de Ciência")
    public ResponseEntity<byte[]> previewPdf(@RequestBody ServiceProviderAwarenessRequest request) {
        byte[] pdfBytes = providerService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"termo-prestador.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/generate-excel")
    @Operation(summary = "Gerar Excel do Termo de Ciência")
    public ResponseEntity<byte[]> generateExcel(@RequestBody ServiceProviderAwarenessRequest request) {
        byte[] excelBytes = providerService.generateExcel(request);

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"termo-prestador.xlsx\"")
                .body(excelBytes);
    }
}
