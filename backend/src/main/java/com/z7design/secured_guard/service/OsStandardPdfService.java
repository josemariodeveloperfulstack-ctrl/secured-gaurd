package com.z7design.secured_guard.service;

import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.List;
import com.itextpdf.layout.element.ListItem;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class OsStandardPdfService {

        private final EmployeeDocumentDateResolver documentDateResolver;
        private final StandardReportLayoutService pdfLayoutService;

        private static final String REPORT_TITLE = "ORDEM DE SERVIÇO (OS)";

        public OsStandardPdfService(EmployeeDocumentDateResolver documentDateResolver,
                        StandardReportLayoutService pdfLayoutService) {
                this.documentDateResolver = documentDateResolver;
                this.pdfLayoutService = pdfLayoutService;
        }

        public byte[] generatePdf(OperationalServiceOrderRequest request) {
                LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getDocumentDate());
                request.setDocumentDate(documentDate);
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);
                        var configBuilder = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(REPORT_TITLE)
                                        .includeEmailInFooter(true)
                                        .marginExtraTop(-35f)
                                        .bottomMargin(60f)
                                        .leftMargin(28f)
                                        .rightMargin(28f);
                        documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
                        ReportLayoutConfig config = configBuilder.build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        return docWithPdf.closeAndGetPdfBytes(outputStream, pdfLayoutService);
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF da OS Operacional", e);
                        throw new RuntimeException("Erro ao gerar PDF da OS Operacional", e);
                }
        }

        private void addContent(Document document, OperationalServiceOrderRequest request, Company company) {
                String introText = "Conforme estabelecido no item 1.7, letra \"b\", NR-01 da Portaria 3214/MTE, cabe ao empregador elaborar Ordem de Serviço (OS) sobre Segurança e Medicina do Trabalho, dando ciência aos empregados.";
                document.add(new Paragraph(introText)
                                .setFontSize(8.5f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f));

                Table metaTable = new Table(UnitValue.createPercentArray(new float[] { 50, 25, 25 })).useAllAvailableWidth();
                metaTable.addCell(metaCell("Data elaboração: " + formatDate(request.getDocumentDate())));
                metaTable.addCell(metaCell("Última revisão: " + safeStr(request.getRevision())));
                metaTable.addCell(metaCell("NR: 01"));
                document.add(metaTable.setMarginBottom(8f));

                Table identificationTable = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();
                String companyName = company != null ? company.getName().toUpperCase() : "";
                String companyCnpj = company != null && company.getCnpj() != null ? CompanyDataFormatter.formatCnpj(company.getCnpj()) : "";
                String empresaText = "EMPRESA: " + companyName;
                if (!companyCnpj.isEmpty()) {
                        empresaText += " | CNPJ: " + companyCnpj;
                }
                identificationTable.addCell(contentCell(empresaText, true));
                identificationTable.addCell(contentCell("NOME DO EMPREGADO: " + safeStr(request.getEmployeeName()).toUpperCase(), true));
                identificationTable.addCell(contentCell("CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase(), true));
                identificationTable.addCell(contentCell("SETOR: " + safeStr(request.getSector()).toUpperCase(), true));
                if (request.getHireDate() != null) {
                        identificationTable.addCell(contentCell("DATA DE ADMISSÃO: " + formatDate(request.getHireDate()), true));
                }
                document.add(identificationTable.setMarginBottom(10f));

                addSectionHeader(document, "OBRIGAÇÕES DO EMPREGADO");
                document.add(buildEmployeeObligationsList(request).setMarginBottom(8f));

                addSection(document, "ATIVIDADES HABITUAIS", safeStr(request.getActivities()));
                addSection(document, "RISCOS", safeStr(request.getRisks()));
                addSection(document, "MEDIDAS PREVENTIVAS PARA REALIZAÇÃO DAS ATIVIDADES", safeStr(request.getPreventiveMeasures()));

                String uniformSectionTitle = request.getUniformSectionTitle();
                if (uniformSectionTitle == null || uniformSectionTitle.isBlank()) {
                        uniformSectionTitle = "EPI DE USO OBRIGATÓRIO";
                }
                addSection(document, uniformSectionTitle.toUpperCase(), safeStr(request.getUniform()));
                addSection(document, "TREINAMENTOS OBRIGATÓRIOS", safeStr(request.getMandatoryTrainings()));

                String warningText1 = "O descumprimento desta Ordem de Serviço caracteriza ato de indisciplina do empregado. Permitindo aplicar as penalidades que a critério da empresa poderá ser advertência verbal por escrito e até rescisão de contrato de trabalho por justa causa, independentemente de outras medidas de ordem jurídicas aplicáveis no art. 158 da CLT, norma regulamentadora nº 01 da portaria 3214/78 (subitens 1.8 e 1.8.1).";
                String warningText2 = "Declara o empregado que recebeu cópia da presente Ordem de Serviço, que fica em seu poder passando o original a fazer parte do seu contrato de trabalho, para todos os fins previstos em lei.";

                document.add(new Paragraph(warningText1).setFontSize(7.5f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(4f).setMultipliedLeading(1.1f));
                document.add(new Paragraph(warningText2).setFontSize(7.5f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(8f).setMultipliedLeading(1.1f));

                addSignatures(document, request, company);
        }

        private List buildEmployeeObligationsList(OperationalServiceOrderRequest request) {
                List list = new List()
                        .setSymbolIndent(8)
                        .setListSymbol("•")
                        .setFontSize(8f);

                String custom = request.getEmployeeObligations();
                if (custom != null && !custom.isBlank()) {
                        for (String rawLine : custom.split("\\r?\\n")) {
                                String line = rawLine.trim();
                                if (line.isEmpty()) {
                                        continue;
                                }
                                if (line.startsWith("•")) {
                                        line = line.substring(1).trim();
                                }
                                if (line.startsWith("-")) {
                                        line = line.substring(1).trim();
                                }
                                if (!line.endsWith(";") && !line.endsWith(".")) {
                                        line = line + ";";
                                }
                                list.add(new ListItem(line));
                        }
                        return list;
                }

                list.add(new ListItem("Cumprir todas as normas expedidas pelo Empregador, inclusive esta ordem de serviço;"));
                list.add(new ListItem("Executar as tarefas que lhe forem delegadas após treinamento específico para execução da mesma;"));
                list.add(new ListItem("Manter a ordem, disciplina, higiene e segurança no trabalho;"));
                list.add(new ListItem("Participar de treinamentos relacionados à segurança e saúde ocupacional;"));
                list.add(new ListItem("Usar obrigatoriamente os Equipamentos de Proteção Individual indicado para a função;"));
                list.add(new ListItem("Colaborar com a empresa na aplicação das Normas Regulamentadoras – NR's. (PPRA – PCMSO);"));
                list.add(new ListItem("É responsabilidade do empregado usar, guardar, conservar e comunicar ao empregador qualquer alteração que torne impróprio o uso do Equipamento de Proteção Individual."));
                return list;
        }

        private void addSection(Document document, String title, String body) {
                addSectionHeader(document, title);
                document.add(buildParagraphOrList(body));
        }

        private void addSectionHeader(Document document, String title) {
                document.add(new Paragraph(title)
                                .setBold()
                                .setFontSize(9.5f)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                                .setPadding(3f)
                                .setMarginTop(4f)
                                .setMarginBottom(4f));
        }

        private com.itextpdf.layout.element.IBlockElement buildParagraphOrList(String rawText) {
                String value = safeStr(rawText);
                String[] lines = value.split("\\r?\\n");
                boolean looksLikeList = false;
                for (String rawLine : lines) {
                        String line = rawLine.trim();
                        if (line.startsWith("-") || line.startsWith("•")) {
                                looksLikeList = true;
                                break;
                        }
                }

                if (!looksLikeList) {
                        return new Paragraph(value)
                                        .setFontSize(8f)
                                        .setTextAlignment(TextAlignment.JUSTIFIED)
                                        .setMultipliedLeading(1.1f)
                                        .setMarginBottom(8f);
                }

                List list = new List().setSymbolIndent(8).setListSymbol("•").setFontSize(8f).setMarginBottom(8f);
                for (String rawLine : lines) {
                        String line = rawLine.trim();
                        if (line.isEmpty()) {
                                continue;
                        }
                        if (line.startsWith("-") || line.startsWith("•")) {
                                line = line.substring(1).trim();
                        }
                        list.add(new ListItem(line));
                }
                return list;
        }

        private Cell metaCell(String text) {
                return new Cell().add(new Paragraph(text).setFontSize(8f))
                                .setPadding(4f);
        }

        private Cell contentCell(String text, boolean bold) {
                Paragraph paragraph = new Paragraph(text).setFontSize(8f);
                if (bold) {
                        paragraph.setBold();
                }
                return new Cell().add(paragraph).setPadding(4f);
        }

        private String safeStr(String str) {
                return str != null && !str.trim().isEmpty() ? str : "-";
        }

        private void addSignatures(Document document, OperationalServiceOrderRequest request, Company company) {
                String city = request.getCity() != null ? request.getCity()
                                : (company != null && company.getCity() != null ? company.getCity() : "Contagem");
                String date = formatDate(
                                documentDateResolver.resolveDocumentDateOrToday(
                                                request.getEmployeeId(), request.getDocumentDate()));

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginTop(2f)
                                .setMarginBottom(18f)
                                .setFontSize(8.5f).setBold();
                document.add(dateLoc);

                document.add(new Paragraph("_________________________________________________").setMarginBottom(1f).setFontSize(8.5f));
                document.add(new Paragraph(safeStr(request.getEmployeeName()).toUpperCase()).setFontSize(8f).setBold());
        }

        private String formatDate(LocalDate date) {
                if (date == null)
                        return "__/__/____";
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
}
