package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class OsStandardPdfService {

        private final EmployeeDocumentDateResolver documentDateResolver;
        private final CompanyRepository companyRepository;

        public OsStandardPdfService(EmployeeDocumentDateResolver documentDateResolver,
                        CompanyRepository companyRepository) {
                this.documentDateResolver = documentDateResolver;
                this.companyRepository = companyRepository;
        }

        public byte[] generatePdf(OperationalServiceOrderRequest request) {
                LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getDocumentDate());
                request.setDocumentDate(documentDate);
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);
                        PdfDocument pdfDoc = new PdfDocument(writer);
                        Document document = new Document(pdfDoc, PageSize.A4);
                        document.setMargins(15f, 20f, 15f, 20f);

                        Company company = null;
                        if (request.getCompanyId() != null) {
                                company = companyRepository.findById(request.getCompanyId()).orElse(null);
                        }

                        addContent(document, request, company);

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF da OS Operacional", e);
                        throw new RuntimeException("Erro ao gerar PDF da OS Operacional", e);
                }
        }

        private void addContent(Document document, OperationalServiceOrderRequest request, Company company) {
                // 1. Header Table
                Table headerTable = new Table(UnitValue.createPercentArray(new float[] { 30f, 35f, 35f })).useAllAvailableWidth();
                headerTable.setMarginBottom(8f);

                // Header Table - Cell 1: Logo
                Cell logoCell = new Cell().setPadding(3f);
                logoCell.setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
                logoCell.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
                Image logo = loadLogo(company);
                if (logo != null) {
                        logo.setMaxHeight(45f);
                        logo.setMaxWidth(130f);
                        logo.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
                        logoCell.add(logo);
                } else {
                        logoCell.add(new Paragraph(company != null ? company.getName() : "").setBold().setFontSize(9f).setTextAlignment(TextAlignment.CENTER));
                }
                headerTable.addCell(logoCell);

                // Header Table - Cell 2: Title
                Cell titleCell = new Cell().setPadding(3f);
                titleCell.setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
                titleCell.add(new Paragraph("NR 01").setBold().setFontSize(9.5f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(1f));
                titleCell.add(new Paragraph("Disposições Gerais").setFontSize(8f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(1f));
                titleCell.add(new Paragraph("ORDEM DE SERVIÇO").setBold().setFontSize(10.5f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(0f));
                headerTable.addCell(titleCell);

                // Header Table - Cell 3: Safety Engineer Details
                Cell engineerCell = new Cell().setPadding(3f);
                engineerCell.setVerticalAlignment(com.itextpdf.layout.properties.VerticalAlignment.MIDDLE);
                engineerCell.add(new Paragraph("Saúde e Segurança do trabalho").setBold().setFontSize(8.5f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(8f));
                engineerCell.add(new Paragraph("").setFontSize(6f).setMarginBottom(5f));
                engineerCell.add(new Paragraph("Alexandro Cirino Taveira").setBold().setFontSize(8f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(1f));
                engineerCell.add(new Paragraph("Engenheiro de Segurança do Trabalho").setFontSize(7f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(1f));
                engineerCell.add(new Paragraph("CREA/MG 119986 D").setFontSize(7f).setTextAlignment(TextAlignment.CENTER).setMarginBottom(0f));
                headerTable.addCell(engineerCell);

                headerTable.setBorder(new com.itextpdf.layout.borders.SolidBorder(1f));
                document.add(headerTable);

                // 2. Intro Text
                String introText = "Conforme estabelecido no item 1.7, letra \"b\", NR-01 da Portaria 3214/MTE, cabe ao empregador elaborar Ordem de Serviço (OS) sobre Segurança e Medicina do Trabalho, dando ciência aos empregados.";
                document.add(new Paragraph(introText).setFontSize(7.5f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(6f));

                // 3. Main Grid Table
                Table table = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();
                table.setMarginBottom(6f);

                // Section: SEGURANÇA E MEDICINA DO TRABALHO
                table.addCell(new Cell().add(new Paragraph("SEGURANÇA E MEDICINA DO TRABALHO").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(8.5f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(2f));

                // Company / CNPJ row
                String companyName = company != null ? company.getName().toUpperCase() : "";
                String companyCnpj = company != null && company.getCnpj() != null ? CompanyDataFormatter.formatCnpj(company.getCnpj()) : "";
                String empresaText = "EMPRESA: " + companyName;
                if (!companyCnpj.isEmpty()) {
                        empresaText += " | CNPJ: " + companyCnpj;
                }
                table.addCell(new Cell().add(new Paragraph(empresaText).setBold().setFontSize(7.5f)).setPadding(2f));

                // Employee
                table.addCell(new Cell().add(new Paragraph("NOME DO EMPREGADO: " + safeStr(request.getEmployeeName()).toUpperCase()).setBold().setFontSize(7.5f)).setPadding(2f));

                // Sector
                table.addCell(new Cell().add(new Paragraph("SETOR: " + safeStr(request.getSector()).toUpperCase()).setBold().setFontSize(7.5f)).setPadding(2f));

                // Position/Cargo
                table.addCell(new Cell().add(new Paragraph("CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase()).setBold().setFontSize(7.5f)).setPadding(2f));

                // Section: OBRIGAÇÕES DO EMPREGADO
                table.addCell(new Cell().add(new Paragraph("OBRIGAÇÕES DO EMPREGADO").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(8.5f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(2f));

                Cell obligationsCell = new Cell().setPadding(3f);
                obligationsCell.add(buildEmployeeObligationsList(request));
                table.addCell(obligationsCell);

                // Section: ATIVIDADES HABITUAIS
                table.addCell(new Cell().add(new Paragraph("ATIVIDADES HABITUAIS").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(8.5f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(2f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getActivities())).setFontSize(7.5f)).setPadding(3f));

                // Section: RISCOS
                table.addCell(new Cell().add(new Paragraph("RISCOS").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(8.5f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(2f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getRisks())).setFontSize(7.5f)).setPadding(3f));

                // Section: MEDIDAS PREVENTIVAS PARA REALIZAÇÃO DAS ATIVIDADES
                table.addCell(new Cell().add(new Paragraph("MEDIDAS PREVENTIVAS PARA REALIZAÇÃO DAS ATIVIDADES").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(8.5f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(2f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getPreventiveMeasures())).setFontSize(7.5f)).setPadding(3f));

                // Section: UNIFORME DE USO OBRIGATÓRIO
                String uniformSectionTitle = request.getUniformSectionTitle();
                if (uniformSectionTitle == null || uniformSectionTitle.isBlank()) {
                        uniformSectionTitle = "UNIFORME DE USO OBRIGATÓRIO";
                }
                table.addCell(new Cell().add(new Paragraph(uniformSectionTitle.toUpperCase()).setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(8.5f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(2f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getUniform())).setFontSize(7.5f)).setPadding(3f));

                // Section: TREINAMENTOS OBRIGATÓRIOS
                table.addCell(new Cell().add(new Paragraph("TREINAMENTOS OBRIGATÓRIOS").setBold().setTextAlignment(TextAlignment.CENTER).setFontSize(8.5f))
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                        .setPadding(2f));
                table.addCell(new Cell().add(new Paragraph(safeStr(request.getMandatoryTrainings())).setFontSize(7.5f)).setPadding(3f));

                document.add(table);

                // 4. Warning/Disclaimer Texts
                String warningText1 = "O descumprimento desta Ordem de Serviço caracteriza ato de indisciplina do empregado. Permitindo aplicar as penalidades que a critério da empresa poderá ser advertência verbal por escrito e até rescisão de contrato de trabalho por justa causa, independentemente de outras medidas de ordem jurídicas aplicáveis no art. 158 da CLT, norma regulamentadora nº 01 da portaria 3214/78 (subitens 1.8 e 1.8.1).";
                String warningText2 = "Declara o empregado que recebeu cópia da presente Ordem de Serviço, que fica em seu poder passando o original a fazer parte do seu contrato de trabalho, para todos os fins previstos em lei.";

                document.add(new Paragraph(warningText1).setFontSize(7f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(4f).setMultipliedLeading(1.1f));
                document.add(new Paragraph(warningText2).setFontSize(7f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(8f).setMultipliedLeading(1.1f));

                // 5. Signatures and Date
                addSignatures(document, request, company);
        }

        private com.itextpdf.layout.element.List buildEmployeeObligationsList(OperationalServiceOrderRequest request) {
                com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List()
                        .setSymbolIndent(8)
                        .setListSymbol("•")
                        .setFontSize(7.5f);

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
                                list.add(new com.itextpdf.layout.element.ListItem(line));
                        }
                        return list;
                }

                list.add(new com.itextpdf.layout.element.ListItem("Cumprir todas as normas expedidas pelo Empregador, inclusive esta ordem de serviço;"));
                list.add(new com.itextpdf.layout.element.ListItem("Executar as tarefas que lhe forem delegadas após treinamento específico para execução da mesma;"));
                list.add(new com.itextpdf.layout.element.ListItem("Manter a ordem, disciplina, higiene e segurança no trabalho;"));
                list.add(new com.itextpdf.layout.element.ListItem("Participar de treinamentos relacionados à segurança e saúde ocupacional;"));
                list.add(new com.itextpdf.layout.element.ListItem("Usar obrigatoriamente os Equipamentos de Proteção Individual indicado para a função;"));
                list.add(new com.itextpdf.layout.element.ListItem("Colaborar com a empresa na aplicação das Normas Regulamentadoras – NR's. (PPRA – PCMSO)"));
                list.add(new com.itextpdf.layout.element.ListItem("É responsabilidade do empregado usar, guardar, conservar, e comunicar ao empregador qualquer alteração que torne impróprio uso do Equipamento de Proteção Individual."));
                return list;
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

        private Image loadLogo(Company company) {
                try {
                        if (company != null && company.getLogoUrl() != null && !company.getLogoUrl().isEmpty()) {
                                String logoUrl = company.getLogoUrl();
                                if (logoUrl.startsWith("http")) {
                                        return new Image(ImageDataFactory.create(logoUrl));
                                } else {
                                        java.nio.file.Path path = java.nio.file.Paths.get("uploads", logoUrl);
                                        if (java.nio.file.Files.exists(path)) {
                                                return new Image(ImageDataFactory.create(java.nio.file.Files.readAllBytes(path)));
                                        }
                                }
                        }
                } catch (Exception e) {
                        log.warn("Erro ao carregar logo da empresa, usando fallback: {}", e.getMessage());
                }

                try {
                        org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("static/email-marketing/promover-logo.png");
                        if (resource.exists()) {
                                try (InputStream is = resource.getInputStream()) {
                                        byte[] logoBytes = StreamUtils.copyToByteArray(is);
                                        return new Image(ImageDataFactory.create(logoBytes));
                                }
                        }
                } catch (Exception e) {
                        log.error("Erro ao carregar logo fallback: {}", e.getMessage());
                }
                return null;
        }
}
