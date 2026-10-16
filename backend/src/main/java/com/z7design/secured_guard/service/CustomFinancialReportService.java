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
import com.z7design.secured_guard.dto.CustomContasAReceberReportRequestDTO;
import com.z7design.secured_guard.dto.CustomPagamentosReportRequestDTO;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.AccountsReceivable;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.ScheduledPayment;
import com.z7design.secured_guard.model.enums.PaymentMethod;
import com.z7design.secured_guard.model.enums.ReceivableStatus;
import com.z7design.secured_guard.model.enums.ScheduledPaymentStatus;
import com.z7design.secured_guard.repository.AccountsReceivableRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.ScheduledPaymentRepository;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Serviço responsável por gerar relatórios personalizados em PDF para:
 * 1. Contas a Receber (AccountsReceivable)
 * 2. Pagamentos Agendados (ScheduledPayment)
 *
 * Utiliza o mesmo padrão executivo de alta fidelidade visual (iText 7)
 * estabelecido para Contas a Pagar (ContasAPagarReportService).
 */
@Service
public class CustomFinancialReportService {

    private static final Logger log = LoggerFactory.getLogger(CustomFinancialReportService.class);

    private final AccountsReceivableRepository accountsReceivableRepository;
    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    @Value("${app.upload.base-dir:${app.upload.dir:uploads}}")
    private String uploadDir;

    // Paleta executiva compartilhada
    private static final DeviceRgb RED_PRIMARY = new DeviceRgb(220, 38, 38);       // #dc2626
    private static final DeviceRgb RED_DARK = new DeviceRgb(185, 28, 28);          // #b91c1c
    private static final DeviceRgb SLATE_DARK = new DeviceRgb(30, 41, 59);         // #1e293b
    private static final DeviceRgb SLATE_LIGHT = new DeviceRgb(241, 245, 249);     // #f1f5f9
    private static final DeviceRgb SLATE_BORDER = new DeviceRgb(203, 213, 225);    // #cbd5e1
    private static final DeviceRgb ROW_ALT = new DeviceRgb(248, 250, 252);         // #f8fafc
    private static final DeviceRgb GREEN_TEXT = new DeviceRgb(22, 101, 52);        // #166534
    private static final DeviceRgb AMBER_TEXT = new DeviceRgb(180, 83, 9);         // #b45309
    private static final DeviceRgb BLUE_TEXT = new DeviceRgb(30, 64, 175);         // #1e40af

    public CustomFinancialReportService(
            AccountsReceivableRepository accountsReceivableRepository,
            ScheduledPaymentRepository scheduledPaymentRepository,
            StandardReportLayoutService standardReportLayoutService,
            CompanyRepository companyRepository) {
        this.accountsReceivableRepository = accountsReceivableRepository;
        this.scheduledPaymentRepository = scheduledPaymentRepository;
        this.standardReportLayoutService = standardReportLayoutService;
        this.companyRepository = companyRepository;
    }

    // =========================================================================
    // 1. RELATÓRIO PERSONALIZADO DE CONTAS A RECEBER
    // =========================================================================

    @Transactional(readOnly = true)
    public byte[] generateCustomAccountsReceivableReportPDF(CustomContasAReceberReportRequestDTO req) throws IOException {
        log.info("Gerando relatório PDF personalizado de contas a receber: {}", req);
        try {
            List<AccountsReceivable> allAccounts = accountsReceivableRepository.findAll();

            List<AccountsReceivable> filtered = allAccounts.stream().filter(acc -> {
                LocalDate targetDate = acc.getDueDate();
                if ("issueDate".equalsIgnoreCase(req.getDateField())) {
                    targetDate = acc.getIssueDate();
                } else if ("paymentDate".equalsIgnoreCase(req.getDateField())) {
                    targetDate = acc.getPaymentDate();
                }

                if (req.getStartDate() != null && (targetDate == null || targetDate.isBefore(req.getStartDate()))) {
                    return false;
                }
                if (req.getEndDate() != null && (targetDate == null || targetDate.isAfter(req.getEndDate()))) {
                    return false;
                }
                if (req.getStatus() != null && acc.getStatus() != req.getStatus()) {
                    return false;
                }
                if (req.getPaymentMethod() != null && acc.getPaymentMethod() != req.getPaymentMethod()) {
                    return false;
                }
                if (req.getClientId() != null && (acc.getClient() == null || !req.getClientId().equals(acc.getClient().getId()))) {
                    return false;
                }
                if (req.getUnitId() != null && (acc.getUnit() == null || !req.getUnitId().equals(acc.getUnit().getId()))) {
                    return false;
                }
                if (req.getSubcategoriaId() != null && (acc.getSubcategoria() == null || !req.getSubcategoriaId().equals(acc.getSubcategoria().getId()))) {
                    return false;
                }
                if (req.getCategory() != null && !req.getCategory().isBlank() && !"ALL".equalsIgnoreCase(req.getCategory()) && !"TODAS".equalsIgnoreCase(req.getCategory())) {
                    if (acc.getSubcategoria() == null || acc.getSubcategoria().getNome() == null ||
                            !acc.getSubcategoria().getNome().toLowerCase().contains(req.getCategory().toLowerCase().trim())) {
                        return false;
                    }
                }
                // Filtro especial: vence nos próximos N dias
                if (req.getExpiringInDays() != null && req.getExpiringInDays() > 0) {
                    LocalDate today = LocalDate.now();
                    LocalDate maxDueDate = today.plusDays(req.getExpiringInDays());
                    if (acc.getDueDate() == null || acc.getDueDate().isBefore(today) || acc.getDueDate().isAfter(maxDueDate)) {
                        return false;
                    }
                    if (acc.getStatus() != ReceivableStatus.PENDING) {
                        return false;
                    }
                }
                // Filtro por Segmento (RECEBIDOS, A_VENCER, VENCIDOS, INADIMPLENCIA)
                if (req.getReportSegment() != null && !req.getReportSegment().isBlank()) {
                    String seg = req.getReportSegment().toUpperCase();
                    LocalDate today = LocalDate.now();
                    if ("RECEBIDOS".equals(seg) && acc.getStatus() != ReceivableStatus.PAID) {
                        return false;
                    } else if ("A_VENCER".equals(seg)) {
                        if (acc.getStatus() == ReceivableStatus.PAID || acc.getStatus() == ReceivableStatus.CANCELLED) return false;
                        if (acc.getDueDate() == null || acc.getDueDate().isBefore(today)) return false;
                    } else if ("VENCIDOS".equals(seg) || "INADIMPLENCIA".equals(seg)) {
                        if (acc.getStatus() == ReceivableStatus.PAID || acc.getStatus() == ReceivableStatus.CANCELLED) return false;
                        if (acc.getDueDate() == null || !acc.getDueDate().isBefore(today)) return false;
                    }
                }
                return true;
            }).sorted((a, b) -> {
                String cA = a.getClient() != null && a.getClient().getName() != null ? a.getClient().getName() : "";
                String cB = b.getClient() != null && b.getClient().getName() != null ? b.getClient().getName() : "";
                int cmpClient = cA.compareToIgnoreCase(cB);
                if (cmpClient != 0) return cmpClient;

                LocalDate dA = a.getDueDate() != null ? a.getDueDate() : LocalDate.MIN;
                LocalDate dB = b.getDueDate() != null ? b.getDueDate() : LocalDate.MIN;
                return dA.compareTo(dB);
            }).collect(Collectors.toList());

            log.info("Contas a receber filtradas para o relatório personalizado: {} de {}", filtered.size(), allAccounts.size());
            return generateCustomReceivablePdfDocument(filtered, req);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF personalizado de contas a receber: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF personalizado de contas a receber: " + e.getMessage(), e);
        }
    }

    private byte[] generateCustomReceivablePdfDocument(List<AccountsReceivable> accounts, CustomContasAReceberReportRequestDTO req) throws IOException {
        Company company = resolveCompany(req != null ? req.getCompanySigla() : null, req != null ? req.getCompanyId() : null);
        UUID companyId = company != null ? company.getId() : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(null)
                    .showHeader(false)
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

            // 1. Cabeçalho Executivo Dark
            String periodBadge = "TODOS OS REGISTROS";
            if (req.getStartDate() != null && req.getEndDate() != null) {
                periodBadge = req.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " a " + req.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
            addExecutiveHeader(document, company, "RELATÓRIO DE CONTAS A RECEBER", "CONTAS A RECEBER", periodBadge);

            // 2. Identificação e Filtros do Relatório
            addSectionHeader(document, "IDENTIFICAÇÃO E FILTROS DO RELATÓRIO");

            BigDecimal totalGeral = accounts.stream()
                    .map(AccountsReceivable::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalRecebido = accounts.stream()
                    .map(AccountsReceivable::getAmountPaid)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long contasAbertas = accounts.stream().filter(a -> a.getStatus() == ReceivableStatus.PENDING).count();
            long contasRecebidas = accounts.stream().filter(a -> a.getStatus() == ReceivableStatus.PAID).count();
            long contasVencidas = accounts.stream().filter(a -> a.getStatus() == ReceivableStatus.OVERDUE).count();

            Table filterGrid = new Table(UnitValue.createPercentArray(new float[]{14f, 36f, 14f, 36f})).useAllAvailableWidth();
            filterGrid.setMarginBottom(8f);

            addGridRow(filterGrid, "PERÍODO:", periodBadge, "TOTAL REGISTROS:", String.valueOf(accounts.size()));

            String statusStr = req.getStatus() != null ? getReceivableStatusDisplayName(req.getStatus())
                    : "Todos (Abertas: " + contasAbertas + " | Recebidas: " + contasRecebidas + (contasVencidas > 0 ? " | Vencidas: " + contasVencidas : "") + ")";
            addGridRow(filterGrid, "STATUS:", statusStr, "VALOR TOTAL:", formatCurrency(totalGeral));

            String empStr = req.getCompanySigla() != null && !req.getCompanySigla().isBlank() ? req.getCompanySigla() : "Todas as Empresas/Unidades";
            addGridRow(filterGrid, "EMPRESA/UNIDADE:", empStr, "VALOR RECEBIDO:", formatCurrency(totalRecebido));

            document.add(filterGrid);

            // 3. Detalhamento das Contas a Receber
            addSectionHeader(document, "DETALHAMENTO DAS CONTAS A RECEBER");

            List<String> cols = req.getSelectedColumns();
            if (cols == null || cols.isEmpty()) {
                cols = Arrays.asList("dueDate", "invoiceNumber", "description", "client", "unit", "category", "amount", "amountPaid", "status");
            }

            if (accounts.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma conta a receber encontrada com os filtros selecionados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(9.5f)
                        .setItalic()
                        .setMarginTop(15);
                document.add(noData);
            } else {
                String groupMode = req.getGroupBy() != null ? req.getGroupBy().toUpperCase() : "CLIENT";

                if (!"NONE".equals(groupMode)) {
                    Map<String, List<AccountsReceivable>> grouped = groupAccountsReceivable(accounts, groupMode);

                    for (Map.Entry<String, List<AccountsReceivable>> entry : grouped.entrySet()) {
                        String groupHeader = entry.getKey();
                        List<AccountsReceivable> groupAccounts = entry.getValue();

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
                        Table table = createReceivableTable(cols, groupAccounts);
                        document.add(table);

                        // Subtotal
                        BigDecimal subtotal = groupAccounts.stream()
                                .map(AccountsReceivable::getAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                        Paragraph subtotalPara = new Paragraph(String.format(
                                "Subtotal (%d conta%s): %s",
                                groupAccounts.size(),
                                groupAccounts.size() > 1 ? "s" : "",
                                formatCurrency(subtotal)))
                                .setFontSize(8f)
                                .setBold()
                                .setFontColor(SLATE_DARK)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginBottom(4f);
                        document.add(subtotalPara);
                    }
                } else {
                    Table table = createReceivableTable(cols, accounts);
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
                totalCell.add(new Paragraph("TOTAL GERAL (" + accounts.size() + " contas): " + formatCurrency(totalGeral))
                        .setFontSize(10f)
                        .setBold()
                        .setFontColor(RED_DARK));
                totalTable.addCell(emptyCell);
                totalTable.addCell(totalCell);
                document.add(totalTable);
            }

            document.close();
            return baos.toByteArray();
        } finally {
            if (docWithPdf != null && docWithPdf.getPdfDoc() != null) {
                try {
                    docWithPdf.getPdfDoc().close();
                } catch (Exception ignored) {}
            }
        }
    }

    private Map<String, List<AccountsReceivable>> groupAccountsReceivable(List<AccountsReceivable> accounts, String groupMode) {
        switch (groupMode) {
            case "UNIT" -> {
                return accounts.stream().collect(
                        Collectors.groupingBy(a -> {
                            String u = a.getUnit() != null && a.getUnit().getName() != null ? a.getUnit().getName() : "Sem Unidade / Geral";
                            return "UNIDADE: " + u.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            case "STATUS" -> {
                return accounts.stream().collect(
                        Collectors.groupingBy(a -> "STATUS: " + getReceivableStatusDisplayName(a.getStatus()).toUpperCase(),
                                LinkedHashMap::new, Collectors.toList())
                );
            }
            case "PAYMENT_METHOD" -> {
                return accounts.stream().collect(
                        Collectors.groupingBy(a -> "MÉTODO DE PAGAMENTO: " + (a.getPaymentMethod() != null ? a.getPaymentMethod().name() : "NÃO INFORMADO"),
                                LinkedHashMap::new, Collectors.toList())
                );
            }
            case "PERIOD", "MONTH" -> {
                return accounts.stream().collect(
                        Collectors.groupingBy(a -> {
                            if (a.getDueDate() == null) return "SEM DATA DEFINIDA";
                            return "COMPETÊNCIA / VENCIMENTO: " + a.getDueDate().format(DateTimeFormatter.ofPattern("MM/yyyy"));
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            case "CLIENT", "CLIENTE" -> {
                return accounts.stream().collect(
                        Collectors.groupingBy(a -> {
                            String name = a.getClient() != null && a.getClient().getName() != null ? a.getClient().getName() : "Sem Cliente";
                            return "CLIENTE: " + name.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            default -> {
                return accounts.stream().collect(
                        Collectors.groupingBy(a -> {
                            String c = a.getClient() != null && a.getClient().getName() != null ? a.getClient().getName() : "Sem Cliente";
                            String u = a.getUnit() != null && a.getUnit().getName() != null ? a.getUnit().getName() : "Sem Unidade";
                            return "CLIENTE: " + c.toUpperCase() + "   |   UNIDADE: " + u.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
        }
    }

    private Table createReceivableTable(List<String> cols, List<AccountsReceivable> groupAccounts) {
        float[] proportionalWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            proportionalWidths[i] = getReceivableColumnProportionalWidth(cols.get(i), cols.size());
        }
        float sum = 0f;
        for (float w : proportionalWidths) sum += w;
        float[] normalizedWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            normalizedWidths[i] = (proportionalWidths[i] / sum) * 100f;
        }

        Table table = new Table(UnitValue.createPercentArray(normalizedWidths)).useAllAvailableWidth();
        table.setMarginBottom(4f);
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        int numCols = cols.size();
        float headerFontSize = numCols >= 10 ? 5.2f : (numCols >= 8 ? 5.8f : 6.5f);
        float dataFontSize = numCols >= 10 ? 5.0f : (numCols >= 8 ? 5.5f : 6.5f);
        float cellPadding = numCols >= 10 ? 1.0f : (numCols >= 8 ? 1.5f : 2.0f);

        // Header
        for (String col : cols) {
            TextAlignment align = getReceivableColumnAlignment(col);
            table.addHeaderCell(createHeaderCell(getReceivableColumnHeaderLabel(col), align, headerFontSize, cellPadding));
        }

        // Rows
        boolean isAlt = false;
        for (AccountsReceivable acc : groupAccounts) {
            for (String col : cols) {
                if ("status".equalsIgnoreCase(col)) {
                    table.addCell(createReceivableStatusBadgeCell(acc.getStatus(), isAlt, dataFontSize, cellPadding));
                } else {
                    TextAlignment align = getReceivableColumnAlignment(col);
                    boolean isBold = "amount".equalsIgnoreCase(col) || "valor".equalsIgnoreCase(col) || "amountPaid".equalsIgnoreCase(col);
                    table.addCell(createDataCell(getReceivableColumnValue(col, acc, dateFormatter, numCols), align, isAlt, isBold, dataFontSize, cellPadding));
                }
            }
            isAlt = !isAlt;
        }

        return table;
    }

    private float getReceivableColumnProportionalWidth(String colKey, int totalCols) {
        boolean compact = totalCols >= 8;
        return switch (colKey) {
            case "dueDate", "vencimento", "issueDate", "dataEmissao", "paymentDate", "dataPagamento" -> compact ? 4.8f : 5.8f;
            case "invoiceNumber", "numeroFatura", "fatura" -> compact ? 5.0f : 6.0f;
            case "description", "descricao" -> compact ? 12.0f : 16.0f;
            case "client", "cliente" -> compact ? 12.0f : 15.0f;
            case "unit", "unidade" -> compact ? 6.5f : 8.0f;
            case "workPost", "posto" -> compact ? 6.0f : 7.5f;
            case "category", "categoria", "conta", "subcategoria" -> compact ? 6.2f : 7.5f;
            case "paymentMethod", "formaPagamento" -> compact ? 5.0f : 6.0f;
            case "amount", "valor" -> compact ? 5.8f : 6.5f;
            case "amountPaid", "valorPago" -> compact ? 5.8f : 6.5f;
            case "status" -> compact ? 5.2f : 6.0f;
            case "measurementNumber", "medicao" -> compact ? 5.0f : 6.0f;
            case "barcode", "codigoBarras" -> compact ? 5.5f : 6.5f;
            default -> compact ? 5.0f : 6.0f;
        };
    }

    private String getReceivableColumnHeaderLabel(String colKey) {
        return switch (colKey) {
            case "dueDate", "vencimento" -> "Vencimento";
            case "issueDate", "dataEmissao" -> "Emissão";
            case "paymentDate", "dataPagamento" -> "Recebimento";
            case "invoiceNumber", "numeroFatura", "fatura" -> "Nº Fatura";
            case "description", "descricao" -> "Descrição";
            case "client", "cliente" -> "Cliente";
            case "unit", "unidade" -> "Unidade";
            case "workPost", "posto" -> "Posto";
            case "category", "categoria", "conta", "subcategoria" -> "Plano de Contas";
            case "paymentMethod", "formaPagamento" -> "Método";
            case "amount", "valor" -> "Valor (R$)";
            case "amountPaid", "valorPago" -> "Pago (R$)";
            case "status" -> "Status";
            case "measurementNumber", "medicao" -> "Medição";
            case "barcode", "codigoBarras" -> "Cód. Barras";
            default -> colKey;
        };
    }

    private TextAlignment getReceivableColumnAlignment(String colKey) {
        return switch (colKey) {
            case "dueDate", "vencimento", "issueDate", "dataEmissao", "paymentDate", "dataPagamento" -> TextAlignment.CENTER;
            case "amount", "valor", "amountPaid", "valorPago" -> TextAlignment.RIGHT;
            case "status", "paymentMethod", "formaPagamento", "invoiceNumber", "fatura" -> TextAlignment.CENTER;
            default -> TextAlignment.LEFT;
        };
    }

    private String getReceivableColumnValue(String colKey, AccountsReceivable acc, DateTimeFormatter dateFormatter, int totalCols) {
        boolean compact = totalCols >= 8;
        boolean ultraCompact = totalCols >= 10;
        return switch (colKey) {
            case "dueDate", "vencimento" -> acc.getDueDate() != null ? acc.getDueDate().format(dateFormatter) : "-";
            case "issueDate", "dataEmissao" -> acc.getIssueDate() != null ? acc.getIssueDate().format(dateFormatter) : "-";
            case "paymentDate", "dataPagamento" -> acc.getPaymentDate() != null ? acc.getPaymentDate().format(dateFormatter) : "-";
            case "invoiceNumber", "numeroFatura", "fatura" -> acc.getInvoiceNumber() != null ? acc.getInvoiceNumber() : "-";
            case "description", "descricao" -> {
                String d = acc.getDescription() != null ? acc.getDescription() : "";
                int maxLen = ultraCompact ? 22 : (compact ? 26 : 38);
                yield d.length() > maxLen ? d.substring(0, maxLen - 3) + "..." : d;
            }
            case "client", "cliente" -> {
                String c = acc.getClient() != null && acc.getClient().getName() != null ? acc.getClient().getName() : "-";
                int maxLen = ultraCompact ? 22 : (compact ? 26 : 38);
                yield c.length() > maxLen ? c.substring(0, maxLen - 3) + "..." : c;
            }
            case "unit", "unidade" -> acc.getUnit() != null && acc.getUnit().getName() != null ? acc.getUnit().getName() : "-";
            case "workPost", "posto" -> acc.getWorkPost() != null && acc.getWorkPost().getName() != null ? acc.getWorkPost().getName() : "-";
            case "category", "categoria", "conta", "subcategoria" -> {
                if (acc.getSubcategoria() != null) {
                    String cod = acc.getSubcategoria().getCodigo();
                    String nom = acc.getSubcategoria().getNome();
                    yield (cod != null && !cod.isBlank() ? cod + " - " : "") + (nom != null ? nom : "");
                }
                yield "-";
            }
            case "paymentMethod", "formaPagamento" -> acc.getPaymentMethod() != null ? acc.getPaymentMethod().name() : "-";
            case "amount", "valor" -> acc.getAmount() != null ? formatCurrency(acc.getAmount()) : "R$ 0,00";
            case "amountPaid", "valorPago" -> acc.getAmountPaid() != null ? formatCurrency(acc.getAmountPaid()) : "R$ 0,00";
            case "status" -> getReceivableStatusDisplayName(acc.getStatus());
            case "measurementNumber", "medicao" -> acc.getMeasurementNumber() != null ? acc.getMeasurementNumber() : "-";
            case "barcode", "codigoBarras" -> "-";
            default -> "-";
        };
    }

    private Cell createReceivableStatusBadgeCell(ReceivableStatus status, boolean isAltRow, float fontSize, float padding) {
        String label = getReceivableStatusDisplayName(status);
        DeviceRgb textColor;
        if (status == ReceivableStatus.PAID) {
            textColor = GREEN_TEXT;
        } else if (status == ReceivableStatus.PENDING) {
            textColor = AMBER_TEXT;
        } else if (status == ReceivableStatus.OVERDUE) {
            textColor = RED_PRIMARY;
        } else {
            textColor = SLATE_DARK;
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

    private String getReceivableStatusDisplayName(ReceivableStatus status) {
        if (status == null) return "-";
        return switch (status) {
            case PENDING -> "Aberta";
            case PAID -> "Recebida";
            case OVERDUE -> "Vencida";
            case CANCELLED -> "Cancelada";
            default -> status.name();
        };
    }

    // =========================================================================
    // 2. RELATÓRIO PERSONALIZADO DE PAGAMENTOS AGENDADOS
    // =========================================================================

    @Transactional(readOnly = true)
    public byte[] generateCustomScheduledPaymentReportPDF(CustomPagamentosReportRequestDTO req) throws IOException {
        log.info("Gerando relatório PDF personalizado de pagamentos agendados: {}", req);
        try {
            List<ScheduledPayment> allPayments = scheduledPaymentRepository.findAll();

            List<ScheduledPayment> filtered = allPayments.stream().filter(sp -> {
                LocalDate targetDate = sp.getScheduledDate();
                if ("executionDate".equalsIgnoreCase(req.getDateField())) {
                    targetDate = sp.getExecutionDate();
                }

                if (req.getStartDate() != null && (targetDate == null || targetDate.isBefore(req.getStartDate()))) {
                    return false;
                }
                if (req.getEndDate() != null && (targetDate == null || targetDate.isAfter(req.getEndDate()))) {
                    return false;
                }
                if (req.getStatus() != null && sp.getStatus() != req.getStatus()) {
                    return false;
                }
                if (req.getPaymentMethod() != null && sp.getPaymentMethod() != req.getPaymentMethod()) {
                    return false;
                }
                if (req.getClientId() != null && (sp.getClient() == null || !req.getClientId().equals(sp.getClient().getId()))) {
                    return false;
                }
                if (req.getSubcategoriaId() != null && (sp.getSubcategoria() == null || !req.getSubcategoriaId().equals(sp.getSubcategoria().getId()))) {
                    return false;
                }
                // Filtro especial: vence nos próximos N dias
                if (req.getExpiringInDays() != null && req.getExpiringInDays() > 0) {
                    LocalDate today = LocalDate.now();
                    LocalDate maxDueDate = today.plusDays(req.getExpiringInDays());
                    if (sp.getScheduledDate() == null || sp.getScheduledDate().isBefore(today) || sp.getScheduledDate().isAfter(maxDueDate)) {
                        return false;
                    }
                    if (sp.getStatus() != ScheduledPaymentStatus.SCHEDULED) {
                        return false;
                    }
                }
                return true;
            }).sorted((a, b) -> {
                String cA = a.getClient() != null && a.getClient().getName() != null ? a.getClient().getName() : "";
                String cB = b.getClient() != null && b.getClient().getName() != null ? b.getClient().getName() : "";
                int cmpClient = cA.compareToIgnoreCase(cB);
                if (cmpClient != 0) return cmpClient;

                LocalDate dA = a.getScheduledDate() != null ? a.getScheduledDate() : LocalDate.MIN;
                LocalDate dB = b.getScheduledDate() != null ? b.getScheduledDate() : LocalDate.MIN;
                return dA.compareTo(dB);
            }).collect(Collectors.toList());

            log.info("Pagamentos agendados filtrados para o relatório personalizado: {} de {}", filtered.size(), allPayments.size());
            return generateCustomScheduledPaymentPdfDocument(filtered, req);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF personalizado de pagamentos agendados: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF personalizado de pagamentos agendados: " + e.getMessage(), e);
        }
    }

    private byte[] generateCustomScheduledPaymentPdfDocument(List<ScheduledPayment> payments, CustomPagamentosReportRequestDTO req) throws IOException {
        Company company = resolveCompany(null, null);
        UUID companyId = company != null ? company.getId() : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(null)
                    .showHeader(false)
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

            // 1. Cabeçalho Executivo Dark
            String periodBadge = "TODOS OS REGISTROS";
            if (req.getStartDate() != null && req.getEndDate() != null) {
                periodBadge = req.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " a " + req.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
            addExecutiveHeader(document, company, "RELATÓRIO DE PAGAMENTOS AGENDADOS", "PAGAMENTOS", periodBadge);

            // 2. Identificação e Filtros do Relatório
            addSectionHeader(document, "IDENTIFICAÇÃO E FILTROS DO RELATÓRIO");

            BigDecimal totalGeral = payments.stream()
                    .map(ScheduledPayment::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long agendados = payments.stream().filter(p -> p.getStatus() == ScheduledPaymentStatus.SCHEDULED).count();
            long executados = payments.stream().filter(p -> p.getStatus() == ScheduledPaymentStatus.EXECUTED).count();
            long cancelados = payments.stream().filter(p -> p.getStatus() == ScheduledPaymentStatus.CANCELLED).count();

            Table filterGrid = new Table(UnitValue.createPercentArray(new float[]{14f, 36f, 14f, 36f})).useAllAvailableWidth();
            filterGrid.setMarginBottom(8f);

            addGridRow(filterGrid, "PERÍODO:", periodBadge, "TOTAL REGISTROS:", String.valueOf(payments.size()));

            String statusStr = req.getStatus() != null ? getScheduledPaymentStatusDisplayName(req.getStatus())
                    : "Todos (Agendados: " + agendados + " | Pagos: " + executados + (cancelados > 0 ? " | Cancelados: " + cancelados : "") + ")";
            addGridRow(filterGrid, "STATUS:", statusStr, "VALOR TOTAL:", formatCurrency(totalGeral));

            String metodoStr = req.getPaymentMethod() != null ? req.getPaymentMethod().name() : "Todos os Métodos";
            addGridRow(filterGrid, "MÉTODO DE PAGAMENTO:", metodoStr, "DATA EMISSÃO:", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));

            document.add(filterGrid);

            // 3. Detalhamento dos Pagamentos
            addSectionHeader(document, "DETALHAMENTO DOS PAGAMENTOS AGENDADOS");

            List<String> cols = req.getSelectedColumns();
            if (cols == null || cols.isEmpty()) {
                cols = Arrays.asList("scheduledDate", "executionDate", "invoiceNumber", "description", "client", "paymentMethod", "amount", "status");
            }

            if (payments.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum pagamento agendado encontrado com os filtros selecionados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(9.5f)
                        .setItalic()
                        .setMarginTop(15);
                document.add(noData);
            } else {
                String groupMode = req.getGroupBy() != null ? req.getGroupBy().toUpperCase() : "CLIENT";

                if (!"NONE".equals(groupMode)) {
                    Map<String, List<ScheduledPayment>> grouped = groupScheduledPayments(payments, groupMode);

                    for (Map.Entry<String, List<ScheduledPayment>> entry : grouped.entrySet()) {
                        String groupHeader = entry.getKey();
                        List<ScheduledPayment> groupPayments = entry.getValue();

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
                        Table table = createScheduledPaymentTable(cols, groupPayments);
                        document.add(table);

                        // Subtotal
                        BigDecimal subtotal = groupPayments.stream()
                                .map(ScheduledPayment::getAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                        Paragraph subtotalPara = new Paragraph(String.format(
                                "Subtotal (%d pagamento%s): %s",
                                groupPayments.size(),
                                groupPayments.size() > 1 ? "s" : "",
                                formatCurrency(subtotal)))
                                .setFontSize(8f)
                                .setBold()
                                .setFontColor(SLATE_DARK)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginBottom(4f);
                        document.add(subtotalPara);
                    }
                } else {
                    Table table = createScheduledPaymentTable(cols, payments);
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
                totalCell.add(new Paragraph("TOTAL GERAL (" + payments.size() + " pagamentos): " + formatCurrency(totalGeral))
                        .setFontSize(10f)
                        .setBold()
                        .setFontColor(RED_DARK));
                totalTable.addCell(emptyCell);
                totalTable.addCell(totalCell);
                document.add(totalTable);
            }

            document.close();
            return baos.toByteArray();
        } finally {
            if (docWithPdf != null && docWithPdf.getPdfDoc() != null) {
                try {
                    docWithPdf.getPdfDoc().close();
                } catch (Exception ignored) {}
            }
        }
    }

    private Map<String, List<ScheduledPayment>> groupScheduledPayments(List<ScheduledPayment> payments, String groupMode) {
        switch (groupMode) {
            case "STATUS" -> {
                return payments.stream().collect(
                        Collectors.groupingBy(p -> "STATUS: " + getScheduledPaymentStatusDisplayName(p.getStatus()).toUpperCase(),
                                LinkedHashMap::new, Collectors.toList())
                );
            }
            case "PAYMENT_METHOD" -> {
                return payments.stream().collect(
                        Collectors.groupingBy(p -> "MÉTODO DE PAGAMENTO: " + (p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "NÃO INFORMADO"),
                                LinkedHashMap::new, Collectors.toList())
                );
            }
            case "PERIOD", "MONTH" -> {
                return payments.stream().collect(
                        Collectors.groupingBy(p -> {
                            if (p.getScheduledDate() == null) return "SEM DATA DEFINIDA";
                            return "DATA / MÊS AGENDADO: " + p.getScheduledDate().format(DateTimeFormatter.ofPattern("MM/yyyy"));
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            case "CLIENT", "CLIENTE" -> {
                return payments.stream().collect(
                        Collectors.groupingBy(p -> {
                            String name = p.getClient() != null && p.getClient().getName() != null ? p.getClient().getName() : "Sem Cliente";
                            return "CLIENTE: " + name.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
            default -> {
                return payments.stream().collect(
                        Collectors.groupingBy(p -> {
                            String name = p.getClient() != null && p.getClient().getName() != null ? p.getClient().getName() : "Sem Cliente";
                            return "CLIENTE: " + name.toUpperCase();
                        }, LinkedHashMap::new, Collectors.toList())
                );
            }
        }
    }

    private Table createScheduledPaymentTable(List<String> cols, List<ScheduledPayment> groupPayments) {
        float[] proportionalWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            proportionalWidths[i] = getScheduledPaymentColumnProportionalWidth(cols.get(i), cols.size());
        }
        float sum = 0f;
        for (float w : proportionalWidths) sum += w;
        float[] normalizedWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            normalizedWidths[i] = (proportionalWidths[i] / sum) * 100f;
        }

        Table table = new Table(UnitValue.createPercentArray(normalizedWidths)).useAllAvailableWidth();
        table.setMarginBottom(4f);
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        int numCols = cols.size();
        float headerFontSize = numCols >= 8 ? 5.8f : 6.5f;
        float dataFontSize = numCols >= 8 ? 5.5f : 6.5f;
        float cellPadding = numCols >= 8 ? 1.5f : 2.0f;

        // Header
        for (String col : cols) {
            TextAlignment align = getScheduledPaymentColumnAlignment(col);
            table.addHeaderCell(createHeaderCell(getScheduledPaymentColumnHeaderLabel(col), align, headerFontSize, cellPadding));
        }

        // Rows
        boolean isAlt = false;
        for (ScheduledPayment sp : groupPayments) {
            for (String col : cols) {
                if ("status".equalsIgnoreCase(col)) {
                    table.addCell(createScheduledPaymentStatusBadgeCell(sp.getStatus(), isAlt, dataFontSize, cellPadding));
                } else {
                    TextAlignment align = getScheduledPaymentColumnAlignment(col);
                    boolean isBold = "amount".equalsIgnoreCase(col) || "valor".equalsIgnoreCase(col);
                    table.addCell(createDataCell(getScheduledPaymentColumnValue(col, sp, dateFormatter, numCols), align, isAlt, isBold, dataFontSize, cellPadding));
                }
            }
            isAlt = !isAlt;
        }

        return table;
    }

    private float getScheduledPaymentColumnProportionalWidth(String colKey, int totalCols) {
        boolean compact = totalCols >= 8;
        return switch (colKey) {
            case "scheduledDate", "dataAgendamento" -> compact ? 5.0f : 6.0f;
            case "executionDate", "dataExecucao" -> compact ? 5.0f : 6.0f;
            case "invoiceNumber", "numeroFatura", "fatura" -> compact ? 5.5f : 6.5f;
            case "description", "descricao" -> compact ? 14.0f : 18.0f;
            case "client", "cliente" -> compact ? 12.0f : 15.0f;
            case "paymentMethod", "formaPagamento" -> compact ? 5.5f : 6.5f;
            case "category", "subcategoria" -> compact ? 6.5f : 8.0f;
            case "amount", "valor" -> compact ? 6.0f : 7.0f;
            case "status" -> compact ? 5.2f : 6.0f;
            case "notes", "observacoes" -> compact ? 6.5f : 8.0f;
            default -> compact ? 5.0f : 6.0f;
        };
    }

    private String getScheduledPaymentColumnHeaderLabel(String colKey) {
        return switch (colKey) {
            case "scheduledDate", "dataAgendamento" -> "Data Agendada";
            case "executionDate", "dataExecucao" -> "Data Execução";
            case "invoiceNumber", "numeroFatura", "fatura" -> "Nº Fatura";
            case "description", "descricao" -> "Descrição";
            case "client", "cliente" -> "Cliente";
            case "paymentMethod", "formaPagamento" -> "Método";
            case "category", "subcategoria" -> "Plano de Contas";
            case "amount", "valor" -> "Valor (R$)";
            case "status" -> "Status";
            case "notes", "observacoes" -> "Observações";
            default -> colKey;
        };
    }

    private TextAlignment getScheduledPaymentColumnAlignment(String colKey) {
        return switch (colKey) {
            case "scheduledDate", "dataAgendamento", "executionDate", "dataExecucao" -> TextAlignment.CENTER;
            case "amount", "valor" -> TextAlignment.RIGHT;
            case "status", "paymentMethod", "formaPagamento", "invoiceNumber" -> TextAlignment.CENTER;
            default -> TextAlignment.LEFT;
        };
    }

    private String getScheduledPaymentColumnValue(String colKey, ScheduledPayment sp, DateTimeFormatter dateFormatter, int totalCols) {
        boolean compact = totalCols >= 8;
        return switch (colKey) {
            case "scheduledDate", "dataAgendamento" -> sp.getScheduledDate() != null ? sp.getScheduledDate().format(dateFormatter) : "-";
            case "executionDate", "dataExecucao" -> sp.getExecutionDate() != null ? sp.getExecutionDate().format(dateFormatter) : "-";
            case "invoiceNumber", "numeroFatura", "fatura" -> sp.getInvoiceNumber() != null ? sp.getInvoiceNumber() : "-";
            case "description", "descricao" -> {
                String d = sp.getDescription() != null ? sp.getDescription() : "";
                int maxLen = compact ? 26 : 38;
                yield d.length() > maxLen ? d.substring(0, maxLen - 3) + "..." : d;
            }
            case "client", "cliente" -> {
                String c = sp.getClient() != null && sp.getClient().getName() != null ? sp.getClient().getName() : "-";
                int maxLen = compact ? 26 : 38;
                yield c.length() > maxLen ? c.substring(0, maxLen - 3) + "..." : c;
            }
            case "paymentMethod", "formaPagamento" -> sp.getPaymentMethod() != null ? sp.getPaymentMethod().name() : "-";
            case "category", "subcategoria" -> {
                if (sp.getSubcategoria() != null) {
                    String cod = sp.getSubcategoria().getCodigo();
                    String nom = sp.getSubcategoria().getNome();
                    yield (cod != null && !cod.isBlank() ? cod + " - " : "") + (nom != null ? nom : "");
                }
                yield "-";
            }
            case "amount", "valor" -> sp.getAmount() != null ? formatCurrency(sp.getAmount()) : "R$ 0,00";
            case "status" -> getScheduledPaymentStatusDisplayName(sp.getStatus());
            case "notes", "observacoes" -> sp.getNotes() != null && !sp.getNotes().isBlank() ? sp.getNotes() : "-";
            default -> "-";
        };
    }

    private Cell createScheduledPaymentStatusBadgeCell(ScheduledPaymentStatus status, boolean isAltRow, float fontSize, float padding) {
        String label = getScheduledPaymentStatusDisplayName(status);
        DeviceRgb textColor;
        if (status == ScheduledPaymentStatus.EXECUTED) {
            textColor = GREEN_TEXT;
        } else if (status == ScheduledPaymentStatus.SCHEDULED) {
            textColor = BLUE_TEXT;
        } else if (status == ScheduledPaymentStatus.CANCELLED || status == ScheduledPaymentStatus.OVERDUE) {
            textColor = RED_PRIMARY;
        } else {
            textColor = SLATE_DARK;
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

    private String getScheduledPaymentStatusDisplayName(ScheduledPaymentStatus status) {
        if (status == null) return "-";
        return switch (status) {
            case SCHEDULED -> "Agendado";
            case EXECUTED -> "Executado / Pago";
            case CANCELLED -> "Cancelado";
            case OVERDUE -> "Vencido";
            default -> status.name();
        };
    }

    // =========================================================================
    // MÉTODOS VISUAIS COMPARTILHADOS (LAYOUT EXECUTIVO IDÊNTICO AO CONTAS A PAGAR)
    // =========================================================================

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

        rightCell.add(new Paragraph(reportTitle != null ? reportTitle.toUpperCase() : "RELATÓRIO FINANCEIRO")
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

        // Barra em degradê (Vermelho -> Laranja -> Ouro)
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
        Cell titleCell = new Cell().setBackgroundColor(SLATE_LIGHT).setBorder(Border.NO_BORDER).setPadding(4f);
        titleCell.add(new Paragraph(title != null ? title.toUpperCase() : "")
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(SLATE_DARK));

        secTable.addCell(barCell);
        secTable.addCell(titleCell);
        document.add(secTable);
    }

    private void addGridRow(Table table, String label1, String value1, String label2, String value2) {
        table.addCell(new Cell().setBackgroundColor(SLATE_LIGHT).setBorder(new SolidBorder(SLATE_BORDER, 0.5f)).setPadding(3f)
                .add(new Paragraph(label1).setFontSize(7f).setBold().setFontColor(SLATE_DARK)));
        table.addCell(new Cell().setBackgroundColor(ColorConstants.WHITE).setBorder(new SolidBorder(SLATE_BORDER, 0.5f)).setPadding(3f)
                .add(new Paragraph(value1 != null ? value1 : "-").setFontSize(7f).setFontColor(SLATE_DARK)));
        table.addCell(new Cell().setBackgroundColor(SLATE_LIGHT).setBorder(new SolidBorder(SLATE_BORDER, 0.5f)).setPadding(3f)
                .add(new Paragraph(label2).setFontSize(7f).setBold().setFontColor(SLATE_DARK)));
        table.addCell(new Cell().setBackgroundColor(ColorConstants.WHITE).setBorder(new SolidBorder(SLATE_BORDER, 0.5f)).setPadding(3f)
                .add(new Paragraph(value2 != null ? value2 : "-").setFontSize(7f).setFontColor(SLATE_DARK)));
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

        // Padrão do relatório: Promover Vigilância Patrimonial Ltda (VIG)
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

    private String formatCurrency(BigDecimal value) {
        if (value == null) return "R$ 0,00";
        NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
        return nf.format(value);
    }
}
