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
import com.z7design.secured_guard.dto.VisitControlReportDTO;
import com.z7design.secured_guard.dto.VisitControlRequest;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.VisitControlReport;
import com.z7design.secured_guard.model.enums.VisitControlStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.VisitControlReportRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VisitControlReportService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(VisitControlReportService.class);
    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;
    private final VisitControlReportRepository reportRepository;
    private final UserRepository userRepository;
    private final FileSystemService fileSystemService;

    private static final String REPORT_TITLE = "Controle de Visitas";

    public VisitControlReportService(StandardReportLayoutService pdfLayoutService,
            ExcelReportLayoutService excelLayoutService,
            CompanyRepository companyRepository,
            VisitControlReportRepository reportRepository,
            UserRepository userRepository,
            FileSystemService fileSystemService) {
        this.pdfLayoutService = pdfLayoutService;
        this.excelLayoutService = excelLayoutService;
        this.companyRepository = companyRepository;
        this.reportRepository = reportRepository;
        this.userRepository = userRepository;
        this.fileSystemService = fileSystemService;
    }

    public byte[] generatePdf(VisitControlRequest request) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(request.getCompanyId())
                    .reportTitle(REPORT_TITLE)
                    .includeEmailInFooter(true)
                    .leftMargin(20f)
                    .rightMargin(20f)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();
            Company company = docWithPdf.getCompany();

            addContent(document, request, company);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de Controle de Visitas", e);
            throw new RuntimeException("Erro ao gerar PDF de Controle de Visitas", e);
        }
    }

    @Transactional
    public VisitControlReportDTO saveReport(byte[] pdfBytes, UUID workPostId, VisitControlStatus status,
            LocalDate startDate, LocalDate endDate, int totalVisits, UUID createdById) {
        try {
            String fileName = "relatorio-visitas-"
                    + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + ".pdf";
            String filePath = fileSystemService.saveFile("reports/visits", fileName, pdfBytes);

            VisitControlReport report = new VisitControlReport();
            report.setFileName(fileName);
            report.setFilePath(filePath);
            report.setFileSize((long) pdfBytes.length);
            report.setWorkPostId(workPostId);
            report.setStatus(status != null ? status.name() : null);
            report.setStartDate(startDate);
            report.setEndDate(endDate);
            report.setTotalVisits(totalVisits);

            if (createdById != null) {
                userRepository.findById(createdById).ifPresent(report::setCreatedBy);
            }

            VisitControlReport saved = reportRepository.save(report);
            return convertToDTO(saved);
        } catch (Exception e) {
            log.error("Erro ao salvar relatório de visitas", e);
            throw new RuntimeException("Erro ao salvar relatório de visitas", e);
        }
    }

    public List<VisitControlReportDTO> getAllReports() {
        return reportRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Optional<VisitControlReportDTO> getReportById(UUID id) {
        return reportRepository.findById(id)
                .map(this::convertToDTO);
    }

    public Resource getReportFile(UUID id) {
        VisitControlReport report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Relatório não encontrado"));

        try {
            byte[] content = fileSystemService.getFile(report.getFilePath());
            return new ByteArrayResource(content);
        } catch (Exception e) {
            log.error("Erro ao buscar arquivo do relatório", e);
            throw new RuntimeException("Erro ao buscar arquivo do relatório", e);
        }
    }

    @Transactional
    public void deleteReport(UUID id) {
        VisitControlReport report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Relatório não encontrado"));

        fileSystemService.deleteFile(report.getFilePath());
        reportRepository.delete(report);
    }

    private VisitControlReportDTO convertToDTO(VisitControlReport entity) {
        VisitControlReportDTO dto = new VisitControlReportDTO();
        dto.setId(entity.getId());
        dto.setFileName(entity.getFileName());
        dto.setFilePath(entity.getFilePath());
        dto.setFileSize(entity.getFileSize());
        dto.setFilters(entity.getFilters());
        dto.setWorkPostId(entity.getWorkPostId());
        dto.setWorkPostName(entity.getWorkPostName());
        dto.setStatus(entity.getStatus());
        dto.setStartDate(entity.getStartDate());
        dto.setEndDate(entity.getEndDate());
        dto.setTotalVisits(entity.getTotalVisits());
        if (entity.getCreatedBy() != null) {
            dto.setCreatedBy(entity.getCreatedBy().getId());
            dto.setCreatedByName(entity.getCreatedBy().getUsername());
        }
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    public byte[] generateExcel(VisitControlRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Visitas");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            Row filterRow = sheet.createRow(startRow++);
            filterRow.createCell(0).setCellValue("Período:");
            filterRow.createCell(1).setCellValue(formatPeriod(request.getStartDate(), request.getEndDate()));

            if (request.getUnitName() != null) {
                Row unitRow = sheet.createRow(startRow++);
                unitRow.createCell(0).setCellValue("Unidade:");
                unitRow.createCell(1).setCellValue(request.getUnitName());
            }

            startRow++;

            Row headerRow = sheet.createRow(startRow++);
            String[] headers = { "Data/Hora Entrada", "Visitante", "Documento", "Empresa", "Visitado", "Motivo",
                    "Crachá", "Saída" };
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }

            if (request.getVisits() != null) {
                for (VisitControlRequest.VisitItem item : request.getVisits()) {
                    Row row = sheet.createRow(startRow++);
                    row.createCell(0).setCellValue(formatDateTime(item.getEntryTime()));
                    row.createCell(1).setCellValue(item.getVisitorName());
                    row.createCell(2).setCellValue(item.getDocument());
                    row.createCell(3).setCellValue(item.getCompany());
                    row.createCell(4).setCellValue(item.getPersonVisited());
                    row.createCell(5).setCellValue(item.getReason());
                    row.createCell(6).setCellValue(item.getBadgeNumber());
                    row.createCell(7).setCellValue(formatDateTime(item.getExitTime()));
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
            log.error("Erro ao gerar Excel de Controle de Visitas", e);
            throw new RuntimeException("Erro ao gerar Excel de Controle de Visitas", e);
        }
    }

    private void addContent(Document document, VisitControlRequest request, Company company) {
        Paragraph info = new Paragraph().setFontSize(10f).setMarginBottom(10f);
        info.add("Período: " + formatPeriod(request.getStartDate(), request.getEndDate()));
        if (request.getUnitName() != null) {
            info.add("\nUnidade: " + request.getUnitName());
        }
        document.add(info);

        if (request.getVisits() != null && !request.getVisits().isEmpty()) {
            float[] columnWidths = { 12, 18, 10, 15, 15, 12, 8, 10 };
            Table table = new Table(UnitValue.createPercentArray(columnWidths)).useAllAvailableWidth();

            String[] headers = { "Entrada", "Visitante", "Doc.", "Empresa", "Visitado", "Motivo", "Crachá", "Saída" };
            for (String h : headers) {
                table.addHeaderCell(new Cell().add(new Paragraph(h).setBold().setFontSize(8f))
                        .setBackgroundColor(DeviceGray.WHITE));
            }

            for (VisitControlRequest.VisitItem item : request.getVisits()) {
                table.addCell(createCell(formatDateTime(item.getEntryTime())));
                table.addCell(createCell(item.getVisitorName()));
                table.addCell(createCell(item.getDocument()));
                table.addCell(createCell(item.getCompany()));
                table.addCell(createCell(item.getPersonVisited()));
                table.addCell(createCell(item.getReason()));
                table.addCell(createCell(item.getBadgeNumber()));
                table.addCell(createCell(formatDateTime(item.getExitTime())));
            }

            document.add(table);
        } else {
            document.add(new Paragraph("Nenhum registro encontrado no período.").setItalic()
                    .setTextAlignment(TextAlignment.CENTER));
        }
    }

    private Cell createCell(String text) {
        return new Cell().add(new Paragraph(text != null ? text : "-").setFontSize(8f));
    }

    private String formatDateTime(LocalDateTime dt) {
        if (dt == null)
            return "-";
        return dt.format(DateTimeFormatter.ofPattern("dd/MM HH:mm"));
    }

    private String formatPeriod(LocalDateTime start, LocalDateTime end) {
        String s = start != null ? start.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "Início";
        String e = end != null ? end.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "Fim";
        return s + " até " + e;
    }
}
