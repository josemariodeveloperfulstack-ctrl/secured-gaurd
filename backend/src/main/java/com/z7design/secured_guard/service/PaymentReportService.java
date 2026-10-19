package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.AccountsReceivableReportDTO;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.ScheduledPaymentReportDTO;
import com.z7design.secured_guard.model.AccountsReceivable;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.ScheduledPayment;
import com.z7design.secured_guard.model.Subcategoria;
import com.z7design.secured_guard.model.enums.ReceivableStatus;
import com.z7design.secured_guard.model.enums.ScheduledPaymentStatus;
import com.z7design.secured_guard.repository.AccountsReceivableRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.ScheduledPaymentRepository;
import com.z7design.secured_guard.repository.SubcategoriaRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Unit;
import java.util.Map;
import java.util.HashMap;
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
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional(readOnly = true)
public class PaymentReportService {

    private final AccountsReceivableRepository accountsReceivableRepository;
    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final ScheduledPaymentService scheduledPaymentService;
    private final JasperReportService jasperReportService;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;
    private final SubcategoriaRepository subcategoriaRepository;
    private final UnitRepository unitRepository;

    public PaymentReportService(
            AccountsReceivableRepository accountsReceivableRepository,
            ScheduledPaymentRepository scheduledPaymentRepository,
            ScheduledPaymentService scheduledPaymentService,
            JasperReportService jasperReportService,
            StandardReportLayoutService standardReportLayoutService,
            CompanyRepository companyRepository,
            SubcategoriaRepository subcategoriaRepository,
            UnitRepository unitRepository) {
        this.accountsReceivableRepository = accountsReceivableRepository;
        this.scheduledPaymentRepository = scheduledPaymentRepository;
        this.scheduledPaymentService = scheduledPaymentService;
        this.jasperReportService = jasperReportService;
        this.standardReportLayoutService = standardReportLayoutService;
        this.companyRepository = companyRepository;
        this.subcategoriaRepository = subcategoriaRepository;
        this.unitRepository = unitRepository;
    }

    /**
     * Gerar relatório de contas a receber
     */
    public byte[] generateAccountsReceivableReportPDF(LocalDate startDate,
            LocalDate endDate,
            String clientFilter,
            String statusFilter,
            String categoryFilter,
            String paymentMethodFilter,
            BigDecimal amountMin,
            BigDecimal amountMax,
            String unitFilter,
            List<String> selectedIds,
            String reportSegment,
            String sortDir,
            UUID subcategoriaId) throws IOException {
        String normalizedSegment = normalizeReceivableReportSegment(reportSegment);
        log.info(
                "Gerando relatório PDF de contas a receber com layout padrão - Período: {} a {}, Cliente: {}, Empresa/Filial: {}, Status: {}, Segmento: {}, Categoria: {}, Método: {}, Valor: {} a {}, IDs: {}, Subcategoria: {}",
                startDate, endDate, clientFilter, unitFilter, statusFilter, normalizedSegment, categoryFilter, paymentMethodFilter,
                amountMin, amountMax, selectedIds, subcategoriaId);

        try {
            // Buscar dados com filtros
            List<AccountsReceivable> accounts = getAccountsReceivableFiltered(
                    startDate, endDate, clientFilter, unitFilter, statusFilter, categoryFilter,
                    paymentMethodFilter, amountMin, amountMax, selectedIds, normalizedSegment, sortDir, subcategoriaId);

            log.info("Dados obtidos: {} contas a receber", accounts.size());

            // Usar iText com layout padrão
            return generateAccountsReceivableReportPDFWithIText(
                    accounts, startDate, endDate, clientFilter, unitFilter, statusFilter,
                    categoryFilter, paymentMethodFilter, amountMin, amountMax, normalizedSegment, subcategoriaId);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de contas a receber", e);
            throw new IOException("Erro ao gerar relatório de contas a receber: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a receber usando iText com layout padrão
     */
    private byte[] generateAccountsReceivableReportPDFWithIText(List<AccountsReceivable> accounts,
            LocalDate startDate,
            LocalDate endDate,
            String clientFilter,
            String unitFilter,
            String statusFilter,
            String categoryFilter,
            String paymentMethodFilter,
            BigDecimal amountMin,
            BigDecimal amountMax,
            String reportSegment,
            UUID subcategoriaId) throws IOException {
        log.info("Gerando relatório PDF de contas a receber com iText - {} contas", accounts.size());

        // Determinar companyId - usar primeira empresa ativa como fallback
        java.util.UUID companyId = null;
        List<Company> activeCompaniesList = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompaniesList != null && !activeCompaniesList.isEmpty()) {
            companyId = activeCompaniesList.get(0).getId();
            log.info("Usando primeira empresa ativa: {} (ID: {})",
                    activeCompaniesList.get(0).getName(), companyId);
        } else {
            List<Company> allCompanies = companyRepository.findAll();
            if (allCompanies != null && !allCompanies.isEmpty()) {
                companyId = allCompanies.get(0).getId();
                log.warn("Nenhuma empresa ativa encontrada. Usando primeira empresa cadastrada: {} (ID: {})",
                        allCompanies.get(0).getName(), companyId);
            } else {
                throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório. " +
                        "Nenhuma empresa cadastrada no sistema. Por favor, cadastre pelo menos uma empresa.");
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(receivableReportTitleForSegment(reportSegment))
                    .topMargin(120f)
                    .bottomMargin(80f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Informações do relatório
            Paragraph reportInfo = new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10)
                    .setMarginBottom(10);
            document.add(reportInfo);

            // Filtros aplicados
            if (startDate != null || endDate != null || clientFilter != null || unitFilter != null || statusFilter != null ||
                    categoryFilter != null || paymentMethodFilter != null || amountMin != null || amountMax != null
                    || reportSegment != null) {
                if (unitFilter != null && !unitFilter.isEmpty() && !unitFilter.equalsIgnoreCase("all")) {
                    String unitName = unitFilter;
                    try {
                        UUID unitId = UUID.fromString(unitFilter);
                        Optional<Unit> unit = unitRepository.findById(unitId);
                        if (unit.isPresent()) {
                            unitName = unit.get().getName();
                        }
                    } catch (Exception e) {
                        log.warn("Erro ao buscar nome da filial para relatório: {}", unitFilter);
                    }
                    document.add(new Paragraph("Empresa: " + unitName)
                            .setFontSize(10)
                            .setMarginBottom(2));
                }
                if (reportSegment != null) {
                    document.add(new Paragraph("Tipo de relatório: " + receivableReportSegmentLabel(reportSegment))
                            .setFontSize(10)
                            .setMarginBottom(2));
                }
                if (startDate != null && endDate != null) {
                    document.add(
                            new Paragraph("Período: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                                    " a " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10)
                                    .setMarginBottom(2));
                }
                if (clientFilter != null && !clientFilter.isEmpty()) {
                    document.add(new Paragraph("Cliente: " + clientFilter).setFontSize(10).setMarginBottom(2));
                }
                if (reportSegment == null && statusFilter != null && !statusFilter.isEmpty()
                        && !statusFilter.equals("ALL")) {
                    document.add(new Paragraph("Status: " + statusFilter).setFontSize(10).setMarginBottom(2));
                }
                if (categoryFilter != null && !categoryFilter.isEmpty() && !categoryFilter.equals("ALL")) {
                    document.add(new Paragraph("Categoria: " + categoryFilter).setFontSize(10).setMarginBottom(2));
                }
                if (paymentMethodFilter != null && !paymentMethodFilter.isEmpty()
                        && !paymentMethodFilter.equals("ALL")) {
                    document.add(new Paragraph("Método de Pagamento: " + paymentMethodFilter).setFontSize(10)
                            .setMarginBottom(2));
                }
                if (subcategoriaId != null) {
                    String subcategoriaDisplay = subcategoriaId.toString();
                    try {
                        Optional<Subcategoria> subOpt = subcategoriaRepository.findById(subcategoriaId);
                        if (subOpt.isPresent()) {
                            Subcategoria sub = subOpt.get();
                            String nome = sub.getNome();
                            String codigo = sub.getCodigo();
                            subcategoriaDisplay = (codigo != null && !codigo.isBlank() ? codigo + " - " : "") + nome;
                        }
                    } catch (Exception e) {
                        log.warn("Erro ao resolver subcategoria {} para exibição no relatório: {}", subcategoriaId,
                                e.getMessage());
                    }
                    document.add(new Paragraph("Plano de Contas: " + subcategoriaDisplay).setFontSize(10)
                            .setMarginBottom(2));
                }
                if (amountMin != null || amountMax != null) {
                    String amountRange = "Valor: ";
                    if (amountMin != null)
                        amountRange += "R$ "
                                + amountMin.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",");
                    if (amountMin != null && amountMax != null)
                        amountRange += " a ";
                    if (amountMax != null)
                        amountRange += "R$ "
                                + amountMax.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",");
                    document.add(new Paragraph(amountRange).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Estatísticas
            BigDecimal totalAmount = accounts.stream()
                    .map(AccountsReceivable::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPending = accounts.stream()
                    .filter(a -> a.getStatus() != null &&
                            (a.getStatus() == ReceivableStatus.PENDING || a.getStatus() == ReceivableStatus.OVERDUE))
                    .map(AccountsReceivable::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Paragraph stats = new Paragraph(String.format(
                    "Total de contas: %d | Valor Total: R$ %s | Valor Pendente: R$ %s",
                    accounts.size(),
                    totalAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ","),
                    totalPending.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            // Ranking de Clientes com Mais Dias de Atraso (Ordenado do maior para o menor)
            if ("INADIMPLENCIA".equalsIgnoreCase(reportSegment) && !accounts.isEmpty()) {
                Paragraph rankingTitle = new Paragraph("RANKING DE CLIENTES EM ATRASO (MAIOR PARA O MENOR ATRASO)")
                        .setFontSize(11)
                        .setBold()
                        .setMarginBottom(8);
                document.add(rankingTitle);

                LocalDate today = LocalDate.now();
                class ClientDelaySummary {
                    String clientName;
                    long maxDelayDays;
                    int countOverdue;
                    BigDecimal totalOverdueAmount = BigDecimal.ZERO;
                }

                Map<String, ClientDelaySummary> delayMap = new HashMap<>();
                for (AccountsReceivable acc : accounts) {
                    String cName = acc.getClient() != null && acc.getClient().getName() != null && !acc.getClient().getName().isBlank()
                            ? acc.getClient().getName()
                            : "Cliente não informado";

                    long days = 0;
                    if (acc.getDueDate() != null && acc.getDueDate().isBefore(today)) {
                        days = java.time.temporal.ChronoUnit.DAYS.between(acc.getDueDate(), today);
                    }

                    ClientDelaySummary summary = delayMap.computeIfAbsent(cName, k -> {
                        ClientDelaySummary s = new ClientDelaySummary();
                        s.clientName = k;
                        return s;
                    });

                    if (days > summary.maxDelayDays) {
                        summary.maxDelayDays = days;
                    }
                    summary.countOverdue++;
                    if (acc.getAmount() != null) {
                        summary.totalOverdueAmount = summary.totalOverdueAmount.add(acc.getAmount());
                    }
                }

                List<ClientDelaySummary> delayRanking = delayMap.values().stream()
                        .sorted(Comparator.comparingLong((ClientDelaySummary s) -> s.maxDelayDays).reversed()
                                .thenComparing(s -> s.totalOverdueAmount, Comparator.reverseOrder()))
                        .collect(Collectors.toList());

                Table rankingTable = new Table(5).setWidth(UnitValue.createPercentValue(100));
                rankingTable.setMarginBottom(15);
                rankingTable.addHeaderCell(createHeaderCell("# Pos"));
                rankingTable.addHeaderCell(createHeaderCell("Cliente Inadimplente"));
                rankingTable.addHeaderCell(createHeaderCell("Maior Atraso"));
                rankingTable.addHeaderCell(createHeaderCell("Qtd. Contas"));
                rankingTable.addHeaderCell(createHeaderCell("Valor Total em Atraso"));

                int pos = 1;
                for (ClientDelaySummary s : delayRanking) {
                    rankingTable.addCell(createCell(String.valueOf(pos++)));
                    rankingTable.addCell(createCell(s.clientName));
                    rankingTable.addCell(createCell(s.maxDelayDays + " dias"));
                    rankingTable.addCell(createCell(s.countOverdue + (s.countOverdue > 1 ? " contas" : " conta")));
                    rankingTable.addCell(createCell("R$ " + s.totalOverdueAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")));
                }
                document.add(rankingTable);

                document.add(new Paragraph("DETALHAMENTO DAS CONTAS A RECEBER")
                        .setFontSize(11)
                        .setBold()
                        .setMarginBottom(8));
            }

            // Tabela de contas
            if (accounts.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma conta a receber encontrada com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(9).setWidth(UnitValue.createPercentValue(100));

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Cliente"));
                table.addHeaderCell(createHeaderCell("Nº Fatura"));
                table.addHeaderCell(createHeaderCell("Conta"));
                table.addHeaderCell(createHeaderCell("Emissão"));
                table.addHeaderCell(createHeaderCell("Vencimento"));
                table.addHeaderCell(createHeaderCell("Valor"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Categoria"));
                table.addHeaderCell(createHeaderCell("Método"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (AccountsReceivable account : accounts) {
                    table.addCell(createCell(account.getClient() != null ? account.getClient().getName() : ""));
                    table.addCell(createCell(account.getInvoiceNumber() != null ? account.getInvoiceNumber() : ""));
                    table.addCell(createCell(getContaPlanoDeContas(account)));
                    table.addCell(createCell(
                            account.getIssueDate() != null ? account.getIssueDate().format(dateFormatter) : ""));
                    table.addCell(
                            createCell(account.getDueDate() != null ? account.getDueDate().format(dateFormatter) : ""));
                    table.addCell(
                            createCell(
                                    account.getAmount() != null
                                            ? "R$ " + account.getAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                                                    .toString().replace(".", ",")
                                            : ""));
                    table.addCell(createCell(account.getStatus() != null ? getStatusLabel(account.getStatus()) : ""));
                    table.addCell(createCell(account.getCategory() != null ? account.getCategory().toString() : ""));
                    table.addCell(createCell(
                            account.getPaymentMethod() != null ? account.getPaymentMethod().toString() : ""));
                }

                document.add(table);
            }

            // Finalizar layout padrão (adiciona header/footer em todas as páginas)
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);

            document.close();

        } catch (Exception e) {
            log.error("Erro ao gerar PDF de contas a receber: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de contas a receber gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    /**
     * Obtém a conta do plano de contas vinculada à conta a receber (ex.: código -
     * nome), de forma segura contra lazy loading.
     */
    private String getContaPlanoDeContas(AccountsReceivable account) {
        try {
            if (account.getSubcategoria() != null) {
                String codigo = account.getSubcategoria().getCodigo();
                String nome = account.getSubcategoria().getNome();
                return (codigo != null ? codigo : "") + " - " + (nome != null ? nome : "");
            }
        } catch (Exception e) {
            log.warn("Erro ao acessar subcategoria da conta a receber {}: {}", account.getId(), e.getMessage());
        }
        return "Não informado";
    }

    private String getStatusLabel(ReceivableStatus status) {
        if (status == null)
            return "";
        return switch (status) {
            case PENDING -> "Pendente";
            case PAID -> "Pago";
            case OVERDUE -> "Vencido";
            case CANCELLED -> "Cancelado";
            case PARTIAL -> "Parcial";
        };
    }

    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }

    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setTextAlignment(TextAlignment.LEFT);
    }

    /**
     * Gerar relatório de pagamentos agendados
     */
    public byte[] generateScheduledPaymentReportPDF(LocalDate startDate,
            LocalDate endDate,
            String clientFilter,
            String statusFilter,
            String paymentMethodFilter,
            BigDecimal amountMin,
            BigDecimal amountMax,
            List<String> selectedIds) throws IOException {
        log.info(
                "Gerando relatório PDF de pagamentos agendados com layout padrão - Período: {} a {}, Cliente: {}, Status: {}, Método: {}, Valor: {} a {}, IDs: {}",
                startDate, endDate, clientFilter, statusFilter, paymentMethodFilter, amountMin, amountMax, selectedIds);

        try {
            // Buscar dados com filtros
            List<ScheduledPayment> payments = getScheduledPaymentsFiltered(
                    startDate, endDate, clientFilter, statusFilter,
                    paymentMethodFilter, amountMin, amountMax, selectedIds);

            log.info("Dados obtidos: {} pagamentos agendados", payments.size());

            // Usar iText com layout padrão
            return generateScheduledPaymentReportPDFWithIText(
                    payments, startDate, endDate, clientFilter, statusFilter,
                    paymentMethodFilter, amountMin, amountMax);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de pagamentos agendados", e);
            throw new IOException("Erro ao gerar relatório de pagamentos agendados: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de pagamentos agendados usando iText com layout padrão
     */
    private byte[] generateScheduledPaymentReportPDFWithIText(List<ScheduledPayment> payments,
            LocalDate startDate,
            LocalDate endDate,
            String clientFilter,
            String statusFilter,
            String paymentMethodFilter,
            BigDecimal amountMin,
            BigDecimal amountMax) throws IOException {
        log.info("Gerando relatório PDF de pagamentos agendados com iText - {} pagamentos", payments.size());

        // Determinar companyId - usar primeira empresa ativa como fallback
        java.util.UUID companyId = null;
        List<Company> activeCompaniesList2 = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompaniesList2 != null && !activeCompaniesList2.isEmpty()) {
            companyId = activeCompaniesList2.get(0).getId();
            log.info("Usando primeira empresa ativa: {} (ID: {})",
                    activeCompaniesList2.get(0).getName(), companyId);
        } else {
            List<Company> allCompanies = companyRepository.findAll();
            if (allCompanies != null && !allCompanies.isEmpty()) {
                companyId = allCompanies.get(0).getId();
                log.warn("Nenhuma empresa ativa encontrada. Usando primeira empresa cadastrada: {} (ID: {})",
                        allCompanies.get(0).getName(), companyId);
            } else {
                throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório. " +
                        "Nenhuma empresa cadastrada no sistema. Por favor, cadastre pelo menos uma empresa.");
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE PAGAMENTOS AGENDADOS")
                    .topMargin(120f)
                    .bottomMargin(80f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Informações do relatório
            Paragraph reportInfo = new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10)
                    .setMarginBottom(10);
            document.add(reportInfo);

            // Filtros aplicados
            if (startDate != null || endDate != null || clientFilter != null || statusFilter != null ||
                    paymentMethodFilter != null || amountMin != null || amountMax != null) {
                if (startDate != null && endDate != null) {
                    document.add(
                            new Paragraph("Período: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                                    " a " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10)
                                    .setMarginBottom(2));
                }
                if (clientFilter != null && !clientFilter.isEmpty()) {
                    document.add(new Paragraph("Cliente: " + clientFilter).setFontSize(10).setMarginBottom(2));
                }
                if (statusFilter != null && !statusFilter.isEmpty() && !statusFilter.equals("ALL")) {
                    document.add(new Paragraph("Status: " + statusFilter).setFontSize(10).setMarginBottom(2));
                }
                if (paymentMethodFilter != null && !paymentMethodFilter.isEmpty()
                        && !paymentMethodFilter.equals("ALL")) {
                    document.add(new Paragraph("Método de Pagamento: " + paymentMethodFilter).setFontSize(10)
                            .setMarginBottom(2));
                }
                if (amountMin != null || amountMax != null) {
                    String amountRange = "Valor: ";
                    if (amountMin != null)
                        amountRange += "R$ "
                                + amountMin.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",");
                    if (amountMin != null && amountMax != null)
                        amountRange += " a ";
                    if (amountMax != null)
                        amountRange += "R$ "
                                + amountMax.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",");
                    document.add(new Paragraph(amountRange).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Estatísticas
            BigDecimal totalAmount = payments.stream()
                    .map(ScheduledPayment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long scheduledCount = payments.stream().filter(p -> p.getStatus() == ScheduledPaymentStatus.SCHEDULED)
                    .count();
            long executedCount = payments.stream().filter(p -> p.getStatus() == ScheduledPaymentStatus.EXECUTED)
                    .count();
            long cancelledCount = payments.stream().filter(p -> p.getStatus() == ScheduledPaymentStatus.CANCELLED)
                    .count();

            Paragraph stats = new Paragraph(String.format(
                    "Total de pagamentos: %d | Agendados: %d | Executados: %d | Cancelados: %d | Valor Total: R$ %s",
                    payments.size(), scheduledCount, executedCount, cancelledCount,
                    totalAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            // Tabela de pagamentos
            if (payments.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum pagamento agendado encontrado com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(8).setWidth(UnitValue.createPercentValue(100));

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Cliente"));
                table.addHeaderCell(createHeaderCell("Conta"));
                table.addHeaderCell(createHeaderCell("Data Agendada"));
                table.addHeaderCell(createHeaderCell("Valor"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Método"));
                table.addHeaderCell(createHeaderCell("Descrição"));
                table.addHeaderCell(createHeaderCell("Observações"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (ScheduledPayment payment : payments) {
                    table.addCell(createCell(payment.getClient() != null ? payment.getClient().getName() : ""));
                    table.addCell(createCell(getContaPlanoDeContas(payment)));
                    table.addCell(createCell(
                            payment.getScheduledDate() != null ? payment.getScheduledDate().format(dateFormatter)
                                    : ""));
                    table.addCell(
                            createCell(
                                    payment.getAmount() != null
                                            ? "R$ " + payment.getAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                                                    .toString().replace(".", ",")
                                            : ""));
                    table.addCell(
                            createCell(payment.getStatus() != null ? getPaymentStatusLabel(payment.getStatus()) : ""));
                    table.addCell(createCell(
                            payment.getPaymentMethod() != null ? payment.getPaymentMethod().toString() : ""));

                    // Descrição (truncar se muito longa)
                    String desc = payment.getDescription() != null ? payment.getDescription() : "";
                    if (desc.length() > 40) {
                        desc = desc.substring(0, 37) + "...";
                    }
                    table.addCell(createCell(desc));

                    // Notas (truncar se muito longa)
                    String notes = payment.getNotes() != null ? payment.getNotes() : "";
                    if (notes.length() > 40) {
                        notes = notes.substring(0, 37) + "...";
                    }
                    table.addCell(createCell(notes));
                }

                document.add(table);
            }

            // Finalizar layout padrão (adiciona header/footer em todas as páginas)
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);

            document.close();

        } catch (Exception e) {
            log.error("Erro ao gerar PDF de pagamentos agendados: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de pagamentos agendados gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private String getContaPlanoDeContas(ScheduledPayment payment) {
        try {
            if (payment == null || payment.getSubcategoria() == null) {
                return "Não informado";
            }
            Subcategoria sub = payment.getSubcategoria();
            String codigo = sub.getCodigo();
            String nome = sub.getNome();
            if (codigo != null && !codigo.isBlank() && nome != null && !nome.isBlank()) {
                return codigo + " - " + nome;
            }
            if (nome != null && !nome.isBlank()) {
                return nome;
            }
            return "Não informado";
        } catch (Exception e) {
            log.warn("Erro ao resolver conta do Plano de Contas do pagamento agendado {}: {}",
                    payment != null && payment.getId() != null ? payment.getId() : "?", e.getMessage());
            return "Não informado";
        }
    }

    private String getPaymentStatusLabel(ScheduledPaymentStatus status) {
        if (status == null)
            return "";
        return switch (status) {
            case SCHEDULED -> "Agendado";
            case EXECUTED -> "Executado";
            case CANCELLED -> "Cancelado";
            case OVERDUE -> "Vencido";
        };
    }

    private String normalizeReceivableReportSegment(String segment) {
        if (segment == null || segment.isBlank()) {
            return null;
        }
        String s = segment.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        s = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return switch (s) {
            case "INADIMPLENCIA" -> "INADIMPLENCIA";
            case "RECEBIDOS" -> "RECEBIDOS";
            case "A_VENCER", "AVENCER" -> "A_VENCER";
            case "VENCIDOS" -> "VENCIDOS";
            default -> null;
        };
    }

    private boolean matchesReceivableReportSegment(AccountsReceivable account, String segment) {
        LocalDate today = LocalDate.now();
        ReceivableStatus st = account.getStatus();
        LocalDate due = account.getDueDate();
        return switch (segment) {
            case "RECEBIDOS" -> st == ReceivableStatus.PAID;
            case "A_VENCER" -> (st == ReceivableStatus.PENDING || st == ReceivableStatus.PARTIAL)
                    && due != null && !due.isBefore(today);
            case "VENCIDOS" -> st != ReceivableStatus.PAID && st != ReceivableStatus.CANCELLED
                    && due != null && due.isBefore(today);
            case "INADIMPLENCIA" -> st == ReceivableStatus.OVERDUE;
            default -> true;
        };
    }

    private boolean matchesReceivableStatusOrSegment(AccountsReceivable account, String statusFilter,
            String reportSegment) {
        if (reportSegment != null && !reportSegment.isEmpty()) {
            return matchesReceivableReportSegment(account, reportSegment);
        }
        if (statusFilter == null || statusFilter.isEmpty() || statusFilter.equalsIgnoreCase("ALL")) {
            return true;
        }

        String accountStatus = account.getStatus().toString();
        if (accountStatus.equalsIgnoreCase(statusFilter)) {
            return true;
        }

        // Mapeamento de status do frontend
        return switch (statusFilter.toUpperCase(Locale.ROOT)) {
            case "ABERTA" -> account.getStatus() == ReceivableStatus.PENDING || account.getStatus() == ReceivableStatus.PARTIAL;
            case "RECEBIDA" -> account.getStatus() == ReceivableStatus.PAID;
            case "VENCIDA" -> account.getStatus() == ReceivableStatus.OVERDUE;
            case "CANCELADA" -> account.getStatus() == ReceivableStatus.CANCELLED;
            default -> false;
        };
    }

    private String receivableReportTitleForSegment(String segment) {
        if (segment == null) {
            return "RELATÓRIO DE CONTAS A RECEBER";
        }
        return switch (segment) {
            case "INADIMPLENCIA" -> "RELATÓRIO DE INADIMPLENTES";
            case "RECEBIDOS" -> "RELATÓRIO DE CONTAS RECEBIDAS";
            case "A_VENCER" -> "RELATÓRIO DE CONTAS A VENCER";
            case "VENCIDOS" -> "RELATÓRIO DE INADIMPLENTES";
            default -> "RELATÓRIO DE CONTAS A RECEBER";
        };
    }

    private String receivableReportSegmentLabel(String segment) {
        if (segment == null) {
            return "";
        }
        return switch (segment) {
            case "INADIMPLENCIA" -> "Inadimplência";
            case "RECEBIDOS" -> "Recebidos";
            case "A_VENCER" -> "A vencer";
            case "VENCIDOS" -> "Vencidos";
            default -> segment;
        };
    }

    /**
     * Buscar contas a receber com filtros
     */
    private List<AccountsReceivable> getAccountsReceivableFiltered(LocalDate startDate,
            LocalDate endDate,
            String clientFilter,
            String unitFilter,
            String statusFilter,
            String categoryFilter,
            String paymentMethodFilter,
            BigDecimal amountMin,
            BigDecimal amountMax,
            List<String> selectedIds,
            String reportSegment,
            String sortDir,
            UUID subcategoriaId) {
        List<AccountsReceivable> accounts = accountsReceivableRepository.findAll();
        log.info("Encontradas {} contas a receber no banco de dados", accounts.size());

        // Aplicar filtros e ordenar por vencimento
        List<AccountsReceivable> filtered = accounts.stream()
                .filter(account -> startDate == null || !account.getDueDate().isBefore(startDate))
                .filter(account -> endDate == null || !account.getDueDate().isAfter(endDate))
                .filter(account -> clientFilter == null || clientFilter.isEmpty() ||
                        account.getClient().getName().toLowerCase().contains(clientFilter.toLowerCase()))
                .filter(account -> unitFilter == null || unitFilter.isEmpty() || unitFilter.equalsIgnoreCase("all") ||
                        (account.getUnit() != null && account.getUnit().getId().toString().equals(unitFilter)))
                .filter(account -> matchesReceivableStatusOrSegment(account, statusFilter, reportSegment))
                .filter(account -> categoryFilter == null || categoryFilter.isEmpty() || categoryFilter.equalsIgnoreCase("ALL") ||
                        account.getCategory().toString().equalsIgnoreCase(categoryFilter))
                .filter(account -> paymentMethodFilter == null || paymentMethodFilter.isEmpty()
                        || paymentMethodFilter.equalsIgnoreCase("ALL") ||
                        account.getPaymentMethod().toString().equalsIgnoreCase(paymentMethodFilter))
                .filter(account -> subcategoriaId == null ||
                        (account.getSubcategoria() != null && account.getSubcategoria().getId().equals(subcategoriaId)))
                .filter(account -> amountMin == null || account.getAmount().compareTo(amountMin) >= 0)
                .filter(account -> amountMax == null || account.getAmount().compareTo(amountMax) <= 0)
                .filter(account -> selectedIds == null || selectedIds.isEmpty() ||
                        selectedIds.contains(account.getId().toString()))
                .collect(Collectors.toList());
        return sortAccountsReceivableByDueDate(filtered, sortDir);
    }

    private List<AccountsReceivable> sortAccountsReceivableByDueDate(List<AccountsReceivable> accounts, String sortDir) {
        Comparator<AccountsReceivable> byDueDate = Comparator.comparing(
                AccountsReceivable::getDueDate,
                Comparator.nullsLast(Comparator.naturalOrder()));
        if (sortDir != null && sortDir.trim().equalsIgnoreCase("DESC")) {
            byDueDate = byDueDate.reversed();
        }
        return accounts.stream().sorted(byDueDate).collect(Collectors.toList());
    }

    /**
     * Buscar pagamentos agendados com filtros
     */
    private List<ScheduledPayment> getScheduledPaymentsFiltered(LocalDate startDate,
            LocalDate endDate,
            String clientFilter,
            String statusFilter,
            String paymentMethodFilter,
            BigDecimal amountMin,
            BigDecimal amountMax,
            List<String> selectedIds) {
        List<ScheduledPayment> payments = scheduledPaymentRepository.findAll();
        log.info("Encontrados {} pagamentos agendados no banco de dados", payments.size());

        // Aplicar filtros
        return payments.stream()
                .filter(payment -> startDate == null || !payment.getScheduledDate().isBefore(startDate))
                .filter(payment -> endDate == null || !payment.getScheduledDate().isAfter(endDate))
                .filter(payment -> clientFilter == null || clientFilter.isEmpty() ||
                        payment.getClient().getName().toLowerCase().contains(clientFilter.toLowerCase()))
                .filter(payment -> statusFilter == null || statusFilter.isEmpty() || statusFilter.equals("ALL") ||
                        payment.getStatus().toString().equals(statusFilter))
                .filter(payment -> paymentMethodFilter == null || paymentMethodFilter.isEmpty()
                        || paymentMethodFilter.equals("ALL") ||
                        payment.getPaymentMethod().toString().equals(paymentMethodFilter))
                .filter(payment -> amountMin == null || payment.getAmount().compareTo(amountMin) >= 0)
                .filter(payment -> amountMax == null || payment.getAmount().compareTo(amountMax) <= 0)
                .filter(payment -> selectedIds == null || selectedIds.isEmpty() ||
                        selectedIds.contains(payment.getId().toString()))
                .collect(Collectors.toList());
    }

    /**
     * Excluir múltiplas contas a receber
     */
    @Transactional
    public void deleteMultipleAccountsReceivable(List<String> ids) {
        log.info("Excluindo {} contas a receber", ids.size());

        List<UUID> uuids = ids.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(UUID::fromString)
                .distinct()
                .toList();

        if (uuids.isEmpty()) {
            log.warn("Nenhum UUID válido após normalizar a lista de exclusão");
            return;
        }

        // Cancelar automaticamente os agendamentos vinculados às contas excluídas
        uuids.forEach(scheduledPaymentService::cancelByAccountsReceivableId);

        int removed = accountsReceivableRepository.deleteByIds(uuids);
        log.info("Exclusão em massa concluída: {} registro(s) removido(s) para {} id(s) solicitado(s)",
                removed, uuids.size());
    }

    /**
     * Excluir múltiplos pagamentos agendados
     */
    @Transactional
    public void deleteMultipleScheduledPayments(List<String> ids) {
        log.info("Excluindo {} pagamentos agendados", ids.size());

        for (String id : ids) {
            try {
                scheduledPaymentRepository.deleteById(java.util.UUID.fromString(id));
                log.info("Pagamento agendado excluído: {}", id);
            } catch (Exception e) {
                log.error("Erro ao excluir pagamento agendado {}: {}", id, e.getMessage());
            }
        }

        log.info("Exclusão múltipla de pagamentos agendados concluída");
    }
}
