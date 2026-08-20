package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleCriticalityPdfService {

    private static final DeviceRgb SECTION_BG = new DeviceRgb(240, 240, 242);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(200, 200, 205);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(30, 30, 30);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(90, 90, 90);

    private static final DeviceRgb RED_CRITICAL = new DeviceRgb(220, 38, 38);
    private static final DeviceRgb AMBER_TOLERABLE = new DeviceRgb(217, 119, 6);
    private static final DeviceRgb GREEN_LOW = new DeviceRgb(22, 101, 52);

    public byte[] generatePdf() {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4);

            Document document = new Document(pdfDoc);
            document.setMargins(20, 25, 20, 25);

            // 1. Cabeçalho
            addHeader(document);

            // 2. Matriz de Criticidade de Viaturas (Bloqueio Imediato)
            addCriticalityMatrix(document);

            // 3. Guia Rápido de Manutenção Preventiva por Quilometragem
            addMaintenanceGuide(document);

            // 4. Rodapé e Data
            addFooter(document);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da Matriz de Criticidade de Viaturas", e);
            throw new RuntimeException("Erro ao gerar PDF da Matriz de Criticidade de Viaturas", e);
        }
    }

    private void addHeader(Document document) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{75, 25}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBorder(Border.NO_BORDER);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER);
        Paragraph title = new Paragraph("MATRIZ DE CRITICIDADE DE VIATURAS & MANUTENÇÃO PREVENTIVA")
                .setFontSize(10.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMargin(0);

        Paragraph sub = new Paragraph("Diretrizes Operacionais de Bloqueio Imediato (Viatura Baixada) e Metas por Quilometragem")
                .setFontSize(7.5f)
                .setFontColor(TEXT_MUTED)
                .setMarginTop(1.5f);

        leftCell.add(title);
        leftCell.add(sub);
        table.addCell(leftCell);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        Paragraph badge = new Paragraph("SEGURANÇA VEICULAR")
                .setFontSize(7.5f)
                .setBold()
                .setFontColor(ColorConstants.WHITE)
                .setBackgroundColor(RED_CRITICAL)
                .setPadding(3)
                .setTextAlignment(TextAlignment.CENTER)
                .setWidth(UnitValue.createPercentValue(95))
                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
        rightCell.add(badge);
        table.addCell(rightCell);

        document.add(table);
        document.add(new Paragraph().setMargin(0).setPadding(0).setBorderBottom(new SolidBorder(BORDER_COLOR, 1f)).setMarginBottom(6));
    }

    private void addCriticalityMatrix(Document document) {
        Paragraph secTitle = new Paragraph("1. Matriz de Criticidade de Viaturas (Bloqueio Imediato)")
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setBackgroundColor(SECTION_BG)
                .setPadding(2)
                .setPaddingLeft(4)
                .setMarginBottom(3)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        document.add(secTitle);

        Paragraph desc = new Paragraph("Esta matriz define o que é uma falha tolerável e o que exige a parada imediata do veículo (Viatura Baixada), evitando acidentes e multas pesadas durante a fiscalização nas ruas.")
                .setFontSize(7.2f)
                .setFontColor(TEXT_DARK)
                .setMarginBottom(4);
        document.add(desc);

        Table table = new Table(UnitValue.createPercentArray(new float[]{18, 52, 30}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(8);

        // Header
        table.addHeaderCell(createTableHeaderCell("Componente"));
        table.addHeaderCell(createTableHeaderCell("Tipo de Falha Detectada"));
        table.addHeaderCell(createTableHeaderCell("Nível / Ação Obrigatória"));

        // Linhas da Tabela
        addMatrixRow(table, "Pneus", "Carecas (abaixo do TWI), bolhas ou estepe furado", "BLOQUEIO IMEDIATO", RED_CRITICAL);
        addMatrixRow(table, "Freios", "Pedal mole, ruído metálico áspero ou luz de freio queimada", "BLOQUEIO IMEDIATO", RED_CRITICAL);
        addMatrixRow(table, "Sinalização", "Giroflex queimado ou sirene inoperante", "BLOQUEIO IMEDIATO", RED_CRITICAL);
        addMatrixRow(table, "Iluminação", "Farol baixo queimado ou setas dianteiras/traseiras sem funcionar", "BLOQUEIO IMEDIATO", RED_CRITICAL);
        addMatrixRow(table, "Documentação", "CRLV vencido ou ausente no veículo", "BLOQUEIO IMEDIATO", RED_CRITICAL);
        addMatrixRow(table, "Fluídos", "Vazamento visível de óleo no chão ou nível de água zerado", "BLOQUEIO IMEDIATO", RED_CRITICAL);
        addMatrixRow(table, "Funilaria", "Parachoque solto ou retrovisor quebrado/trincado", "Tolerável (Reparo Programado)", AMBER_TOLERABLE);
        addMatrixRow(table, "Ar Condicionado", "Não gela ou comandos travados", "Tolerável (Manutenção)", AMBER_TOLERABLE);
        addMatrixRow(table, "Estética", "Riscos na pintura ou adesivo tático levemente desgastado", "Baixa Prioridade (Monitorar)", GREEN_LOW);

        document.add(table);
    }

    private void addMatrixRow(Table table, String componente, String tipoFalha, String statusAction, DeviceRgb color) {
        Cell cellComp = new Cell().setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(2.5f).setPaddingLeft(4);
        cellComp.add(new Paragraph(componente).setFontSize(7.3f).setBold().setFontColor(TEXT_DARK));
        table.addCell(cellComp);

        Cell cellFalha = new Cell().setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(2.5f).setPaddingLeft(4);
        cellFalha.add(new Paragraph(tipoFalha).setFontSize(7.2f).setFontColor(TEXT_DARK));
        table.addCell(cellFalha);

        Cell cellAction = new Cell().setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(2.5f).setPaddingLeft(4);
        Paragraph pAction = new Paragraph(statusAction)
                .setFontSize(7.2f)
                .setBold()
                .setFontColor(color);
        cellAction.add(pAction);
        table.addCell(cellAction);
    }

    private void addMaintenanceGuide(Document document) {
        Paragraph secTitle = new Paragraph("2. Guia Rápido de Manutenção Preventiva por Quilometragem")
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setBackgroundColor(SECTION_BG)
                .setPadding(2)
                .setPaddingLeft(4)
                .setMarginBottom(3)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        document.add(secTitle);

        Paragraph desc = new Paragraph("Plano de alertas e revisões periódicas para carros e motos de supervisão operacional:")
                .setFontSize(7.2f)
                .setFontColor(TEXT_DARK)
                .setMarginBottom(3);
        document.add(desc);

        Table table = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBorder(Border.NO_BORDER);

        // Bloco 5k km
        table.addCell(createMaintenanceBlock(
                "A CADA 5.000 KM (OU 6 MESES)",
                "• Óleo do Motor e Filtro: Troca obrigatória (frotas operacionais exigem mais do motor pelo uso severo em marcha lenta/paradas).\n" +
                "• Filtro de Combustível e de Ar: Inspeção e troca se o ambiente dos postos for muito empoeirado."
        ));

        // Bloco 10k km
        table.addCell(createMaintenanceBlock(
                "A CADA 10.000 KM",
                "• Pastilhas de Freio: Inspeção visual da espessura (substituir se estiver abaixo de 3mm).\n" +
                "• Rodízio de Pneus: Inverter pneus dianteiros com os traseiros + Alinhamento e balanceamento.\n" +
                "• Filtro de Cabine (Ar Condicionado): Troca para preservar a saúde dos supervisores."
        ));

        // Bloco 20k km
        table.addCell(createMaintenanceBlock(
                "A CADA 20.000 KM",
                "• Velas de Ignição: Troca do jogo completo para evitar falhas em perseguições e consumo alto de combustível.\n" +
                "• Fluído de Freio: Sangria e troca completa do fluido (essencial para frotas que rodam 24h).\n" +
                "• Sistema de Suspensão: Revisão de amortecedores, batentes, buchas e pivôs."
        ));

        // Bloco 40k / 50k km
        table.addCell(createMaintenanceBlock(
                "A CADA 40.000 KM A 50.000 KM",
                "• Correia Dentada (Se houver): Troca preventiva com tensor (a quebra desse item destrói o motor da viatura).\n" +
                "• Pneus: Troca do jogo de pneus se atingiram o limite de desgaste (TWI)."
        ));

        document.add(table);
    }

    private Cell createMaintenanceBlock(String title, String items) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(2).setPaddingRight(4);
        Table card = new Table(UnitValue.createPercentArray(new float[]{100}));
        card.setWidth(UnitValue.createPercentValue(100));
        card.setBackgroundColor(new DeviceRgb(248, 249, 250));
        card.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));

        Cell cTitle = new Cell().setBorder(Border.NO_BORDER).setBackgroundColor(new DeviceRgb(230, 235, 245)).setPadding(2.5f).setPaddingLeft(4);
        cTitle.add(new Paragraph(title).setFontSize(7.5f).setBold().setFontColor(TEXT_DARK));
        card.addCell(cTitle);

        Cell cContent = new Cell().setBorder(Border.NO_BORDER).setPadding(3).setPaddingLeft(4);
        cContent.add(new Paragraph(items).setFontSize(6.8f).setFontColor(TEXT_DARK).setMultipliedLeading(1.1f));
        card.addCell(cContent);

        cell.add(card);
        return cell;
    }

    private Cell createTableHeaderCell(String text) {
        Cell cell = new Cell().setBackgroundColor(SECTION_BG).setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(2.5f);
        cell.add(new Paragraph(text).setFontSize(7.5f).setBold().setFontColor(TEXT_DARK));
        return cell;
    }

    private void addFooter(Document document) {
        String dataStr = LocalDate.now().format(DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        Paragraph p = new Paragraph("Secured Guard Segurança Privada — Diretrizes de Manutenção e Gestão de Frota Operacional | Emissão em " + dataStr)
                .setFontSize(6.8f)
                .setFontColor(TEXT_MUTED)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(8);
        document.add(p);
    }
}
