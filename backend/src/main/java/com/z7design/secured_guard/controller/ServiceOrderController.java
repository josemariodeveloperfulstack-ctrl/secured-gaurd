package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ServiceOrderRequest;
import com.z7design.secured_guard.enums.DocumentType;
import com.z7design.secured_guard.service.ServiceOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/service-orders")
@RequiredArgsConstructor
@Tag(name = "Documentos - Ordens de Serviço", description = "Geração de Ordens de Serviço (Strategy)")
public class ServiceOrderController {

    private final ServiceOrderService serviceOrderService;

    @PostMapping("/{type}/generate-pdf")
    @Operation(summary = "Gerar PDF de Ordem de Serviço")
    public ResponseEntity<byte[]> generatePdf(
            @PathVariable("type") String typeStr,
            @RequestBody ServiceOrderRequest request) {

        DocumentType type = DocumentType.valueOf(typeStr.toUpperCase());
        byte[] pdfBytes = serviceOrderService.generatePdf(type, request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"os-" + typeStr.toLowerCase() + ".pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/{type}/preview-pdf")
    @Operation(summary = "Visualizar PDF de Ordem de Serviço")
    public ResponseEntity<byte[]> previewPdf(
            @PathVariable("type") String typeStr,
            @RequestBody ServiceOrderRequest request) {

        DocumentType type = DocumentType.valueOf(typeStr.toUpperCase());
        byte[] pdfBytes = serviceOrderService.generatePdf(type, request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"os-" + typeStr.toLowerCase() + ".pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/{type}/generate-excel")
    @Operation(summary = "Gerar Excel de Ordem de Serviço")
    public ResponseEntity<byte[]> generateExcel(
            @PathVariable("type") String typeStr,
            @RequestBody ServiceOrderRequest request) {

        DocumentType type = DocumentType.valueOf(typeStr.toUpperCase());
        byte[] excelBytes = serviceOrderService.generateExcel(type, request);

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"os-" + typeStr.toLowerCase() + ".xlsx\"")
                .body(excelBytes);
    }
}
