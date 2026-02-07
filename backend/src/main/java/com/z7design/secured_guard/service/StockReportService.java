package com.z7design.secured_guard.service;

import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.StockItemDTO;
import com.z7design.secured_guard.dto.StockMovementDTO;
import com.z7design.secured_guard.model.enums.StockCategory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockReportService {

    private final StockService stockService;
    private final StandardReportLayoutService layoutService;

    public byte[] generateLowStockPDFReport(UUID companyId) throws IOException {
        log.info("Gerando relatório de estoque baixo para empresa: {}", companyId);

        List<StockItemDTO> lowStockItems = stockService.getLowStockItems();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("RELATÓRIO DE ESTOQUE BAIXO")
                .build();

        StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
        Document document = docWithPdf.getDocument();

        addLowStockTable(document, lowStockItems);

        document.close();
        return baos.toByteArray();
    }

    public byte[] generateGeneralStockPDFReport(UUID companyId, StockCategory category) throws IOException {
        log.info("Gerando relatório geral de estoque para empresa: {}", companyId);

        List<StockItemDTO> items = category != null
                ? stockService.getItemsByCategory(category)
                : stockService.getAllItems();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("RELATÓRIO GERAL DE ESTOQUE" + (category != null ? " - " + category.toString() : ""))
                .build();

        StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
        Document document = docWithPdf.getDocument();

        addStockTable(document, items);

        document.close();
        return baos.toByteArray();
    }

    public byte[] generateMovementsPDFReport(UUID companyId, LocalDateTime start, LocalDateTime end)
            throws IOException {
        log.info("Gerando relatório de movimentações de estoque para empresa: {}", companyId);

        List<StockMovementDTO> movements = stockService.getMovementsByDateRange(start, end);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String period = "Período: " + start.format(dtf) + " até " + (end != null ? end.format(dtf) : "Hoje");

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("RELATÓRIO DE MOVIMENTAÇÕES DE ESTOQUE")
                .reportSubTitle(period)
                .build();

        StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
        Document document = docWithPdf.getDocument();

        addMovementsTable(document, movements);

        document.close();
        return baos.toByteArray();
    }

    private void addLowStockTable(Document document, List<StockItemDTO> items) {
        Table table = new Table(UnitValue.createPercentArray(new float[] { 15, 35, 15, 15, 20 }))
                .useAllAvailableWidth()
                .setMarginTop(20);

        table.addHeaderCell(layoutService.createHeaderCell("Código"));
        table.addHeaderCell(layoutService.createHeaderCell("Item"));
        table.addHeaderCell(layoutService.createHeaderCell("Mínimo"));
        table.addHeaderCell(layoutService.createHeaderCell("Atual"));
        table.addHeaderCell(layoutService.createHeaderCell("Status"));

        for (StockItemDTO item : items) {
            table.addCell(layoutService.createDataCell(item.getCode()));
            table.addCell(layoutService.createDataCell(item.getName()));
            table.addCell(layoutService.createDataCell(String.valueOf(item.getMinimumQuantity())));
            table.addCell(layoutService.createDataCell(String.valueOf(item.getCurrentQuantity())));
            table.addCell(layoutService.createDataCell("Crítico")
                    .setFontColor(com.itextpdf.kernel.colors.ColorConstants.RED));
        }

        document.add(table);
    }

    private void addStockTable(Document document, List<StockItemDTO> items) {
        Table table = new Table(UnitValue.createPercentArray(new float[] { 15, 30, 20, 15, 20 }))
                .useAllAvailableWidth()
                .setMarginTop(20);

        table.addHeaderCell(layoutService.createHeaderCell("Código"));
        table.addHeaderCell(layoutService.createHeaderCell("Item"));
        table.addHeaderCell(layoutService.createHeaderCell("Categoria"));
        table.addHeaderCell(layoutService.createHeaderCell("Qtd"));
        table.addHeaderCell(layoutService.createHeaderCell("Fornecedor"));

        for (StockItemDTO item : items) {
            table.addCell(layoutService.createDataCell(item.getCode()));
            table.addCell(layoutService.createDataCell(item.getName()));
            table.addCell(
                    layoutService.createDataCell(item.getCategory() != null ? item.getCategory().toString() : "N/A"));
            table.addCell(layoutService.createDataCell(String.valueOf(item.getCurrentQuantity())));
            table.addCell(layoutService.createDataCell(item.getSupplier()));
        }

        document.add(table);
    }

    private void addMovementsTable(Document document, List<StockMovementDTO> movements) {
        Table table = new Table(UnitValue.createPercentArray(new float[] { 15, 12, 12, 31, 15, 15 }))
                .useAllAvailableWidth()
                .setMarginTop(20);

        table.addHeaderCell(layoutService.createHeaderCell("Data"));
        table.addHeaderCell(layoutService.createHeaderCell("Tipo"));
        table.addHeaderCell(layoutService.createHeaderCell("Qtd"));
        table.addHeaderCell(layoutService.createHeaderCell("Item"));
        table.addHeaderCell(layoutService.createHeaderCell("Responsável"));
        table.addHeaderCell(layoutService.createHeaderCell("Destino"));

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        for (StockMovementDTO movement : movements) {
            table.addCell(layoutService.createDataCell(
                    movement.getMovementDate() != null ? movement.getMovementDate().format(dtf) : "N/A"));
            table.addCell(layoutService.createDataCell(
                    movement.getMovementType() != null ? movement.getMovementType().toString() : "N/A"));
            table.addCell(layoutService.createDataCell(String.valueOf(movement.getQuantity())));
            table.addCell(layoutService.createDataCell(movement.getStockItemName()));
            table.addCell(layoutService.createDataCell(movement.getUserName()));
            table.addCell(layoutService.createDataCell(movement.getDestinationName()));
        }

        document.add(table);
    }
}
