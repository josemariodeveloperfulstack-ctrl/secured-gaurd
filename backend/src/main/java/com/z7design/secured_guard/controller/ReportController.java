package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Relatórios", description = "Endpoints para geração de relatórios")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/employees/pdf")
    @Operation(summary = "Gerar relatório de funcionários em PDF", description = "Gera relatório completo de funcionários em formato PDF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateEmployeeReportPdf(@RequestParam Map<String, Object> filters) {
        try {
            log.info("Gerando relatório de funcionários em PDF");
            byte[] reportBytes = reportService.generateEmployeeReportPdf(filters);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "relatorio_funcionarios.pdf");
            
            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de funcionários", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/employees/excel")
    @Operation(summary = "Gerar relatório de funcionários em Excel", description = "Gera relatório completo de funcionários em formato Excel")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateEmployeeReportExcel(@RequestParam Map<String, Object> filters) {
        try {
            log.info("Gerando relatório de funcionários em Excel");
            byte[] reportBytes = reportService.generateEmployeeReportExcel(filters);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "relatorio_funcionarios.xlsx");
            
            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de funcionários", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/companies/pdf")
    @Operation(summary = "Gerar relatório de empresas em PDF", description = "Gera relatório completo de empresas em formato PDF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateCompanyReportPdf(@RequestParam Map<String, Object> filters) {
        try {
            log.info("Gerando relatório de empresas em PDF");
            byte[] reportBytes = reportService.generateCompanyReportPdf(filters);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "relatorio_empresas.pdf");
            
            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de empresas", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/products/pdf")
    @Operation(summary = "Gerar relatório de produtos em PDF", description = "Gera relatório completo de produtos em formato PDF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateProductReportPdf(@RequestParam Map<String, Object> filters) {
        try {
            log.info("Gerando relatório de produtos em PDF");
            byte[] reportBytes = reportService.generateProductReportPdf(filters);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "relatorio_produtos.pdf");
            
            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de produtos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/inventory/pdf")
    @Operation(summary = "Gerar relatório de estoque em PDF", description = "Gera relatório completo de estoque em formato PDF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateInventoryReportPdf(@RequestParam Map<String, Object> filters) {
        try {
            log.info("Gerando relatório de estoque em PDF");
            byte[] reportBytes = reportService.generateInventoryReportPdf(filters);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "relatorio_estoque.pdf");
            
            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de estoque", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/financial/pdf")
    @Operation(summary = "Gerar relatório financeiro em PDF", description = "Gera relatório financeiro em formato PDF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateFinancialReportPdf(@RequestParam Map<String, Object> filters) {
        try {
            log.info("Gerando relatório financeiro em PDF");
            byte[] reportBytes = reportService.generateFinancialReportPdf(filters);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "relatorio_financeiro.pdf");
            
            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório financeiro", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/consolidated/pdf")
    @Operation(summary = "Gerar relatório consolidado em PDF", description = "Gera relatório consolidado do sistema em formato PDF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateConsolidatedReportPdf(@RequestParam Map<String, Object> filters) {
        try {
            log.info("Gerando relatório consolidado em PDF");
            byte[] reportBytes = reportService.generateConsolidatedReportPdf(filters);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "relatorio_consolidado.pdf");
            
            return new ResponseEntity<>(reportBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório consolidado", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 