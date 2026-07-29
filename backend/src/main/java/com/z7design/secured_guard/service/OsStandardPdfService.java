package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.List;
import com.itextpdf.layout.element.ListItem;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class OsStandardPdfService {

        private final EmployeeDocumentDateResolver documentDateResolver;
        private final StandardReportLayoutService pdfLayoutService;

        private static final String ASSET_CARIMBO = "static/certificates/os/carimbo-engenheiro-sst.png";
        private static final String ASSET_PROMOVER = "static/certificates/nr06/promover-logo.png";
        private static final DeviceRgb NAVY = new DeviceRgb(15, 59, 115);

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
                                        // Título superior removido: o cabeçalho da OS já traz "ORDEM DE SERVIÇO"
                                        .reportTitle(null)
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
                // Coluna obrigatória do carimbo SST (modelo OS 01)
                addOs01HeaderWithStamp(document);

                String introText = "Conforme estabelecido no item 1.7, letra \"b\", NR-01 da Portaria 3214/MTE, cabe ao empregador elaborar Ordem de Serviço (OS) sobre Segurança e Medicina do Trabalho, dando ciência aos empregados.";
                document.add(new Paragraph(introText)
                                .setFontSize(8.5f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setFontColor(new DeviceRgb(30, 90, 160))
                                .setMarginBottom(8f));

                String companyName = company != null && company.getName() != null
                                ? company.getName().toUpperCase()
                                : "PROMOVER VIGILANCIA PATRIMONIAL LTDA";

                if (isVigilante(request)) {
                        addVigilanteOs01AdminBlock(document, request, companyName);
                } else {
                        Table metaTable = new Table(UnitValue.createPercentArray(new float[] { 50, 25, 25 }))
                                        .useAllAvailableWidth();
                        metaTable.addCell(contentCell("Data elaboração: " + formatDate(request.getDocumentDate()), false));
                        metaTable.addCell(contentCell("Última revisão: " + safeStr(request.getRevision()), false));
                        metaTable.addCell(contentCell("NR: 01", false));
                        document.add(metaTable.setMarginBottom(8f));

                        Table identificationTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                        .useAllAvailableWidth();
                        identificationTable.addCell(contentCell("EMPRESA: " + companyName, true));
                        identificationTable.addCell(contentCell(
                                        "NOME DO EMPREGADO: " + safeStr(request.getEmployeeName()).toUpperCase(), true));
                        identificationTable.addCell(contentCell(
                                        "CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase(), true));
                        identificationTable.addCell(contentCell(
                                        "SETOR: " + safeStr(request.getSector()).toUpperCase(), true));
                        identificationTable.addCell(contentCell(
                                        "DATA DE ADMISSÃO: " + formatDate(resolveHireDate(request)), true));
                        document.add(identificationTable.setMarginBottom(10f));
                }

                addSectionHeader(document, "OBRIGAÇÕES DO EMPREGADO");
                document.add(buildEmployeeObligationsList(request).setMarginBottom(8f));

                addSection(document, "ATIVIDADES HABITUAIS", safeStr(request.getActivities()));
                addSection(document, "RISCOS", safeStr(request.getRisks()));
                addSection(document, "MEDIDAS PREVENTIVAS PARA REALIZAÇÃO DAS ATIVIDADES",
                                safeStr(request.getPreventiveMeasures()));

                String uniformSectionTitle = request.getUniformSectionTitle();
                if (uniformSectionTitle == null || uniformSectionTitle.isBlank()) {
                        uniformSectionTitle = "EPI DE USO OBRIGATÓRIO";
                }
                addSection(document, uniformSectionTitle.toUpperCase(), safeStr(request.getUniform()));
                addSection(document, "TREINAMENTOS OBRIGATÓRIOS", safeStr(request.getMandatoryTrainings()));

                String warningText1 = "O descumprimento desta Ordem de Serviço caracteriza ato de indisciplina do empregado. Permitindo aplicar as penalidades que a critério da empresa poderá ser advertência verbal por escrito e até rescisão de contrato de trabalho por justa causa, independentemente de outras medidas de ordem jurídicas aplicáveis no art. 158 da CLT, norma regulamentadora nº 01 da portaria 3214/78 (subitens 1.8 e 1.8.1).";
                String warningText2 = "Declara o empregado que recebeu cópia da presente Ordem de Serviço, que fica em seu poder passando o original a fazer parte do seu contrato de trabalho, para todos os fins previstos em lei.";

                document.add(new Paragraph(warningText1).setFontSize(7.5f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(4f).setMultipliedLeading(1.1f));
                document.add(new Paragraph(warningText2).setFontSize(7.5f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f).setMultipliedLeading(1.1f));

                addSignatures(document, request, company);
        }

        /**
         * Cabeçalho OS 01 em 3 colunas: logo/NR-01 | ORDEM DE SERVIÇO | carimbo SST (obrigatório).
         */
        private void addOs01HeaderWithStamp(Document document) {
                Table header = new Table(UnitValue.createPercentArray(new float[] { 28, 36, 36 }))
                                .useAllAvailableWidth()
                                .setMarginBottom(10f);

                // Coluna 1: Logo Promover + NR 01
                Cell left = new Cell()
                                .setBorder(new SolidBorder(NAVY, 0.8f))
                                .setPadding(6f)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER);
                ImageData promover = loadImage(ASSET_PROMOVER);
                if (promover != null) {
                        left.add(new Image(promover).setMaxHeight(42).setMaxWidth(110)
                                        .setHorizontalAlignment(HorizontalAlignment.CENTER));
                } else {
                        left.add(new Paragraph("PROMOVER")
                                        .setBold().setFontSize(11f).setFontColor(new DeviceRgb(200, 30, 30))
                                        .setTextAlignment(TextAlignment.CENTER));
                }
                left.add(new Paragraph("NR 01 Disposições Gerais")
                                .setFontSize(8f).setBold().setFontColor(NAVY)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginTop(4f));
                header.addCell(left);

                // Coluna 2: título
                Cell center = new Cell()
                                .setBorder(new SolidBorder(NAVY, 0.8f))
                                .setPadding(6f)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .add(new Paragraph("ORDEM DE SERVIÇO")
                                                .setBold()
                                                .setFontSize(16f)
                                                .setFontColor(NAVY)
                                                .setTextAlignment(TextAlignment.CENTER));
                header.addCell(center);

                // Coluna 3: carimbo obrigatório
                Cell stampCell = new Cell()
                                .setBorder(new SolidBorder(NAVY, 0.8f))
                                .setPadding(4f)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER);
                stampCell.add(new Paragraph("Saúde e Segurança do trabalho")
                                .setBold()
                                .setFontSize(8f)
                                .setFontColor(NAVY)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(2f));

                ImageData carimbo = loadImage(ASSET_CARIMBO);
                if (carimbo != null) {
                        stampCell.add(new Image(carimbo)
                                        .setMaxHeight(72)
                                        .setMaxWidth(170)
                                        .setHorizontalAlignment(HorizontalAlignment.CENTER));
                } else {
                        log.warn("Carimbo SST não encontrado em classpath ({}) — usando texto fallback", ASSET_CARIMBO);
                        stampCell.add(new Paragraph("Alexsandro Cirino Taveira")
                                        .setBold().setFontSize(8f).setTextAlignment(TextAlignment.CENTER));
                        stampCell.add(new Paragraph("Engenheiro de Segurança do Trabalho")
                                        .setFontSize(7f).setTextAlignment(TextAlignment.CENTER));
                        stampCell.add(new Paragraph("CREA/MG 119986 D")
                                        .setFontSize(7f).setTextAlignment(TextAlignment.CENTER));
                }
                header.addCell(stampCell);

                document.add(header);
        }

        private ImageData loadImage(String classpath) {
                try {
                        ClassPathResource resource = new ClassPathResource(classpath);
                        if (!resource.exists()) {
                                return null;
                        }
                        try (InputStream in = resource.getInputStream()) {
                                return ImageDataFactory.create(in.readAllBytes());
                        }
                } catch (Exception e) {
                        log.warn("Falha ao carregar imagem {}: {}", classpath, e.getMessage());
                        return null;
                }
        }

        /** Bloco administrativo fixo do modelo OS 01 Vigilante — só nome/cargo/setor/admissão variam. */
        private void addVigilanteOs01AdminBlock(Document document, OperationalServiceOrderRequest request,
                        String companyName) {
                Table adminTable = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();
                adminTable.addCell(contentCell("Empresa: " + companyName, true));
                adminTable.addCell(contentCell(
                                "Área de atuação: Atividades de vigilância e segurança privada.    CNAE: 80.11-1-01.    Grau de risco: 01 (Um).",
                                false));
                adminTable.addCell(contentCell(
                                "Serviço a ser executado: Prestação de serviços de vigilância patrimonial.",
                                false));
                document.add(adminTable.setMarginBottom(0f));

                Table adminRow = new Table(UnitValue.createPercentArray(new float[] { 34, 33, 33 }))
                                .useAllAvailableWidth();
                adminRow.addCell(contentCell("Número de empregados contratados: 03 (TRES)", false));
                adminRow.addCell(contentCell(
                                "Data de Admissão: " + formatDate(resolveHireDate(request)), true));
                adminRow.addCell(contentCell("Setor: " + safeStr(request.getSector()).toUpperCase(), true));
                document.add(adminRow.setMarginBottom(6f));

                Table identificationTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                identificationTable.addCell(contentCell(
                                "NOME DO EMPREGADO: " + safeStr(request.getEmployeeName()).toUpperCase(), true));
                identificationTable.addCell(contentCell(
                                "CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase(), true));
                document.add(identificationTable.setMarginBottom(10f));
        }

        private boolean isVigilante(OperationalServiceOrderRequest request) {
                String haystack = (safeStr(request.getEmployeePosition()) + " "
                                + safeStr(request.getResponsibility()) + " "
                                + safeStr(request.getServiceType()))
                                .toUpperCase()
                                .replace('Á', 'A').replace('Ã', 'A').replace('Â', 'A')
                                .replace('É', 'E').replace('Ê', 'E')
                                .replace('Í', 'I')
                                .replace('Ó', 'O').replace('Ô', 'O').replace('Õ', 'O')
                                .replace('Ú', 'U').replace('Ç', 'C');
                return haystack.contains("VIGILANTE") || haystack.contains("VIGILANCIA");
        }

        /** Data de admissão do funcionário (fallback: data do documento). */
        private LocalDate resolveHireDate(OperationalServiceOrderRequest request) {
                if (request.getHireDate() != null) {
                        return request.getHireDate();
                }
                return request.getDocumentDate();
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
                // Rodapé do modelo: data de admissão do funcionário
                String date = formatDate(resolveHireDate(request));

                document.add(new Paragraph("De acordo: ____________________________________________________")
                                .setMarginTop(6f)
                                .setMarginBottom(10f)
                                .setFontSize(9f));

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginTop(2f)
                                .setMarginBottom(4f)
                                .setFontSize(9f)
                                .setBold();
                document.add(dateLoc);
        }

        private String formatDate(LocalDate date) {
                if (date == null)
                        return "__/__/____";
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
}
