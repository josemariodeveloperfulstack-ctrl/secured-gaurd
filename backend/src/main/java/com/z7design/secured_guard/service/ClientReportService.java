package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ClientReportFilterDTO;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClientReportService {

    private final ClientRepository clientRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public byte[] generateClientPdfReport(ClientReportFilterDTO filters) {
        log.info("Gerando relatório PDF para clientes com filtros: {}", filters);
        List<Client> clients = findClientsByFilters(filters);

        UUID companyId = resolveCompanyId();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE CLIENTES")
                    .landscape(true)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            addReportHeaderInfo(document, filters, clients.size());
            addClientsTable(document, clients);

            document.close();

            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro na geração do PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório PDF", e);
        }
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

    private void addReportHeaderInfo(Document document, ClientReportFilterDTO filters, int totalClients) {
        document.add(new Paragraph("Filtros aplicados:").setBold().setFontSize(10).setMarginBottom(4));
        document.add(new Paragraph(String.format("Nome: %s", filters.getName() != null ? filters.getName() : "Todos"))
                .setFontSize(9));
        document.add(new Paragraph(String.format("CNPJ: %s", filters.getCnpj() != null ? filters.getCnpj() : "Todos"))
                .setFontSize(9));
        document.add(new Paragraph(String.format("Status: %s", filters.getStatus() != null ? filters.getStatus() : "Todos"))
                .setFontSize(9));
        document.add(new Paragraph(String.format("Data Início: %s", filters.getStartDate() != null ? filters.getStartDate() : "N/A"))
                .setFontSize(9));
        document.add(new Paragraph(String.format("Data Fim: %s", filters.getEndDate() != null ? filters.getEndDate() : "N/A"))
                .setFontSize(9));
        document.add(new Paragraph(String.format("Total de clientes: %d", totalClients))
                .setFontSize(10)
                .setBold()
                .setMarginTop(8)
                .setMarginBottom(10));
    }

    private void addClientsTable(Document document, List<Client> clients) {
        if (clients.isEmpty()) {
            document.add(new Paragraph("Nenhum cliente encontrado com os filtros aplicados.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{30, 15, 25, 12, 18}))
                .useAllAvailableWidth()
                .setMarginTop(10);

        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Nome"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("CNPJ"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Email"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Status"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Criado em"));

        for (Client client : clients) {
            table.addCell(standardReportLayoutService.createDataCell(client.getName()));
            table.addCell(standardReportLayoutService.createDataCell(client.getCnpj()));
            table.addCell(standardReportLayoutService.createDataCell(client.getEmail()));
            table.addCell(standardReportLayoutService.createDataCell(
                    client.getStatus() != null ? client.getStatus().toString() : ""));
            table.addCell(standardReportLayoutService.createDataCell(
                    client.getCreatedAt() != null ? client.getCreatedAt().toLocalDate().format(DATE_FORMATTER) : ""));

        }

        document.add(table);
    }

    public byte[] generateClientExcelReport(ClientReportFilterDTO filters) {
        log.info("Gerando relatório Excel para clientes com filtros: {}", filters);
        List<Client> clients = findClientsByFilters(filters);

        // TODO: Implement Excel generation logic here
        // This is a placeholder. You would use a library like Apache POI.
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Example: Create a simple CSV-like output for demonstration
            StringBuilder csvContent = new StringBuilder();
            csvContent.append("ID,Nome,CNPJ,Email,Status,Data de Criação\n");
            for (Client client : clients) {
                csvContent.append(String.format("%s,%s,%s,%s,%s,%s\n",
                        client.getId(),
                        client.getName(),
                        client.getCnpj(),
                        client.getEmail(),
                        client.getStatus(),
                        client.getCreatedAt() != null ? client.getCreatedAt().toLocalDate() : ""
                ));
            }
            baos.write(csvContent.toString().getBytes());
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro na geração do Excel: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório Excel", e);
        }
    }

    private List<Client> findClientsByFilters(ClientReportFilterDTO filters) {
        Specification<Client> spec = Specification.where(null);

        if (filters.getName() != null && !filters.getName().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), "%" + filters.getName().toLowerCase() + "%"));
        }
        if (filters.getCnpj() != null && !filters.getCnpj().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(root.get("cnpj"), "%" + filters.getCnpj() + "%"));
        }
        if (filters.getStatus() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), filters.getStatus()));
        }
        if (filters.getStartDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), LocalDateTime.of(filters.getStartDate(), java.time.LocalTime.MIN)));
        }
        if (filters.getEndDate() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), LocalDateTime.of(filters.getEndDate(), java.time.LocalTime.MAX)));
        }

        return clientRepository.findAll(spec);
    }
}