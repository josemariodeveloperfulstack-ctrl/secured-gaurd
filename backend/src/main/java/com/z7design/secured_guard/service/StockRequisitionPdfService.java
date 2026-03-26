package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.io.font.constants.StandardFonts;
import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.repository.StockMovementRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockRequisitionPdfService {

    private final StockMovementRepository stockMovementRepository;

    public byte[] generateRequisitionPdf(UUID movementId) {
        log.info("Gerando PDF de requisição (iText 7) para movimentação: {}", movementId);

        StockMovement movement = stockMovementRepository.findById(movementId)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação não encontrada: " + movementId));

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            PdfFont boldFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);

            // Título
            document.add(new Paragraph("REQUISIÇÃO DE ESTOQUE")
                    .setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20));

            // Informações da Requisição
            Table infoTable = new Table(UnitValue.createPercentArray(new float[]{30, 70}));
            infoTable.setWidth(UnitValue.createPercentValue(100));
            infoTable.setMarginBottom(20);

            infoTable.addCell(createLabelCell("Número da Requisição:", boldFont));
            infoTable.addCell(createValueCell(movement.getId().toString().substring(0, 8).toUpperCase(), normalFont));
            
            infoTable.addCell(createLabelCell("Data/Hora:", boldFont));
            infoTable.addCell(createValueCell(movement.getMovementDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")), normalFont));

            infoTable.addCell(createLabelCell("Funcionário Requisitante:", boldFont));
            infoTable.addCell(createValueCell(movement.getEmployeeName(), normalFont));

            infoTable.addCell(createLabelCell("Responsável pela Saída:", boldFont));
            infoTable.addCell(createValueCell(movement.getUserName(), normalFont));

            document.add(infoTable);

            // Tabela de Itens
            Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{15, 55, 15, 15}));
            itemsTable.setWidth(UnitValue.createPercentValue(100));
            itemsTable.setMarginBottom(20);

            itemsTable.addHeaderCell(new Cell().add(new Paragraph("CÓDIGO").setFont(boldFont)).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            itemsTable.addHeaderCell(new Cell().add(new Paragraph("ITEM").setFont(boldFont)).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            itemsTable.addHeaderCell(new Cell().add(new Paragraph("QTD").setFont(boldFont)).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            itemsTable.addHeaderCell(new Cell().add(new Paragraph("UNID").setFont(boldFont)).setBackgroundColor(ColorConstants.LIGHT_GRAY));

            itemsTable.addCell(new Cell().add(new Paragraph(movement.getStockItem().getCode()).setFont(normalFont)));
            itemsTable.addCell(new Cell().add(new Paragraph(movement.getStockItem().getFullName()).setFont(normalFont)));
            itemsTable.addCell(new Cell().add(new Paragraph(movement.getQuantity().toString()).setFont(normalFont)));
            itemsTable.addCell(new Cell().add(new Paragraph(movement.getStockItem().getUnit() != null ? movement.getStockItem().getUnit().getAbbreviation() : "UN").setFont(normalFont)));

            document.add(itemsTable);

            // Observações
            if (movement.getNotes() != null && !movement.getNotes().isEmpty()) {
                document.add(new Paragraph("Observações:").setFont(boldFont).setMarginBottom(5));
                document.add(new Paragraph(movement.getNotes()).setFont(normalFont).setMarginBottom(20));
            }

            // Localização
            if (movement.getItemLocation() != null) {
                document.add(new Paragraph("Localização de Retirada: " + 
                    movement.getItemLocation().getShelf().getIdentification() + " - " + 
                    movement.getItemLocation().getFloor()).setFont(normalFont).setMarginBottom(30));
            }

            document.add(new Paragraph("\n\n"));
            document.add(new LineSeparator(new SolidLine()));
            document.add(new Paragraph("\n"));

            // Assinaturas
            Table signTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
            signTable.setWidth(UnitValue.createPercentValue(100));
            
            signTable.addCell(new Cell().add(new Paragraph("_________________________________\nAssinatura do Funcionário").setTextAlignment(TextAlignment.CENTER)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
            signTable.addCell(new Cell().add(new Paragraph("_________________________________\nAssinatura do Responsável").setTextAlignment(TextAlignment.CENTER)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));

            document.add(signTable);

            document.close();
        } catch (IOException e) {
            log.error("Erro ao gerar PDF: {}", e.getMessage());
        }

        return out.toByteArray();
    }

    private Cell createLabelCell(String text, PdfFont font) {
        return new Cell().add(new Paragraph(text).setFont(font)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
    }

    private Cell createValueCell(String text, PdfFont font) {
        return new Cell().add(new Paragraph(text != null ? text : "").setFont(font)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
    }
}
