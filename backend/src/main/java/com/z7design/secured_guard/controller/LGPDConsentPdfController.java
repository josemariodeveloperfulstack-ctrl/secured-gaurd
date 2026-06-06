package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.LGPDConsentRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.LGPDConsentStandardPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/lgpd-consent")
@Tag(name = "LGPD Consent PDF", description = "Geração de Termo de Consentimento LGPD com layout padronizado")
@CrossOrigin(origins = "*")
public class LGPDConsentPdfController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LGPDConsentPdfController.class);
    private final LGPDConsentStandardPdfService lgpdConsentPdfService;
    private final DocumentoGeradoPersistenceService persistenceService;

    public LGPDConsentPdfController(LGPDConsentStandardPdfService lgpdConsentPdfService,
                                    DocumentoGeradoPersistenceService persistenceService) {
        this.lgpdConsentPdfService = lgpdConsentPdfService;
        this.persistenceService = persistenceService;
    }

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Termo LGPD")
    public ResponseEntity<byte[]> generatePdf(@RequestBody LGPDConsentRequest request) throws IOException {
        log.info("📄 PDF LGPD - Employee: {}, Company: {}", request.getEmployeeId(), request.getCompanyId());

        byte[] pdfBytes = lgpdConsentPdfService.generatePdf(request);
        String filename = "termo-lgpd-" + LocalDate.now() + ".pdf";

        Map<String, Object> dados = new LinkedHashMap<>();
        if (request.getConsentDate() != null) dados.put("consentDate", request.getConsentDate().toString());

        persistenceService.persistir(
                request.getEmployeeId(),
                TipoDocumentoGerado.LGPD_CONSENT,
                pdfBytes,
                filename,
                dados);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Termo LGPD")
    public ResponseEntity<byte[]> previewPdf(@RequestBody LGPDConsentRequest request) throws IOException {
        byte[] pdfBytes = lgpdConsentPdfService.generatePdf(request);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"termo-lgpd-preview.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/generate-excel")
    @Operation(summary = "Gerar Excel do Termo LGPD")
    public ResponseEntity<byte[]> generateExcel(@RequestBody LGPDConsentRequest request) throws IOException {
        byte[] excelBytes = lgpdConsentPdfService.generateExcel(request);
        String filename = "termo-lgpd-" + LocalDate.now() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }
}
