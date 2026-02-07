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
import com.z7design.secured_guard.model.Proposal;
import com.z7design.secured_guard.model.enums.ProposalStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.ProposalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProposalReportService {

    private final ProposalRepository proposalRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public byte[] generateProposalPdfReport(String status, String clientName, String searchTerm) {
        log.info("Gerando relatório PDF de propostas. status={}, clientName={}, searchTerm={}", status, clientName, searchTerm);

        List<Proposal> allProposals = proposalRepository.findAll();
        List<Proposal> filtered = filterProposals(allProposals, status, clientName, searchTerm);

        UUID companyId = resolveCompanyId();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE PROPOSTAS")
                    .landscape(true)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            addReportHeaderInfo(document, status, clientName, searchTerm, filtered.size());
            addProposalsTable(document, filtered);

            document.close();

            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de propostas: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório PDF de propostas", e);
        }
    }

    public byte[] generateProposalExcelReport(String status, String clientName, String searchTerm) {
        log.info("Gerando relatório Excel de propostas");

        List<Proposal> allProposals = proposalRepository.findAll();
        List<Proposal> filtered = filterProposals(allProposals, status, clientName, searchTerm);

        StringBuilder csv = new StringBuilder();
        csv.append("Número;Título;Cliente;Status;Valor;Válida Até;Responsável\n");

        for (Proposal p : filtered) {
            String proposalNumber = p.getProposalNumber() != null ? p.getProposalNumber() : "";
            String title = p.getTitle() != null ? p.getTitle() : "";
            String clientNameVal = p.getClient() != null && p.getClient().getName() != null ? p.getClient().getName() : "";
            String statusVal = p.getStatus() != null ? getStatusLabel(p.getStatus()) : "";
            String value = formatMoney(p.getTotalValue());
            String validUntil = p.getValidUntil() != null ? p.getValidUntil().format(DATE_FORMATTER) : "";
            String assignedTo = p.getAssignedTo() != null && p.getAssignedTo().getName() != null ? p.getAssignedTo().getName() : "Não atribuído";

            csv.append(escapeCsv(proposalNumber)).append(";");
            csv.append(escapeCsv(title)).append(";");
            csv.append(escapeCsv(clientNameVal)).append(";");
            csv.append(escapeCsv(statusVal)).append(";");
            csv.append(escapeCsv(value)).append(";");
            csv.append(escapeCsv(validUntil)).append(";");
            csv.append(escapeCsv(assignedTo)).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<Proposal> filterProposals(List<Proposal> proposals, String status, String clientName, String searchTerm) {
        return proposals.stream()
                .filter(p -> matchesStatus(p, status))
                .filter(p -> matchesClient(p, clientName))
                .filter(p -> matchesSearchTerm(p, searchTerm))
                .collect(Collectors.toList());
    }

    private boolean matchesStatus(Proposal p, String status) {
        return status == null || status.isBlank() || "all".equalsIgnoreCase(status)
                || (p.getStatus() != null && p.getStatus().name().equalsIgnoreCase(status));
    }

    private boolean matchesClient(Proposal p, String clientName) {
        return clientName == null || clientName.isBlank() || "all".equalsIgnoreCase(clientName)
                || (p.getClient() != null && p.getClient().getName() != null
                && p.getClient().getName().equalsIgnoreCase(clientName));
    }

    private boolean matchesSearchTerm(Proposal p, String searchTerm) {
        if (searchTerm == null || searchTerm.isBlank()) return true;
        String term = searchTerm.toLowerCase().trim();
        return (p.getTitle() != null && p.getTitle().toLowerCase().contains(term))
                || (p.getProposalNumber() != null && p.getProposalNumber().toLowerCase().contains(term))
                || (p.getClient() != null && p.getClient().getName() != null
                && p.getClient().getName().toLowerCase().contains(term));
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

    private void addReportHeaderInfo(Document document, String status, String clientName, String searchTerm, int total) {
        document.add(new Paragraph("Filtros aplicados:").setBold().setFontSize(10).setMarginBottom(4));
        document.add(new Paragraph(String.format("Status: %s", status != null && !status.isBlank() && !"all".equalsIgnoreCase(status) ? getStatusLabel(status) : "Todos")).setFontSize(9));
        document.add(new Paragraph(String.format("Cliente: %s", clientName != null && !clientName.isBlank() && !"all".equalsIgnoreCase(clientName) ? clientName : "Todos")).setFontSize(9));
        document.add(new Paragraph(String.format("Busca: %s", searchTerm != null && !searchTerm.isBlank() ? searchTerm : "-")).setFontSize(9));
        document.add(new Paragraph(String.format("Total de propostas: %d", total)).setFontSize(10).setBold().setMarginTop(8).setMarginBottom(10));
    }

    private void addProposalsTable(Document document, List<Proposal> proposals) {
        if (proposals.isEmpty()) {
            document.add(new Paragraph("Nenhuma proposta encontrada com os filtros aplicados.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{12, 22, 25, 12, 12, 10, 7}))
                .useAllAvailableWidth()
                .setMarginTop(10);

        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Número"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Título"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Cliente"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Status"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Valor"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Válida Até"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Responsável"));

        for (Proposal p : proposals) {
            table.addCell(standardReportLayoutService.createDataCell(p.getProposalNumber() != null ? p.getProposalNumber() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(p.getTitle() != null ? p.getTitle() : "-"));
            String clientNameVal = p.getClient() != null && p.getClient().getName() != null ? p.getClient().getName() : "-";
            table.addCell(standardReportLayoutService.createDataCell(clientNameVal));
            table.addCell(standardReportLayoutService.createDataCell(p.getStatus() != null ? getStatusLabel(p.getStatus()) : "-"));
            table.addCell(standardReportLayoutService.createDataCell(formatMoney(p.getTotalValue())));
            table.addCell(standardReportLayoutService.createDataCell(p.getValidUntil() != null ? p.getValidUntil().format(DATE_FORMATTER) : "-"));
            String assignedTo = p.getAssignedTo() != null && p.getAssignedTo().getName() != null ? p.getAssignedTo().getName() : "Não atribuído";
            table.addCell(standardReportLayoutService.createDataCell(assignedTo));
        }

        document.add(table);
    }

    private String formatMoney(BigDecimal value) {
        if (value == null) return "0,00";
        return java.text.NumberFormat.getCurrencyInstance(new Locale("pt", "BR"))
                .format(value.setScale(2, RoundingMode.HALF_UP))
                .replace("R$", "").trim();
    }

    private String getStatusLabel(ProposalStatus status) {
        return status != null ? status.getDisplayName() : "-";
    }

    private String getStatusLabel(String status) {
        if (status == null) return "-";
        try {
            return ProposalStatus.valueOf(status).getDisplayName();
        } catch (Exception e) {
            return status;
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
