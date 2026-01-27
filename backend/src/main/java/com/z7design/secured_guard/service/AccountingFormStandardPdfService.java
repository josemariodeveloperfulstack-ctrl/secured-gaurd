package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountingFormStandardPdfService {

    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final ExcelReportLayoutService excelReportLayoutService;

    public byte[] generateAccountingFormPdf(UUID employeeId) throws Exception {
        log.info("📄 Gerando ficha de contabilidade em PDF para funcionário ID: {}", employeeId);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        Company company = null;
        if (employee.getCompany() != null) {
            company = companyRepository.findById(employee.getCompany().getId()).orElse(null);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            UUID companyId = resolveCompanyId(company);
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("FICHA DE CADASTRO DE FUNCIONÁRIO")
                    .topMargin(120f)
                    .bottomMargin(80f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            Paragraph subtitle = new Paragraph("Para Departamento de Contabilidade")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setBold()
                    .setFontSize(12)
                    .setMarginBottom(10);
            document.add(subtitle);

            Paragraph date = new Paragraph(
                    "Data de Geração: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setMarginBottom(20);
            document.add(date);

            document.add(createSectionHeader("1. DADOS PESSOAIS"));
            Table personalTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                    .useAllAvailableWidth();
            personalTable.addCell(createLabelValueCell("NOME COMPLETO:", employee.getName()));
            personalTable.addCell(createLabelValueCell("CPF:", employee.getDocument()));
            personalTable.addCell(createLabelValueCell("RG:", buildRg(employee)));
            personalTable.addCell(createLabelValueCell("DATA DE NASCIMENTO:", formatDate(employee.getBirthDate())));
            personalTable.addCell(createLabelValueCell("ESTADO CIVIL:", employee.getMaritalStatus()));
            personalTable.addCell(createLabelValueCell("NACIONALIDADE:", employee.getNationality()));
            document.add(personalTable);

            document.add(createSectionHeader("2. DOCUMENTAÇÃO"));
            Table documentsTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                    .useAllAvailableWidth();
            documentsTable.addCell(createLabelValueCell("PIS/PASEP:", employee.getPis()));
            documentsTable.addCell(createLabelValueCell("TÍTULO DE ELEITOR:", employee.getTituloEleitor()));
            documentsTable.addCell(createLabelValueCell("ZONA/SEÇÃO:", buildZonaSecao(employee)));
            documentsTable.addCell(
                    createLabelValueCell("CTPS / SÉRIE:", (employee.getCtps() != null ? employee.getCtps() : "") + " / "
                            + (employee.getCtpsSeries() != null ? employee.getCtpsSeries() : "")));
            documentsTable.addCell(createLabelValueCell("CNH / CATEGORIA:",
                    (employee.getCnhNumber() != null ? employee.getCnhNumber() : "") + " / "
                            + (employee.getCnhCategory() != null ? employee.getCnhCategory() : "")));
            documentsTable.addCell(createLabelValueCell("VALIDADE CNH:", formatDate(employee.getCnhExpirationDate())));
            documentsTable.addCell(createLabelValueCell("CERTIFICADO MILITAR:", employee.getCertificadoMilitar()));
            documentsTable.addCell(createLabelValueCell("CARTEIRA DE RESERVISTA:", "")); // Campo extra se necessário
            document.add(documentsTable);

            document.add(createSectionHeader("3. ENDEREÇO E CONTATO"));
            Table contactTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                    .useAllAvailableWidth();
            contactTable.addCell(createLabelValueCell("ENDEREÇO:", buildAddress(employee)));
            contactTable.addCell(createLabelValueCell("TELEFONE:", employee.getPhone()));
            contactTable.addCell(createLabelValueCell("E-MAIL:", employee.getEmail()));
            document.add(contactTable);

            document.add(createSectionHeader("4. DADOS PROFISSIONAIS"));
            Table professionalTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                    .useAllAvailableWidth();
            professionalTable.addCell(createLabelValueCell("REGISTRO Nº:", employee.getRegistrationNumber()));
            professionalTable.addCell(createLabelValueCell("DATA ADMISSÃO:", formatDate(employee.getHireDate())));
            professionalTable.addCell(createLabelValueCell("CARGO:",
                    employee.getPosition() != null ? employee.getPosition().getName() : ""));
            professionalTable.addCell(createLabelValueCell("CBO:", employee.getCbo()));
            professionalTable.addCell(
                    createLabelValueCell("SETOR:", employee.getUnit() != null ? employee.getUnit().getName() : ""));
            professionalTable.addCell(createLabelValueCell("SALÁRIO BASE:",
                    employee.getSalario() != null ? String.format("R$ %.2f", employee.getSalario()) : ""));
            document.add(professionalTable);

            if (employee.getBanco() != null || employee.getAgencia() != null || employee.getContaCorrente() != null) {
                document.add(createSectionHeader("5. DADOS BANCÁRIOS"));
                Table bankTable = new Table(UnitValue.createPercentArray(new float[] { 33, 33, 34 }))
                        .useAllAvailableWidth();
                bankTable.addCell(createLabelValueCell("BANCO:", employee.getBanco()));
                bankTable.addCell(createLabelValueCell("AGÊNCIA:", employee.getAgencia()));
                bankTable.addCell(createLabelValueCell("CONTA:", employee.getContaCorrente()));
                document.add(bankTable);
            }

            addSignatures(document, employee, company);

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar ficha de contabilidade com layout padrão", e);
            throw e;
        }

        log.info("✅ Ficha de contabilidade gerada com sucesso. Tamanho: {} bytes", baos.size());
        return baos.toByteArray();
    }

    public byte[] generateAccountingFormExcel(UUID employeeId) throws Exception {
        log.info("📊 Gerando ficha de contabilidade (Excel) para funcionário ID: {}", employeeId);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        Company company = null;
        if (employee.getCompany() != null) {
            company = companyRepository.findById(employee.getCompany().getId()).orElse(null);
        }
        Company reportCompany = resolveCompany(company);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Ficha Contabilidade");
            int lastColumn = 1;
            int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, reportCompany,
                    "FICHA DE CADASTRO DE FUNCIONÁRIO", lastColumn);

            CellStyle labelStyle = createLabelStyle(workbook);
            CellStyle valueStyle = createValueStyle(workbook);

            rowIndex = addSection(sheet, rowIndex, "Para Departamento de Contabilidade", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Data de Geração:",
                    LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), labelStyle, valueStyle);

            rowIndex = addSection(sheet, rowIndex, "1. DADOS PESSOAIS", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Nome Completo:", employee.getName(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "CPF:", employee.getDocument(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "RG:", buildRg(employee), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Data de Nascimento:", formatDate(employee.getBirthDate()), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Estado Civil:", employee.getMaritalStatus(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Nacionalidade:", employee.getNationality(), labelStyle, valueStyle);

            rowIndex = addSection(sheet, rowIndex, "2. DOCUMENTOS", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "PIS/PASEP:", employee.getPis(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Título de Eleitor:", employee.getTituloEleitor(), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Zona/Seção Eleitoral:", buildZonaSecao(employee), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "CTPS:", employee.getCtps(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Série CTPS:", employee.getCtpsSeries(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "CNH:", employee.getCnhNumber(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Categoria CNH:", employee.getCnhCategory(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Validade CNH:", formatDate(employee.getCnhExpirationDate()), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Certificado Militar:", employee.getCertificadoMilitar(), labelStyle,
                    valueStyle);

            rowIndex = addSection(sheet, rowIndex, "3. ENDEREÇO E CONTATO", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Endereço:", buildAddress(employee), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Telefone:", employee.getPhone(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "E-mail:", employee.getEmail(), labelStyle, valueStyle);

            rowIndex = addSection(sheet, rowIndex, "4. DADOS PROFISSIONAIS", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Número de Registro:", employee.getRegistrationNumber(), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Data de Admissão:", formatDate(employee.getHireDate()), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Cargo:",
                    employee.getPosition() != null ? employee.getPosition().getName() : "", labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "CBO:", employee.getCbo(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Salário Base:",
                    employee.getSalario() != null ? "R$ " + String.format("%.2f", employee.getSalario()) : "",
                    labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Status:", formatStatus(employee.getStatus()), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Setor:", employee.getUnit() != null ? employee.getUnit().getName() : "",
                    labelStyle, valueStyle);
            if (company != null) {
                rowIndex = addRow(sheet, rowIndex, "Empresa:", company.getName(), labelStyle, valueStyle);
                rowIndex = addRow(sheet, rowIndex, "CNPJ:", company.getCnpj(), labelStyle, valueStyle);
            }

            if (employee.getBanco() != null || employee.getAgencia() != null || employee.getContaCorrente() != null) {
                rowIndex = addSection(sheet, rowIndex, "5. DADOS BANCÁRIOS", lastColumn, workbook);
                rowIndex = addRow(sheet, rowIndex, "Banco:", employee.getBanco(), labelStyle, valueStyle);
                rowIndex = addRow(sheet, rowIndex, "Agência:", employee.getAgencia(), labelStyle, valueStyle);
                rowIndex = addRow(sheet, rowIndex, "Conta Corrente:", employee.getContaCorrente(), labelStyle,
                        valueStyle);
            }

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            excelReportLayoutService.addFooter(sheet, workbook, reportCompany, lastColumn);

            // Configurar layout de impressão (headers/footers nativos, repetição de linhas,
            // margens)
            excelReportLayoutService.setupPrintLayout(sheet, reportCompany, "FICHA DE CADASTRO DE FUNCIONÁRIO", 6);

            workbook.write(out);
            log.info("✅ Ficha de contabilidade (Excel) gerada com sucesso. Tamanho: {} bytes", out.size());
            return out.toByteArray();
        }
    }

    private Cell createLabelValueCell(String label, String value) {
        Paragraph p = new Paragraph();
        p.add(new Text(label).setBold().setFontSize(9f));
        p.add(new Text(" " + (value != null && !value.isEmpty() ? value : "-")).setFontSize(10f));
        return new Cell().add(p).setPadding(5f);
    }

    private Paragraph createSectionHeader(String title) {
        return new Paragraph(title)
                .setBold()
                .setFontSize(11f)
                .setFontColor(new DeviceRgb(255, 0, 0)) // RED
                .setMarginTop(15f)
                .setMarginBottom(5f)
                .setBorderLeft(new com.itextpdf.layout.borders.SolidBorder(new DeviceRgb(255, 0, 0), 3f))
                .setPaddingLeft(5f);
    }

    private void addSignatures(Document document, Employee employee, Company company) {
        String city = company != null && company.getCity() != null ? company.getCity() : "_______________";
        String date = LocalDate.now()
                .format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));

        Paragraph dateLoc = new Paragraph(city + ", " + date)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginTop(30f)
                .setMarginBottom(40f)
                .setFontSize(10f);
        document.add(dateLoc);

        Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                .useAllAvailableWidth();

        Cell cell = new Cell()
                .add(new Paragraph("_________________________________")
                        .setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph(employee.getName().toUpperCase())
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(8f).setBold())
                .add(new Paragraph("Assinatura do Funcionário").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

        sigTable.addCell(cell);
        document.add(sigTable);
    }

    private UUID resolveCompanyId(Company company) {
        if (company != null) {
            return company.getId();
        }

        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            return activeCompanies.get(0).getId();
        }

        List<Company> allCompanies = companyRepository.findAll();
        if (allCompanies != null && !allCompanies.isEmpty()) {
            return allCompanies.get(0).getId();
        }

        throw new RuntimeException("Não foi possível determinar a empresa para o relatório.");
    }

    private String buildAddress(Employee employee) {
        StringBuilder address = new StringBuilder();
        if (employee.getEnderecoRua() != null && !employee.getEnderecoRua().trim().isEmpty()) {
            address.append(employee.getEnderecoRua());
        }
        if (employee.getEnderecoNumero() != null && !employee.getEnderecoNumero().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(", ");
            address.append("nº ").append(employee.getEnderecoNumero());
        }
        if (employee.getEnderecoComplemento() != null && !employee.getEnderecoComplemento().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(" - ");
            address.append(employee.getEnderecoComplemento());
        }
        if (employee.getEnderecoBairro() != null && !employee.getEnderecoBairro().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(", ");
            address.append(employee.getEnderecoBairro());
        }
        if (employee.getEnderecoCidade() != null && !employee.getEnderecoCidade().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(" - ");
            address.append(employee.getEnderecoCidade());
        }
        if (employee.getEnderecoEstado() != null && !employee.getEnderecoEstado().trim().isEmpty()) {
            if (address.length() > 0)
                address.append("/");
            address.append(employee.getEnderecoEstado());
        }
        if (employee.getEnderecoCep() != null && !employee.getEnderecoCep().trim().isEmpty()) {
            if (address.length() > 0)
                address.append(" - CEP: ");
            address.append(employee.getEnderecoCep());
        }

        // Fallback para campo address antigo
        if (address.length() == 0 && employee.getAddress() != null && !employee.getAddress().trim().isEmpty()) {
            address.append(employee.getAddress());
        }

        return address.toString();
    }

    private String formatDate(LocalDate date) {
        if (date == null)
            return "";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private String formatStatus(com.z7design.secured_guard.model.enums.EmploymentStatus status) {
        if (status == null)
            return "";
        switch (status) {
            case ACTIVE:
                return "Ativo";
            case INACTIVE:
                return "Inativo";
            case TERMINATED:
                return "Demitido";
            default:
                return status.toString();
        }
    }

    private String buildRg(Employee employee) {
        String rg = "";
        if (employee.getCinNumero() != null && !employee.getCinNumero().trim().isEmpty()) {
            rg = employee.getCinNumero();
            if (employee.getCinOrgaoEmissor() != null && !employee.getCinOrgaoEmissor().trim().isEmpty()) {
                rg = employee.getCinOrgaoEmissor() + "-" + rg;
            }
        } else if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
            rg = employee.getCarteiraIdentidadeOrgaoEmissor();
        }
        return rg;
    }

    private String buildZonaSecao(Employee employee) {
        if (employee.getTituloEleitorZona() != null || employee.getTituloEleitorSecao() != null) {
            return (employee.getTituloEleitorZona() != null ? employee.getTituloEleitorZona() : "") +
                    " / " + (employee.getTituloEleitorSecao() != null ? employee.getTituloEleitorSecao() : "");
        }
        return "";
    }

    private Company resolveCompany(Company company) {
        if (company != null) {
            return company;
        }

        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            return activeCompanies.get(0);
        }

        List<Company> allCompanies = companyRepository.findAll();
        if (allCompanies != null && !allCompanies.isEmpty()) {
            return allCompanies.get(0);
        }

        throw new RuntimeException("Não foi possível determinar a empresa para o relatório.");
    }
}
