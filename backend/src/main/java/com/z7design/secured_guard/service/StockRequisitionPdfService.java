package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.io.font.constants.StandardFonts;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.model.StockRequisition;
import com.z7design.secured_guard.model.StockRequisitionLine;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import com.z7design.secured_guard.repository.StockMovementRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockRequisitionPdfService {

    /** Dimensões máximas (pt) da imagem de assinatura digital — boa leitura em A4 com margens padrão do Document. */
    private static final float SIGNATURE_IMAGE_MAX_WIDTH_PT = 400f;
    private static final float SIGNATURE_IMAGE_MAX_HEIGHT_PT = 165f;

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

    /**
     * PDF de requisição com várias linhas (aprovação / entrega).
     */
    public byte[] generateMultiLineRequisitionPdf(StockRequisition r) {
        log.info("Gerando PDF de requisição multi-item: {}", r.getRequisitionNumber());
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            PdfFont boldFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);

            document.add(new Paragraph("REQUISIÇÃO DE ESTOQUE")
                    .setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(16));

            Table infoTable = new Table(UnitValue.createPercentArray(new float[]{32, 68}));
            infoTable.setWidth(UnitValue.createPercentValue(100));
            infoTable.setMarginBottom(16);

            infoTable.addCell(createLabelCell("Número da requisição:", boldFont));
            infoTable.addCell(createValueCell(r.getRequisitionNumber(), normalFont));

            infoTable.addCell(createLabelCell("Status:", boldFont));
            infoTable.addCell(createValueCell(statusLabel(r.getStatus()), normalFont));

            infoTable.addCell(createLabelCell("Data da requisição:", boldFont));
            String created = r.getCreatedAt() != null
                    ? r.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    : "";
            infoTable.addCell(createValueCell(created, normalFont));

            if (r.getApprovedAt() != null) {
                infoTable.addCell(createLabelCell("Baixa no estoque (aprovação):", boldFont));
                infoTable.addCell(createValueCell(
                        r.getApprovedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                                + (r.getApprovedByUser() != null ? " — por " + r.getApprovedByUser().getName() : ""),
                        normalFont));
            }

            infoTable.addCell(createLabelCell("Motivo (saída):", boldFont));
            infoTable.addCell(createValueCell(
                    r.getMovementReason() != null ? r.getMovementReason().getDescription() : "", normalFont));

            Employee emp = r.getEmployee();
            if (emp != null) {
                infoTable.addCell(createLabelCell("Funcionário solicitante:", boldFont));
                infoTable.addCell(createValueCell(emp.getName(), normalFont));
                if (emp.getDocument() != null && !emp.getDocument().isBlank()) {
                    infoTable.addCell(createLabelCell("Documento:", boldFont));
                    infoTable.addCell(createValueCell(emp.getDocument(), normalFont));
                }
            }

            if (r.getEmployeeWorkSector() != null && !r.getEmployeeWorkSector().isBlank()) {
                infoTable.addCell(createLabelCell("Setor de trabalho (snapshot):", boldFont));
                infoTable.addCell(createValueCell(r.getEmployeeWorkSector(), normalFont));
            }

            User reqUser = r.getRequestedByUser();
            if (reqUser != null) {
                infoTable.addCell(createLabelCell("Solicitado por (usuário):", boldFont));
                infoTable.addCell(createValueCell(reqUser.getName(), normalFont));
            }

            User appr = r.getApprovedByUser();
            if (appr != null && r.getApprovedAt() != null) {
                infoTable.addCell(createLabelCell("Aprovado por:", boldFont));
                infoTable.addCell(createValueCell(appr.getName(), normalFont));
                infoTable.addCell(createLabelCell("Data da aprovação:", boldFont));
                infoTable.addCell(createValueCell(
                        r.getApprovedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")), normalFont));
            }

            User del = r.getDeliveredByUser();
            if (del != null && r.getDeliveredAt() != null) {
                infoTable.addCell(createLabelCell("Entregue por:", boldFont));
                infoTable.addCell(createValueCell(del.getName(), normalFont));
                infoTable.addCell(createLabelCell("Data/hora da entrega:", boldFont));
                infoTable.addCell(createValueCell(
                        r.getDeliveredAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")), normalFont));
            }

            document.add(infoTable);

            if (r.getNotes() != null && !r.getNotes().isBlank()) {
                document.add(new Paragraph("Observações:").setFont(boldFont).setMarginBottom(4));
                document.add(new Paragraph(r.getNotes()).setFont(normalFont).setMarginBottom(12));
            }

            Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{14, 52, 12, 12, 10}));
            itemsTable.setWidth(UnitValue.createPercentValue(100));
            itemsTable.setMarginBottom(20);

            itemsTable.addHeaderCell(headerCell("CÓDIGO", boldFont));
            itemsTable.addHeaderCell(headerCell("ITEM", boldFont));
            itemsTable.addHeaderCell(headerCell("QTD", boldFont));
            itemsTable.addHeaderCell(headerCell("UNID", boldFont));
            itemsTable.addHeaderCell(headerCell("CAT.", boldFont));

            for (StockRequisitionLine line : r.getLines()) {
                var item = line.getStockItem();
                String unit = item != null && item.getUnit() != null ? item.getUnit().getAbbreviation() : "UN";
                String cat = item != null && item.getCategory() != null ? item.getCategory().name() : "";
                itemsTable.addCell(new Cell().add(new Paragraph(item != null ? item.getCode() : "").setFont(normalFont)));
                itemsTable.addCell(new Cell().add(new Paragraph(item != null ? item.getFullName() : "").setFont(normalFont)));
                itemsTable.addCell(new Cell().add(new Paragraph(String.valueOf(line.getQuantity())).setFont(normalFont)));
                itemsTable.addCell(new Cell().add(new Paragraph(unit).setFont(normalFont)));
                itemsTable.addCell(new Cell().add(new Paragraph(cat).setFont(normalFont)));
            }
            document.add(itemsTable);

            document.add(new Paragraph("\n"));
            document.add(new LineSeparator(new SolidLine()));
            document.add(new Paragraph("ASSINATURA DO FUNCIONÁRIO SOLICITANTE")
                    .setFont(boldFont)
                    .setFontSize(11)
                    .setMarginTop(10)
                    .setMarginBottom(6));

            addEmployeeSignatureSection(document, r, emp, boldFont, normalFont);

            document.add(new Paragraph("\n"));
            document.add(new LineSeparator(new SolidLine()));
            document.add(new Paragraph("\n"));

            Table signTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
            signTable.setWidth(UnitValue.createPercentValue(100));
            String solicitante = emp != null ? emp.getName() : "Solicitante";
            String leftFooter;
            if (r.getStatus() == StockRequisitionStatus.DELIVERED
                    && inferSignatureType(r) == StockMovement.SignatureType.DIGITAL
                    && r.getDigitalSignature() != null
                    && !r.getDigitalSignature().isBlank()) {
                leftFooter = "Assinatura eletrônica registrada conforme bloco acima.\n"
                        + solicitante + " — Solicitante";
            } else if (r.getStatus() == StockRequisitionStatus.DELIVERED) {
                leftFooter = "Recebimento documentado conforme registro acima.\n"
                        + solicitante + " — Solicitante";
            } else {
                leftFooter = "_________________________________\nAssinatura do solicitante";
            }
            signTable.addCell(new Cell().add(new Paragraph(leftFooter)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFont(normalFont)
                    .setFontSize(9)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
            signTable.addCell(new Cell().add(new Paragraph(
                    "_________________________________\nResponsável pela entrega — Almoxarifado")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFont(normalFont)
                    .setFontSize(9)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
            document.add(signTable);

            document.close();
        } catch (IOException e) {
            log.error("Erro ao gerar PDF multi-item: {}", e.getMessage());
        }
        return out.toByteArray();
    }

    /**
     * Bloco com assinatura digital (imagem) ou texto de assinatura física, quando já registrada na entrega.
     */
    private void addEmployeeSignatureSection(Document document, StockRequisition r, Employee emp,
                                            PdfFont boldFont, PdfFont normalFont) {
        if (r.getStatus() != StockRequisitionStatus.DELIVERED) {
            document.add(new Paragraph(
                    "O recebimento ainda não foi confirmado no sistema. Após a confirmação, "
                            + "a assinatura do solicitante constará neste documento.")
                    .setFont(normalFont)
                    .setFontColor(ColorConstants.GRAY)
                    .setMarginBottom(4));
            return;
        }

        String empName = emp != null ? emp.getName() : "Solicitante";
        StockMovement.SignatureType sigType = inferSignatureType(r);

        if (sigType == StockMovement.SignatureType.DIGITAL
                && r.getDigitalSignature() != null
                && !r.getDigitalSignature().isBlank()) {
            byte[] imgBytes = decodeSignatureBase64(r.getDigitalSignature());
            if (imgBytes != null && imgBytes.length > 0) {
                try {
                    Image sigImg = new Image(ImageDataFactory.create(imgBytes));
                    sigImg.scaleToFit(SIGNATURE_IMAGE_MAX_WIDTH_PT, SIGNATURE_IMAGE_MAX_HEIGHT_PT);
                    sigImg.setHorizontalAlignment(HorizontalAlignment.CENTER);
                    document.add(sigImg);
                } catch (Exception e) {
                    log.warn("Não foi possível embutir imagem da assinatura no PDF: {}", e.getMessage());
                    document.add(new Paragraph(
                            "Assinatura eletrônica registrada no sistema; não foi possível exibir a imagem neste PDF.")
                            .setFont(normalFont)
                            .setFontColor(ColorConstants.GRAY));
                }
            } else {
                document.add(new Paragraph(
                        "Assinatura eletrônica registrada; os dados não puderam ser interpretados como imagem.")
                        .setFont(normalFont));
            }
            if (r.getSignatureAt() != null) {
                document.add(new Paragraph(
                        "Data e hora da assinatura: "
                                + r.getSignatureAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                        .setFont(normalFont)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setMarginTop(4));
            }
            document.add(new Paragraph(empName)
                    .setFont(boldFont)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(2));
            return;
        }

        document.add(new Paragraph(
                "Confirmação de recebimento por assinatura física, conforme registro abaixo.")
                .setFont(normalFont)
                .setMarginBottom(4));
        if (r.getPhysicalSignatureAck() != null && !r.getPhysicalSignatureAck().isBlank()) {
            document.add(new Paragraph("Declaração / registro: " + r.getPhysicalSignatureAck())
                    .setFont(normalFont)
                    .setMarginBottom(8));
        }
        document.add(new Paragraph("_______________________________________________")
                .setTextAlignment(TextAlignment.CENTER)
                .setFont(normalFont));
        document.add(new Paragraph(empName)
                .setFont(boldFont)
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(2));
        if (r.getSignatureAt() != null) {
            document.add(new Paragraph(
                    "Data e hora do registro: "
                            + r.getSignatureAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setFont(normalFont)
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(4));
        }
    }

    /** Compatível com registros antigos em que {@code signature_type} pode estar nulo. */
    private static StockMovement.SignatureType inferSignatureType(StockRequisition r) {
        if (r.getSignatureType() != null) {
            return r.getSignatureType();
        }
        if (r.getDigitalSignature() != null && !r.getDigitalSignature().isBlank()) {
            return StockMovement.SignatureType.DIGITAL;
        }
        return StockMovement.SignatureType.PHYSICAL;
    }

    private static byte[] decodeSignatureBase64(String dataUrlOrRaw) {
        if (dataUrlOrRaw == null || dataUrlOrRaw.isBlank()) {
            return null;
        }
        String s = dataUrlOrRaw.trim();
        int comma = s.indexOf(',');
        if (s.startsWith("data:") && comma > 0) {
            s = s.substring(comma + 1);
        }
        try {
            return Base64.getDecoder().decode(s.replaceAll("\\s", ""));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static Cell headerCell(String text, PdfFont boldFont) {
        return new Cell().add(new Paragraph(text).setFont(boldFont)).setBackgroundColor(ColorConstants.LIGHT_GRAY);
    }

    private static String statusLabel(StockRequisitionStatus s) {
        if (s == null) {
            return "";
        }
        return switch (s) {
            case PENDING -> "Pendente";
            case APPROVED -> "Aprovada";
            case DELIVERED -> "Entregue";
            case CANCELLED -> "Cancelada";
        };
    }

    private Cell createLabelCell(String text, PdfFont font) {
        return new Cell().add(new Paragraph(text).setFont(font)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
    }

    private Cell createValueCell(String text, PdfFont font) {
        return new Cell().add(new Paragraph(text != null ? text : "").setFont(font)).setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
    }
}
