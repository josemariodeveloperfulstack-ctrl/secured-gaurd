package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceGray;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.VehicleMaintenanceRequest;
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
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleMaintenanceReportService {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    private static final String REPORT_TITLE = "Controle de Manutenção de Veículos";

    public byte[] generatePdf(VehicleMaintenanceRequest request) {
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
            log.error("Erro ao gerar PDF de Manutenção", e);
            throw new RuntimeException("Erro ao gerar PDF de Manutenção", e);
        }
    }

    public byte[] generateExcel(VehicleMaintenanceRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Manutenção");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            // Filtros
            Row filterRow = sheet.createRow(startRow++);
            filterRow.createCell(0).setCellValue("Período:");
            filterRow.createCell(1).setCellValue(formatPeriod(request.getStartDate(), request.getEndDate()));
            startRow++;

            // Cabeçalho
            Row headerRow = sheet.createRow(startRow++);
            String[] headers = { "Data", "Veículo", "Placa", "Serviço", "Descrição", "Oficina", "KM", "Custo (R$)" };
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            // Dados
            BigDecimal totalCost = BigDecimal.ZERO;
            if (request.getMaintenances() != null) {
                for (VehicleMaintenanceRequest.MaintenanceItem item : request.getMaintenances()) {
                    Row row = sheet.createRow(startRow++);
                    row.createCell(0).setCellValue(formatDate(item.getDate()));
                    row.createCell(1).setCellValue(item.getVehicleModel());
                    row.createCell(2).setCellValue(item.getLicensePlate());
                    row.createCell(3).setCellValue(item.getServiceType());
                    row.createCell(4).setCellValue(item.getDescription());
                    row.createCell(5).setCellValue(item.getMechanicOrShop());
                    row.createCell(6).setCellValue(item.getCurrentMileage() != null ? item.getCurrentMileage() : 0);

                    double cost = item.getCost() != null ? item.getCost().doubleValue() : 0.0;
                    row.createCell(7).setCellValue(cost);

                    if (item.getCost() != null)
                        totalCost = totalCost.add(item.getCost());
                }
            }

            // Total
            Row totalRow = sheet.createRow(startRow++);
            totalRow.createCell(6).setCellValue("TOTAL:");
            totalRow.createCell(7).setCellValue(totalCost.doubleValue());

            // Auto-size
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel de Manutenção", e);
            throw new RuntimeException("Erro ao gerar Excel de Manutenção", e);
        }
    }

    private void addContent(Document document, VehicleMaintenanceRequest request, Company company) {
        Paragraph info = new Paragraph().setFontSize(10f).setMarginBottom(10f);
        info.add("Período: " + formatPeriod(request.getStartDate(), request.getEndDate()));
        document.add(info);

        if (request.getMaintenances() != null && !request.getMaintenances().isEmpty()) {
            float[] columnWidths = { 10, 15, 10, 15, 20, 15, 8, 12 }; // Percentuais
            Table table = new Table(UnitValue.createPercentArray(columnWidths)).useAllAvailableWidth();

            String[] headers = { "Data", "Veículo", "Placa", "Serviço", "Descrição", "Oficina", "KM", "Custo" };
            for (String h : headers) {
                table.addHeaderCell(new Cell().add(new Paragraph(h).setBold().setFontSize(8f))
                        .setBackgroundColor(DeviceGray.WHITE));
            }

            BigDecimal totalCost = BigDecimal.ZERO;

            for (VehicleMaintenanceRequest.MaintenanceItem item : request.getMaintenances()) {
                table.addCell(createCell(formatDate(item.getDate())));
                table.addCell(createCell(item.getVehicleModel()));
                table.addCell(createCell(item.getLicensePlate()));
                table.addCell(createCell(item.getServiceType()));
                table.addCell(createCell(item.getDescription()));
                table.addCell(createCell(item.getMechanicOrShop()));
                table.addCell(
                        createCell(item.getCurrentMileage() != null ? String.valueOf(item.getCurrentMileage()) : "-"));

                String costStr = item.getCost() != null
                        ? NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(item.getCost())
                        : "R$ 0,00";
                table.addCell(createCell(costStr));

                if (item.getCost() != null)
                    totalCost = totalCost.add(item.getCost());
            }

            document.add(table);

            // Totalizador
            Paragraph total = new Paragraph()
                    .add("Custo Total no Período: ")
                    .add(NumberFormat.getCurrencyInstance(new Locale("pt", "BR")).format(totalCost))
                    .setBold()
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setMarginTop(10f);
            document.add(total);

        } else {
            document.add(new Paragraph("Nenhuma manutenção registrada no período.").setItalic()
                    .setTextAlignment(TextAlignment.CENTER));
        }
    }

    private Cell createCell(String text) {
        return new Cell().add(new Paragraph(text != null ? text : "-").setFontSize(8f));
    }

    private String formatDate(LocalDate dt) {
        if (dt == null)
            return "-";
        return dt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private String formatPeriod(LocalDate start, LocalDate end) {
        String s = start != null ? start.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Início";
        String e = end != null ? end.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Fim";
        return s + " até " + e;
    }
}
