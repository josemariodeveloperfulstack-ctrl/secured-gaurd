package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.PropostaSimulacaoRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.Proposal;
import com.z7design.secured_guard.model.ProposalItem;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.ProposalRepository;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço para gerar PDF de Proposta Comercial usando o layout padronizado
 * (StandardReportLayoutService) - logo da empresa, gradiente, cabeçalho/rodapé.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProposalCommercialPdfService {

    private final ProposalRepository proposalRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID proposalId) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposta não encontrada com ID: " + proposalId));

        UUID companyId = resolveCompanyId();
        Company companyForConfig = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("PROPOSTA COMERCIAL DE ACORDO")
                    .reportSubTitle((companyForConfig.getName() != null ? companyForConfig.getName() : "Secured Guard") + " | Relatório Oficial")
                    .build();

            DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContent(document, proposal);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da proposta comercial: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF da proposta comercial", e);
        }
    }

    /**
     * Gera PDF a partir dos dados da simulação (sem salvar no banco).
     * Usa o layout padronizado com todas as seções completas.
     */
    public byte[] generatePdfFromSimulation(PropostaSimulacaoRequest request) {
        UUID companyId = resolveCompanyId();
        Company companyForConfig = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("PROPOSTA COMERCIAL DE ACORDO")
                    .reportSubTitle((companyForConfig.getName() != null ? companyForConfig.getName() : "Secured Guard") + " | Relatório Oficial")
                    .build();

            DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContentFromSimulation(document, request);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da simulação: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF da proposta comercial", e);
        }
    }

    private void addContentFromSimulation(Document document, PropostaSimulacaoRequest r) {
        String clientName = r.getClientName() != null ? r.getClientName() : "N/A";
        String createdAt = java.time.LocalDate.now().format(DATE_FORMATTER);
        String validUntil = java.time.LocalDate.now().plusDays(90).format(DATE_FORMATTER);

        document.add(new Paragraph(
                String.format("Data: %s | Cliente: %s | Válida até: %s", createdAt, clientName, validUntil))
                .setFontSize(9f)
                .setFontColor(new DeviceRgb(100, 100, 100))
                .setMarginBottom(8f));

        if (r.getClientAddress() != null && !r.getClientAddress().isEmpty()) {
            document.add(new Paragraph("Endereço: " + r.getClientAddress())
                    .setFontSize(8f)
                    .setFontColor(new DeviceRgb(120, 120, 120))
                    .setMarginBottom(15f));
        }

        document.add(new Paragraph("Resumo da Proposta")
                .setBold()
                .setFontSize(14f)
                .setFontColor(new DeviceRgb(255, 204, 0))
                .setMarginTop(10f)
                .setMarginBottom(8f));

        BigDecimal valorMensal = r.getResultado() != null && r.getResultado().valorMensal != null ? r.getResultado().valorMensal : BigDecimal.ZERO;
        BigDecimal valorAnual = r.getResultado() != null && r.getResultado().valorAnual != null ? r.getResultado().valorAnual : valorMensal.multiply(BigDecimal.valueOf(12));

        Table resumoTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                .useAllAvailableWidth()
                .setMarginBottom(15f);
        resumoTable.addCell(createValueCell("VALOR MENSAL", formatMoney(valorMensal)));
        resumoTable.addCell(createValueCell("VALOR ANUAL", formatMoney(valorAnual)));
        document.add(resumoTable);

        document.add(new Paragraph().setHeight(1f).setBackgroundColor(new DeviceRgb(255, 204, 0)).setMarginBottom(15f));

        if (r.getDescricaoServico() != null && !r.getDescricaoServico().isEmpty()) {
            document.add(new Paragraph("DESCRIÇÃO DO SERVIÇO")
                    .setBold()
                    .setFontSize(11f)
                    .setMarginTop(10f)
                    .setMarginBottom(5f)
                    .setPaddingLeft(5f)
                    .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));
            document.add(new Paragraph(r.getDescricaoServico())
                    .setFontSize(10f)
                    .setFontColor(new DeviceRgb(80, 80, 80))
                    .setMarginBottom(15f));
        }

        // I. MÃO DE OBRA
        if (r.getMaoDeObra() != null) {
            var m = r.getMaoDeObra();
            document.add(new Paragraph("I. MÃO DE OBRA")
                    .setBold()
                    .setFontSize(11f)
                    .setFontColor(new DeviceRgb(30, 64, 124))
                    .setMarginTop(15f)
                    .setMarginBottom(8f)
                    .setPaddingLeft(5f)
                    .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

            Table t = new Table(UnitValue.createPercentArray(new float[] { 5, 60, 35 }))
                    .useAllAvailableWidth()
                    .setMarginBottom(10f);
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
            t.addHeaderCell(createDataCellRight("Valor"));
            int qtd = m.quantidadePorteiros != null ? m.quantidadePorteiros : 0;
            BigDecimal salBase = m.salarioPorteiro != null ? m.salarioPorteiro.multiply(BigDecimal.valueOf(qtd)) : BigDecimal.ZERO;
            t.addCell(standardReportLayoutService.createDataCell("1"));
            t.addCell(standardReportLayoutService.createDataCell("Salário base (" + qtd + " funcionário(s))"));
            t.addCell(createDataCellRight(formatMoney(salBase)));
            t.addCell(standardReportLayoutService.createDataCell("2"));
            t.addCell(standardReportLayoutService.createDataCell("Adicional Noturno (" + (m.adicionalNoturnoPercent != null ? m.adicionalNoturnoPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(m.adicionalNoturnoValor)));
            t.addCell(standardReportLayoutService.createDataCell("3"));
            t.addCell(standardReportLayoutService.createDataCell("Reflexo Adicional Noturno/HE/DSR"));
            t.addCell(createDataCellRight(formatMoney(m.reflexoAdicional)));
            t.addCell(standardReportLayoutService.createDataCell("4"));
            t.addCell(standardReportLayoutService.createDataCell("Subtotal"));
            t.addCell(createDataCellRight(formatMoney(m.subtotal)));
            t.addCell(standardReportLayoutService.createDataCell("5"));
            t.addCell(standardReportLayoutService.createDataCell("Encargos (" + (m.encargosPercent != null ? m.encargosPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(m.encargosValor)));
            t.addCell(standardReportLayoutService.createDataCell("6"));
            t.addCell(standardReportLayoutService.createDataCell("Total Mão de Obra"));
            t.addCell(createDataCellRight(formatMoney(m.total)));
            document.add(t);
        }

        // II. MATERIAIS
        if (r.getMateriais() != null) {
            var mat = r.getMateriais();
            document.add(new Paragraph("II. MATERIAIS / EQUIPAMENTOS / UNIFORMES, EPI's")
                    .setBold()
                    .setFontSize(11f)
                    .setFontColor(new DeviceRgb(30, 64, 124))
                    .setMarginTop(15f)
                    .setMarginBottom(8f)
                    .setPaddingLeft(5f)
                    .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

            Table t = new Table(UnitValue.createPercentArray(new float[] { 5, 60, 35 }))
                    .useAllAvailableWidth()
                    .setMarginBottom(10f);
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
            t.addHeaderCell(createDataCellRight("Valor"));
            int uQ = mat.uniformeQuantidade != null ? mat.uniformeQuantidade : 0;
            BigDecimal uU = mat.uniformeUnitario != null ? mat.uniformeUnitario : BigDecimal.ZERO;
            t.addCell(standardReportLayoutService.createDataCell("1"));
            t.addCell(standardReportLayoutService.createDataCell("Uniformes (" + uQ + " x R$ " + uU + ")"));
            t.addCell(createDataCellRight(formatMoney(uU.multiply(BigDecimal.valueOf(uQ)))));
            int eqQ = mat.equipamentosQuantidade != null ? mat.equipamentosQuantidade : 0;
            BigDecimal eqU = mat.equipamentosUnitario != null ? mat.equipamentosUnitario : BigDecimal.ZERO;
            t.addCell(standardReportLayoutService.createDataCell("2"));
            t.addCell(standardReportLayoutService.createDataCell("Equipamentos (" + eqQ + " x R$ " + eqU + ")"));
            t.addCell(createDataCellRight(formatMoney(eqU.multiply(BigDecimal.valueOf(eqQ)))));
            t.addCell(standardReportLayoutService.createDataCell("3"));
            t.addCell(standardReportLayoutService.createDataCell("Subtotal Materiais"));
            t.addCell(createDataCellRight(formatMoney(mat.subtotal)));
            document.add(t);
        }

        // III. BDI
        if (r.getBdi() != null) {
            var b = r.getBdi();
            document.add(new Paragraph("III. BDI (BASE DE CÁLCULO DO LUCRO)")
                    .setBold()
                    .setFontSize(11f)
                    .setFontColor(new DeviceRgb(30, 64, 124))
                    .setMarginTop(15f)
                    .setMarginBottom(8f)
                    .setPaddingLeft(5f)
                    .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

            Table t = new Table(UnitValue.createPercentArray(new float[] { 5, 60, 35 }))
                    .useAllAvailableWidth()
                    .setMarginBottom(10f);
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
            t.addHeaderCell(createDataCellRight("Valor"));
            t.addCell(standardReportLayoutService.createDataCell("1"));
            t.addCell(standardReportLayoutService.createDataCell("Taxa de Administração (" + (b.taxaAdministracaoPercent != null ? b.taxaAdministracaoPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(b.taxaAdministracaoValor)));
            t.addCell(standardReportLayoutService.createDataCell("2"));
            t.addCell(standardReportLayoutService.createDataCell("Lucro (" + (b.lucroPercent != null ? b.lucroPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(b.lucroValor)));
            t.addCell(standardReportLayoutService.createDataCell("3"));
            t.addCell(standardReportLayoutService.createDataCell("Subtotal BDI"));
            t.addCell(createDataCellRight(formatMoney(b.subtotal)));
            document.add(t);
        }

        // IV. IMPOSTOS
        if (r.getImpostos() != null) {
            var imp = r.getImpostos();
            document.add(new Paragraph("IV. IMPOSTOS")
                    .setBold()
                    .setFontSize(11f)
                    .setFontColor(new DeviceRgb(30, 64, 124))
                    .setMarginTop(15f)
                    .setMarginBottom(8f)
                    .setPaddingLeft(5f)
                    .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

            Table t = new Table(UnitValue.createPercentArray(new float[] { 5, 60, 35 }))
                    .useAllAvailableWidth()
                    .setMarginBottom(10f);
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
            t.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
            t.addHeaderCell(createDataCellRight("Valor"));
            t.addCell(standardReportLayoutService.createDataCell("1"));
            t.addCell(standardReportLayoutService.createDataCell("COFINS (" + (imp.cofinsPercent != null ? imp.cofinsPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(imp.cofinsValor)));
            t.addCell(standardReportLayoutService.createDataCell("2"));
            t.addCell(standardReportLayoutService.createDataCell("PIS (" + (imp.pisPercent != null ? imp.pisPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(imp.pisValor)));
            t.addCell(standardReportLayoutService.createDataCell("3"));
            t.addCell(standardReportLayoutService.createDataCell("ISSQN (" + (imp.issqnPercent != null ? imp.issqnPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(imp.issqnValor)));
            t.addCell(standardReportLayoutService.createDataCell("4"));
            t.addCell(standardReportLayoutService.createDataCell("IR (" + (imp.irPercent != null ? imp.irPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(imp.irValor)));
            t.addCell(standardReportLayoutService.createDataCell("5"));
            t.addCell(standardReportLayoutService.createDataCell("CSLL (" + (imp.csllPercent != null ? imp.csllPercent : 0) + "%)"));
            t.addCell(createDataCellRight(formatMoney(imp.csllValor)));
            t.addCell(standardReportLayoutService.createDataCell("6"));
            t.addCell(standardReportLayoutService.createDataCell("Total Impostos"));
            t.addCell(createDataCellRight(formatMoney(imp.total)));
            document.add(t);
        }
    }

    private Cell createDataCellRight(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(8))
                .setTextAlignment(TextAlignment.RIGHT);
    }

    private static final Map<String, String> SECTION_TITLES = new LinkedHashMap<>();
    static {
        SECTION_TITLES.put("MAO_DE_OBRA", "I. MÃO DE OBRA");
        SECTION_TITLES.put("MATERIAIS", "II. MATERIAIS / EQUIPAMENTOS / UNIFORMES, EPI's");
        SECTION_TITLES.put("BDI", "III. BDI (BASE DE CÁLCULO DO LUCRO)");
        SECTION_TITLES.put("IMPOSTOS", "IV. IMPOSTOS");
    }

    private void addContent(Document document, Proposal proposal) {
        // Informações da proposta
        String clientName = proposal.getClient() != null && proposal.getClient().getName() != null
                ? proposal.getClient().getName() : "N/A";
        String proposalNumber = proposal.getProposalNumber() != null ? proposal.getProposalNumber() : "-";
        String createdAt = proposal.getCreatedAt() != null ? proposal.getCreatedAt().format(DATE_FORMATTER) : "-";
        String status = proposal.getStatus() != null ? proposal.getStatus().getDisplayName() : "-";
        String validUntil = proposal.getValidUntil() != null ? proposal.getValidUntil().format(DATE_FORMATTER) : "-";

        StringBuilder infoLine = new StringBuilder();
        infoLine.append("Número: ").append(proposalNumber).append(" | Data: ").append(createdAt);
        infoLine.append(" | Cliente: ").append(clientName).append(" | Status: ").append(status);
        if (proposal.getValidUntil() != null) {
            infoLine.append(" | Válida até: ").append(validUntil);
        }

        document.add(new Paragraph(infoLine.toString())
                .setFontSize(9f)
                .setFontColor(new DeviceRgb(100, 100, 100))
                .setMarginBottom(8f));

        // Endereço do cliente (se disponível)
        if (proposal.getClient() != null) {
            String addr = buildClientAddress(proposal.getClient());
            if (addr != null && !addr.isEmpty()) {
                document.add(new Paragraph("Endereço: " + addr)
                        .setFontSize(8f)
                        .setFontColor(new DeviceRgb(120, 120, 120))
                        .setMarginBottom(15f));
            }
        }

        // Resumo da Proposta
        document.add(new Paragraph("Resumo da Proposta")
                .setBold()
                .setFontSize(14f)
                .setFontColor(new DeviceRgb(255, 204, 0))
                .setMarginTop(10f)
                .setMarginBottom(8f));

        BigDecimal totalValue = proposal.getTotalValue() != null ? proposal.getTotalValue() : BigDecimal.ZERO;
        BigDecimal annualValue = totalValue.multiply(BigDecimal.valueOf(12));

        Table resumoTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                .useAllAvailableWidth()
                .setMarginBottom(15f);

        resumoTable.addCell(createValueCell("VALOR MENSAL", formatMoney(totalValue)));
        resumoTable.addCell(createValueCell("VALOR ANUAL", formatMoney(annualValue)));
        document.add(resumoTable);

        // Linha separadora
        document.add(new Paragraph().setHeight(1f).setBackgroundColor(new DeviceRgb(255, 204, 0)).setMarginBottom(15f));

        // Descrição do Serviço
        if (proposal.getDescription() != null && !proposal.getDescription().isEmpty()) {
            document.add(new Paragraph("DESCRIÇÃO DO SERVIÇO")
                    .setBold()
                    .setFontSize(11f)
                    .setMarginTop(10f)
                    .setMarginBottom(5f)
                    .setPaddingLeft(5f)
                    .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

            document.add(new Paragraph(proposal.getDescription())
                    .setFontSize(10f)
                    .setFontColor(new DeviceRgb(80, 80, 80))
                    .setMarginBottom(15f));
        }

        // Itens da Proposta - agrupados por seção (notes)
        List<ProposalItem> items = proposal.getItems();
        if (items != null && !items.isEmpty()) {
            Map<String, List<ProposalItem>> bySection = items.stream()
                    .filter(it -> it.getNotes() != null && !it.getNotes().isEmpty())
                    .collect(Collectors.groupingBy(ProposalItem::getNotes, LinkedHashMap::new, Collectors.toList()));

            // Ordem das seções
            List<String> sectionOrder = new ArrayList<>(SECTION_TITLES.keySet());
            for (String sectionKey : sectionOrder) {
                List<ProposalItem> sectionItems = bySection.get(sectionKey);
                if (sectionItems == null || sectionItems.isEmpty()) continue;

                String sectionTitle = SECTION_TITLES.getOrDefault(sectionKey, sectionKey);
                document.add(new Paragraph(sectionTitle)
                        .setBold()
                        .setFontSize(11f)
                        .setFontColor(new DeviceRgb(30, 64, 124))
                        .setMarginTop(15f)
                        .setMarginBottom(8f)
                        .setPaddingLeft(5f)
                        .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 204, 0), 4f)));

                // Tabela: coluna Valor mais larga (35%) e alinhada à direita para evitar truncamento
                Table itemsTable = new Table(UnitValue.createPercentArray(new float[] { 5, 60, 35 }))
                        .useAllAvailableWidth()
                        .setMarginBottom(10f);

                itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
                itemsTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
                itemsTable.addHeaderCell(createDataCellRight("Valor"));

                int idx = 1;
                for (ProposalItem item : sectionItems) {
                    itemsTable.addCell(standardReportLayoutService.createDataCell(String.valueOf(idx++)));
                    itemsTable.addCell(standardReportLayoutService.createDataCell(
                            item.getDescription() != null ? item.getDescription() : "-"));
                    itemsTable.addCell(createDataCellRight(formatMoney(item.getTotalPrice())));
                }

                document.add(itemsTable);
            }

            // Itens sem notes (fallback)
            List<ProposalItem> noNotes = items.stream()
                    .filter(it -> it.getNotes() == null || it.getNotes().isEmpty())
                    .toList();
            if (!noNotes.isEmpty()) {
                document.add(new Paragraph("DETALHAMENTO")
                        .setBold()
                        .setFontSize(11f)
                        .setFontColor(new DeviceRgb(30, 64, 124))
                        .setMarginTop(15f)
                        .setMarginBottom(8f));

                Table fallbackTable = new Table(UnitValue.createPercentArray(new float[] { 5, 60, 35 }))
                        .useAllAvailableWidth();
                fallbackTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Item"));
                fallbackTable.addHeaderCell(standardReportLayoutService.createHeaderCell("Descrição"));
                fallbackTable.addHeaderCell(createDataCellRight("Valor"));
                int idx = 1;
                for (ProposalItem item : noNotes) {
                    fallbackTable.addCell(standardReportLayoutService.createDataCell(String.valueOf(idx++)));
                    fallbackTable.addCell(standardReportLayoutService.createDataCell(
                            item.getDescription() != null ? item.getDescription() : "-"));
                    fallbackTable.addCell(createDataCellRight(formatMoney(item.getTotalPrice())));
                }
                document.add(fallbackTable);
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
