package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EPIDeliveryReportService {

    private final EPIDeliveryFormRepository epiDeliveryFormRepository;
    private final com.z7design.secured_guard.repository.CompanyRepository companyRepository;
    private final StandardReportLayoutService standardReportLayoutService;

    @Transactional(readOnly = true)
    public byte[] generateAnalyticalReport(UUID employeeId, UUID companyId, UUID sectorId, LocalDate startDate, LocalDate endDate, String reportType) throws Exception {
        log.info("📊 Gerando relatório analítico de EPIs");

        Specification<EPIDeliveryForm> spec = getSpec(employeeId, companyId, sectorId, startDate, endDate);

        List<EPIDeliveryForm> forms = epiDeliveryFormRepository.findAll(spec);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Relatório EPI");
            
            // Estilos
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle dateStyle = workbook.createCellStyle();
            CreationHelper createHelper = workbook.getCreationHelper();
            dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));

            // Cabeçalho
            String[] headers = {"Data", "Funcionário", "CPF", "Empresa", "EPI", "CA", "Qtd", "Tipo", "Setor", "Status"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 1;
            for (EPIDeliveryForm form : forms) {
                for (EPIDeliveryFormItem item : form.getItems()) {
                    Row row = sheet.createRow(rowIndex++);
                    
                    Cell dateCell = row.createCell(0);
                    dateCell.setCellValue(java.sql.Date.valueOf(form.getDeliveryDate()));
                    dateCell.setCellStyle(dateStyle);
                    
                    row.createCell(1).setCellValue(form.getEmployee() != null ? form.getEmployee().getName() : "");
                    row.createCell(2).setCellValue(form.getEmployee() != null ? (form.getEmployee().getCpf() != null ? form.getEmployee().getCpf() : form.getEmployee().getDocument()) : "");
                    row.createCell(3).setCellValue(form.getCompany() != null ? form.getCompany().getName() : "");
                    row.createCell(4).setCellValue(item.getEpiName());
                    row.createCell(5).setCellValue(item.getCa());
                    row.createCell(6).setCellValue(item.getQuantity());
                    row.createCell(7).setCellValue(form.getDeliveryType() != null ? form.getDeliveryType().getDescription() : "");
                    row.createCell(8).setCellValue(form.getEmployeeWorkSector() != null ? form.getEmployeeWorkSector() : (form.getEmployee() != null && form.getEmployee().getUnit() != null ? form.getEmployee().getUnit().getName() : ""));
                    row.createCell(9).setCellValue(form.getStatus() != null ? form.getStatus().name() : "");
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateAnalyticalReportPdf(UUID employeeId, UUID companyId, UUID sectorId, LocalDate startDate, LocalDate endDate, String reportType) throws Exception {
        log.info("📊 Gerando relatório analítico de EPIs em PDF");

        Specification<EPIDeliveryForm> spec = getSpec(employeeId, companyId, sectorId, startDate, endDate);
        List<EPIDeliveryForm> forms = epiDeliveryFormRepository.findAll(spec);

        // Resolução segura do companyId para o layout do relatório
        if (companyId == null) {
            // Tenta pegar da primeira ficha que tenha empresa válida
            companyId = forms.stream()
                    .filter(f -> f.getCompany() != null)
                    .map(f -> f.getCompany().getId())
                    .findFirst()
                    .orElse(null);
        }

        if (companyId == null) {
            // Se ainda nulo (ex: sem resultados), tenta pegar qualquer empresa do sistema para o layout
            companyId = companyRepository.findAll().stream()
                    .map(com.z7design.secured_guard.model.Company::getId)
                    .findFirst()
                    .orElse(null);
        }

        if (companyId == null) {
            log.warn("⚠️ Nenhuma empresa encontrada no sistema para gerar o layout do relatório.");
            // Se realmente não houver nenhuma empresa, o PDF não pode ser gerado com o layout padrão
            throw new IllegalArgumentException("Não foi possível identificar uma empresa para o layout do relatório. Verifique se existem empresas cadastradas.");
        }

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            com.itextpdf.kernel.pdf.PdfWriter writer = new com.itextpdf.kernel.pdf.PdfWriter(out);
            String titleStr = "RELATÓRIO ";
            if ("summary".equalsIgnoreCase(reportType)) titleStr += "RESUMIDO ";
            else if ("by_sector".equalsIgnoreCase(reportType)) titleStr += "POR SETOR ";
            else if ("by_employee".equalsIgnoreCase(reportType)) titleStr += "POR FUNCIONÁRIO ";
            else titleStr += "ANALÍTICO ";
            titleStr += "DE ENTREGA DE EPI";

            com.z7design.secured_guard.dto.ReportLayoutConfig config = com.z7design.secured_guard.dto.ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(titleStr)
                    .reportSubTitle("Período: " + (startDate != null ? startDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Início") + 
                                   " até " + (endDate != null ? endDate.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Hoje"))
                    .landscape(true)
                    .build();

            com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, config);
            com.itextpdf.layout.Document document = docWithPdf.getDocument();

            // Tabela com larguras ajustadas
            float[] finalColumnWidths = {60f, 150f, 150f, 60f, 40f, 80f, 80f, 60f};
            com.itextpdf.layout.element.Table table = new com.itextpdf.layout.element.Table(finalColumnWidths);
            table.setWidth(com.itextpdf.layout.properties.UnitValue.createPercentValue(100));

            // Cabeçalho da Tabela
            String[] headers = {"Data", "Funcionário", "EPI", "CA", "Qtd", "Tipo", "Setor", "Status"};

            for (String header : headers) {
                table.addHeaderCell(new com.itextpdf.layout.element.Cell()
                        .add(new com.itextpdf.layout.element.Paragraph(header).setBold())
                        .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY));
            }

            for (EPIDeliveryForm form : forms) {
                for (EPIDeliveryFormItem item : form.getItems()) {
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(form.getDeliveryDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")))));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(form.getEmployee() != null ? form.getEmployee().getName() : "")));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(item.getEpiName())));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(item.getCa() != null ? item.getCa() : "")));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(String.valueOf(item.getQuantity()))));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(form.getDeliveryType() != null ? form.getDeliveryType().getDescription() : "")));
                    String sector = form.getEmployeeWorkSector() != null ? form.getEmployeeWorkSector() : (form.getEmployee() != null && form.getEmployee().getDepartment() != null ? form.getEmployee().getDepartment().getName() : "");
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(sector)));
                    table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph(form.getStatus() != null ? form.getStatus().name() : "")));
                }
            }

            document.add(table);
            document.close();

            return out.toByteArray();
        }
    }

    private Specification<EPIDeliveryForm> getSpec(UUID employeeId, UUID companyId, UUID sectorId, LocalDate startDate, LocalDate endDate) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (employeeId != null) predicates.add(cb.equal(root.get("employee").get("id"), employeeId));
            if (companyId != null) predicates.add(cb.equal(root.get("company").get("id"), companyId));
            if (sectorId != null) {
                // Filtra pelo Setor de Trabalho (Departamento) do funcionário
                predicates.add(cb.equal(root.get("employee").get("department").get("id"), sectorId));
            }
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("deliveryDate"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("deliveryDate"), endDate));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
