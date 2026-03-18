package com.z7design.secured_guard.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Overtime;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.OvertimeStatus;
import com.z7design.secured_guard.model.enums.OvertimeType;
import com.z7design.secured_guard.repository.OvertimeRepository;

@Service
public class OvertimeService {
    
    @Autowired
    private OvertimeRepository overtimeRepository;
    
    @Autowired
    private UserService userService;
    
    @Transactional
    public Overtime create(Overtime overtime) {
        validateOvertime(overtime);
        calculateTotalHours(overtime);
        overtime.setStatus(OvertimeStatus.PENDING);
        return overtimeRepository.save(overtime);
    }
    
    @Transactional
    public Overtime update(UUID id, Overtime overtime) {
        Overtime existingOvertime = findById(id);
        validateOvertime(overtime);
        calculateTotalHours(overtime);
        
        existingOvertime.setOvertimeDate(overtime.getOvertimeDate());
        existingOvertime.setStartTime(overtime.getStartTime());
        existingOvertime.setEndTime(overtime.getEndTime());
        existingOvertime.setTotalHours(overtime.getTotalHours());
        existingOvertime.setType(overtime.getType());
        existingOvertime.setReason(overtime.getReason());
        
        return overtimeRepository.save(existingOvertime);
    }
    
    @Transactional
    public Overtime approve(UUID id, UUID approvedBy) {
        Overtime overtime = findById(id);
        User approver = userService.findById(approvedBy)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + approvedBy));
        overtime.setStatus(OvertimeStatus.APPROVED);
        overtime.setApprovedBy(approver);
        overtime.setApprovalDate(LocalDateTime.now());
        return overtimeRepository.save(overtime);
    }
    
    @Transactional
    public Overtime reject(UUID id, String justification) {
        Overtime overtime = findById(id);
        overtime.setStatus(OvertimeStatus.REJECTED);
        overtime.setJustification(justification);
        return overtimeRepository.save(overtime);
    }
    
    @Transactional
    public Overtime compensate(UUID id) {
        Overtime overtime = findById(id);
        overtime.setStatus(OvertimeStatus.COMPENSATED);
        return overtimeRepository.save(overtime);
    }
    
    public Overtime findById(UUID id) {
        return overtimeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Overtime not found with id: " + id));
    }
    
    public List<Overtime> findByEmployeeId(UUID employeeId) {
        return overtimeRepository.findByEmployeeId(employeeId);
    }
    
    public List<Overtime> findByEmployeeIdAndStatus(UUID employeeId, OvertimeStatus status) {
        return overtimeRepository.findByEmployeeIdAndStatus(employeeId, status);
    }
    
    public List<Overtime> findByEmployeeIdAndType(UUID employeeId, OvertimeType type) {
        return overtimeRepository.findByEmployeeIdAndType(employeeId, type);
    }
    
    public List<Overtime> findByEmployeeIdAndOvertimeDateBetween(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return overtimeRepository.findByEmployeeIdAndOvertimeDateBetween(employeeId, startDate, endDate);
    }

    public List<Overtime> findAll() {
        return overtimeRepository.findAllWithEmployeeAndWorkPost();
    }

    public List<Overtime> findByStatus(OvertimeStatus status) {
        return overtimeRepository.findByStatusWithEmployeeAndWorkPost(status);
    }

    public List<Overtime> findApprovedByMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        return overtimeRepository.findApprovedByPeriodWithFetch(OvertimeStatus.APPROVED, start, end);
    }

    public byte[] exportExcel(int year, int month) throws IOException {
        List<Overtime> list = findApprovedByMonth(year, month);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Horas Extras Aprovadas");
            int rowNum = 0;
            Row headerRow = sheet.createRow(rowNum++);
            String[] headers = { "Funcionário", "Matrícula", "Data", "Início", "Fim", "Total (h)", "Tipo", "Motivo", "Posto", "Status" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                CellStyle style = workbook.createCellStyle();
                org.apache.poi.ss.usermodel.Font font = workbook.createFont();
                font.setBold(true);
                style.setFont(font);
                cell.setCellStyle(style);
            }
            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
            for (Overtime o : list) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(o.getEmployee() != null ? o.getEmployee().getName() : "");
                row.createCell(1).setCellValue(o.getEmployee() != null && o.getEmployee().getRegistrationNumber() != null ? o.getEmployee().getRegistrationNumber() : "");
                row.createCell(2).setCellValue(o.getOvertimeDate() != null ? o.getOvertimeDate().format(dateFmt) : "");
                row.createCell(3).setCellValue(o.getStartTime() != null ? o.getStartTime().format(timeFmt) : "");
                row.createCell(4).setCellValue(o.getEndTime() != null ? o.getEndTime().format(timeFmt) : "");
                row.createCell(5).setCellValue(o.getTotalHours() != null ? o.getTotalHours() : 0);
                row.createCell(6).setCellValue(o.getType() != null ? o.getType().name() : "");
                row.createCell(7).setCellValue(o.getReason() != null ? o.getReason() : "");
                row.createCell(8).setCellValue(o.getWorkPost() != null ? o.getWorkPost().getName() : "");
                row.createCell(9).setCellValue(o.getStatus() != null ? o.getStatus().name() : "");
            }
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportPdf(int year, int month) throws IOException {
        List<Overtime> list = findApprovedByMonth(year, month);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos); PdfDocument pdfDoc = new PdfDocument(writer)) {
            Document document = new Document(pdfDoc);
            document.add(new Paragraph("Relatório de Horas Extras Aprovadas - " + year + "/" + String.format("%02d", month)).setBold().setFontSize(14));
            document.add(new Paragraph(" "));
            if (list.isEmpty()) {
                document.add(new Paragraph("Nenhuma hora extra aprovada no período."));
            } else {
                Table table = new Table(new float[] { 3, 1.5f, 1.2f, 1f, 1f, 1f, 1.5f, 3, 2, 1.5f }).useAllAvailableWidth();
                String[] headers = { "Funcionário", "Matrícula", "Data", "Início", "Fim", "Total (h)", "Tipo", "Motivo", "Posto", "Status" };
                for (String h : headers) {
                    table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(h).setBold().setFontSize(8)).setTextAlignment(TextAlignment.CENTER).setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY));
                }
                DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
                for (Overtime o : list) {
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getEmployee() != null ? o.getEmployee().getName() : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getEmployee() != null && o.getEmployee().getRegistrationNumber() != null ? o.getEmployee().getRegistrationNumber() : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getOvertimeDate() != null ? o.getOvertimeDate().format(dateFmt) : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getStartTime() != null ? o.getStartTime().format(timeFmt) : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getEndTime() != null ? o.getEndTime().format(timeFmt) : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getTotalHours() != null ? String.format("%.2f", o.getTotalHours()) : "0").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getType() != null ? o.getType().name() : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getReason() != null ? o.getReason() : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getWorkPost() != null ? o.getWorkPost().getName() : "").setFontSize(7)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(o.getStatus() != null ? o.getStatus().name() : "").setFontSize(7)));
                }
                document.add(table);
            }
            document.close();
        }
        return baos.toByteArray();
    }
    
    private void validateOvertime(Overtime overtime) {
        if (overtime.getOvertimeDate() == null) {
            throw new IllegalArgumentException("Overtime date is required");
        }
        
        if (overtime.getStartTime() == null || overtime.getEndTime() == null) {
            throw new IllegalArgumentException("Start and end times are required");
        }
        
        if (overtime.getStartTime().isAfter(overtime.getEndTime())) {
            throw new IllegalArgumentException("Start time cannot be after end time");
        }
        
        if (overtime.getType() == null) {
            throw new IllegalArgumentException("Overtime type is required");
        }
        
        if (overtime.getReason() == null || overtime.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Overtime reason is required");
        }
    }
    
    private void calculateTotalHours(Overtime overtime) {
        long minutes = ChronoUnit.MINUTES.between(overtime.getStartTime(), overtime.getEndTime());
        overtime.setTotalHours(minutes / 60.0);
    }
} 