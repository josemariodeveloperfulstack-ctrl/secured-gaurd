package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.DamageFinesResponsibilityRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DamageFinesResponsibilityStandardPdfService;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
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
@RequestMapping("/api/damage-fines-responsibility")
@RequiredArgsConstructor
@Tag(name = "Documentos - Danos e Multas", description = "Geração do Termo de Responsabilidade por Danos e Multas")
public class DamageFinesResponsibilityController {

    private final DamageFinesResponsibilityStandardPdfService pdfService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Termo de Responsabilidade por Danos e Multas")
    public ResponseEntity<byte[]> generatePdf(@RequestBody DamageFinesResponsibilityRequest request) {
        byte[] pdfBytes = pdfService.generatePdf(request);

        Map<String, Object> dados = new LinkedHashMap<>();
        if (request.getEmployeeName() != null) dados.put("employeeName", request.getEmployeeName());
        if (request.getEmployeeCpf() != null) dados.put("employeeCpf", request.getEmployeeCpf());
        if (request.getDocumentDate() != null) dados.put("documentDate", request.getDocumentDate().toString());

        persistenceService.persistir(
                request.getEmployeeId(),
                TipoDocumentoGerado.DAMAGE_FINES_RESPONSIBILITY,
                pdfBytes,
                "termo-danos-multas-" + safeSlug(request.getEmployeeName()) + ".pdf",
                dados);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"termo-danos-multas.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Termo de Responsabilidade por Danos e Multas")
    public ResponseEntity<byte[]> previewPdf(@RequestBody DamageFinesResponsibilityRequest request) {
        byte[] pdfBytes = pdfService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"termo-danos-multas-preview.pdf\"")
                .body(pdfBytes);
    }

    private static String safeSlug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
    }
}
