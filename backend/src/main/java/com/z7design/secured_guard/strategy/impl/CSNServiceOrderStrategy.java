package com.z7design.secured_guard.strategy.impl;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.ServiceOrderRequest;
import com.z7design.secured_guard.enums.DocumentType;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.ExcelReportLayoutService;
import com.z7design.secured_guard.service.StandardReportLayoutService;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.strategy.ServiceOrderStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Component
@RequiredArgsConstructor
@Slf4j
public class CSNServiceOrderStrategy implements ServiceOrderStrategy {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    private static final String REPORT_TITLE = "Ordem de Serviço - CSN";

    @Override
    public boolean supports(DocumentType type) {
        return type == DocumentType.SERVICE_ORDER_CSN;
    }

    @Override
    public byte[] generatePdf(ServiceOrderRequest request) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(request.getCompanyId())
                    .reportTitle(REPORT_TITLE)
                    .includeEmailInFooter(true)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();
            Company company = docWithPdf.getCompany();

            addContent(document, request, company);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da OS CSN", e);
            throw new RuntimeException("Erro ao gerar PDF da OS CSN", e);
        }
    }

    @Override
    public byte[] generateExcel(ServiceOrderRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("OS CSN");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            // Cabeçalho específico CSN
            Row row = sheet.createRow(startRow);
            row.createCell(0).setCellValue("Funcionário:");
            row.createCell(1).setCellValue(request.getEmployeeName());

            row = sheet.createRow(startRow + 1);
            row.createCell(0).setCellValue("Matrícula CSN:"); // Campo específico
            row.createCell(1).setCellValue(request.getEmployeeCtps() != null ? request.getEmployeeCtps() : "N/A");

            // Listas
            // ... (similar ao padrão, simplificado para exemplo)

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel da OS CSN", e);
            throw new RuntimeException("Erro ao gerar Excel da OS CSN", e);
        }
    }

    private void addContent(Document document, ServiceOrderRequest request, Company company) {
        // Cabeçalho e Introdução Específica para CSN
        document.add(new Paragraph("Referência: Normais Regulamentadoras da CSN e NR-01").setItalic().setFontSize(9f));

        Paragraph header = new Paragraph()
                .setFontSize(10f)
                .setMarginBottom(10f);

        header.add(new Text("Colaborador: ").setBold());
        header.add(request.getEmployeeName() + "\n");
        // CSN costuma dar ênfase a área/gerência
        header.add(new Text("Gerência/Área: ").setBold());
        header.add(request.getSector() + "\n");

        document.add(header);

        // Seções padrão, mas com títulos talvez ajustados ou conteúdo extra
        addSection(document, "1. OBJETIVO GERAL",
                "Estabelecer diretrizes de segurança para atividades nas dependências da CSN, visando a integridade física dos colaboradores e instalações.");

        // ... Conteúdo similar ao padrão com ajustes de texto
        addSection(document, "2. ATIVIDADES DESENVOLVIDAS", request.getDescriptionOfActivities());

        // Riscos com ênfase
        addListSection(document, "3. RISCOS OCUPACIONAIS ESPECÍFICOS", request.getRisks());

        // EPIs
        addListSection(document, "4. EPIs OBRIGATÓRIOS (USO PERMANENTE)", request.getEpiList());

        // Normas CSN
        document.add(new Paragraph("5. REGRAS DE OURO CSN").setBold().setMarginTop(10f));
        com.itextpdf.layout.element.List rules = new com.itextpdf.layout.element.List().setSymbolIndent(12)
                .setListSymbol("!");
        rules.add("Não acessar áreas isoladas sem permissão.");
        rules.add("Bloqueio de fontes de energia antes de intervenções.");
        // ... Adicionar regras específicas se estiverem nos 'norms' ou hardcoded
        if (request.getNorms() != null) {
            for (String norm : request.getNorms()) {
                rules.add(norm);
            }
        }
        document.add(rules);

        // Assinaturas
        addSignatures(document, request, company);
    }

    private void addSection(Document document, String title, String content) {
        document.add(new Paragraph(title).setBold().setMarginTop(10f));
        if (content != null && !content.isEmpty()) {
            document.add(new Paragraph(content).setFontSize(10f).setTextAlignment(TextAlignment.JUSTIFIED));
        }
    }

    private void addListSection(Document document, String title, List<String> items) {
        document.add(new Paragraph(title).setBold().setMarginTop(10f));
        if (items != null && !items.isEmpty()) {
            com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List().setSymbolIndent(12)
                    .setListSymbol("-").setFontSize(10f);
            for (String item : items)
                list.add(item);
            document.add(list);
        }
    }

    private void addSignatures(Document document, ServiceOrderRequest request, Company company) {
        String dateStr = request.getDocumentDate() != null
                ? request.getDocumentDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "__/__/____";

        document.add(new Paragraph("___________________, " + dateStr).setTextAlignment(TextAlignment.RIGHT)
                .setMarginTop(20f));

        document.add(new Paragraph("__________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(20f));
        document.add(new Paragraph(request.getEmployeeName()).setTextAlignment(TextAlignment.CENTER).setBold());
        document.add(new Paragraph("Declaro ter recebido, lido e compreendido esta Ordem de Serviço.")
                .setTextAlignment(TextAlignment.CENTER).setFontSize(8f));
    }
}
