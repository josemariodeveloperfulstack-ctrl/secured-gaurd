package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.enums.ReportGroupBy;
import com.z7design.secured_guard.model.enums.ReportOrderBy;
import com.z7design.secured_guard.service.EmployeeReportPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/employees/report")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Relatório de Funcionários", description = "Geração de PDF com layout padrão (mesmo do Relatório de Veículos)")
@CrossOrigin(origins = "*")
public class EmployeeReportController {

    private final EmployeeReportPdfService employeeReportPdfService;
    private static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    @Data
    @NoArgsConstructor
    public static class EmployeeReportPdfRequest {
        private UUID companyId;
        private List<UUID> employeeIds;
        private List<String> columns; // Colunas customizadas para o relatório (ex: name, registrationNumber, status, ...)
        private ReportGroupBy groupBy; // Agrupar por FUNCIONARIO ou POSTO_TRABALHO
        private ReportOrderBy orderBy; // Ordenação primária: FUNCIONARIO ou POSTO_TRABALHO (alfabética)
        /** Resumo dos filtros aplicados (período, status, empresa, etc.) exibido no PDF */
        private String filterSummary;
    }

    @PostMapping("/pdf")
    @Operation(summary = "Gerar PDF do relatório de funcionários", description = "Gera PDF personalizado. companyId opcional; employeeIds opcional; columns opcional (lista de colunas a exibir).")
    public ResponseEntity<?> generateEmployeeReportPdf(@RequestBody EmployeeReportPdfRequest request) {
        try {
            if (request == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Corpo da requisição inválido");
                return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON).body(error);
            }

            byte[] pdfBytes = employeeReportPdfService.generateEmployeeReportPDF(
                    request.getCompanyId(),
                    request.getEmployeeIds(),
                    request.getColumns(),
                    request.getGroupBy(),
                    request.getOrderBy(),
                    request.getFilterSummary());

            if (pdfBytes == null || pdfBytes.length == 0) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Relatório PDF gerado está vazio");
                return ResponseEntity.internalServerError().contentType(MediaType.APPLICATION_JSON).body(error);
            }

            String filename = "relatorio_funcionarios_" + LocalDateTime.now().format(TIMESTAMP) + ".pdf";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(pdfBytes.length);

            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de funcionários", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erro ao gerar relatório PDF");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().contentType(MediaType.APPLICATION_JSON).body(error);
        }
    }
}
