package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ClientReportFilterDTO;
import com.z7design.secured_guard.service.ClientReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports/clients")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Relatórios de Clientes", description = "Endpoints para geração de relatórios de clientes")
public class ClientReportController {

    private final ClientReportService clientReportService;

    @PostMapping("/pdf")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Gerar relatório de clientes em PDF", description = "Gera um relatório detalhado de clientes em formato PDF com base nos filtros fornecidos.")
    public ResponseEntity<ByteArrayResource> generatePdfReport(@RequestBody ClientReportFilterDTO filters) {
        log.info("Gerando relatório PDF de clientes com filtros: {}", filters);
        try {
            byte[] pdfBytes = clientReportService.generateClientPdfReport(filters);
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=relatorio_clientes.pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de clientes: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/excel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    @Operation(summary = "Gerar relatório de clientes em Excel", description = "Gera um relatório detalhado de clientes em formato Excel com base nos filtros fornecidos.")
    public ResponseEntity<ByteArrayResource> generateExcelReport(@RequestBody ClientReportFilterDTO filters) {
        log.info("Gerando relatório Excel de clientes com filtros: {}", filters);
        try {
            byte[] excelBytes = clientReportService.generateClientExcelReport(filters);
            ByteArrayResource resource = new ByteArrayResource(excelBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=relatorio_clientes.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório Excel de clientes: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}