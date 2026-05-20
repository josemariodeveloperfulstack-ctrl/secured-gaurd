package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EmploymentContractRequest;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.EmploymentContractStandardPdfService;
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
@RequestMapping("/api/employment-contract")
@RequiredArgsConstructor
@Tag(name = "Documentos - Contrato de Trabalho", description = "Geração de Contrato de Trabalho")
public class EmploymentContractController {

    private final EmploymentContractStandardPdfService contractService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Contrato de Trabalho")
    public ResponseEntity<byte[]> generatePdf(@RequestBody EmploymentContractRequest request) {
        byte[] pdfBytes = contractService.generatePdf(request);

        // Persistir documento gerado para download posterior por RH e Colaborador.
        // Best-effort: falhas não interrompem a entrega do PDF ao usuário.
        persistenceService.persistir(
                request.getEmployeeId(),
                TipoDocumentoGerado.EMPLOYMENT_CONTRACT,
                pdfBytes,
                buildContractFileName(request),
                buildContractDados(request));

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"contrato-trabalho.pdf\"")
                .body(pdfBytes);
    }

    private String buildContractFileName(EmploymentContractRequest request) {
        String slug = "contrato-trabalho";
        if (request.getEmployeeName() != null && !request.getEmployeeName().isBlank()) {
            slug = slug + "-" + request.getEmployeeName().trim().toLowerCase().replaceAll("\\s+", "-");
        }
        return slug + ".pdf";
    }

    private Map<String, Object> buildContractDados(EmploymentContractRequest request) {
        Map<String, Object> dados = new LinkedHashMap<>();
        if (request.getPosition() != null) dados.put("position", request.getPosition());
        if (request.getDepartment() != null) dados.put("department", request.getDepartment());
        if (request.getSalary() != null) dados.put("salary", request.getSalary());
        if (request.getAdmissionDate() != null) dados.put("admissionDate", request.getAdmissionDate().toString());
        if (request.getContractKind() != null) dados.put("contractKind", request.getContractKind());
        if (request.getExperienceDurationDays() != null) dados.put("experienceDurationDays", request.getExperienceDurationDays());
        return dados;
    }

    @PostMapping("/preview-pdf")
    @Operation(summary = "Visualizar PDF do Contrato de Trabalho")
    public ResponseEntity<byte[]> previewPdf(@RequestBody EmploymentContractRequest request) {
        byte[] pdfBytes = contractService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"contrato-trabalho.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/generate-excel")
    @Operation(summary = "Gerar Excel do Contrato de Trabalho")
    public ResponseEntity<byte[]> generateExcel(@RequestBody EmploymentContractRequest request) {
        byte[] excelBytes = contractService.generateExcel(request);

        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"contrato-trabalho.xlsx\"")
                .body(excelBytes);
    }
}
