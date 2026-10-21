package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.FeriasReportDTO;
import com.z7design.secured_guard.service.FeriasReportService;
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

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports/ferias")
@Slf4j
@Tag(name = "Relatórios de Férias", description = "Endpoints para geração de relatórios de férias e afastamentos")
public class FeriasReportController {

    private final FeriasReportService feriasReportService;

    public FeriasReportController(FeriasReportService feriasReportService) {
        this.feriasReportService = feriasReportService;
    }

    @GetMapping("/stats")
    @Operation(summary = "Estatísticas gerais", description = "Retorna estatísticas gerais de férias e afastamentos")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<Map<String, Object>> getStats() {
        try {
            log.info("Gerando estatísticas de férias e afastamentos");
            Map<String, Object> stats = feriasReportService.getStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stats/ferias")
    @Operation(summary = "Estatísticas de férias", description = "Retorna estatísticas específicas de férias")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<Map<String, Object>> getFeriasStats() {
        try {
            log.info("Gerando estatísticas de férias");
            Map<String, Object> stats = feriasReportService.getFeriasStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas de férias", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stats/afastamentos")
    @Operation(summary = "Estatísticas de afastamentos", description = "Retorna estatísticas específicas de afastamentos")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<Map<String, Object>> getAfastamentosStats() {
        try {
            log.info("Gerando estatísticas de afastamentos");
            Map<String, Object> stats = feriasReportService.getAfastamentosStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas de afastamentos", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stats/experiencia")
    @Operation(summary = "Estatísticas de período de experiência", description = "Retorna estatísticas específicas de período de experiência")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<Map<String, Object>> getExperienciaStats() {
        try {
            log.info("Gerando estatísticas de período de experiência");
            Map<String, Object> stats = feriasReportService.getExperienciaStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas de experiência", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/ferias/excel")
    @Operation(summary = "Relatório de férias em Excel", description = "Gera relatório detalhado de férias em Excel")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<ByteArrayResource> generateFeriasExcelReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String empresa) {

        try {
            log.info("Gerando relatório Excel de férias");

            FeriasReportDTO filters = FeriasReportDTO.builder()
                    .employeeId(employeeId)
                    .status(status)
                    .tipo(tipo)
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .empresa(empresa)
                    .build();

            byte[] excelBytes = feriasReportService.generateFeriasExcelReport(filters);
            ByteArrayResource resource = new ByteArrayResource(excelBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=relatorio_ferias.xlsx")
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório Excel de férias: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/afastamentos/excel")
    @Operation(summary = "Relatório de afastamentos em Excel", description = "Gera relatório detalhado de afastamentos em Excel")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<ByteArrayResource> generateAfastamentosExcelReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String empresa) {

        try {
            log.info("Gerando relatório Excel de afastamentos");

            FeriasReportDTO filters = FeriasReportDTO.builder()
                    .employeeId(employeeId)
                    .status(status)
                    .tipo(tipo)
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .empresa(empresa)
                    .build();

            byte[] excelBytes = feriasReportService.generateAfastamentosExcelReport(filters);
            ByteArrayResource resource = new ByteArrayResource(excelBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=relatorio_afastamentos.xlsx")
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório Excel de afastamentos: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/consolidado/excel")
    @Operation(summary = "Relatório consolidado em Excel", description = "Gera relatório consolidado de férias e afastamentos em Excel")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<ByteArrayResource> generateConsolidadoExcelReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String empresa) {

        try {
            log.info("Gerando relatório Excel consolidado");

            FeriasReportDTO filters = FeriasReportDTO.builder()
                    .employeeId(employeeId)
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .empresa(empresa)
                    .build();

            byte[] excelBytes = feriasReportService.generateConsolidadoExcelReport(filters);
            ByteArrayResource resource = new ByteArrayResource(excelBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment;filename=relatorio_consolidado_ferias_afastamentos.xlsx")
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório Excel consolidado: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/ferias/pdf")
    @Operation(summary = "Relatório de férias em PDF", description = "Gera relatório detalhado de férias em PDF")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<byte[]> generateFeriasPDFReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String empresa) {

        try {
            log.info("Gerando relatório PDF de férias");

            FeriasReportDTO filters = FeriasReportDTO.builder()
                    .employeeId(employeeId)
                    .status(status)
                    .tipo(tipo)
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .empresa(empresa)
                    .build();

            byte[] pdfBytes = feriasReportService.generateFeriasPDFReport(filters);
            String fileName = "relatorio_ferias_" + java.time.LocalDate.now().toString() + ".pdf";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de férias: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/afastamentos/pdf")
    @Operation(summary = "Relatório de afastamentos em PDF", description = "Gera relatório detalhado de afastamentos em PDF")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<byte[]> generateAfastamentosPDFReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String empresa) {

        try {
            log.info("Gerando relatório PDF de afastamentos");

            FeriasReportDTO filters = FeriasReportDTO.builder()
                    .employeeId(employeeId)
                    .status(status)
                    .tipo(tipo)
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .empresa(empresa)
                    .build();

            byte[] pdfBytes = feriasReportService.generateAfastamentosPDFReport(filters);
            String fileName = "relatorio_afastamentos_" + java.time.LocalDate.now().toString() + ".pdf";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de afastamentos: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/experiencia/excel")
    @Operation(summary = "Relatório de período de experiência em Excel", description = "Gera relatório detalhado de período de experiência em Excel")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<ByteArrayResource> generateExperienciaExcelReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String empresa) {

        try {
            log.info("Gerando relatório Excel de período de experiência");

            FeriasReportDTO filters = FeriasReportDTO.builder()
                    .employeeId(employeeId)
                    .status(status)
                    .tipo(tipo)
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .empresa(empresa)
                    .build();

            byte[] excelBytes = feriasReportService.generateExperienciaExcelReport(filters);
            ByteArrayResource resource = new ByteArrayResource(excelBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=relatorio_experiencia.xlsx")
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(excelBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório Excel de período de experiência: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/experiencia/pdf")
    @Operation(summary = "Relatório de período de experiência em PDF", description = "Gera relatório detalhado de período de experiência em PDF")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<byte[]> generateExperienciaPDFReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) LocalDate dataInicio,
            @RequestParam(required = false) LocalDate dataFim,
            @RequestParam(required = false) String empresa) {

        try {
            log.info("Gerando relatório PDF de período de experiência");

            FeriasReportDTO filters = FeriasReportDTO.builder()
                    .employeeId(employeeId)
                    .status(status)
                    .tipo(tipo)
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .empresa(empresa)
                    .build();

            byte[] pdfBytes = feriasReportService.generateExperienciaPDFReport(filters);
            String fileName = "relatorio_experiencia_" + java.time.LocalDate.now().toString() + ".pdf";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de experiência: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/custom")
    @Operation(summary = "Relatório personalizado executivo", description = "Gera relatório customizado de férias, afastamentos ou experiência em PDF ou Excel")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH')")
    public ResponseEntity<byte[]> generateCustomReport(@RequestBody FeriasReportDTO request) {
        try {
            log.info("Gerando relatório personalizado: tipo={}, formato={}, colunas={}",
                    request.getReportType(), request.getFormato(), request.getSelectedColumns());

            boolean isPdf = "PDF".equalsIgnoreCase(request.getFormato());
            byte[] bytes;
            String fileName;
            MediaType mediaType;

            String typePrefix = request.getReportType() != null ? request.getReportType().toLowerCase() : "ferias";

            if (isPdf) {
                bytes = feriasReportService.generateCustomFeriasPDFReport(request);
                fileName = "relatorio_" + typePrefix + "_" + LocalDate.now() + ".pdf";
                mediaType = MediaType.APPLICATION_PDF;
            } else {
                bytes = feriasReportService.generateCustomFeriasExcelReport(request);
                fileName = "relatorio_" + typePrefix + "_" + LocalDate.now() + ".xlsx";
                mediaType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(mediaType)
                    .body(bytes);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório customizado de férias: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
