package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ImageVoiceNameAuthRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.ImageVoiceNameAuthStandardPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/image-voice-name-auth")
@RequiredArgsConstructor
@Tag(name = "Documentos - Imagem, Voz e Nome", description = "Geração do Termo de Autorização para Uso de Imagem, Voz e Nome")
public class ImageVoiceNameAuthController {

    private final ImageVoiceNameAuthStandardPdfService pdfService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Termo de Uso de Imagem, Voz e Nome")
    public ResponseEntity<?> generatePdf(@RequestBody ImageVoiceNameAuthRequest request) {
        try {
            log.info("Requisição para gerar PDF do Termo de Uso de Imagem/Voz/Nome. Employee: {}, Company: {}", request.getEmployeeId(), request.getCompanyId());
            byte[] pdfBytes = pdfService.generatePdf(request);

            Map<String, Object> dados = new LinkedHashMap<>();
            if (request.getEmployeeName() != null) dados.put("employeeName", request.getEmployeeName());
            if (request.getCity() != null) dados.put("city", request.getCity());
            if (request.getDocumentDate() != null) dados.put("documentDate", request.getDocumentDate().toString());

            persistenceService.persistir(
                    request.getEmployeeId(),
                    TipoDocumentoGerado.IMAGE_VOICE_NAME_AUTH,
                    pdfBytes,
                    "termo-uso-imagem-voz-nome-" + safeSlug(request.getEmployeeName()) + ".pdf",
                    dados);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"termo-uso-imagem-voz-nome.pdf\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do Termo de Imagem/Voz/Nome no controller: ", e);
            return ResponseEntity.status(500)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("message", "Erro ao gerar PDF: " + (e.getMessage() != null ? e.getMessage() : e.toString())));
        }
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Termo de Uso de Imagem, Voz e Nome")
    public ResponseEntity<?> previewPdf(@RequestBody ImageVoiceNameAuthRequest request) {
        try {
            log.info("Requisição para preview PDF do Termo de Uso de Imagem/Voz/Nome. Employee: {}, Company: {}", request.getEmployeeId(), request.getCompanyId());
            byte[] pdfBytes = pdfService.generatePdf(request);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"termo-uso-imagem-voz-nome-preview.pdf\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar preview do Termo de Imagem/Voz/Nome no controller: ", e);
            return ResponseEntity.status(500)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("message", "Erro ao gerar preview: " + (e.getMessage() != null ? e.getMessage() : e.toString())));
        }
    }

    private static String safeSlug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
    }
}
