package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.model.StockRequisition;
import com.z7design.secured_guard.model.StockRequisitionLine;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StockMovementRepository;
import com.z7design.secured_guard.repository.StockRequisitionRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Serviço responsável pela geração de PDF oficial de Requisição de Estoque
 * estritamente aderente ao layout executivo padrão da Ficha de EPI (CONTROLE DE EPI)
 * no formato Retrato A4 para impressão e arquivamento em prontuário.
 */
@Service
@Slf4j
public class StockRequisitionPdfService {

    // Paleta de cores corporativa oficial
    private static final DeviceRgb DARK_NAVY = new DeviceRgb(15, 23, 42);       // #0f172a Fundo do cabeçalho executivo
    private static final DeviceRgb RED_PRIMARY = new DeviceRgb(220, 38, 38);     // #dc2626 Vermelho vibrante oficial
    private static final DeviceRgb ORANGE_ACCENT = new DeviceRgb(249, 115, 22);  // #f97316 Laranja degradê
    private static final DeviceRgb YELLOW_ACCENT = new DeviceRgb(234, 179, 8);   // #eab308 Amarelo ouro degradê
    private static final DeviceRgb BRONZE_HEADER = new DeviceRgb(154, 115, 61); // #9a733d Cabeçalho da tabela de materiais (Imagem 4)
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(100, 116, 139);    // #64748b Texto secundário / notas

    private final StockMovementRepository stockMovementRepository;
    private final StockRequisitionRepository stockRequisitionRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EPIDeliveryFormRepository epiDeliveryFormRepository;
    private final EPIDeliveryStandardPdfService epiDeliveryStandardPdfService;
    private final StockItemRepository stockItemRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final EmployeeDocumentDateResolver documentDateResolver;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    public StockRequisitionPdfService(
            StockMovementRepository stockMovementRepository,
            StockRequisitionRepository stockRequisitionRepository,
            CompanyRepository companyRepository,
            EmployeeRepository employeeRepository,
            EPIDeliveryFormRepository epiDeliveryFormRepository,
            EPIDeliveryStandardPdfService epiDeliveryStandardPdfService,
            StockItemRepository stockItemRepository,
            StandardReportLayoutService standardReportLayoutService,
            EmployeeDocumentDateResolver documentDateResolver) {
        this.stockMovementRepository = stockMovementRepository;
        this.stockRequisitionRepository = stockRequisitionRepository;
        this.companyRepository = companyRepository;
        this.employeeRepository = employeeRepository;
        this.epiDeliveryFormRepository = epiDeliveryFormRepository;
        this.epiDeliveryStandardPdfService = epiDeliveryStandardPdfService;
        this.stockItemRepository = stockItemRepository;
        this.standardReportLayoutService = standardReportLayoutService;
        this.documentDateResolver = documentDateResolver;
    }

    /**
     * Gera o documento oficial de Requisição de Estoque multi-item em PDF
     * no formato Retrato A4 seguindo exatamente o mesmo layout da Ficha de EPI.
     */
    @Transactional(readOnly = true)
    public byte[] generateMultiLineRequisitionPdf(StockRequisition r) {
        log.info("📄 Gerando PDF oficial de Requisição de Material Almoxarifado: {}", r.getRequisitionNumber());
        return generateNativeWarehouseRequisitionPdf(r);
    }

    /**
     * Gera PDF de requisição para uma movimentação individual (compatibilidade retroativa)
     * no formato Retrato A4 seguindo o layout oficial da Requisição de Material Almoxarifado.
     */
    @Transactional(readOnly = true)
    public byte[] generateRequisitionPdf(UUID movementId) {
        log.info("📄 Gerando PDF executivo para movimentação de estoque: {}", movementId);

        StockMovement movement = stockMovementRepository.findById(movementId)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação não encontrada: " + movementId));

        if (movement.getRequisitionNumber() != null && !movement.getRequisitionNumber().isBlank()) {
            Optional<StockRequisition> reqOpt = stockRequisitionRepository.findByRequisitionNumber(movement.getRequisitionNumber());
            if (reqOpt.isPresent()) {
                return generateMultiLineRequisitionPdf(reqOpt.get());
            }
        }

        return generateNativeWarehouseMovementPdf(movement);
    }

    /* ========================================================================= */
    /* RENDERIZAÇÃO NATIVA: REQUISIÇÃO DE MATERIAL ALMOXARIFADO                  */
    /* ========================================================================= */

    private byte[] generateNativeWarehouseRequisitionPdf(StockRequisition r) {
        Employee emp = r.getEmployee();
        if (emp != null && emp.getId() != null) {
            emp = employeeRepository.findById(emp.getId()).orElse(emp);
        }

        Company company = resolveCompany(emp);
        UUID companyId = company != null ? company.getId() : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document;

        try {
            PdfWriter writer = new PdfWriter(baos);
            if (company != null && company.getId() != null) {
                try {
                    var layoutBuilder = ReportLayoutConfig.builder()
                            .companyId(companyId)
                            .reportTitle(null)
                            .showHeader(false)
                            .showFooterContentSeparator(true)
                            .showFooterBackgroundLine(false)
                            .includeEmailInFooter(true)
                            .showPageNumbers(true)
                            .landscape(false)
                            .topMargin(20f)
                            .marginExtraTop(0f)
                            .bottomMargin(45f)
                            .leftMargin(30f)
                            .rightMargin(30f);

                    if (emp != null && emp.getId() != null) {
                        documentDateResolver.applyAdmissionDateFooter(layoutBuilder, emp.getId());
                    }
                    ReportLayoutConfig layoutConfig = layoutBuilder.build();

                    DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                    document = docWithPdf.getDocument();
                } catch (Exception layoutEx) {
                    log.warn("Falha ao inicializar layout padrão ({}), criando documento PDF direto", layoutEx.getMessage());
                    com.itextpdf.kernel.pdf.PdfDocument pdfDoc = new com.itextpdf.kernel.pdf.PdfDocument(writer);
                    pdfDoc.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4);
                    document = new Document(pdfDoc, com.itextpdf.kernel.geom.PageSize.A4);
                    document.setMargins(20f, 30f, 45f, 30f);
                }
            } else {
                com.itextpdf.kernel.pdf.PdfDocument pdfDoc = new com.itextpdf.kernel.pdf.PdfDocument(writer);
                pdfDoc.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4);
                document = new Document(pdfDoc, com.itextpdf.kernel.geom.PageSize.A4);
                document.setMargins(20f, 30f, 45f, 30f);
            }

            // 1. Cabeçalho Executivo Oficial (REQUISIÇÃO DE MATERIAL ALMOXARIFADO)
            LocalDate issueDate = r.getDeliveredAt() != null ? r.getDeliveredAt().toLocalDate()
                    : (r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate() : LocalDate.now());
            String issueDateStr = issueDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String badgeStatus = (r.getStatus() == StockRequisitionStatus.DELIVERED) ? "ENTREGUE" : "APROVADA";
            addExecutiveHeader(document, company, "REQUISIÇÃO DE MATERIAL ALMOXARIFADO", badgeStatus, r.getRequisitionNumber());

            // 2. Seção de Identificação do Colaborador e Solicitante
            addSectionHeader(document, "IDENTIFICAÇÃO DO COLABORADOR E SOLICITANTE");

            String name = emp != null && emp.getName() != null ? emp.getName().toUpperCase() : "";
            Table nameTable = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth();
            nameTable.addCell(new Cell().add(new Paragraph("COLABORADOR BENEFICIÁRIO: " + name)
                    .setFontSize(8f).setBold()).setPadding(2f));
            document.add(nameTable);

            Table infoTable = new Table(UnitValue.createPercentArray(new float[]{40f, 30f, 30f})).useAllAvailableWidth();
            String position = emp != null && emp.getPosition() != null ? emp.getPosition().getName().toUpperCase() : "";
            String cpf = emp != null ? CompanyDataFormatter.formatCpf(emp.getCpf() != null ? emp.getCpf() : emp.getDocument()) : "";
            String rg = buildRg(emp);

            infoTable.addCell(new Cell().add(new Paragraph("FUNÇÃO: " + position).setFontSize(7.5f)).setPadding(2f));
            infoTable.addCell(new Cell().add(new Paragraph("CPF: " + cpf).setFontSize(7.5f)).setPadding(2f));
            infoTable.addCell(new Cell().add(new Paragraph("RG: " + rg).setFontSize(7.5f)).setPadding(2f));
            document.add(infoTable);

            Table secondInfoTable = new Table(UnitValue.createPercentArray(new float[]{35f, 30f, 35f})).useAllAvailableWidth();
            String hireDate = emp != null ? formatDate(emp.getHireDate()) : "";
            String sector = r.getEmployeeWorkSector() != null && !r.getEmployeeWorkSector().isBlank()
                    ? r.getEmployeeWorkSector().toUpperCase()
                    : (emp != null && emp.getDepartment() != null ? emp.getDepartment().getName().toUpperCase() :
                    (emp != null && emp.getUnit() != null ? emp.getUnit().getName().toUpperCase() : ""));
            String requesterName = r.getRequestedByUser() != null && r.getRequestedByUser().getName() != null
                    ? r.getRequestedByUser().getName().toUpperCase() : "—";

            secondInfoTable.addCell(new Cell().add(new Paragraph("ADMISSÃO: " + hireDate).setFontSize(7.5f)).setPadding(2f));
            secondInfoTable.addCell(new Cell().add(new Paragraph("SETOR: " + sector).setFontSize(7.5f)).setPadding(2f));
            secondInfoTable.addCell(new Cell().add(new Paragraph("SOLICITADO POR: " + requesterName).setFontSize(7.5f)).setPadding(2f));
            document.add(secondInfoTable);

            Table thirdInfoTable = new Table(UnitValue.createPercentArray(new float[]{50f, 50f})).useAllAvailableWidth().setMarginBottom(2.5f);
            String responsibleName = resolveResponsibleName(r);
            String reasonDesc = r.getMovementReason() != null ? r.getMovementReason().getDescription() : "Saída Almoxarifado";
            thirdInfoTable.addCell(new Cell().add(new Paragraph("RESPONSÁVEL PELA ENTREGA: " + responsibleName).setFontSize(8f).setBold()).setPadding(2f));
            thirdInfoTable.addCell(new Cell().add(new Paragraph("MOTIVO DA SAÍDA: " + reasonDesc).setFontSize(7.5f)).setPadding(2f));
            document.add(thirdInfoTable);

            if (r.getNotes() != null && !r.getNotes().isBlank()) {
                Table notesTable = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth().setMarginBottom(2.5f);
                notesTable.addCell(new Cell().add(new Paragraph("OBSERVAÇÕES: " + r.getNotes()).setFontSize(7f).setItalic()).setPadding(2f));
                document.add(notesTable);
            }

            // 3. Detalhamento dos Materiais Fornecidos (Tabela no modelo da Imagem 4)
            addSectionHeader(document, "DETALHAMENTO DOS MATERIAIS FORNECIDOS");

            Table table = new Table(UnitValue.createPercentArray(new float[]{18f, 54f, 10f, 18f}))
                    .useAllAvailableWidth();

            table.addHeaderCell(createWarehouseHeaderCell("Código", TextAlignment.CENTER));
            table.addHeaderCell(createWarehouseHeaderCell("Item / Material", TextAlignment.LEFT));
            table.addHeaderCell(createWarehouseHeaderCell("UN", TextAlignment.CENTER));
            table.addHeaderCell(createWarehouseHeaderCell("Quant.", TextAlignment.CENTER));

            int totalQty = 0;
            int rowIdx = 0;

            if (r.getLines() != null && !r.getLines().isEmpty()) {
                for (StockRequisitionLine line : r.getLines()) {
                    StockItem item = line.getStockItem();
                    String code = item != null && item.getCode() != null ? item.getCode() : "—";
                    String fullName = item != null ? item.getFullName().toUpperCase() : "ITEM ALMOXARIFADO";
                    if (item != null && item.getCa() != null && !item.getCa().isBlank()) {
                        fullName += " (CA: " + item.getCa().trim() + ")";
                    }
                    int qty = line.getQuantity() != null && line.getQuantity() > 0 ? line.getQuantity() : 1;
                    totalQty += qty;

                    boolean alt = (rowIdx % 2 != 0);
                    table.addCell(createWarehouseDataCell(code, TextAlignment.CENTER, alt));
                    table.addCell(createWarehouseDataCell(fullName, TextAlignment.LEFT, alt));
                    table.addCell(createWarehouseDataCell("UN", TextAlignment.CENTER, alt));
                    table.addCell(createWarehouseDataCell(String.format(java.util.Locale.US, "%.2f", (double) qty), TextAlignment.CENTER, alt));
                    rowIdx++;
                }
            }

            // Linhas complementares se a tabela tiver menos de 8 itens (preenchimento harmonioso)
            while (rowIdx < 8) {
                boolean alt = (rowIdx % 2 != 0);
                table.addCell(createWarehouseDataCell("", TextAlignment.CENTER, alt));
                table.addCell(createWarehouseDataCell("", TextAlignment.LEFT, alt));
                table.addCell(createWarehouseDataCell("", TextAlignment.CENTER, alt));
                table.addCell(createWarehouseDataCell("", TextAlignment.CENTER, alt));
                rowIdx++;
            }

            // Linha de Totalização
            Cell totalLabelCell = new Cell(1, 2)
                    .add(new Paragraph("TOTAL DE ITENS: " + (r.getLines() != null ? r.getLines().size() : 0)).setBold().setFontSize(7.5f))
                    .setBorder(new SolidBorder(new DeviceRgb(203, 213, 225), 0.8f))
                    .setBackgroundColor(new DeviceRgb(241, 245, 249))
                    .setPadding(3f);
            Cell totalQtyCell = new Cell(1, 2)
                    .add(new Paragraph("QUANTIDADE TOTAL: " + String.format(java.util.Locale.US, "%.2f", (double) totalQty)).setBold().setFontSize(7.5f).setTextAlignment(TextAlignment.CENTER))
                    .setBorder(new SolidBorder(new DeviceRgb(203, 213, 225), 0.8f))
                    .setBackgroundColor(new DeviceRgb(241, 245, 249))
                    .setPadding(3f);
            table.addCell(totalLabelCell);
            table.addCell(totalQtyCell);

            document.add(table);

            // 4. Termo de Recebimento de Materiais (Almoxarifado)
            addSectionHeader(document, "TERMO DE RECEBIMENTO DE MATERIAIS");

            String compText = company != null && company.getName() != null ? company.getName() : "Promover Terceirização e Serviços Ltda.";
            String termText = "Declaro que recebi do Almoxarifado da " + compText
                    + " os materiais/equipamentos acima relacionados em perfeitas condições para execução dos serviços, responsabilizando-me pela sua guarda e uso adequado.";

            Table decTable = new Table(UnitValue.createPercentArray(new float[]{100f}))
                    .useAllAvailableWidth().setMarginBottom(4f);
            decTable.addCell(new Cell().add(new Paragraph(termText)
                    .setFontSize(7.5f).setTextAlignment(TextAlignment.JUSTIFIED)).setPadding(3.5f)
                    .setBackgroundColor(new DeviceRgb(248, 250, 252))
                    .setBorder(new SolidBorder(new DeviceRgb(226, 232, 240), 0.8f)));
            document.add(decTable);

            // 5. Bloco de Assinaturas (Solicitante/Colaborador e Responsável Almoxarifado)
            Table signTable = new Table(UnitValue.createPercentArray(new float[]{50f, 50f}))
                    .useAllAvailableWidth().setMarginTop(12f);

            // Coluna Esquerda: Colaborador / Solicitante
            Cell empSignCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER).setPadding(4f);
            String digitalSig = r.getDigitalSignature();
            if (digitalSig != null && !digitalSig.isBlank()) {
                try {
                    String base64Data = digitalSig;
                    if (base64Data.contains(",")) {
                        base64Data = base64Data.split(",")[1];
                    }
                    byte[] imageBytes = Base64.getDecoder().decode(base64Data);
                    Image img = new Image(ImageDataFactory.create(imageBytes));
                    img.setMaxHeight(26f);
                    img.setMaxWidth(130f);
                    empSignCell.add(img);
                    empSignCell.add(new Paragraph("Assinatura Digital Registrada").setFontSize(6.5f).setItalic());
                } catch (Exception e) {
                    empSignCell.add(new Paragraph("_________________________________________________").setFontSize(8f));
                }
            } else if (r.getPhysicalSignatureAck() != null && !r.getPhysicalSignatureAck().isBlank()) {
                empSignCell.add(new Paragraph("Recebimento Físico: " + r.getPhysicalSignatureAck()).setFontSize(7f).setItalic());
                empSignCell.add(new Paragraph("_________________________________________________").setFontSize(8f));
            } else {
                empSignCell.add(new Paragraph("_________________________________________________").setFontSize(8f));
            }
            empSignCell.add(new Paragraph(name).setFontSize(7.5f).setBold().setMarginTop(2f));
            empSignCell.add(new Paragraph("Assinatura do Recebedor / Colaborador").setFontSize(6.8f).setFontColor(TEXT_MUTED));
            empSignCell.add(new Paragraph("Data: " + issueDateStr).setFontSize(6.8f).setFontColor(TEXT_MUTED));

            // Coluna Direita: Responsável pelo Almoxarifado
            Cell respSignCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER).setPadding(4f);
            respSignCell.add(new Paragraph("_________________________________________________").setFontSize(8f));
            respSignCell.add(new Paragraph(responsibleName).setFontSize(7.5f).setBold().setMarginTop(2f));
            respSignCell.add(new Paragraph("Responsável pela Entrega — Almoxarifado").setFontSize(6.8f).setFontColor(TEXT_MUTED));
            respSignCell.add(new Paragraph("Data: " + issueDateStr).setFontSize(6.8f).setFontColor(TEXT_MUTED));

            signTable.addCell(empSignCell);
            signTable.addCell(respSignCell);
            document.add(signTable);

            document.close();
            log.info("✅ PDF de Requisição de Material Almoxarifado gerado com sucesso. Nº: {}, Tamanho: {} bytes", r.getRequisitionNumber(), baos.size());
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de Requisição de Almoxarifado: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF de Requisição de Almoxarifado: " + e.getMessage(), e);
        }
    }

    private byte[] generateNativeWarehouseMovementPdf(StockMovement movement) {
        Employee emp = movement.getEmployee();
        if (emp != null && emp.getId() != null) {
            emp = employeeRepository.findById(emp.getId()).orElse(emp);
        }

        Company company = resolveCompany(emp);
        UUID companyId = company != null ? company.getId() : null;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document;

        try {
            PdfWriter writer = new PdfWriter(baos);
            if (company != null && company.getId() != null) {
                try {
                    var layoutBuilder = ReportLayoutConfig.builder()
                            .companyId(companyId)
                            .reportTitle(null)
                            .showHeader(false)
                            .showFooterContentSeparator(true)
                            .showFooterBackgroundLine(false)
                            .includeEmailInFooter(true)
                            .showPageNumbers(true)
                            .landscape(false)
                            .topMargin(20f)
                            .marginExtraTop(0f)
                            .bottomMargin(45f)
                            .leftMargin(30f)
                            .rightMargin(30f);

                    if (emp != null && emp.getId() != null) {
                        documentDateResolver.applyAdmissionDateFooter(layoutBuilder, emp.getId());
                    }
                    ReportLayoutConfig layoutConfig = layoutBuilder.build();

                    DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                    document = docWithPdf.getDocument();
                } catch (Exception layoutEx) {
                    log.warn("Falha no standardReportLayoutService para movimentação ({}), criando documento direto", layoutEx.getMessage());
                    com.itextpdf.kernel.pdf.PdfDocument pdfDoc = new com.itextpdf.kernel.pdf.PdfDocument(writer);
                    pdfDoc.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4);
                    document = new Document(pdfDoc, com.itextpdf.kernel.geom.PageSize.A4);
                    document.setMargins(20f, 30f, 45f, 30f);
                }
            } else {
                com.itextpdf.kernel.pdf.PdfDocument pdfDoc = new com.itextpdf.kernel.pdf.PdfDocument(writer);
                pdfDoc.setDefaultPageSize(com.itextpdf.kernel.geom.PageSize.A4);
                document = new Document(pdfDoc, com.itextpdf.kernel.geom.PageSize.A4);
                document.setMargins(20f, 30f, 45f, 30f);
            }

            LocalDate movDate = movement.getMovementDate() != null ? movement.getMovementDate().toLocalDate() : LocalDate.now();
            String issueDateStr = movDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String reqCode = movement.getRequisitionNumber() != null && !movement.getRequisitionNumber().isBlank()
                    ? movement.getRequisitionNumber()
                    : ("MOV-" + (movement.getId() != null ? movement.getId().toString().substring(0, 8).toUpperCase() : ""));
            addExecutiveHeader(document, company, "REQUISIÇÃO DE MATERIAL ALMOXARIFADO", "ENTREGUE", reqCode);

            addSectionHeader(document, "IDENTIFICAÇÃO DO COLABORADOR E SOLICITANTE");

            String name = emp != null && emp.getName() != null ? emp.getName().toUpperCase()
                    : (movement.getEmployeeName() != null ? movement.getEmployeeName().toUpperCase() : "");
            Table nameTable = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth();
            nameTable.addCell(new Cell().add(new Paragraph("COLABORADOR BENEFICIÁRIO: " + name)
                    .setFontSize(8f).setBold()).setPadding(2f));
            document.add(nameTable);

            Table infoTable = new Table(UnitValue.createPercentArray(new float[]{40f, 30f, 30f})).useAllAvailableWidth();
            String position = emp != null && emp.getPosition() != null ? emp.getPosition().getName().toUpperCase() : "";
            String cpf = emp != null ? CompanyDataFormatter.formatCpf(emp.getCpf() != null ? emp.getCpf() : emp.getDocument()) : "";
            String rg = buildRg(emp);

            infoTable.addCell(new Cell().add(new Paragraph("FUNÇÃO: " + position).setFontSize(7.5f)).setPadding(2f));
            infoTable.addCell(new Cell().add(new Paragraph("CPF: " + cpf).setFontSize(7.5f)).setPadding(2f));
            infoTable.addCell(new Cell().add(new Paragraph("RG: " + rg).setFontSize(7.5f)).setPadding(2f));
            document.add(infoTable);

            Table secondInfoTable = new Table(UnitValue.createPercentArray(new float[]{35f, 30f, 35f})).useAllAvailableWidth();
            String hireDate = emp != null ? formatDate(emp.getHireDate()) : "";
            String sector = emp != null && emp.getDepartment() != null ? emp.getDepartment().getName().toUpperCase() :
                    (emp != null && emp.getUnit() != null ? emp.getUnit().getName().toUpperCase() : "");
            String respName = movement.getUserName() != null ? movement.getUserName().toUpperCase() :
                    (movement.getUser() != null ? movement.getUser().getName().toUpperCase() : "ALMOXARIFADO");

            secondInfoTable.addCell(new Cell().add(new Paragraph("ADMISSÃO: " + hireDate).setFontSize(7.5f)).setPadding(2f));
            secondInfoTable.addCell(new Cell().add(new Paragraph("SETOR: " + sector).setFontSize(7.5f)).setPadding(2f));
            secondInfoTable.addCell(new Cell().add(new Paragraph("RESPONSÁVEL ENTREGA: " + respName).setFontSize(7.5f)).setPadding(2f));
            document.add(secondInfoTable);

            String reasonDesc = movement.getReason() != null ? movement.getReason().getDescription() : "Saída Almoxarifado";
            Table thirdInfoTable = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth().setMarginBottom(2.5f);
            thirdInfoTable.addCell(new Cell().add(new Paragraph("MOTIVO DA SAÍDA: " + reasonDesc).setFontSize(7.5f)).setPadding(2f));
            document.add(thirdInfoTable);

            if (movement.getNotes() != null && !movement.getNotes().isBlank()) {
                Table notesTable = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth().setMarginBottom(2.5f);
                notesTable.addCell(new Cell().add(new Paragraph("OBSERVAÇÕES: " + movement.getNotes()).setFontSize(7f).setItalic()).setPadding(2f));
                document.add(notesTable);
            }

            addSectionHeader(document, "DETALHAMENTO DOS MATERIAIS FORNECIDOS");

            Table table = new Table(UnitValue.createPercentArray(new float[]{18f, 54f, 10f, 18f}))
                    .useAllAvailableWidth();

            table.addHeaderCell(createWarehouseHeaderCell("Código", TextAlignment.CENTER));
            table.addHeaderCell(createWarehouseHeaderCell("Item / Material", TextAlignment.LEFT));
            table.addHeaderCell(createWarehouseHeaderCell("UN", TextAlignment.CENTER));
            table.addHeaderCell(createWarehouseHeaderCell("Quant.", TextAlignment.CENTER));

            StockItem si = movement.getStockItem();
            String code = si != null && si.getCode() != null ? si.getCode() : "—";
            String fullName = si != null ? si.getFullName().toUpperCase() : (movement.getNotes() != null ? movement.getNotes().toUpperCase() : "ITEM ALMOXARIFADO");
            if (si != null && si.getCa() != null && !si.getCa().isBlank()) {
                fullName += " (CA: " + si.getCa().trim() + ")";
            }
            int qty = movement.getQuantity() != null && movement.getQuantity() > 0 ? movement.getQuantity() : 1;

            table.addCell(createWarehouseDataCell(code, TextAlignment.CENTER, false));
            table.addCell(createWarehouseDataCell(fullName, TextAlignment.LEFT, false));
            table.addCell(createWarehouseDataCell("UN", TextAlignment.CENTER, false));
            table.addCell(createWarehouseDataCell(String.format(java.util.Locale.US, "%.2f", (double) qty), TextAlignment.CENTER, false));

            // Linhas complementares pautadas
            for (int i = 1; i < 8; i++) {
                boolean alt = (i % 2 != 0);
                table.addCell(createWarehouseDataCell("", TextAlignment.CENTER, alt));
                table.addCell(createWarehouseDataCell("", TextAlignment.LEFT, alt));
                table.addCell(createWarehouseDataCell("", TextAlignment.CENTER, alt));
                table.addCell(createWarehouseDataCell("", TextAlignment.CENTER, alt));
            }

            // Totalização
            Cell totalLabelCell = new Cell(1, 2)
                    .add(new Paragraph("TOTAL DE ITENS: 1").setBold().setFontSize(7.5f))
                    .setBorder(new SolidBorder(new DeviceRgb(203, 213, 225), 0.8f))
                    .setBackgroundColor(new DeviceRgb(241, 245, 249))
                    .setPadding(3f);
            Cell totalQtyCell = new Cell(1, 2)
                    .add(new Paragraph("QUANTIDADE TOTAL: " + String.format(java.util.Locale.US, "%.2f", (double) qty)).setBold().setFontSize(7.5f).setTextAlignment(TextAlignment.CENTER))
                    .setBorder(new SolidBorder(new DeviceRgb(203, 213, 225), 0.8f))
                    .setBackgroundColor(new DeviceRgb(241, 245, 249))
                    .setPadding(3f);
            table.addCell(totalLabelCell);
            table.addCell(totalQtyCell);

            document.add(table);

            addSectionHeader(document, "TERMO DE RECEBIMENTO DE MATERIAIS");

            String compText = company != null && company.getName() != null ? company.getName() : "Promover Terceirização e Serviços Ltda.";
            String termText = "Declaro que recebi do Almoxarifado da " + compText
                    + " os materiais/equipamentos acima relacionados em perfeitas condições para execução dos serviços, responsabilizando-me pela sua guarda e uso adequado.";

            Table decTable = new Table(UnitValue.createPercentArray(new float[]{100f}))
                    .useAllAvailableWidth().setMarginBottom(4f);
            decTable.addCell(new Cell().add(new Paragraph(termText)
                    .setFontSize(7.5f).setTextAlignment(TextAlignment.JUSTIFIED)).setPadding(3.5f)
                    .setBackgroundColor(new DeviceRgb(248, 250, 252))
                    .setBorder(new SolidBorder(new DeviceRgb(226, 232, 240), 0.8f)));
            document.add(decTable);

            Table signTable = new Table(UnitValue.createPercentArray(new float[]{50f, 50f}))
                    .useAllAvailableWidth().setMarginTop(12f);

            Cell empSignCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER).setPadding(4f);
            if (movement.getDigitalSignature() != null && !movement.getDigitalSignature().isBlank()) {
                try {
                    String base64Data = movement.getDigitalSignature();
                    if (base64Data.contains(",")) {
                        base64Data = base64Data.split(",")[1];
                    }
                    byte[] imageBytes = Base64.getDecoder().decode(base64Data);
                    Image img = new Image(ImageDataFactory.create(imageBytes));
                    img.setMaxHeight(26f);
                    img.setMaxWidth(130f);
                    empSignCell.add(img);
                    empSignCell.add(new Paragraph("Assinatura Digital Registrada").setFontSize(6.5f).setItalic());
                } catch (Exception e) {
                    empSignCell.add(new Paragraph("_________________________________________________").setFontSize(8f));
                }
            } else {
                empSignCell.add(new Paragraph("_________________________________________________").setFontSize(8f));
            }
            empSignCell.add(new Paragraph(name).setFontSize(7.5f).setBold().setMarginTop(2f));
            empSignCell.add(new Paragraph("Assinatura do Recebedor / Colaborador").setFontSize(6.8f).setFontColor(TEXT_MUTED));
            empSignCell.add(new Paragraph("Data: " + issueDateStr).setFontSize(6.8f).setFontColor(TEXT_MUTED));

            Cell respSignCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.CENTER).setPadding(4f);
            respSignCell.add(new Paragraph("_________________________________________________").setFontSize(8f));
            respSignCell.add(new Paragraph(respName).setFontSize(7.5f).setBold().setMarginTop(2f));
            respSignCell.add(new Paragraph("Responsável pela Entrega — Almoxarifado").setFontSize(6.8f).setFontColor(TEXT_MUTED));
            respSignCell.add(new Paragraph("Data: " + issueDateStr).setFontSize(6.8f).setFontColor(TEXT_MUTED));

            signTable.addCell(empSignCell);
            signTable.addCell(respSignCell);
            document.add(signTable);

            document.close();
            log.info("✅ PDF de Requisição de Material Almoxarifado (movimentação) gerado com sucesso. Tamanho: {} bytes", baos.size());
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de movimentação de almoxarifado: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF de movimentação: " + e.getMessage(), e);
        }
    }

    private Cell createWarehouseHeaderCell(String text, TextAlignment align) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setBold().setFontSize(7.5f)
                        .setFontColor(ColorConstants.WHITE).setTextAlignment(align))
                .setBackgroundColor(BRONZE_HEADER)
                .setBorder(new SolidBorder(new DeviceRgb(130, 95, 45), 0.8f))
                .setPaddingTop(3.5f).setPaddingBottom(3.5f).setPaddingLeft(4f).setPaddingRight(4f);
    }

    private Cell createWarehouseDataCell(String text, TextAlignment align, boolean alternate) {
        Cell cell = new Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(7.5f).setTextAlignment(align))
                .setBorder(new SolidBorder(new DeviceRgb(226, 232, 240), 0.5f))
                .setPaddingTop(3f).setPaddingBottom(3f).setPaddingLeft(4f).setPaddingRight(4f)
                .setMinHeight(15f);
        if (alternate) {
            cell.setBackgroundColor(new DeviceRgb(248, 250, 252));
        }
        return cell;
    }

    /* ========================================================================= */
    /* MÉTODOS AUXILIARES DE MONTAGEM E HISTÓRICO                                */
    /* ========================================================================= */

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

    private List<EpiMovementRow> buildMovementRowsForRequisition(StockRequisition r, Employee emp, LocalDate currentDeliveryDate) {
        List<EpiMovementRow> rows = new ArrayList<>();

        // Se o funcionário possui fichas de EPI concluídas no histórico, inclui as entregas anteriores
        if (emp != null && emp.getId() != null) {
            try {
                List<EPIDeliveryForm> completedForms = epiDeliveryFormRepository
                        .findByEmployeeIdAndStatusWithItemsOrderByDeliveryDateAsc(emp.getId(), EPIDeliveryFormStatus.COMPLETED);

                for (EPIDeliveryForm historicalForm : completedForms) {
                    if (r.getId() != null && r.getId().equals(historicalForm.getStockRequisitionId())) {
                        continue;
                    }
                    appendFormItems(rows, historicalForm);
                }
            } catch (Exception ex) {
                log.warn("Erro ao consultar histórico de fichas EPI para o funcionário: {}", ex.getMessage());
            }
        }

        // Adiciona os itens da requisição atual
        if (r.getLines() != null) {
            for (StockRequisitionLine line : r.getLines()) {
                StockItem item = line.getStockItem();
                String name = item != null ? item.getFullName() : "";
                String size = item != null ? resolveDisplaySizeNumber(item) : "";
                String ca = item != null && item.getCa() != null ? item.getCa() : "";
                int qty = line.getQuantity() != null && line.getQuantity() > 0 ? line.getQuantity() : 1;

                String subInfo = "";
                String subReason = "";
                if (r.getMovementReason() == MovementReason.TROCA || r.getMovementReason() == MovementReason.REPOSICAO) {
                    subReason = r.getMovementReason().getDescription();
                } else if (r.getMovementReason() == MovementReason.DEVOLUCAO) {
                    subInfo = formatDate(currentDeliveryDate);
                    subReason = "Devolvido ao Estoque";
                }

                String sig = "";
                if (r.getPhysicalSignatureAck() != null && !r.getPhysicalSignatureAck().isBlank()) {
                    sig = "Ficha Manual Impressa";
                } else if (r.getDigitalSignature() != null && !r.getDigitalSignature().isBlank()) {
                    sig = r.getDigitalSignature();
                }

                EpiMovementRow newRow = new EpiMovementRow(
                        name,
                        size,
                        ca,
                        qty,
                        currentDeliveryDate,
                        subInfo,
                        subReason,
                        sig
                );

                // Evita duplicidade se o mesmo item já foi adicionado na mesma data
                boolean exists = false;
                for (EpiMovementRow existing : rows) {
                    if (equalsIgnoreCaseTrim(existing.epiName(), newRow.epiName()) &&
                            equalsIgnoreCaseTrim(existing.sizeNumber(), newRow.sizeNumber()) &&
                            equalsIgnoreCaseTrim(existing.ca(), newRow.ca()) &&
                            java.util.Objects.equals(existing.deliveryDate(), newRow.deliveryDate())) {
                        exists = true;
                        break;
                    }
                }

                if (!exists) {
                    rows.add(newRow);
                }
            }
        }

        return rows;
    }

    private void appendFormItems(List<EpiMovementRow> rows, EPIDeliveryForm form) {
        if (form.getItems() == null || form.getItems().isEmpty()) {
            return;
        }

        LocalDate formDeliveryDate = form.getDeliveryDate();

        List<EPIDeliveryFormItem> orderedItems = form.getItems().stream()
                .sorted(java.util.Comparator
                        .comparing((EPIDeliveryFormItem i) -> i.getLineOrder() != null ? i.getLineOrder() : 0)
                        .thenComparing(i -> i.getId() != null ? i.getId().toString() : ""))
                .toList();

        for (EPIDeliveryFormItem item : orderedItems) {
            int qty = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;
            LocalDate itemDeliveryDate = item.getConfirmedAt() != null
                    ? item.getConfirmedAt().toLocalDate()
                    : (formDeliveryDate != null ? formDeliveryDate : LocalDate.now());

            String substitutionInfo = "";
            String substitutionReason = "";

            if (item.getReturnedDate() != null) {
                substitutionInfo = formatDate(item.getReturnedDate());
            } else if (item.getSubstitutedDate() != null) {
                substitutionInfo = formatDate(item.getSubstitutedDate());
            }

            if (item.getReturnReason() != null && !item.getReturnReason().isBlank()) {
                substitutionReason = item.getReturnReason().trim();
            } else if (item.getReplacementReason() != null && !item.getReplacementReason().isBlank()) {
                substitutionReason = item.getReplacementReason().trim();
            }

            String sizeNum = resolveDisplaySizeNumber(item);

            EpiMovementRow newRow = new EpiMovementRow(
                    item.getEpiName(),
                    sizeNum,
                    item.getCa(),
                    qty,
                    itemDeliveryDate,
                    substitutionInfo,
                    substitutionReason,
                    item.getSignatureBase64());

            if (!substitutionInfo.isEmpty() && substitutionInfo.equals(formatDate(itemDeliveryDate))) {
                if ("Substituição".equalsIgnoreCase(substitutionReason) || "Troca".equalsIgnoreCase(substitutionReason)) {
                    substitutionInfo = "";
                    substitutionReason = "";
                }
            }

            int existingIdx = -1;
            for (int i = 0; i < rows.size(); i++) {
                EpiMovementRow r = rows.get(i);
                if (equalsIgnoreCaseTrim(r.epiName(), newRow.epiName()) &&
                        equalsIgnoreCaseTrim(r.sizeNumber(), newRow.sizeNumber()) &&
                        equalsIgnoreCaseTrim(r.ca(), newRow.ca()) &&
                        java.util.Objects.equals(r.deliveryDate(), newRow.deliveryDate())) {
                    existingIdx = i;
                    break;
                }
            }

            if (existingIdx >= 0) {
                EpiMovementRow existing = rows.get(existingIdx);
                if ((existing.substitutionInfo() == null || existing.substitutionInfo().isBlank()) &&
                        (!substitutionInfo.isBlank() || !substitutionReason.isBlank())) {
                    rows.set(existingIdx, new EpiMovementRow(
                            existing.epiName(),
                            existing.sizeNumber(),
                            existing.ca(),
                            existing.quantity(),
                            existing.deliveryDate(),
                            substitutionInfo,
                            substitutionReason,
                            existing.signatureBase64() != null ? existing.signatureBase64() : newRow.signatureBase64()
                    ));
                }
            } else {
                rows.add(newRow);
            }
        }
    }

    private String resolveDisplaySizeNumber(StockItem item) {
        if (item == null) return "";
        if (item.getSizeVariation() != null && !item.getSizeVariation().isBlank()) {
            return item.getSizeVariation().trim();
        }
        if (item.getName() != null) {
            String extracted = extractSizeFromName(item.getName());
            if (extracted != null) return extracted;
        }
        return "";
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
            String extracted = extractSizeFromName(item.getEpiName());
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

    private String extractSizeFromName(String name) {
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

    /* ========================================================================= */
    /* COMPONENTES VISUAIS EXECUTIVOS PADRONIZADOS DA FICHA DE EPI               */
    /* ========================================================================= */

    private Cell createEpiHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(text).setBold().setFontSize(6.8f)
                        .setTextAlignment(TextAlignment.CENTER))
                .setPadding(2.5f);
    }

    private Cell createEpiDataCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(6.8f)
                        .setTextAlignment(TextAlignment.CENTER))
                .setPaddingTop(1.5f).setPaddingBottom(1.5f).setPaddingLeft(2f).setPaddingRight(2f)
                .setMinHeight(13f);
    }

    private Cell createEpiSignatureCell(String signatureBase64) {
        if (signatureBase64 == null || signatureBase64.isBlank()) {
            return createEpiDataCell("");
        }
        String sigTrim = signatureBase64.trim();
        if (sigTrim.contains("manual") || sigTrim.contains("Manual")
                || sigTrim.contains("impressa") || sigTrim.contains("Impressa")
                || sigTrim.equalsIgnoreCase("PHYSICAL") || sigTrim.contains("Física")
                || sigTrim.contains("FISICA")) {
            return new Cell().add(new Paragraph("Ficha Manual Impressa").setFontSize(6.5f).setItalic())
                    .setPadding(1f).setHeight(15f);
        }
        try {
            String base64Data = signatureBase64;
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            Image img = new Image(ImageDataFactory.create(imageBytes));
            img.setMaxHeight(13f);
            img.setMaxWidth(70f);
            return new Cell().add(img).setPadding(1f).setHeight(15f);
        } catch (Exception e) {
            log.warn("Erro ao renderizar assinatura do item no PDF: {}", e.getMessage());
            if (signatureBase64.length() < 100) {
                return new Cell().add(new Paragraph(signatureBase64).setFontSize(6.5f).setItalic())
                        .setPadding(1f).setHeight(15f);
            }
            return createEpiDataCell("");
        }
    }

    private void addExecutiveHeader(Document document, Company company, String reportTitle, String badgeText, String periodOrCodeText) {
        Table headerContainer = new Table(UnitValue.createPercentArray(new float[]{100f})).useAllAvailableWidth();
        headerContainer.setBorder(new SolidBorder(new DeviceRgb(30, 41, 59), 1f));
        headerContainer.setMarginBottom(4f);

        Cell wrapperCell = new Cell()
                .setBackgroundColor(DARK_NAVY) // #0f172a Fundo executivo escuro
                .setPadding(8f)
                .setBorder(Border.NO_BORDER);

        Table innerTable = new Table(UnitValue.createPercentArray(new float[]{60f, 40f})).useAllAvailableWidth();
        innerTable.setBorder(Border.NO_BORDER);

        // Esquerda: Logomarca + Dados da Empresa
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
        Image logoImg = loadCompanyLogoImage(company);

        String defaultCompName = "PROMOVER TERCEIRIZAÇÃO E SERVIÇOS LTDA";
        String defaultCnpj = "36.698.521/0001-01";
        String defaultAddr = "Rua Marte, 526 - Jardim Riacho das Pedras - Contagem/MG - 32241-250";

        String compName = (company != null && company.getName() != null && !company.getName().isBlank())
                ? company.getName().toUpperCase()
                : defaultCompName;

        StringBuilder addressSb = new StringBuilder();
        if (company != null) {
            if (company.getCnpj() != null && !company.getCnpj().isBlank()) {
                addressSb.append("CNPJ: ").append(CompanyDataFormatter.formatCnpj(company.getCnpj()));
            }
            String fullAddr = CompanyDataFormatter.formatFullAddress(company);
            if (fullAddr != null && !fullAddr.isBlank()) {
                if (addressSb.length() > 0) addressSb.append(" • ");
                addressSb.append(fullAddr);
            }
        }
        if (addressSb.length() == 0) {
            addressSb.append("CNPJ: ").append(defaultCnpj).append(" • ").append(defaultAddr);
        }

        if (logoImg != null) {
            Table compBox = new Table(UnitValue.createPercentArray(new float[]{16f, 84f})).useAllAvailableWidth();
            compBox.setBorder(Border.NO_BORDER);

            Cell logoCell = new Cell()
                    .setBorder(Border.NO_BORDER)
                    .setPadding(0f)
                    .setTextAlignment(TextAlignment.LEFT)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .add(logoImg);

            Cell infoCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPaddingLeft(8f);
            infoCell.add(new Paragraph(compName)
                    .setFontSize(9.5f)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setMarginBottom(2f));

            infoCell.add(new Paragraph(addressSb.toString())
                    .setFontSize(6.8f)
                    .setFontColor(new DeviceRgb(203, 213, 225))
                    .setMarginBottom(0f));

            compBox.addCell(logoCell);
            compBox.addCell(infoCell);
            leftCell.add(compBox);
        } else {
            leftCell.add(new Paragraph(compName)
                    .setFontSize(10f)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setMarginBottom(2f));

            leftCell.add(new Paragraph(addressSb.toString())
                    .setFontSize(6.8f)
                    .setFontColor(new DeviceRgb(203, 213, 225))
                    .setMarginBottom(0f));
        }

        innerTable.addCell(leftCell);

        // Direita: Título executivo CONTROLE DE EPI em vermelho vibrante, Badge e Emissão
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.MIDDLE);

        rightCell.add(new Paragraph(reportTitle != null ? reportTitle.toUpperCase() : "CONTROLE DE EPI")
                .setFontSize(11.5f)
                .setBold()
                .setFontColor(new DeviceRgb(248, 113, 113)) // #f87171 Vermelho vibrante contrastante
                .setMarginBottom(2.5f));

        Paragraph metaPara = new Paragraph().setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2.5f);
        if (badgeText != null && !badgeText.isBlank()) {
            metaPara.add(new Text(" " + badgeText.toUpperCase() + " ")
                    .setFontSize(7.5f)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setBackgroundColor(new DeviceRgb(30, 41, 59)));
            metaPara.add("  ");
        }
        if (periodOrCodeText != null && !periodOrCodeText.isBlank()) {
            metaPara.add(new Text(" " + periodOrCodeText + " ")
                    .setFontSize(7.5f)
                    .setBold()
                    .setFontColor(new DeviceRgb(251, 191, 36))); // #fbbf24 Ouro/Amarelo brilhante
        }
        if (!metaPara.getChildren().isEmpty()) {
            rightCell.add(metaPara);
        }

        rightCell.add(new Paragraph("Data de Emissão: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .setFontSize(7f)
                .setFontColor(new DeviceRgb(148, 163, 184))
                .setMarginBottom(0f));

        innerTable.addCell(rightCell);
        wrapperCell.add(innerTable);
        headerContainer.addCell(wrapperCell);
        document.add(headerContainer);

        // Barra inferior com degradê oficial corporativo (Vermelho -> Laranja -> Ouro)
        Table divider = new Table(UnitValue.createPercentArray(new float[]{40f, 35f, 25f})).useAllAvailableWidth();
        divider.setBorder(Border.NO_BORDER);
        divider.setMarginTop(0f);
        divider.setMarginBottom(3f);

        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(RED_PRIMARY).setBorder(Border.NO_BORDER).setPadding(0f));
        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(ORANGE_ACCENT).setBorder(Border.NO_BORDER).setPadding(0f));
        divider.addCell(new Cell().setHeight(2.5f).setBackgroundColor(YELLOW_ACCENT).setBorder(Border.NO_BORDER).setPadding(0f));

        document.add(divider);
    }

    private void addSectionHeader(Document document, String title) {
        Table secTable = new Table(UnitValue.createPercentArray(new float[]{0.6f, 99.4f})).useAllAvailableWidth();
        secTable.setBorder(Border.NO_BORDER);
        secTable.setMarginTop(3f);
        secTable.setMarginBottom(1.5f);

        Cell barCell = new Cell().setBackgroundColor(RED_PRIMARY).setBorder(Border.NO_BORDER).setPadding(0f);
        Cell textCell = new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(4f).setPaddingTop(0f).setPaddingBottom(0f);
        textCell.add(new Paragraph(title.toUpperCase())
                .setFontSize(7.5f)
                .setBold()
                .setFontColor(RED_PRIMARY));

        secTable.addCell(barCell);
        secTable.addCell(textCell);
        document.add(secTable);
    }

    private Image loadCompanyLogoImage(Company company) {
        String logoUrl = company != null ? company.getLogoUrl() : null;
        try {
            ImageData imageData = null;

            if (logoUrl != null && !logoUrl.isBlank()) {
                if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
                    try {
                        imageData = ImageDataFactory.create(logoUrl);
                    } catch (Exception ex) {
                        log.debug("Falha ao carregar logo por URL remota: {}", ex.getMessage());
                    }
                }

                if (imageData == null) {
                    String clean = logoUrl.replace("/api/uploads/companies/logos/", "")
                            .replace("api/uploads/companies/logos/", "")
                            .replace("/uploads/companies/logos/", "")
                            .replace("uploads/companies/logos/", "");

                    java.nio.file.Path[] uploadCandidates = new java.nio.file.Path[]{
                            java.nio.file.Paths.get(logoUrl),
                            java.nio.file.Paths.get("backend", "uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get("uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get(uploadBaseDir != null ? uploadBaseDir : "uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get("c:/dev/secured-guard/backend/uploads/companies/logos", clean),
                            java.nio.file.Paths.get("c:/dev/secured-guard/uploads/companies/logos", clean)
                    };

                    for (java.nio.file.Path p : uploadCandidates) {
                        if (java.nio.file.Files.exists(p)) {
                            try {
                                imageData = ImageDataFactory.create(java.nio.file.Files.readAllBytes(p));
                                break;
                            } catch (Exception ignored) {
                            }
                        }
                    }
                }
            }

            if (imageData == null) {
                String[] classpathResources = new String[]{
                        "static/certificates/nr06/promover-logo.png",
                        "static/email-marketing/promover-logomarca.png",
                        "static/email-marketing/promover-logo.png"
                };

                for (String cpRes : classpathResources) {
                    try {
                        org.springframework.core.io.ClassPathResource cpr = new org.springframework.core.io.ClassPathResource(cpRes);
                        if (cpr.exists()) {
                            try (java.io.InputStream is = cpr.getInputStream()) {
                                byte[] bytes = is.readAllBytes();
                                if (bytes.length > 0) {
                                    imageData = ImageDataFactory.create(bytes);
                                    break;
                                }
                            }
                        }
                    } catch (Exception ignored) {
                    }
                }
            }

            if (imageData == null) {
                java.nio.file.Path[] fileCandidates = new java.nio.file.Path[]{
                        java.nio.file.Paths.get("c:/dev/secured-guard/backend/src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("backend/src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("c:/dev/secured-guard/frontend/public/promover-logo.png"),
                        java.nio.file.Paths.get("frontend/public/promover-logo.png"),
                        java.nio.file.Paths.get("c:/dev/secured-guard/frontend/public/logo-sistema.png")
                };

                for (java.nio.file.Path p : fileCandidates) {
                    if (java.nio.file.Files.exists(p)) {
                        try {
                            imageData = ImageDataFactory.create(java.nio.file.Files.readAllBytes(p));
                            break;
                        } catch (Exception ignored) {
                        }
                    }
                }
            }

            if (imageData != null) {
                Image img = new Image(imageData);
                img.setMaxWidth(52f);
                img.setMaxHeight(32f);
                img.setAutoScale(true);
                return img;
            }
        } catch (Exception e) {
            log.warn("Não foi possível carregar logo da empresa: {}", e.getMessage());
        }
        return null;
    }

    private Company resolveCompany(Employee emp) {
        if (emp != null && emp.getCompany() != null) {
            return emp.getCompany();
        }
        try {
            List<Company> list = companyRepository.findByStatus(Company.CompanyStatus.ACTIVE);
            if (!list.isEmpty()) {
                return list.get(0);
            }
            return companyRepository.findAll().stream().findFirst().orElse(null);
        } catch (Exception e) {
            log.warn("Falha ao resolver empresa ativa para PDF: {}", e.getMessage());
            return null;
        }
    }

    private String buildRg(Employee employee) {
        if (employee == null) return "";
        String rg = "";
        if (employee.getRg() != null && !employee.getRg().trim().isEmpty()) {
            rg = employee.getRg();
        } else if (employee.getCinNumero() != null && !employee.getCinNumero().trim().isEmpty()) {
            rg = employee.getCinNumero();
            if (employee.getCinOrgaoEmissor() != null && !employee.getCinOrgaoEmissor().trim().isEmpty()) {
                rg = employee.getCinOrgaoEmissor() + "-" + rg;
            }
        } else if (employee.getNumeroRg() != null && !employee.getNumeroRg().trim().isEmpty()) {
            rg = employee.getNumeroRg();
            if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                    && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
                rg = employee.getCarteiraIdentidadeOrgaoEmissor() + "-" + rg;
            }
        } else if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
            rg = employee.getCarteiraIdentidadeOrgaoEmissor();
        }
        return rg;
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "";
        return String.format("%02d/%02d/%04d", date.getDayOfMonth(), date.getMonthValue(), date.getYear());
    }

    private String resolveResponsibleName(StockRequisition r) {
        if (r.getDeliveredByUser() != null && r.getDeliveredByUser().getName() != null && !r.getDeliveredByUser().getName().isBlank()) {
            return r.getDeliveredByUser().getName().toUpperCase();
        }
        if (r.getApprovedByUser() != null && r.getApprovedByUser().getName() != null && !r.getApprovedByUser().getName().isBlank()) {
            return r.getApprovedByUser().getName().toUpperCase();
        }
        if (r.getRequestedByUser() != null && r.getRequestedByUser().getName() != null && !r.getRequestedByUser().getName().isBlank()) {
            return r.getRequestedByUser().getName().toUpperCase();
        }
        return "ALMOXARIFADO";
    }

    private static boolean equalsIgnoreCaseTrim(String a, String b) {
        String s1 = a != null ? a.trim() : "";
        String s2 = b != null ? b.trim() : "";
        return s1.equalsIgnoreCase(s2);
    }
}
