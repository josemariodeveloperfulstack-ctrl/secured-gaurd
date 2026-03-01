package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@Service
@RequiredArgsConstructor
@Slf4j
public class EPIDeliveryStandardPdfService {

        private final EmployeeRepository employeeRepository;
        private final CompanyRepository companyRepository;
        private final StandardReportLayoutService standardReportLayoutService;
        private final ExcelReportLayoutService excelReportLayoutService;

        public byte[] generateEPIDeliveryPdf(UUID employeeId, UUID companyId, LocalDate deliveryDate,
                        UUID responsibleEmployeeId, String observations) throws Exception {
                log.info("📄 Gerando ficha de entrega de EPI para funcionário ID: {}", employeeId);

                Employee employee = employeeRepository.findById(employeeId)
                                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

                Employee responsible = null;
                if (responsibleEmployeeId != null) {
                        responsible = employeeRepository.findById(responsibleEmployeeId).orElse(null);
                }

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

                try {
                        PdfWriter writer = new PdfWriter(baos);
                        ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                                        .companyId(company.getId())
                                        .reportTitle("FICHA DE ENTREGA DE EPI")
                                        .topMargin(120f)
                                        .bottomMargin(80f)
                                        .leftMargin(50f)
                                        .rightMargin(50f)
                                        .build();

                        docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                        Document document = docWithPdf.getDocument();

                        Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                                        .useAllAvailableWidth()
                                        .setMarginTop(10)
                                        .setMarginBottom(10);

                        addTableRow(employeeTable, "Funcionário:", employee.getName());
                        addTableRow(employeeTable, "CPF:", employee.getDocument());
                        addTableRow(employeeTable, "Cargo:",
                                        employee.getPosition() != null ? employee.getPosition().getName() : "");
                        addTableRow(employeeTable, "Setor:",
                                        employee.getUnit() != null ? employee.getUnit().getName() : "");
                        addTableRow(employeeTable, "Data de Entrega:", formatDate(deliveryDate));
                        if (responsible != null) {
                                addTableRow(employeeTable, "Responsável pela Entrega:", responsible.getName());
                        }

                        document.add(employeeTable);

                        Paragraph companyTitle = new Paragraph("DADOS DA EMPRESA")
                                        .setBold()
                                        .setFontSize(12)
                                        .setMarginTop(15)
                                        .setMarginBottom(10);
                        document.add(companyTitle);

                        Table companyTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                                        .useAllAvailableWidth();
                        addTableRow(companyTable, "Razão Social:", company.getName());
                        addTableRow(companyTable, "CNPJ:", company.getCnpj());
                        addTableRow(companyTable, "Endereço:", company.getAddress());
                        document.add(companyTable);

                        if (observations != null && !observations.trim().isEmpty()) {
                                Paragraph obsTitle = new Paragraph("OBSERVAÇÕES")
                                                .setBold()
                                                .setFontSize(12)
                                                .setMarginTop(15)
                                                .setMarginBottom(10);
                                document.add(obsTitle);

                                Paragraph obs = new Paragraph(observations)
                                                .setFontSize(10)
                                                .setMarginBottom(10);
                                document.add(obs);
                        }

                        Paragraph date = new Paragraph(
                                        "Data de Emissão: " + LocalDate.now()
                                                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                                        .setFontSize(9)
                                        .setTextAlignment(TextAlignment.RIGHT)
                                        .setMarginTop(20);
                        document.add(date);

                        document.close();
                } catch (Exception e) {
                        log.error("Erro ao gerar ficha de entrega de EPI com layout padrão", e);
                        throw e;
                }

                log.info("✅ Ficha de entrega de EPI gerada com sucesso. Tamanho: {} bytes", baos.size());
                return baos.toByteArray();
        }

        public byte[] generateEPIDeliveryPdfFromForm(EPIDeliveryForm form) throws Exception {
                log.info("📄 Gerando ficha de entrega de EPI a partir do formulário ID: {}", form.getId());

                Employee employee = form.getEmployee();
                Company company = form.getCompany();

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                DocumentWithPdf docWithPdf = null;

                try {
                        PdfWriter writer = new PdfWriter(baos);
                        ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                                        .companyId(company.getId())
                                        .reportTitle("FICHA DE ENTREGA DE EPI")
                                        .topMargin(100f)
                                        .bottomMargin(40f)
                                        .leftMargin(40f)
                                        .rightMargin(40f)
                                        .includeEmailInFooter(true)
                                        .build();

                        docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                        Document document = docWithPdf.getDocument();

                        // Seção: Dados da Empresa
                        document.add(createSectionHeader("DADOS DA EMPRESA"));
                        Table companyTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                        .useAllAvailableWidth();
                        companyTable.addCell(createLabelValueCell("RAZÃO SOCIAL:", company.getName()));
                        companyTable.addCell(createLabelValueCell("CNPJ:", company.getCnpj()));
                        companyTable.addCell(createLabelValueCell("ENDEREÇO:", company.getAddress()));
                        document.add(companyTable);

                        // Seção: Identificação do Funcionário
                        document.add(createSectionHeader("IDENTIFICAÇÃO DO FUNCIONÁRIO"));
                        Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                        .useAllAvailableWidth();

                        String funcao = employee.getPosition() != null ? employee.getPosition().getName() : "";
                        String setor = employee.getUnit() != null ? employee.getUnit().getName() : "";

                        employeeTable.addCell(createLabelValueCell("NOME:", employee.getName()));
                        employeeTable.addCell(createLabelValueCell("CPF:", employee.getDocument()));
                        employeeTable.addCell(createLabelValueCell("FUNÇÃO:", funcao));
                        employeeTable.addCell(createLabelValueCell("SETOR:", setor));
                        document.add(employeeTable);

                        // Seção: Termo de Responsabilidade
                        document.add(createSectionHeader("TERMO DE RESPONSABILIDADE"));
                        String declarationText = "Recebi da empresa acima identificada, os EPI's abaixo relacionados, para uso exclusivo no desempenho de minhas funções. Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação e devolvê-los à empresa em caso de rescisão contratual. Estou ciente de que o não uso desses equipamentos constitui ato de insubordinação, sujeito a sanções disciplinares conforme o art. 158 da CLT.";
                        document.add(new Paragraph(declarationText)
                                        .setFontSize(9f)
                                        .setTextAlignment(TextAlignment.JUSTIFIED)
                                        .setMarginBottom(5f));

                        // Seção: Equipamentos de Proteção Individual
                        document.add(createSectionHeader("EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)"));
                        Table epiTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 15f, 15f, 30f }))
                                        .useAllAvailableWidth();

                        epiTable.addHeaderCell(
                                        new Cell().add(new Paragraph("DESCRIÇÃO DO EPI").setBold().setFontSize(9f)));
                        epiTable.addHeaderCell(new Cell().add(new Paragraph("CA").setBold().setFontSize(9f)));
                        epiTable.addHeaderCell(new Cell().add(new Paragraph("QUANT.").setBold().setFontSize(9f)));
                        epiTable.addHeaderCell(new Cell().add(new Paragraph("ASSINATURA").setBold().setFontSize(9f)));

                        if (form.getItems() != null && !form.getItems().isEmpty()) {
                                for (EPIDeliveryFormItem item : form.getItems()) {
                                        epiTable.addCell(new Cell().add(new Paragraph(
                                                        item.getEpiName() != null ? item.getEpiName() : "")
                                                        .setFontSize(9f)));
                                        epiTable.addCell(new Cell()
                                                        .add(new Paragraph(item.getCa() != null ? item.getCa() : "")
                                                                        .setFontSize(9f)));
                                        epiTable.addCell(new Cell().add(new Paragraph(
                                                        item.getQuantity() != null ? item.getQuantity().toString()
                                                                        : "1")
                                                        .setFontSize(9f)));
                                        epiTable.addCell(new Cell().add(new Paragraph(""))); // Espaço para assinatura
                                                                                             // manual
                                }
                        }

                        // Adicionar linhas vazias para manter padrão visual se houver poucos itens
                        int itemsToAdd = Math.max(0, 8 - (form.getItems() != null ? form.getItems().size() : 0));
                        for (int i = 0; i < itemsToAdd; i++) {
                                epiTable.addCell(new Cell().setHeight(12f));
                                epiTable.addCell(new Cell().setHeight(12f));
                                epiTable.addCell(new Cell().setHeight(12f));
                                epiTable.addCell(new Cell().setHeight(12f));
                        }
                        document.add(epiTable);

                        // Assinaturas
                        addSignatures(document, form, employee, company);

                        document.close();
                } catch (Exception e) {
                        log.error("Erro ao gerar ficha de EPI com layout padrão", e);
                        throw e;
                }

                log.info("✅ Ficha de entrega de EPI gerada com sucesso. Tamanho: {} bytes", baos.size());
                return baos.toByteArray();
        }

        public byte[] generateEPIDeliveryExcelFromForm(EPIDeliveryForm form) throws Exception {
                log.info("📊 Gerando ficha de entrega de EPI (Excel) a partir do formulário ID: {}", form.getId());

                Employee employee = form.getEmployee();
                Company company = form.getCompany();

                try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Sheet sheet = workbook.createSheet("Ficha EPI");
                        int lastColumn = 6;
                        int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, company,
                                        "CONTROLE DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)", lastColumn);

                        CellStyle labelStyle = excelReportLayoutService.createLabelStyle(workbook);
                        CellStyle valueStyle = excelReportLayoutService.createValueStyle(workbook);
                        CellStyle headerStyle = excelReportLayoutService.createHeaderStyle(workbook);

                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "Empresa:", company.getName(),
                                        labelStyle, valueStyle);
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "CNPJ:", company.getCnpj(),
                                        labelStyle, valueStyle);
                        rowIndex++;

                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "Funcionário:", employee.getName(),
                                        labelStyle, valueStyle);
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "CPF:", employee.getDocument(),
                                        labelStyle, valueStyle);
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "Função:",
                                        employee.getPosition() != null ? employee.getPosition().getName() : "",
                                        labelStyle, valueStyle);
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "Setor:",
                                        employee.getUnit() != null ? employee.getUnit().getName() : "",
                                        labelStyle, valueStyle);
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "Admissão:",
                                        formatDate(employee.getHireDate()), labelStyle,
                                        valueStyle);
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "Data de Entrega:",
                                        formatDate(form.getDeliveryDate()),
                                        labelStyle,
                                        valueStyle);
                        rowIndex++;

                        Row headerRow = sheet.createRow(rowIndex++);
                        String[] headers = { "ITEM", "DESCRIÇÃO DO EPI", "CA", "QUANTIDADE", "DATA DE ENTREGA",
                                        "DATA DE DEVOLUÇÃO",
                                        "ASSINATURA" };
                        for (int i = 0; i < headers.length; i++) {
                                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                                cell.setCellValue(headers[i]);
                                cell.setCellStyle(headerStyle);
                        }

                        int itemNumber = 1;
                        if (form.getItems() != null && !form.getItems().isEmpty()) {
                                for (EPIDeliveryFormItem item : form.getItems()) {
                                        Row row = sheet.createRow(rowIndex++);
                                        row.createCell(0).setCellValue(itemNumber++);
                                        row.createCell(1).setCellValue(
                                                        item.getEpiName() != null ? item.getEpiName() : "");
                                        row.createCell(2).setCellValue(item.getCa() != null ? item.getCa() : "");
                                        row.createCell(3).setCellValue(
                                                        item.getQuantity() != null ? item.getQuantity() : 1);
                                        row.createCell(4).setCellValue(formatDate(form.getDeliveryDate()));
                                        row.createCell(5).setCellValue("");
                                        row.createCell(6).setCellValue("");
                                }
                        }

                        // Completar com linhas em branco para manter a mesma quantidade da ficha em PDF
                        final int TOTAL_TABLE_ROWS = 17;
                        int itemsCount = form.getItems() != null ? form.getItems().size() : 0;
                        for (int i = itemsCount; i < TOTAL_TABLE_ROWS; i++) {
                                Row emptyRow = sheet.createRow(rowIndex++);
                                for (int c = 0; c <= lastColumn; c++) {
                                        emptyRow.createCell(c).setCellValue("");
                                }
                        }

                        sheet.autoSizeColumn(0); // ITEM
                        sheet.autoSizeColumn(1); // DESCRIÇÃO DO EPI
                        sheet.setColumnWidth(2, 2000); // CA - reduzida
                        sheet.autoSizeColumn(3); // QUANTIDADE
                        sheet.autoSizeColumn(4); // DATA DE ENTREGA
                        sheet.autoSizeColumn(5); // DATA DE DEVOLUÇÃO
                        sheet.setColumnWidth(6, 5000); // ASSINATURA - aumentada

                        excelReportLayoutService.addFooter(sheet, workbook, company, lastColumn);

                        // Configurar layout de impressão (headers/footers nativos, repetição de linhas,
                        // margens)
                        excelReportLayoutService.setupPrintLayout(sheet, company, "FICHA DE ENTREGA DE EPI", 6);

                        workbook.write(out);
                        log.info("✅ Ficha de entrega de EPI (Excel) gerada com sucesso. Tamanho: {} bytes", out.size());
                        return out.toByteArray();
                }
        }

        private Cell createLabelValueCell(String label, String value) {
                Paragraph p = new Paragraph();
                p.add(new Text(label).setBold().setFontSize(8f));
                p.add(new Text(" " + (value != null && !value.isEmpty() ? value : "-")).setFontSize(9f));
                return new Cell().add(p).setPadding(2f);
        }

        private Paragraph createSectionHeader(String title) {
                return new Paragraph(title)
                                .setBold()
                                .setFontSize(10f)
                                .setFontColor(new DeviceRgb(255, 0, 0)) // RED
                                .setMarginTop(8f)
                                .setMarginBottom(2f)
                                .setBorderLeft(new SolidBorder(new DeviceRgb(255, 0, 0), 3f))
                                .setPaddingLeft(5f);
        }

        private void addSignatures(Document document, EPIDeliveryForm form, Employee employee, Company company) {
                String city = company.getCity() != null ? company.getCity() : "_______________";
                String date = LocalDate.now()
                                .format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginTop(15f)
                                .setMarginBottom(25f)
                                .setFontSize(9f);
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
                                .setBorder(Border.NO_BORDER);

                Cell spacer = new Cell().setBorder(Border.NO_BORDER);

                Cell cell2 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(employee.getName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Empregado").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(Border.NO_BORDER);

                sigTable.addCell(cell1);
                sigTable.addCell(spacer);
                sigTable.addCell(cell2);

                document.add(sigTable);
        }

        private void addTableRow(Table table, String label, String value) {
                table.addCell(new Cell().add(new Paragraph(label).setBold().setFontSize(9f)));
                table.addCell(new Cell().add(new Paragraph(value != null ? value : "-").setFontSize(9f)));
        }

        private String formatDate(LocalDate date) {
                if (date == null)
                        return "";
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
}
