package com.z7design.secured_guard.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.z7design.secured_guard.dto.ValeSafetyTermRequest;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Regras de Ouro da Vale – Termo de ciência e compromisso (funcionários VIG).
 * Gera o PDF no layout idêntico ao modelo físico oficial da Vale.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ValeGoldenRulesPdfService {

    private static final DeviceRgb TEAL_VALE = new DeviceRgb(0, 95, 115);
    private static final DeviceRgb DARK_GRAY = new DeviceRgb(34, 34, 34);
    private static final DeviceRgb LIGHT_GRAY_BORDER = new DeviceRgb(190, 190, 190);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final String[] RULES = {
            "Nunca trabalhe sob influência de álcool, drogas e substâncias que diminuam a aptidão para o trabalho.",
            "Nunca trabalhe em altura (maior ou igual a 1,8 m) sem o devido treinamento, autorização e sempre use cinto de segurança fixado em ponto de ancoragem apropriado.",
            "Nunca opere veículos e equipamentos móveis sem o devido treinamento, autorização e dispositivos de segurança. Respeite o plano de trânsito.",
            "Nunca execute manutenções ou intervenções em instalações ou equipamentos sem ter certeza de que todas as fontes de energias tenham sido bloqueadas, identificadas e testadas com \"zero energia\".",
            "Nunca se posicione em área isolada ou sob carga suspensa e nem opere equipamentos de movimentação não certificados.",
            "Nunca trabalhe sozinho num espaço confinado e sem treinamento, autorização, permissão de entrada e EPI apropriado.",
            "Nunca entre sem autorização em áreas de produção, de rejeitos, salas elétricas/subestações ou qualquer outra área restrita.",
            "Nunca use ferramentas, máquinas e equipamentos improvisados ou defeituosos para executar um trabalho.",
            "Nunca realize uma atividade sem conhecer seus riscos e cumpra todas as medidas de controle exigidas.",
            "Nunca utilize telefone celular ou qualquer outro equipamento que desvie sua atenção em áreas operacionais não autorizadas, escadas ou ao atravessar ruas."
    };

    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    public byte[] generatePdf(ValeSafetyTermRequest request) {
        ResolvedData data = resolve(request);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4);
            document.setMargins(25f, 30f, 25f, 30f);

            PdfFont fontRegular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont fontBold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

            addHeader(document, fontBold);
            addIntroText(document, fontRegular, fontBold);
            addRulesBox(document, fontRegular, fontBold);
            addFillInAndSignatureSection(document, data, fontRegular, fontBold);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF Regras de Ouro da Vale", e);
            throw new RuntimeException("Erro ao gerar PDF Regras de Ouro da Vale: " + e.getMessage(), e);
        }
    }

    private void addHeader(Document document, PdfFont fontBold) {
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{30f, 70f}))
                .useAllAvailableWidth()
                .setMarginBottom(8f);

        // Coluna Esquerda: Badge "10 Regras de Ouro da Segurança"
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
        Table badgeTable = new Table(1).setWidth(110f);
        Cell badgeCell = new Cell()
                .setBackgroundColor(new DeviceRgb(55, 71, 79))
                .setBorder(new SolidBorder(new DeviceRgb(229, 57, 53), 2f))
                .setPadding(6f)
                .setTextAlignment(TextAlignment.CENTER);
        badgeCell.add(new Paragraph("10 Regras")
                .setFont(fontBold).setFontSize(11f).setFontColor(ColorConstants.WHITE).setMargin(0).setLeading(12f));
        badgeCell.add(new Paragraph("de Ouro da")
                .setFont(fontBold).setFontSize(10f).setFontColor(new DeviceRgb(255, 202, 40)).setMargin(0).setLeading(11f));
        badgeCell.add(new Paragraph("Segurança")
                .setFont(fontBold).setFontSize(11f).setFontColor(ColorConstants.WHITE).setMargin(0).setLeading(12f));
        badgeTable.addCell(badgeCell);
        leftCell.add(badgeTable);
        headerTable.addCell(leftCell);

        // Coluna Direita: Título e Subtítulo
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
        rightCell.add(new Paragraph("Regras de Ouro da Vale")
                .setFont(fontBold).setFontSize(18f).setFontColor(TEAL_VALE).setMarginBottom(4f));
        rightCell.add(new Paragraph("Termo de ciência e compromisso")
                .setFont(fontBold).setFontSize(13f).setFontColor(TEAL_VALE).setMarginBottom(0f));
        headerTable.addCell(rightCell);

        document.add(headerTable);

        // Linha divisória verde/teal horizontal
        Table lineTable = new Table(1).useAllAvailableWidth().setMarginBottom(10f);
        lineTable.addCell(new Cell().setHeight(1.5f).setBackgroundColor(TEAL_VALE).setBorder(Border.NO_BORDER));
        document.add(lineTable);
    }

    private void addIntroText(Document document, PdfFont fontRegular, PdfFont fontBold) {
        Paragraph p1 = new Paragraph(
                "Na Vale, temos um pacto inegociável com a vida. É dever de todos os empregados da Vale e empresas contratadas obedecer rigorosamente "
                        + "às Regras de Ouro, visando não apenas a própria segurança, mas também a dos colegas.")
                .setFont(fontRegular).setFontSize(9f).setFontColor(DARK_GRAY)
                .setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(4f).setFixedLeading(12f);
        document.add(p1);

        Paragraph p2 = new Paragraph()
                .setFont(fontRegular).setFontSize(9f).setFontColor(DARK_GRAY)
                .setMarginBottom(8f).setFixedLeading(12f)
                .add(new Text("Leia com atenção e, ao final, "))
                .add(new Text("preencha seus dados e confirme seu compromisso.").setFont(fontBold));
        document.add(p2);
    }

    private void addRulesBox(Document document, PdfFont fontRegular, PdfFont fontBold) {
        Table boxTable = new Table(1).useAllAvailableWidth().setMarginBottom(10f);
        Cell boxCell = new Cell()
                .setBorder(new SolidBorder(LIGHT_GRAY_BORDER, 1f))
                .setPadding(8f)
                .setBackgroundColor(ColorConstants.WHITE);

        boxCell.add(new Paragraph("As 10 Regras de Ouro da Vale")
                .setFont(fontBold).setFontSize(10.5f).setFontColor(TEAL_VALE).setMarginBottom(6f));

        for (int i = 0; i < RULES.length; i++) {
            Paragraph rulePara = new Paragraph()
                    .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY)
                    .setFixedLeading(11f).setMarginBottom(3f)
                    .add(new Text((i + 1) + ".  ").setFont(fontBold))
                    .add(new Text(RULES[i]));
            boxCell.add(rulePara);
        }
        boxTable.addCell(boxCell);
        document.add(boxTable);
    }

    private void addFillInAndSignatureSection(Document document, ResolvedData data, PdfFont fontRegular, PdfFont fontBold) {
        // Linha divisória fina
        Table lineTable = new Table(1).useAllAvailableWidth().setMarginBottom(6f);
        lineTable.addCell(new Cell().setHeight(0.5f).setBackgroundColor(LIGHT_GRAY_BORDER).setBorder(Border.NO_BORDER));
        document.add(lineTable);

        document.add(new Paragraph(
                "Li e concordo com as Regras de Ouro, detalhadas acima, porque sei que a vida está sempre em primeiro lugar.")
                .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY).setMarginBottom(6f));

        String dateVal = data.documentDate() != null ? data.documentDate().format(DATE_FMT) : "____________";
        String yearVal = data.documentDate() != null ? String.valueOf(data.documentDate().getYear()) : "____";
        String localVal = data.location().isBlank() ? "___________________________" : data.location();
        String empName = data.employeeName().isBlank() ? "_______________________________________" : data.employeeName().toUpperCase();
        String companyName = data.companyName().isBlank() ? "_______________________" : data.companyName();
        String regNumber = data.registrationNumber().isBlank() ? "_______________________________________" : data.registrationNumber();

        // Linha 1: Data e Local
        document.add(new Paragraph()
                .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY).setMarginBottom(4f)
                .add(new Text("Data: "))
                .add(new Text(dateVal + ", 20" + (yearVal.length() >= 2 ? yearVal.substring(yearVal.length() - 2) : yearVal)).setFont(fontBold))
                .add(new Text("          Local: "))
                .add(new Text(localVal).setFont(fontBold)));

        // Linha 2: Nome do empregado
        document.add(new Paragraph()
                .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY).setMarginBottom(4f)
                .add(new Text("Nome do(a) empregado(a) (letra de forma): "))
                .add(new Text(empName).setFont(fontBold)));

        // Linha 3: Você trabalha
        document.add(new Paragraph()
                .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY).setMarginBottom(4f)
                .add(new Text("Você trabalha:  (  ) Vale   ( X ) Contratada, Nome da empresa contratada: "))
                .add(new Text(companyName).setFont(fontBold)));

        // Linha 4: Matrícula
        document.add(new Paragraph()
                .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY).setMarginBottom(4f)
                .add(new Text("Matricula Vale ou Nº de identificação da contratada; "))
                .add(new Text(regNumber).setFont(fontBold)));

        // Linha 5: Firmo meu compromisso
        document.add(new Paragraph("Firmo meu compromisso:")
                .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY).setMarginBottom(12f));

        // Assinatura e Logo Vale
        Table bottomTable = new Table(UnitValue.createPercentArray(new float[]{70f, 30f}))
                .useAllAvailableWidth()
                .setMarginBottom(8f);

        Cell sigCell = new Cell().setBorder(Border.NO_BORDER);
        sigCell.add(new Paragraph("_______________________________________")
                .setFont(fontRegular).setFontSize(8.5f).setMarginBottom(2f));
        sigCell.add(new Paragraph("Assinatura do(a) empregado(a)")
                .setFont(fontRegular).setFontSize(8.5f).setFontColor(DARK_GRAY));
        bottomTable.addCell(sigCell);

        Cell logoCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.BOTTOM);
        Paragraph valeLogo = new Paragraph()
                .add(new Text("▲ ").setFontSize(14f).setFontColor(new DeviceRgb(255, 179, 0)))
                .add(new Text("VALE").setFont(fontBold).setFontSize(14f).setFontColor(TEAL_VALE));
        logoCell.add(valeLogo);
        bottomTable.addCell(logoCell);

        document.add(bottomTable);

        // Rodapé final explicativo
        document.add(new Paragraph(
                "Cabe à área de Recursos Humanos (para empregados Vale) e a de Segurança do Trabalho (para contratados) armazenar os Termos de Ciência e Compromisso devidamente preenchidas e assinados.")
                .setFont(fontRegular).setFontSize(7.5f).setFontColor(new DeviceRgb(100, 100, 100))
                .setItalic().setTextAlignment(TextAlignment.CENTER));
    }

    private ResolvedData resolve(ValeSafetyTermRequest request) {
        Employee employee = null;
        if (request.getEmployeeId() != null) {
            employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        }
        Company company = null;
        if (request.getCompanyId() != null) {
            company = companyRepository.findById(request.getCompanyId()).orElse(null);
        } else if (employee != null && employee.getCompany() != null) {
            company = employee.getCompany();
        }
        if (company == null) {
            throw new IllegalArgumentException("Empresa é obrigatória para gerar o termo.");
        }

        LocalDate date = documentDateResolver.resolveDocumentDateOrToday(
                request.getEmployeeId(), request.getDocumentDate());

        String name = firstNonBlank(request.getEmployeeName(),
                employee != null ? employee.getName() : null, "FUNCIONÁRIO");
        String rg = firstNonBlank(request.getEmployeeRg(),
                employee != null ? employee.getRg() : null, "");
        String reg = firstNonBlank(request.getRegistrationNumber(),
                employee != null ? employee.getRegistrationNumber() : null, "");
        String companyName = firstNonBlank(request.getCompanyName(), company.getName(), "EMPRESA");
        String city = firstNonBlank(request.getCity(), company.getCity(), "Contagem");
        String location = firstNonBlank(request.getLocation(), city);

        return new ResolvedData(company.getId(), name, rg, reg, companyName, city, location, date);
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private record ResolvedData(
            java.util.UUID companyId,
            String employeeName,
            String employeeRg,
            String registrationNumber,
            String companyName,
            String city,
            String location,
            LocalDate documentDate) {}
}
