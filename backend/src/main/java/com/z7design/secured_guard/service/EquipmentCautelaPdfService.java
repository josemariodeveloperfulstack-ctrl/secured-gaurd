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
import com.z7design.secured_guard.model.EquipmentCautela;
import com.z7design.secured_guard.repository.EquipmentCautelaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class EquipmentCautelaPdfService {

    private final EquipmentCautelaRepository repository;

    private static final DeviceRgb SECTION_BG = new DeviceRgb(240, 240, 242);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(200, 200, 205);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(30, 30, 30);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(90, 90, 90);

    public byte[] generatePdf(Long id) {
        EquipmentCautela cautela = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Termo de cautela não encontrado com ID: " + id));

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4);

            Document document = new Document(pdfDoc);
            document.setMargins(22, 28, 22, 28);

            // 1. Cabeçalho
            addHeader(document, cautela);

            // 2. Preâmbulo
            addPreambulo(document, cautela);

            // 3. Seção 1: Dados do Colaborador
            addSecaoColaborador(document, cautela);

            // 4. Seção 2: Especificação dos Materiais / Equipamentos
            addSecaoEquipamentos(document, cautela);

            // 5. Seção 3: Compromissos e Responsabilidades do Empregado
            addSecaoResponsabilidades(document, cautela);

            // 6. Data e Assinaturas
            addAssinaturas(document, cautela);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do termo de cautela de equipamentos", e);
            throw new RuntimeException("Erro ao gerar PDF do termo de cautela de equipamentos", e);
        }
    }

    private void addHeader(Document document, EquipmentCautela cautela) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{75, 25}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBorder(Border.NO_BORDER);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER);
        Paragraph title = new Paragraph("TERMO DE CAUTELA E RESPONSABILIDADE DE EQUIPAMENTOS")
                .setFontSize(11)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMargin(0);

        String company = cautela.getCompanyName() != null ? cautela.getCompanyName() : "SECURED GUARD SEGURANÇA PRIVADA";
        Paragraph sub = new Paragraph("Gestão Operacional de Materiais e Equipamentos | " + company)
                .setFontSize(8)
                .setFontColor(TEXT_MUTED)
                .setMarginTop(2);

        leftCell.add(title);
        leftCell.add(sub);
        table.addCell(leftCell);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        Paragraph badge = new Paragraph("CAUTELA OPERACIONAL")
                .setFontSize(8)
                .setBold()
                .setFontColor(ColorConstants.BLACK)
                .setBackgroundColor(new DeviceRgb(254, 240, 138))
                .setPadding(3.5f)
                .setTextAlignment(TextAlignment.CENTER)
                .setWidth(UnitValue.createPercentValue(95))
                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
        rightCell.add(badge);
        table.addCell(rightCell);

        document.add(table);
        document.add(new Paragraph().setMargin(0).setPadding(0).setBorderBottom(new SolidBorder(BORDER_COLOR, 1f)).setMarginBottom(6));
    }

    private void addPreambulo(Document document, EquipmentCautela cautela) {
        String company = cautela.getCompanyName() != null ? cautela.getCompanyName() : "SECURED GUARD SEGURANÇA PRIVADA";
        Paragraph p = new Paragraph(String.format(
                "Pelo presente instrumento, eu, o(a) funcionário(a) abaixo identificado(a), declaro que recebi da empresa %s, a título de empréstimo (cautela) para uso exclusivo no desempenho de minhas funções profissionais, o(s) equipamento(s) e/ou material(is) especificado(s) neste termo:",
                company
        )).setFontSize(7.8f).setFontColor(TEXT_DARK).setMarginBottom(6).setTextAlignment(TextAlignment.JUSTIFIED);
        document.add(p);
    }

    private void addSecaoColaborador(Document document, EquipmentCautela cautela) {
        addSectionHeader(document, "1. DADOS DO COLABORADOR");

        Table table = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBackgroundColor(new DeviceRgb(248, 249, 250));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(6);

        table.addCell(createDataCell("• Nome Completo:", cautela.getEmployeeName() != null ? cautela.getEmployeeName() : "___________________________________"));

        String matCpf = String.format("Matrícula: %s   CPF: %s",
                cautela.getRegistration() != null ? cautela.getRegistration() : "________",
                cautela.getCpf() != null ? cautela.getCpf() : "___________________");
        table.addCell(createDataCell("• Identificação:", matCpf));

        table.addCell(createDataCell("• Cargo / Função:", cautela.getJobTitle() != null ? cautela.getJobTitle() : "Vigilante / Operador"));
        table.addCell(createDataCell("• Setor de Trabalho:", cautela.getWorkPostName() != null ? cautela.getWorkPostName() : "___________________"));

        document.add(table);
    }

    private void addSecaoEquipamentos(Document document, EquipmentCautela cautela) {
        addSectionHeader(document, "2. ESPECIFICAÇÃO DOS MATERIAIS / EQUIPAMENTOS");

        Table table = new Table(UnitValue.createPercentArray(new float[]{10, 55, 35}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(6);

        // Header
        table.addHeaderCell(createTableHeaderCell("Item"));
        table.addHeaderCell(createTableHeaderCell("Descrição do Equipamento"));
        table.addHeaderCell(createTableHeaderCell("Marca / Modelo / Nº Série"));

        // Item 01
        addEquipmentRow(table, "01", "Rádio Transceptor (HT) com bateria", cautela.getItem1HtMarcaModelo(), cautela.getItem1HtEntregue());

        // Item 02
        addEquipmentRow(table, "02", "Carregador de Bateria HT", cautela.getItem2CarregadorMarcaModelo(), cautela.getItem2CarregadorEntregue());

        // Item 03
        addEquipmentRow(table, "03", "Lanterna Tática com Bateria", cautela.getItem3LanternaMarcaModelo(), cautela.getItem3LanternaEntregue());

        // Item 04
        addEquipmentRow(table, "04", "Bastão de Ronda Eletrônico", cautela.getItem4BastaoMarcaModelo(), cautela.getItem4BastaoEntregue());

        // Item 05 / 06
        String outrosDesc = cautela.getItem5OutrosDescricao() != null && !cautela.getItem5OutrosDescricao().isBlank() 
                ? "Outros: " + cautela.getItem5OutrosDescricao() 
                : "Outros: ___________________________";
        boolean item5Entregue = cautela.getItem5OutrosDescricao() != null && !cautela.getItem5OutrosDescricao().isBlank();
        addEquipmentRow(table, "05", outrosDesc, cautela.getItem5OutrosMarcaModelo(), item5Entregue);

        document.add(table);
    }

    private void addEquipmentRow(Table table, String itemNum, String descricao, String marcaModelo, Boolean entregue) {
        boolean isChecked = Boolean.TRUE.equals(entregue);
        String symbol = isChecked ? "[X] " : "[ ] ";

        Cell cellNum = new Cell().setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(3).setTextAlignment(TextAlignment.CENTER);
        cellNum.add(new Paragraph(itemNum).setFontSize(7.5f).setBold().setFontColor(TEXT_DARK));
        table.addCell(cellNum);

        Cell cellDesc = new Cell().setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(3).setPaddingLeft(5);
        Paragraph pDesc = new Paragraph()
                .add(new Text(symbol).setFontSize(7.5f).setBold().setFontColor(isChecked ? new DeviceRgb(22, 101, 52) : TEXT_MUTED))
                .add(new Text(descricao).setFontSize(7.5f).setFontColor(TEXT_DARK));
        cellDesc.add(pDesc);
        table.addCell(cellDesc);

        Cell cellMarca = new Cell().setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(3).setPaddingLeft(5);
        String mm = marcaModelo != null && !marcaModelo.isBlank() ? marcaModelo : "____________________";
        cellMarca.add(new Paragraph(mm).setFontSize(7.5f).setFontColor(TEXT_DARK));
        table.addCell(cellMarca);
    }

    private void addSecaoResponsabilidades(Document document, EquipmentCautela cautela) {
        addSectionHeader(document, "3. COMPROMISSOS E RESPONSABILIDADES DO EMPREGADO");

        Paragraph intro = new Paragraph("Ao assinar este termo, assumo a total responsabilidade pelo zelo, guarda e conservação dos itens acima listados, ciente das seguintes obrigações:")
                .setFontSize(7.3f)
                .setFontColor(TEXT_DARK)
                .setMarginBottom(3);
        document.add(intro);

        Table clausulasTable = new Table(UnitValue.createPercentArray(new float[]{100}));
        clausulasTable.setWidth(UnitValue.createPercentValue(100));
        clausulasTable.setBorder(Border.NO_BORDER);

        clausulasTable.addCell(createClausulaCell("1. Uso Exclusivo: ",
                "Utilizar os equipamentos única e exclusivamente para fins profissionais a serviço da empresa, sendo expressamente proibido o uso particular ou a cessão a terceiros não autorizados."));

        clausulasTable.addCell(createClausulaCell("2. Conservação: ",
                "Zelar pela manutenção preventiva, limpeza e integridade física dos materiais, reportando imediatamente ao almoxarifado qualquer defeito, falha de funcionamento ou desgaste natural."));

        clausulasTable.addCell(createClausulaCell("3. Extravio e Danos por Negligência: ",
                "Em caso de perda, roubo, furto, extravio ou danos decorrentes de uso inadequado, negligência ou imperícia, autorizo desde já o desconto do valor de mercado do equipamento em minha folha de pagamento, conforme o artigo 462, § 1º da CLT."));

        clausulasTable.addCell(createClausulaCell("4. Ocorrências Policiais: ",
                "Em caso de roubo ou furto do equipamento em serviço, comprometo-me a registrar imediatamente o Boletim de Ocorrência (B.O.) e apresentar cópia à empresa em até 24 horas."));

        clausulasTable.addCell(createClausulaCell("5. Devolução: ",
                "Devolver todos os itens listados em perfeitas condições de uso (salvo o desgaste natural) sempre que solicitado pela empresa, no momento de trocas de posto ou imediatamente em caso de rescisão do contrato de trabalho."));

        document.add(clausulasTable);

        Paragraph encerramento = new Paragraph("Por ser a expressão da verdade, firmo o presente termo em 02 (duas) vias de igual teor.")
                .setFontSize(7.3f)
                .setItalic()
                .setFontColor(TEXT_DARK)
                .setMarginTop(3)
                .setMarginBottom(4);
        document.add(encerramento);
    }

    private Cell createTableHeaderCell(String text) {
        Cell cell = new Cell().setBackgroundColor(SECTION_BG).setBorder(new SolidBorder(BORDER_COLOR, 0.5f)).setPadding(3);
        cell.add(new Paragraph(text).setFontSize(7.5f).setBold().setFontColor(TEXT_DARK));
        return cell;
    }

    private Cell createClausulaCell(String title, String text) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(1).setPaddingBottom(2.5f);
        Paragraph p = new Paragraph()
                .add(new Text(title).setFontSize(7.2f).setBold().setFontColor(TEXT_DARK))
                .add(new Text(text).setFontSize(7f).setFontColor(TEXT_DARK));
        p.setTextAlignment(TextAlignment.JUSTIFIED);
        cell.add(p);
        return cell;
    }

    private void addAssinaturas(Document document, EquipmentCautela cautela) {
        String cityUf = cautela.getCityUf() != null ? cautela.getCityUf() : "São Paulo - SP";
        String dateStr = cautela.getTermDate() != null
                ? cautela.getTermDate().format(DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", new Locale("pt", "BR")))
                : "____ de ____________________ de 20____";

        Paragraph localData = new Paragraph(String.format("%s, %s.", cityUf, dateStr))
                .setFontSize(7.5f)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(TEXT_DARK)
                .setMarginBottom(8);
        document.add(localData);

        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
        sigTable.setWidth(UnitValue.createPercentValue(100));
        sigTable.setBorder(Border.NO_BORDER);

        // Assinatura do Funcionário
        Cell funcCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4).setTextAlignment(TextAlignment.CENTER);
        if (cautela.getEmployeeSignatureBase64() != null && !cautela.getEmployeeSignatureBase64().isBlank()) {
            try {
                byte[] imgBytes = Base64.getDecoder().decode(cleanBase64(cautela.getEmployeeSignatureBase64()));
                Image img = new Image(ImageDataFactory.create(imgBytes));
                img.setMaxHeight(32);
                img.setHorizontalAlignment(HorizontalAlignment.CENTER);
                funcCell.add(img);
            } catch (Exception e) {
                log.warn("Erro ao renderizar assinatura do funcionário", e);
            }
        } else {
            funcCell.add(new Paragraph("_________________________________________").setFontSize(7.5f).setFontColor(TEXT_MUTED).setMarginBottom(1));
        }
        funcCell.add(new Paragraph("Assinatura do(a) Funcionário(a)").setFontSize(7.5f).setBold().setFontColor(TEXT_DARK).setMargin(0));
        funcCell.add(new Paragraph(cautela.getEmployeeName() != null ? cautela.getEmployeeName() : "").setFontSize(7f).setFontColor(TEXT_MUTED).setMargin(0));
        sigTable.addCell(funcCell);

        // Assinatura do Almoxarife
        Cell almCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4).setTextAlignment(TextAlignment.CENTER);
        if (cautela.getAlmoxarifeSignatureBase64() != null && !cautela.getAlmoxarifeSignatureBase64().isBlank()) {
            try {
                byte[] imgBytes = Base64.getDecoder().decode(cleanBase64(cautela.getAlmoxarifeSignatureBase64()));
                Image img = new Image(ImageDataFactory.create(imgBytes));
                img.setMaxHeight(32);
                img.setHorizontalAlignment(HorizontalAlignment.CENTER);
                almCell.add(img);
            } catch (Exception e) {
                log.warn("Erro ao renderizar assinatura do almoxarife", e);
            }
        } else {
            almCell.add(new Paragraph("_________________________________________").setFontSize(7.5f).setFontColor(TEXT_MUTED).setMarginBottom(1));
        }
        almCell.add(new Paragraph("Assinatura e Carimbo do Almoxarife / Responsável").setFontSize(7.5f).setBold().setFontColor(TEXT_DARK).setMargin(0));
        almCell.add(new Paragraph(cautela.getAlmoxarifeName() != null ? cautela.getAlmoxarifeName() : "Responsável pelo Almoxarifado").setFontSize(7f).setFontColor(TEXT_MUTED).setMargin(0));
        sigTable.addCell(almCell);

        document.add(sigTable);
    }

    private void addSectionHeader(Document document, String title) {
        Paragraph p = new Paragraph(title)
                .setFontSize(8f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setBackgroundColor(SECTION_BG)
                .setPadding(2.5f)
                .setPaddingLeft(4)
                .setMarginTop(3)
                .setMarginBottom(2.5f)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        document.add(p);
    }

    private Cell createDataCell(String label, String value) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(2).setPaddingLeft(4);
        Paragraph p = new Paragraph()
                .add(new Text(label + " ").setFontSize(7.3f).setBold().setFontColor(TEXT_DARK))
                .add(new Text(value).setFontSize(7.3f).setFontColor(TEXT_DARK));
        cell.add(p);
        return cell;
    }

    private String cleanBase64(String raw) {
        if (raw == null) return "";
        if (raw.contains(",")) {
            return raw.substring(raw.indexOf(",") + 1);
        }
        return raw;
    }
}
