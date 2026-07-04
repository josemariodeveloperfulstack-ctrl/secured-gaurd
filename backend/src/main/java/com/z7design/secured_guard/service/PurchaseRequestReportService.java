package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.PurchaseRequest;
import com.z7design.secured_guard.model.PurchaseRequestItem;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.PurchaseRequestItemRepository;
import com.z7design.secured_guard.repository.PurchaseRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseRequestReportService {

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRequestItemRepository purchaseRequestItemRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Gera relatório PDF de solicitações de compra utilizando o layout corporativo padrão.
     * Os filtros são equivalentes aos usados atualmente no frontend.
     */
    @Transactional(readOnly = true)
    public byte[] generatePurchaseRequestsReport(LocalDate startDate,
                                                 LocalDate endDate,
                                                 String status,
                                                 BigDecimal minValue,
                                                 BigDecimal maxValue) throws IOException {
        log.info("Gerando relatório PDF de solicitações de compra. startDate={}, endDate={}, status={}, minValue={}, maxValue={}",
                startDate, endDate, status, minValue, maxValue);

        List<PurchaseRequest> allRequests = purchaseRequestRepository.findAll();
        log.info("Total de solicitações encontradas no banco: {}", allRequests.size());

        List<PurchaseRequest> filteredRequests = filterRequests(allRequests, startDate, endDate, status, minValue, maxValue);
        log.info("Total de solicitações após aplicação dos filtros: {}", filteredRequests.size());

        UUID companyId = resolveCompanyId();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE SOLICITAÇÕES DE COMPRA")
                    .landscape(true)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            addReportHeaderInfo(document, filteredRequests, startDate, endDate, status, minValue, maxValue);
            addRequestsTable(document, filteredRequests);

            byte[] result = docWithPdf.closeAndGetPdfBytes(baos, standardReportLayoutService);
            log.info("Relatório PDF de solicitações de compra gerado com sucesso. Tamanho: {} bytes", result.length);
            return result;

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de solicitações de compra: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF de solicitações de compra: " + e.getMessage(), e);
        }
    }

    /**
     * PDF individual de uma solicitação de compra com layout corporativo padrão.
     */
    @Transactional(readOnly = true)
    public byte[] generateSinglePurchaseRequestPdf(UUID requestId) throws IOException {
        PurchaseRequest request = purchaseRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Solicitação de compra não encontrada com ID: " + requestId));

        UUID companyId = resolveCompanyId();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("SOLICITAÇÃO DE COMPRA")
                    .includeEmailInFooter(true)
                    .marginExtraTop(-25f)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            addSingleRequestContent(document, request);

            return docWithPdf.closeAndGetPdfBytes(baos, standardReportLayoutService);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da solicitação {}: {}", requestId, e.getMessage(), e);
            throw new IOException("Erro ao gerar PDF da solicitação de compra: " + e.getMessage(), e);
        }
    }

    private void addSingleRequestContent(Document document, PurchaseRequest request) {
        Paragraph requestNumber = new Paragraph("Número: " + safeText(request.getRequestNumber()))
                .setFontSize(10f)
                .setMarginBottom(8f);
        document.add(requestNumber);

        document.add(createSectionHeader("INFORMAÇÕES BÁSICAS"));
        Table basicTable = new Table(UnitValue.createPercentArray(new float[] { 35f, 65f }))
                .useAllAvailableWidth();
        addLabelValueRow(basicTable, "Título:", request.getTitle());
        addLabelValueRow(basicTable, "Status:", getStatusLabel(request.getStatus()));
        addLabelValueRow(basicTable, "Prioridade:", getPriorityLabel(request.getPriority()));
        addLabelValueRow(basicTable, "Urgência:", getUrgencyLabel(request.getUrgency()));
        addLabelValueRow(basicTable, "Data da Solicitação:", formatDateOptional(request.getRequestDate()));
        addLabelValueRow(basicTable, "Data Necessária:", formatDateOptional(request.getRequiredDate()));
        addLabelValueRow(basicTable, "Valor Estimado:", formatCurrency(getRequestTotalValue(request)));
        document.add(basicTable);

        if (hasText(request.getDescription())) {
            document.add(createSectionHeader("DESCRIÇÃO"));
            document.add(new Paragraph(request.getDescription()).setFontSize(10f));
        }
        if (hasText(request.getJustification())) {
            document.add(createSectionHeader("JUSTIFICATIVA"));
            document.add(new Paragraph(request.getJustification()).setFontSize(10f));
        }

        document.add(createSectionHeader("SOLICITANTE E DEPARTAMENTO"));
        Table requesterTable = new Table(UnitValue.createPercentArray(new float[] { 35f, 65f }))
                .useAllAvailableWidth();
        addLabelValueRow(requesterTable, "Solicitante:", request.getRequesterName());
        addLabelValueRow(requesterTable, "Departamento:", request.getDepartment());
        addLabelValueRow(requesterTable, "Unidade Organizacional:", getUnitName(request));
        document.add(requesterTable);

        if (hasText(request.getApprovedBy()) || request.getApprovalDate() != null
                || hasText(request.getApprovalNotes()) || "APPROVED".equalsIgnoreCase(request.getStatus())) {
            document.add(createSectionHeader("INFORMAÇÕES DE APROVAÇÃO"));
            Table approvalTable = new Table(UnitValue.createPercentArray(new float[] { 35f, 65f }))
                    .useAllAvailableWidth();
            addLabelValueRow(approvalTable, "Aprovador por:", request.getApprovedBy());
            addLabelValueRow(approvalTable, "Data de Aprovação:", formatDateOptional(request.getApprovalDate()));
            document.add(approvalTable);
            if (hasText(request.getApprovalNotes())) {
                document.add(new Paragraph("Observações da Aprovação:").setBold().setFontSize(10f).setMarginTop(6f));
                document.add(new Paragraph(request.getApprovalNotes()).setFontSize(10f));
            }
        }

        if (hasText(request.getSupplier())) {
            document.add(createSectionHeader("INFORMAÇÕES DE FORNECEDOR"));
            Table supplierTable = new Table(UnitValue.createPercentArray(new float[] { 35f, 65f }))
                    .useAllAvailableWidth();
            addLabelValueRow(supplierTable, "Fornecedor:", request.getSupplier());
            addLabelValueRow(supplierTable, "Método de Pagamento:", request.getPaymentMethod());
            addLabelValueRow(supplierTable, "Método de Entrega:", request.getDeliveryMethod());
            document.add(supplierTable);
            if (hasText(request.getDeliveryAddress())) {
                document.add(new Paragraph("Endereço de Entrega:").setBold().setFontSize(10f).setMarginTop(6f));
                document.add(new Paragraph(request.getDeliveryAddress()).setFontSize(10f));
            }
        }

        if (hasText(request.getNotes())) {
            document.add(createSectionHeader("OBSERVAÇÕES ADICIONAIS"));
            document.add(new Paragraph(request.getNotes()).setFontSize(10f));
        }

        // Seção de Itens da Solicitação
        addItemsSection(document, request);
    }

    private void addLabelValueRow(Table table, String label, String value) {
        table.addCell(createLabelCell(label));
        table.addCell(createValueCell(value));
    }

    private Cell createLabelCell(String label) {
        return new Cell().add(new Paragraph(label).setBold().setFontSize(9f)).setPadding(5f);
    }

    private Cell createValueCell(String value) {
        return new Cell().add(new Paragraph(safeText(value)).setFontSize(10f)).setPadding(5f);
    }

    private Paragraph createSectionHeader(String title) {
        return new Paragraph(title)
                .setBold()
                .setFontSize(11f)
                .setFontColor(DeviceRgb.RED)
                .setMarginTop(12f)
                .setMarginBottom(4f)
                .setBorderLeft(new SolidBorder(DeviceRgb.RED, 3f))
                .setPaddingLeft(5f);
    }

    private String getUnitName(PurchaseRequest request) {
        if (request.getUnit() == null) {
            return "-";
        }
        return safeText(request.getUnit().getName());
    }

    private String safeText(String value) {
        return value != null && !value.isBlank() ? value : "-";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String getUrgencyLabel(String urgency) {
        if (urgency == null) {
            return "-";
        }
        return switch (urgency) {
            case "CRITICAL" -> "Crítica";
            case "URGENT" -> "Urgente";
            case "NORMAL" -> "Normal";
            case "LOW" -> "Baixa";
            default -> urgency;
        };
    }

    private List<PurchaseRequest> filterRequests(List<PurchaseRequest> requests,
                                                 LocalDate startDate,
                                                 LocalDate endDate,
                                                 String status,
                                                 BigDecimal minValue,
                                                 BigDecimal maxValue) {

        return requests.stream()
                // Filtro por data - usar requestDate ou createdAt como fallback
                .filter(req -> {
                    if (startDate == null) {
                        return true;
                    }
                    LocalDateTime dateToCompare = req.getRequestDate() != null ? req.getRequestDate() : req.getCreatedAt();
                    if (dateToCompare == null) {
                        return false;
                    }
                    LocalDateTime startDateTime = startDate.atStartOfDay();
                    return !dateToCompare.isBefore(startDateTime);
                })
                .filter(req -> {
                    if (endDate == null) {
                        return true;
                    }
                    LocalDateTime dateToCompare = req.getRequestDate() != null ? req.getRequestDate() : req.getCreatedAt();
                    if (dateToCompare == null) {
                        return false;
                    }
                    LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
                    return !dateToCompare.isAfter(endDateTime);
                })
                // Filtro por status (ignorar "all")
                .filter(req -> {
                    if (status == null || status.isBlank() || "all".equalsIgnoreCase(status)) {
                        return true;
                    }
                    return status.equalsIgnoreCase(req.getStatus());
                })
                // Filtro por valor mínimo
                .filter(req -> {
                    if (minValue == null || minValue.compareTo(BigDecimal.ZERO) <= 0) {
                        return true;
                    }
                    BigDecimal value = getRequestTotalValue(req);
                    return value.compareTo(minValue) >= 0;
                })
                // Filtro por valor máximo
                .filter(req -> {
                    if (maxValue == null || maxValue.compareTo(BigDecimal.ZERO) <= 0) {
                        return true;
                    }
                    BigDecimal value = getRequestTotalValue(req);
                    return value.compareTo(maxValue) <= 0;
                })
                .collect(Collectors.toList());
    }

    private BigDecimal getRequestTotalValue(PurchaseRequest req) {
        // No backend temos apenas o estimatedTotal diretamente na entidade.
        // O frontend usava totalValue (calculado) como preferência, depois estimatedTotal.
        // Aqui usamos apenas estimatedTotal ou ZERO se nulo.
        return Objects.requireNonNullElse(req.getEstimatedTotal(), BigDecimal.ZERO);
    }

    private UUID resolveCompanyId() {
        UUID companyId = null;

        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            Company company = activeCompanies.get(0);
            companyId = company.getId();
            log.info("Usando primeira empresa ativa para relatório de compras: {} (ID: {})",
                    company.getName(), companyId);
        } else {
            List<Company> allCompanies = companyRepository.findAll();
            if (allCompanies != null && !allCompanies.isEmpty()) {
                Company company = allCompanies.get(0);
                companyId = company.getId();
                log.warn("Nenhuma empresa ativa encontrada. Usando primeira empresa cadastrada para relatório de compras: {} (ID: {})",
                        company.getName(), companyId);
            } else {
                throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório de compras. " +
                        "Nenhuma empresa cadastrada no sistema. Por favor, cadastre pelo menos uma empresa.");
            }
        }

        return companyId;
    }

    private void addReportHeaderInfo(Document document,
                                     List<PurchaseRequest> requests,
                                     LocalDate startDate,
                                     LocalDate endDate,
                                     String status,
                                     BigDecimal minValue,
                                     BigDecimal maxValue) {

        // Data/hora de geração
        Paragraph generatedAt = new Paragraph(
                "Gerado em: " + LocalDateTime.now().format(DATE_TIME_FORMATTER))
                .setTextAlignment(TextAlignment.RIGHT)
                .setFontSize(10)
                .setMarginBottom(10);
        document.add(generatedAt);

        // Filtros aplicados
        boolean hasAnyFilter = startDate != null || endDate != null ||
                (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) ||
                (minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0) ||
                (maxValue != null && maxValue.compareTo(BigDecimal.ZERO) > 0);

        if (hasAnyFilter) {
            Paragraph filtersTitle = new Paragraph("Filtros aplicados:")
                    .setFontSize(11)
                    .setBold()
                    .setMarginBottom(4);
            document.add(filtersTitle);

            if (startDate != null || endDate != null) {
                StringBuilder period = new StringBuilder("Período: ");
                if (startDate != null && endDate != null) {
                    period.append(startDate.format(DATE_FORMATTER))
                            .append(" a ")
                            .append(endDate.format(DATE_FORMATTER));
                } else if (startDate != null) {
                    period.append("A partir de ")
                            .append(startDate.format(DATE_FORMATTER));
                } else {
                    period.append("Até ")
                            .append(endDate.format(DATE_FORMATTER));
                }
                document.add(new Paragraph(period.toString()).setFontSize(10));
            }

            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                document.add(new Paragraph("Status: " + getStatusLabel(status))
                        .setFontSize(10));
            }

            if ((minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0) ||
                    (maxValue != null && maxValue.compareTo(BigDecimal.ZERO) > 0)) {
                StringBuilder valueFilter = new StringBuilder("Valor: ");
                if (minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0 &&
                        maxValue != null && maxValue.compareTo(BigDecimal.ZERO) > 0) {
                    valueFilter.append(formatCurrency(minValue))
                            .append(" a ")
                            .append(formatCurrency(maxValue));
                } else if (minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0) {
                    valueFilter.append("a partir de ")
                            .append(formatCurrency(minValue));
                } else if (maxValue != null && maxValue.compareTo(BigDecimal.ZERO) > 0) {
                    valueFilter.append("até ")
                            .append(formatCurrency(maxValue));
                }
                document.add(new Paragraph(valueFilter.toString()).setFontSize(10));
            }

            document.add(new Paragraph("").setMarginBottom(5));
        }

        // Estatísticas principais
        BigDecimal totalValue = requests.stream()
                .map(this::getRequestTotalValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        Paragraph stats = new Paragraph(String.format(
                "Total de solicitações: %d | Valor total estimado: %s",
                requests.size(), formatCurrency(totalValue)))
                .setFontSize(11)
                .setBold()
                .setMarginBottom(10);

        document.add(stats);
    }

    private void addRequestsTable(Document document, List<PurchaseRequest> requests) {
        if (requests.isEmpty()) {
            Paragraph noData = new Paragraph("Nenhuma solicitação de compra encontrada com os filtros aplicados.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20);
            document.add(noData);
            return;
        }

        // Tabela com colunas equivalentes ao relatório atual do frontend
        // Os valores abaixo somam 100 para evitar corte da tabela na margem direita.
        Table table = new Table(UnitValue.createPercentArray(new float[]{
                6,  // Número
                11, // Título
                9,  // Solicitante
                7,  // Departamento
                6,  // Status
                6,  // Prioridade
                6,  // Urgência
                7,  // Data Solicitação
                7,  // Data Necessária
                9,  // Aprovado por
                6,  // Data Aprovação
                8,  // Fornecedor
                5,  // Qtd. Itens
                7   // Valor
        }))
                .useAllAvailableWidth()
                .setMarginTop(10);

        // Cabeçalhos
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Número"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Título"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Solicitante"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Departamento"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Status"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Prioridade"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Urgência"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Data Solicitação"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Data Necessária"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Aprovado por"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Data Aprovação"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Fornecedor"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Qtd. Itens"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Valor"));

        for (PurchaseRequest req : requests) {
            table.addCell(standardReportLayoutService.createDataCell(
                    req.getRequestNumber() != null ? req.getRequestNumber() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(
                    req.getTitle() != null ? req.getTitle() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(
                    req.getRequesterName() != null ? req.getRequesterName() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(
                    req.getDepartment() != null ? req.getDepartment() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(
                    getStatusLabel(req.getStatus())));
            table.addCell(standardReportLayoutService.createDataCell(
                    getPriorityLabel(req.getPriority())));
            table.addCell(standardReportLayoutService.createDataCell(
                    req.getUrgency() != null ? req.getUrgency() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(
                    formatDateOptional(req.getRequestDate())));
            table.addCell(standardReportLayoutService.createDataCell(
                    formatDateOptional(req.getRequiredDate())));
            table.addCell(standardReportLayoutService.createDataCell(
                    req.getApprovedBy() != null ? req.getApprovedBy() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(
                    formatDateOptional(req.getApprovalDate())));
            table.addCell(standardReportLayoutService.createDataCell(
                    req.getSupplier() != null ? req.getSupplier() : "-"));
            long itemCount = purchaseRequestItemRepository.countByPurchaseRequestId(req.getId());
            table.addCell(standardReportLayoutService.createDataCell(
                    String.valueOf(itemCount)));
            table.addCell(standardReportLayoutService.createDataCell(
                    formatCurrency(getRequestTotalValue(req))));
        }

        document.add(table);
    }

    /**
     * Adiciona seção de itens ao PDF individual de uma solicitação de compra.
     */
    private void addItemsSection(Document document, PurchaseRequest request) {
        List<PurchaseRequestItem> items = purchaseRequestItemRepository
                .findByPurchaseRequestIdOrderByItemNameAsc(request.getId());

        if (items == null || items.isEmpty()) {
            return;
        }

        document.add(createSectionHeader("ITENS DA SOLICITAÇÃO"));

        Paragraph itemCount = new Paragraph("Total de itens: " + items.size())
                .setFontSize(10f)
                .setMarginBottom(6f);
        document.add(itemCount);

        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{
                5f,   // #
                25f,  // Item
                25f,  // Descrição
                8f,   // Unidade
                10f,  // Quantidade
                12f,  // Valor Unitário
                15f   // Valor Total
        })).useAllAvailableWidth().setMarginTop(4f);

        // Cabeçalhos
        itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("#"));
        itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
        itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
        itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Unidade"));
        itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Quantidade"));
        itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Valor Unit."));
        itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Valor Total"));

        BigDecimal grandTotal = BigDecimal.ZERO;
        int index = 1;

        for (PurchaseRequestItem item : items) {
            itemsTable.addCell(standardReportLayoutService.createDataCell(String.valueOf(index++)));
            itemsTable.addCell(standardReportLayoutService.createDataCell(
                    safeText(item.getItemName())));
            itemsTable.addCell(standardReportLayoutService.createDataCell(
                    safeText(item.getDescription())));
            itemsTable.addCell(standardReportLayoutService.createDataCell(
                    safeText(item.getUnit())));
            itemsTable.addCell(standardReportLayoutService.createDataCell(
                    item.getQuantity() != null ? item.getQuantity().toPlainString() : "-"));
            itemsTable.addCell(standardReportLayoutService.createDataCell(
                    formatCurrency(item.getUnitPrice())));

            BigDecimal itemTotal = item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO;
            itemsTable.addCell(standardReportLayoutService.createDataCell(
                    formatCurrency(itemTotal)));
            grandTotal = grandTotal.add(itemTotal);
        }

        document.add(itemsTable);

        // Linha de total
        Paragraph totalLine = new Paragraph("Total dos Itens: " + formatCurrency(grandTotal))
                .setBold()
                .setFontSize(11f)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginTop(6f);
        document.add(totalLine);
    }

    private String formatCurrency(BigDecimal value) {
        if (value == null) {
            value = BigDecimal.ZERO;
        }
        BigDecimal rounded = value.setScale(2, RoundingMode.HALF_UP);
        String numeric = rounded.toString().replace(".", ",");
        return "R$ " + numeric;
    }

    private String formatDateOptional(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "-";
        }
        return dateTime.format(DATE_FORMATTER);
    }

    private String getStatusLabel(String status) {
        if (status == null) {
            return "-";
        }
        switch (status) {
            case "DRAFT":
                return "Rascunho";
            case "SUBMITTED":
                return "Enviada";
            case "PENDING":
                return "Pendente";
            case "IN_PROCESS":
                return "Em Processo";
            case "APPROVED":
                return "Aprovada";
            case "REJECTED":
                return "Rejeitada";
            case "COMPLETED":
                return "Completada";
            case "CANCELLED":
                return "Cancelada";
            default:
                return status;
        }
    }

    private String getPriorityLabel(String priority) {
        if (priority == null) {
            return "-";
        }
        switch (priority) {
            case "URGENT":
                return "Urgente";
            case "HIGH":
                return "Alta";
            case "MEDIUM":
                return "Média";
            case "LOW":
                return "Baixa";
            default:
                return priority;
        }
    }
}

