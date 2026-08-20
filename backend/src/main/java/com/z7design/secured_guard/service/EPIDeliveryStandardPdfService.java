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
import com.itextpdf.layout.properties.VerticalAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
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
        private final EPIDeliveryFormRepository epiDeliveryFormRepository;
        private final StockItemRepository stockItemRepository;
        private final StandardReportLayoutService standardReportLayoutService;
        private final ExcelReportLayoutService excelReportLayoutService;
        private final EmployeeDocumentDateResolver documentDateResolver;

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
                        var layoutBuilder = ReportLayoutConfig.builder()
                                        .companyId(company.getId())
                                        .reportTitle("FICHA DE ENTREGA DE EPI")
                                        .topMargin(120f)
                                        .bottomMargin(80f)
                                        .leftMargin(50f)
                                        .rightMargin(50f);
                        documentDateResolver.applyAdmissionDateFooter(layoutBuilder, employeeId);
                        ReportLayoutConfig layoutConfig = layoutBuilder.build();

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

                        LocalDate emissionDate = documentDateResolver.resolveDocumentDateOrToday(
                                        employeeId, employee.getHireDate());
                        Paragraph date = new Paragraph(
                                        "Data de Emissão: " + emissionDate
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

        @Transactional(readOnly = true)
        public byte[] generateEPIDeliveryPdfFromForm(EPIDeliveryForm form) throws Exception {
                log.info("📄 Gerando ficha de entrega de EPI a partir do formulário ID: {}", form.getId());

                // Recarrega o funcionário para garantir hireDate do cadastro (sem cache/proxy stale)
                Employee employee = form.getEmployee();
                if (employee != null && employee.getId() != null) {
                        employee = employeeRepository.findById(employee.getId()).orElse(employee);
                }
                Company company = form.getCompany();

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                DocumentWithPdf docWithPdf = null;

                try {
                        PdfWriter writer = new PdfWriter(baos);
                        var layoutBuilder = ReportLayoutConfig.builder()
                                        .companyId(company.getId())
                                        .reportTitle(null) // Título manual para seguir a imagem
                                        .topMargin(40f)
                                        .bottomMargin(40f)
                                        .leftMargin(40f)
                                        .rightMargin(40f)
                                        .includeEmailInFooter(true);
                        documentDateResolver.applyAdmissionDateFooter(layoutBuilder, employee.getId());
                        ReportLayoutConfig layoutConfig = layoutBuilder.build();

                        docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                        Document document = docWithPdf.getDocument();

                        // 1. Cabeçalho Superior (Logo e Título à direita)
                        Table headerTable = new Table(UnitValue.createPercentArray(new float[] { 30f, 70f }))
                                        .useAllAvailableWidth().setMarginBottom(10f);
                        
                        // Célula vazia para a logo (que é adicionada pelo LayoutService no topo esquerdo)
                        headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
                        
                        // Título centralizado sem bordas e com mais espaçamento
                        headerTable.addCell(new Cell().add(new Paragraph("CONTROLE DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .setBold().setFontSize(12f).setTextAlignment(TextAlignment.CENTER))
                                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                        .setBorder(Border.NO_BORDER)
                                        .setPaddingTop(25f)
                                        .setPaddingBottom(15f));
                        document.add(headerTable);

                        // 2. Box Empresa (Nome e CNPJ)
                        Table companyTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth();
                        companyTable.addCell(new Cell().add(new Paragraph((company.getName() != null ? company.getName() : "").toUpperCase())
                                        .setBold().setFontSize(10f).setTextAlignment(TextAlignment.CENTER))
                                        .add(new Paragraph(CompanyDataFormatter.formatCnpj(company.getCnpj()))
                                        .setFontSize(9f).setTextAlignment(TextAlignment.CENTER))
                                        .setPadding(3f));
                        document.add(companyTable);

                        // 3. Nome do Empregado
                        String name = employee.getName() != null ? employee.getName().toUpperCase() : "";
                        Table nameTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth();
                        nameTable.addCell(new Cell().add(new Paragraph("NOME DO EMPREGADO: " + name)
                                        .setFontSize(9f).setBold())
                                        .setPadding(3f));
                        document.add(nameTable);

                        // 4. Função, CPF, RG e Setor
                        Table infoTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 30f, 30f }))
                                        .useAllAvailableWidth();
                        
                        String position = employee.getPosition() != null ? employee.getPosition().getName().toUpperCase() : "";
                        String cpf = CompanyDataFormatter.formatCpf(employee.getCpf());
                        String rg = buildRg(employee);
                        String sector = form.getEmployeeWorkSector() != null && !form.getEmployeeWorkSector().isBlank() 
                                        ? form.getEmployeeWorkSector().toUpperCase() 
                                        : (employee.getDepartment() != null ? employee.getDepartment().getName().toUpperCase() : 
                                          (employee.getUnit() != null ? employee.getUnit().getName().toUpperCase() : ""));

                        infoTable.addCell(new Cell().add(new Paragraph("FUNÇÃO: " + position).setFontSize(8.5f)).setPadding(3f));
                        infoTable.addCell(new Cell().add(new Paragraph("CPF: " + cpf).setFontSize(8.5f)).setPadding(3f));
                        infoTable.addCell(new Cell().add(new Paragraph("RG: " + rg).setFontSize(8.5f)).setPadding(3f));
                        document.add(infoTable);

                        // 5. Admissão, Demissão e Setor
                        Table secondInfoTable = new Table(UnitValue.createPercentArray(new float[] { 35f, 30f, 35f }))
                                        .useAllAvailableWidth();
                        
                        String hireDate = formatDate(employee.getHireDate());
                        String terminationDate = formatDate(employee.getTerminationDate());
                        String responsibleName = resolveResponsibleName(form);

                        secondInfoTable.addCell(new Cell().add(new Paragraph("ADMISSÃO: " + hireDate).setFontSize(8.5f)).setPadding(3f));
                        secondInfoTable.addCell(new Cell().add(new Paragraph("DEMISSÃO: " + terminationDate).setFontSize(8.5f)).setPadding(3f));
                        secondInfoTable.addCell(new Cell().add(new Paragraph("SETOR: " + sector).setFontSize(8.5f)).setPadding(3f));
                        document.add(secondInfoTable);

                        // 6. Responsável pela Entrega
                        Table respTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth().setMarginBottom(8f).setMarginTop(2f);
                        respTable.addCell(new Cell().add(new Paragraph("RESPONSÁVEL PELA ENTREGA: " + responsibleName).setFontSize(9f).setBold())
                                        .setPadding(5f));
                        document.add(respTable);

                        // 6. Box Título do Recibo
                        Table reciboTitleTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth().setMarginBottom(2f);
                        reciboTitleTable.addCell(new Cell().add(new Paragraph("RECIBO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .setBold().setFontSize(10f).setTextAlignment(TextAlignment.CENTER))
                                        .setBorder(Border.NO_BORDER)
                                        .setPadding(8f));
                        document.add(reciboTitleTable);

                        // 7. Texto da Declaração
                        String declarationText = "Recebi da " + (company.getName() != null ? company.getName() : "")
                                        + "., Os EPI's abaixo especificados a serem usados no desempenho de minhas tarefas. Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação, quando necessário solicitar a substituição ou reposição e devolvê-los à Empresa em caso de demissão. Estou ciente também que o uso desses EPI's implicará em insubordinação, sujeito a sanções disciplinares previstas no art. 158 CLT.";
                        
                        Table decTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth().setMarginBottom(2f);
                        decTable.addCell(new Cell().add(new Paragraph(declarationText)
                                        .setFontSize(8.5f).setTextAlignment(TextAlignment.JUSTIFIED))
                                        .setPadding(5f));
                        document.add(decTable);

                        // 8. Contagem e Assinatura
                        Table signTable = new Table(UnitValue.createPercentArray(new float[] { 35f, 65f }))
                                        .useAllAvailableWidth().setMarginBottom(0f);
                        
                        String dateStr = form.getDeliveryDate() != null
                                        ? form.getDeliveryDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                                        : "____/____/____";
                        
                        signTable.addCell(new Cell().add(new Paragraph("Contagem: " + dateStr).setFontSize(9f)).setPadding(5f));
                        
                        Cell signatureCell = new Cell().setPadding(5f);
                        if (form.getSignatureBase64() != null && !form.getSignatureBase64().isEmpty()) {
                                try {
                                        String base64Data = form.getSignatureBase64();
                                        if (base64Data.contains(",")) {
                                                base64Data = base64Data.split(",")[1];
                                        }
                                        byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
                                        com.itextpdf.layout.element.Image img = new com.itextpdf.layout.element.Image(com.itextpdf.io.image.ImageDataFactory.create(imageBytes));
                                        img.setMaxHeight(35f);
                                        signatureCell.add(new Paragraph("Assinatura Digital:").setFontSize(7f).setItalic().setMarginBottom(1f));
                                        signatureCell.add(img);
                                } catch (Exception e) {
                                        log.error("Erro ao renderizar assinatura digital no PDF", e);
                                        signatureCell.add(new Paragraph("Assinatura: _________________________________________________").setFontSize(9f));
                                }
                        } else {
                                signatureCell.add(new Paragraph("Assinatura: _________________________________________________").setFontSize(9f));
                        }
                        signTable.addCell(signatureCell);
                        document.add(signTable);

                        // Tabela EPI de 8 colunas conforme Imagem
                        Table epiTable = new Table(UnitValue
                                        .createPercentArray(new float[] { 22f, 4f, 8f, 10f, 10f, 12f, 14f, 20f }))
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
                        List<EpiMovementRow> movements = buildMovementRows(form);
                        for (EpiMovementRow movement : movements) {
                                epiTable.addCell(createEpiDataCell(
                                                movement.epiName() != null ? movement.epiName().toUpperCase() : ""));
                                epiTable.addCell(createEpiDataCell(movement.sizeNumber() != null ? movement.sizeNumber() : ""));
                                epiTable.addCell(createEpiDataCell(movement.ca() != null ? movement.ca() : ""));
                                epiTable.addCell(createEpiDataCell(String.valueOf(movement.quantity())));
                                epiTable.addCell(createEpiDataCell(formatDate(movement.deliveryDate())));
                                epiTable.addCell(createEpiDataCell(movement.substitutionInfo()));
                                epiTable.addCell(createEpiDataCell(movement.substitutionReason()));
                                epiTable.addCell(createEpiSignatureCell(movement.signatureBase64()));
                        }

                        // Manter um número fixo de linhas
                        int itemsToAdd = Math.max(0, 15 - movements.size());
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

        @Transactional(readOnly = true)
        public byte[] generateEPIDeliveryExcelFromForm(EPIDeliveryForm form) throws Exception {
                log.info("📊 Gerando ficha de entrega de EPI (Excel) a partir do formulário ID: {}", form.getId());

                Employee employee = form.getEmployee();
                if (employee != null && employee.getId() != null) {
                        employee = employeeRepository.findById(employee.getId()).orElse(employee);
                }
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
                        List<EpiMovementRow> movements = buildMovementRows(form);
                        for (EpiMovementRow movement : movements) {
                                Row row = sheet.createRow(rowIndex++);
                                row.createCell(0).setCellValue(itemNumber++);
                                row.createCell(1).setCellValue(
                                                movement.epiName() != null ? movement.epiName() : "");
                                row.createCell(2).setCellValue(movement.ca() != null ? movement.ca() : "");
                                row.createCell(3).setCellValue(movement.quantity());
                                row.createCell(4).setCellValue(formatDate(movement.deliveryDate()));
                                row.createCell(5).setCellValue(movement.substitutionInfo());
                                row.createCell(6).setCellValue("");
                        }

                        // Completar com linhas em branco para manter a mesma quantidade da ficha em PDF
                        final int TOTAL_TABLE_ROWS = 17;
                        int itemsCount = movements.size();
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

        @Transactional(readOnly = true)
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
                        var layoutBuilder = ReportLayoutConfig.builder()
                                        .companyId(company.getId())
                                        .reportTitle(null)
                                        .topMargin(40f)
                                        .bottomMargin(40f)
                                        .leftMargin(40f)
                                        .rightMargin(40f)
                                        .includeEmailInFooter(true);
                        documentDateResolver.applyAdmissionDateFooter(layoutBuilder, employeeId);
                        ReportLayoutConfig layoutConfig = layoutBuilder.build();

                        docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                        Document document = docWithPdf.getDocument();

                        // 1. Cabeçalho Superior (Logo e Título à direita)
                        Table headerTable = new Table(UnitValue.createPercentArray(new float[] { 30f, 70f }))
                                        .useAllAvailableWidth().setMarginBottom(10f);
                        headerTable.addCell(new Cell().setBorder(Border.NO_BORDER));
                        headerTable.addCell(new Cell().add(new Paragraph("CONTROLE DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .setBold().setFontSize(11f).setTextAlignment(TextAlignment.CENTER))
                                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                        .setBorder(Border.NO_BORDER)
                                        .setPaddingTop(15f)
                                        .setPaddingBottom(10f));
                        document.add(headerTable);

                        // 2. Box Empresa (Nome e CNPJ)
                        Table companyTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth();
                        companyTable.addCell(new Cell().add(new Paragraph((company.getName() != null ? company.getName() : "").toUpperCase())
                                        .setBold().setFontSize(10f).setTextAlignment(TextAlignment.CENTER))
                                        .add(new Paragraph(CompanyDataFormatter.formatCnpj(company.getCnpj()))
                                        .setFontSize(9f).setTextAlignment(TextAlignment.CENTER))
                                        .setPadding(3f));
                        document.add(companyTable);

                        // 3. Nome do Empregado
                        String name = employee != null ? employee.getName().toUpperCase() : "_________________________________________________";
                        Table nameTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth();
                        nameTable.addCell(new Cell().add(new Paragraph("NOME DO EMPREGADO: " + name)
                                        .setFontSize(9f).setBold())
                                        .setPadding(3f));
                        document.add(nameTable);

                        // 4. Função, CPF e RG
                        Table infoTable = new Table(UnitValue.createPercentArray(new float[] { 45f, 25f, 30f }))
                                        .useAllAvailableWidth();
                        
                        String position = (employee != null && employee.getPosition() != null) ? employee.getPosition().getName().toUpperCase() : "";
                        String cpf = employee != null ? CompanyDataFormatter.formatCpf(employee.getCpf()) : "___.___.___-__";
                        String rg = employee != null ? buildRg(employee) : "_________________";

                        infoTable.addCell(new Cell().add(new Paragraph("FUNÇÃO: " + position).setFontSize(9f)).setPadding(3f));
                        infoTable.addCell(new Cell().add(new Paragraph("CPF: " + cpf).setFontSize(9f)).setPadding(3f));
                        infoTable.addCell(new Cell().add(new Paragraph("RG: " + rg).setFontSize(9f)).setPadding(3f));
                        document.add(infoTable);

                        // 5. Admissão e Demissão
                        Table datesTable = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                                        .useAllAvailableWidth().setMarginBottom(5f);
                        datesTable.addCell(new Cell().add(new Paragraph("DATA DE ADMISSÃO: " + (employee != null ? formatDate(employee.getHireDate()) : "___/___/____")).setFontSize(9f)).setPadding(3f));
                        datesTable.addCell(new Cell().add(new Paragraph("DATA DE DEMISSÃO: " + (employee != null ? formatDate(employee.getTerminationDate()) : "___/___/____")).setFontSize(9f)).setPadding(3f));
                        document.add(datesTable);

                        // 6. Box Título do Recibo
                        Table reciboTitleTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth().setMarginBottom(2f);
                        reciboTitleTable.addCell(new Cell().add(new Paragraph("RECIBO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)")
                                        .setBold().setFontSize(10f).setTextAlignment(TextAlignment.CENTER))
                                        .setBorder(Border.NO_BORDER)
                                        .setPadding(8f));
                        document.add(reciboTitleTable);

                        // 7. Texto da Declaração
                        String declarationText = "Recebi da " + (company.getName() != null ? company.getName() : "")
                                        + "., Os EPI's abaixo especificados a serem usados no desempenho de minhas tarefas. Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação, quando necessário solicitar a substituição ou reposição e devolvê-los à Empresa em caso de demissão. Estou ciente também que o uso desses EPI's implicará em insubordinação, sujeito a sanções disciplinares previstas no art. 158 CLT.";
                        
                        Table decTable = new Table(UnitValue.createPercentArray(new float[] { 100f }))
                                        .useAllAvailableWidth().setMarginBottom(2f);
                        decTable.addCell(new Cell().add(new Paragraph(declarationText)
                                        .setFontSize(8.5f).setTextAlignment(TextAlignment.JUSTIFIED))
                                        .setPadding(5f));
                        document.add(decTable);

                        // 8. Contagem e Assinatura (Manual - sem preenchimento automático)
                        Table signTable = new Table(UnitValue.createPercentArray(new float[] { 35f, 65f }))
                                        .useAllAvailableWidth().setMarginBottom(0f);
                        signTable.addCell(new Cell().add(new Paragraph("Contagem: ____/____/____").setFontSize(9f)).setPadding(5f));
                        signTable.addCell(new Cell().add(new Paragraph("Assinatura: _________________________________________________").setFontSize(9f)).setPadding(5f));
                        document.add(signTable);

                        // Tabela EPI
                        Table epiTable = new Table(UnitValue
                                        .createPercentArray(new float[] { 22f, 4f, 8f, 10f, 10f, 12f, 14f, 20f }))
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
                                .setPadding(3f);
        }

        private Cell createEpiDataCell(String text) {
                return new Cell()
                                .add(new Paragraph(text != null ? text : "").setFontSize(7f)
                                                .setTextAlignment(TextAlignment.CENTER))
                                .setPadding(3f).setHeight(15f);
        }

        /**
         * Célula da coluna ASSINATURA do item: renderiza a assinatura digital capturada
         * na confirmação do item ou deixa espaço em branco para assinatura física.
         */
        private Cell createEpiSignatureCell(String signatureBase64) {
                if (signatureBase64 == null || signatureBase64.isBlank()) {
                        return createEpiDataCell("");
                }
                try {
                        String base64Data = signatureBase64;
                        if (base64Data.contains(",")) {
                                base64Data = base64Data.split(",")[1];
                        }
                        byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
                        com.itextpdf.layout.element.Image img = new com.itextpdf.layout.element.Image(
                                        com.itextpdf.io.image.ImageDataFactory.create(imageBytes));
                        img.setMaxHeight(13f);
                        img.setMaxWidth(70f);
                        return new Cell().add(img).setPadding(1f).setHeight(15f);
                } catch (Exception e) {
                        log.warn("Erro ao renderizar assinatura do item no PDF: {}", e.getMessage());
                        return createEpiDataCell("");
                }
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
                // Formata pelos componentes do LocalDate (sem Instant/UTC) para não subtrair 1 dia
                return String.format("%02d/%02d/%04d",
                                date.getDayOfMonth(), date.getMonthValue(), date.getYear());
        }

        private String resolveResponsibleName(EPIDeliveryForm form) {
                if (form.getResponsibleEmployee() != null && form.getResponsibleEmployee().getName() != null) {
                        return form.getResponsibleEmployee().getName().toUpperCase();
                }
                if (form.getCreatedBy() != null && form.getCreatedBy().getName() != null) {
                        return form.getCreatedBy().getName().toUpperCase();
                }
                return "ALMOXARIFADO";
        }

        /**
         * Linha consolidada do histórico de entregas de EPI do funcionário.
         */
        private record EpiMovementRow(
                        String epiName,
                        String sizeNumber,
                        String ca,
                        int quantity,
                        LocalDate deliveryDate,
                        String substitutionInfo,
                        String substitutionReason,
                        String signatureBase64) {
        }

        /**
         * Monta o histórico completo: entregas concluídas anteriores + ficha atual (nova entrega).
         */
        private List<EpiMovementRow> buildMovementRows(EPIDeliveryForm anchorForm) {
                List<EpiMovementRow> rows = new ArrayList<>();
                if (anchorForm == null || anchorForm.getEmployee() == null || anchorForm.getEmployee().getId() == null) {
                        if (anchorForm != null) {
                                appendFormItems(rows, anchorForm);
                        }
                        return rows;
                }

                UUID employeeId = anchorForm.getEmployee().getId();
                UUID anchorId = anchorForm.getId();

                List<EPIDeliveryForm> completedForms = epiDeliveryFormRepository
                                .findByEmployeeIdAndStatusWithItemsOrderByDeliveryDateAsc(
                                                employeeId, EPIDeliveryFormStatus.COMPLETED);

                for (EPIDeliveryForm historicalForm : completedForms) {
                        if (anchorId != null && anchorId.equals(historicalForm.getId())) {
                                continue;
                        }
                        appendFormItems(rows, historicalForm);
                }

                appendFormItems(rows, anchorForm);
                return rows;
        }

        private void appendFormItems(List<EpiMovementRow> rows, EPIDeliveryForm form) {
                if (form.getItems() == null || form.getItems().isEmpty()) {
                        return;
                }

                LocalDate formDeliveryDate = form.getDeliveryDate();
                EPIDeliveryType deliveryType = form.getDeliveryType();

                for (EPIDeliveryFormItem item : form.getItems()) {
                        int qty = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;

                        LocalDate itemDeliveryDate = item.getConfirmedAt() != null
                                        ? item.getConfirmedAt().toLocalDate()
                                        : (formDeliveryDate != null ? formDeliveryDate : LocalDate.now());

                        String substitutionInfo = "";
                        String substitutionReason = "";

                        // Preferência: campos preenchidos por item no formulário
                        if (item.getSubstitutedDate() != null) {
                                substitutionInfo = formatDate(item.getSubstitutedDate());
                        }
                        if (item.getReplacementReason() != null && !item.getReplacementReason().isBlank()) {
                                substitutionReason = item.getReplacementReason().trim();
                        }

                        // Fallback pelo tipo da ficha (comportamento anterior)
                        if (substitutionInfo.isEmpty() || substitutionReason.isEmpty()) {
                                if (deliveryType == EPIDeliveryType.SUBSTITUICAO || deliveryType == EPIDeliveryType.TROCA) {
                                        if (substitutionInfo.isEmpty()) {
                                                substitutionInfo = formatDate(itemDeliveryDate);
                                        }
                                        if (substitutionReason.isEmpty() && deliveryType != null) {
                                                substitutionReason = deliveryType.getDescription();
                                        }
                                } else if (deliveryType == EPIDeliveryType.DEVOLUCAO && substitutionReason.isEmpty()
                                                && deliveryType != null) {
                                        substitutionReason = deliveryType.getDescription();
                                }
                        }

                        String sizeNum = resolveDisplaySizeNumber(item);

                        rows.add(new EpiMovementRow(
                                        item.getEpiName(),
                                        sizeNum,
                                        item.getCa(),
                                        qty,
                                        itemDeliveryDate,
                                        substitutionInfo,
                                        substitutionReason,
                                        item.getSignatureBase64()));
                }
        }

        private String resolveDisplaySizeNumber(EPIDeliveryFormItem item) {
                if (item == null) return "";

                String sizeNum = item.getSizeNumber();
                if (sizeNum != null && !sizeNum.isBlank() && !isRowIndex(sizeNum)) {
                        return sizeNum.trim();
                }

                if (item.getStockItemId() != null) {
                        try {
                                var stockOpt = stockItemRepository.findById(item.getStockItemId());
                                if (stockOpt.isPresent() && stockOpt.get().getSizeVariation() != null
                                                && !stockOpt.get().getSizeVariation().isBlank()) {
                                        return stockOpt.get().getSizeVariation().trim();
                                }
                        } catch (Exception e) {
                                log.debug("Erro ao consultar stockItem no PDF: {}", e.getMessage());
                        }
                }

                if (item.getUniformPiece() != null && !item.getUniformPiece().isBlank()) {
                        return item.getUniformPiece().trim();
                }

                if (item.getEpiName() != null && !item.getEpiName().isBlank()) {
                        String extracted = extractSizeFromEpiName(item.getEpiName());
                        if (extracted != null && !extracted.isBlank()) {
                                return extracted;
                        }
                }

                if (sizeNum != null && !sizeNum.isBlank()) {
                        return sizeNum.trim();
                }

                return "";
        }

        private boolean isRowIndex(String val) {
                if (val == null) return false;
                try {
                        int n = Integer.parseInt(val.trim());
                        return n >= 1 && n <= 30;
                } catch (NumberFormatException e) {
                        return false;
                }
        }

        private String extractSizeFromEpiName(String name) {
                if (name == null) return null;
                String trimmed = name.trim();
                java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                                "(?i)\\b(PP|P|M|G|GG|XG|XGG|EG|EGG|EXG|3[3-9]|4[0-9]|5[0-0])\\b$");
                java.util.regex.Matcher matcher = pattern.matcher(trimmed);
                if (matcher.find()) {
                        return matcher.group(1).toUpperCase();
                }
                return null;
        }
}
