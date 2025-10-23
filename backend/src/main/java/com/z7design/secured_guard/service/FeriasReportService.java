package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.FeriasReportDTO;
import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.model.Vacation;
import com.z7design.secured_guard.model.enums.VacationStatus;
import com.z7design.secured_guard.repository.AbsenceRepository;
import com.z7design.secured_guard.repository.VacationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeriasReportService {

    private final VacationRepository vacationRepository;
    private final AbsenceRepository absenceRepository;

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Estatísticas de férias
        Map<String, Object> feriasStats = getFeriasStats();
        stats.put("ferias", feriasStats);
        
        // Estatísticas de afastamentos
        Map<String, Object> afastamentosStats = getAfastamentosStats();
        stats.put("afastamentos", afastamentosStats);
        
        return stats;
    }

    public Map<String, Object> getFeriasStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            long totalFerias = vacationRepository.count();
            long feriasPendentes = vacationRepository.countByStatus(VacationStatus.PENDING);
            long feriasAprovadas = vacationRepository.countByStatus(VacationStatus.APPROVED);
            long feriasRejeitadas = vacationRepository.countByStatus(VacationStatus.REJECTED);
            long feriasCanceladas = vacationRepository.countByStatus(VacationStatus.CANCELLED);
            
            stats.put("total", totalFerias);
            stats.put("pendentes", feriasPendentes);
            stats.put("aprovadas", feriasAprovadas);
            stats.put("rejeitadas", feriasRejeitadas);
            stats.put("canceladas", feriasCanceladas);
            
            log.info("Estatísticas de férias geradas: {}", stats);
            
        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas de férias", e);
            stats.put("error", "Erro ao gerar estatísticas");
        }
        
        return stats;
    }

    public Map<String, Object> getAfastamentosStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            long totalAfastamentos = absenceRepository.count();
            long afastamentosPendentes = absenceRepository.countByStatus(Absence.AbsenceStatus.PENDING);
            long afastamentosAprovados = absenceRepository.countByStatus(Absence.AbsenceStatus.APPROVED);
            long afastamentosRejeitados = absenceRepository.countByStatus(Absence.AbsenceStatus.REJECTED);
            long afastamentosCancelados = absenceRepository.countByStatus(Absence.AbsenceStatus.CANCELLED);
            
            stats.put("total", totalAfastamentos);
            stats.put("pendentes", afastamentosPendentes);
            stats.put("aprovados", afastamentosAprovados);
            stats.put("rejeitados", afastamentosRejeitados);
            stats.put("cancelados", afastamentosCancelados);
            
            log.info("Estatísticas de afastamentos geradas: {}", stats);
            
        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas de afastamentos", e);
            stats.put("error", "Erro ao gerar estatísticas");
        }
        
        return stats;
    }

    public byte[] generateFeriasExcelReport(FeriasReportDTO filters) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Relatório de Férias");
            
            // Cabeçalho
            createFeriasHeader(sheet, workbook);
            
            // Buscar dados
            List<Vacation> vacations = getFeriasData(filters);
            
            // Preencher dados
            fillFeriasData(sheet, workbook, vacations);
            
            // Auto-size columns
            for (int i = 0; i < 8; i++) {
                sheet.autoSizeColumn(i);
            }
            
            // Converter para bytes
            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                workbook.write(outputStream);
                return outputStream.toByteArray();
            }
        }
    }

    public byte[] generateAfastamentosExcelReport(FeriasReportDTO filters) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Relatório de Afastamentos");
            
            // Cabeçalho
            createAfastamentosHeader(sheet, workbook);
            
            // Buscar dados
            List<Absence> absences = getAfastamentosData(filters);
            
            // Preencher dados
            fillAfastamentosData(sheet, workbook, absences);
            
            // Auto-size columns
            for (int i = 0; i < 7; i++) {
                sheet.autoSizeColumn(i);
            }
            
            // Converter para bytes
            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                workbook.write(outputStream);
                return outputStream.toByteArray();
            }
        }
    }

    public byte[] generateConsolidadoExcelReport(FeriasReportDTO filters) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            // Aba de Férias
            Sheet feriasSheet = workbook.createSheet("Férias");
            createFeriasHeader(feriasSheet, workbook);
            List<Vacation> vacations = getFeriasData(filters);
            fillFeriasData(feriasSheet, workbook, vacations);
            
            // Aba de Afastamentos
            Sheet afastamentosSheet = workbook.createSheet("Afastamentos");
            createAfastamentosHeader(afastamentosSheet, workbook);
            List<Absence> absences = getAfastamentosData(filters);
            fillAfastamentosData(afastamentosSheet, workbook, absences);
            
            // Aba de Estatísticas
            Sheet statsSheet = workbook.createSheet("Estatísticas");
            createStatsSheet(statsSheet, workbook, filters);
            
            // Auto-size columns
            for (Sheet sheet : workbook) {
                for (int i = 0; i < 8; i++) {
                    sheet.autoSizeColumn(i);
                }
            }
            
            // Converter para bytes
            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                workbook.write(outputStream);
                return outputStream.toByteArray();
            }
        }
    }

    private void createFeriasHeader(Sheet sheet, Workbook workbook) {
        Row headerRow = sheet.createRow(0);
        
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        String[] headers = {"ID", "Funcionário", "Período Aquisitivo", "Data Início", "Data Fim", "Dias", "Status", "Observações"};
        
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }

    private void createAfastamentosHeader(Sheet sheet, Workbook workbook) {
        Row headerRow = sheet.createRow(0);
        
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        String[] headers = {"ID", "Funcionário", "Tipo", "Data", "Status", "Motivo", "Observações"};
        
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }

    private void fillFeriasData(Sheet sheet, Workbook workbook, List<Vacation> vacations) {
        CellStyle dateStyle = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));
        
        int rowNum = 1;
        for (Vacation vacation : vacations) {
            Row row = sheet.createRow(rowNum++);
            
            row.createCell(0).setCellValue(vacation.getId().toString());
            row.createCell(1).setCellValue(vacation.getEmployee().getName());
            row.createCell(2).setCellValue(vacation.getStartDate().getYear() + "/" + (vacation.getStartDate().getYear() + 1));
            
            Cell startDateCell = row.createCell(3);
            startDateCell.setCellValue(vacation.getStartDate());
            startDateCell.setCellStyle(dateStyle);
            
            Cell endDateCell = row.createCell(4);
            endDateCell.setCellValue(vacation.getEndDate());
            endDateCell.setCellStyle(dateStyle);
            
            row.createCell(5).setCellValue(vacation.getDaysTaken());
            row.createCell(6).setCellValue(vacation.getStatus().toString());
            row.createCell(7).setCellValue(vacation.getApprovalDate() != null ? 
                vacation.getApprovalDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
        }
    }

    private void fillAfastamentosData(Sheet sheet, Workbook workbook, List<Absence> absences) {
        CellStyle dateStyle = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));
        
        int rowNum = 1;
        for (Absence absence : absences) {
            Row row = sheet.createRow(rowNum++);
            
            row.createCell(0).setCellValue(absence.getId().toString());
            row.createCell(1).setCellValue(absence.getEmployee().getName());
            row.createCell(2).setCellValue(absence.getAbsenceType().toString());
            
            Cell dateCell = row.createCell(3);
            dateCell.setCellValue(absence.getAbsenceDate());
            dateCell.setCellStyle(dateStyle);
            
            row.createCell(4).setCellValue(absence.getStatus().toString());
            row.createCell(5).setCellValue(absence.getReason() != null ? absence.getReason() : "");
            row.createCell(6).setCellValue(absence.getCoverageNotes() != null ? absence.getCoverageNotes() : "");
        }
    }

    private void createStatsSheet(Sheet sheet, Workbook workbook, FeriasReportDTO filters) {
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        
        // Título
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Estatísticas de Férias e Afastamentos");
        titleCell.setCellStyle(headerStyle);
        
        // Estatísticas de férias
        Map<String, Object> feriasStats = getFeriasStats();
        int rowNum = 2;
        
        Row feriasHeaderRow = sheet.createRow(rowNum++);
        Cell feriasHeaderCell = feriasHeaderRow.createCell(0);
        feriasHeaderCell.setCellValue("Férias");
        feriasHeaderCell.setCellStyle(headerStyle);
        
        for (Map.Entry<String, Object> entry : feriasStats.entrySet()) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(entry.getKey());
            row.createCell(1).setCellValue(entry.getValue().toString());
        }
        
        // Estatísticas de afastamentos
        rowNum++;
        Map<String, Object> afastamentosStats = getAfastamentosStats();
        
        Row afastamentosHeaderRow = sheet.createRow(rowNum++);
        Cell afastamentosHeaderCell = afastamentosHeaderRow.createCell(0);
        afastamentosHeaderCell.setCellValue("Afastamentos");
        afastamentosHeaderCell.setCellStyle(headerStyle);
        
        for (Map.Entry<String, Object> entry : afastamentosStats.entrySet()) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(entry.getKey());
            row.createCell(1).setCellValue(entry.getValue().toString());
        }
    }

    private List<Vacation> getFeriasData(FeriasReportDTO filters) {
        // Implementar filtros baseados nos parâmetros
        // Por enquanto, retorna todos os dados
        return vacationRepository.findAll();
    }

    private List<Absence> getAfastamentosData(FeriasReportDTO filters) {
        // Implementar filtros baseados nos parâmetros
        // Por enquanto, retorna todos os dados
        return absenceRepository.findAll();
    }
}
