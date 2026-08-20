package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageDataFactory;
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
import com.z7design.secured_guard.model.VehicleChecklist;
import com.z7design.secured_guard.repository.VehicleChecklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleChecklistPdfService {

    private final VehicleChecklistRepository vehicleChecklistRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private static final DeviceRgb SECTION_BG = new DeviceRgb(240, 240, 242);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(200, 200, 205);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(30, 30, 30);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(100, 100, 100);

    public byte[] generatePdf(Long id) {
        VehicleChecklist checklist = vehicleChecklistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Checklist de viatura não encontrado com ID: " + id));

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4);

            Document document = new Document(pdfDoc);
            document.setMargins(25, 30, 25, 30);

            // 1. Cabeçalho
            addHeader(document, checklist);

            // 2. Dados da Viatura e Turno
            addVehicleData(document, checklist);

            // 3. As 4 Seções de Inspeção
            addChecklistSections(document, checklist);

            // 4. Observações (se houver)
            if (checklist.getObservations() != null && !checklist.getObservations().isBlank()) {
                addObservations(document, checklist.getObservations());
            }

            // 5. Bloco de Assinatura
            addSignatureBlock(document, checklist);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do checklist de viatura", e);
            throw new RuntimeException("Erro ao gerar PDF do checklist de viatura", e);
        }
    }

    private void addHeader(Document document, VehicleChecklist checklist) {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{75, 25}));
        headerTable.setWidth(UnitValue.createPercentValue(100));
        headerTable.setBorder(Border.NO_BORDER);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER);
        Paragraph title = new Paragraph("CHECKLIST DIÁRIO DE VIATURA OPERACIONAL")
                .setFontSize(12)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMargin(0);

        Paragraph sub = new Paragraph("Inspeção Diária de Frota e Equipamentos Operacionais")
                .setFontSize(8)
                .setFontColor(TEXT_MUTED)
                .setMarginTop(2);

        leftCell.add(title);
        leftCell.add(sub);
        headerTable.addCell(leftCell);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        String turnoStr = checklist.getShift() == VehicleChecklist.ShiftType.DIA ? "TURNO DIA" : "TURNO NOITE";
        Paragraph badge = new Paragraph(turnoStr)
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(ColorConstants.BLACK)
                .setBackgroundColor(new DeviceRgb(254, 240, 138))
                .setPadding(4)
                .setTextAlignment(TextAlignment.CENTER)
                .setWidth(UnitValue.createPercentValue(95))
                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
        rightCell.add(badge);
        headerTable.addCell(rightCell);

        document.add(headerTable);
        document.add(new Paragraph().setMargin(0).setPadding(0).setBorderBottom(new SolidBorder(BORDER_COLOR, 1f)).setMarginBottom(8));
    }

    private void addVehicleData(Document document, VehicleChecklist checklist) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{35, 35, 30}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBackgroundColor(new DeviceRgb(248, 249, 250));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(10);

        table.addCell(createDataCell("Placa:", checklist.getPlate() != null ? checklist.getPlate() : "__________"));
        table.addCell(createDataCell("Modelo:", checklist.getModel() != null ? checklist.getModel() : "__________"));
        table.addCell(createDataCell("Km Atual:", checklist.getCurrentKm() != null ? String.valueOf(checklist.getCurrentKm()) + " km" : "__________"));

        String dataHoraStr = String.format("%s   Hora: %s",
                checklist.getChecklistDate() != null ? checklist.getChecklistDate().format(DATE_FORMATTER) : "--/--/----",
                checklist.getChecklistTime() != null ? checklist.getChecklistTime().format(TIME_FORMATTER) : "--:--");
        table.addCell(createDataCell("Data / Hora:", dataHoraStr));

        String turnoBoxes = String.format("%s Dia   %s Noite",
                checklist.getShift() == VehicleChecklist.ShiftType.DIA ? "[X]" : "[ ]",
                checklist.getShift() == VehicleChecklist.ShiftType.NOITE ? "[X]" : "[ ]");
        table.addCell(createDataCell("Turno:", turnoBoxes));

        String respStr = checklist.getEmployeeName() != null ? checklist.getEmployeeName() : 
                        (checklist.getSupervisorName() != null ? checklist.getSupervisorName() : "____________________");
        table.addCell(createDataCell("Supervisor / Condutor:", respStr));

        document.add(table);
    }

    private Cell createDataCell(String label, String value) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(3).setPaddingLeft(6);
        Paragraph p = new Paragraph()
                .add(new Text(label + " ").setFontSize(8).setBold().setFontColor(TEXT_DARK))
                .add(new Text(value).setFontSize(8).setFontColor(TEXT_DARK));
        cell.add(p);
        return cell;
    }

    private void addChecklistSections(Document document, VehicleChecklist checklist) {
        // 1. Inspeção Externa e Lataria
        addSectionHeader(document, "1. Inspeção Externa e Lataria (Visual)");
        addChecklistItem(document, checklist.getDianteira(), "Dianteira:", "Parachoque firme, grade sem quebras e capô travado.");
        addChecklistItem(document, checklist.getLaterais(), "Laterais:", "Ausência de novos riscos, mossas ou batidas nas portas.");
        addChecklistItem(document, checklist.getVidrosRetrovisores(), "Vidros e Retrovisores:", "Limpos, sem trincas e espelhos regulando perfeitamente.");
        addChecklistItem(document, checklist.getIdentificacaoVisual(), "Identificação Visual:", "Adesivos com o logotipo da empresa e o número da viatura legíveis.");

        // 2. Iluminação e Sinalização Sonora
        addSectionHeader(document, "2. Iluminação e Sinalização Sonora (Segurança)");
        addChecklistItem(document, checklist.getFaroisLanternas(), "Faróis e Lanternas:", "Farol alto/baixo, setas, luz de freio e ré funcionando.");
        addChecklistItem(document, checklist.getGiroflexSirene(), "Giroflex / Sirene:", "Luzes de emergência táticas acendendo e sirene com som claro.");
        addChecklistItem(document, checklist.getBuzina(), "Buzina:", "Emitindo som forte e sem falhas.");

        // 3. Mecânica Básica e Fluídos
        addSectionHeader(document, "3. Mecânica Básica e Fluídos");
        addChecklistItem(document, checklist.getPneus(), "Pneus:", "Calibrados, com sulcos visíveis (acima do TWI) e estepe presente e cheio.");
        addChecklistItem(document, checklist.getNiveis(), "Níveis:", "Óleo do motor e água do radiador checados (com motor frio).");
        addChecklistItem(document, checklist.getPainel(), "Painel:", "Sem luzes de advertência acesas (Injeção, Óleo ou Bateria) após dar a partida.");

        // 4. Kit de Bordo e Equipamentos Operacionais
        addSectionHeader(document, "4. Kit de Bordo e Equipamentos Operacionais");
        addChecklistItem(document, checklist.getDocumentacao(), "Documentação:", "CRLV do veículo presente no porta-luvas.");
        addChecklistItem(document, checklist.getFerramentasEmergencia(), "Ferramentas de Emergência:", "Macaco, triângulo e chave de roda a bordo.");
        addChecklistItem(document, checklist.getExtintorIncendio(), "Extintor de Incêndio:", "Dentro do prazo de validade e com o ponteiro no verde.");
        addChecklistItem(document, checklist.getKitPrancheta(), "Kit Prancheta:", "Contendo talão de ocorrências, caneta e mapas de postos.");
    }

    private void addSectionHeader(Document document, String title) {
        Paragraph p = new Paragraph(title)
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setBackgroundColor(SECTION_BG)
                .setPadding(2)
                .setPaddingLeft(5)
                .setMarginTop(4)
                .setMarginBottom(3)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        document.add(p);
    }

    private void addChecklistItem(Document document, Boolean isChecked, String itemTitle, String itemDescription) {
        Table rowTable = new Table(UnitValue.createPercentArray(new float[]{5, 95}));
        rowTable.setWidth(UnitValue.createPercentValue(100));
        rowTable.setBorder(Border.NO_BORDER);
        rowTable.setMarginBottom(1.5f);

        boolean checked = Boolean.TRUE.equals(isChecked);
        String checkboxSymbol = checked ? "[ X ]" : "[   ]";

        Cell checkCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        Paragraph checkP = new Paragraph(checkboxSymbol)
                .setFontSize(8)
                .setBold()
                .setFontColor(checked ? new DeviceRgb(22, 101, 52) : TEXT_MUTED)
                .setTextAlignment(TextAlignment.CENTER);
        checkCell.add(checkP);
        rowTable.addCell(checkCell);

        Cell textCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        Paragraph textP = new Paragraph()
                .add(new Text("• " + itemTitle + " ").setFontSize(8).setBold().setFontColor(TEXT_DARK))
                .add(new Text(itemDescription).setFontSize(7.5f).setFontColor(TEXT_DARK));
        textCell.add(textP);
        rowTable.addCell(textCell);

        document.add(rowTable);
    }

    private void addObservations(Document document, String observations) {
        Paragraph obsTitle = new Paragraph("Observações / Avarias Detectadas:")
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMarginTop(4)
                .setMarginBottom(2);
        document.add(obsTitle);

        Paragraph obsContent = new Paragraph(observations)
                .setFontSize(8)
                .setFontColor(TEXT_DARK)
                .setPadding(4)
                .setBackgroundColor(new DeviceRgb(254, 242, 242))
                .setBorder(new SolidBorder(new DeviceRgb(252, 165, 165), 0.5f))
                .setMarginBottom(6);
        document.add(obsContent);
    }

    private void addSignatureBlock(Document document, VehicleChecklist checklist) {
        document.add(new Paragraph().setMargin(0).setPadding(0).setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f)).setMarginTop(8).setMarginBottom(8));

        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{100}));
        sigTable.setWidth(UnitValue.createPercentValue(100));
        sigTable.setBorder(Border.NO_BORDER);

        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(6).setTextAlignment(TextAlignment.CENTER);
        if (checklist.getSignatureBase64() != null && !checklist.getSignatureBase64().isBlank()) {
            try {
                String base64Data = cleanBase64(checklist.getSignatureBase64());
                byte[] imgBytes = Base64.getDecoder().decode(base64Data);
                Image sigImg = new Image(ImageDataFactory.create(imgBytes));
                sigImg.setMaxHeight(35);
                sigImg.setHorizontalAlignment(HorizontalAlignment.CENTER);
                cell.add(sigImg);
            } catch (Exception e) {
                log.warn("Não foi possível renderizar imagem de assinatura da viatura", e);
            }
        } else {
            cell.add(new Paragraph("___________________________________________________________").setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }

        Paragraph label = new Paragraph("Assinatura do Condutor / Supervisor Responsável")
                .setFontSize(8)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMargin(0);

        String nome = checklist.getEmployeeName() != null ? checklist.getEmployeeName() : 
                     (checklist.getSupervisorName() != null ? checklist.getSupervisorName() : "");
        Paragraph sub = new Paragraph(nome)
                .setFontSize(7.5f)
                .setFontColor(TEXT_MUTED)
                .setMargin(0);

        cell.add(label);
        cell.add(sub);
        sigTable.addCell(cell);

        document.add(sigTable);
    }

    private String cleanBase64(String raw) {
        if (raw == null) return "";
        if (raw.contains(",")) {
            return raw.substring(raw.indexOf(",") + 1);
        }
        return raw;
    }
}
