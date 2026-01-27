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
public class StandardServiceOrderStrategy implements ServiceOrderStrategy {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    private static final String REPORT_TITLE = "Ordem de Serviço - Segurança do Trabalho";

    @Override
    public boolean supports(DocumentType type) {
        return type == DocumentType.SERVICE_ORDER_STANDARD;
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
            log.error("Erro ao gerar PDF da OS Padrão", e);
            throw new RuntimeException("Erro ao gerar PDF da OS Padrão", e);
        }
    }

    @Override
    public byte[] generateExcel(ServiceOrderRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Ordem de Serviço");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            // Cabeçalho do Funcionário
            Row row = sheet.createRow(startRow);
            row.createCell(0).setCellValue("Funcionário:");
            row.createCell(1).setCellValue(request.getEmployeeName());

            row = sheet.createRow(startRow + 1);
            row.createCell(0).setCellValue("Função:");
            row.createCell(1).setCellValue(request.getEmployeePosition());

            row = sheet.createRow(startRow + 2);
            row.createCell(0).setCellValue("Setor:");
            row.createCell(1).setCellValue(request.getSector());

            // Listas
            int currentRow = startRow + 4;

            currentRow = addListToExcel(sheet, currentRow, "Atividades", List.of(request.getDescriptionOfActivities()));
            currentRow = addListToExcel(sheet, currentRow, "Riscos", request.getRisks());
            currentRow = addListToExcel(sheet, currentRow, "EPIs Obrigatórios", request.getEpiList());
            currentRow = addListToExcel(sheet, currentRow, "Normas", request.getNorms());

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel da OS Padrão", e);
            throw new RuntimeException("Erro ao gerar Excel da OS Padrão", e);
        }
    }

    private int addListToExcel(Sheet sheet, int startRow, String title, List<String> items) {
        if (items == null || items.isEmpty())
            return startRow;

        Row header = sheet.createRow(startRow++);
        header.createCell(0).setCellValue(title);

        for (String item : items) {
            if (item != null && !item.isEmpty()) {
                Row r = sheet.createRow(startRow++);
                r.createCell(1).setCellValue(item);
            }
        }
        return startRow + 1; // Espaço extra
    }

    private void addContent(Document document, ServiceOrderRequest request, Company company) {
        // Cabeçalho de Dados
        Paragraph header = new Paragraph()
                .setFontSize(10f)
                .setMarginBottom(10f);

        header.add(new Text("Funcionário: ").setBold());
        header.add(textOrPlaceholder(request.getEmployeeName()) + "\n");

        header.add(new Text("Função: ").setBold());
        header.add(textOrPlaceholder(request.getEmployeePosition()) + "\n");

        header.add(new Text("Setor: ").setBold());
        header.add(textOrPlaceholder(request.getSector()) + "\n");

        header.add(new Text("Revisão: ").setBold());
        header.add(textOrPlaceholder(request.getRevision()) + " - " + formatLocalDate(request.getElaborationDate()));

        document.add(header);

        // 1. Objetivo
        addSection(document, "1. OBJETIVO",
                "Informar os riscos profissionais que possam originar acidentes do trabalho ou doenças ocupacionais, bem como instruções preventivas.");

        // 2. Atividades
        addSection(document, "2. DESCRIÇÃO DAS ATIVIDADES", request.getDescriptionOfActivities());

        // 3. Riscos
        addListSection(document, "3. AGENTES DE RISCO", request.getRisks());

        // 4. EPIs
        addListSection(document, "4. EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)", request.getEpiList());

        // 5. Normas
        addListSection(document, "5. NORMAS E PROCEDIMENTOS", request.getNorms());

        // 6. Procedimentos Internos
        addListSection(document, "6. PROCEDIMENTOS EM CASO DE ACIDENTE", request.getInternalProcedures());

        // 7. Termo de Responsabilidade
        document.add(new Paragraph("7. TERMO DE RESPONSABILIDADE").setBold().setMarginTop(10f));
        document.add(new Paragraph(
                "Declaro ter recebido treinamento e orientações a respeito das normas de segurança e saúde do trabalho, bem como cópia desta Ordem de Serviço, comprometendo-me a cumprir as instruções aqui contidas, sob pena de sanções disciplinares.")
                .setFontSize(10f).setTextAlignment(TextAlignment.JUSTIFIED));

        // Data e Assinatura
        String city = request.getCity() != null ? request.getCity()
                : (company.getCity() != null ? company.getCity() : "________________");
        String dateStr = request.getDocumentDate() != null
                ? formatDateExtended(request.getDocumentDate())
                : formatDateExtended(LocalDate.now());

        Paragraph dateLoc = new Paragraph(city + ", " + dateStr)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginTop(30f)
                .setMarginBottom(50f);
        document.add(dateLoc);

        // Assinatura Empregado
        document.add(new Paragraph("__________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2f));
        document.add(new Paragraph(textOrPlaceholder(request.getEmployeeName()).toUpperCase())
                .setTextAlignment(TextAlignment.CENTER).setBold());
        document.add(new Paragraph("CPF: " + textOrPlaceholder(request.getEmployeeCpf()))
                .setTextAlignment(TextAlignment.CENTER).setFontSize(9f));

        // Assinatura Resp. Téc.
        document.add(new Paragraph("__________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(30f).setMarginBottom(2f));
        document.add(new Paragraph("Responsável Técnico / Segurança do Trabalho").setTextAlignment(TextAlignment.CENTER)
                .setFontSize(10f));
    }

    private void addSection(Document document, String title, String content) {
        document.add(new Paragraph(title).setBold().setMarginTop(10f));
        if (content != null && !content.isEmpty()) {
            document.add(new Paragraph(content).setFontSize(10f).setTextAlignment(TextAlignment.JUSTIFIED));
        } else {
            document.add(new Paragraph("N/A").setFontSize(10f).setItalic());
        }
    }

    private void addListSection(Document document, String title, List<String> items) {
        document.add(new Paragraph(title).setBold().setMarginTop(10f));
        if (items != null && !items.isEmpty()) {
            com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List()
                    .setSymbolIndent(12)
                    .setListSymbol("•")
                    .setFontSize(10f);
            for (String item : items) {
                list.add(item);
            }
            document.add(list);
        } else {
            document.add(new Paragraph("Nenhum item aplicável.").setFontSize(10f).setItalic());
        }
    }

    private String textOrPlaceholder(String text) {
        return text != null && !text.isEmpty() ? text : "________________";
    }

    private String formatLocalDate(LocalDate date) {
        if (date == null)
            return "__/__/____";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private String formatDateExtended(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
    }
}
