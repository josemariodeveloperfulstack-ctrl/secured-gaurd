package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.BodyCamResponsibilityRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.BodyCamResponsibilityStandardPdfService;
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
@RequestMapping("/api/body-cam-responsibility")
@RequiredArgsConstructor
@Tag(name = "Documentos - Body Cam", description = "Geração do Termo de Responsabilidade e Uso de Câmera Corporal")
public class BodyCamResponsibilityController {

    private final BodyCamResponsibilityStandardPdfService pdfService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Termo de Body Cam")
    public ResponseEntity<byte[]> generatePdf(@RequestBody BodyCamResponsibilityRequest request) {
        byte[] pdfBytes = pdfService.generatePdf(request);

        Map<String, Object> dados = new LinkedHashMap<>();
        if (request.getEmployeeName() != null) dados.put("employeeName", request.getEmployeeName());
        if (request.getWorkLocation() != null) dados.put("workLocation", request.getWorkLocation());
        if (request.getDocumentDate() != null) dados.put("documentDate", request.getDocumentDate().toString());

        persistenceService.persistir(
                request.getEmployeeId(),
                TipoDocumentoGerado.BODY_CAM_RESPONSIBILITY,
                pdfBytes,
                "termo-body-cam-" + safeSlug(request.getEmployeeName()) + ".pdf",
                dados);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"termo-body-cam.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Termo de Body Cam")
    public ResponseEntity<byte[]> previewPdf(@RequestBody BodyCamResponsibilityRequest request) {
        byte[] pdfBytes = pdfService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"termo-body-cam-preview.pdf\"")
                .body(pdfBytes);
    }

    private static String safeSlug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
    }
}
