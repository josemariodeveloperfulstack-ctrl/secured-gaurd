package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;
import com.z7design.secured_guard.service.ContasAPagarReportService;
import com.z7design.secured_guard.service.ReportTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Relatórios", description = "Endpoints para geração de relatórios")
public class ReportController {

    private final ContasAPagarReportService contasAPagarReportService;
    private final ReportTemplateService reportTemplateService;
    private final com.z7design.secured_guard.service.ReportService reportService;
    private final com.z7design.secured_guard.service.EmailService emailService;
    private final com.z7design.secured_guard.service.PaymentReportService paymentReportService;
    @Value("${accounting.email:contabilidade@empresa.com}")
    private String defaultAccountingEmail;

    @GetMapping("/contas-a-pagar")
    @Operation(summary = "Relatório de Contas a Pagar por Período", description = "Gera relatório de contas a pagar para um período específico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Parâmetros inválidos"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<?> generateContasAPagarReport(
            @Parameter(description = "Data de início do período") @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Data de fim do período") @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Formato de resposta: html ou pdf") @RequestParam(value = "format", defaultValue = "html") String format) {

        try {
            log.info("Gerando relatório de contas a pagar para período: {} a {}, formato: {}", startDate, endDate,
                    format);

            HttpHeaders headers = new HttpHeaders();

            if ("pdf".equalsIgnoreCase(format)) {
                // Usar novo método PDF com layout padrão
                byte[] pdfBytes = contasAPagarReportService.generateContasAPagarReportPDF(startDate, endDate, null,
                        null);
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment",
                        "relatorio-contas-a-pagar-" + startDate + "-" + endDate + ".pdf");
                headers.setContentLength(pdfBytes.length);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(pdfBytes);
            } else {
                // Formato HTML (padrão)
                String report = contasAPagarReportService.generateContasAPagarReport(startDate, endDate);
                headers.setContentType(MediaType.TEXT_HTML);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(report);
            }

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de contas a pagar: {}", e.getMessage(), e);
            if ("pdf".equalsIgnoreCase(format)) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(("Erro ao gerar relatório: " + e.getMessage()).getBytes());
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Erro ao gerar relatório: " + e.getMessage());
            }
        }
    }

    @GetMapping("/contas-a-pagar/pdf")
    @Operation(summary = "Relatório de Contas a Pagar em PDF (Alias)", description = "Gera relatório de contas a pagar diretamente em PDF")
    public ResponseEntity<byte[]> generateContasAPagarReportPdfAlias(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            byte[] pdfBytes = contasAPagarReportService.generateContasAPagarReportPDF(startDate, endDate, null, null);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-contas-a-pagar.pdf")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de contas a pagar (alias): {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/payroll/pdf")
    @Operation(summary = "Relatório PDF da Folha de Pagamento", description = "Gera relatório PDF para envio à contabilidade.")
    public ResponseEntity<byte[]> generatePayrollPdf(
            @RequestParam(value = "referenceMonth", required = false) String referenceMonth,
            @RequestParam(value = "unitId", required = false) java.util.UUID unitId,
            @RequestParam(value = "employeeId", required = false) java.util.UUID employeeId) {
        try {
            byte[] pdf = reportService.generatePayrollReportPdf(referenceMonth, unitId, employeeId);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/pdf")
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=relatorio-folha.pdf")
                    .body(pdf);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/payroll/send-email")
    @Operation(summary = "Enviar relatório de folha em PDF por email", description = "Gera o PDF e envia para a contabilidade.")
    public ResponseEntity<Void> sendPayrollPdfByEmail(
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "referenceMonth", required = false) String referenceMonth,
            @RequestParam(value = "unitId", required = false) java.util.UUID unitId,
            @RequestParam(value = "employeeId", required = false) java.util.UUID employeeId) {
        try {
            byte[] pdf = reportService.generatePayrollReportPdf(referenceMonth, unitId, employeeId);
            String subject = "Relatório de Folha - " + (referenceMonth != null ? referenceMonth : "Período");
            String body = "<p>Segue em anexo o relatório de folha de pagamento."
                    + (referenceMonth != null ? (" Competência: <strong>" + referenceMonth + "</strong>.") : "")
                    + "</p>";
            String toEmail = (to != null && !to.isBlank()) ? to : defaultAccountingEmail;
            boolean ok = emailService.sendEmailWithAttachment(toEmail, subject, body, pdf, "relatorio-folha.pdf");
            if (ok)
                return ResponseEntity.ok().build();
            return ResponseEntity.status(500).build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/employees/pdf")
    @Operation(summary = "Relatório PDF de Funcionários", description = "Gera relatório PDF com a lista de funcionários")
    public ResponseEntity<byte[]> generateEmployeesReportPdf() {
        try {
            byte[] pdf = reportService.generateEmployeeReportPdf(Map.of());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-funcionarios.pdf")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de funcionários em PDF: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/contas-a-pagar/status/{status}")
    @Operation(summary = "Relatório de Contas a Pagar por Status", description = "Gera relatório de contas a pagar filtrado por status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Status inválido"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<?> generateContasAPagarReportByStatus(
            @Parameter(description = "Status das contas") @PathVariable String status,
            @Parameter(description = "Formato de resposta: html ou pdf") @RequestParam(value = "format", defaultValue = "html") String format) {

        try {
            // Mapear status amigável (do frontend) para o enum do backend
            ExpenseStatus backendStatus;
            if ("ABERTA".equalsIgnoreCase(status) || "PENDENTE".equalsIgnoreCase(status)) {
                backendStatus = ExpenseStatus.PENDENTE;
            } else {
                backendStatus = ExpenseStatus.valueOf(status.toUpperCase());
            }

            log.info("Gerando relatório de contas a pagar por status: {}, formato: {}", backendStatus, format);

            HttpHeaders headers = new HttpHeaders();

            if ("pdf".equalsIgnoreCase(format)) {
                // Usar novo método PDF com layout padrão
                byte[] pdfBytes = contasAPagarReportService.generateContasAPagarReportPDFByStatus(backendStatus);
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment",
                        "relatorio-contas-" + backendStatus.name().toLowerCase() + ".pdf");
                headers.setContentLength(pdfBytes.length);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(pdfBytes);
            } else {
                // Formato HTML (padrão)
                String report = contasAPagarReportService.generateContasAPagarReportByStatus(backendStatus);
                headers.setContentType(MediaType.TEXT_HTML);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(report);
            }

        } catch (Exception e) {
            log.error("Erro ao gerar relatório por status: {}", e.getMessage(), e);
            if ("pdf".equalsIgnoreCase(format)) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(("Erro ao gerar relatório: " + e.getMessage()).getBytes());
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Erro ao gerar relatório: " + e.getMessage());
            }
        }
    }

    @GetMapping("/contas-a-pagar/tipo/{type}")
    @Operation(summary = "Relatório de Contas a Pagar por Tipo", description = "Gera relatório de contas a pagar filtrado por tipo")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Tipo inválido"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<?> generateContasAPagarReportByType(
            @Parameter(description = "Tipo das contas") @PathVariable ExpenseType type,
            @Parameter(description = "Formato de resposta: html ou pdf") @RequestParam(value = "format", defaultValue = "html") String format) {

        try {
            log.info("Gerando relatório de contas a pagar por tipo: {}, formato: {}", type, format);

            HttpHeaders headers = new HttpHeaders();

            if ("pdf".equalsIgnoreCase(format)) {
                // Usar novo método PDF com layout padrão
                byte[] pdfBytes = contasAPagarReportService.generateContasAPagarReportPDFByType(type);
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment",
                        "relatorio-contas-" + type.name().toLowerCase() + ".pdf");
                headers.setContentLength(pdfBytes.length);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(pdfBytes);
            } else {
                // Formato HTML (padrão)
                String report = contasAPagarReportService.generateContasAPagarReportByType(type);
                headers.setContentType(MediaType.TEXT_HTML);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(report);
            }

        } catch (Exception e) {
            log.error("Erro ao gerar relatório por tipo: {}", e.getMessage(), e);
            if ("pdf".equalsIgnoreCase(format)) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(("Erro ao gerar relatório: " + e.getMessage()).getBytes());
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Erro ao gerar relatório: " + e.getMessage());
            }
        }
    }

    @GetMapping("/contas-a-pagar/resumo")
    @Operation(summary = "Relatório Resumido de Contas a Pagar", description = "Gera relatório resumido com todas as contas a pagar")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<?> generateContasAPagarSummaryReport(
            @Parameter(description = "Formato de resposta: html ou pdf") @RequestParam(value = "format", defaultValue = "html") String format) {

        try {
            log.info("Gerando relatório resumido de contas a pagar, formato: {}", format);

            HttpHeaders headers = new HttpHeaders();

            if ("pdf".equalsIgnoreCase(format)) {
                // Usar novo método PDF com layout padrão
                byte[] pdfBytes = contasAPagarReportService.generateContasAPagarSummaryReportPDF();
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment",
                        "relatorio-resumo-contas-a-pagar.pdf");
                headers.setContentLength(pdfBytes.length);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(pdfBytes);
            } else {
                // Formato HTML (padrão)
                String report = contasAPagarReportService.generateContasAPagarSummaryReport();
                headers.setContentType(MediaType.TEXT_HTML);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(report);
            }

        } catch (Exception e) {
            log.error("Erro ao gerar relatório resumido: {}", e.getMessage(), e);
            if ("pdf".equalsIgnoreCase(format)) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(("Erro ao gerar relatório: " + e.getMessage()).getBytes());
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Erro ao gerar relatório: " + e.getMessage());
            }
        }
    }

    @GetMapping("/contas-a-pagar/empresa/{companySigla}")
    @Operation(summary = "Relatório de Contas a Pagar por Empresa", description = "Gera relatório de contas a pagar filtrado por empresa (sigla)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Parâmetros inválidos"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<?> generateContasAPagarReportByCompany(
            @Parameter(description = "Sigla da empresa") @PathVariable String companySigla,
            @Parameter(description = "Data de início do período") @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Data de fim do período") @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @Parameter(description = "Formato de resposta: html ou pdf") @RequestParam(value = "format", defaultValue = "pdf") String format) {

        try {
            log.info("Gerando relatório de contas a pagar por empresa: {}, formato: {}", companySigla, format);

            HttpHeaders headers = new HttpHeaders();

            if ("pdf".equalsIgnoreCase(format)) {
                // Usar método PDF com layout padrão
                byte[] pdfBytes = contasAPagarReportService.generateContasAPagarReportPDFByCompany(
                        companySigla, startDate, endDate);
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDispositionFormData("attachment",
                        "relatorio-contas-a-pagar-empresa-" + companySigla + ".pdf");
                headers.setContentLength(pdfBytes.length);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(pdfBytes);
            } else {
                // Formato HTML (fallback - usar método existente)
                String report = contasAPagarReportService.generateContasAPagarReport(
                        startDate != null ? startDate : LocalDate.now().minusMonths(1),
                        endDate != null ? endDate : LocalDate.now());
                headers.setContentType(MediaType.TEXT_HTML);
                return ResponseEntity.ok()
                        .headers(headers)
                        .body(report);
            }

        } catch (Exception e) {
            log.error("Erro ao gerar relatório por empresa: {}", e.getMessage(), e);
            if ("pdf".equalsIgnoreCase(format)) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(("Erro ao gerar relatório: " + e.getMessage()).getBytes());
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Erro ao gerar relatório: " + e.getMessage());
            }
        }
    }

    @GetMapping("/company-data")
    @Operation(summary = "Dados da Empresa", description = "Retorna os dados da empresa para uso em relatórios")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Dados retornados com sucesso")
    })
    public ResponseEntity<Map<String, String>> getCompanyData() {
        try {
            Map<String, String> companyData = reportTemplateService.getCompanyData();
            return ResponseEntity.ok(companyData);
        } catch (Exception e) {
            log.error("Erro ao obter dados da empresa: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/template/{templateName}")
    @Operation(summary = "Obter Template", description = "Retorna um template específico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Template retornado com sucesso"),
            @ApiResponse(responseCode = "404", description = "Template não encontrado")
    })
    public ResponseEntity<String> getTemplate(
            @Parameter(description = "Nome do template") @PathVariable String templateName) {

        try {
            String template = reportTemplateService.loadTemplate(templateName);
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(template);
        } catch (Exception e) {
            log.error("Erro ao obter template {}: {}", templateName, e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/companies/pdf")
    @Operation(summary = "Relatório de Empresas em PDF", description = "Gera relatório PDF com todas as empresas cadastradas")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<byte[]> generateCompaniesReportPdf() {
        try {
            log.info("Gerando relatório de empresas em PDF");
            byte[] pdf = reportService.generateCompanyReportPdf(Map.of());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-empresas.pdf")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de empresas em PDF: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/products/pdf")
    @Operation(summary = "Relatório de Produtos em PDF", description = "Gera relatório PDF com todos os produtos cadastrados")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<byte[]> generateProductsReportPdf() {
        try {
            log.info("Gerando relatório de produtos em PDF");
            byte[] pdf = reportService.generateProductReportPdf(Map.of());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-produtos.pdf")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de produtos em PDF: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/inventory/pdf")
    @Operation(summary = "Relatório de Estoque em PDF", description = "Gera relatório PDF com a situação atual do estoque")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<byte[]> generateInventoryReportPdf() {
        try {
            log.info("Gerando relatório de estoque em PDF");
            byte[] pdf = reportService.generateInventoryReportPdf(Map.of());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-estoque.pdf")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de estoque em PDF: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/consolidated/pdf")
    @Operation(summary = "Relatório Consolidado em PDF", description = "Gera relatório PDF consolidado com dados de funcionários, empresas, produtos, estoque e transações financeiras")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<byte[]> generateConsolidatedReportPdf() {
        try {
            log.info("Gerando relatório consolidado em PDF");
            byte[] pdf = reportService.generateConsolidatedReportPdf(Map.of());
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-consolidado.pdf")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório consolidado em PDF: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/accounts-receivable/pdf")
    @Operation(summary = "Relatório de Contas a Receber em PDF", description = "Gera relatório PDF de contas a receber com filtros. Use segment=RECEBIDOS|A_VENCER|VENCIDOS|INADIMPLENCIA ou status legado (ex.: OVERDUE).")
    public ResponseEntity<byte[]> generateAccountsReceivableReportPdf(
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "client", required = false) String client,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "segment", required = false) String segment) {
        try {
            String effectiveSegment = (segment != null && !segment.isBlank()) ? segment : null;
            if (effectiveSegment == null && status != null && !status.isBlank()
                    && "OVERDUE".equalsIgnoreCase(status.trim())) {
                effectiveSegment = "INADIMPLENCIA";
            }
            byte[] pdf = paymentReportService.generateAccountsReceivableReportPDF(
                    startDate, endDate, client, status, null, null, null, null, null, null, effectiveSegment);
            String filename = accountsReceivablePdfFilename(effectiveSegment);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de contas a receber: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private static String accountsReceivablePdfFilename(String segmentRaw) {
        if (segmentRaw == null || segmentRaw.isBlank()) {
            return "relatorio-contas-a-receber.pdf";
        }
        String s = Normalizer.normalize(segmentRaw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(Locale.ROOT)
                .replace('-', '_');
        return switch (s) {
            case "INADIMPLENCIA" -> "relatorio-inadimplencia.pdf";
            case "RECEBIDOS" -> "relatorio-contas-recebidas.pdf";
            case "A_VENCER", "AVENCER" -> "relatorio-contas-a-vencer.pdf";
            case "VENCIDOS" -> "relatorio-contas-vencidas.pdf";
            default -> "relatorio-contas-a-receber.pdf";
        };
    }

    @GetMapping("/cash-flow/pdf")
    @Operation(summary = "Relatório de Fluxo de Caixa em PDF", description = "Gera relatório PDF de fluxo de caixa")
    public ResponseEntity<byte[]> generateCashFlowReportPdf(
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            byte[] pdf = reportService.generateFinancialReportPdf(Map.of(
                    "startDate", startDate != null ? startDate : LocalDate.now().minusMonths(1),
                    "endDate", endDate != null ? endDate : LocalDate.now()));
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=relatorio-fluxo-caixa.pdf")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de fluxo de caixa: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/financial/pdf")
    @Operation(summary = "Relatório Financeiro em PDF (Alias)", description = "Gera relatório financeiro em PDF")
    public ResponseEntity<byte[]> generateFinancialPdfAlias(
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return generateFinancialSummaryReportPdf(startDate, endDate);
    }

    @GetMapping("/summary/pdf")
    @Operation(summary = "Relatório Financeiro em PDF", description = "Gera relatório financeiro em PDF")
    public ResponseEntity<byte[]> generateFinancialSummaryReportPdf(
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            // Relatório financeiro geral servirá como resumo por enquanto
            byte[] pdf = reportService.generateFinancialReportPdf(Map.of(
                    "startDate", startDate != null ? startDate : LocalDate.now().minusMonths(1),
                    "endDate", endDate != null ? endDate : LocalDate.now()));
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=resumo-financeiro.pdf")
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar resumo financeiro: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}