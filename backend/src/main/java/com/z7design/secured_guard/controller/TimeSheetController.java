package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.service.FolhaDePontoStandardPdfService;
import com.z7design.secured_guard.service.TimeSheetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/time-sheets")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Folha de Ponto", description = "Geração de folha de ponto em Excel e PDF para impressão")
public class TimeSheetController {

    private final TimeSheetService timeSheetService;
    private final FolhaDePontoStandardPdfService folhaDePontoStandardPdfService;

    @GetMapping("/{employeeId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Gerar folha de ponto mensal em Excel para um funcionário")
    public ResponseEntity<byte[]> generateTimeSheet(
            @PathVariable UUID employeeId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        try {
            LocalDate today = LocalDate.now();
            int resolvedYear = (year != null) ? year : today.getYear();
            int resolvedMonth = (month != null) ? month : today.getMonthValue();

            byte[] fileBytes = timeSheetService.generateMonthlyTimeSheet(employeeId, resolvedYear, resolvedMonth);

            String filename = String.format("folha-ponto-%s-%02d-%04d.xlsx", employeeId, resolvedMonth, resolvedYear);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(fileBytes);
        } catch (ResourceNotFoundException e) {
            log.warn("Recurso não encontrado ao gerar folha de ponto: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Erro ao gerar folha de ponto: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/month-pdf")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Gerar PDF da folha de ponto do mês preenchido com os registros do funcionário", description = "Gera PDF com os horários já registrados. Parâmetros: employeeId (obrigatório), year, month (opcionais, padrão atual), companyId (opcional).")
    public ResponseEntity<byte[]> generateMonthFolhaPontoPdf(
            @RequestParam UUID employeeId,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        try {
            LocalDate today = LocalDate.now();
            int resolvedYear = (year != null) ? year : today.getYear();
            int resolvedMonth = (month != null) ? month : today.getMonthValue();

            byte[] pdfBytes = folhaDePontoStandardPdfService.generateFilledPdf(employeeId, companyId, resolvedYear, resolvedMonth);

            String filename = String.format("folha-ponto-%04d-%02d.pdf", resolvedYear, resolvedMonth);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (ResourceNotFoundException e) {
            log.warn("Recurso não encontrado ao gerar PDF do mês: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da folha de ponto do mês: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/blank-pdf")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Gerar PDF da folha de ponto em branco para impressão e preenchimento manual", description = "Gera PDF com layout padronizado para qualquer mês/ano. Parâmetros opcionais: companyId, year (padrão atual), month (padrão atual).")
    public ResponseEntity<byte[]> generateBlankFolhaPontoPdf(
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        try {
            LocalDate today = LocalDate.now();
            int resolvedYear = (year != null) ? year : today.getYear();
            int resolvedMonth = (month != null) ? month : today.getMonthValue();

            byte[] pdfBytes = folhaDePontoStandardPdfService.generateBlankPdf(companyId, resolvedYear, resolvedMonth);

            String filename = String.format("folha-ponto-preenchimento-manual-%04d-%02d.pdf", resolvedYear, resolvedMonth);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (ResourceNotFoundException e) {
            log.warn("Recurso não encontrado ao gerar PDF em branco: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da folha de ponto para preenchimento manual: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
}



