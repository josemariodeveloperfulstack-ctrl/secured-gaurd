package com.z7design.secured_guard.service;

import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.WorkPostReportFilterDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.WorkPostStatus;
import com.z7design.secured_guard.model.enums.WorkPostType;
import com.z7design.secured_guard.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import static com.z7design.secured_guard.model.Company.CompanyStatus;

/**
 * Gera o relatório PDF de postos de trabalho usando o layout padrão do sistema
 * (cabeçalho com gradiente/logo, título, tabela com cabeçalho cinza, rodapé com numeração).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkPostReportService {

    private static final String REPORT_TITLE = "RELATÓRIO DE POSTOS DE TRABALHO";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final WorkPostService workPostService;
    private final StandardReportLayoutService layoutService;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public byte[] generatePdf(WorkPostReportFilterDTO filters) {
        log.info("Gerando relatório PDF de postos de trabalho com filtros: {}", filters);

        UUID companyId = resolveCompanyId();
        List<WorkPost> workPosts = workPostService.findForReport(filters != null ? filters : WorkPostReportFilterDTO.builder().build());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(REPORT_TITLE)
                    .landscape(true)
                    .showPageNumbers(true)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addReportHeaderInfo(document, filters, workPosts.size());
            addResumo(document, workPosts);
            addWorkPostsTable(document, workPosts);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de postos: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório PDF de postos de trabalho", e);
        }
    }

    private UUID resolveCompanyId() {
        List<Company> active = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (active != null && !active.isEmpty()) return active.get(0).getId();
        List<Company> all = companyRepository.findAll();
        if (all != null && !all.isEmpty()) return all.get(0).getId();
        throw new ResourceNotFoundException("Nenhuma empresa cadastrada para gerar o relatório.");
    }

    private void addReportHeaderInfo(Document document, WorkPostReportFilterDTO filters, int total) {
        document.add(new Paragraph("Filtros aplicados:").setBold().setFontSize(10).setMarginBottom(4));
        String search = (filters != null && filters.getSearchTerm() != null && !filters.getSearchTerm().isBlank())
                ? filters.getSearchTerm().trim() : "Todos";
        document.add(new Paragraph("Busca: " + search).setFontSize(9));
        String status = (filters != null && filters.getStatus() != null && !"all".equalsIgnoreCase(filters.getStatus()))
                ? filters.getStatus() : "Todos os status";
        document.add(new Paragraph("Status: " + status).setFontSize(9));
        String type = (filters != null && filters.getType() != null && !"all".equalsIgnoreCase(filters.getType()))
                ? filters.getType() : "Todos os tipos";
        document.add(new Paragraph("Tipo: " + type).setFontSize(9));
        String client = (filters != null && filters.getClientId() != null && !"all".equalsIgnoreCase(filters.getClientId()))
                ? filters.getClientId() : "Todos os clientes";
        document.add(new Paragraph("Cliente: " + client).setFontSize(9));
        String city = (filters != null && filters.getCity() != null && !filters.getCity().isBlank())
                ? filters.getCity().trim() : "Todas";
        document.add(new Paragraph("Cidade: " + city).setFontSize(9));
        String state = (filters != null && filters.getState() != null && !filters.getState().isBlank())
                ? filters.getState().trim() : "Todos";
        document.add(new Paragraph("Estado: " + state).setFontSize(9));
        document.add(new Paragraph("Total de postos: " + total).setFontSize(10).setBold().setMarginTop(8).setMarginBottom(10));
    }

    private void addResumo(Document document, List<WorkPost> list) {
        long ativos = list.stream().filter(wp -> wp.getStatus() == WorkPostStatus.ATIVO).count();
        long emImplantacao = list.stream().filter(wp -> wp.getStatus() == WorkPostStatus.EM_IMPLANTACAO).count();
        long inativos = list.stream().filter(wp -> wp.getStatus() == WorkPostStatus.INATIVO).count();
        int totalVigilantes = list.stream()
                .mapToInt(wp -> wp.getRequiredVigilantes() != null ? wp.getRequiredVigilantes() : 0)
                .sum();

        document.add(new Paragraph("Resumo").setBold().setFontSize(11).setMarginBottom(4));
        document.add(new Paragraph(String.format("Total de Postos: %d  |  Ativos: %d  |  Em Implantação: %d  |  Inativos: %d  |  Total Vigilantes: %d",
                list.size(), ativos, emImplantacao, inativos, totalVigilantes))
                .setFontSize(9)
                .setMarginBottom(10));
    }

    private void addWorkPostsTable(Document document, List<WorkPost> workPosts) {
        if (workPosts.isEmpty()) {
            document.add(new Paragraph("Nenhum posto encontrado com os filtros aplicados.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        // Colunas: Código, Nome, Cliente, Tipo, Status, Localização, Vigilantes, Escala, Implantação
        Table table = new Table(UnitValue.createPercentArray(new float[]{8, 18, 18, 12, 12, 14, 6, 8, 10}))
                .useAllAvailableWidth()
                .setMarginTop(10);

        table.addHeaderCell(layoutService.createHeaderCell("Código"));
        table.addHeaderCell(layoutService.createHeaderCell("Nome"));
        table.addHeaderCell(layoutService.createHeaderCell("Cliente"));
        table.addHeaderCell(layoutService.createHeaderCell("Tipo"));
        table.addHeaderCell(layoutService.createHeaderCell("Status"));
        table.addHeaderCell(layoutService.createHeaderCell("Localização"));
        table.addHeaderCell(layoutService.createHeaderCell("Vigilantes"));
        table.addHeaderCell(layoutService.createHeaderCell("Escala"));
        table.addHeaderCell(layoutService.createHeaderCell("Implantação"));

        for (WorkPost wp : workPosts) {
            table.addCell(layoutService.createDataCell(wp.getPostCode() != null ? wp.getPostCode() : "-"));
            table.addCell(layoutService.createDataCell(wp.getName() != null ? wp.getName() : "-"));
            String clientName = (wp.getClient() != null && wp.getClient().getName() != null) ? wp.getClient().getName() : "N/A";
            table.addCell(layoutService.createDataCell(clientName));
            table.addCell(layoutService.createDataCell(wp.getType() != null ? wp.getType().getDisplayName() : "-"));
            table.addCell(layoutService.createDataCell(wp.getStatus() != null ? wp.getStatus().getDisplayName() : "-"));
            String location = (wp.getCity() != null && wp.getState() != null)
                    ? wp.getCity() + ", " + wp.getState()
                    : (wp.getAddress() != null ? (wp.getAddress().length() > 30 ? wp.getAddress().substring(0, 30) + "..." : wp.getAddress()) : "-");
            table.addCell(layoutService.createDataCell(location));
            table.addCell(layoutService.createDataCell(wp.getRequiredVigilantes() != null ? String.valueOf(wp.getRequiredVigilantes()) : "-"));
            table.addCell(layoutService.createDataCell(wp.getWorkSchedule() != null ? wp.getWorkSchedule() : "-"));
            String impl = (wp.getImplementationDate() != null) ? wp.getImplementationDate().format(DATE_FORMATTER) : "Não definida";
            table.addCell(layoutService.createDataCell(impl));
        }

        document.add(table);
    }
}
