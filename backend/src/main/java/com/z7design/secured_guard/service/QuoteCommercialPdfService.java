package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.Quote;
import com.z7design.secured_guard.model.QuoteItem;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.QuoteRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Serviço para gerar PDF de Orçamento usando o layout padronizado
 * (StandardReportLayoutService) - logo da empresa, gradiente, cabeçalho/rodapé.
 * Suporta opção de incluir serviços (itens) no PDF.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QuoteCommercialPdfService {

    private final QuoteRepository quoteRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID quoteId, boolean includeServices) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new ResourceNotFoundException("Orçamento não encontrado com ID: " + quoteId));

        UUID companyId = resolveCompanyId();
        Company companyForConfig = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("ORÇAMENTO COMERCIAL")
                    .reportSubTitle((companyForConfig.getName() != null ? companyForConfig.getName() : "Secured Guard") + " | Relatório Oficial")
                    .build();

            DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContent(document, quote, includeServices);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do orçamento: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF do orçamento", e);
        }
    }

    private void addContent(Document document, Quote quote, boolean includeServices) {
        String clientName = quote.getClient() != null && quote.getClient().getName() != null
                ? quote.getClient().getName() : "N/A";
        String quoteNumber = quote.getQuoteNumber() != null ? quote.getQuoteNumber() : "-";
        String createdAt = quote.getCreatedAt() != null ? quote.getCreatedAt().format(DATE_FORMATTER) : "-";
        String status = quote.getStatus() != null ? quote.getStatus().getDisplayName() : "-";
        String validUntil = quote.getValidUntil() != null ? quote.getValidUntil().format(DATE_FORMATTER) : "-";

        StringBuilder infoLine = new StringBuilder();
        infoLine.append("Número: ").append(quoteNumber).append(" | Data: ").append(createdAt);
        infoLine.append(" | Cliente: ").append(clientName).append(" | Status: ").append(status);
        infoLine.append(" | Válido até: ").append(validUntil);

        document.add(new Paragraph(infoLine.toString())
                .setFontSize(9f)
                .setFontColor(new DeviceRgb(100, 100, 100))
                .setMarginBottom(8f));

        if (quote.getClient() != null) {
            String addr = buildClientAddress(quote.getClient());
            if (addr != null && !addr.isEmpty()) {
                document.add(new Paragraph("Endereço: " + addr)
                        .setFontSize(8f)
                        .setFontColor(new DeviceRgb(120, 120, 120))
                        .setMarginBottom(15f));
            }
        }

        document.add(new Paragraph("Resumo do Orçamento")
                .setBold()
                .setFontSize(14f)
                .setFontColor(new DeviceRgb(255, 204, 0))
                .setMarginTop(10f)
                .setMarginBottom(8f));

        BigDecimal totalValue = quote.getTotalValue() != null ? quote.getTotalValue() : BigDecimal.ZERO;

        Table resumoTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                .useAllAvailableWidth()
                .setMarginBottom(15f);
        resumoTable.addCell(createValueCell("VALOR TOTAL", formatMoney(totalValue)));
        document.add(resumoTable);

        document.add(new Paragraph().setHeight(1f).setBackgroundColor(new DeviceRgb(255, 204, 0)).setMarginBottom(15f));

        if (quote.getDescription() != null && !quote.getDescription().isEmpty()) {
            document.add(new Paragraph("DESCRIÇÃO")
                    .setBold()
                    .setFontSize(11f)
                    .setMarginTop(10f)
                    .setMarginBottom(5f)
                    .setPaddingLeft(5f)
                    .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

            document.add(new Paragraph(quote.getDescription())
                    .setFontSize(10f)
                    .setFontColor(new DeviceRgb(80, 80, 80))
                    .setMarginBottom(15f));
        }

        if (includeServices) {
            List<QuoteItem> items = quote.getItems();
            if (items != null && !items.isEmpty()) {
                document.add(new Paragraph("SERVIÇOS / ITENS")
                        .setBold()
                        .setFontSize(11f)
                        .setFontColor(new DeviceRgb(30, 64, 124))
                        .setMarginTop(15f)
                        .setMarginBottom(8f)
                        .setPaddingLeft(5f)
                        .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

                Table itemsTable = new Table(UnitValue.createPercentArray(new float[] { 8, 50, 12, 15, 15 }))
                        .useAllAvailableWidth()
                        .setMarginBottom(10f);

                itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
                itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
                itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Qtd"));
                itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("V. Unit."));
                itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Total"));

                int idx = 1;
                for (QuoteItem item : items) {
                    itemsTable.addCell(standardReportLayoutService.createDataCell(String.valueOf(idx++)));
                    itemsTable.addCell(standardReportLayoutService.createDataCell(
                            item.getDescription() != null ? item.getDescription() : "-"));
                    itemsTable.addCell(standardReportLayoutService.createDataCell(
                            item.getQuantity() != null ? String.valueOf(item.getQuantity()) : "-"));
                    itemsTable.addCell(standardReportLayoutService.createDataCell(
                            formatMoney(item.getUnitPrice())));
                    itemsTable.addCell(standardReportLayoutService.createDataCell(
                            formatMoney(item.getTotalPrice())));
                }

                document.add(itemsTable);
            } else {
                document.add(new Paragraph("Nenhum serviço ou item cadastrado neste orçamento.")
                        .setFontSize(10f)
                        .setFontColor(new DeviceRgb(120, 120, 120))
                        .setMarginTop(15f)
                        .setMarginBottom(10f));
            }
        }
    }

    private String buildClientAddress(com.z7design.secured_guard.model.Client client) {
        List<String> parts = new ArrayList<>();
        if (client.getAddress() != null && !client.getAddress().isEmpty()) {
            parts.add(client.getAddress());
        }
        if (client.getCity() != null && !client.getCity().isEmpty()) {
            String cityState = client.getCity();
            if (client.getState() != null && !client.getState().isEmpty()) {
                cityState += " - " + client.getState();
            }
            if (client.getZipCode() != null && !client.getZipCode().isEmpty()) {
                cityState += " | CEP: " + client.getZipCode();
            }
            parts.add(cityState);
        }
        return String.join(", ", parts);
    }

    private Cell createValueCell(String label, String value) {
        Cell cell = new Cell();
        cell.add(new Paragraph(label)
                .setFontSize(9f)
                .setFontColor(new DeviceRgb(100, 100, 100)));
        cell.add(new Paragraph(value)
                .setBold()
                .setFontSize(14f));
        cell.setPadding(5f);
        return cell;
    }

    private String formatMoney(BigDecimal value) {
        if (value == null) return "R$ 0,00";
        return java.text.NumberFormat.getCurrencyInstance(new Locale("pt", "BR"))
                .format(value.setScale(2, RoundingMode.HALF_UP));
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
        throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório.");
    }
}
