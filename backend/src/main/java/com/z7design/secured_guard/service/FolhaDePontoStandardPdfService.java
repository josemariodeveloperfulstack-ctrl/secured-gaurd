package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.borders.SolidBorder;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.TimeRecord;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Gera PDF da Folha de Ponto para impressão e preenchimento manual,
 * usando o mesmo layout padronizado dos demais relatórios (cabeçalho/rodapé da empresa).
 * Suporta qualquer mês/ano.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FolhaDePontoStandardPdfService {

    private static final String REPORT_TITLE = "Folha de Ponto";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String[] WEEKDAY_ABBR = { "dom", "seg", "ter", "qua", "qui", "sex", "sáb" };

    private final StandardReportLayoutService pdfLayoutService;
    private final CompanyRepository companyRepository;
    private final TimeRecordService timeRecordService;

    /**
     * Gera PDF da folha de ponto em branco para preenchimento manual.
     *
     * @param companyId ID da empresa (opcional; se null, usa a primeira empresa ativa).
     * @param year      Ano (ex: 2026).
     * @param month     Mês 1-12 (ex: 2 para fevereiro).
     * @return bytes do PDF.
     */
    public byte[] generateBlankPdf(UUID companyId, int year, int month) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            Company company = resolveCompany(companyId);
            YearMonth ym = YearMonth.of(year, month);
            LocalDate start = ym.atDay(1);
            LocalDate end = ym.atEndOfMonth();
            String periodSubtitle = "Período de " + start.format(DATE_FORMAT) + " a " + end.format(DATE_FORMAT);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(company.getId())
                    .reportTitle(REPORT_TITLE)
                    .reportSubTitle(periodSubtitle)
                    .includeEmailInFooter(true)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContent(document, year, month);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da Folha de Ponto: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF da Folha de Ponto: " + e.getMessage(), e);
        }
    }

    /**
     * Gera PDF da folha de ponto do mês preenchido com os registros do funcionário.
     *
     * @param employeeId ID do funcionário ou do usuário (resolve pelo CPF se necessário).
     * @param companyId  ID da empresa (opcional).
     * @param year       Ano (ex: 2026).
     * @param month      Mês 1-12 (ex: 2 para fevereiro).
     * @return bytes do PDF.
     */
    public byte[] generateFilledPdf(UUID employeeId, UUID companyId, int year, int month) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            Employee employee = timeRecordService.resolveEmployeeForReport(employeeId);
            YearMonth ym = YearMonth.of(year, month);
            LocalDate start = ym.atDay(1);
            LocalDate end = ym.atEndOfMonth();

            List<TimeRecord> records = timeRecordService.getRecordsByPeriod(employeeId, start, end);
            Map<LocalDate, Map<TimeRecord.RecordType, String>> timeByDay = records.stream()
                    .sorted(Comparator.comparing(TimeRecord::getRecordedAt))
                    .collect(Collectors.groupingBy(tr -> tr.getRecordedAt().toLocalDate()))
                    .entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> {
                                Map<TimeRecord.RecordType, String> byType = new EnumMap<>(TimeRecord.RecordType.class);
                                for (TimeRecord tr : e.getValue()) {
                                    byType.putIfAbsent(tr.getRecordType(), formatTime(tr.getRecordedAt()));
                                }
                                return byType;
                            }));

            Company company = resolveCompany(companyId);
            String periodSubtitle = "Período de " + start.format(DATE_FORMAT) + " a " + end.format(DATE_FORMAT);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(company.getId())
                    .reportTitle(REPORT_TITLE)
                    .reportSubTitle(periodSubtitle)
                    .includeEmailInFooter(true)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContentWithData(document, year, month, employee, timeByDay);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da Folha de Ponto preenchida: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF da Folha de Ponto: " + e.getMessage(), e);
        }
    }

    private static String formatTime(LocalDateTime dateTime) {
        return dateTime.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    private Company resolveCompany(UUID companyId) {
        if (companyId != null) {
            return companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada: " + companyId));
        }
        List<Company> active = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (!active.isEmpty()) {
            return active.get(0);
        }
        List<Company> all = companyRepository.findAll();
        if (!all.isEmpty()) {
            return all.get(0);
        }
        throw new ResourceNotFoundException("Nenhuma empresa cadastrada para gerar o relatório.");
    }

    private void addContent(Document document, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        // Sem repetir empresa nem período (já vêm no cabeçalho/rodapé padronizado)

        // NOME, FUNÇÃO, SETOR numa única linha para caber em uma página
        Table infoTable = new Table(UnitValue.createPercentArray(new float[] { 33f, 34f, 33f })).useAllAvailableWidth();
        infoTable.addCell(createCompactLabelCell("NOME:"));
        infoTable.addCell(createCompactLabelCell("FUNÇÃO:"));
        infoTable.addCell(createCompactLabelCell("SETOR:"));
        document.add(infoTable);
        document.add(new Paragraph().setMarginBottom(4f));

        // Tabela principal: INTERVALO com entrada e saída (duas colunas)
        float[] colWidths = { 10f, 12f, 12f, 12f, 12f, 18f, 14f };
        Table table = new Table(UnitValue.createPercentArray(colWidths)).useAllAvailableWidth();

        DeviceRgb headerBg = new DeviceRgb(240, 240, 240);
        String[] headers = { "DIA", "ENTRADA", "INTERVALO (entrada)", "INTERVALO (saída)", "SAÍDA", "HORAS EXTRAS", "ASSINATURA" };
        for (String h : headers) {
            table.addCell(new Cell().add(new Paragraph(h).setFontSize(8f).setBold())
                    .setBackgroundColor(headerBg)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(3f)
                    .setBorder(new SolidBorder(ColorConstants.GRAY, 0.5f)));
        }

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            int day = date.getDayOfMonth();
            DayOfWeek dow = date.getDayOfWeek();
            String dayLabel = String.format("%02d %s", day, WEEKDAY_ABBR[dow.getValue() % 7]);

            table.addCell(createCompactCell(dayLabel, TextAlignment.CENTER));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
        }

        document.add(table);
        document.add(new Paragraph().setMarginTop(6f));

        document.add(new Paragraph("RESPONSÁVEL: _________________________________________")
                .setFontSize(9f).setMarginTop(4f));
    }

    private void addContentWithData(Document document, int year, int month, Employee employee,
                                    Map<LocalDate, Map<TimeRecord.RecordType, String>> timeByDay) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        String nome = employee.getName() != null ? employee.getName() : "";
        String funcao = employee.getPosition() != null ? employee.getPosition().getName() : "";
        String setor = employee.getDepartment() != null ? employee.getDepartment().getName() : "";

        Table infoTable = new Table(UnitValue.createPercentArray(new float[] { 33f, 34f, 33f })).useAllAvailableWidth();
        infoTable.addCell(createCompactLabelCellWithValue("NOME:", nome));
        infoTable.addCell(createCompactLabelCellWithValue("FUNÇÃO:", funcao));
        infoTable.addCell(createCompactLabelCellWithValue("SETOR:", setor));
        document.add(infoTable);
        document.add(new Paragraph().setMarginBottom(4f));

        float[] colWidths = { 10f, 12f, 12f, 12f, 12f, 18f, 14f };
        Table table = new Table(UnitValue.createPercentArray(colWidths)).useAllAvailableWidth();

        DeviceRgb headerBg = new DeviceRgb(240, 240, 240);
        String[] headers = { "DIA", "ENTRADA", "INTERVALO (entrada)", "INTERVALO (saída)", "SAÍDA", "HORAS EXTRAS", "ASSINATURA" };
        for (String h : headers) {
            table.addCell(new Cell().add(new Paragraph(h).setFontSize(8f).setBold())
                    .setBackgroundColor(headerBg)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(3f)
                    .setBorder(new SolidBorder(ColorConstants.GRAY, 0.5f)));
        }

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            int day = date.getDayOfMonth();
            DayOfWeek dow = date.getDayOfWeek();
            String dayLabel = String.format("%02d %s", day, WEEKDAY_ABBR[dow.getValue() % 7]);

            Map<TimeRecord.RecordType, String> dayTimes = timeByDay.getOrDefault(date, Map.of());

            table.addCell(createCompactCell(dayLabel, TextAlignment.CENTER));
            table.addCell(createCompactCell(dayTimes.getOrDefault(TimeRecord.RecordType.ENTRADA, ""), TextAlignment.CENTER));
            table.addCell(createCompactCell(dayTimes.getOrDefault(TimeRecord.RecordType.SAIDA_ALMOCO, ""), TextAlignment.CENTER));
            table.addCell(createCompactCell(dayTimes.getOrDefault(TimeRecord.RecordType.RETORNO_ALMOCO, ""), TextAlignment.CENTER));
            table.addCell(createCompactCell(dayTimes.getOrDefault(TimeRecord.RecordType.SAIDA, ""), TextAlignment.CENTER));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
            table.addCell(createCompactCell("", TextAlignment.LEFT));
        }

        document.add(table);
        document.add(new Paragraph().setMarginTop(6f));
        document.add(new Paragraph("RESPONSÁVEL: _________________________________________")
                .setFontSize(9f).setMarginTop(4f));
    }

    private Cell createCompactLabelCellWithValue(String label, String value) {
        String content = (value != null && !value.isEmpty()) ? (label + " " + value) : (label + " _________________________");
        Cell cell = new Cell()
                .add(new Paragraph(content).setFontSize(8f).setBold())
                .setPadding(2f);
        cell.setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
        return cell;
    }

    /** Célula compacta para NOME/FUNÇÃO/SETOR (uma linha, pouco padding). */
    private Cell createCompactLabelCell(String label) {
        Cell cell = new Cell()
                .add(new Paragraph(label + " _________________________").setFontSize(8f).setBold())
                .setPadding(2f);
        cell.setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
        return cell;
    }

    /** Célula compacta da tabela (altura reduzida para caber em uma página). */
    private Cell createCompactCell(String text, TextAlignment alignment) {
        String content = " ";
        if (text != null && !text.isEmpty()) {
            content = text;
        }
        Paragraph p = new Paragraph(content).setFontSize(8f);
        return new Cell().add(p)
                .setPadding(2f)
                .setTextAlignment(alignment)
                .setBorder(new SolidBorder(ColorConstants.GRAY, 0.5f));
    }
}
