package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@Slf4j
public class OsStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;

        public OsStandardPdfService(StandardReportLayoutService pdfLayoutService) {
                this.pdfLayoutService = pdfLayoutService;
        }

        private static final String REPORT_TITLE = "ORDEM DE SERVIÇO";

        public byte[] generatePdf(OperationalServiceOrderRequest request) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(REPORT_TITLE)
                                        .includeEmailInFooter(true)
                                        .marginExtraTop(-35f)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF da OS Operacional", e);
                        throw new RuntimeException("Erro ao gerar PDF da OS Operacional", e);
                }
        }

        private void addContent(Document document, OperationalServiceOrderRequest request, Company company) {
                // Intro Text
                String introText = "Conforme estabelecido no item 1.7, letra \"b\", NR-01 da Portaria 3214/MTE, cabe ao empregador elaborar Ordem de Serviço (OS) sobre Segurança e Medicina do Trabalho, dando ciência aos empregados.";
                document.add(new Paragraph(introText).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(10f));

                // Main Table
                Table table = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();

                // Header
                table.addCell(new Cell().add(new Paragraph("SEGURANÇA E MEDICINA DO TRABALHO").setBold().setTextAlignment(TextAlignment.CENTER))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(3f));

                // Company and Sector
                Table row1 = new Table(UnitValue.createPercentArray(new float[] { 70, 30 })).useAllAvailableWidth();
                row1.addCell(new Cell().add(new Paragraph("EMPRESA: " + (company != null ? company.getName().toUpperCase() : "")).setBold().setFontSize(9f)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
                row1.addCell(new Cell().add(new Paragraph("SETOR: " + safeStr(request.getSector()).toUpperCase()).setBold().setFontSize(9f)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(1f)));
                table.addCell(new Cell().add(row1).setPadding(2f));

                // Responsibility
                String responsibility = request.getResponsibility();
                if (responsibility == null || responsibility.isBlank()) {
                        responsibility = request.getServiceType();
                }
                table.addCell(new Cell().add(new Paragraph("RESPONSABILIDADE: " + safeStr(responsibility).toUpperCase()).setBold().setFontSize(9f)).setPadding(2f));

                // Dates
                Table row2 = new Table(UnitValue.createPercentArray(new float[] { 70, 30 })).useAllAvailableWidth();
                row2.addCell(new Cell().add(new Paragraph("ELABORADO EM: " + formatDate(request.getDocumentDate())).setBold().setFontSize(9f)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
                row2.addCell(new Cell().add(new Paragraph("REVISÃO: " + safeStr(request.getRevision()).toUpperCase()).setBold().setFontSize(9f)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER).setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(1f)));
                table.addCell(new Cell().add(row2).setPadding(2f));

                // Employee Info
                table.addCell(new Cell().add(new Paragraph("NOME DO EMPREGADO: " + safeStr(request.getEmployeeName()).toUpperCase()).setBold().setFontSize(9f)).setPadding(2f));
                table.addCell(new Cell().add(new Paragraph("CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase()).setBold().setFontSize(9f)).setPadding(2f));

                // Obligations Header
                table.addCell(new Cell().add(new Paragraph("OBRIGAÇÕES DO EMPREGADO").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(10f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(3f));

                // Obligations List
                com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List()
                        .setSymbolIndent(12)
                        .setListSymbol("•")
                        .setFontSize(8.5f);
                list.add(new com.itextpdf.layout.element.ListItem("Cumprir todas as normas expedidas pelo Empregador, inclusive esta ordem de serviço;"));
                list.add(new com.itextpdf.layout.element.ListItem("Executar as tarefas que lhe forem delegadas após treinamento específico para execução da mesma;"));
                list.add(new com.itextpdf.layout.element.ListItem("Manter a ordem, disciplina, higiene e segurança no trabalho;"));
                list.add(new com.itextpdf.layout.element.ListItem("Participar de treinamentos relacionados à segurança e saúde ocupacional;"));
                list.add(new com.itextpdf.layout.element.ListItem("Usar obrigatoriamente os Equipamentos de Proteção Individual indicado para a função;"));
                list.add(new com.itextpdf.layout.element.ListItem("Colaborar com a empresa na aplicação das Normas Regulamentadoras – NR's. (PPRA – PCMSO)"));
                list.add(new com.itextpdf.layout.element.ListItem("É responsabilidade do empregado usar, guardar, conservar, e comunicar ao empregador qualquer alteração que torne impróprio uso do Equipamento de Proteção Individual."));
                
                table.addCell(new Cell().add(list).setPadding(5f));

                // Habitual Activities
                table.addCell(new Cell().add(new Paragraph("ATIVIDADES HABITUAIS").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(10f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(3f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getActivities())).setFontSize(9f)).setPadding(5f));

                // Risks
                table.addCell(new Cell().add(new Paragraph("RISCOS").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(10f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(3f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getRisks())).setFontSize(9f)).setPadding(5f));

                // Preventive Measures
                table.addCell(new Cell().add(new Paragraph("MEDIDAS PREVENTIVAS PARA REALIZAÇÃO DAS ATIVIDADES").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(10f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(3f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getPreventiveMeasures())).setFontSize(9f)).setPadding(5f));

                // Uniform
                table.addCell(new Cell().add(new Paragraph("UNIFORME DE USO OBRIGATÓRIO").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(10f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(3f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getUniform())).setFontSize(9f)).setPadding(5f));

                // Trainings
                table.addCell(new Cell().add(new Paragraph("TREINAMENTOS OBRIGATÓRIOS").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(10f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(3f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getMandatoryTrainings())).setFontSize(9f)).setPadding(5f));

                document.add(table);

                // Warning Text
                String warningText1 = "O descumprimento desta Ordem de Serviço caracteriza ato de indisciplina do empregado. Permitindo aplicar as penalidades que a critério da empresa poderá ser advertência verbal por escrito e até rescisão de contrato de trabalho por justa causa, independentemente de outras medidas de ordem jurídicas aplicáveis no art. 158 da CLT, norma regulamentadora nº 01 da portaria 3214/78 (subitens 1.8 e 1.8.1).";
                String warningText2 = "Declara o empregado que recebeu cópia da presente Ordem de Serviço, que fica em seu poder passando o original a fazer parte do seu contrato de trabalho, para todos os fins previstos em lei.";
                
                document.add(new Paragraph(warningText1).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginTop(10f));
                document.add(new Paragraph(warningText2).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginTop(10f));

                // Signatures
                addSignatures(document, request, company);
        }

        private String safeStr(String str) {
                return str != null && !str.trim().isEmpty() ? str : "-";
        }

        private void addSignatures(Document document, OperationalServiceOrderRequest request, Company company) {
                String city = request.getCity() != null ? request.getCity()
                                : (company.getCity() != null ? company.getCity() : "_______________");
                String date = formatDate(
                                request.getDocumentDate() != null ? request.getDocumentDate() : LocalDate.now());

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginTop(25f)
                                .setMarginBottom(40f)
                                .setFontSize(10f).setBold();
                document.add(dateLoc);

                document.add(new Paragraph("_________________________________________________").setMarginBottom(0f));
                document.add(new Paragraph(safeStr(request.getEmployeeName()).toUpperCase()).setFontSize(10f).setBold());
        }

        private String formatDate(LocalDate date) {
                if (date == null)
                        return "__/__/____";
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
}
