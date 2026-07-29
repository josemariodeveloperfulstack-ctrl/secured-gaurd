package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ValeSafetyTermRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.ToxicologicalTestAuthPdfService;
import com.z7design.secured_guard.service.ValeGoldenRulesPdfService;
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

@RestController
@RequestMapping("/api/vale-safety-terms")
@RequiredArgsConstructor
@Tag(name = "Documentos - Termos Vale (VIG)", description = "Regras de Ouro e Autorização Toxicológica")
@Slf4j
public class ValeSafetyTermsController {

    private final ValeGoldenRulesPdfService goldenRulesPdfService;
    private final ToxicologicalTestAuthPdfService toxicologicalPdfService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @PostMapping("/golden-rules/generate-pdf")
    @Operation(summary = "Gerar PDF Regras de Ouro da Vale")
    public ResponseEntity<byte[]> generateGoldenRules(@RequestBody ValeSafetyTermRequest request) {
        byte[] pdf = goldenRulesPdfService.generatePdf(request);
        persist(request, TipoDocumentoGerado.VALE_GOLDEN_RULES, pdf,
                "regras-ouro-vale-" + slug(request.getEmployeeName()) + ".pdf");
        return pdfResponse(pdf, "regras-ouro-vale.pdf", false);
    }

    @PostMapping("/golden-rules/preview-pdf")
    @Operation(summary = "Preview PDF Regras de Ouro da Vale")
    public ResponseEntity<byte[]> previewGoldenRules(@RequestBody ValeSafetyTermRequest request) {
        return pdfResponse(goldenRulesPdfService.generatePdf(request), "regras-ouro-vale.pdf", true);
    }

    @PostMapping("/toxicological/generate-pdf")
    @Operation(summary = "Gerar PDF Autorização Toxicológica")
    public ResponseEntity<byte[]> generateToxicological(@RequestBody ValeSafetyTermRequest request) {
        byte[] pdf = toxicologicalPdfService.generatePdf(request);
        persist(request, TipoDocumentoGerado.TOXICOLOGICAL_TEST_AUTH, pdf,
                "autorizacao-toxicologico-" + slug(request.getEmployeeName()) + ".pdf");
        return pdfResponse(pdf, "autorizacao-toxicologico.pdf", false);
    }

    @PostMapping("/toxicological/preview-pdf")
    @Operation(summary = "Preview PDF Autorização Toxicológica")
    public ResponseEntity<byte[]> previewToxicological(@RequestBody ValeSafetyTermRequest request) {
        return pdfResponse(toxicologicalPdfService.generatePdf(request), "autorizacao-toxicologico.pdf", true);
    }

    private void persist(ValeSafetyTermRequest request, TipoDocumentoGerado tipo, byte[] pdf, String filename) {
        Map<String, Object> dados = new LinkedHashMap<>();
        if (request.getEmployeeName() != null) dados.put("employeeName", request.getEmployeeName());
        if (request.getEmployeeRg() != null) dados.put("employeeRg", request.getEmployeeRg());
        if (request.getCompanyName() != null) dados.put("companyName", request.getCompanyName());
        if (request.getDocumentDate() != null) dados.put("documentDate", request.getDocumentDate().toString());
        try {
            persistenceService.persistir(request.getEmployeeId(), tipo, pdf, filename, dados);
        } catch (Exception e) {
            log.warn("Falha ao persistir {}: {}", tipo, e.getMessage());
        }
    }

    private static ResponseEntity<byte[]> pdfResponse(byte[] pdf, String filename, boolean inline) {
        String disposition = (inline ? "inline" : "attachment") + "; filename=\"" + filename + "\"";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .body(pdf);
    }

    private static String slug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
    }
}
