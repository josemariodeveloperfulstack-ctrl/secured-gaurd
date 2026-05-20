package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.NppsStandardPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/npps")
@CrossOrigin(origins = "*")
@Tag(name = "NPPS PDF", description = "Geração do documento NPPS com layout padronizado")
@RequiredArgsConstructor
@Slf4j
public class NppsPdfController {

    private final NppsStandardPdfService nppsStandardPdfService;
    private final DocumentoGeradoPersistenceService persistenceService;

    public record NppsRequest(UUID companyId, UUID employeeId, String employeeName, String employeeCpf) {
    }


    @Operation(summary = "Gerar PDF do NPPS para download")
    @PostMapping(value = "/generate-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generatePdf(@RequestBody(required = false) NppsRequest request) throws IOException {
        try {
            UUID companyId = request != null ? request.companyId() : null;
            UUID employeeId = request != null ? request.employeeId() : null;
            String employeeName = request != null ? request.employeeName() : null;
            String employeeCpf = request != null ? request.employeeCpf() : null;
            byte[] pdf = nppsStandardPdfService.generatePdf(companyId, employeeName, employeeCpf);

            Map<String, Object> dados = new LinkedHashMap<>();
            if (employeeName != null) dados.put("employeeName", employeeName);
            if (employeeCpf != null) dados.put("employeeCpf", employeeCpf);

            persistenceService.persistir(
                    employeeId,
                    TipoDocumentoGerado.NPPS,
                    pdf,
                    "npps-" + safeSlug(employeeName) + ".pdf",
                    dados);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"NPPS-Norma-e-Procedimento-do-Posto-de-Servico.pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do NPPS", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private static String safeSlug(String value) {
        if (value == null || value.isBlank()) return "documento";
        return value.trim().toLowerCase().replaceAll("\\s+", "-");
    }

    @Operation(summary = "Visualizar PDF do NPPS em tela")
    @PostMapping(value = "/preview-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> previewPdf(@RequestBody(required = false) NppsRequest request) throws IOException {
        try {
            UUID companyId = request != null ? request.companyId() : null;
            String employeeName = request != null ? request.employeeName() : null;
            String employeeCpf = request != null ? request.employeeCpf() : null;
            byte[] pdf = nppsStandardPdfService.generatePdf(companyId, employeeName, employeeCpf);


            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"NPPS-Norma-e-Procedimento-do-Posto-de-Servico.pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do NPPS (preview)", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

