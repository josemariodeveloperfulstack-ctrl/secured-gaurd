package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.TrainingListReportRequest;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrainingListStandardPdfService {

    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    public byte[] generatePdf(TrainingListReportRequest request) {
        UUID companyId = resolveCompanyId(request.getCompanyId());
        log.info("📄 Gerando PDF da Lista de Treinamentos para empresa: {}", companyId);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("LISTA DE TREINAMENTOS")
                    .includeEmailInFooter(true)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // Tabela de Treinamentos
            float[] columnWidths = { 25f, 15f, 15f, 20f, 13f, 12f };
            Table table = new Table(UnitValue.createPercentArray(columnWidths)).useAllAvailableWidth();

            // Cabeçalho da Tabela
            String[] headers = { "Funcionário", "Cargo", "Setor", "Treinamento", "Validade", "Status" };
            for (String header : headers) {
                table.addHeaderCell(new Cell()
                        .add(new Paragraph(header).setBold())
                        .setBackgroundColor(new DeviceRgb(200, 0, 0))
                        .setFontColor(DeviceRgb.WHITE)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setPadding(5f));
            }

            // Conteúdo da Tabela
            if (request.getRows() != null) {
                for (TrainingListReportRequest.TrainingRowDTO row : request.getRows()) {
                    table.addCell(new Cell()
                            .add(new Paragraph(row.getEmployeeName() + "\n" + row.getEmployeeCpf()).setFontSize(9f)));
                    table.addCell(new Cell()
                            .add(new Paragraph(row.getEmployeePosition() != null ? row.getEmployeePosition() : "-")
                                    .setFontSize(9f)));
                    table.addCell(new Cell()
                            .add(new Paragraph(row.getSector() != null ? row.getSector() : "-").setFontSize(9f)));
                    table.addCell(new Cell().add(new Paragraph(row.getTrainingName()).setFontSize(9f)));
                    table.addCell(new Cell().add(new Paragraph(row.getExpirationDate()).setFontSize(9f))
                            .setTextAlignment(TextAlignment.CENTER));

                    // Status com cor
                    String status = row.getStatus() != null ? row.getStatus().toLowerCase() : "";
                    DeviceRgb statusColor = new DeviceRgb(0, 0, 0); // Preto padrão
                    String statusText = row.getStatus();

                    if (status.contains("valid") || status.contains("dia")) {
                        statusColor = new DeviceRgb(0, 150, 0);
                        statusText = "Válido";
                    } else if (status.contains("expir") || status.contains("vencid")) {
                        statusColor = new DeviceRgb(200, 0, 0);
                        statusText = "Expirado";
                    } else if (status.contains("soon") || status.contains("atenc")) {
                        statusColor = new DeviceRgb(200, 150, 0);
                        statusText = "Atenção";
                    }

                    table.addCell(new Cell().add(new Paragraph(statusText)
                            .setFontSize(9f)
                            .setFontColor(statusColor)
                            .setBold())
                            .setTextAlignment(TextAlignment.CENTER));
                }
            }

            document.add(table);
            document.close();

            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da lista de treinamentos", e);
            throw new RuntimeException("Falha ao gerar relatório PDF", e);
        }
    }

    private UUID resolveCompanyId(UUID providedId) {
        if (providedId != null && !providedId.equals(new UUID(0, 0))) {
            return providedId;
        }

        // Buscar primeira empresa ativa
        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            return activeCompanies.get(0).getId();
        }

        // Fallback para qualquer empresa
        List<Company> allCompanies = companyRepository.findAll();
        if (allCompanies != null && !allCompanies.isEmpty()) {
            return allCompanies.get(0).getId();
        }

        throw new RuntimeException("Não foi possível determinar a empresa para o relatório.");
    }
}
