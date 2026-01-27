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
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TranspesServiceOrderStrategy implements ServiceOrderStrategy {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    private static final String REPORT_TITLE = "Ordem de Serviço de Segurança - TRANSPES";

    @Override
    public boolean supports(DocumentType type) {
        return type == DocumentType.SERVICE_ORDER_TRANSPES;
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
            log.error("Erro ao gerar PDF da OS TRANSPES", e);
            throw new RuntimeException("Erro ao gerar PDF da OS TRANSPES", e);
        }
    }

    @Override
    public byte[] generateExcel(ServiceOrderRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("OS Transpes");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);
            // ... (implementação padrão de excel)
            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel da OS TRANSPES", e);
            throw new RuntimeException("Erro ao gerar Excel da OS TRANSPES", e);
        }
    }

    private void addContent(Document document, ServiceOrderRequest request, Company company) {
        // Transpes tem foco em transporte e logística
        Paragraph header = new Paragraph()
                .setFontSize(10f)
                .setMarginBottom(10f);

        header.add(new Text("Colaborador: ").setBold());
        header.add(request.getEmployeeName() + "\n");
        header.add(new Text("Unidade/Filial: ").setBold());
        header.add((request.getCity() != null ? request.getCity() : "Matriz") + "\n");

        document.add(header);

        addSection(document, "1. ATIVIDADES DO MOTORISTA/OPERACIONAL",
                request.getDescriptionOfActivities() != null ? request.getDescriptionOfActivities()
                        : "Transporte rodoviário de cargas.");

        addListSection(document, "2. RISCOS (RODOVIÁRIOS E OPERACIONAIS)", request.getRisks());

        addListSection(document, "3. EPIs E ACESSÓRIOS DE SEGURANÇA", request.getEpiList());

        addListSection(document, "4. NORMAS DE TRÂNSITO E INTERNAS", request.getNorms());

        document.add(new Paragraph("5. DECLARAÇÃO DE CIÊNCIA").setBold().setMarginTop(15f));
        document.add(new Paragraph(
                "Declaro ter recebido as orientações de direção defensiva e segurança, comprometendo-me a respeitar as leis de trânsito e normas da transportadora.")
                .setFontSize(10f).setTextAlignment(TextAlignment.JUSTIFIED));

        // Assinaturas
        document.add(new Paragraph("__________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(40f));
        document.add(new Paragraph("Assinatura do Motorista/Colaborador").setTextAlignment(TextAlignment.CENTER)
                .setFontSize(8f));
    }

    private void addSection(Document document, String title, String content) {
        document.add(new Paragraph(title).setBold().setMarginTop(10f));
        if (content != null) {
            document.add(new Paragraph(content).setFontSize(10f));
        }
    }

    private void addListSection(Document document, String title, List<String> items) {
        document.add(new Paragraph(title).setBold().setMarginTop(10f));
        if (items != null) {
            com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List().setSymbolIndent(12)
                    .setListSymbol(">").setFontSize(10f);
            for (String item : items)
                list.add(item);
            document.add(list);
        }
    }
}
