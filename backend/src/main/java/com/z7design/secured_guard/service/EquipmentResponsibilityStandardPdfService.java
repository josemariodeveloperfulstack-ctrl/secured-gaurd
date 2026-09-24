package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.EquipmentResponsibilityRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class EquipmentResponsibilityStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;
        private final EmployeeDocumentDateResolver documentDateResolver;

        private static final String REPORT_TITLE = "Termo de Responsabilidade - Equipamentos";
        /** Margem superior quando o título fica no corpo (sem título fixo no cabeçalho do layout). */
        private static final float VT_TERM_TOP_MARGIN_PT = 68f;

        public byte[] generatePdf(EquipmentResponsibilityRequest request) {
                LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getDocumentDate());
                request.setDocumentDate(documentDate);
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        String title = request.getReportTitle() != null && !request.getReportTitle().isEmpty()
                                        ? request.getReportTitle()
                                        : REPORT_TITLE;
                        // Termos VT: título único no corpo (sublinhado); evita duplicar no cabeçalho do layout
                        boolean valeTransporteTerm = isValeTransporteCardTerm(request);
                        String layoutTitle = valeTransporteTerm ? null : title;

                        var layoutConfigBuilder = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(layoutTitle)
                                        .includeEmailInFooter(true);
                        if (valeTransporteTerm) {
                                layoutConfigBuilder.topMargin(VT_TERM_TOP_MARGIN_PT);
                        }
                        documentDateResolver.applyAdmissionDateFooter(layoutConfigBuilder, request.getEmployeeId());
                        ReportLayoutConfig config = layoutConfigBuilder.build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Termo de Equipamento", e);
                        throw new RuntimeException("Erro ao gerar PDF do Termo de Equipamento", e);
                }
        }

        public byte[] generateExcel(EquipmentResponsibilityRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Equipamentos");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        // Dados Principais
                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Funcionário:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CPF:");
                        row.createCell(1).setCellValue(request.getEmployeeCpf());

                        // Equipamentos
                        int currentRow = startRow + 3;
                        if (request.getEquipments() != null && !request.getEquipments().isEmpty()) {
                                Row headerRow = sheet.createRow(currentRow++);
                                headerRow.createCell(0).setCellValue("Item");
                                headerRow.createCell(1).setCellValue("Descrição");
                                headerRow.createCell(2).setCellValue("Identificador");
                                headerRow.createCell(3).setCellValue("Estado");
                                headerRow.createCell(4).setCellValue("Valor");

                                for (EquipmentResponsibilityRequest.EquipmentItem item : request.getEquipments()) {
                                        Row r = sheet.createRow(currentRow++);
                                        r.createCell(0).setCellValue(item.getName());
                                        r.createCell(1).setCellValue(item.getDescription());
                                        r.createCell(2).setCellValue(item.getIdentifier());
                                        r.createCell(3).setCellValue(item.getState());
                                        r.createCell(4).setCellValue(item.getValue() != null ? item.getValue() : 0.0);
                                }
                        }

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Termo de Equipamento", e);
                        throw new RuntimeException("Erro ao gerar Excel do Termo de Equipamento", e);
                }
        }

        private void addContent(Document document, EquipmentResponsibilityRequest request, Company company) {
                if (isValeTransporteCardTerm(request)) {
                        addValeTransporteCardContent(document, request, company);
                        return;
                }

                // Seção: Identificação do Funcionário
                document.add(createSectionHeader("IDENTIFICAÇÃO DO FUNCIONÁRIO"));
                Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                employeeTable.addCell(createLabelValueCell("NOME:", request.getEmployeeName()));
                employeeTable.addCell(createLabelValueCell("CPF:", request.getEmployeeCpf()));
                employeeTable.addCell(
                                createLabelValueCell("SETOR/POSTO:", request.getEmployeeSectorOrWorkPost()));
                document.add(employeeTable);

                // Seção: Equipamentos Entregues
                document.add(createSectionHeader("EQUIPAMENTOS ENTREGUES"));
                if (request.getEquipments() != null && !request.getEquipments().isEmpty()) {
                        Table table = new Table(UnitValue.createPercentArray(new float[] { 20, 30, 20, 15, 15 }))
                                        .useAllAvailableWidth()
                                        .setMarginBottom(15f);

                        table.addHeaderCell(new Cell().add(new Paragraph("Item").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Descrição").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Identificador").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Estado").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Valor (Est.)").setBold().setFontSize(9f)));

                        for (EquipmentResponsibilityRequest.EquipmentItem item : request.getEquipments()) {
                                table.addCell(new Cell()
                                                .add(new Paragraph(item.getName() != null ? item.getName() : "-")
                                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(new Paragraph(
                                                item.getDescription() != null ? item.getDescription() : "-")
                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(
                                                new Paragraph(item.getIdentifier() != null ? item.getIdentifier() : "-")
                                                                .setFontSize(9f)));
                                table.addCell(new Cell()
                                                .add(new Paragraph(item.getState() != null ? item.getState() : "-")
                                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(new Paragraph(
                                                item.getValue() != null ? String.format("R$ %.2f", item.getValue())
                                                                : "-")
                                                .setFontSize(9f)));
                        }
                        document.add(table);
                } else {
                        document.add(new Paragraph("(Nenhum equipamento listado)").setItalic()
                                        .setTextAlignment(TextAlignment.CENTER).setFontSize(10f).setMarginBottom(15f));
                }

                // Seção: Termos e Compromissos
                document.add(createSectionHeader("TERMOS E COMPROMISSOS"));
                Paragraph terms = new Paragraph()
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f);

                terms.add(new Text(
                                "Eu, acima identificado, declaro ter recebido os itens descritos, para uso exclusivo no desempenho de minhas funções. Declaro estar ciente de que:\n\n")
                                .setFontSize(10f));

                if (request.getReportTitle() != null
                                && request.getReportTitle().toUpperCase().contains("VALE-TRANSPORTE")) {
                        terms.add("1. O cartão é de uso pessoal e intransferível, destinado exclusivamente para o deslocamento residência-trabalho e vice-versa.\n");
                        terms.add("2. A guarda e conservação do cartão são de minha inteira responsabilidade, devendo informar imediatamente qualquer perda ou extravio para bloqueio.\n");
                        terms.add("3. O uso indevido do benefício ou a comercialização do saldo constitui falta grave, passível de rescisão por justa causa (Art. 482 da CLT).");
                } else {
                        terms.add("1. Os itens são de propriedade da empresa e deverão ser devolvidos imediatamente quando solicitados ou no término do contrato de trabalho.\n");
                        terms.add("2. Sou responsável pela guarda e conservação dos mesmos, devendo comunicar imediatamente qualquer defeito ou perda.\n");
                        terms.add("3. Em caso de dano, extravio ou furto por dolo ou culpa, autorizo o desconto correspondente em minha folha de pagamento (Art. 462 §1º da CLT).");
                }
                document.add(terms);

                // Assinaturas
                addSignatures(document, request, company);
        }

        private void addValeTransporteCardContent(Document document, EquipmentResponsibilityRequest request, Company company) {
                // Título centralizado, conforme modelo RH
                ValeTransporteCardInfo cardInfo = resolveCardInfo(request);
                Paragraph titleBlock = new Paragraph()
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER)
                                .setFontSize(12f)
                                .setMarginTop(0f)
                                .setMarginBottom(12f)
                                .setMultipliedLeading(1.15f);
                titleBlock.add(new Text("TERMO DE RESPONSABILIDADE:\n").setUnderline());
                titleBlock.add(new Text(cardInfo.cardTitle()).setUnderline());
                document.add(titleBlock);

                String employeeName = safe(request.getEmployeeName()).toUpperCase();
                String employeeSectorOrWorkPost = safe(request.getEmployeeSectorOrWorkPost()).toUpperCase();
                String employeeCpf = CompanyDataFormatter.formatCpf(request.getEmployeeCpf());
                String companyName = safe(company != null ? company.getName() : "").toUpperCase();
                String cardIdentifier = firstIdentifier(request);

                String intro = "Termo de responsabilidade e outras avenças que entre si fazem de um lado, "
                                + companyName
                                + ", doravante designada EMPRESA, e de outro, "
                                + employeeName
                                + ", doravante designado EMPREGADO(A), mediante as seguintes condições:";
                document.add(new Paragraph(intro)
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f));

                String clause1Destination = cardInfo.usageDestinationPhrase() != null
                                ? cardInfo.usageDestinationPhrase()
                                : "destinado à utilização no Sistema de Transporte de Passageiros de "
                                                + cardInfo.transportSystem()
                                                + ", da operadora pertencente "
                                                + cardInfo.operator();
                document.add(new Paragraph(
                                "1. O(A) EMPREGADO(A) declara que recebe, neste ato, a primeira via do "
                                                + cardInfo.cardName()
                                                + " Nº "
                                                + cardIdentifier
                                                + ", "
                                                + clause1Destination
                                                + ", ficando o citado cartão, a partir desta data, sob sua guarda e responsabilidade.")
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f));

                document.add(new Paragraph(
                                "2. "
                                                + cardInfo.cardName()
                                                + " é pessoal e intransferível, sendo de responsabilidade exclusiva do EMPREGADO(A) o uso indevido do mesmo, inclusive por terceiros. Ficando o EMPREGADO(A) responsável por perdas e danos decorrentes do seu ato.")
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f));

                document.add(new Paragraph(
                                "3. "
                                                + cardInfo.cardName()
                                                + " deve ser manuseado com cuidado, evitando-se sempre o contato com as mãos ou com outros materiais no respectivo chip eletrônico.")
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f));

                document.add(new Paragraph(
                                "4. "
                                                + cardInfo.cardName()
                                                + " não pode ser dobrado, perfurado, amassado ou molhado. Não deixá-lo exposto ao sol, calor e agentes abrasivos; não riscar; não escrever no mesmo ou sobre o mesmo; não afixar adesivos nos cartões.")
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f));

                document.add(new Paragraph(
                                "5. "
                                                + cardInfo.cardName()
                                                + ", quando não estiver sendo usado pelo EMPREGADO, deverá estar em local seco e ao abrigo da luz solar direta.")
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f));

                document.add(new Paragraph(
                                "6. Em caso de perda ou dano injustificados, arcará o EMPREGADO(A) com o custo da emissão de segunda via do "
                                                + cardInfo.cardName()
                                                + ", no valor de R$ "
                                                + String.format(Locale.forLanguageTag("pt-BR"), "%.2f",
                                                                cardInfo.secondCopyValue().doubleValue()).replace('.', ',')
                                                + " (" + cardInfo.secondCopyValueInWords()
                                                + ") a unidade, autorizando desde já, o desconto do valor no salário do mês respectivo da emissão de segunda via.")
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f));

                document.add(new Paragraph(
                                "7. No caso de rescisão do contrato de trabalho do EMPREGADO(A), "
                                                + cardInfo.cardName()
                                                + " deverá ser devolvido à empresa, sob pena de desconto do valor previsto no item anterior, o qual fica desde já, expressamente autorizado, a ser procedido nas verbas rescisórias.")
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(20f));

                // Bloco de identificação do colaborador conforme solicitado
                document.add(new Paragraph("SETOR/POSTO: " + (employeeSectorOrWorkPost.isBlank() ? "-" : employeeSectorOrWorkPost))
                                .setFontSize(9f)
                                .setMarginBottom(2f));
                document.add(new Paragraph("CPF: " + (employeeCpf != null && !employeeCpf.isBlank() ? employeeCpf : "-"))
                                .setFontSize(9f)
                                .setMarginBottom(18f));

                String city = request.getCity() != null && !request.getCity().isBlank() ? request.getCity()
                                : (company != null && company.getCity() != null ? company.getCity() : "_______________");
                document.add(new Paragraph(city + ", ____/____/______.")
                                .setFontSize(10f)
                                .setMarginBottom(22f));

                document.add(new Paragraph("________________________________________")
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginBottom(0f));
                document.add(new Paragraph(employeeName).setBold().setFontSize(10f));
        }

        private boolean isValeTransporteCardTerm(EquipmentResponsibilityRequest request) {
                if (containsVtCardMarker(normalize(request.getReportTitle()))) {
                        return true;
                }
                if (request.getEquipments() != null) {
                        for (EquipmentResponsibilityRequest.EquipmentItem item : request.getEquipments()) {
                                if (containsVtCardMarker(normalize(item.getDescription()))
                                                || containsVtCardMarker(normalize(item.getName()))) {
                                        return true;
                                }
                        }
                }
                return false;
        }

        private boolean containsVtCardMarker(String normalized) {
                return normalized.contains("BH BUS") || normalized.contains("BHBUS")
                                || normalized.contains("BETIM CARD") || normalized.contains("BETIMCARD")
                                || normalized.contains("OTIMO");
        }

        private String resolveVtCardText(EquipmentResponsibilityRequest request) {
                String fromTitle = normalize(request.getReportTitle());
                if (containsVtCardMarker(fromTitle)) {
                        return fromTitle;
                }
                if (request.getEquipments() != null) {
                        for (EquipmentResponsibilityRequest.EquipmentItem item : request.getEquipments()) {
                                String fromDesc = normalize(item.getDescription());
                                if (containsVtCardMarker(fromDesc)) {
                                        return fromDesc;
                                }
                                String fromName = normalize(item.getName());
                                if (containsVtCardMarker(fromName)) {
                                        return fromName;
                                }
                        }
                }
                return fromTitle;
        }

        private ValeTransporteCardInfo resolveCardInfo(EquipmentResponsibilityRequest request) {
                String normalized = resolveVtCardText(request);
                if (normalized.contains("BETIM CARD") || normalized.contains("BETIMCARD")) {
                        return new ValeTransporteCardInfo(
                                        "CARTÃO BETIMCARD VALE-TRANSPORTE",
                                        "O CARTÃO BETIMCARD VALE-TRANSPORTE",
                                        "Betim",
                                        "BETIMCARD",
                                        null,
                                        BigDecimal.valueOf(15.00),
                                        "Quinze Reais");
                }
				if (normalized.contains("OTIMO")) {
					return new ValeTransporteCardInfo(
									"CARTÃO ÓTIMO VALE-TRANSPORTE",
									"O CARTÃO ÓTIMO VALE-TRANSPORTE",
									null,
									null,
									"destinado à utilização no Sistema de Transporte de Passageiros na Região Metropolitana das operadoras pertencentes ao SINTRAM",
									BigDecimal.valueOf(17.35),
									"Dezessete Reais e Trinta e Cinco Centavos");
				}
				return new ValeTransporteCardInfo(
								"CARTÃO BHBUS VALE-TRANSPORTE",
								"O CARTÃO BHBUS VALE-TRANSPORTE",
								"Belo Horizonte",
								"TRANSFÁCIL",
								null,
								BigDecimal.valueOf(15.00),
								"Quinze Reais");
        }

        private String normalize(String value) {
                String upper = safe(value).toUpperCase(Locale.ROOT);
                return Normalizer.normalize(upper, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        }

        private String firstIdentifier(EquipmentResponsibilityRequest request) {
                if (request.getEquipments() == null || request.getEquipments().isEmpty()) {
                        return "________________";
                }
                String identifier = request.getEquipments().get(0).getIdentifier();
                if (identifier == null || identifier.isBlank()) {
                        return "________________";
                }
                return identifier.trim();
        }

        private String safe(String value) {
                return value != null ? value : "";
        }

        private record ValeTransporteCardInfo(
                        String cardTitle,
                        String cardName,
                        String transportSystem,
                        String operator,
                        String usageDestinationPhrase,
                        BigDecimal secondCopyValue,
                        String secondCopyValueInWords) {
        }

        private Cell createLabelValueCell(String label, String value) {
                Paragraph p = new Paragraph();
                p.add(new Text(label).setBold().setFontSize(9f));
                p.add(new Text(" " + (value != null && !value.isEmpty() ? value : "-")).setFontSize(10f));
                return new Cell().add(p).setPadding(5f);
        }

        private Paragraph createSectionHeader(String title) {
                return new Paragraph(title)
                                .setBold()
                                .setFontSize(11f)
                                .setFontColor(com.itextpdf.kernel.colors.DeviceRgb.RED)
                                .setMarginTop(15f)
                                .setMarginBottom(5f)
                                .setBorderLeft(
                                                new com.itextpdf.layout.borders.SolidBorder(
                                                                com.itextpdf.kernel.colors.DeviceRgb.RED, 3f))
                                .setPaddingLeft(5f);
        }

        private void addSignatures(Document document, EquipmentResponsibilityRequest request, Company company) {
                String city = request.getCity() != null ? request.getCity()
                                : (company.getCity() != null ? company.getCity() : "_______________");
                String date = formatDateExtended(
                                documentDateResolver.resolveDocumentDateOrToday(
                                                request.getEmployeeId(), request.getDocumentDate()));

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginTop(30f)
                                .setMarginBottom(40f)
                                .setFontSize(10f);
                document.add(dateLoc);

                Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 45, 10, 45 }))
                                .useAllAvailableWidth();

                Cell cell1 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(company.getName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Empregador").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell spacer = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell cell2 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(request.getEmployeeName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Empregado").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                sigTable.addCell(cell1);
                sigTable.addCell(spacer);
                sigTable.addCell(cell2);

                document.add(sigTable);
        }

        private String formatDateExtended(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        }
}
