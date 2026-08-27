package com.z7design.secured_guard.service;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
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
import java.util.Locale;

/**
 * Autorização para teste toxicológico – Termo de Conhecimento (funcionários VIG).
 * Layout idêntico ao documento físico oficial.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ToxicologicalTestAuthPdfService {

    private static final DeviceRgb GREEN_TEXT = new DeviceRgb(56, 118, 29);
    private static final DeviceRgb DARK_GRAY = new DeviceRgb(34, 34, 34);
    private static final DeviceRgb LIGHT_GREEN_LINE = new DeviceRgb(147, 196, 125);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM", new Locale("pt", "BR"));
    private static final DateTimeFormatter YEAR = DateTimeFormatter.ofPattern("yyyy");

    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    public byte[] generatePdf(ValeSafetyTermRequest request) {
        ResolvedData data = resolve(request);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4);
            document.setMargins(30f, 40f, 30f, 40f);

            PdfFont fontRegular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont fontBold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

            // Moldura externa (Linha superior e inferior)
            addOuterFrameLines(document);

            // Título Superior (Esquerda/Alinhado)
            document.add(new Paragraph("Autorização para\nteste toxicológico")
                    .setFont(fontBold).setFontSize(22f).setFontColor(GREEN_TEXT)
                    .setFixedLeading(26f).setMarginTop(70f).setMarginBottom(100f)
                    .setMarginLeft(60f));

            // Subtítulo Centralizado
            document.add(new Paragraph("Termo de Conhecimento")
                    .setFont(fontRegular).setFontSize(20f).setFontColor(GREEN_TEXT)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(40f));

            // Texto do Corpo com Lacunas / Dados
            String empName = data.employeeName().isBlank() ? "_________________________" : data.employeeName().toUpperCase();
            String empRg = data.employeeRg().isBlank() ? "____________" : data.employeeRg();
            String companyName = data.companyName().isBlank() ? "_________________________" : data.companyName();

            Paragraph body = new Paragraph()
                    .setFont(fontRegular).setFontSize(11f).setFontColor(DARK_GRAY)
                    .setTextAlignment(TextAlignment.JUSTIFIED)
                    .setFixedLeading(20f).setMarginBottom(70f)
                    .setMarginLeft(40f).setMarginRight(40f);

            body.add(new Text("Eu, "));
            body.add(new Text(empName).setFont(fontBold));
            body.add(new Text(", RG "));
            body.add(new Text(empRg).setFont(fontBold));
            body.add(new Text(", empregado(a)\nda empresa "));
            body.add(new Text(companyName).setFont(fontBold));
            body.add(new Text(", declaro, nesta data,\nestar ciente da Política de Prevenção do Uso Indevido de\nÁlcool e Outras Drogas adotada nos projetos e concordo com\ntodos os procedimentos e medidas previstos nesta cartilha."));

            document.add(body);

            // Data (Dia, Mês, Ano)
            String dayStr = data.documentDate() != null ? data.documentDate().format(DAY) : "______";
            String monthStr = data.documentDate() != null ? data.documentDate().format(MONTH) : "__________";
            String yearStr = data.documentDate() != null ? data.documentDate().format(YEAR) : "________";

            Paragraph datePara = new Paragraph()
                    .setFont(fontRegular).setFontSize(11f).setFontColor(DARK_GRAY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(70f)
                    .add(new Text(dayStr).setFont(fontBold))
                    .add(new Text(" de "))
                    .add(new Text(monthStr).setFont(fontBold))
                    .add(new Text(" de "))
                    .add(new Text(yearStr).setFont(fontBold));

            document.add(datePara);

            // Assinatura
            Paragraph sigLine = new Paragraph("_________________________________________")
                    .setFont(fontRegular).setFontSize(11f).setFontColor(DARK_GRAY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(4f);
            document.add(sigLine);

            Paragraph sigLabel = new Paragraph("Assinatura do(a) empregado(a)")
                    .setFont(fontRegular).setFontSize(11f).setFontColor(DARK_GRAY)
                    .setTextAlignment(TextAlignment.CENTER);
            document.add(sigLabel);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF Autorização Toxicológica", e);
            throw new RuntimeException("Erro ao gerar PDF Autorização Toxicológica: " + e.getMessage(), e);
        }
    }

    private void addOuterFrameLines(Document document) {
        // Linha superior fina verde
        Table topTable = new Table(1).useAllAvailableWidth().setMarginTop(0f).setMarginBottom(10f);
        topTable.addCell(new Cell().setHeight(1.5f).setBackgroundColor(LIGHT_GREEN_LINE).setBorder(Border.NO_BORDER));
        document.add(topTable);
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
        String companyName = firstNonBlank(request.getCompanyName(), company.getName(), "EMPRESA");
        String city = firstNonBlank(request.getCity(), company.getCity(), "Contagem");

        return new ResolvedData(company.getId(), name, rg, companyName, city, date);
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
            String companyName,
            String city,
            LocalDate documentDate) {}
}
