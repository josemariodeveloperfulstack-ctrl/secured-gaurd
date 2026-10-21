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
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.util.PeriodoAquisitivoUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FeriasReportService {

    @Value("${app.upload.base-dir:${app.upload.dir:uploads}}")
    private String uploadDir;

    // Cores do layout executivo padronizado (mesmo do Contas a Pagar)
    private static final DeviceRgb RED_PRIMARY = new DeviceRgb(220, 38, 38);       // #dc2626
    private static final DeviceRgb RED_DARK = new DeviceRgb(185, 28, 28);          // #b91c1c
    private static final DeviceRgb SLATE_DARK = new DeviceRgb(30, 41, 59);         // #1e293b
    private static final DeviceRgb SLATE_LIGHT = new DeviceRgb(241, 245, 249);     // #f1f5f9
    private static final DeviceRgb SLATE_BORDER = new DeviceRgb(203, 213, 225);    // #cbd5e1
    private static final DeviceRgb ROW_ALT = new DeviceRgb(248, 250, 252);         // #f8fafc
    private static final DeviceRgb GREEN_TEXT = new DeviceRgb(22, 101, 52);        // #166534
    private static final DeviceRgb AMBER_TEXT = new DeviceRgb(180, 83, 9);         // #b45309

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

    public FeriasReportService(
            VacationRepository vacationRepository,
            AbsenceRepository absenceRepository,
            CompanyRepository companyRepository,
            EmployeeRepository employeeRepository,
            ExcelReportLayoutService excelReportLayoutService,
            StandardReportLayoutService standardReportLayoutService) {
        this.vacationRepository = vacationRepository;
        this.absenceRepository = absenceRepository;
        this.companyRepository = companyRepository;
        this.employeeRepository = employeeRepository;
        this.excelReportLayoutService = excelReportLayoutService;
        this.standardReportLayoutService = standardReportLayoutService;
    }

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
        FeriasReportDTO req = filters != null ? filters : new FeriasReportDTO();
        req.setReportType("FERIAS");
        return generateCustomFeriasExcelReport(req);
    }

    public byte[] generateAfastamentosExcelReport(FeriasReportDTO filters) throws IOException {
        FeriasReportDTO req = filters != null ? filters : new FeriasReportDTO();
        req.setReportType("AFASTAMENTOS");
        return generateCustomFeriasExcelReport(req);
    }

    public byte[] generateExperienciaExcelReport(FeriasReportDTO filters) throws IOException {
        FeriasReportDTO req = filters != null ? filters : new FeriasReportDTO();
        req.setReportType("EXPERIENCIA");
        return generateCustomFeriasExcelReport(req);
    }

    /**
     * Gera relatório Excel customizado com as colunas exatamente selecionadas pelo usuário.
     */
    public byte[] generateCustomFeriasExcelReport(FeriasReportDTO req) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            String type = req != null && req.getReportType() != null ? req.getReportType().toUpperCase() : "FERIAS";
            Company company = resolveCompany();
            DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);

            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);

            if ("AFASTAMENTOS".equals(type)) {
                Sheet sheet = workbook.createSheet("Afastamentos");
                List<String> cols = req.getSelectedColumns();
                if (cols == null || cols.isEmpty()) {
                    cols = Arrays.asList("employeeName", "empresa", "setor", "tipo", "dataInicio", "status", "motivo");
                }
                int lastCol = Math.max(0, cols.size() - 1);
                int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, company, "RELATÓRIO DE AFASTAMENTOS E LICENÇAS", lastCol);

                // Cabeçalhos
                Row headerRow = sheet.createRow(rowIndex++);
                for (int i = 0; i < cols.size(); i++) {
                    org.apache.poi.ss.usermodel.Cell c = headerRow.createCell(i);
                    c.setCellValue(getAbsenceColHeader(cols.get(i)));
                    c.setCellStyle(headerStyle);
                }

                // Dados
                List<Absence> absences = getAfastamentosData(req);
                for (Absence a : absences) {
                    Row row = sheet.createRow(rowIndex++);
                    for (int i = 0; i < cols.size(); i++) {
                        org.apache.poi.ss.usermodel.Cell c = row.createCell(i);
                        c.setCellValue(getAbsenceColValue(cols.get(i), a, df));
                        c.setCellStyle(textStyle);
                    }
                }

                for (int i = 0; i < cols.size(); i++) {
                    sheet.autoSizeColumn(i);
                }
                excelReportLayoutService.addFooter(sheet, workbook, company, lastCol);

            } else if ("EXPERIENCIA".equals(type)) {
                Sheet sheet = workbook.createSheet("Experiência");
                List<String> cols = req.getSelectedColumns();
                if (cols == null || cols.isEmpty()) {
                    cols = Arrays.asList("employeeName", "empresa", "setor", "dataAdmissao", "fim1Fase", "fimExperiencia", "diasRestantes", "status");
                }
                int lastCol = Math.max(0, cols.size() - 1);
                int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, company, "RELATÓRIO DE PERÍODO DE EXPERIÊNCIA", lastCol);

                Row headerRow = sheet.createRow(rowIndex++);
                for (int i = 0; i < cols.size(); i++) {
                    org.apache.poi.ss.usermodel.Cell c = headerRow.createCell(i);
                    c.setCellValue(getExperienciaColHeader(cols.get(i)));
                    c.setCellStyle(headerStyle);
                }

                List<Employee> employees = getExperienciaData(req);
                LocalDate hoje = LocalDate.now();
                for (Employee emp : employees) {
                    LocalDate admissao = emp.getHireDate();
                    int dias1 = parseDays(emp.getPrazoExperienciaTexto(), 45);
                    int dias2 = parseDays(emp.getProrrogacaoExperiencia(), 45);
                    LocalDate fim1 = admissao.plusDays(dias1);
                    LocalDate fimTotal = fim1.plusDays(dias2);

                    Row row = sheet.createRow(rowIndex++);
                    for (int i = 0; i < cols.size(); i++) {
                        org.apache.poi.ss.usermodel.Cell c = row.createCell(i);
                        c.setCellValue(getExperienciaColValue(cols.get(i), emp, df, admissao, fim1, fimTotal, hoje));
                        c.setCellStyle(textStyle);
                    }
                }

                for (int i = 0; i < cols.size(); i++) {
                    sheet.autoSizeColumn(i);
                }
                excelReportLayoutService.addFooter(sheet, workbook, company, lastCol);

            } else {
                // FÉRIAS
                Sheet sheet = workbook.createSheet("Férias");
                List<String> cols = req.getSelectedColumns();
                if (cols == null || cols.isEmpty()) {
                    cols = Arrays.asList("employeeName", "empresa", "setor", "periodoAquisitivo", "dataInicio", "dataFim", "dias", "status");
                }
                int lastCol = Math.max(0, cols.size() - 1);
                int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, company, "RELATÓRIO GERENCIAL DE FÉRIAS", lastCol);

                Row headerRow = sheet.createRow(rowIndex++);
                for (int i = 0; i < cols.size(); i++) {
                    org.apache.poi.ss.usermodel.Cell c = headerRow.createCell(i);
                    c.setCellValue(getVacationColHeader(cols.get(i)));
                    c.setCellStyle(headerStyle);
                }

                List<Vacation> vacations = getFeriasData(req);
                for (Vacation v : vacations) {
                    Row row = sheet.createRow(rowIndex++);
                    for (int i = 0; i < cols.size(); i++) {
                        org.apache.poi.ss.usermodel.Cell c = row.createCell(i);
                        c.setCellValue(getVacationColValue(cols.get(i), v, df));
                        c.setCellStyle(textStyle);
                    }
                }

                for (int i = 0; i < cols.size(); i++) {
                    sheet.autoSizeColumn(i);
                }
                excelReportLayoutService.addFooter(sheet, workbook, company, lastCol);
            }

            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                workbook.write(outputStream);
                return outputStream.toByteArray();
            }
        }
    }

    public byte[] generateExperienciaPDFReport(FeriasReportDTO filters) throws IOException {
        if (filters == null) filters = new FeriasReportDTO();
        filters.setReportType("EXPERIENCIA");
        filters.setFormato("PDF");
        return generateCustomFeriasPDFReport(filters);
    }

    public byte[] generateConsolidadoExcelReport(FeriasReportDTO filters) throws IOException {
        if (filters == null) filters = new FeriasReportDTO();
        filters.setReportType("CONSOLIDADO");
        filters.setFormato("EXCEL");
        return generateCustomFeriasExcelReport(filters);
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
        if (filters == null) filters = new FeriasReportDTO();
        filters.setReportType("FERIAS");
        filters.setFormato("PDF");
        return generateCustomFeriasPDFReport(filters);
    }

    public byte[] generateAfastamentosPDFReport(FeriasReportDTO filters) throws IOException {
        if (filters == null) filters = new FeriasReportDTO();
        filters.setReportType("AFASTAMENTOS");
        filters.setFormato("PDF");
        return generateCustomFeriasPDFReport(filters);
    }

    /**
     * Gera relatório executivo customizado em PDF para Férias, Afastamentos ou Experiência,
     * utilizando rigorosamente o mesmo design de cabeçalho, degradê, grid de filtros e tabelas
     * do Contas a Pagar.
     */
    public byte[] generateCustomFeriasPDFReport(FeriasReportDTO req) throws IOException {
        Company company = resolveCompany();
        UUID companyId = company != null ? company.getId() : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(null)
                    .showHeader(false) // Desativa cabeçalho antigo
                    .showFooterContentSeparator(true)
                    .showFooterBackgroundLine(false)
                    .includeEmailInFooter(true)
                    .showPageNumbers(true)
                    .landscape(true)
                    .topMargin(18f)
                    .marginExtraTop(0f)
                    .bottomMargin(75f)
                    .leftMargin(20f)
                    .rightMargin(20f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            String type = req.getReportType() != null ? req.getReportType().toUpperCase() : "FERIAS";
            String title;
            String badge;
            switch (type) {
                case "AFASTAMENTOS":
                    title = "RELATÓRIO DE AFASTAMENTOS E LICENÇAS";
                    badge = "AFASTAMENTOS";
                    break;
                case "EXPERIENCIA":
                    title = "RELATÓRIO DE PERÍODO DE EXPERIÊNCIA";
                    badge = "EXPERIÊNCIA";
                    break;
                default:
                    title = "RELATÓRIO GERENCIAL DE FÉRIAS";
                    badge = "FÉRIAS";
                    break;
            }

            // 1. Período
            String periodBadge = "TODOS OS REGISTROS";
            if (req.getDataInicio() != null && req.getDataFim() != null) {
                periodBadge = req.getDataInicio().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " a "
                        + req.getDataFim().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } else if (req.getDataInicio() != null) {
                periodBadge = "A partir de " + req.getDataInicio().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } else if (req.getDataFim() != null) {
                periodBadge = "Até " + req.getDataFim().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }

            // 1. Cabeçalho Executivo Escuro (#0f172a) com Logo
            addExecutiveHeader(document, company, title, badge, periodBadge);

            // 2. Identificação e Filtros do Relatório
            addSectionHeader(document, "IDENTIFICAÇÃO E FILTROS DO RELATÓRIO");

            Table filterGrid = new Table(UnitValue.createPercentArray(new float[]{14f, 36f, 14f, 36f})).useAllAvailableWidth();
            filterGrid.setMarginBottom(8f);

            String empStr = req.getEmpresa() != null && !req.getEmpresa().isBlank() ? req.getEmpresa() : "Todas as Empresas";
            String statusStr = req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "Todos";
            String tipoFiltro = req.getTipo() != null && !req.getTipo().isBlank() ? req.getTipo() : "Todos";

            if ("AFASTAMENTOS".equals(type)) {
                List<Absence> absences = getAfastamentosData(req);
                addGridRow(filterGrid, "PERÍODO:", periodBadge, "TOTAL REGISTROS:", String.valueOf(absences.size()));
                addGridRow(filterGrid, "EMPRESA:", empStr, "STATUS:", statusStr);
                addGridRow(filterGrid, "TIPO AFASTAMENTO:", tipoFiltro, "MÓDULO:", "RH / Operacional");
                document.add(filterGrid);

                addSectionHeader(document, "DETALHAMENTO DOS AFASTAMENTOS");
                List<String> cols = req.getSelectedColumns();
                if (cols == null || cols.isEmpty()) {
                    cols = Arrays.asList("employeeName", "empresa", "setor", "tipo", "dataInicio", "status", "motivo");
                }
                if (absences.isEmpty()) {
                    document.add(new Paragraph("Nenhum afastamento encontrado com os filtros selecionados.")
                            .setTextAlignment(TextAlignment.CENTER).setFontSize(9.5f).setItalic().setMarginTop(15));
                } else {
                    Table table = createCustomAbsencesTable(cols, absences);
                    document.add(table);
                    addTotalSummary(document, "TOTAL GERAL (" + absences.size() + " afastamento" + (absences.size() > 1 ? "s" : "") + ")");
                }

            } else if ("EXPERIENCIA".equals(type)) {
                List<Employee> employees = getExperienciaData(req);
                LocalDate hoje = LocalDate.now();
                long emAndamento = employees.stream().filter(e -> {
                    LocalDate adm = e.getHireDate();
                    int d1 = parseDays(e.getPrazoExperienciaTexto(), 45);
                    int d2 = parseDays(e.getProrrogacaoExperiencia(), 45);
                    return !adm.plusDays(d1 + d2).isBefore(hoje);
                }).count();
                long concluidas = employees.size() - emAndamento;

                addGridRow(filterGrid, "PERÍODO:", periodBadge, "TOTAL REGISTROS:", String.valueOf(employees.size()));
                addGridRow(filterGrid, "EMPRESA:", empStr, "STATUS:", "Em Andamento: " + emAndamento + " | Concluídas: " + concluidas);
                addGridRow(filterGrid, "TIPO:", "Contrato de Experiência (CLT)", "MÓDULO:", "RH / Operacional");
                document.add(filterGrid);

                addSectionHeader(document, "DETALHAMENTO DO PERÍODO DE EXPERIÊNCIA");
                List<String> cols = req.getSelectedColumns();
                if (cols == null || cols.isEmpty()) {
                    cols = Arrays.asList("employeeName", "empresa", "setor", "dataAdmissao", "fim1Fase", "fimExperiencia", "diasRestantes", "status");
                }
                if (employees.isEmpty()) {
                    document.add(new Paragraph("Nenhum funcionário em experiência encontrado com os filtros selecionados.")
                            .setTextAlignment(TextAlignment.CENTER).setFontSize(9.5f).setItalic().setMarginTop(15));
                } else {
                    Table table = createCustomExperienciaTable(cols, employees);
                    document.add(table);
                    addTotalSummary(document, "TOTAL GERAL (" + employees.size() + " funcionário" + (employees.size() > 1 ? "s" : "") + " avaliado" + (employees.size() > 1 ? "s" : "") + ")");
                }

            } else {
                // FERIAS
                List<Vacation> vacations = getFeriasData(req);
                int totalDias = vacations.stream().mapToInt(v -> v.getDaysTaken() != null ? v.getDaysTaken() : 0).sum();

                addGridRow(filterGrid, "PERÍODO:", periodBadge, "TOTAL REGISTROS:", String.valueOf(vacations.size()));
                addGridRow(filterGrid, "EMPRESA:", empStr, "STATUS:", statusStr);
                addGridRow(filterGrid, "TIPO FÉRIAS:", tipoFiltro, "TOTAL DIAS GOZADOS:", String.valueOf(totalDias) + " dias");
                document.add(filterGrid);

                addSectionHeader(document, "DETALHAMENTO DE FÉRIAS");
                List<String> cols = req.getSelectedColumns();
                if (cols == null || cols.isEmpty()) {
                    cols = Arrays.asList("employeeName", "empresa", "setor", "periodoAquisitivo", "dataInicio", "dataFim", "dias", "status");
                }
                if (vacations.isEmpty()) {
                    document.add(new Paragraph("Nenhum registro de férias encontrado com os filtros selecionados.")
                            .setTextAlignment(TextAlignment.CENTER).setFontSize(9.5f).setItalic().setMarginTop(15));
                } else {
                    Table table = createCustomVacationsTable(cols, vacations);
                    document.add(table);
                    addTotalSummary(document, "TOTAL GERAL (" + vacations.size() + " registros de férias | " + totalDias + " dias gozados)");
                }
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF executivo de férias: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    private void addTotalSummary(Document document, String summaryText) {
        Table totalTable = new Table(UnitValue.createPercentArray(new float[]{60f, 40f})).useAllAvailableWidth();
        totalTable.setMarginTop(8f);
        Cell emptyCell = new Cell().setBorder(Border.NO_BORDER);
        Cell totalCell = new Cell()
                .setBackgroundColor(SLATE_LIGHT)
                .setBorder(new SolidBorder(RED_PRIMARY, 1f))
                .setPadding(6f)
                .setTextAlignment(TextAlignment.RIGHT);
        totalCell.add(new Paragraph(summaryText)
                .setFontSize(9.5f)
                .setBold()
                .setFontColor(RED_DARK));
        totalTable.addCell(emptyCell);
        totalTable.addCell(totalCell);
        document.add(totalTable);
    }

    // ==========================================
    // MÉTODOS VISUAIS DO LAYOUT EXECUTIVO
    // ==========================================

    private Image loadCompanyLogoImage(Company company) {
        String logoUrl = company != null ? company.getLogoUrl() : null;
        try {
            ImageData imageData = null;

            if (logoUrl != null && !logoUrl.isBlank()) {
                if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
                    try {
                        imageData = ImageDataFactory.create(logoUrl);
                    } catch (Exception ignored) {}
                }

                if (imageData == null) {
                    String clean = logoUrl.replace("/api/uploads/companies/logos/", "")
                            .replace("api/uploads/companies/logos/", "")
                            .replace("/uploads/companies/logos/", "")
                            .replace("uploads/companies/logos/", "");

                    java.nio.file.Path[] uploadCandidates = new java.nio.file.Path[] {
                            java.nio.file.Paths.get(logoUrl),
                            java.nio.file.Paths.get("backend", "uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get("uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get(uploadDir != null ? uploadDir : "uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get("c:/dev/secured-guard/backend/uploads/companies/logos", clean),
                            java.nio.file.Paths.get("c:/dev/secured-guard/uploads/companies/logos", clean)
                    };

                    for (java.nio.file.Path p : uploadCandidates) {
                        if (java.nio.file.Files.exists(p)) {
                            try {
                                imageData = ImageDataFactory.create(java.nio.file.Files.readAllBytes(p));
                                break;
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }

            if (imageData == null) {
                String[] classpathResources = new String[] {
                        "static/certificates/nr06/promover-logo.png",
                        "static/email-marketing/promover-logomarca.png",
                        "static/email-marketing/promover-logo.png"
                };

                for (String cpRes : classpathResources) {
                    try {
                        org.springframework.core.io.ClassPathResource cpr = new org.springframework.core.io.ClassPathResource(cpRes);
                        if (cpr.exists()) {
                            try (java.io.InputStream is = cpr.getInputStream()) {
                                byte[] bytes = is.readAllBytes();
                                if (bytes.length > 0) {
                                    imageData = ImageDataFactory.create(bytes);
                                    break;
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }

            if (imageData == null) {
                java.nio.file.Path[] fileCandidates = new java.nio.file.Path[] {
                        java.nio.file.Paths.get("c:/dev/secured-guard/backend/src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("backend/src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("c:/dev/secured-guard/frontend/public/promover-logo.png"),
                        java.nio.file.Paths.get("frontend/public/promover-logo.png"),
                        java.nio.file.Paths.get("c:/dev/secured-guard/frontend/public/logo-sistema.png")
                };

                for (java.nio.file.Path p : fileCandidates) {
                    if (java.nio.file.Files.exists(p)) {
                        try {
                            imageData = ImageDataFactory.create(java.nio.file.Files.readAllBytes(p));
                            break;
                        } catch (Exception ignored) {}
                    }
                }
            }

            if (imageData != null) {
                Image img = new Image(imageData);
                img.setMaxWidth(52f);
                img.setMaxHeight(32f);
                img.setAutoScale(true);
                return img;
            }
        } catch (Exception e) {
            log.warn("Não foi possível carregar logo da empresa: {}", e.getMessage());
        }
        return null;
    }

    private void addExecutiveHeader(Document document, Company company, String reportTitle, String badgeText, String periodOrCodeText) {
        Table headerContainer = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth();
        headerContainer.setBorder(new SolidBorder(new DeviceRgb(30, 41, 59), 1f));
        headerContainer.setMarginBottom(4f);

        Cell wrapperCell = new Cell()
                .setBackgroundColor(new DeviceRgb(15, 23, 42)) // #0f172a Dark profundo corporativo
                .setPadding(8f)
                .setBorder(Border.NO_BORDER);

        Table innerTable = new Table(UnitValue.createPercentArray(new float[]{60f, 40f})).useAllAvailableWidth();
        innerTable.setBorder(Border.NO_BORDER);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);

        Image logoImg = loadCompanyLogoImage(company);
        String defaultCompName = "PROMOVER VIGILÂNCIA PATRIMONIAL LTDA";
        String defaultCnpj = "43.576.260/0001-12";
        String defaultAddr = "Rua Marte, 526 - Jardim Riacho das Pedras - Contagem/MG - 32241-250";

        String compName = (company != null && company.getName() != null && !company.getName().isBlank())
                ? company.getName().toUpperCase()
                : defaultCompName;

        StringBuilder addressSb = new StringBuilder();
        if (company != null) {
            if (company.getCnpj() != null && !company.getCnpj().isBlank()) {
                addressSb.append("CNPJ: ").append(CompanyDataFormatter.formatCnpj(company.getCnpj()));
            }
            String fullAddr = CompanyDataFormatter.formatFullAddress(company);
            if (fullAddr != null && !fullAddr.isBlank()) {
                if (addressSb.length() > 0) addressSb.append(" • ");
                addressSb.append(fullAddr);
            }
        }
        if (addressSb.length() == 0) {
            addressSb.append("CNPJ: ").append(defaultCnpj).append(" • ").append(defaultAddr);
        }

        if (logoImg != null) {
            Table compBox = new Table(UnitValue.createPercentArray(new float[]{16f, 84f})).useAllAvailableWidth();
            compBox.setBorder(Border.NO_BORDER);

            Cell logoCell = new Cell()
                    .setBorder(Border.NO_BORDER)
                    .setPadding(0f)
                    .setTextAlignment(TextAlignment.LEFT)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .add(logoImg);

            Cell infoCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPaddingLeft(8f);
            infoCell.add(new Paragraph(compName)
                    .setFontSize(10f)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setMarginBottom(2f));

            infoCell.add(new Paragraph(addressSb.toString())
                    .setFontSize(6.8f)
                    .setFontColor(new DeviceRgb(203, 213, 225))
                    .setMarginBottom(0f));

            compBox.addCell(logoCell);
            compBox.addCell(infoCell);
            leftCell.add(compBox);
        } else {
            leftCell.add(new Paragraph(compName)
                    .setFontSize(10.5f)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setMarginBottom(2f));

            leftCell.add(new Paragraph(addressSb.toString())
                    .setFontSize(7f)
                    .setFontColor(new DeviceRgb(203, 213, 225))
                    .setMarginBottom(0f));
        }

        innerTable.addCell(leftCell);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.MIDDLE);

        rightCell.add(new Paragraph(reportTitle != null ? reportTitle.toUpperCase() : "RELATÓRIO GERENCIAL")
                .setFontSize(13f)
                .setBold()
                .setFontColor(new DeviceRgb(248, 113, 113))
                .setMarginBottom(2.5f));

        Paragraph metaPara = new Paragraph().setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2.5f);
        if (badgeText != null && !badgeText.isBlank()) {
            metaPara.add(new Text(" " + badgeText.toUpperCase() + " ")
                    .setFontSize(7.5f)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setBackgroundColor(new DeviceRgb(30, 41, 59)));
            metaPara.add("  ");
        }
        if (periodOrCodeText != null && !periodOrCodeText.isBlank()) {
            metaPara.add(new Text(" " + periodOrCodeText + " ")
                    .setFontSize(7.5f)
                    .setBold()
                    .setFontColor(new DeviceRgb(251, 191, 36)));
        }
        if (!metaPara.getChildren().isEmpty()) {
            rightCell.add(metaPara);
        }

        rightCell.add(new Paragraph("Data de Emissão: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .setFontSize(7f)
                .setFontColor(new DeviceRgb(148, 163, 184))
                .setMarginBottom(0f));

        innerTable.addCell(rightCell);
        wrapperCell.add(innerTable);
        headerContainer.addCell(wrapperCell);
        document.add(headerContainer);

        // Barra inferior com degradê idêntico ao Contas a Pagar (Vermelho -> Laranja -> Ouro)
        Table divider = new Table(UnitValue.createPercentArray(new float[]{40f, 35f, 25f})).useAllAvailableWidth();
        divider.setBorder(Border.NO_BORDER);
        divider.setMarginTop(0f);
        divider.setMarginBottom(6f);

        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(RED_PRIMARY).setBorder(Border.NO_BORDER).setPadding(0f));
        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(new DeviceRgb(249, 115, 22)).setBorder(Border.NO_BORDER).setPadding(0f));
        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(new DeviceRgb(234, 179, 8)).setBorder(Border.NO_BORDER).setPadding(0f));

        document.add(divider);
    }

    private void addSectionHeader(Document document, String title) {
        Table secTable = new Table(UnitValue.createPercentArray(new float[]{0.6f, 99.4f})).useAllAvailableWidth();
        secTable.setBorder(Border.NO_BORDER);
        secTable.setMarginTop(6f);
        secTable.setMarginBottom(3f);

        Cell barCell = new Cell().setBackgroundColor(RED_PRIMARY).setBorder(Border.NO_BORDER).setPadding(0f);
        Cell textCell = new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(4f).setPaddingTop(0f).setPaddingBottom(0f);
        textCell.add(new Paragraph(title.toUpperCase())
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(RED_PRIMARY));

        secTable.addCell(barCell);
        secTable.addCell(textCell);
        document.add(secTable);
    }

    private void addGridRow(Table table, String label1, String val1, String label2, String val2) {
        table.addCell(new Cell()
                .add(new Paragraph(label1).setFontSize(7f).setBold().setFontColor(new DeviceRgb(71, 85, 105)))
                .setBackgroundColor(SLATE_LIGHT)
                .setBorder(new SolidBorder(SLATE_BORDER, 0.5f))
                .setPadding(3f));
        table.addCell(new Cell()
                .add(new Paragraph(val1 != null ? val1 : "-").setFontSize(7.5f).setFontColor(SLATE_DARK))
                .setBackgroundColor(ColorConstants.WHITE)
                .setBorder(new SolidBorder(SLATE_BORDER, 0.5f))
                .setPadding(3f));

        table.addCell(new Cell()
                .add(new Paragraph(label2).setFontSize(7f).setBold().setFontColor(new DeviceRgb(71, 85, 105)))
                .setBackgroundColor(SLATE_LIGHT)
                .setBorder(new SolidBorder(SLATE_BORDER, 0.5f))
                .setPadding(3f));
        table.addCell(new Cell()
                .add(new Paragraph(val2 != null ? val2 : "-").setFontSize(7.5f).setBold().setFontColor(SLATE_DARK))
                .setBackgroundColor(ColorConstants.WHITE)
                .setBorder(new SolidBorder(SLATE_BORDER, 0.5f))
                .setPadding(3f));
    }

    // ==========================================
    // CRIAÇÃO DE TABELAS DINÂMICAS (PDF)
    // ==========================================

    private Table createCustomVacationsTable(List<String> cols, List<Vacation> vacations) {
        float[] rawWidths = new float[cols.size()];
        float totalRawWidth = 0f;
        for (int i = 0; i < cols.size(); i++) {
            rawWidths[i] = getVacationColWidth(cols.get(i), cols.size());
            totalRawWidth += rawWidths[i];
        }

        float[] normalizedWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            normalizedWidths[i] = (rawWidths[i] / totalRawWidth) * 100f;
        }

        Table table = new Table(UnitValue.createPercentArray(normalizedWidths)).useAllAvailableWidth();
        table.setMarginBottom(4f);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        int numCols = cols.size();
        float headerFontSize = numCols >= 9 ? 5.5f : (numCols >= 7 ? 6.0f : 6.8f);
        float dataFontSize = numCols >= 9 ? 5.2f : (numCols >= 7 ? 5.8f : 6.8f);
        float cellPadding = numCols >= 9 ? 1.2f : (numCols >= 7 ? 1.8f : 2.2f);

        for (String col : cols) {
            table.addHeaderCell(createHeaderCell(getVacationColHeader(col), getColAlignment(col), headerFontSize, cellPadding));
        }

        boolean isAlt = false;
        for (Vacation v : vacations) {
            for (String col : cols) {
                if ("status".equalsIgnoreCase(col)) {
                    table.addCell(createStatusBadgeCell(v.getStatus() != null ? v.getStatus().name() : "PENDING", isAlt, dataFontSize, cellPadding));
                } else {
                    String val = getVacationColValue(col, v, df);
                    boolean isBold = "dias".equalsIgnoreCase(col) || "employeeName".equalsIgnoreCase(col);
                    table.addCell(createDataCell(val, getColAlignment(col), isAlt, isBold, dataFontSize, cellPadding));
                }
            }
            isAlt = !isAlt;
        }

        return table;
    }

    private Table createCustomAbsencesTable(List<String> cols, List<Absence> absences) {
        float[] rawWidths = new float[cols.size()];
        float totalRawWidth = 0f;
        for (int i = 0; i < cols.size(); i++) {
            rawWidths[i] = getAbsenceColWidth(cols.get(i), cols.size());
            totalRawWidth += rawWidths[i];
        }

        float[] normalizedWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            normalizedWidths[i] = (rawWidths[i] / totalRawWidth) * 100f;
        }

        Table table = new Table(UnitValue.createPercentArray(normalizedWidths)).useAllAvailableWidth();
        table.setMarginBottom(4f);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        int numCols = cols.size();
        float headerFontSize = numCols >= 9 ? 5.5f : (numCols >= 7 ? 6.0f : 6.8f);
        float dataFontSize = numCols >= 9 ? 5.2f : (numCols >= 7 ? 5.8f : 6.8f);
        float cellPadding = numCols >= 9 ? 1.2f : (numCols >= 7 ? 1.8f : 2.2f);

        for (String col : cols) {
            table.addHeaderCell(createHeaderCell(getAbsenceColHeader(col), getColAlignment(col), headerFontSize, cellPadding));
        }

        boolean isAlt = false;
        for (Absence a : absences) {
            for (String col : cols) {
                if ("status".equalsIgnoreCase(col)) {
                    table.addCell(createStatusBadgeCell(a.getStatus() != null ? a.getStatus().name() : "PENDING", isAlt, dataFontSize, cellPadding));
                } else {
                    String val = getAbsenceColValue(col, a, df);
                    boolean isBold = "employeeName".equalsIgnoreCase(col);
                    table.addCell(createDataCell(val, getColAlignment(col), isAlt, isBold, dataFontSize, cellPadding));
                }
            }
            isAlt = !isAlt;
        }

        return table;
    }

    private Table createCustomExperienciaTable(List<String> cols, List<Employee> employees) {
        float[] rawWidths = new float[cols.size()];
        float totalRawWidth = 0f;
        for (int i = 0; i < cols.size(); i++) {
            rawWidths[i] = getExperienciaColWidth(cols.get(i), cols.size());
            totalRawWidth += rawWidths[i];
        }

        float[] normalizedWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            normalizedWidths[i] = (rawWidths[i] / totalRawWidth) * 100f;
        }

        Table table = new Table(UnitValue.createPercentArray(normalizedWidths)).useAllAvailableWidth();
        table.setMarginBottom(4f);
        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        LocalDate hoje = LocalDate.now();

        int numCols = cols.size();
        float headerFontSize = numCols >= 9 ? 5.5f : (numCols >= 7 ? 6.0f : 6.8f);
        float dataFontSize = numCols >= 9 ? 5.2f : (numCols >= 7 ? 5.8f : 6.8f);
        float cellPadding = numCols >= 9 ? 1.2f : (numCols >= 7 ? 1.8f : 2.2f);

        for (String col : cols) {
            table.addHeaderCell(createHeaderCell(getExperienciaColHeader(col), getColAlignment(col), headerFontSize, cellPadding));
        }

        boolean isAlt = false;
        for (Employee emp : employees) {
            LocalDate admissao = emp.getHireDate();
            int dias1 = parseDays(emp.getPrazoExperienciaTexto(), 45);
            int dias2 = parseDays(emp.getProrrogacaoExperiencia(), 45);
            LocalDate fim1 = admissao.plusDays(dias1);
            LocalDate fimTotal = fim1.plusDays(dias2);

            for (String col : cols) {
                if ("status".equalsIgnoreCase(col)) {
                    String statusText = fimTotal.isBefore(hoje) ? "CONCLUÍDA" : "EM ANDAMENTO";
                    table.addCell(createStatusBadgeCell(statusText, isAlt, dataFontSize, cellPadding));
                } else {
                    String val = getExperienciaColValue(col, emp, df, admissao, fim1, fimTotal, hoje);
                    boolean isBold = "employeeName".equalsIgnoreCase(col) || "diasRestantes".equalsIgnoreCase(col);
                    table.addCell(createDataCell(val, getColAlignment(col), isAlt, isBold, dataFontSize, cellPadding));
                }
            }
            isAlt = !isAlt;
        }

        return table;
    }

    private Cell createHeaderCell(String text, TextAlignment alignment, float fontSize, float padding) {
        return new Cell()
                .add(new Paragraph(text != null ? text.toUpperCase() : "")
                        .setFontSize(fontSize)
                        .setBold()
                        .setFontColor(ColorConstants.WHITE)
                        .setMultipliedLeading(0.9f))
                .setTextAlignment(alignment != null ? alignment : TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setBackgroundColor(SLATE_DARK)
                .setBorder(new SolidBorder(SLATE_DARK, 0.5f))
                .setPaddingLeft(padding)
                .setPaddingRight(padding)
                .setPaddingTop(2.5f)
                .setPaddingBottom(2.5f);
    }

    private Cell createDataCell(String text, TextAlignment alignment, boolean isAltRow, boolean isBold, float fontSize, float padding) {
        Paragraph p = new Paragraph(text != null ? text : "")
                .setFontSize(fontSize)
                .setMultipliedLeading(0.95f);
        if (isBold) {
            p.setBold();
        }
        return new Cell()
                .add(p)
                .setTextAlignment(alignment != null ? alignment : TextAlignment.LEFT)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setBackgroundColor(isAltRow ? ROW_ALT : ColorConstants.WHITE)
                .setBorder(new SolidBorder(SLATE_BORDER, 0.5f))
                .setPaddingLeft(padding)
                .setPaddingRight(padding)
                .setPaddingTop(1.8f)
                .setPaddingBottom(1.8f);
    }

    private Cell createStatusBadgeCell(String status, boolean isAltRow, float fontSize, float padding) {
        DeviceRgb textColor;
        String s = status != null ? status.toUpperCase() : "";
        if (s.contains("APROV") || s.contains("CONCLU")) {
            textColor = GREEN_TEXT;
        } else if (s.contains("PEND") || s.contains("ANDAMENTO")) {
            textColor = AMBER_TEXT;
        } else {
            textColor = RED_PRIMARY;
        }

        Paragraph p = new Paragraph("[" + s + "]")
                .setFontSize(fontSize)
                .setBold()
                .setFontColor(textColor)
                .setMultipliedLeading(0.95f);

        return new Cell()
                .add(p)
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setBackgroundColor(isAltRow ? ROW_ALT : ColorConstants.WHITE)
                .setBorder(new SolidBorder(SLATE_BORDER, 0.5f))
                .setPaddingLeft(padding)
                .setPaddingRight(padding)
                .setPaddingTop(1.8f)
                .setPaddingBottom(1.8f);
    }

    private TextAlignment getColAlignment(String colKey) {
        return switch (colKey) {
            case "dataInicio", "dataFim", "dataAdmissao", "fim1Fase", "fimExperiencia", "dataAprovacao", "data" -> TextAlignment.CENTER;
            case "dias", "diasRestantes" -> TextAlignment.RIGHT;
            case "status", "empresa", "tipo" -> TextAlignment.CENTER;
            default -> TextAlignment.LEFT;
        };
    }

    // Férias Mappers
    private float getVacationColWidth(String col, int totalCols) {
        return switch (col) {
            case "employeeName" -> totalCols >= 8 ? 20f : 24f;
            case "periodoAquisitivo" -> 16f;
            case "setor" -> 16f;
            case "empresa" -> 10f;
            case "dataInicio", "dataFim", "dataAprovacao" -> 12f;
            case "dias" -> 8f;
            case "tipo" -> 14f;
            case "status" -> 12f;
            default -> 12f;
        };
    }

    private String getVacationColHeader(String col) {
        return switch (col) {
            case "employeeName" -> "Funcionário";
            case "empresa" -> "Empresa";
            case "setor" -> "Setor de Trabalho";
            case "periodoAquisitivo" -> "Período Aquisitivo";
            case "dataInicio" -> "Data Início";
            case "dataFim" -> "Data Fim";
            case "dias" -> "Dias";
            case "tipo" -> "Tipo de Férias";
            case "status" -> "Status";
            case "dataAprovacao" -> "Aprovação";
            default -> col;
        };
    }

    private String getVacationColValue(String col, Vacation v, DateTimeFormatter df) {
        Employee e = v.getEmployee();
        return switch (col) {
            case "employeeName" -> e != null ? e.getName() : "Funcionário removido";
            case "empresa" -> safeCompanySigla(e);
            case "setor" -> safeDepartmentName(e);
            case "periodoAquisitivo" -> periodoAquisitivo(v);
            case "dataInicio" -> v.getStartDate() != null ? v.getStartDate().format(df) : "-";
            case "dataFim" -> v.getEndDate() != null ? v.getEndDate().format(df) : "-";
            case "dias" -> v.getDaysTaken() != null ? String.valueOf(v.getDaysTaken()) : "0";
            case "tipo" -> v.getVacationType() != null ? v.getVacationType().name() : "NORMAL";
            case "status" -> v.getStatus() != null ? v.getStatus().name() : "PENDING";
            case "dataAprovacao" -> v.getApprovalDate() != null ? v.getApprovalDate().format(df) : "-";
            default -> "-";
        };
    }

    // Afastamentos Mappers
    private float getAbsenceColWidth(String col, int totalCols) {
        return switch (col) {
            case "employeeName" -> totalCols >= 8 ? 20f : 24f;
            case "tipo" -> 16f;
            case "motivo" -> 22f;
            case "observacoes" -> 20f;
            case "setor" -> 16f;
            case "empresa" -> 10f;
            case "dataInicio", "dataFim", "data" -> 12f;
            case "dias" -> 8f;
            case "status" -> 12f;
            default -> 12f;
        };
    }

    private String getAbsenceColHeader(String col) {
        return switch (col) {
            case "employeeName" -> "Funcionário";
            case "empresa" -> "Empresa";
            case "setor" -> "Setor de Trabalho";
            case "tipo" -> "Tipo Afastamento";
            case "dataInicio", "data" -> "Data";
            case "dataFim" -> "Data Término";
            case "dias" -> "Dias";
            case "motivo" -> "Motivo";
            case "status" -> "Status";
            case "observacoes" -> "Observações";
            default -> col;
        };
    }

    private String getAbsenceColValue(String col, Absence a, DateTimeFormatter df) {
        Employee e = a.getEmployee();
        return switch (col) {
            case "employeeName" -> e != null ? e.getName() : "Funcionário removido";
            case "empresa" -> safeCompanySigla(e);
            case "setor" -> safeDepartmentName(e);
            case "tipo" -> a.getAbsenceType() != null ? a.getAbsenceType().name() : "-";
            case "dataInicio", "data" -> a.getAbsenceDate() != null ? a.getAbsenceDate().format(df) : "-";
            case "dataFim" -> a.getAbsenceDate() != null ? a.getAbsenceDate().format(df) : "-";
            case "dias" -> a.getMedicalCertificateDays() != null ? String.valueOf(a.getMedicalCertificateDays()) : "1";
            case "motivo" -> a.getReason() != null ? a.getReason() : "-";
            case "status" -> a.getStatus() != null ? a.getStatus().name() : "-";
            case "observacoes" -> a.getCoverageNotes() != null ? a.getCoverageNotes() : "-";
            default -> "-";
        };
    }

    // Experiência Mappers
    private float getExperienciaColWidth(String col, int totalCols) {
        return switch (col) {
            case "employeeName" -> totalCols >= 8 ? 20f : 24f;
            case "setor" -> 16f;
            case "empresa" -> 10f;
            case "dataAdmissao", "fim1Fase", "fimExperiencia" -> 13f;
            case "diasRestantes" -> 11f;
            case "status" -> 14f;
            default -> 12f;
        };
    }

    private String getExperienciaColHeader(String col) {
        return switch (col) {
            case "employeeName" -> "Funcionário";
            case "empresa" -> "Empresa";
            case "setor" -> "Cargo / Setor";
            case "dataAdmissao" -> "Data Admissão";
            case "fim1Fase" -> "Fim 1ª Fase";
            case "fimExperiencia" -> "Fim Experiência";
            case "diasRestantes" -> "Dias Restantes";
            case "status" -> "Status Experiência";
            default -> col;
        };
    }

    private String getExperienciaColValue(String col, Employee emp, DateTimeFormatter df,
                                          LocalDate admissao, LocalDate fim1, LocalDate fimTotal, LocalDate hoje) {
        long diasRest = java.time.temporal.ChronoUnit.DAYS.between(hoje, fimTotal);
        return switch (col) {
            case "employeeName" -> emp.getName() != null ? emp.getName() : "-";
            case "empresa" -> safeCompanySigla(emp);
            case "setor" -> safeDepartmentName(emp);
            case "dataAdmissao" -> admissao != null ? admissao.format(df) : "-";
            case "fim1Fase" -> fim1 != null ? fim1.format(df) : "-";
            case "fimExperiencia" -> fimTotal != null ? fimTotal.format(df) : "-";
            case "diasRestantes" -> diasRest < 0 ? "Concluída" : String.valueOf(diasRest) + " d";
            case "status" -> fimTotal.isBefore(hoje) ? "CONCLUÍDA" : "EM ANDAMENTO";
            default -> "-";
        };
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
