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
import com.z7design.secured_guard.model.FirearmAcautelamento;
import com.z7design.secured_guard.repository.FirearmAcautelamentoRepository;
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
public class FirearmAcautelamentoPdfService {

    private final FirearmAcautelamentoRepository repository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final DeviceRgb SECTION_BG = new DeviceRgb(240, 240, 242);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(200, 200, 205);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(30, 30, 30);
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(90, 90, 90);

    public byte[] generatePdf(Long id) {
        FirearmAcautelamento termo = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Termo de acautelamento não encontrado com ID: " + id));

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4);

            Document document = new Document(pdfDoc);
            document.setMargins(20, 28, 20, 28);

            // 1. Cabeçalho
            addHeader(document, termo);

            // 2. Preâmbulo
            addPreambulo(document, termo);

            // 3. Seção 1: Dados do Vigilante
            addSecaoVigilante(document, termo);

            // 4. Seção 2: Especificação do Armamento
            addSecaoArmamento(document, termo);

            // 5. Seção 3: Declaração de Inspeção Visual e Funcional
            addSecaoInspecao(document, termo);

            // 6. Seção 4: Obrigações e Cláusulas da Polícia Federal e CLT
            addSecaoClausulas(document, termo);

            // 7. Data e Assinaturas
            addAssinaturas(document, termo);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do termo de acautelamento de arma", e);
            throw new RuntimeException("Erro ao gerar PDF do termo de acautelamento de arma", e);
        }
    }

    private void addHeader(Document document, FirearmAcautelamento termo) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{75, 25}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBorder(Border.NO_BORDER);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER);
        Paragraph title = new Paragraph("TERMO DE ACAUTELAMENTO E RESPONSABILIDADE DE ARMA DE FOGO E MUNIÇÃO")
                .setFontSize(10.5f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setMargin(0);

        String company = termo.getCompanyName() != null ? termo.getCompanyName() : "SECURED GUARD SEGURANÇA PRIVADA";
        Paragraph sub = new Paragraph("Empresa Autorizada a Funcionar pela Polícia Federal | " + company)
                .setFontSize(7.5f)
                .setFontColor(TEXT_MUTED)
                .setMarginTop(1.5f);

        leftCell.add(title);
        leftCell.add(sub);
        table.addCell(leftCell);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT);
        Paragraph badge = new Paragraph("ACAUTELAMENTO OPERACIONAL")
                .setFontSize(7.5f)
                .setBold()
                .setFontColor(ColorConstants.BLACK)
                .setBackgroundColor(new DeviceRgb(254, 240, 138))
                .setPadding(3)
                .setTextAlignment(TextAlignment.CENTER)
                .setWidth(UnitValue.createPercentValue(95))
                .setHorizontalAlignment(HorizontalAlignment.RIGHT);
        rightCell.add(badge);
        table.addCell(rightCell);

        document.add(table);
        document.add(new Paragraph().setMargin(0).setPadding(0).setBorderBottom(new SolidBorder(BORDER_COLOR, 1f)).setMarginBottom(6));
    }

    private void addPreambulo(Document document, FirearmAcautelamento termo) {
        String company = termo.getCompanyName() != null ? termo.getCompanyName() : "SECURED GUARD SEGURANÇA PRIVADA";
        Paragraph p = new Paragraph(String.format(
                "Pelo presente instrumento, eu, o(a) vigilante abaixo identificado(a), devidamente registrado(a) e com a reciclagem profissional válida, declaro que recebi da empresa %s, autorizada a funcionar pela Polícia Federal, a título de acautelamento operacional para o estrito exercício de minhas funções profissionais durante o meu turno de trabalho, a arma de fogo, munições e acessórios descritos neste termo:",
                company
        )).setFontSize(7.5f).setFontColor(TEXT_DARK).setMarginBottom(5).setTextAlignment(TextAlignment.JUSTIFIED);
        document.add(p);
    }

    private void addSecaoVigilante(Document document, FirearmAcautelamento termo) {
        addSectionHeader(document, "1. DADOS DO VIGILANTE");

        Table table = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBackgroundColor(new DeviceRgb(248, 249, 250));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(5);

        table.addCell(createDataCell("• Nome Completo:", termo.getVigilanteName() != null ? termo.getVigilanteName() : "___________________________________"));
        
        String matCnv = String.format("Matrícula: %s   CNV Nº: %s",
                termo.getRegistration() != null ? termo.getRegistration() : "________",
                termo.getCnvNumber() != null ? termo.getCnvNumber() : "________");
        table.addCell(createDataCell("• Registro:", matCnv));

        String cpfPosto = String.format("CPF: %s | Setor: %s",
                termo.getCpf() != null ? termo.getCpf() : "___________________",
                termo.getWorkPostName() != null ? termo.getWorkPostName() : "___________________");
        table.addCell(createDataCell("• Documento / Setor de Trabalho:", cpfPosto));

        String recicStr = termo.getRecyclingExpirationDate() != null ? termo.getRecyclingExpirationDate().format(DATE_FORMATTER) : "__/__/____";
        table.addCell(createDataCell("• Venc. Reciclagem:", recicStr));

        document.add(table);
    }

    private void addSecaoArmamento(Document document, FirearmAcautelamento termo) {
        addSectionHeader(document, "2. ESPECIFICAÇÃO DO ARMAMENTO, MUNIÇÃO E ACESSÓRIOS");

        Table table = new Table(UnitValue.createPercentArray(new float[]{50, 50}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBackgroundColor(new DeviceRgb(248, 249, 250));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(5);

        String especieStr = String.format("%s Revólver   %s Pistola   %s Espingarda   %s Outra: %s",
                "Revólver".equalsIgnoreCase(termo.getWeaponType()) ? "[X]" : "[ ]",
                "Pistola".equalsIgnoreCase(termo.getWeaponType()) ? "[X]" : "[ ]",
                "Espingarda".equalsIgnoreCase(termo.getWeaponType()) ? "[X]" : "[ ]",
                (termo.getWeaponType() != null && !termo.getWeaponType().matches("(?i)Revólver|Pistola|Espingarda")) ? "[X]" : "[ ]",
                (termo.getWeaponType() != null && !termo.getWeaponType().matches("(?i)Revólver|Pistola|Espingarda")) ? termo.getWeaponType() : "___");
        table.addCell(createDataCell("• Espécie da Arma:", especieStr));

        String marcaCal = String.format("Marca: %s | Calibre: %s | Capacidade: %s tiros",
                termo.getBrand() != null ? termo.getBrand() : "________",
                termo.getCaliber() != null ? termo.getCaliber() : "________",
                termo.getShotCapacity() != null ? String.valueOf(termo.getShotCapacity()) : "____");
        table.addCell(createDataCell("• Marca / Calibre:", marcaCal));

        String serieCraf = String.format("Nº de Série: %s | Nº do CRAF (PF): %s",
                termo.getSerialNumber() != null ? termo.getSerialNumber() : "________________",
                termo.getCrafNumber() != null ? termo.getCrafNumber() : "________________");
        table.addCell(createDataCell("• Identificação:", serieCraf));

        String munStr = String.format("%s un (%s Intactas/Novas  %s Manejo/Treino)",
                termo.getAmmoQuantity() != null ? String.valueOf(termo.getAmmoQuantity()) : "____",
                !"Manejo".equalsIgnoreCase(termo.getAmmoType()) ? "[X]" : "[ ]",
                "Manejo".equalsIgnoreCase(termo.getAmmoType()) ? "[X]" : "[ ]");
        table.addCell(createDataCell("• Quantidade Munições:", munStr));

        table.addCell(createDataCell("• Lote da Munição:", termo.getAmmoLot() != null ? termo.getAmmoLot() : "Não informado"));
        table.addCell(createDataCell("• Acessórios Acautelados:", termo.getAccessories() != null ? termo.getAccessories() : "Coldre tático / Porta-carregador"));

        document.add(table);
    }

    private void addSecaoInspecao(Document document, FirearmAcautelamento termo) {
        addSectionHeader(document, "3. DECLARAÇÃO DE INSPEÇÃO VISUAL E FUNCIONAL");

        Paragraph sub = new Paragraph("O(A) vigilante acima qualificado(a) declara que inspecionou o armamento no ato do recebimento, constatando:")
                .setFontSize(7.3f)
                .setFontColor(TEXT_DARK)
                .setMarginBottom(3);
        document.add(sub);

        Table table = new Table(UnitValue.createPercentArray(new float[]{33, 33, 34}));
        table.setWidth(UnitValue.createPercentValue(100));
        table.setBackgroundColor(new DeviceRgb(248, 249, 250));
        table.setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        table.setMarginBottom(5);

        String disparoOk = Boolean.TRUE.equals(termo.getMecanismoDisparoOk()) ? "[X] Sim  [ ] Não" : "[ ] Sim  [X] Não";
        table.addCell(createDataCell("• Mecanismo e Travas OK:", disparoOk));

        String canoOk = Boolean.TRUE.equals(termo.getCanoDesobstruidoOk()) ? "[X] Sim  [ ] Não" : "[ ] Sim  [X] Não";
        table.addCell(createDataCell("• Cano Desobstruído/Limpo:", canoOk));

        String estadoStr = String.format("%s Excelente  %s Bom  %s Regular",
                "Excelente".equalsIgnoreCase(termo.getConservationState()) ? "[X]" : "[ ]",
                "Bom".equalsIgnoreCase(termo.getConservationState()) ? "[X]" : "[ ]",
                "Regular".equalsIgnoreCase(termo.getConservationState()) ? "[X]" : "[ ]");
        document.add(table);

        if (termo.getPhotoBase64() != null && !termo.getPhotoBase64().isBlank()) {
            try {
                String base64Data = cleanBase64(termo.getPhotoBase64());
                byte[] imgBytes = Base64.getDecoder().decode(base64Data);
                Image photoImg = new Image(ImageDataFactory.create(imgBytes));
                photoImg.setMaxHeight(80);
                photoImg.setHorizontalAlignment(HorizontalAlignment.CENTER);
                
                Paragraph pHeader = new Paragraph("• Registro Fotográfico do Armamento/Inspeção:")
                        .setFontSize(7.5f)
                        .setBold()
                        .setFontColor(TEXT_DARK)
                        .setMarginTop(2)
                        .setMarginBottom(2);
                document.add(pHeader);
                document.add(photoImg);
            } catch (Exception e) {
                log.warn("Não foi possível renderizar foto do acautelamento no PDF", e);
            }
        }
    }

    private void addSecaoClausulas(Document document, FirearmAcautelamento termo) {
        addSectionHeader(document, "4. OBRIGAÇÕES, REGRAS DA POLÍCIA FEDERAL E RESPONSABILIDADES");

        Paragraph intro = new Paragraph("Ao assinar este termo, o(a) vigilante assume total responsabilidade penal, civil e administrativa pelo armamento, sujeitando-se às seguintes cláusulas:")
                .setFontSize(7.2f)
                .setFontColor(TEXT_DARK)
                .setMarginBottom(3);
        document.add(intro);

        Table clausulasTable = new Table(UnitValue.createPercentArray(new float[]{100}));
        clausulasTable.setWidth(UnitValue.createPercentValue(100));
        clausulasTable.setBorder(Border.NO_BORDER);

        clausulasTable.addCell(createClausulaCell("1. Uso Restrito e Localizado: ", 
                "O armamento e as munições destinam-se exclusivamente ao uso em serviço no posto de trabalho designado. É expressamente proibido portar ou deslocar-se com o armamento fora do perímetro do posto de serviço ou após o término do turno, salvo determinação expressa em Ordem de Serviço de Escolta Armada ou Transporte de Valores."));

        clausulasTable.addCell(createClausulaCell("2. Guarda Seguro e Devolução: ", 
                "Ao término do turno de trabalho, o armamento deve ser imediatamente devolvido à armaria da empresa ou guardado no cofre homologado do posto de serviço (conforme o plano de segurança aprovado pela PF), colhendo-se a respectiva assinatura de baixa."));

        clausulasTable.addCell(createClausulaCell("3. Disparo de Arma de Fogo: ", 
                "Qualquer disparo efetuado em serviço — seja acidental, de advertência ou em legítima defesa — deverá ser comunicado imediatamente ao plantão operacional da empresa, seguido obrigatoriamente da confecção de Relatório de Ocorrência detalhado e do registro policial cabível."));

        clausulasTable.addCell(createClausulaCell("4. Ocorrências com o Armamento (Furto, Roubo ou Extravio): ", 
                "Em caso de subtração do armamento por qualquer meio, o(a) vigilante deve comunicar imediatamente a empresa por rádio/telefone e registrar o Boletim de Ocorrência na Polícia Civil. O prazo máximo para a empresa comunicar a Polícia Federal é de 24 horas, sob pena de sanções severas."));

        clausulasTable.addCell(createClausulaCell("5. Indenização por Culpa/Dolo: ", 
                "Danos causados ao armamento por negligência, imprudência, imperícia, falta de limpeza básica em serviço ou modificações não autorizadas na mecânica da arma ensejarão o ressarcimento dos prejuízos à empresa, nos termos do art. 462, § 1º da CLT."));

        document.add(clausulasTable);

        Paragraph encerramento = new Paragraph("Por ser a expressão da verdade e estando ciente das penalidades previstas no Estatuto do Desarmamento (Lei nº 10.826/03), firmo o presente termo.")
                .setFontSize(7.2f)
                .setItalic()
                .setFontColor(TEXT_DARK)
                .setMarginTop(3)
                .setMarginBottom(4);
        document.add(encerramento);
    }

    private Cell createClausulaCell(String title, String text) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(1).setPaddingBottom(2);
        Paragraph p = new Paragraph()
                .add(new Text(title).setFontSize(7).setBold().setFontColor(TEXT_DARK))
                .add(new Text(text).setFontSize(6.8f).setFontColor(TEXT_DARK));
        p.setTextAlignment(TextAlignment.JUSTIFIED);
        cell.add(p);
        return cell;
    }

    private void addAssinaturas(Document document, FirearmAcautelamento termo) {
        String cityUf = termo.getCityUf() != null ? termo.getCityUf() : "São Paulo - SP";
        String dateStr = termo.getTermDate() != null 
                ? termo.getTermDate().format(DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", new Locale("pt", "BR")))
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

        // Assinatura do Vigilante
        Cell vigCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4).setTextAlignment(TextAlignment.CENTER);
        if (termo.getVigilanteSignatureBase64() != null && !termo.getVigilanteSignatureBase64().isBlank()) {
            try {
                byte[] imgBytes = Base64.getDecoder().decode(cleanBase64(termo.getVigilanteSignatureBase64()));
                Image img = new Image(ImageDataFactory.create(imgBytes));
                img.setMaxHeight(32);
                img.setHorizontalAlignment(HorizontalAlignment.CENTER);
                vigCell.add(img);
            } catch (Exception e) {
                log.warn("Erro ao renderizar assinatura do vigilante", e);
            }
        } else {
            vigCell.add(new Paragraph("_________________________________________").setFontSize(7.5f).setFontColor(TEXT_MUTED).setMarginBottom(1));
        }
        vigCell.add(new Paragraph("Assinatura do(a) Vigilante").setFontSize(7.5f).setBold().setFontColor(TEXT_DARK).setMargin(0));
        vigCell.add(new Paragraph(termo.getVigilanteName() != null ? termo.getVigilanteName() : "").setFontSize(7f).setFontColor(TEXT_MUTED).setMargin(0));
        sigTable.addCell(vigCell);

        // Assinatura do Armeiro
        Cell armCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4).setTextAlignment(TextAlignment.CENTER);
        if (termo.getArmeiroSignatureBase64() != null && !termo.getArmeiroSignatureBase64().isBlank()) {
            try {
                byte[] imgBytes = Base64.getDecoder().decode(cleanBase64(termo.getArmeiroSignatureBase64()));
                Image img = new Image(ImageDataFactory.create(imgBytes));
                img.setMaxHeight(32);
                img.setHorizontalAlignment(HorizontalAlignment.CENTER);
                armCell.add(img);
            } catch (Exception e) {
                log.warn("Erro ao renderizar assinatura do armeiro", e);
            }
        } else {
            armCell.add(new Paragraph("_________________________________________").setFontSize(7.5f).setFontColor(TEXT_MUTED).setMarginBottom(1));
        }
        armCell.add(new Paragraph("Assinatura e Carimbo do Armeiro / Responsável").setFontSize(7.5f).setBold().setFontColor(TEXT_DARK).setMargin(0));
        armCell.add(new Paragraph(termo.getArmeiroName() != null ? termo.getArmeiroName() : "Responsável pelo Almoxarifado").setFontSize(7f).setFontColor(TEXT_MUTED).setMargin(0));
        sigTable.addCell(armCell);

        document.add(sigTable);
    }

    private void addSectionHeader(Document document, String title) {
        Paragraph p = new Paragraph(title)
                .setFontSize(8f)
                .setBold()
                .setFontColor(TEXT_DARK)
                .setBackgroundColor(SECTION_BG)
                .setPadding(2)
                .setPaddingLeft(4)
                .setMarginTop(3)
                .setMarginBottom(2)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
        document.add(p);
    }

    private Cell createDataCell(String label, String value) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(2).setPaddingLeft(4);
        Paragraph p = new Paragraph()
                .add(new Text(label + " ").setFontSize(7.2f).setBold().setFontColor(TEXT_DARK))
                .add(new Text(value).setFontSize(7.2f).setFontColor(TEXT_DARK));
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
