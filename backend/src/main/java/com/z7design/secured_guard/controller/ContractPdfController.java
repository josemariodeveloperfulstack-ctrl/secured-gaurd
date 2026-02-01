package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ClientContractRequest;
import com.z7design.secured_guard.service.ClientContractStandardPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Contratos em PDF", description = "API para geração de contratos de clientes com layout padrão")
public class ContractPdfController {

    private final ClientContractStandardPdfService contractPdfService;

    @PostMapping("/pdf")
    @Operation(summary = "Gerar contrato de cliente em PDF", description = "Gera um contrato personalizado com o layout padrão da empresa")
    public ResponseEntity<ByteArrayResource> generatePdf(@RequestBody ClientContractRequest request) {
        log.info("Gerando PDF de contrato para o cliente: {}", request.getClientName());
        try {
            byte[] pdfBytes = contractPdfService.generatePdf(request);
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment;filename=contrato_" + request.getContractNumber() + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do contrato: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
