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
import com.z7design.secured_guard.dto.StockRequisitionListItemDTO;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.StockCategory;
import com.z7design.secured_guard.repository.StockItemLocationRepository;
import com.z7design.secured_guard.repository.StockRequisitionRepository;
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
    private final StockRequisitionRepository stockRequisitionRepository;
    private final StockItemLocationRepository stockItemLocationRepository;

    public byte[] generateLowStockPDFReport(UUID companyId) throws IOException {
        log.info("Gerando relatório de estoque baixo para empresa: {}", companyId);

        List<StockItemDTO> lowStockItems = stockService.getLowStockItems();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("RELATÓRIO DE ESTOQUE BAIXO")
                .landscape(false)
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
                .landscape(false)
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
                .landscape(false)
                .build();

        StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
        Document document = docWithPdf.getDocument();

        addMovementsTable(document, movements);

        document.close();
        return baos.toByteArray();
    }

    public byte[] generatePhysicalInventoryWorksheetPDF(UUID companyId) throws IOException {
        log.info("Gerando planilha de conferência física de estoque para empresa: {}", companyId);

        List<StockItemDTO> items = stockService.getAllItems();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("PLANILHA DE CONFERÊNCIA FÍSICA (INVENTÁRIO)")
                .reportSubTitle("Data de geração: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .landscape(false)
                .build();

        StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
        Document document = docWithPdf.getDocument();

        Table table = new Table(UnitValue.createPercentArray(new float[] { 16, 40, 18, 13, 13 }))
                .useAllAvailableWidth()
                .setMarginTop(20);

        table.addHeaderCell(layoutService.createHeaderCell("Código"));
        table.addHeaderCell(layoutService.createHeaderCell("Item"));
        table.addHeaderCell(layoutService.createHeaderCell("Categoria"));
        table.addHeaderCell(layoutService.createHeaderCell("Sist."));
        table.addHeaderCell(layoutService.createHeaderCell("Físico"));

        for (StockItemDTO item : items) {
            table.addCell(layoutService.createDataCell(item.getCode()));
            table.addCell(layoutService.createDataCell(item.getName()));
            table.addCell(layoutService.createDataCell(item.getCategory() != null ? item.getCategory().toString() : "-"));
            table.addCell(layoutService.createDataCell(String.valueOf(item.getCurrentQuantity())));
            table.addCell(layoutService.createDataCell("________________"));
        }

        document.add(table);
        document.add(new Paragraph("\nObservações: ________________________________________________________________________________").setItalic().setFontSize(9));
        document.add(new Paragraph("Assinatura do Conferente: _______________________________________ Data: ___/___/___").setMarginTop(20));

        document.close();
        return baos.toByteArray();
    }

    public byte[] generateConsolidatedRequisitionsPDF(UUID companyId, LocalDateTime start, LocalDateTime end) throws IOException {
        log.info("Gerando relatório consolidado de requisições para empresa: {}", companyId);

        List<StockRequisitionListItemDTO> requisitions = stockRequisitionRepository.findAllListItemsCreatedBetween(start, end);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String period = "Período: " + start.format(dtf) + " até " + (end != null ? end.format(dtf) : "Hoje");

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("RELATÓRIO CONSOLIDADO DE REQUISIÇÕES")
                .reportSubTitle(period)
                .landscape(false)
                .build();

        StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
        Document document = docWithPdf.getDocument();

        addRequisitionsTable(document, requisitions);

        document.close();
        return baos.toByteArray();
    }

    /**
     * Relatório único: período, itens em baixo estoque (situação atual), movimentações (entrada/saída),
     * requisições no período e quantidades por localização (prateleira/andar).
     */
    public byte[] generateConsolidatedStockPDFReport(UUID companyId, LocalDateTime start, LocalDateTime end)
            throws IOException {
        log.info("Gerando relatório consolidado de estoque para empresa {} de {} até {}", companyId, start, end);

        List<StockItemDTO> lowStockItems = stockService.getLowStockItems();
        List<StockMovementDTO> movements = stockService.getMovementsByDateRange(start, end);
        List<StockRequisitionListItemDTO> requisitions =
                stockRequisitionRepository.findAllListItemsCreatedBetween(start, end);
        List<Object[]> locationRows = stockItemLocationRepository.aggregateQuantityByShelfAndFloor();

        int totalEntrada = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.ENTRADA)
                .mapToInt(m -> m.getQuantity() != null ? m.getQuantity() : 0)
                .sum();
        int totalSaida = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.SAIDA)
                .mapToInt(m -> m.getQuantity() != null ? m.getQuantity() : 0)
                .sum();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String periodo = "Período analisado: " + start.format(dtf) + " até " + end.format(dtf);

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("RELATÓRIO CONSOLIDADO DE ESTOQUE")
                .reportSubTitle(periodo)
                .landscape(false)
                .build();

        StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer, config);
        Document document = docWithPdf.getDocument();

        document.add(new Paragraph(
                "Resumo do período: total de " + movements.size() + " movimentações; "
                        + "quantidade em entradas (ENTRADA): " + totalEntrada + "; "
                        + "quantidade em saídas (SAÍDA): " + totalSaida + ".")
                .setMarginBottom(12));

        document.add(new Paragraph("1. Itens em baixo estoque (situação atual)").setBold().setFontSize(11)
                .setMarginTop(8));
        addLowStockTable(document, lowStockItems);

        document.add(new Paragraph("2. Movimentações no período (entrada e saída)").setBold().setFontSize(11)
                .setMarginTop(16));
        addMovementsTable(document, movements);

        document.add(new Paragraph("3. Requisições de estoque (criadas no período)").setBold().setFontSize(11)
                .setMarginTop(16));
        addRequisitionsTable(document, requisitions);

        document.add(new Paragraph("4. Quantidade de itens por localização (prateleira / andar)").setBold()
                .setFontSize(11).setMarginTop(16));
        addLocationSummaryTable(document, locationRows);

        document.close();
        return baos.toByteArray();
    }

    private void addLowStockTable(Document document, List<StockItemDTO> items) {
        if (items == null || items.isEmpty()) {
            document.add(new Paragraph("Nenhum item em estoque baixo.").setItalic());
            return;
        }
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

    private void addRequisitionsTable(Document document, List<StockRequisitionListItemDTO> requisitions) {
        if (requisitions == null || requisitions.isEmpty()) {
            document.add(new Paragraph("Nenhuma requisição criada no período.").setItalic());
            return;
        }
        Table table = new Table(UnitValue.createPercentArray(new float[] { 22, 18, 18, 22, 20 }))
                .useAllAvailableWidth()
                .setMarginTop(8);
        table.addHeaderCell(layoutService.createHeaderCell("Nº / Data"));
        table.addHeaderCell(layoutService.createHeaderCell("Status"));
        table.addHeaderCell(layoutService.createHeaderCell("Itens"));
        table.addHeaderCell(layoutService.createHeaderCell("Funcionário"));
        table.addHeaderCell(layoutService.createHeaderCell("Motivo"));

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        for (StockRequisitionListItemDTO r : requisitions) {
            String numDate = (r.getRequisitionNumber() != null ? r.getRequisitionNumber() : "-")
                    + "\n"
                    + (r.getCreatedAt() != null ? r.getCreatedAt().format(dtf) : "-");
            table.addCell(layoutService.createDataCell(numDate));
            table.addCell(layoutService.createDataCell(
                    r.getStatus() != null ? r.getStatus().name() : "N/A"));
            table.addCell(layoutService.createDataCell(String.valueOf(r.getLinesCount())));
            table.addCell(layoutService.createDataCell(
                    r.getEmployeeName() != null ? r.getEmployeeName() : "-"));
            table.addCell(layoutService.createDataCell(
                    r.getMovementReasonLabel() != null ? r.getMovementReasonLabel() : "-"));
        }
        document.add(table);
    }

    private void addLocationSummaryTable(Document document, List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            document.add(new Paragraph("Sem quantidades por localização (itens ativos).").setItalic());
            return;
        }
        Table table = new Table(UnitValue.createPercentArray(new float[] { 40, 25, 35 }))
                .useAllAvailableWidth()
                .setMarginTop(8);
        table.addHeaderCell(layoutService.createHeaderCell("Prateleira"));
        table.addHeaderCell(layoutService.createHeaderCell("Andar / piso"));
        table.addHeaderCell(layoutService.createHeaderCell("Quantidade total"));

        for (Object[] row : rows) {
            String shelf = row[0] != null ? row[0].toString() : "-";
            String floor = row[1] != null ? row[1].toString() : "-";
            Number sum = row[2] instanceof Number ? (Number) row[2] : 0;
            table.addCell(layoutService.createDataCell(shelf));
            table.addCell(layoutService.createDataCell(floor.isBlank() ? "-" : floor));
            table.addCell(layoutService.createDataCell(String.valueOf(sum.longValue())));
        }
        document.add(table);
    }

    private void addStockTable(Document document, List<StockItemDTO> items) {
        if (items == null || items.isEmpty()) {
            document.add(new Paragraph("Nenhum item de estoque para exibir.").setItalic());
            return;
        }
        Table table = new Table(UnitValue.createPercentArray(new float[] { 16, 34, 18, 14, 18 }))
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
        if (movements == null || movements.isEmpty()) {
            document.add(new Paragraph("Nenhuma movimentação no período.").setItalic());
            return;
        }
        Table table = new Table(UnitValue.createPercentArray(new float[] { 18, 14, 12, 34, 22 }))
                .useAllAvailableWidth()
                .setMarginTop(20);

        table.addHeaderCell(layoutService.createHeaderCell("Data"));
        table.addHeaderCell(layoutService.createHeaderCell("Tipo"));
        table.addHeaderCell(layoutService.createHeaderCell("Qtd"));
        table.addHeaderCell(layoutService.createHeaderCell("Item"));
        table.addHeaderCell(layoutService.createHeaderCell("Responsável / Destino"));

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        for (StockMovementDTO movement : movements) {
            String responsavel = movement.getUserName() != null ? movement.getUserName() : "-";
            String destino = movement.getUnitName() != null
                    ? movement.getUnitName()
                    : (movement.getEmployeeName() != null ? movement.getEmployeeName() : null);
            String respDestino = destino != null && !destino.equals(responsavel)
                    ? responsavel + " / " + destino
                    : responsavel;

            table.addCell(layoutService.createDataCell(
                    movement.getMovementDate() != null ? movement.getMovementDate().format(dtf) : "N/A"));
            table.addCell(layoutService.createDataCell(
                    movement.getMovementType() != null ? movement.getMovementType().getDescription() : "N/A"));
            table.addCell(layoutService.createDataCell(String.valueOf(movement.getQuantity())));
            table.addCell(layoutService.createDataCell(movement.getStockItemName()));
            table.addCell(layoutService.createDataCell(respDestino));
        }

        document.add(table);
    }
}
