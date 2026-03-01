package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.TimeRecord;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.TimeRecordRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeRecordReportService {

        private final TimeRecordRepository timeRecordRepository;
        private final EmployeeRepository employeeRepository;
        private final StandardReportLayoutService standardReportLayoutService;

        @Transactional(readOnly = true)
        public byte[] generateMonthlyReport(UUID employeeId, int month, int year) throws IOException {
                log.info("Gerando espelho de ponto mensal - EmployeeId: {}, Mês: {}, Ano: {}", employeeId, month, year);

                Employee employee = employeeRepository.findById(employeeId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Funcionário não encontrado com ID: " + employeeId));

                YearMonth yearMonth = YearMonth.of(year, month);
                LocalDateTime startOfMonth = yearMonth.atDay(1).atStartOfDay();
                LocalDateTime endOfMonth = yearMonth.atEndOfMonth().atTime(23, 59, 59);

                List<TimeRecord> records = timeRecordRepository
                                .findByEmployeeIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                                                employeeId, startOfMonth, endOfMonth);

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                PdfWriter writer = new PdfWriter(baos);

                ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                                .companyId(employee.getCompany().getId())
                                .reportTitle("ESPELHO DE PONTO MENSAL")
                                .reportSubTitle("Funcionário: " + employee.getFullName() + " | Período: " +
                                                DateTimeFormatter.ofPattern("MM/yyyy").format(yearMonth))
                                .topMargin(120f)
                                .bottomMargin(80f)
                                .leftMargin(50f)
                                .rightMargin(50f)
                                .build();

                StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                                .createDocumentWithLayout(writer, layoutConfig);
                Document document = docWithPdf.getDocument();

                // Informações Cabeçalho Interno
                Paragraph employeeInfo = new Paragraph()
                                .add("Matrícula: "
                                                + (employee.getRegistrationNumber() != null
                                                                ? employee.getRegistrationNumber()
                                                                : "N/A")
                                                + "\n")
                                .add("CPF: " + (employee.getDocument() != null ? employee.getDocument() : "N/A") + "\n")
                                .add("Cargo: " + (employee.getPosition() != null ? employee.getPosition().getName()
                                                : "N/A"))
                                .setFontSize(10)
                                .setMarginBottom(15);
                document.add(employeeInfo);

                // Tabela de Registros
                if (records.isEmpty()) {
                        document.add(new Paragraph("Nenhum registro de ponto encontrado para este período.")
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setItalic()
                                        .setMarginTop(20));
                } else {
                        Table table = new Table(new float[] { 2, 2, 3, 2, 3 })
                                        .setWidth(UnitValue.createPercentValue(100))
                                        .setMarginBottom(20);

                        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Data/Hora"));
                        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Tipo"));
                        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Posto de Trabalho"));
                        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Status"));
                        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Localização/Obs"));

                        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

                        for (TimeRecord record : records) {
                                table.addCell(
                                                standardReportLayoutService.createDataCell(
                                                                record.getRecordedAt().format(dateTimeFormatter)));
                                table.addCell(standardReportLayoutService
                                                .createDataCell(record.getRecordType().name()));
                                table.addCell(standardReportLayoutService
                                                .createDataCell(record.getWorkPost() != null
                                                                ? record.getWorkPost().getName()
                                                                : (employee.getWorkPost() != null
                                                                                ? employee.getWorkPost().getName()
                                                                                : "-")));
                                table.addCell(standardReportLayoutService.createDataCell(record.getStatus().name()));

                                String locInfo = (record.getLocation() != null ? record.getLocation() : "");
                                if (record.getIsManual()) {
                                        locInfo += " (Manual: "
                                                        + (record.getJustification() != null ? record.getJustification()
                                                                        : "")
                                                        + ")";
                                }
                                table.addCell(standardReportLayoutService.createDataCell(locInfo));
                        }

                        document.add(table);
                }

                // Assinaturas
                Table signatureTable = new Table(2).setWidth(UnitValue.createPercentValue(100)).setMarginTop(50);

                signatureTable.addCell(new com.itextpdf.layout.element.Cell()
                                .add(new Paragraph("\n_________________________________\nAssinatura do Funcionário")
                                                .setTextAlignment(TextAlignment.CENTER).setFontSize(10))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));

                signatureTable.addCell(new com.itextpdf.layout.element.Cell()
                                .add(new Paragraph("\n_________________________________\nAssinatura do Supervisor")
                                                .setTextAlignment(TextAlignment.CENTER).setFontSize(10))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));

                document.add(signatureTable);

                document.close();
                return baos.toByteArray();
        }
}
