package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.TransportVoucherRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.TransportVoucherStandardPdfService;
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

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/transport-voucher")
@RequiredArgsConstructor
@Tag(name = "Documentos - Vale-Transporte", description = "Geração de Termo de Vale-Transporte")
public class TransportVoucherController {

    private final TransportVoucherStandardPdfService voucherService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Termo de Vale-Transporte")
    public ResponseEntity<byte[]> generatePdf(@RequestBody TransportVoucherRequest request) {
        byte[] pdfBytes = voucherService.generatePdf(request);

        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("manualFill", Boolean.TRUE.equals(request.getManualFill()));
        if (request.getEmployeeName() != null) dados.put("employeeName", request.getEmployeeName());
        dados.put("optIn", request.isOptIn());
        if (request.getDocumentDate() != null) dados.put("documentDate", request.getDocumentDate().toString());

        String fileName = Boolean.TRUE.equals(request.getManualFill())
                ? "vale-transporte-manual.pdf"
                : "vale-transporte-" + safeSlug(request.getEmployeeName()) + ".pdf";

        persistenceService.persistir(
                request.getEmployeeId(),
                TipoDocumentoGerado.TRANSPORT_VOUCHER,
                pdfBytes,
                fileName,
                dados);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"vale-transporte.pdf\"")
                .body(pdfBytes);
    }

    private static String safeSlug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Termo de Vale-Transporte")
    public ResponseEntity<byte[]> previewPdf(@RequestBody TransportVoucherRequest request) {
        byte[] pdfBytes = voucherService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"vale-transporte.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/generate-excel")
    @Operation(summary = "Gerar Excel do Termo de Vale-Transporte")
    public ResponseEntity<byte[]> generateExcel(@RequestBody TransportVoucherRequest request) {
        byte[] excelBytes = voucherService.generateExcel(request);

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"vale-transporte.xlsx\"")
                .body(excelBytes);
    }
}
