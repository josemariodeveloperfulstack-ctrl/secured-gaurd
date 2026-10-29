package com.z7design.secured_guard.service;

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
import com.z7design.secured_guard.dto.CustomContasAPagarReportRequestDTO;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.Invoice;
import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ContasAPagarReportService {

    private final InvoiceService invoiceService;
    private final ReportTemplateService reportTemplateService;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    @org.springframework.beans.factory.annotation.Value("${app.upload.base-dir:${app.upload.dir:uploads}}")
    private String uploadDir;

    public ContasAPagarReportService(
            InvoiceService invoiceService,
            ReportTemplateService reportTemplateService,
            StandardReportLayoutService standardReportLayoutService,
            CompanyRepository companyRepository) {
        this.invoiceService = invoiceService;
        this.reportTemplateService = reportTemplateService;
        this.standardReportLayoutService = standardReportLayoutService;
        this.companyRepository = companyRepository;
    }

    private static final String CATEGORIA_RESCISAO_FUNCIONARIOS = "Rescisão de funcionários";

    // Cores do layout executivo padronizado
    private static final DeviceRgb RED_PRIMARY = new DeviceRgb(220, 38, 38);       // #dc2626
    private static final DeviceRgb RED_DARK = new DeviceRgb(185, 28, 28);          // #b91c1c
    private static final DeviceRgb SLATE_DARK = new DeviceRgb(30, 41, 59);         // #1e293b
    private static final DeviceRgb SLATE_LIGHT = new DeviceRgb(241, 245, 249);     // #f1f5f9
    private static final DeviceRgb SLATE_BORDER = new DeviceRgb(203, 213, 225);    // #cbd5e1
    private static final DeviceRgb ROW_ALT = new DeviceRgb(248, 250, 252);         // #f8fafc
    private static final DeviceRgb GREEN_TEXT = new DeviceRgb(22, 101, 52);        // #166534
    private static final DeviceRgb AMBER_TEXT = new DeviceRgb(180, 83, 9);         // #b45309

    /**
     * Gera relatório de contas a pagar por período (HTML)
     */
    public String generateContasAPagarReport(LocalDate startDate, LocalDate endDate) {
        log.info("Gerando relatório HTML de contas a pagar para período: {} a {}", startDate, endDate);
        try {
            List<Invoice> invoices = invoiceService.findByDueDateBetween(startDate, endDate);
            Map<String, Object> reportData = prepareReportData(invoices, startDate, endDate);
            return reportTemplateService.generateFullReport("contas-a-pagar", reportData);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório HTML de contas a pagar: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório de contas a pagar por status (HTML)
     */
    public String generateContasAPagarReportByStatus(ExpenseStatus status) {
        log.info("Gerando relatório HTML de contas a pagar por status: {}", status);
        try {
            List<Invoice> invoices = invoiceService.findByStatus(status);
            Map<String, Object> reportData = prepareReportData(invoices, null, null);
            reportData.put("reportTitle", "Relatório de Contas " + getStatusDisplayName(status));
            return reportTemplateService.generateFullReport("contas-a-pagar", reportData);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório HTML por status: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar por status com layout executivo
     */
    @Transactional(readOnly = true)
    public byte[] generateContasAPagarReportPDFByStatus(ExpenseStatus status) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar por status: {}", status);
        try {
            List<Invoice> invoices = invoiceService.findByStatus(status);
            return generateContasAPagarReportPDFWithIText(invoices, null, null, status, null);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF por status", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório de contas a pagar por tipo (HTML)
     */
    public String generateContasAPagarReportByType(ExpenseType type) {
        log.info("Gerando relatório HTML de contas a pagar por tipo: {}", type);
        try {
            List<Invoice> invoices = invoiceService.findByType(type);
            Map<String, Object> reportData = prepareReportData(invoices, null, null);
            reportData.put("reportTitle", "Relatório de " + getTypeDisplayName(type));
            return reportTemplateService.generateFullReport("contas-a-pagar", reportData);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório HTML por tipo: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar por tipo com layout executivo
     */
    @Transactional(readOnly = true)
    public byte[] generateContasAPagarReportPDFByType(ExpenseType type) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar por tipo: {}", type);
        try {
            List<Invoice> invoices = invoiceService.findByType(type);
            return generateContasAPagarReportPDFWithIText(invoices, null, null, null, type);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF por tipo", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório resumido de contas a pagar (HTML)
     */
    public String generateContasAPagarSummaryReport() {
        log.info("Gerando relatório HTML resumido de contas a pagar");
        try {
            List<Invoice> allInvoices = invoiceService.findAll();
            Map<String, Object> reportData = prepareSummaryData(allInvoices);
            return reportTemplateService.generateFullReport("contas-a-pagar", reportData);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório HTML resumido: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF resumido de contas a pagar com layout executivo
     */
    public byte[] generateContasAPagarSummaryReportPDF() throws IOException {
        log.info("Gerando relatório PDF resumido de contas a pagar");
        try {
            List<Invoice> allInvoices = invoiceService.findAll();
            return generateContasAPagarReportPDFWithITextResumo(allInvoices);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF resumido de contas a pagar", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar por período e filtros
     */
    @Transactional(readOnly = true)
    public byte[] generateContasAPagarReportPDF(LocalDate startDate, LocalDate endDate,
            ExpenseStatus statusFilter, ExpenseType typeFilter) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar - Período: {} a {}, Status: {}, Tipo: {}",
                startDate, endDate, statusFilter, typeFilter);
        try {
            List<Invoice> invoices;
            if (startDate != null && endDate != null) {
                invoices = invoiceService.findByDueDateBetween(startDate, endDate);
            } else {
                invoices = invoiceService.findAll();
            }

            if (statusFilter != null) {
                invoices = invoices.stream().filter(i -> i.getStatus() == statusFilter).collect(Collectors.toList());
            }
            if (typeFilter != null) {
                invoices = invoices.stream().filter(i -> i.getType() == typeFilter).collect(Collectors.toList());
            }

            return generateContasAPagarReportPDFWithIText(invoices, startDate, endDate, statusFilter, typeFilter);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de contas a pagar", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar por empresa (sigla)
     */
    @Transactional(readOnly = true)
    public byte[] generateContasAPagarReportPDFByCompany(String companySigla,
            LocalDate startDate, LocalDate endDate) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar por empresa: {}", companySigla);
        try {
            List<Invoice> invoices = invoiceService.findAll();
            if (companySigla != null && !companySigla.isBlank() && !"TODAS".equalsIgnoreCase(companySigla)) {
                invoices = invoices.stream()
                        .filter(i -> i.getCompanySigla() != null && i.getCompanySigla().equalsIgnoreCase(companySigla.trim()))
                        .collect(Collectors.toList());
            }
            if (startDate != null) {
                invoices = invoices.stream().filter(i -> i.getDueDate() != null && !i.getDueDate().isBefore(startDate)).collect(Collectors.toList());
            }
            if (endDate != null) {
                invoices = invoices.stream().filter(i -> i.getDueDate() != null && !i.getDueDate().isAfter(endDate)).collect(Collectors.toList());
            }

            CustomContasAPagarReportRequestDTO req = new CustomContasAPagarReportRequestDTO();
            req.setCompanySigla(companySigla);
            req.setStartDate(startDate);
            req.setEndDate(endDate);
            req.setGroupBy("NONE");
            req.setSelectedColumns(Arrays.asList("dueDate", "description", "supplier", "unit", "workSector", "category", "amount", "status"));

            return generateCustomPdfDocument(invoices, req);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF por empresa: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF personalizado com agrupamento, filtros dinâmicos e colunas selecionadas.
     */
    @Transactional(readOnly = true)
    public byte[] generateCustomContasAPagarReportPDF(CustomContasAPagarReportRequestDTO req) throws IOException {
        log.info("Gerando relatório PDF personalizado de contas a pagar: {}", req);
        try {
            List<Invoice> allInvoices = invoiceService.findAll();

            List<Invoice> filtered = allInvoices.stream().filter(invoice -> {
                LocalDate targetDate = invoice.getDueDate();
                if ("issueDate".equalsIgnoreCase(req.getDateField())) {
                    targetDate = invoice.getIssueDate();
                } else if ("paymentDate".equalsIgnoreCase(req.getDateField())) {
                    targetDate = invoice.getPaymentDate();
                }

                if (req.getStartDate() != null && (targetDate == null || targetDate.isBefore(req.getStartDate()))) {
                    return false;
                }
                if (req.getEndDate() != null && (targetDate == null || targetDate.isAfter(req.getEndDate()))) {
                    return false;
                }
                if (req.getStatus() != null && invoice.getStatus() != req.getStatus()) {
                    return false;
                }
                if (req.getExpiringInDays() != null && req.getExpiringInDays() > 0) {
                    LocalDate today = LocalDate.now();
                    LocalDate maxDueDate = today.plusDays(req.getExpiringInDays());
                    if (invoice.getDueDate() == null || invoice.getDueDate().isBefore(today) || invoice.getDueDate().isAfter(maxDueDate)) {
                        return false;
                    }
                    if (invoice.getStatus() != ExpenseStatus.PENDENTE) {
                        return false;
                    }
                }
                if (req.getType() != null && invoice.getType() != req.getType()) {
                    return false;
                }
                if (req.getSupplierId() != null && (invoice.getSupplier() == null || !req.getSupplierId().equals(invoice.getSupplier().getId()))) {
                    return false;
                }
                if (req.getUnitId() != null && (invoice.getUnit() == null || !req.getUnitId().equals(invoice.getUnit().getId()))) {
                    return false;
                }
                if (req.getWorkSector() != null && !req.getWorkSector().isBlank()) {
                    if (invoice.getWorkSector() == null || !invoice.getWorkSector().toLowerCase().contains(req.getWorkSector().trim().toLowerCase())) {
                        return false;
                    }
                }
                if (req.getCompanySigla() != null && !req.getCompanySigla().isBlank() && !"TODAS".equalsIgnoreCase(req.getCompanySigla())) {
                    if (invoice.getCompanySigla() == null || !invoice.getCompanySigla().equalsIgnoreCase(req.getCompanySigla().trim())) {
                        return false;
                    }
                }
                if (req.getSubcategoriaId() != null && (invoice.getSubcategoria() == null || !req.getSubcategoriaId().equals(invoice.getSubcategoria().getId()))) {
                    return false;
                }
                if (req.getEmployeeId() != null && (invoice.getEmployee() == null || !req.getEmployeeId().equals(invoice.getEmployee().getId()))) {
                    return false;
                }
                return true;
            }).sorted((a, b) -> {
                LocalDate dA = a.getDueDate();
                LocalDate dB = b.getDueDate();
                if ("issueDate".equalsIgnoreCase(req.getDateField())) {
                    dA = a.getIssueDate();
                    dB = b.getIssueDate();
                } else if ("paymentDate".equalsIgnoreCase(req.getDateField())) {
                    dA = a.getPaymentDate();
                    dB = b.getPaymentDate();
                }
                if (dA == null && dB == null) return 0;
                if (dA == null) return 1;
                if (dB == null) return -1;
                int cmpDate = dA.compareTo(dB);
                if (cmpDate != 0) return cmpDate;

                String sA = getFornecedorOuFuncionario(a);
                String sB = getFornecedorOuFuncionario(b);
                int cmpSupp = sA.compareToIgnoreCase(sB);
                if (cmpSupp != 0) return cmpSupp;

                String descA = a.getDescription() != null ? a.getDescription() : "";
                String descB = b.getDescription() != null ? b.getDescription() : "";
                return descA.compareToIgnoreCase(descB);
            }).collect(Collectors.toList());

            log.info("Contas filtradas para o relatório personalizado: {} de {}", filtered.size(), allInvoices.size());
            return generateCustomPdfDocument(filtered, req);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF personalizado de contas a pagar: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF personalizado: " + e.getMessage(), e);
        }
    }

    /**
     * Monta o documento PDF com layout executivo limpo (sem cabeçalho de onda / imagem pesada).
     */
    private byte[] generateCustomPdfDocument(List<Invoice> invoices, CustomContasAPagarReportRequestDTO req) throws IOException {
        Company company = resolveCompany(req != null ? req.getCompanySigla() : null, req != null ? req.getCompanyId() : null);
        UUID companyId = company != null ? company.getId() : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(null)
                    .showHeader(false) // Desativa cabeçalho com imagem/gradiente pesado
                    .showFooterContentSeparator(true)
                    .showFooterBackgroundLine(false)
                    .includeEmailInFooter(true)
                    .showPageNumbers(true) // Ativa a numeração de páginas (Página X de Y)
                    .landscape(true)
                    .topMargin(18f)
                    .marginExtraTop(0f)
                    .bottomMargin(75f) // Espaço adequado para o rodapé (15pt a 65pt) não colidir com o conteúdo
                    .leftMargin(20f)
                    .rightMargin(20f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // 1. Cabeçalho Executivo Limpo com Logo em destaque
            String periodBadge = "TODOS OS REGISTROS";
            if (req.getStartDate() != null && req.getEndDate() != null) {
                periodBadge = req.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " a " + req.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
            addExecutiveHeader(document, company, "RELATÓRIO DE CONTAS A PAGAR", "CONTAS A PAGAR", periodBadge);

            // 2. Identificação e Filtros do Relatório
            addSectionHeader(document, "IDENTIFICAÇÃO E FILTROS DO RELATÓRIO");

            BigDecimal totalGeral = invoices.stream()
                    .map(Invoice::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long contasAbertas = invoices.stream().filter(i -> i.getStatus() == ExpenseStatus.PENDENTE).count();
            long contasPagas = invoices.stream().filter(i -> i.getStatus() == ExpenseStatus.PAGA || i.getStatus() == ExpenseStatus.PAGA_ANTERIORMENTE).count();

            Table filterGrid = new Table(UnitValue.createPercentArray(new float[]{14f, 36f, 14f, 36f})).useAllAvailableWidth();
            filterGrid.setMarginBottom(8f);

            addGridRow(filterGrid, "PERÍODO:", periodBadge, "TOTAL REGISTROS:", String.valueOf(invoices.size()));
            
            String statusStr = req.getStatus() != null ? getStatusDisplayName(req.getStatus()) : "Todos (Abertas: " + contasAbertas + " | Pagas: " + contasPagas + ")";
            addGridRow(filterGrid, "STATUS:", statusStr, "VALOR TOTAL:", formatCurrency(totalGeral));

            String empStr = req.getCompanySigla() != null && !req.getCompanySigla().isBlank() ? req.getCompanySigla() : "Todas as Empresas";
            String setorStr = req.getWorkSector() != null && !req.getWorkSector().isBlank() ? req.getWorkSector() : "Todos os Setores";
            addGridRow(filterGrid, "EMPRESA:", empStr, "SETOR:", setorStr);

            document.add(filterGrid);

            // 3. Tabela de Contas a Pagar
            addSectionHeader(document, "DETALHAMENTO DAS CONTAS A PAGAR");

            List<String> cols = req.getSelectedColumns();
            if (cols == null || cols.isEmpty()) {
                cols = Arrays.asList("dueDate", "description", "supplier", "unit", "workSector", "category", "amount", "status");
            }

            if (invoices.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma conta a pagar encontrada com os filtros selecionados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(9.5f)
                        .setItalic()
                        .setMarginTop(15);
                document.add(noData);
            } else {
                String groupMode = req.getGroupBy() != null ? req.getGroupBy().toUpperCase() : "UNIT_SECTOR";

                if (!"NONE".equals(groupMode)) {
                    Map<String, List<Invoice>> grouped = groupInvoices(invoices, groupMode, req);

                    for (Map.Entry<String, List<Invoice>> entry : grouped.entrySet()) {
                        String groupHeader = entry.getKey();
                        List<Invoice> groupInvoices = entry.getValue();
                        groupInvoices.sort((a, b) -> {
                            LocalDate dA = a.getDueDate() != null ? a.getDueDate() : LocalDate.MIN;
                            LocalDate dB = b.getDueDate() != null ? b.getDueDate() : LocalDate.MIN;
                            int cmp = dA.compareTo(dB);
                            if (cmp != 0) return cmp;
                            return getFornecedorOuFuncionario(a).compareToIgnoreCase(getFornecedorOuFuncionario(b));
                        });

                        // Faixa de cabeçalho do grupo
                        Table groupBar = new Table(UnitValue.createPercentArray(new float[]{0.6f, 99.4f})).useAllAvailableWidth();
                        groupBar.setMarginTop(6f);
                        groupBar.setMarginBottom(3f);

                        Cell bar = new Cell().setBackgroundColor(RED_PRIMARY).setBorder(Border.NO_BORDER).setPadding(0f);
                        Cell title = new Cell().setBackgroundColor(SLATE_LIGHT).setBorder(Border.NO_BORDER).setPadding(4f);
                        title.add(new Paragraph(groupHeader.toUpperCase())
                                .setFontSize(8.5f)
                                .setBold()
                                .setFontColor(SLATE_DARK));

                        groupBar.addCell(bar);
                        groupBar.addCell(title);
                        document.add(groupBar);

                        // Tabela do grupo
                        Table table = createCustomTable(cols, groupInvoices);
                        document.add(table);

                        // Subtotal
                        BigDecimal subtotal = groupInvoices.stream()
                                .map(Invoice::getAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                        Paragraph subtotalPara = new Paragraph(String.format(
                                "Subtotal (%d conta%s): %s",
                                groupInvoices.size(),
                                groupInvoices.size() > 1 ? "s" : "",
                                formatCurrency(subtotal)))
                                .setFontSize(8f)
                                .setBold()
                                .setFontColor(SLATE_DARK)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginBottom(4f);
                        document.add(subtotalPara);
                    }
                } else {
                    Table table = createCustomTable(cols, invoices);
                    document.add(table);
                }

                // Totalizador Final
                Table totalTable = new Table(UnitValue.createPercentArray(new float[]{65f, 35f})).useAllAvailableWidth();
                totalTable.setMarginTop(8f);
                Cell emptyCell = new Cell().setBorder(Border.NO_BORDER);
                Cell totalCell = new Cell()
                        .setBackgroundColor(SLATE_LIGHT)
                        .setBorder(new SolidBorder(RED_PRIMARY, 1f))
                        .setPadding(6f)
                        .setTextAlignment(TextAlignment.RIGHT);
                totalCell.add(new Paragraph("TOTAL GERAL (" + invoices.size() + " contas): " + formatCurrency(totalGeral))
                        .setFontSize(10f)
                        .setBold()
                        .setFontColor(RED_DARK));
                totalTable.addCell(emptyCell);
                totalTable.addCell(totalCell);
                document.add(totalTable);
            }

            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();

            return standardReportLayoutService.finalizePdfBytes(baos, layoutConfig);

        } catch (Exception e) {
            log.error("Erro ao montar PDF executivo de contas a pagar: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar PDF: " + e.getMessage(), e);
        }
    }

    private Map<String, List<Invoice>> groupInvoices(List<Invoice> invoices, String groupMode, CustomContasAPagarReportRequestDTO req) {
        switch (groupMode) {
            case "WORK_SECTOR", "SETOR" -> {
                return invoices.stream().collect(
                        Collectors.groupingBy(i -> {
                            String s = i.getWorkSector() != null && !i.getWorkSector().isBlank() ? i.getWorkSector() : "Geral / Não especificado";
                            return "SETOR DE TRABALHO: " + s.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            case "UNIT", "UNIDADE" -> {
                return invoices.stream().collect(
                        Collectors.groupingBy(i -> {
                            String u = i.getUnit() != null && i.getUnit().getName() != null ? i.getUnit().getName() : "Sem Unidade";
                            return "UNIDADE: " + u.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            case "COMPANY", "EMPRESA" -> {
                // Agrupa por empresa garantindo que a VIG seja sempre a primeira chave
                Map<String, List<Invoice>> rawMap = invoices.stream().collect(
                        Collectors.groupingBy(i -> {
                            String c = i.getCompanySigla() != null && !i.getCompanySigla().isBlank() ? i.getCompanySigla().toUpperCase().trim() : "SEM EMPRESA";
                            return "EMPRESA: " + c;
                        }, Collectors.toList())
                );
                Map<String, List<Invoice>> sortedMap = new LinkedHashMap<>();
                // Primeiro adiciona VIG se existir
                rawMap.entrySet().stream()
                        .filter(e -> e.getKey().contains("VIG"))
                        .forEach(e -> sortedMap.put(e.getKey(), e.getValue()));
                // Depois adiciona as demais ordenadas alfabeticamente
                rawMap.entrySet().stream()
                        .filter(e -> !e.getKey().contains("VIG"))
                        .sorted(Map.Entry.comparingByKey())
                        .forEach(e -> sortedMap.put(e.getKey(), e.getValue()));
                return sortedMap;
            }
            case "PERIOD", "PERIODO" -> {
                return invoices.stream().collect(
                        Collectors.groupingBy(i -> {
                            LocalDate dt = "issueDate".equalsIgnoreCase(req.getDateField()) ? i.getIssueDate()
                                    : ("paymentDate".equalsIgnoreCase(req.getDateField()) ? i.getPaymentDate() : i.getDueDate());
                            if (dt == null) return "PERÍODO: NÃO ESPECIFICADO";
                            return "PERÍODO: " + dt.format(DateTimeFormatter.ofPattern("MM/yyyy"));
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            case "STATUS" -> {
                return invoices.stream().collect(
                        Collectors.groupingBy(i -> "STATUS: " + getStatusDisplayName(i.getStatus()).toUpperCase(),
                                LinkedHashMap::new, Collectors.toList())
                );
            }
            case "SUPPLIER", "FORNECEDOR" -> {
                return invoices.stream().collect(
                        Collectors.groupingBy(i -> "FORNECEDOR / BENEFICIÁRIO: " + getFornecedorOuFuncionario(i).toUpperCase(),
                                LinkedHashMap::new, Collectors.toList())
                );
            }
            default -> {
                return invoices.stream().collect(
                        Collectors.groupingBy(i -> {
                            String u = i.getUnit() != null && i.getUnit().getName() != null ? i.getUnit().getName() : "Sem Unidade";
                            String s = i.getWorkSector() != null && !i.getWorkSector().isBlank() ? i.getWorkSector() : "Geral / Não especificado";
                            return "UNIDADE: " + u.toUpperCase() + "   |   SETOR: " + s.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
        }
    }

    private byte[] generateContasAPagarReportPDFWithIText(List<Invoice> invoices,
            LocalDate startDate, LocalDate endDate,
            ExpenseStatus statusFilter, ExpenseType typeFilter) throws IOException {
        CustomContasAPagarReportRequestDTO req = new CustomContasAPagarReportRequestDTO();
        req.setStartDate(startDate);
        req.setEndDate(endDate);
        req.setStatus(statusFilter);
        req.setType(typeFilter);
        req.setGroupBy("UNIT_SECTOR");
        req.setSelectedColumns(Arrays.asList("dueDate", "description", "supplier", "unit", "workSector", "category", "amount", "status"));
        return generateCustomPdfDocument(invoices, req);
    }

    private byte[] generateContasAPagarReportPDFWithITextResumo(List<Invoice> invoices) throws IOException {
        CustomContasAPagarReportRequestDTO req = new CustomContasAPagarReportRequestDTO();
        req.setGroupBy("COMPANY");
        req.setSelectedColumns(Arrays.asList("dueDate", "description", "supplier", "unit", "category", "amount", "status", "company"));
        return generateCustomPdfDocument(invoices, req);
    }

    // ==========================================
    // MÉTODOS VISUAIS DO LAYOUT EXECUTIVO
    // ==========================================

    private Image loadCompanyLogoImage(Company company) {
        String logoUrl = company != null ? company.getLogoUrl() : null;
        try {
            ImageData imageData = null;

            // 1. Tenta carregar pelo logoUrl cadastrado na empresa
            if (logoUrl != null && !logoUrl.isBlank()) {
                if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
                    try {
                        imageData = ImageDataFactory.create(logoUrl);
                    } catch (Exception ex) {
                        log.debug("Falha ao carregar logo por URL remota: {}", ex.getMessage());
                    }
                }

                if (imageData == null) {
                    // Resolução de diretórios de uploads locais
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

            // 2. Busca o logo original da Promover com fundo transparente natural
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

            // 3. Fallback de arquivos em caminhos locais do projeto
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
        // Bloco Executivo Inteiriço com Fundo Preto / Dark Navy Profissional (#090d16)
        Table headerContainer = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth();
        headerContainer.setBorder(new SolidBorder(new DeviceRgb(30, 41, 59), 1f));
        headerContainer.setMarginBottom(4f);

        Cell wrapperCell = new Cell()
                .setBackgroundColor(new DeviceRgb(15, 23, 42)) // #0f172a Dark profundo corporativo
                .setPadding(8f)
                .setBorder(Border.NO_BORDER);

        Table innerTable = new Table(UnitValue.createPercentArray(new float[]{60f, 40f})).useAllAvailableWidth();
        innerTable.setBorder(Border.NO_BORDER);

        // Esquerda: Logo em destaque + Dados corporativos com hierarquia visual branca/clara
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
                    .setFontColor(ColorConstants.WHITE) // Branco nítido sobre o fundo dark
                    .setMarginBottom(2f));

            infoCell.add(new Paragraph(addressSb.toString())
                    .setFontSize(6.8f)
                    .setFontColor(new DeviceRgb(203, 213, 225)) // #cbd5e1 cinza claro legível
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

        // Direita: Título executivo vermelho brilhante, Badge e Timestamp
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.MIDDLE);

        rightCell.add(new Paragraph(reportTitle != null ? reportTitle.toUpperCase() : "RELATÓRIO DE CONTAS A PAGAR")
                .setFontSize(13f)
                .setBold()
                .setFontColor(new DeviceRgb(248, 113, 113)) // #f87171 Vermelho vibrante contrastante sobre dark
                .setMarginBottom(2.5f));

        Paragraph metaPara = new Paragraph().setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2.5f);
        if (badgeText != null && !badgeText.isBlank()) {
            metaPara.add(new Text(" " + badgeText.toUpperCase() + " ")
                    .setFontSize(7.5f)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setBackgroundColor(new DeviceRgb(30, 41, 59))); // Badge cinza grafite elegante
            metaPara.add("  ");
        }
        if (periodOrCodeText != null && !periodOrCodeText.isBlank()) {
            metaPara.add(new Text(" " + periodOrCodeText + " ")
                    .setFontSize(7.5f)
                    .setBold()
                    .setFontColor(new DeviceRgb(251, 191, 36))); // #fbbf24 Ouro/Amarelo brilhante
        }
        if (!metaPara.getChildren().isEmpty()) {
            rightCell.add(metaPara);
        }

        rightCell.add(new Paragraph("Data de Emissão: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .setFontSize(7f)
                .setFontColor(new DeviceRgb(148, 163, 184)) // #94a3b8
                .setMarginBottom(0f));

        innerTable.addCell(rightCell);
        wrapperCell.add(innerTable);
        headerContainer.addCell(wrapperCell);
        document.add(headerContainer);

        // Barra inferior com degradê sofisticado (Vermelho -> Laranja -> Ouro)
        Table divider = new Table(UnitValue.createPercentArray(new float[]{40f, 35f, 25f})).useAllAvailableWidth();
        divider.setBorder(Border.NO_BORDER);
        divider.setMarginTop(0f);
        divider.setMarginBottom(6f);

        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(RED_PRIMARY).setBorder(Border.NO_BORDER).setPadding(0f));
        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(new DeviceRgb(249, 115, 22)).setBorder(Border.NO_BORDER).setPadding(0f)); // #f97316 laranja vibrante
        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(new DeviceRgb(234, 179, 8)).setBorder(Border.NO_BORDER).setPadding(0f));  // #eab308 ouro brilhante

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

    private Table createCustomTable(List<String> cols, List<Invoice> groupInvoices) {
        float[] rawWidths = new float[cols.size()];
        float totalRawWidth = 0f;
        for (int i = 0; i < cols.size(); i++) {
            rawWidths[i] = getColumnProportionalWidth(cols.get(i), cols.size());
            totalRawWidth += rawWidths[i];
        }

        // Normalização matemática para somar rigorosamente 100% da largura útil
        float[] normalizedWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            normalizedWidths[i] = (rawWidths[i] / totalRawWidth) * 100f;
        }

        Table table = new Table(UnitValue.createPercentArray(normalizedWidths)).useAllAvailableWidth();
        table.setMarginBottom(4f);
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        int numCols = cols.size();
        float headerFontSize = numCols >= 10 ? 5.2f : (numCols >= 8 ? 5.8f : 6.5f);
        float dataFontSize = numCols >= 10 ? 5.0f : (numCols >= 8 ? 5.5f : 6.5f);
        float cellPadding = numCols >= 10 ? 1.0f : (numCols >= 8 ? 1.5f : 2.0f);

        // Headers
        for (String col : cols) {
            TextAlignment align = getColumnAlignment(col);
            table.addHeaderCell(createHeaderCell(getColumnHeaderLabel(col), align, headerFontSize, cellPadding));
        }

        // Rows
        boolean isAlt = false;
        for (Invoice inv : groupInvoices) {
            for (String col : cols) {
                if ("status".equalsIgnoreCase(col)) {
                    table.addCell(createStatusBadgeCell(inv.getStatus(), isAlt, dataFontSize, cellPadding));
                } else {
                    TextAlignment align = getColumnAlignment(col);
                    boolean isBold = "amount".equalsIgnoreCase(col) || "valor".equalsIgnoreCase(col);
                    table.addCell(createDataCell(getColumnValue(col, inv, dateFormatter, numCols), align, isAlt, isBold, dataFontSize, cellPadding));
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
                .setPaddingTop(2f)
                .setPaddingBottom(2f);
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
                .setPaddingTop(1.5f)
                .setPaddingBottom(1.5f);
    }

    private Cell createStatusBadgeCell(ExpenseStatus status, boolean isAltRow, float fontSize, float padding) {
        String label = getStatusDisplayName(status);
        DeviceRgb textColor;
        if (status == ExpenseStatus.PAGA || status == ExpenseStatus.PAGA_ANTERIORMENTE) {
            textColor = GREEN_TEXT;
        } else if (status == ExpenseStatus.PENDENTE) {
            textColor = AMBER_TEXT;
        } else {
            textColor = RED_PRIMARY;
        }

        Paragraph p = new Paragraph("[" + label.toUpperCase() + "]")
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
                .setPaddingTop(1.5f)
                .setPaddingBottom(1.5f);
    }

    private TextAlignment getColumnAlignment(String colKey) {
        return switch (colKey) {
            case "dueDate", "vencimento", "issueDate", "dataEmissao", "paymentDate", "dataPagamento" -> TextAlignment.CENTER;
            case "amount", "valor" -> TextAlignment.RIGHT;
            case "status" -> TextAlignment.CENTER;
            case "company", "empresa", "companySigla", "type", "tipo" -> TextAlignment.CENTER;
            default -> TextAlignment.LEFT;
        };
    }

    private float getColumnProportionalWidth(String colKey, int totalCols) {
        // Se houver muitas colunas (8 ou mais), compacta ainda mais as colunas de texto amplo
        boolean compact = totalCols >= 8;
        return switch (colKey) {
            case "dueDate", "vencimento" -> compact ? 4.8f : 5.5f;
            case "issueDate", "dataEmissao" -> compact ? 4.8f : 5.5f;
            case "paymentDate", "dataPagamento" -> compact ? 4.8f : 5.5f;
            case "description", "descricao" -> compact ? 6.8f : 8.0f; // Bem compactada para não estourar as margens
            case "supplier", "fornecedor" -> compact ? 6.8f : 8.0f;   // Bem compactada para não estourar as margens
            case "company", "empresa", "companySigla" -> compact ? 3.8f : 4.5f;
            case "unit", "unidade" -> compact ? 5.2f : 6.5f;
            case "workSector", "setor", "setorTrabalho" -> compact ? 5.2f : 6.5f;
            case "category", "categoria", "conta" -> compact ? 6.2f : 7.5f;
            case "centroCusto" -> compact ? 5.0f : 6.0f;
            case "type", "tipo" -> compact ? 4.2f : 5.0f;
            case "amount", "valor" -> compact ? 5.8f : 6.5f;
            case "status" -> compact ? 5.2f : 6.0f;
            case "barcode", "codigoBarras" -> compact ? 5.5f : 6.5f;
            case "observations", "observacoes" -> compact ? 5.5f : 6.5f;
            default -> compact ? 5.0f : 6.0f;
        };
    }

    private String getColumnHeaderLabel(String colKey) {
        return switch (colKey) {
            case "dueDate", "vencimento" -> "Vencimento";
            case "issueDate", "dataEmissao" -> "Emissão";
            case "paymentDate", "dataPagamento" -> "Pagamento";
            case "description", "descricao" -> "Descrição";
            case "supplier", "fornecedor" -> "Fornecedor / Beneficiário";
            case "company", "empresa", "companySigla" -> "Empresa";
            case "unit", "unidade" -> "Unidade";
            case "workSector", "setor", "setorTrabalho" -> "Setor";
            case "category", "categoria", "conta" -> "Conta / Categoria";
            case "centroCusto" -> "Centro Custo";
            case "type", "tipo" -> "Tipo";
            case "amount", "valor" -> "Valor (R$)";
            case "status" -> "Status";
            case "barcode", "codigoBarras" -> "Cód. Barras";
            case "observations", "observacoes" -> "Observações";
            default -> colKey;
        };
    }

    private String getColumnValue(String colKey, Invoice inv, DateTimeFormatter dateFormatter, int totalCols) {
        boolean compact = totalCols >= 8;
        boolean ultraCompact = totalCols >= 10;
        return switch (colKey) {
            case "dueDate", "vencimento" -> inv.getDueDate() != null ? inv.getDueDate().format(dateFormatter) : "-";
            case "issueDate", "dataEmissao" -> inv.getIssueDate() != null ? inv.getIssueDate().format(dateFormatter) : "-";
            case "paymentDate", "dataPagamento" -> inv.getPaymentDate() != null ? inv.getPaymentDate().format(dateFormatter) : "-";
            case "description", "descricao" -> {
                String d = inv.getDescription() != null ? inv.getDescription() : "";
                int maxLen = ultraCompact ? 22 : (compact ? 26 : 38);
                yield d.length() > maxLen ? d.substring(0, maxLen - 3) + "..." : d;
            }
            case "supplier", "fornecedor" -> {
                String s = getFornecedorOuFuncionario(inv);
                int maxLen = ultraCompact ? 22 : (compact ? 26 : 40);
                yield s.length() > maxLen ? s.substring(0, maxLen - 3) + "..." : s;
            }
            case "company", "empresa", "companySigla" -> inv.getCompanySigla() != null ? inv.getCompanySigla() : "-";
            case "unit", "unidade" -> inv.getUnit() != null && inv.getUnit().getName() != null ? inv.getUnit().getName() : "-";
            case "workSector", "setor", "setorTrabalho" -> inv.getWorkSector() != null && !inv.getWorkSector().isBlank() ? inv.getWorkSector() : "-";
            case "category", "categoria", "conta" -> getContaPlanoDeContas(inv);
            case "centroCusto" -> inv.getCentroCusto() != null ? inv.getCentroCusto() : "-";
            case "type", "tipo" -> getTypeDisplayName(inv.getType());
            case "amount", "valor" -> inv.getAmount() != null ? formatCurrency(inv.getAmount()) : "R$ 0,00";
            case "status" -> getStatusDisplayName(inv.getStatus());
            case "barcode", "codigoBarras" -> inv.getBarcode() != null ? inv.getBarcode() : "-";
            case "observations", "observacoes" -> inv.getNotes() != null && !inv.getNotes().isBlank() ? inv.getNotes() : "-";
            default -> "-";
        };
    }

    private Company resolveCompany(String companySigla, UUID companyId) {
        if (companyId != null) {
            Optional<Company> c = companyRepository.findById(companyId);
            if (c.isPresent()) return c.get();
        }
        if (companySigla != null && !companySigla.isBlank() && !"TODAS".equalsIgnoreCase(companySigla)) {
            Optional<Company> c = companyRepository.findFirstBySiglaIgnoreCase(companySigla.trim())
                    .or(() -> companyRepository.findBySigla(companySigla.trim()));
            if (c.isPresent()) return c.get();
        }

        // Padrão do relatório: sempre a VIG (Promover Vigilância Patrimonial Ltda)
        Optional<Company> vig = companyRepository.findFirstBySiglaIgnoreCase("VIG")
                .or(() -> companyRepository.findBySigla("VIG"))
                .or(() -> companyRepository.findAll().stream()
                        .filter(comp -> comp.getName() != null && comp.getName().toUpperCase().contains("VIGILÂNCIA"))
                        .findFirst());
        if (vig.isPresent()) {
            return vig.get();
        }

        List<Company> activeCompanies = companyRepository.findByStatusOrderByNameAsc(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            return activeCompanies.get(0);
        }
        List<Company> allCompanies = companyRepository.findAll();
        if (allCompanies != null && !allCompanies.isEmpty()) {
            return allCompanies.get(0);
        }
        return null;
    }

    private String getContaPlanoDeContas(Invoice invoice) {
        try {
            if (invoice.getSubcategoria() != null) {
                String codigo = invoice.getSubcategoria().getCodigo();
                String nome = invoice.getSubcategoria().getNome();
                if (nome != null && !nome.isBlank()) {
                    return (codigo != null && !codigo.isBlank() ? codigo + " - " : "") + nome;
                }
            }
            if (invoice.getCategory() != null && !invoice.getCategory().isBlank()) {
                return invoice.getCategory();
            }
        } catch (Exception e) {
            log.warn("Erro ao acessar subcategoria da fatura {}: {}", invoice.getId(), e.getMessage());
        }
        return "Não informado";
    }

    private String getFornecedorOuFuncionario(Invoice invoice) {
        if (invoice == null) return "-";

        try {
            // 1. Se tiver funcionário explicitamente vinculado, o beneficiário é o funcionário
            if (invoice.getEmployee() != null && invoice.getEmployee().getName() != null && !invoice.getEmployee().getName().isBlank()) {
                return invoice.getEmployee().getName().trim();
            }
        } catch (Exception e) {
            log.warn("Erro ao acessar funcionário da fatura {}: {}", invoice.getId(), e.getMessage());
        }

        // 2. Tenta extrair o nome do funcionário diretamente de descrições de rescisão, ex:
        // "Rescisao - Juliana Flavia Batista de Jesus - B2 pedido de demissao" -> "Juliana Flavia Batista de Jesus"
        String desc = invoice.getDescription() != null ? invoice.getDescription().trim() : "";
        String extractedFromDesc = extractPersonNameFromDescription(desc);
        if (extractedFromDesc != null) {
            return extractedFromDesc;
        }

        try {
            // 3. Fornecedor cadastrado
            if (invoice.getSupplier() != null && invoice.getSupplier().getName() != null && !invoice.getSupplier().getName().isBlank()) {
                String suppName = invoice.getSupplier().getName().trim();
                // Se o nome do fornecedor foi preenchido erroneamente com a descrição inteira
                if (!desc.isBlank() && suppName.equalsIgnoreCase(desc)) {
                    String extractedFromSupp = extractPersonNameFromDescription(suppName);
                    if (extractedFromSupp != null) return extractedFromSupp;
                    if (desc.toLowerCase().startsWith("rescisao") || desc.toLowerCase().startsWith("rescisão")) {
                        return "-";
                    }
                }
                return suppName;
            }
        } catch (Exception e) {
            log.warn("Erro ao acessar fornecedor da fatura {}: {}", invoice.getId(), e.getMessage());
        }

        return "-";
    }

    private String extractPersonNameFromDescription(String text) {
        if (text == null || text.isBlank()) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i)^rescis[aã]o\\s*[-–—:]\\s*([A-Za-zÀ-ÿ\\s]{4,60}?)(?:\\s*[-–—:]|\\s*\\()").matcher(text.trim());
        if (m.find()) {
            String candidate = m.group(1).trim();
            if (candidate.length() >= 3 && !candidate.matches("(?i)^(valor|pagamento|folha|empresa|terc|vig|adm)$")) {
                return candidate;
            }
        }
        return null;
    }

    private String formatCurrency(BigDecimal value) {
        if (value == null) return "R$ 0,00";
        return String.format("R$ %,.2f", value).replace(",", "X").replace(".", ",").replace("X", ".");
    }

    private String getStatusDisplayName(ExpenseStatus status) {
        if (status == null) return "Não definido";
        return switch (status) {
            case PENDENTE -> "Aberta";
            case PAGA -> "Paga";
            case CANCELADA -> "Cancelada";
            case ERRO -> "Erro";
            case SOLICITADA -> "Solicitada";
            case PAGA_ANTERIORMENTE -> "Paga Anteriormente";
            case PENDENTE_ERRO -> "Pendente/Erro";
        };
    }

    private String getTypeDisplayName(ExpenseType type) {
        if (type == null) return "Não definido";
        return switch (type) {
            case FIXA -> "Fixa";
            case VARIAVEL -> "Variável";
        };
    }

    private Map<String, Object> prepareReportData(List<Invoice> invoices, LocalDate startDate, LocalDate endDate) {
        Map<String, Object> data = new HashMap<>();
        data.put("reportDate", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        data.put("currentDate", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        data.put("pageNumber", "1");

        if (startDate != null && endDate != null) {
            data.put("startDate", startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            data.put("endDate", endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }

        int totalContas = invoices.size();
        BigDecimal valorTotal = invoices.stream()
                .map(Invoice::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long contasAbertas = invoices.stream().filter(i -> i.getStatus() == ExpenseStatus.PENDENTE).count();
        long contasPagas = invoices.stream().filter(i -> i.getStatus() == ExpenseStatus.PAGA).count();
        long contasVencidas = invoices.stream().filter(i -> i.getStatus() == ExpenseStatus.PENDENTE && i.getDueDate() != null && i.getDueDate().isBefore(LocalDate.now())).count();

        data.put("totalContas", totalContas);
        data.put("valorTotal", formatCurrency(valorTotal));
        data.put("contasAbertas", contasAbertas);
        data.put("contasPagas", contasPagas);
        data.put("contasVencidas", contasVencidas);

        if (totalContas > 0) {
            data.put("percentualAbertas", String.format("%.1f", (contasAbertas * 100.0) / totalContas));
            data.put("percentualPagas", String.format("%.1f", (contasPagas * 100.0) / totalContas));
            data.put("percentualVencidas", String.format("%.1f", (contasVencidas * 100.0) / totalContas));
        } else {
            data.put("percentualAbertas", "0.0");
            data.put("percentualPagas", "0.0");
            data.put("percentualVencidas", "0.0");
        }

        List<Map<String, Object>> contasData = invoices.stream()
                .sorted((a, b) -> {
                    LocalDate dA = a.getDueDate() != null ? a.getDueDate() : LocalDate.MIN;
                    LocalDate dB = b.getDueDate() != null ? b.getDueDate() : LocalDate.MIN;
                    return dA.compareTo(dB);
                })
                .map(this::mapInvoiceToReportData)
                .collect(Collectors.toList());

        data.put("contas", contasData);
        return data;
    }

    private Map<String, Object> prepareSummaryData(List<Invoice> invoices) {
        Map<String, Object> data = prepareReportData(invoices, null, null);
        data.put("reportTitle", "Relatório Resumido de Contas a Pagar");

        Map<String, Long> contasPorFornecedor = invoices.stream()
                .filter(i -> i.getSupplier() != null)
                .collect(Collectors.groupingBy(
                        i -> i.getSupplier().getName(),
                        Collectors.counting()));

        data.put("contasPorFornecedor", contasPorFornecedor);
        return data;
    }

    private Map<String, Object> mapInvoiceToReportData(Invoice invoice) {
        Map<String, Object> invoiceData = new HashMap<>();
        invoiceData.put("vencimento", invoice.getDueDate() != null ? invoice.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "-");
        invoiceData.put("fornecedor", getFornecedorOuFuncionario(invoice));
        invoiceData.put("descricao", invoice.getDescription() != null ? invoice.getDescription() : "-");
        invoiceData.put("tipo", getTypeDisplayName(invoice.getType()));
        invoiceData.put("valor", formatCurrency(invoice.getAmount()));
        invoiceData.put("status", getStatusDisplayName(invoice.getStatus()));
        invoiceData.put("empresa", invoice.getCompanySigla() != null ? invoice.getCompanySigla() : "-");
        invoiceData.put("conta", getContaPlanoDeContas(invoice));
        return invoiceData;
    }

    /**
     * Renderer customizado para desenhar um container orgânico (cápsula com cantos bem arredondados)
     * e fundo escuro elegante sob a logo da empresa, sem ficar uma caixa quadrada.
     */
    private static class RoundedLogoCellRenderer extends com.itextpdf.layout.renderer.CellRenderer {
        public RoundedLogoCellRenderer(java.util.function.Function<Cell, Cell> cellFunc, Image logoImg) {
            super(cellFunc.apply(new Cell()));
        }

        public RoundedLogoCellRenderer(Cell modelElement) {
            super(modelElement);
        }

        @Override
        public com.itextpdf.layout.renderer.IRenderer getNextRenderer() {
            return new RoundedLogoCellRenderer((Cell) modelElement);
        }

        @Override
        public void drawBackground(com.itextpdf.layout.renderer.DrawContext drawContext) {
            com.itextpdf.kernel.geom.Rectangle rect = getOccupiedAreaBBox();
            if (rect != null) {
                com.itextpdf.kernel.pdf.canvas.PdfCanvas canvas = drawContext.getCanvas();
                canvas.saveState();
                
                // Dimensões compactas e centradas na célula para a logo
                float padX = 2f;
                float padY = 2f;
                float x = rect.getX() + padX;
                float y = rect.getY() + padY;
                float w = Math.max(10f, rect.getWidth() - (padX * 2));
                float h = Math.max(10f, rect.getHeight() - (padY * 2));
                float radius = Math.min(w, h) / 2.2f; // Raio suave estilo cápsula moderna

                // Fundo Dark (#0f172a)
                canvas.setFillColor(new DeviceRgb(15, 23, 42));
                // Borda suave Slate-700 (#334155)
                canvas.setStrokeColor(new DeviceRgb(51, 65, 85));
                canvas.setLineWidth(0.75f);

                canvas.roundRectangle(x, y, w, h, radius);
                canvas.fillStroke();
                canvas.restoreState();
            }
        }
    }
}
