package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.PurchaseQuotation;
import com.z7design.secured_guard.model.enums.PurchaseQuotationStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.PurchaseQuotationRepository;
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
public class PurchaseQuotationReportService {

    private final PurchaseQuotationRepository purchaseQuotationRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Gera relatório PDF de cotações de compra com layout corporativo padrão (formato retrato).
     */
    @Transactional(readOnly = true)
    public byte[] generateQuotationsReport(String quoteNumber,
                                          String title,
                                          UUID supplierId,
                                          String status,
                                          LocalDate startValidUntil,
                                          LocalDate endValidUntil,
                                          UUID assignedToId,
                                          BigDecimal minValue,
                                          BigDecimal maxValue) throws IOException {
        log.info("Gerando relatório PDF de cotações de compra");

        List<PurchaseQuotation> allQuotations = purchaseQuotationRepository.findAllWithRelations();
        log.info("Total de cotações encontradas no banco: {}", allQuotations.size());

        List<PurchaseQuotation> filtered = filterQuotations(allQuotations, quoteNumber, title, supplierId,
                status, startValidUntil, endValidUntil, assignedToId, minValue, maxValue);
        log.info("Total de cotações após filtros: {}", filtered.size());

        UUID companyId = resolveCompanyId();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE COTAÇÕES DE COMPRA")
                    .landscape(false)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            addReportHeaderInfo(document, filtered, startValidUntil, endValidUntil, status, minValue, maxValue);
            addQuotationsTable(document, filtered);

            document.close();

            byte[] result = baos.toByteArray();
            log.info("Relatório PDF de cotações gerado com sucesso. Tamanho: {} bytes", result.length);
            return result;

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de cotações: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF de cotações: " + e.getMessage(), e);
        }
    }

    private List<PurchaseQuotation> filterQuotations(List<PurchaseQuotation> quotations,
                                                     String quoteNumber,
                                                     String title,
                                                     UUID supplierId,
                                                     String status,
                                                     LocalDate startValidUntil,
                                                     LocalDate endValidUntil,
                                                     UUID assignedToId,
                                                     BigDecimal minValue,
                                                     BigDecimal maxValue) {
        return quotations.stream()
                .filter(q -> quoteNumber == null || quoteNumber.isBlank()
                        || (q.getQuoteNumber() != null && q.getQuoteNumber().toLowerCase().contains(quoteNumber.toLowerCase().trim())))
                .filter(q -> title == null || title.isBlank()
                        || (q.getTitle() != null && q.getTitle().toLowerCase().contains(title.toLowerCase().trim())))
                .filter(q -> supplierId == null || (q.getSupplier() != null && supplierId.equals(q.getSupplier().getId())))
                .filter(q -> status == null || status.isBlank() || "all".equalsIgnoreCase(status)
                        || (q.getStatus() != null && q.getStatus().name().equalsIgnoreCase(status)))
                .filter(q -> {
                    if (startValidUntil == null) return true;
                    return q.getValidUntil() != null && !q.getValidUntil().isBefore(startValidUntil);
                })
                .filter(q -> {
                    if (endValidUntil == null) return true;
                    return q.getValidUntil() != null && !q.getValidUntil().isAfter(endValidUntil);
                })
                .filter(q -> assignedToId == null || (q.getAssignedTo() != null && assignedToId.equals(q.getAssignedTo().getId())))
                .filter(q -> minValue == null || minValue.compareTo(BigDecimal.ZERO) <= 0
                        || (q.getTotalValue() != null && q.getTotalValue().compareTo(minValue) >= 0))
                .filter(q -> maxValue == null || maxValue.compareTo(BigDecimal.ZERO) <= 0
                        || (q.getTotalValue() != null && q.getTotalValue().compareTo(maxValue) <= 0))
                .collect(Collectors.toList());
    }

    private UUID resolveCompanyId() {
        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            return activeCompanies.get(0).getId();
        }
        List<Company> allCompanies = companyRepository.findAll();
        if (allCompanies != null && !allCompanies.isEmpty()) {
            return allCompanies.get(0).getId();
        }
        throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório. " +
                "Nenhuma empresa cadastrada no sistema.");
    }

    private void addReportHeaderInfo(Document document,
                                     List<PurchaseQuotation> quotations,
                                     LocalDate startValidUntil,
                                     LocalDate endValidUntil,
                                     String status,
                                     BigDecimal minValue,
                                     BigDecimal maxValue) {
        Paragraph generatedAt = new Paragraph(
                "Gerado em: " + LocalDateTime.now().format(DATE_TIME_FORMATTER))
                .setTextAlignment(TextAlignment.RIGHT)
                .setFontSize(10)
                .setMarginBottom(10);
        document.add(generatedAt);

        boolean hasFilter = startValidUntil != null || endValidUntil != null
                || (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status))
                || (minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0)
                || (maxValue != null && maxValue.compareTo(BigDecimal.ZERO) > 0);

        if (hasFilter) {
            document.add(new Paragraph("Filtros aplicados:").setFontSize(11).setBold().setMarginBottom(4));

            if (startValidUntil != null || endValidUntil != null) {
                String period;
                if (startValidUntil != null && endValidUntil != null) {
                    period = startValidUntil.format(DATE_FORMATTER) + " a " + endValidUntil.format(DATE_FORMATTER);
                } else if (startValidUntil != null) {
                    period = "A partir de " + startValidUntil.format(DATE_FORMATTER);
                } else {
                    period = "Até " + (endValidUntil != null ? endValidUntil.format(DATE_FORMATTER) : "");
                }
                document.add(new Paragraph("Validade: " + period).setFontSize(10));
            }
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
                document.add(new Paragraph("Status: " + getStatusLabel(status)).setFontSize(10));
            }
            if ((minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0)
                    || (maxValue != null && maxValue.compareTo(BigDecimal.ZERO) > 0)) {
                String val;
                if (minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0
                        && maxValue != null && maxValue.compareTo(BigDecimal.ZERO) > 0) {
                    val = formatCurrency(minValue) + " a " + formatCurrency(maxValue);
                } else if (minValue != null && minValue.compareTo(BigDecimal.ZERO) > 0) {
                    val = "a partir de " + formatCurrency(minValue);
                } else {
                    val = "até " + (maxValue != null ? formatCurrency(maxValue) : "");
                }
                document.add(new Paragraph("Valor: " + val).setFontSize(10));
            }
            document.add(new Paragraph("").setMarginBottom(5));
        }

        BigDecimal totalValue = quotations.stream()
                .map(PurchaseQuotation::getTotalValue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        document.add(new Paragraph(String.format(
                "Total de cotações: %d | Valor total: %s",
                quotations.size(), formatCurrency(totalValue)))
                .setFontSize(11)
                .setBold()
                .setMarginBottom(10));
    }

    private void addQuotationsTable(Document document, List<PurchaseQuotation> quotations) {
        if (quotations.isEmpty()) {
            document.add(new Paragraph("Nenhuma cotação encontrada com os filtros aplicados.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{
                12, 18, 22, 12, 12, 14, 10
        }))
                .useAllAvailableWidth()
                .setMarginTop(10);

        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Número"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Título"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Fornecedor"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Status"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Válida Até"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Responsável"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Valor Total"));

        for (PurchaseQuotation q : quotations) {
            table.addCell(standardReportLayoutService.createDataCell(q.getQuoteNumber() != null ? q.getQuoteNumber() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(q.getTitle() != null ? q.getTitle() : "-"));
            String supplierName = q.getSupplier() != null && q.getSupplier().getName() != null
                    ? q.getSupplier().getName() : "Não informado";
            table.addCell(standardReportLayoutService.createDataCell(supplierName));
            table.addCell(standardReportLayoutService.createDataCell(getStatusLabel(q.getStatus())));
            table.addCell(standardReportLayoutService.createDataCell(
                    q.getValidUntil() != null ? q.getValidUntil().format(DATE_FORMATTER) : "-"));
            String assignedName = q.getAssignedTo() != null && q.getAssignedTo().getName() != null
                    ? q.getAssignedTo().getName() : "Não atribuído";
            table.addCell(standardReportLayoutService.createDataCell(assignedName));
            table.addCell(standardReportLayoutService.createDataCell(
                    formatCurrency(q.getTotalValue() != null ? q.getTotalValue() : BigDecimal.ZERO)));
        }

        document.add(table);
    }

    private String formatCurrency(BigDecimal value) {
        if (value == null) value = BigDecimal.ZERO;
        return "R$ " + value.setScale(2, RoundingMode.HALF_UP).toString().replace(".", ",");
    }

    private String getStatusLabel(PurchaseQuotationStatus status) {
        if (status == null) return "-";
        return status.getDisplayName();
    }

    private String getStatusLabel(String status) {
        if (status == null) return "-";
        try {
            return PurchaseQuotationStatus.valueOf(status).getDisplayName();
        } catch (Exception e) {
            return status;
        }
    }
}
