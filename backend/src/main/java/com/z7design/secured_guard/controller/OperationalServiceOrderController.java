package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
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

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/operational-service-order")
@Tag(name = "Documentos - OS Operacional", description = "Geração de Ordem de Serviço Operacional")
public class OperationalServiceOrderController {

    private final OsStandardPdfService osService;
    private final DocumentoGeradoPersistenceService persistenceService;

    public OperationalServiceOrderController(OsStandardPdfService osService,
                                              DocumentoGeradoPersistenceService persistenceService) {
        this.osService = osService;
        this.persistenceService = persistenceService;
    }

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF da OS Operacional")
    public ResponseEntity<byte[]> generatePdf(@RequestBody OperationalServiceOrderRequest request) {
        byte[] pdfBytes = osService.generatePdf(request);

        Map<String, Object> dados = new LinkedHashMap<>();
        if (request.getEmployeeName() != null) dados.put("employeeName", request.getEmployeeName());
        if (request.getClientName() != null) dados.put("clientName", request.getClientName());
        if (request.getServiceType() != null) dados.put("serviceType", request.getServiceType());
        if (request.getStartDate() != null) dados.put("startDate", request.getStartDate().toString());
        if (request.getEndDate() != null) dados.put("endDate", request.getEndDate().toString());

        persistenceService.persistir(
                request.getEmployeeId(),
                TipoDocumentoGerado.SERVICE_ORDER,
                pdfBytes,
                "os-operacional-" + safeSlug(request.getEmployeeName()) + ".pdf",
                dados);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"os-operacional.pdf\"")
                .body(pdfBytes);
    }

    private static String safeSlug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
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
