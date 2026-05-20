package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ServiceOrderRequest;
import com.z7design.secured_guard.enums.DocumentType;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.ServiceOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/service-orders")
@RequiredArgsConstructor
@Tag(name = "Documentos - Ordens de Serviço", description = "Geração de Ordens de Serviço (Strategy)")
public class ServiceOrderController {

    private final ServiceOrderService serviceOrderService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @PostMapping("/{type}/generate-pdf")
    @Operation(summary = "Gerar PDF de Ordem de Serviço")
    public ResponseEntity<byte[]> generatePdf(
            @PathVariable("type") String typeStr,
            @RequestBody ServiceOrderRequest request) {

        DocumentType type = DocumentType.valueOf(typeStr.toUpperCase());
        byte[] pdfBytes = serviceOrderService.generatePdf(type, request);

        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("type", typeStr.toLowerCase());
        if (request.getEmployeeName() != null) dados.put("employeeName", request.getEmployeeName());
        if (request.getEmployeePosition() != null) dados.put("employeePosition", request.getEmployeePosition());
        if (request.getSector() != null) dados.put("sector", request.getSector());
        if (request.getRevision() != null) dados.put("revision", request.getRevision());
        if (request.getDocumentDate() != null) dados.put("documentDate", request.getDocumentDate().toString());

        persistenceService.persistir(
                request.getEmployeeId(),
                TipoDocumentoGerado.SERVICE_ORDER,
                pdfBytes,
                "os-" + typeStr.toLowerCase() + "-" + safeSlug(request.getEmployeeName()) + ".pdf",
                dados);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"os-" + typeStr.toLowerCase() + ".pdf\"")
                .body(pdfBytes);
    }

    private static String safeSlug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
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
