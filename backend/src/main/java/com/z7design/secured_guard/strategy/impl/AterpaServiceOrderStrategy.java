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
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AterpaServiceOrderStrategy implements ServiceOrderStrategy {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    private static final String REPORT_TITLE = "Ordem de Serviço (NR-01) - ATERPA";

    @Override
    public boolean supports(DocumentType type) {
        return type == DocumentType.SERVICE_ORDER_ATERPA;
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
            log.error("Erro ao gerar PDF da OS ATERPA", e);
            throw new RuntimeException("Erro ao gerar PDF da OS ATERPA", e);
        }
    }

    @Override
    public byte[] generateExcel(ServiceOrderRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("OS ATERPA");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            // Conteúdo Básico
            Row row = sheet.createRow(startRow);
            row.createCell(0).setCellValue("Nome:");
            row.createCell(1).setCellValue(request.getEmployeeName());

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel da OS ATERPA", e);
            throw new RuntimeException("Erro ao gerar Excel da OS ATERPA", e);
        }
    }

    private void addContent(Document document, ServiceOrderRequest request, Company company) {
        // Cabeçalho específico Aterpa
        document.add(new Paragraph("Em cumprimento à NR-01 - Disposições Gerais").setBold().setFontSize(9f)
                .setTextAlignment(TextAlignment.CENTER));

        Paragraph header = new Paragraph()
                .setFontSize(10f)
                .setMarginBottom(10f)
                .setMarginTop(10f);

        header.add(new Text("Funcionário: ").setBold());
        header.add(request.getEmployeeName());
        header.add(new Text(" | CPF: ").setBold());
        header.add(request.getEmployeeCpf() + "\n");

        header.add(new Text("Canteiro de Obras: ").setBold()); // Termo comum em Aterpa
        header.add((request.getSector() != null ? request.getSector() : "Geral") + "\n");

        document.add(header);

        // Seções
        addSection(document, "1. DESCRIÇÃO DA FUNÇÃO", request.getDescriptionOfActivities());

        addListSection(document, "2. RISCOS DA ATIVIDADE (Físicos, Químicos, Biológicos, Ergonômicos e Acidentes)",
                request.getRisks());

        addListSection(document, "3. MEDIDAS DE PREVENÇÃO / EPI", request.getEpiList());

        addListSection(document, "4. OBRIGAÇÕES E PROIBIÇÕES (ATERPA)", request.getNorms());

        // Assinaturas
        addSignatures(document, request);
    }

    private void addSection(Document document, String title, String content) {
        document.add(new Paragraph(title).setBold().setMarginTop(8f));
        if (content != null && !content.isEmpty()) {
            document.add(new Paragraph(content).setFontSize(10f));
        }
    }

    private void addListSection(Document document, String title, List<String> items) {
        document.add(new Paragraph(title).setBold().setMarginTop(8f));
        if (items != null && !items.isEmpty()) {
            com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List().setSymbolIndent(10)
                    .setListSymbol("•").setFontSize(10f);
            for (String item : items)
                list.add(item);
            document.add(list);
        }
    }

    private void addSignatures(Document document, ServiceOrderRequest request) {
        document.add(new Paragraph("__________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(30f));
        document.add(new Paragraph("Assinatura do Colaborador").setTextAlignment(TextAlignment.CENTER).setFontSize(8f));

        document.add(new Paragraph("__________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(20f));
        document.add(new Paragraph("SESMT - ATERPA").setTextAlignment(TextAlignment.CENTER).setFontSize(8f));
    }
}
