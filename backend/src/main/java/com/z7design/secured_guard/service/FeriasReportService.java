package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.FeriasReportDTO;
import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.model.Vacation;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.enums.VacationStatus;
import com.z7design.secured_guard.model.enums.VacationType;
import com.z7design.secured_guard.repository.AbsenceRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.VacationRepository;
import com.z7design.secured_guard.util.PeriodoAquisitivoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeriasReportService {

    /** Tipos de afastamento do frontend (PT) mapeados para os enums do backend. */
    private static final Map<String, List<String>> TIPOS_AFASTAMENTO_FRONTEND = Map.of(
            "ATESTADO", List.of("SICK_LEAVE", "MEDICAL_APPOINTMENT"),
            "LICENCA_MEDICA", List.of("PERSONAL_LEAVE"),
            "LICENCA_MATERNIDADE", List.of("PERSONAL_LEAVE"),
            "LICENCA_PATERNIDADE", List.of("PERSONAL_LEAVE"),
            "SUSPENSAO", List.of("UNAUTHORIZED"),
            "OUTROS", List.of("OTHER", "WEDDING", "FAMILY_EMERGENCY"));

    private final VacationRepository vacationRepository;
    private final AbsenceRepository absenceRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final ExcelReportLayoutService excelReportLayoutService;
    private final StandardReportLayoutService standardReportLayoutService;

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // Estatísticas de férias
        Map<String, Object> feriasStats = getFeriasStats();
        stats.put("ferias", feriasStats);

        // Estatísticas de afastamentos
        Map<String, Object> afastamentosStats = getAfastamentosStats();
        stats.put("afastamentos", afastamentosStats);

        // Estatísticas de período de experiência
        Map<String, Object> experienciaStats = getExperienciaStats();
        stats.put("experiencia", experienciaStats);

        return stats;
    }

    public Map<String, Object> getExperienciaStats() {
        Map<String, Object> stats = new HashMap<>();

        try {
            List<Employee> employees = employeeRepository.findAll().stream()
                    .filter(e -> e.getHireDate() != null)
                    .collect(Collectors.toList());

            LocalDate hoje = LocalDate.now();
            LocalDate limiteProximo = hoje.plusDays(15);

            long total = employees.size();
            long emAndamento = 0;
            long proximosVencer = 0;
            long concluidos = 0;

            for (Employee emp : employees) {
                LocalDate admissao = emp.getHireDate();
                int dias1 = parseDays(emp.getPrazoExperienciaTexto(), 45);
                int dias2 = parseDays(emp.getProrrogacaoExperiencia(), 45);
                LocalDate fim1 = admissao.plusDays(dias1);
                LocalDate fimTotal = fim1.plusDays(dias2);

                if (fimTotal.isBefore(hoje)) {
                    concluidos++;
                } else {
                    emAndamento++;
                    // Próximo de vencer se 1ª fase (fim1) ou fim total (fimTotal) ocorre nos próximos 15 dias
                    boolean proxFim1 = (!fim1.isBefore(hoje)) && (!fim1.isAfter(limiteProximo));
                    boolean proxFimTotal = (!fimTotal.isBefore(hoje)) && (!fimTotal.isAfter(limiteProximo));
                    if (proxFim1 || proxFimTotal) {
                        proximosVencer++;
                    }
                }
            }

            stats.put("total", total);
            stats.put("emAndamento", emAndamento);
            stats.put("proximosVencer", proximosVencer);
            stats.put("concluidos", concluidos);

            log.info("Estatísticas de experiência geradas: {}", stats);

        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas de período de experiência", e);
            stats.put("error", "Erro ao gerar estatísticas de experiência");
        }

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
            Company company = resolveCompany();
            int lastColumn = 9;
            int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, company, "RELATÓRIO DE FÉRIAS",
                    lastColumn);

            // Cabeçalho
            int dataStartRow = createFeriasHeader(sheet, workbook, rowIndex);

            // Buscar dados
            List<Vacation> vacations = getFeriasData(filters);

            // Preencher dados
            fillFeriasData(sheet, workbook, vacations, dataStartRow);

            // Auto-size columns
            for (int i = 0; i < 10; i++) {
                sheet.autoSizeColumn(i);
            }

            excelReportLayoutService.addFooter(sheet, workbook, company, lastColumn);

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
            Company company = resolveCompany();
            int lastColumn = 6;
            int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, company, "RELATÓRIO DE AFASTAMENTOS",
                    lastColumn);

            // Cabeçalho
            int dataStartRow = createAfastamentosHeader(sheet, workbook, rowIndex);

            // Buscar dados
            List<Absence> absences = getAfastamentosData(filters);

            // Preencher dados
            fillAfastamentosData(sheet, workbook, absences, dataStartRow);

            // Auto-size columns
            for (int i = 0; i < 7; i++) {
                sheet.autoSizeColumn(i);
            }

            excelReportLayoutService.addFooter(sheet, workbook, company, lastColumn);

            // Converter para bytes
            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                workbook.write(outputStream);
                return outputStream.toByteArray();
            }
        }
    }

    public byte[] generateExperienciaExcelReport(FeriasReportDTO filters) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Período de Experiência");
            Company company = resolveCompany();
            int lastColumn = 8;

            int startRow = excelReportLayoutService.addHeader(sheet, workbook, company,
                    "RELATÓRIO DE PERÍODO DE EXPERIÊNCIA", lastColumn);

            int dataStartRow = createExperienciaHeader(sheet, workbook, startRow);
            List<Employee> employees = getExperienciaData(filters);
            fillExperienciaData(sheet, workbook, employees, dataStartRow);

            for (int i = 0; i <= lastColumn; i++) {
                sheet.autoSizeColumn(i);
            }

            excelReportLayoutService.addFooter(sheet, workbook, company, lastColumn);

            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                workbook.write(outputStream);
                return outputStream.toByteArray();
            }
        }
    }

    public byte[] generateExperienciaPDFReport(FeriasReportDTO filters) throws IOException {
        List<Employee> employees = getExperienciaData(filters);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE PERÍODO DE EXPERIÊNCIA")
                    .companyId(resolveCompany().getId())
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            if (employees.isEmpty()) {
                document.add(new Paragraph("Nenhum funcionário em período de experiência encontrado.")
                        .setTextAlignment(TextAlignment.CENTER));
            } else {
                Table table = new Table(new float[] { 2.5f, 1.2f, 1.5f, 1.2f, 1.2f, 1.2f, 1.2f }).useAllAvailableWidth();
                table.addHeaderCell(createPDFHeaderCell("Funcionário"));
                table.addHeaderCell(createPDFHeaderCell("Empresa"));
                table.addHeaderCell(createPDFHeaderCell("Setor"));
                table.addHeaderCell(createPDFHeaderCell("Admissão"));
                table.addHeaderCell(createPDFHeaderCell("Fim 1ª Fase"));
                table.addHeaderCell(createPDFHeaderCell("Fim Experiência"));
                table.addHeaderCell(createPDFHeaderCell("Status"));

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                LocalDate hoje = LocalDate.now();

                for (Employee emp : employees) {
                    LocalDate admissao = emp.getHireDate();
                    int dias1 = parseDays(emp.getPrazoExperienciaTexto(), 45);
                    int dias2 = parseDays(emp.getProrrogacaoExperiencia(), 45);
                    LocalDate fim1 = admissao.plusDays(dias1);
                    LocalDate fimTotal = fim1.plusDays(dias2);
                    String status = fimTotal.isBefore(hoje) ? "Concluída" : "Em Andamento";

                    table.addCell(createPDFCell(emp.getName() != null ? emp.getName() : ""));
                    table.addCell(createPDFCell(safeCompanySigla(emp)));
                    table.addCell(createPDFCell(safeDepartmentName(emp)));
                    table.addCell(createPDFCell(admissao.format(formatter)));
                    table.addCell(createPDFCell(fim1.format(formatter)));
                    table.addCell(createPDFCell(fimTotal.format(formatter)));
                    table.addCell(createPDFCell(status));
                }
                document.add(table);
            }
            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de experiência", e);
            throw new IOException("Erro ao gerar PDF", e);
        }
        return baos.toByteArray();
    }

    public byte[] generateConsolidadoExcelReport(FeriasReportDTO filters) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Company company = resolveCompany();

            // Aba de Férias
            Sheet feriasSheet = workbook.createSheet("Férias");
            int feriasLastColumn = 9;
            int feriasRowIndex = excelReportLayoutService.addHeader(feriasSheet, workbook, company,
                    "RELATÓRIO DE FÉRIAS", feriasLastColumn);
            int feriasDataStart = createFeriasHeader(feriasSheet, workbook, feriasRowIndex);
            List<Vacation> vacations = getFeriasData(filters);
            fillFeriasData(feriasSheet, workbook, vacations, feriasDataStart);
            excelReportLayoutService.addFooter(feriasSheet, workbook, company, feriasLastColumn);

            // Aba de Afastamentos
            Sheet afastamentosSheet = workbook.createSheet("Afastamentos");
            int afastLastColumn = 6;
            int afastRowIndex = excelReportLayoutService.addHeader(afastamentosSheet, workbook, company,
                    "RELATÓRIO DE AFASTAMENTOS", afastLastColumn);
            int afastDataStart = createAfastamentosHeader(afastamentosSheet, workbook, afastRowIndex);
            List<Absence> absences = getAfastamentosData(filters);
            fillAfastamentosData(afastamentosSheet, workbook, absences, afastDataStart);
            excelReportLayoutService.addFooter(afastamentosSheet, workbook, company, afastLastColumn);

            // Aba de Período de Experiência
            Sheet expSheet = workbook.createSheet("Experiência");
            int expLastColumn = 8;
            int expRowIndex = excelReportLayoutService.addHeader(expSheet, workbook, company,
                    "RELATÓRIO DE PERÍODO DE EXPERIÊNCIA", expLastColumn);
            int expDataStart = createExperienciaHeader(expSheet, workbook, expRowIndex);
            List<Employee> experienceEmployees = getExperienciaData(filters);
            fillExperienciaData(expSheet, workbook, experienceEmployees, expDataStart);
            excelReportLayoutService.addFooter(expSheet, workbook, company, expLastColumn);

            // Aba de Estatísticas
            Sheet statsSheet = workbook.createSheet("Estatísticas");
            int statsLastColumn = 1;
            int statsRowIndex = excelReportLayoutService.addHeader(statsSheet, workbook, company, "ESTATÍSTICAS",
                    statsLastColumn);
            createStatsSheet(statsSheet, workbook, filters, statsRowIndex);
            excelReportLayoutService.addFooter(statsSheet, workbook, company, statsLastColumn);

            // Auto-size columns
            for (Sheet sheet : workbook) {
                for (int i = 0; i < 10; i++) {
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

    private int createFeriasHeader(Sheet sheet, Workbook workbook, int startRow) {
        Row headerRow = sheet.createRow(startRow);

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        String[] headers = { "ID", "Funcionário", "Empresa", "Setor de Trabalho", "Período Aquisitivo",
                "Data Início", "Data Fim", "Dias", "Status", "Data Aprovação" };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        return startRow + 1;
    }

    private int createAfastamentosHeader(Sheet sheet, Workbook workbook, int startRow) {
        Row headerRow = sheet.createRow(startRow);

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        String[] headers = { "ID", "Funcionário", "Tipo", "Data", "Status", "Motivo", "Observações" };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        return startRow + 1;
    }

    private void fillFeriasData(Sheet sheet, Workbook workbook, List<Vacation> vacations, int startRow) {
        CellStyle dateStyle = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));

        int rowNum = startRow;
        for (Vacation vacation : vacations) {
            Row row = sheet.createRow(rowNum++);
            Employee employee = vacation.getEmployee();

            row.createCell(0).setCellValue(vacation.getId().toString());
            row.createCell(1).setCellValue(employee != null ? employee.getName() : "Funcionário removido");
            row.createCell(2).setCellValue(safeCompanySigla(employee));
            row.createCell(3).setCellValue(safeDepartmentName(employee));
            row.createCell(4).setCellValue(periodoAquisitivo(vacation));

            Cell startDateCell = row.createCell(5);
            startDateCell.setCellValue(vacation.getStartDate());
            startDateCell.setCellStyle(dateStyle);

            Cell endDateCell = row.createCell(6);
            endDateCell.setCellValue(vacation.getEndDate());
            endDateCell.setCellStyle(dateStyle);

            row.createCell(7).setCellValue(vacation.getDaysTaken());
            row.createCell(8).setCellValue(vacation.getStatus().toString());
            row.createCell(9)
                    .setCellValue(vacation.getApprovalDate() != null
                            ? vacation.getApprovalDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            : "");
        }
    }

    private String periodoAquisitivo(Vacation vacation) {
        if (vacation.getPeriodoAquisitivo() != null && !vacation.getPeriodoAquisitivo().isBlank()) {
            return vacation.getPeriodoAquisitivo();
        }
        Employee employee = vacation.getEmployee();
        return PeriodoAquisitivoUtil.calcular(employee != null ? employee.getHireDate() : null,
                vacation.getStartDate());
    }

    private String safeCompanySigla(Employee employee) {
        if (employee == null) {
            return "";
        }
        try {
            return employee.getCompany() != null && employee.getCompany().getSigla() != null
                    ? employee.getCompany().getSigla()
                    : "";
        } catch (Exception e) {
            return "";
        }
    }

    private String safeDepartmentName(Employee employee) {
        if (employee == null) {
            return "";
        }
        try {
            return employee.getDepartment() != null && employee.getDepartment().getName() != null
                    ? employee.getDepartment().getName()
                    : "";
        } catch (Exception e) {
            return "";
        }
    }

    private void fillAfastamentosData(Sheet sheet, Workbook workbook, List<Absence> absences, int startRow) {
        CellStyle dateStyle = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));

        int rowNum = startRow;
        for (Absence absence : absences) {
            Row row = sheet.createRow(rowNum++);
            Employee absenceEmployee = absence.getEmployee();

            row.createCell(0).setCellValue(absence.getId().toString());
            row.createCell(1).setCellValue(absenceEmployee != null ? absenceEmployee.getName() : "Funcionário removido");
            row.createCell(2).setCellValue(absence.getAbsenceType().toString());

            Cell dateCell = row.createCell(3);
            dateCell.setCellValue(absence.getAbsenceDate());
            dateCell.setCellStyle(dateStyle);

            row.createCell(4).setCellValue(absence.getStatus().toString());
            row.createCell(5).setCellValue(absence.getReason() != null ? absence.getReason() : "");
            row.createCell(6).setCellValue(absence.getCoverageNotes() != null ? absence.getCoverageNotes() : "");
        }
    }

    private void createStatsSheet(Sheet sheet, Workbook workbook, FeriasReportDTO filters, int startRow) {
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);

        // Título
        int rowNum = startRow;
        Row titleRow = sheet.createRow(rowNum++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("Estatísticas de Férias e Afastamentos");
        titleCell.setCellStyle(headerStyle);

        // Estatísticas de férias
        Map<String, Object> feriasStats = getFeriasStats();
        rowNum++;

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

    private Company resolveCompany() {
        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (!activeCompanies.isEmpty()) {
            return activeCompanies.get(0);
        }

        List<Company> allCompanies = companyRepository.findAll();
        if (!allCompanies.isEmpty()) {
            return allCompanies.get(0);
        }

        throw new RuntimeException("Não foi possível determinar a empresa para o relatório.");
    }

    public byte[] generateFeriasPDFReport(FeriasReportDTO filters) throws IOException {
        List<Vacation> vacations = getFeriasData(filters);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE FÉRIAS")
                    .companyId(resolveCompany().getId())
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // Tabela de férias
            if (vacations.isEmpty()) {
                document.add(
                        new Paragraph("Nenhum registro de férias encontrado.").setTextAlignment(TextAlignment.CENTER));
            } else {
                Table table = new Table(new float[] { 2.5f, 1.2f, 1.5f, 1.5f, 1.5f, 1, 1.3f }).useAllAvailableWidth();
                table.addHeaderCell(createPDFHeaderCell("Funcionário"));
                table.addHeaderCell(createPDFHeaderCell("Empresa"));
                table.addHeaderCell(createPDFHeaderCell("Setor"));
                table.addHeaderCell(createPDFHeaderCell("Data Início"));
                table.addHeaderCell(createPDFHeaderCell("Data Fim"));
                table.addHeaderCell(createPDFHeaderCell("Dias"));
                table.addHeaderCell(createPDFHeaderCell("Status"));

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Vacation v : vacations) {
                    Employee employee = v.getEmployee();
                    table.addCell(createPDFCell(employee != null ? employee.getName() : "Funcionário removido"));
                    table.addCell(createPDFCell(safeCompanySigla(employee)));
                    table.addCell(createPDFCell(safeDepartmentName(employee)));
                    table.addCell(createPDFCell(v.getStartDate().format(formatter)));
                    table.addCell(createPDFCell(v.getEndDate().format(formatter)));
                    table.addCell(createPDFCell(String.valueOf(v.getDaysTaken())));
                    table.addCell(createPDFCell(v.getStatus().toString()));
                }
                document.add(table);
            }
            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de férias", e);
            throw new IOException("Erro ao gerar PDF", e);
        }
        return baos.toByteArray();
    }

    public byte[] generateAfastamentosPDFReport(FeriasReportDTO filters) throws IOException {
        List<Absence> absences = getAfastamentosData(filters);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE AFASTAMENTOS")
                    .companyId(resolveCompany().getId())
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // Tabela de afastamentos
            if (absences.isEmpty()) {
                document.add(new Paragraph("Nenhum registro de afastamento encontrado.")
                        .setTextAlignment(TextAlignment.CENTER));
            } else {
                Table table = new Table(new float[] { 3, 2, 2, 3 }).useAllAvailableWidth();
                table.addHeaderCell(createPDFHeaderCell("Funcionário"));
                table.addHeaderCell(createPDFHeaderCell("Tipo"));
                table.addHeaderCell(createPDFHeaderCell("Data"));
                table.addHeaderCell(createPDFHeaderCell("Status"));

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Absence a : absences) {
                    Employee absenceEmployee = a.getEmployee();
                    table.addCell(createPDFCell(absenceEmployee != null ? absenceEmployee.getName() : "Funcionário removido"));
                    table.addCell(createPDFCell(a.getAbsenceType() != null ? a.getAbsenceType().toString() : ""));
                    table.addCell(createPDFCell(a.getAbsenceDate() != null ? a.getAbsenceDate().format(formatter) : ""));
                    table.addCell(createPDFCell(a.getStatus() != null ? a.getStatus().toString() : ""));
                }
                document.add(table);
            }
            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de afastamentos", e);
            throw new IOException("Erro ao gerar PDF", e);
        }
        return baos.toByteArray();
    }

    private com.itextpdf.layout.element.Cell createPDFHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(9))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }

    private com.itextpdf.layout.element.Cell createPDFCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(8))
                .setTextAlignment(TextAlignment.LEFT);
    }

    private List<Vacation> getFeriasData(FeriasReportDTO filters) {
        List<Vacation> vacations = vacationRepository.findAllWithEmployee();
        if (filters == null) {
            return vacations;
        }

        UUID employeeId = filters.getEmployeeId();
        String status = normalizar(filters.getStatus());
        String tipo = normalizar(filters.getTipo());
        String empresa = normalizar(filters.getEmpresa());
        LocalDate dataInicio = filters.getDataInicio();
        LocalDate dataFim = filters.getDataFim();

        return vacations.stream()
                .filter(v -> employeeId == null
                        || (v.getEmployee() != null && employeeId.equals(v.getEmployee().getId())))
                .filter(v -> status == null || status.equalsIgnoreCase("TODOS")
                        || (v.getStatus() != null && status.equalsIgnoreCase(v.getStatus().name())))
                .filter(v -> tipo == null || tipo.equalsIgnoreCase("TODOS") || tipoFeriasMatches(v, tipo))
                .filter(v -> dataInicio == null || !v.getStartDate().isBefore(dataInicio))
                .filter(v -> dataFim == null || !v.getStartDate().isAfter(dataFim))
                .filter(v -> empresa == null || empresa.equalsIgnoreCase("TODAS")
                        || empresa.equalsIgnoreCase(safeCompanySigla(v.getEmployee())))
                .collect(Collectors.toList());
    }

    private List<Absence> getAfastamentosData(FeriasReportDTO filters) {
        List<Absence> absences = absenceRepository.findAllWithRelationships();
        if (filters == null) {
            return absences;
        }

        UUID employeeId = filters.getEmployeeId();
        String status = normalizar(filters.getStatus());
        String tipo = normalizar(filters.getTipo());
        String empresa = normalizar(filters.getEmpresa());
        LocalDate dataInicio = filters.getDataInicio();
        LocalDate dataFim = filters.getDataFim();

        return absences.stream()
                .filter(a -> employeeId == null
                        || (a.getEmployee() != null && employeeId.equals(a.getEmployee().getId())))
                .filter(a -> status == null || status.equalsIgnoreCase("TODOS")
                        || (a.getStatus() != null && status.equalsIgnoreCase(a.getStatus().name())))
                .filter(a -> tipo == null || tipo.equalsIgnoreCase("TODOS") || tipoAfastamentoMatches(a, tipo))
                .filter(a -> dataInicio == null || !a.getAbsenceDate().isBefore(dataInicio))
                .filter(a -> dataFim == null || !a.getAbsenceDate().isAfter(dataFim))
                .filter(a -> empresa == null || empresa.equalsIgnoreCase("TODAS")
                        || empresa.equalsIgnoreCase(safeCompanySigla(a.getEmployee())))
                .collect(Collectors.toList());
    }

    private boolean tipoFeriasMatches(Vacation vacation, String tipoFiltro) {
        VacationType type = vacation.getVacationType();
        if (type == null) {
            return tipoFiltro.equalsIgnoreCase("FERIAS_NORMAIS") || tipoFiltro.equalsIgnoreCase("NORMAL");
        }
        if (tipoFiltro.equalsIgnoreCase(type.name())) {
            return true;
        }
        return switch (type) {
            case SOLD -> tipoFiltro.equalsIgnoreCase("FERIAS_VENDIDAS");
            case PECUNIARY_BONUS -> tipoFiltro.equalsIgnoreCase("ABONO_PECUNIARIO");
            default -> tipoFiltro.equalsIgnoreCase("FERIAS_NORMAIS");
        };
    }

    private boolean tipoAfastamentoMatches(Absence absence, String tipoFiltro) {
        String atual = absence.getAbsenceType() != null ? absence.getAbsenceType().name() : "";
        if (tipoFiltro.equalsIgnoreCase(atual)) {
            return true;
        }
        List<String> equivalentes = TIPOS_AFASTAMENTO_FRONTEND.get(tipoFiltro.toUpperCase());
        return equivalentes != null && equivalentes.contains(atual);
    }

    private int createExperienciaHeader(Sheet sheet, Workbook workbook, int startRow) {
        Row headerRow = sheet.createRow(startRow);

        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        String[] headers = {
                "ID", "Funcionário", "Empresa", "Cargo / Setor", "Data Admissão",
                "Início Experiência", "Fim 1ª Fase", "Fim Experiência Total", "Status Experiência"
        };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        return startRow + 1;
    }

    private void fillExperienciaData(Sheet sheet, Workbook workbook, List<Employee> employees, int startRow) {
        CellStyle dateStyle = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));

        int rowNum = startRow;
        LocalDate hoje = LocalDate.now();

        for (Employee emp : employees) {
            Row row = sheet.createRow(rowNum++);
            LocalDate admissao = emp.getHireDate();
            int dias1 = parseDays(emp.getPrazoExperienciaTexto(), 45);
            int dias2 = parseDays(emp.getProrrogacaoExperiencia(), 45);
            LocalDate fim1 = admissao.plusDays(dias1);
            LocalDate fimTotal = fim1.plusDays(dias2);

            row.createCell(0).setCellValue(emp.getId() != null ? emp.getId().toString() : "");
            row.createCell(1).setCellValue(emp.getName() != null ? emp.getName() : "");
            row.createCell(2).setCellValue(safeCompanySigla(emp));
            row.createCell(3).setCellValue(safeDepartmentName(emp));

            Cell admCell = row.createCell(4);
            admCell.setCellValue(admissao);
            admCell.setCellStyle(dateStyle);

            Cell iniCell = row.createCell(5);
            iniCell.setCellValue(admissao);
            iniCell.setCellStyle(dateStyle);

            Cell fim1Cell = row.createCell(6);
            fim1Cell.setCellValue(fim1);
            fim1Cell.setCellStyle(dateStyle);

            Cell fimTotCell = row.createCell(7);
            fimTotCell.setCellValue(fimTotal);
            fimTotCell.setCellStyle(dateStyle);

            String status = fimTotal.isBefore(hoje) ? "Concluída" : "Em Andamento";
            row.createCell(8).setCellValue(status);
        }
    }

    private List<Employee> getExperienciaData(FeriasReportDTO filters) {
        List<Employee> allEmployees = employeeRepository.findAll();
        if (filters == null) {
            return allEmployees.stream().filter(e -> e.getHireDate() != null).collect(Collectors.toList());
        }

        UUID employeeId = filters.getEmployeeId();
        String empresa = normalizar(filters.getEmpresa());
        LocalDate dataInicio = filters.getDataInicio();
        LocalDate dataFim = filters.getDataFim();

        return allEmployees.stream()
                .filter(e -> e.getHireDate() != null)
                .filter(e -> employeeId == null || employeeId.equals(e.getId()))
                .filter(e -> empresa == null || empresa.equalsIgnoreCase("TODAS")
                        || empresa.equalsIgnoreCase(safeCompanySigla(e)))
                .filter(e -> {
                    LocalDate admissao = e.getHireDate();
                    int dias1 = parseDays(e.getPrazoExperienciaTexto(), 45);
                    int dias2 = parseDays(e.getProrrogacaoExperiencia(), 45);
                    LocalDate fimTotal = admissao.plusDays(dias1 + dias2);

                    if (dataInicio != null && fimTotal.isBefore(dataInicio)) {
                        return false;
                    }
                    if (dataFim != null && admissao.isAfter(dataFim)) {
                        return false;
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    private int parseDays(String text, int defaultValue) {
        if (text == null || text.isBlank()) return defaultValue;
        String digits = text.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return defaultValue;
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private String normalizar(String valor) {
        if (valor == null) {
            return null;
        }
        String trimmed = valor.trim();
        return trimmed.isEmpty() || trimmed.equalsIgnoreCase("all") ? null : trimmed;
    }
}
