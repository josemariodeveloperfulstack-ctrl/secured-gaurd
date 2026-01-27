package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EmploymentContractRequest;
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

@RestController
@RequestMapping("/api/employment-contract")
@RequiredArgsConstructor
@Tag(name = "Documentos - Contrato de Trabalho", description = "Geração de Contrato de Trabalho")
public class EmploymentContractController {

    private final EmploymentContractStandardPdfService contractService;

    @PostMapping("/generate-pdf")
    @Operation(summary = "Gerar PDF do Contrato de Trabalho")
    public ResponseEntity<byte[]> generatePdf(@RequestBody EmploymentContractRequest request) {
        byte[] pdfBytes = contractService.generatePdf(request);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"contrato-trabalho.pdf\"")
                .body(pdfBytes);
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
