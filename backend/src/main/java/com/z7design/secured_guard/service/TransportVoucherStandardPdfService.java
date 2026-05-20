package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.TransportVoucherRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransportVoucherStandardPdfService {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    private static final String REPORT_TITLE = "DECLARAÇÃO E TERMO DE COMPROMISSO\nPARA ADQUIRIR OU NÃO O VALE-TRANSPORTE";

    public byte[] generatePdf(TransportVoucherRequest request) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(request.getCompanyId())
                    .reportTitle(REPORT_TITLE)
                    .includeEmailInFooter(true)
                    .topMargin(110f) // Aumentado em 20f (de 90f)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();
            Company company = docWithPdf.getCompany();

            addContent(document, request, company);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do Vale-Transporte", e);
            throw new RuntimeException("Erro ao gerar PDF do Vale-Transporte", e);
        }
    }

    public byte[] generateExcel(TransportVoucherRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Vale-Transporte");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            // Adicionar dados principais
            Row row = sheet.createRow(startRow);
            row.createCell(0).setCellValue("Funcionário:");
            row.createCell(1).setCellValue(request.getEmployeeName());

            row = sheet.createRow(startRow + 1);
            row.createCell(0).setCellValue("CPF:");
            row.createCell(1).setCellValue(request.getEmployeeCpf());

            row = sheet.createRow(startRow + 2);
            row.createCell(0).setCellValue("Opção:");
            row.createCell(1).setCellValue(Boolean.TRUE.equals(request.getOptingVoucher()) ? "OPTANTE" : "NÃO OPTANTE");

            // Se optante, listar rotas
            int currentRow = startRow + 4;
            if (Boolean.TRUE.equals(request.getOptingVoucher())) {
                Row headerRow = sheet.createRow(currentRow++);
                headerRow.createCell(0).setCellValue("Trajeto");
                headerRow.createCell(1).setCellValue("Linha");
                headerRow.createCell(2).setCellValue("Tarifa");

                Row ida = sheet.createRow(currentRow++);
                ida.createCell(0).setCellValue("Ida");
                ida.createCell(1).setCellValue(request.getIdaLinha());
                ida.createCell(2).setCellValue(request.getIdaTarifa());

                Row volta = sheet.createRow(currentRow++);
                volta.createCell(0).setCellValue("Volta");
                volta.createCell(1).setCellValue(request.getVoltaLinha());
                volta.createCell(2).setCellValue(request.getVoltaTarifa());
            }

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel do Vale-Transporte", e);
            throw new RuntimeException("Erro ao gerar Excel do Vale-Transporte", e);
        }
    }

    private void addContent(Document document, TransportVoucherRequest request, Company company) {
        // Texto Introdutório
        document.add(new Paragraph("O vale-transporte é um direito do trabalhador, faça sua opção se quer adquiri-lo ou não, assinalando com um X.")
                .setFontSize(11f)
                .setMarginTop(10f)
                .setMarginBottom(10f));

        // Opções SIM/NÃO
        String simX = Boolean.TRUE.equals(request.getOptingVoucher()) ? "X" : " ";
        String naoX = Boolean.FALSE.equals(request.getOptingVoucher()) ? "X" : " ";
        document.add(new Paragraph("( " + simX + " ) SIM  ( " + naoX + " ) NÃO;")
                .setFontSize(11f)
                .setBold()
                .setMarginBottom(15f));

        // Corpo da Declaração
        Paragraph body = new Paragraph()
                .setFontSize(11f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMultipliedLeading(1.5f);

        body.add("Eu, ");
        body.add(new Text(request.getEmployeeName().toUpperCase()).setBold().setUnderline());
        body.add(", empregado(a) da ");
        body.add(new Text(company.getName().toUpperCase()).setBold());
        body.add(" desejo adquirir vale-transporte, declaro que estou morando na ");
        
        String address = request.getEmployeeAddress() != null ? request.getEmployeeAddress() : "";
        body.add(new Text(address).setBold());
        
        body.add(", e uso __________ vales transportes para o meu deslocamento residência-trabalho e vice-versa.");
        document.add(body);

        // Seção de Linhas e Tarifas (Tabela estruturada)
        Table routeTable = new Table(UnitValue.createPercentArray(new float[]{20, 60, 20}))
                .useAllAvailableWidth()
                .setMarginTop(10f)
                .setMarginBottom(10f);

        routeTable.addHeaderCell(new Cell().add(new Paragraph("Trajeto").setBold().setFontSize(9f)));
        routeTable.addHeaderCell(new Cell().add(new Paragraph("Linha").setBold().setFontSize(9f)));
        routeTable.addHeaderCell(new Cell().add(new Paragraph("Tarifa (R$)").setBold().setFontSize(9f)));

        routeTable.addCell(new Cell().add(new Paragraph("Ida").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getIdaLinha() != null && !request.getIdaLinha().isEmpty() ? request.getIdaLinha() : " ").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getIdaTarifa() != null && !request.getIdaTarifa().isEmpty() ? request.getIdaTarifa() : " ").setFontSize(9f)));

        routeTable.addCell(new Cell().add(new Paragraph("Volta").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getVoltaLinha() != null && !request.getVoltaLinha().isEmpty() ? request.getVoltaLinha() : " ").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getVoltaTarifa() != null && !request.getVoltaTarifa().isEmpty() ? request.getVoltaTarifa() : " ").setFontSize(9f)));

        document.add(routeTable);

        // Termos de Compromisso
        document.add(new Paragraph("\nAssumo o compromisso de utilizar o vale-transporte exclusivamente para o meu efetivo deslocamento residência-trabalho e vice-versa; e afirmo ter conhecimento do artigo 7°, § 3° do Decreto n° 95.247/87, de que constitui falta grave o seu uso indevido ou que essa declaração seja falsa.")
                .setFontSize(10.5f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginTop(15f));

        document.add(new Paragraph("Comprometo-me a atualizar anualmente as informações, ou a qualquer tempo quando ocorrer mudança residencial ou meio(s) de transporte(s).")
                .setFontSize(10.5f)
                .setMarginTop(10f));

        document.add(new Paragraph("Autorizo a empresa a descontar mensalmente, até 6% de meu salário-base, o valor destinado a cobrir o fornecimento de vale-transporte por mim utilizado.")
                .setFontSize(10.5f)
                .setMarginTop(10f));

        document.add(new Paragraph("Por ser a expressão da verdade, firmo a presente declaração e termo de compromisso.")
                .setFontSize(10.5f)
                .setMarginTop(15f));

        // Assinaturas e Data
        addSignatures(document, request, company);
    }

    private void addSignatures(Document document, TransportVoucherRequest request, Company company) {
        String city = request.getCity();
        
        // Se a cidade informada parecer um endereço (contém Rua ou vírgula), buscar a cidade real da empresa
        if (city == null || city.isEmpty() || city.toLowerCase().contains("rua") || city.contains(",")) {
            city = com.z7design.secured_guard.util.CompanyDataFormatter.resolveContractSigningCity(company);
        }
        
        if (city == null || city.isEmpty()) city = "Contagem"; // Fallback para Contagem
        
        LocalDate docDate = request.getDocumentDate() != null ? request.getDocumentDate() : LocalDate.now();
        String dateStr = formatDateExtended(docDate);

        document.add(new Paragraph("\n" + city + ", " + dateStr)
                .setFontSize(11f)
                .setMarginTop(25f)
                .setMarginBottom(40f));

        document.add(new Paragraph("______________________________________________________")
                .setTextAlignment(TextAlignment.LEFT));
        document.add(new Paragraph(request.getEmployeeName().toUpperCase())
                .setBold()
                .setFontSize(10f)
                .setMarginTop(-5f));
    }

    private String formatDateExtended(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR")));
    }
}
