package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.List;
import com.itextpdf.layout.element.ListItem;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class OsBombeiroCivilPdfService {

    private final StandardReportLayoutService pdfLayoutService;

    public OsBombeiroCivilPdfService(StandardReportLayoutService pdfLayoutService) {
        this.pdfLayoutService = pdfLayoutService;
    }

    private static final String REPORT_TITLE = "ORDEM DE SERVIÇO (OS)";

    public byte[] generatePdf(OperationalServiceOrderRequest request) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(request.getCompanyId())
                    .reportTitle(REPORT_TITLE)
                    .includeEmailInFooter(true)
                    .marginExtraTop(-35f)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();
            Company company = docWithPdf.getCompany();

            addFrontPage(document, request, company);
            document.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            addBackPage(document, request, company);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF OS Bombeiro Civil", e);
            throw new RuntimeException("Erro ao gerar PDF OS Bombeiro Civil", e);
        }
    }

    private void addFrontPage(Document document, OperationalServiceOrderRequest request, Company company) {
        Table meta = new Table(UnitValue.createPercentArray(new float[] { 33, 33, 34 })).useAllAvailableWidth();
        meta.addCell(cell("Data elaboração: " + formatDate(request.getDocumentDate()), false));
        meta.addCell(cell("Última revisão: " + safeStr(request.getRevision()), false));
        meta.addCell(cell("Responsável: Eng. Segurança do Trabalho", false));
        document.add(meta.setMarginBottom(8f));

        Table id = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();
        id.addCell(cell("EMPRESA: " + (company != null ? company.getName().toUpperCase() : ""), true));
        id.addCell(cell("CNPJ: " + (company != null ? safeStr(company.getCnpj()) : "-"), true));
        id.addCell(cell("NOME: " + safeStr(request.getEmployeeName()).toUpperCase(), true));
        id.addCell(cell("CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase(), true));
        id.addCell(cell("Data da admissão: " + formatDate(request.getHireDate()), true));
        id.addCell(cell("SETOR: " + safeStr(request.getSector()).toUpperCase(), true));
        document.add(id.setMarginBottom(10f));

        addSection(document, "DESCRIÇÃO DAS ATIVIDADES (CONFORME PGR)", safeStr(request.getActivities()));
        addSection(document, "PERIGO / FATOR DE RISCO", safeStr(request.getRisks()));
        addSection(document, "MEDIDAS DE PROTEÇÃO RECOMENDADAS (EPI's / EPC's)", safeStr(request.getUniform()));
        addSection(document, "CAPACITAÇÃO / TREINAMENTOS", safeStr(request.getMandatoryTrainings()));
        addSection(document, "PROCEDIMENTO EM CASO DE ACIDENTES", safeStr(request.getAccidentProcedure()));

        addSectionHeader(document, "CABE AO EMPREGADOR");
        List employer = new List().setSymbolIndent(12).setListSymbol("•").setFontSize(8.5f);
        employer.add("Cumprir as disposições legais e regulamentares sobre segurança e medicina do trabalho.");
        employer.add("Elaborar ordens de serviço e dar ciência aos empregados.");
        employer.add("Adotar as medidas determinadas pelos órgãos competentes do MTE.");
        employer.add("Fornecer EPI adequado e treinamento necessário.");
        document.add(employer);
    }

    private void addBackPage(Document document, OperationalServiceOrderRequest request, Company company) {
        document.add(new Paragraph(
                "Cabe ao empregador informar aos trabalhadores os riscos ocupacionais, métodos de proteção, "
                        + "resultados de exames médicos e avaliações ambientais, fornecendo EPI e treinamento necessários.")
                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(8f));

        addSectionHeader(document, "CABE AO EMPREGADO");
        addBulletList(document, new String[] {
                "Cumprir as normas da empresa e do cliente.",
                "Seguir as práticas de segurança e saúde nos locais de trabalho.",
                "Comunicar ao superior condições inseguras.",
                "Utilizar os EPI fornecidos.",
                "Manter ordem, disciplina e higiene.",
                "Executar tarefas somente após treinamento específico.",
                "Submeter-se aos exames médicos previstos nas NRs."
        });

        addSectionHeader(document, "PROIBIÇÕES");
        addBulletList(document, new String[] {
                "Deixar de utilizar o EPI fornecido.",
                "Desconhecer a localização dos equipamentos de combate a incêndio.",
                "Operar equipamentos ou veículos sem treinamento/autorização.",
                "Trabalhar sob efeito de álcool ou substâncias psicoativas.",
                "Portar arma de fogo durante o serviço (salvo autorização legal).",
                "Fumar em locais proibidos.",
                "Brincar em serviço ou correr em locais de risco.",
                "Improvisar reparos em máquinas ou instalações elétricas.",
                "Utilizar cabos elétricos danificados ou jogar água em equipamentos elétricos."
        });

        addSectionHeader(document, "MEDICINA DO TRABALHO");
        document.add(new Paragraph(
                "O empregado deverá submeter-se aos exames médicos previstos nas Normas Regulamentadoras. "
                        + "O Médico do Trabalho comunicará por escrito os resultados dos exames.")
                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(6f));

        addSectionHeader(document, "OBSERVAÇÃO");
        document.add(new Paragraph(
                "O não cumprimento das normas de segurança e medicina do trabalho sujeitará o empregado às penalidades previstas em lei.")
                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(10f));

        addSectionHeader(document, "TERMO DE RECEBIMENTO DE COMPROMISSO");
        document.add(new Paragraph(
                "Declaro ter recebido a presente Ordem de Serviço e comprometo-me a cumpri-la integralmente.")
                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(8f));

        String city = request.getCity() != null ? request.getCity()
                : (company != null && company.getCity() != null ? company.getCity() : "Contagem");
        String date = formatDate(request.getDocumentDate() != null ? request.getDocumentDate() : LocalDate.now());
        document.add(new Paragraph(city + ", " + date).setBold().setFontSize(10f).setMarginBottom(20f));

        Table sign = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();
        sign.addCell(cell("NOME: " + safeStr(request.getEmployeeName()).toUpperCase(), true));
        sign.addCell(cell("ASSINATURA: _________________________________________________", true));
        sign.addCell(cell("DATA: ___/___/______", true));
        document.add(sign);
    }

    private void addSection(Document document, String title, String body) {
        addSectionHeader(document, title);
        document.add(new Paragraph(body).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(6f));
    }

    private void addSectionHeader(Document document, String title) {
        document.add(new Paragraph(title).setBold().setFontSize(10f)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                .setPadding(3f).setMarginTop(4f));
    }

    private void addBulletList(Document document, String[] items) {
        List list = new List().setSymbolIndent(12).setListSymbol("•").setFontSize(8.5f);
        for (String item : items) {
            list.add(new ListItem(item));
        }
        document.add(list.setMarginBottom(6f));
    }

    private Cell cell(String text, boolean bold) {
        Paragraph p = new Paragraph(text).setFontSize(9f);
        if (bold) {
            p.setBold();
        }
        return new Cell().add(p).setPadding(3f);
    }

    private String safeStr(String str) {
        return str != null && !str.trim().isEmpty() ? str : "-";
    }

    private String formatDate(LocalDate date) {
        if (date == null) {
            return "__/__/____";
        }
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
}
