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
                        addTableRow(employeeTable, "CPF:",
                                        CompanyDataFormatter.formatCpf(
                                                        employee.getCpf() != null && !employee.getCpf().trim().isEmpty()
                                                                        ? employee.getCpf()
                                                                        : employee.getDocument()));
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
                        addTableRow(companyTable, "CNPJ:", CompanyDataFormatter.formatCnpj(company.getCnpj()));
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
                                        .reportTitle("CONTROLE DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .topMargin(100f)
                                        .bottomMargin(40f)
                                        .leftMargin(40f)
                                        .rightMargin(40f)
                                        .includeEmailInFooter(true)
                                        .build();

                        docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                        Document document = docWithPdf.getDocument();

                        // Empresa
                        document.add(new Paragraph((company.getName() != null ? company.getName() : "").toUpperCase())
                                        .setBold().setFontSize(10f).setMarginBottom(1f));
                        document.add(new Paragraph("CNPJ: " + (company.getCnpj() != null ? company.getCnpj() : ""))
                                        .setFontSize(9f).setMarginBottom(10f));

                        // Tabela do Funcionário (sem bordas)
                        Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                                        .useAllAvailableWidth().setMarginBottom(15f);

                        String name = employee.getName() != null ? employee.getName().toUpperCase() : "";
                        String position = employee.getPosition() != null
                                        ? employee.getPosition().getName().toUpperCase()
                                        : "";
                        String documentStr = employee.getCpf() != null && !employee.getCpf().trim().isEmpty()
                                        ? employee.getCpf()
                                        : employee.getDocument();
                        if (documentStr == null)
                                documentStr = "";

                        String rgStr = buildRg(employee);

                        String dateHire = formatDate(employee.getHireDate());
                        String dateTerm = formatDate(employee.getTerminationDate());

                        employeeTable.addCell(createNoBorderLabelValue("NOME:", name));
                        employeeTable.addCell(createNoBorderLabelValue("FUNÇÃO:", position));
                        employeeTable.addCell(createNoBorderLabelValue("CPF:", documentStr));
                        employeeTable.addCell(createNoBorderLabelValue("RG:", rgStr));
                        employeeTable.addCell(createNoBorderLabelValue("ADMISSÃO:", dateHire));
                        employeeTable.addCell(createNoBorderLabelValue("DEMISSÃO:", dateTerm));
                        document.add(employeeTable);

                        // Termo de Responsabilidade
                        document.add(new Paragraph("RECIBO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .setBold().setFontSize(10f).setTextAlignment(TextAlignment.CENTER)
                                        .setMarginBottom(5f));

                        String declarationText = "Recebi da " + company.getName()
                                        + ", os EPI's abaixo especificados a serem usados no desempenho de minhas tarefas. Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação, quando necessário solicitar a substituição ou reposição e devolvê-los à Empresa em caso de demissão. Estou ciente também que o uso desses EPI's implicará em insubordinação, sujeito a sanções disciplinares previstas no art. 158 CLT.";
                        document.add(new Paragraph(declarationText)
                                        .setFontSize(8f).setTextAlignment(TextAlignment.JUSTIFIED)
                                        .setMarginBottom(10f));

                        Table contagemTable = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                                        .useAllAvailableWidth().setMarginBottom(5f);
                        contagemTable.addCell(new Cell().add(new Paragraph("Contagem: ___/___/___").setFontSize(9f))
                                        .setBorder(Border.NO_BORDER).setPaddingLeft(0));
                        contagemTable.addCell(new Cell()
                                        .add(new Paragraph("Assinatura: _________________________").setFontSize(9f))
                                        .setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT));
                        document.add(contagemTable);

                        // Tabela EPI de 8 colunas conforme Imagem 1
                        Table epiTable = new Table(UnitValue
                                        .createPercentArray(new float[] { 26f, 6f, 10f, 10f, 12f, 12f, 12f, 12f }))
                                        .useAllAvailableWidth();

                        epiTable.addHeaderCell(createEpiHeaderCell("EQUIPAMENTO"));
                        epiTable.addHeaderCell(createEpiHeaderCell("Nº"));
                        epiTable.addHeaderCell(createEpiHeaderCell("CA"));
                        epiTable.addHeaderCell(createEpiHeaderCell("QUANTIDADE"));
                        epiTable.addHeaderCell(createEpiHeaderCell("ENTREGA"));
                        epiTable.addHeaderCell(createEpiHeaderCell("SUBSTITUÍDO"));
                        epiTable.addHeaderCell(createEpiHeaderCell("MOTIVO DA SUBST."));
                        epiTable.addHeaderCell(createEpiHeaderCell("ASSINATURA"));

                        String deliveryStr = formatDate(form.getDeliveryDate());
                        int itemIdx = 1;
                        if (form.getItems() != null && !form.getItems().isEmpty()) {
                                for (EPIDeliveryFormItem item : form.getItems()) {
                                        epiTable.addCell(createEpiDataCell(
                                                        item.getEpiName() != null ? item.getEpiName().toUpperCase()
                                                                        : ""));
                                        epiTable.addCell(createEpiDataCell(String.valueOf(itemIdx++)));
                                        epiTable.addCell(createEpiDataCell(item.getCa() != null ? item.getCa() : ""));
                                        epiTable.addCell(createEpiDataCell(
                                                        item.getQuantity() != null ? item.getQuantity().toString()
                                                                        : "1"));
                                        epiTable.addCell(createEpiDataCell(deliveryStr));
                                        epiTable.addCell(createEpiDataCell(""));
                                        epiTable.addCell(createEpiDataCell(""));
                                        epiTable.addCell(createEpiDataCell(""));
                                }
                        }

                        // Manter um número fixo de linhas
                        int itemsToAdd = Math.max(0, 15 - (form.getItems() != null ? form.getItems().size() : 0));
                        for (int i = 0; i < itemsToAdd; i++) {
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                        }

                        document.add(epiTable);
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
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "CNPJ:",
                                        CompanyDataFormatter.formatCnpj(company.getCnpj()),
                                        labelStyle, valueStyle);
                        rowIndex++;

                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "Funcionário:", employee.getName(),
                                        labelStyle, valueStyle);
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "CPF:",
                                        CompanyDataFormatter.formatCpf(
                                                        employee.getCpf() != null && !employee.getCpf().trim().isEmpty()
                                                                        ? employee.getCpf()
                                                                        : employee.getDocument()),
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
                        rowIndex = excelReportLayoutService.addRow(sheet, rowIndex, "RG:",
                                        buildRg(employee), labelStyle,
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

        private static final DateTimeFormatter DATE_FORMAT_DDMMYYYY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        public byte[] generateBlankEPIDeliveryPdf(UUID companyId, UUID employeeId) throws Exception {
                log.info("📄 Gerando ficha de entrega de EPI EM BRANCO (Manual) para empresa ID: {}, funcionário: {}", companyId, employeeId);

                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

                Employee employee = null;
                if (employeeId != null) {
                        employee = employeeRepository.findById(employeeId).orElse(null);
                }

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                DocumentWithPdf docWithPdf = null;

                try {
                        PdfWriter writer = new PdfWriter(baos);
                        ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                                        .companyId(company.getId())
                                        .reportTitle("CONTROLE DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .topMargin(100f)
                                        .bottomMargin(40f)
                                        .leftMargin(40f)
                                        .rightMargin(40f)
                                        .includeEmailInFooter(true)
                                        .build();

                        docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                        Document document = docWithPdf.getDocument();

                        // Empresa
                        document.add(new Paragraph((company.getName() != null ? company.getName() : "").toUpperCase())
                                        .setBold().setFontSize(10f).setMarginBottom(1f));
                        document.add(new Paragraph("CNPJ: " + (company.getCnpj() != null ? company.getCnpj() : ""))
                                        .setFontSize(9f).setMarginBottom(10f));

                        // Tabela do Funcionário (preenchida com dados do funcionário se informado)
                        String nome = employee != null && employee.getName() != null ? employee.getName() : "";
                        String funcao = employee != null && employee.getPosition() != null && employee.getPosition().getName() != null ? employee.getPosition().getName() : "";
                        String cpf = employee != null && employee.getCpf() != null ? employee.getCpf() : "";
                        String rgRaw = employee != null ? (employee.getRg() != null ? employee.getRg() : employee.getNumeroRg()) : null;
                        String rg = rgRaw != null ? rgRaw : "";
                        String admissao = employee != null && employee.getHireDate() != null ? employee.getHireDate().format(DATE_FORMAT_DDMMYYYY) : "__/__/____";
                        String demissao = employee != null && employee.getTerminationDate() != null ? employee.getTerminationDate().format(DATE_FORMAT_DDMMYYYY) : "__/__/____";

                        Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                                        .useAllAvailableWidth().setMarginBottom(15f);

                        employeeTable.addCell(createNoBorderLabelValue("NOME:", nome.isEmpty() ? "________________________________________________" : nome));
                        employeeTable.addCell(createNoBorderLabelValue("FUNÇÃO:", funcao.isEmpty() ? "______________________________________________" : funcao));
                        employeeTable.addCell(createNoBorderLabelValue("CPF:", cpf.isEmpty() ? "________________________________________________" : cpf));
                        employeeTable.addCell(createNoBorderLabelValue("RG:", rg.isEmpty() ? "________________________________________________" : rg));
                        employeeTable.addCell(createNoBorderLabelValue("ADMISSÃO:", admissao));
                        employeeTable.addCell(createNoBorderLabelValue("DEMISSÃO:", demissao));
                        document.add(employeeTable);

                        // Termo de Responsabilidade
                        document.add(new Paragraph("RECIBO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .setBold().setFontSize(10f).setTextAlignment(TextAlignment.CENTER)
                                        .setMarginBottom(5f));

                        String declarationText = "Recebi da " + company.getName()
                                        + ", os EPI's abaixo especificados a serem usados no desempenho de minhas tarefas. Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação, quando necessário solicitar a substituição ou reposição e devolvê-los à Empresa em caso de demissão. Estou ciente também que o uso desses EPI's implicará em insubordinação, sujeito a sanções disciplinares previstas no art. 158 CLT.";
                        document.add(new Paragraph(declarationText)
                                        .setFontSize(8f).setTextAlignment(TextAlignment.JUSTIFIED)
                                        .setMarginBottom(10f));

                        Table contagemTable = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                                        .useAllAvailableWidth().setMarginBottom(5f);
                        contagemTable.addCell(new Cell().add(new Paragraph("Contagem: ___/___/___").setFontSize(9f))
                                        .setBorder(Border.NO_BORDER).setPaddingLeft(0));
                        contagemTable.addCell(new Cell()
                                        .add(new Paragraph("Assinatura: _________________________").setFontSize(9f))
                                        .setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT));
                        document.add(contagemTable);

                        // Tabela EPI de 8 colunas (vazia)
                        Table epiTable = new Table(UnitValue
                                        .createPercentArray(new float[] { 26f, 6f, 10f, 10f, 12f, 12f, 12f, 12f }))
                                        .useAllAvailableWidth();

                        epiTable.addHeaderCell(createEpiHeaderCell("EQUIPAMENTO"));
                        epiTable.addHeaderCell(createEpiHeaderCell("Nº"));
                        epiTable.addHeaderCell(createEpiHeaderCell("CA"));
                        epiTable.addHeaderCell(createEpiHeaderCell("QUANTIDADE"));
                        epiTable.addHeaderCell(createEpiHeaderCell("ENTREGA"));
                        epiTable.addHeaderCell(createEpiHeaderCell("SUBSTITUÍDO"));
                        epiTable.addHeaderCell(createEpiHeaderCell("MOTIVO DA SUBST."));
                        epiTable.addHeaderCell(createEpiHeaderCell("ASSINATURA"));

                        // Adicionar 18 linhas vazias
                        for (int i = 0; i < 18; i++) {
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                                epiTable.addCell(createEpiDataCell(""));
                        }

                        document.add(epiTable);
                        document.close();
                } catch (Exception e) {
                        log.error("Erro ao gerar ficha de EPI em branco", e);
                        throw e;
                }

                log.info("✅ Ficha de entrega de EPI em branco gerada com sucesso. Tamanho: {} bytes", baos.size());
                return baos.toByteArray();
        }

        private Cell createNoBorderLabelValue(String label, String value) {
                Paragraph p = new Paragraph();
                p.add(new Text(label + " ").setBold().setFontSize(9f));
                p.add(new Text(value != null && !value.isEmpty() ? value : "").setFontSize(9f));
                return new Cell().add(p).setBorder(Border.NO_BORDER).setPadding(2f);
        }

        private Cell createEpiHeaderCell(String text) {
                return new Cell()
                                .add(new Paragraph(text).setBold().setFontSize(7f)
                                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                                .setPadding(3f);
        }

        private Cell createEpiDataCell(String text) {
                return new Cell()
                                .add(new Paragraph(text != null ? text : "").setFontSize(7f)
                                                .setTextAlignment(TextAlignment.CENTER))
                                .setPadding(3f).setHeight(15f);
        }

        private void addTableRow(Table table, String label, String value) {
                table.addCell(new Cell().add(new Paragraph(label).setBold().setFontSize(9f)));
                table.addCell(new Cell().add(new Paragraph(value != null ? value : "-").setFontSize(9f)));
        }

        private String buildRg(Employee employee) {
                String rg = "";
                // Prioridade 1: Campo rg legado
                if (employee.getRg() != null && !employee.getRg().trim().isEmpty()) {
                        rg = employee.getRg();
                }
                // Prioridade 2: CIN
                else if (employee.getCinNumero() != null && !employee.getCinNumero().trim().isEmpty()) {
                        rg = employee.getCinNumero();
                        if (employee.getCinOrgaoEmissor() != null && !employee.getCinOrgaoEmissor().trim().isEmpty()) {
                                rg = employee.getCinOrgaoEmissor() + "-" + rg;
                        }
                }
                // Prioridade 3: Campo numeroRg
                else if (employee.getNumeroRg() != null && !employee.getNumeroRg().trim().isEmpty()) {
                        rg = employee.getNumeroRg();
                        if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                                        && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
                                rg = employee.getCarteiraIdentidadeOrgaoEmissor() + "-" + rg;
                        }
                }
                // Prioridade 4: Órgão Emissor apenas
                else if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                                && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
                        rg = employee.getCarteiraIdentidadeOrgaoEmissor();
                }
                return rg;
        }

        private String formatDate(LocalDate date) {
                if (date == null)
                        return "";
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
}
