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
import com.z7design.secured_guard.model.RadioChecklist;
import com.z7design.secured_guard.repository.RadioChecklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class RadioChecklistPdfService {

    private final RadioChecklistRepository radioChecklistRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    // Cores corporativas
    private static final DeviceRgb DARK_HEADER = new DeviceRgb(24, 24, 27);
    private static final DeviceRgb SECTION_BG = new DeviceRgb(240, 240, 242);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(200, 200, 205);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(30, 30, 30);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(100, 100, 100);

    public byte[] generatePdf(Long id) {
        RadioChecklist checklist = radioChecklistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Checklist não encontrado com ID: " + id));

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4);

            Document document = new Document(pdfDoc);
            document.setMargins(25, 30, 25, 30);

            // 1. Cabeçalho Principal Oficial
            addHeader(document, checklist);

            // 2. Dados da Retirada/Entrega
            addDadosRetiradaEntrega(document, checklist);

            // 3. Seções do Checklist
            addChecklistSections(document, checklist);

            // 4. Observações (se houver)
            if (checklist.getObservations() != null && !checklist.getObservations().isBlank()) {
                addObservations(document, checklist.getObservations());
            }

            // 5. Declaração de Conformidade
            addDeclaracaoConformidade(document, checklist);

            // 6. Bloco de Assinaturas
            addAssinaturas(document, checklist);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do checklist de rádio HT", e);
            throw new RuntimeException("Erro ao gerar PDF do checklist de rádio HT", e);
        }
    }

    private void addHeader(Document document, RadioChecklist checklist) {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{70, 30}));
        headerTable.setWidth(UnitValue.createPercentValue(100));
        headerTable.setBorder(Border.NO_BORDER);

        // Título e código
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER);
        Paragraph title = new Paragraph("CHECKLIST DE INSPEÇÃO RÁPIDA: RADIOCOMUNICAÇÃO (HT)")
                .setFontSize(11)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMargin(0);
        
        String docDateStr = checklist.getDocumentDate() != null ? checklist.getDocumentDate().format(DATE_FORMATTER) : "06/07/2026";
        Paragraph subTitle = new Paragraph(String.format("Código: %s | Versão: %s | Data: %s",
                checklist.getDocumentCode() != null ? checklist.getDocumentCode() : "CK-ALMOX-HT",
                checklist.getDocumentVersion() != null ? checklist.getDocumentVersion() : "02",
                docDateStr))
                .setFontSize(8)
                .setFontColor(TEXT_MUTED)
                .setMarginTop(2);

        leftCell.add(title);
        leftCell.add(subTitle);
        headerTable.addCell(leftCell);

        // Tipo de Movimentação (Badge)
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        String movementLabel = checklist.getMovementType() == RadioChecklist.MovementType.RETIRADA 
                ? "RETIRADA (Início Turno)" 
                : "DEVOLUÇÃO (Fim Turno)";
        
        Paragraph badge = new Paragraph(movementLabel)
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(ColorConstants.BLACK)
                .setBackgroundColor(new DeviceRgb(254, 240, 138)) // Amarelo suave
                .setPadding(4)
                .setTextAlignment(TextAlignment.CENTER)
                .setWidth(UnitValue.createPercentValue(95))
                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
        rightCell.add(badge);
        headerTable.addCell(rightCell);

        document.add(headerTable);

        // Linha divisória
        document.add(new Paragraph().setMargin(0).setPadding(0).setBorderBottom(new SolidBorder(BORDER_COLOR, 1f)).setMarginBottom(8));
    }

    private void addDadosRetiradaEntrega(Document document, RadioChecklist checklist) {
        Paragraph secTitle = new Paragraph("Dados da Retirada/Entrega:")
                .setFontSize(9.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMarginBottom(4);
        document.add(secTitle);

        Table table = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBackgroundColor(new DeviceRgb(248, 249, 250));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(10);

        String dataHoraStr = String.format("%s   Hora: %s",
                checklist.getChecklistDate() != null ? checklist.getChecklistDate().format(DATE_FORMATTER) : "--/--/----",
                checklist.getChecklistTime() != null ? checklist.getChecklistTime().format(TIME_FORMATTER) : "--:--");
        
        table.addCell(createDataCell("• Data / Hora:", dataHoraStr));
        
        String vigilanteStr = String.format("%s (RE/Matrícula: %s)",
                checklist.getVigilanteName() != null ? checklist.getVigilanteName() : "__________________________",
                checklist.getVigilanteRegistration() != null ? checklist.getVigilanteRegistration() : "________");
        table.addCell(createDataCell("• Nome do Vigilante:", vigilanteStr));

        table.addCell(createDataCell("• Setor / Posto de Trabalho:", checklist.getWorkPostName() != null ? checklist.getWorkPostName() : "___________________________________"));
        
        String radioStr = String.format("ID/Patrimônio: %s | Nº de Série (S/N): %s",
                checklist.getRadioAssetId() != null ? checklist.getRadioAssetId() : "_______________",
                checklist.getRadioSerialNumber() != null ? checklist.getRadioSerialNumber() : "_______________");
        table.addCell(createDataCell("• Identificação do Rádio:", radioStr));

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

    private void addChecklistSections(Document document, RadioChecklist checklist) {
        // Seção 1: Inspeção Física e Estrutural
        addSectionHeader(document, "1. Inspeção Física e Estrutural (Visual)");
        addChecklistItem(document, checklist.getCarcacaExterna(), "Carcaça Externa:", "Sem trincas, rachaduras ou marcas profundas de queda");
        addChecklistItem(document, checklist.getAntena(), "Antena:", "Rosqueada até o fim, reta e sem a borracha protetora rasgada ou exposta");
        addChecklistItem(document, checklist.getClipCinto(), "Clip de Cinto:", "Fixado firmemente na parte traseira, sem folgas e com a mola com pressão.");
        addChecklistItem(document, checklist.getConectorAcessorios(), "Conector de Acessórios:", "Tampa protetora lateral presente (proteção contra poeira/chuva)");

        // Seção 2: Alimentação e Bateria
        addSectionHeader(document, "2. Alimentação e Bateria");
        addChecklistItem(document, checklist.getEncaixeBateria(), "Encaixe da Bateria:", "Trava inferior ou lateral funcionando, sem folga entre a bateria e o rádio.");
        addChecklistItem(document, checklist.getNivelCarga(), "Nível de Carga:", "Rádio liga normalmente e o visor/LED indica carga total (100%).");
        addChecklistItem(document, checklist.getContatosCarga(), "Contatos de Carga:", "Pinos dourados da bateria limpos, sem oxidação ou azedamento.");

        // Seção 3: Teste de Funcionamento Operacional
        addSectionHeader(document, "3. Teste de Funcionamento Operacional (Áudio e Sinal)");
        addChecklistItem(document, checklist.getBotaoVolume(), "Botão de Volume / Liga-Desliga:", "Gira suavemente, liga o aparelho e ajusta o som sem chiados.");
        addChecklistItem(document, checklist.getSeletorCanais(), "Seletor de Canais:", "Alterna os canais perfeitamente e emite o bipe/aviso de canal correto.");
        addChecklistItem(document, checklist.getBotaoPtt(), "Botão PTT (Transmissão):", "Botão emborrachado lateral macio; aciona o LED vermelho instantaneamente ao ser pressionado.");
        addChecklistItem(document, checklist.getTesteComunicacaoPratica(), "Teste de Comunicação Prática:", "Transmissão enviada para a base limpa e recepção de áudio sem cortes ou som abafado (alto-falante ok).");

        // Seção 4: Acessórios Adicionais
        addSectionHeader(document, "4. Acessórios Adicionais (Se houver no posto)");
        addChecklistItem(document, checklist.getFoneOuvidoLapela(), "Fone de Ouvido / Lapela:", "Fios sem cortes, microfone transmitindo e áudio saindo no fone.");
        addChecklistItem(document, checklist.getCarregadorMesaFonte(), "Carregador de Mesa / Fonte:", "Tomada sem pinos tortos e LED da base acende ao plugar na energia.");
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
                .setFontColor(checked ? new DeviceRgb(22, 101, 52) : TEXT_MUTED) // Verde se marcado
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

    private void addDeclaracaoConformidade(Document document, RadioChecklist checklist) {
        document.add(new Paragraph().setMargin(0).setPadding(0).setBorderBottom(new SolidBorder(BORDER_COLOR, 0.5f)).setMarginTop(6).setMarginBottom(6));

        Paragraph title = new Paragraph("Declaração de Conformidade:")
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMarginBottom(2);
        document.add(title);

        Paragraph texto = new Paragraph("Declaro que o equipamento acima foi testado na minha presença e entregue em perfeitas condições de uso e conservação para o cumprimento do meu turno de trabalho.")
                .setFontSize(7.5f)
                .setItalic()
                .setFontColor(TEXT_DARK)
                .setMarginBottom(12);
        document.add(texto);
    }

    private void addAssinaturas(Document document, RadioChecklist checklist) {
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{100}));
        sigTable.setWidth(UnitValue.createPercentValue(60));
        sigTable.setHorizontalAlignment(HorizontalAlignment.CENTER);
        sigTable.setBorder(Border.NO_BORDER);

        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(6).setTextAlignment(TextAlignment.CENTER);
        String sigBase64 = checklist.getAlmoxarifeSignatureBase64() != null && !checklist.getAlmoxarifeSignatureBase64().isBlank()
                ? checklist.getAlmoxarifeSignatureBase64()
                : checklist.getVigilanteSignatureBase64();

        if (sigBase64 != null && !sigBase64.isBlank()) {
            try {
                String base64Data = cleanBase64(sigBase64);
                byte[] imgBytes = Base64.getDecoder().decode(base64Data);
                Image sigImg = new Image(ImageDataFactory.create(imgBytes));
                sigImg.setMaxHeight(40);
                sigImg.setHorizontalAlignment(HorizontalAlignment.CENTER);
                cell.add(sigImg);
            } catch (Exception e) {
                log.warn("Não foi possível renderizar imagem de assinatura do supervisor/gestor", e);
            }
        } else {
            cell.add(new Paragraph("_________________________________________").setFontSize(8).setFontColor(TEXT_MUTED).setMarginBottom(2));
        }

        Paragraph label = new Paragraph("Assinatura do Supervisor / Gestor Operacional")
                .setFontSize(8.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMargin(0);

        String nomeSupervisor = checklist.getAlmoxarifeName() != null && !checklist.getAlmoxarifeName().isBlank()
                ? checklist.getAlmoxarifeName()
                : "Supervisor / Gestor Operacional";

        Paragraph nome = new Paragraph(nomeSupervisor)
                .setFontSize(8)
                .setFontColor(TEXT_MUTED)
                .setMargin(0);

        cell.add(label);
        cell.add(nome);
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
