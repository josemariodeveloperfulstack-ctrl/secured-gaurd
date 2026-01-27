package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceGray;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.TransportGuideRequest;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransportGuideReportService {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    private static final String REPORT_TITLE = "Guia de Transporte";

    public byte[] generatePdf(TransportGuideRequest request) {
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
            log.error("Erro ao gerar PDF da Guia de Transporte", e);
            throw new RuntimeException("Erro ao gerar PDF da Guia de Transporte", e);
        }
    }

    public byte[] generateExcel(TransportGuideRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Transporte");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            // Cabeçalho da Guia
            Row row = sheet.createRow(startRow++);
            row.createCell(0).setCellValue("Data:");
            row.createCell(1).setCellValue(formatDate(request.getDate()));

            row = sheet.createRow(startRow++);
            row.createCell(0).setCellValue("Motorista:");
            row.createCell(1).setCellValue(request.getDriverName());

            row = sheet.createRow(startRow++);
            row.createCell(0).setCellValue("Veículo/Placa:");
            row.createCell(1).setCellValue(request.getVehiclePlate());

            startRow++; // Espaço

            // Tabela
            Row headerRow = sheet.createRow(startRow++);
            String[] headers = { "Passageiro", "Destino", "Saída", "Retorno", "Observação" };
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            if (request.getItems() != null) {
                for (TransportGuideRequest.TransportItem item : request.getItems()) {
                    Row r = sheet.createRow(startRow++);
                    r.createCell(0).setCellValue(item.getPassengerName());
                    r.createCell(1).setCellValue(item.getDestination());
                    r.createCell(2).setCellValue(formatTime(item.getDepartureTime()));
                    r.createCell(3).setCellValue(formatTime(item.getReturnTime()));
                    r.createCell(4).setCellValue(item.getObservation());
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel da Guia de Transporte", e);
            throw new RuntimeException("Erro ao gerar Excel da Guia de Transporte", e);
        }
    }

    private void addContent(Document document, TransportGuideRequest request, Company company) {
        // Dados da Guia
        Paragraph header = new Paragraph()
                .setFontSize(10f)
                .setMarginBottom(15f);

        header.add(new Text("Data: ").setBold());
        header.add(formatDate(request.getDate()) + "   ");

        header.add(new Text("Motorista: ").setBold());
        header.add((request.getDriverName() != null ? request.getDriverName() : "-") + "\n");

        header.add(new Text("Veículo: ").setBold());
        header.add((request.getVehiclePlate() != null ? request.getVehiclePlate() : "-") + "   ");

        header.add(new Text("Rota Principal: ").setBold());
        header.add((request.getRoute() != null ? request.getRoute() : "-"));

        document.add(header);

        // Tabela
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            float[] columnWidths = { 25, 25, 10, 10, 30 };
            Table table = new Table(UnitValue.createPercentArray(columnWidths)).useAllAvailableWidth();

            String[] headers = { "Passageiro", "Destino", "Saída", "Retorno", "Observação" };
            for (String h : headers) {
                table.addHeaderCell(new Cell().add(new Paragraph(h).setBold().setFontSize(9f))
                        .setBackgroundColor(DeviceGray.WHITE));
            }

            for (TransportGuideRequest.TransportItem item : request.getItems()) {
                table.addCell(createCell(item.getPassengerName()));
                table.addCell(createCell(item.getDestination()));
                table.addCell(createCell(formatTime(item.getDepartureTime())));
                table.addCell(createCell(formatTime(item.getReturnTime())));
                table.addCell(createCell(item.getObservation()));
            }

            document.add(table);
        } else {
            document.add(new Paragraph("Nenhum passageiro/item listado.").setItalic()
                    .setTextAlignment(TextAlignment.CENTER));
        }

        // Assinatura
        document.add(new Paragraph("__________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER).setMarginTop(40f));
        document.add(new Paragraph("Assinatura do Motorista").setTextAlignment(TextAlignment.CENTER).setFontSize(8f));
    }

    private Cell createCell(String text) {
        return new Cell().add(new Paragraph(text != null ? text : "-").setFontSize(9f));
    }

    private String formatDate(LocalDate date) {
        if (date == null)
            return "__/__/____";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private String formatTime(LocalTime time) {
        if (time == null)
            return "-";
        return time.format(DateTimeFormatter.ofPattern("HH:mm"));
    }
}
