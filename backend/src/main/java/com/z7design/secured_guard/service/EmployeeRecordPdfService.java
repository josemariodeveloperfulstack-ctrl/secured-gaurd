package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
public class EmployeeRecordPdfService {

    private final EmployeeService employeeService;
    private final CompanyRepository companyRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final ExcelReportLayoutService excelReportLayoutService;

    public byte[] generateEmployeeRecordPdf(UUID employeeId) throws Exception {
        log.info("📄 Gerando ficha de registro completa do funcionário ID: {}", employeeId);

        Employee employee = employeeService.findById(employeeId);
        if (employee == null) {
            throw new RuntimeException("Funcionário não encontrado");
        }

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
                    .reportTitle("FICHA DE REGISTRO DO FUNCIONÁRIO")
                    .topMargin(130f) // Increased to allow title space without overlap
                    .bottomMargin(50f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // DATA DE REGISTRO (Mover para o topo)
            Paragraph dateTop = new Paragraph(
                    "Data de Registro: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setMarginBottom(10)
                    .setMarginTop(0);
            document.add(dateTop);

            // DADOS DA EMPRESA (no topo)
            if (company != null) {
                Paragraph companyTitle = new Paragraph("DADOS DA EMPRESA")
                        .setBold()
                        .setFontSize(12)
                        .setMarginTop(5)
                        .setMarginBottom(10);
                document.add(companyTitle);

                Table companyTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                        .useAllAvailableWidth()
                        .setMarginBottom(15);
                addTableRow(companyTable, "Razão Social:", company.getName());
                addTableRow(companyTable, "CNPJ/CEI:", company.getCnpj());
                addTableRow(companyTable, "Endereço:", company.getAddress());
                document.add(companyTable);
            }

            // FOTO DO FUNCIONÁRIO (se disponível)
            try {
                Image employeePhoto = loadEmployeePhoto(employee);
                if (employeePhoto != null) {
                    employeePhoto.setWidth(80f);
                    employeePhoto.setHeight(100f);
                    employeePhoto.setMarginBottom(10);
                    Paragraph photoParagraph = new Paragraph()
                            .add(employeePhoto)
                            .setTextAlignment(TextAlignment.CENTER);
                    document.add(photoParagraph);
                }
            } catch (Exception e) {
                log.warn("Não foi possível carregar foto do funcionário: {}", e.getMessage());
            }

            // DADOS PESSOAIS COMPLETOS
            Paragraph personalTitle = new Paragraph("DADOS PESSOAIS")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(personalTitle);

            Table personalTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            addTableRow(personalTable, "Nome:", employee.getName());
            addTableRow(personalTable, "CPF/CIC:", employee.getDocument());
            addTableRow(personalTable, "Data de Nascimento:", formatDate(employee.getBirthDate()));
            addTableRow(personalTable, "Nacionalidade:",
                    employee.getNationality() != null ? employee.getNationality() : "Brasileira");

            String naturalidade = buildNaturalidade(employee);
            addTableRow(personalTable, "Naturalidade:", naturalidade);

            addTableRow(personalTable, "Estado Civil:", translateMaritalStatus(employee.getMaritalStatus()));
            addTableRow(personalTable, "Grau de Instrução:", translateGrauInstrucao(employee.getGrauInstrucao()));
            addTableRow(personalTable, "Sexo:", translateSexo(employee.getSexo()));
            addTableRow(personalTable, "Telefone:", formatPhoneNumber(employee.getPhone()));
            addTableRow(personalTable, "Email:", employee.getEmail());
            addTableRow(personalTable, "Endereço:", buildAddress(employee));
            document.add(personalTable);

            // DOCUMENTOS
            Paragraph documentsTitle = new Paragraph("DOCUMENTOS")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(documentsTitle);

            Table documentsTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            // CTPS Completo
            String ctpsCompleto = buildCTPSCompleto(employee);
            addTableRow(documentsTable, "CTPS:", ctpsCompleto);
            if (employee.getCtpsRural() != null && !employee.getCtpsRural().trim().isEmpty()) {
                addTableRow(documentsTable, "CTPS (Rural):", employee.getCtpsRural());
            }

            // RG Completo
            String rgCompleto = buildRGCompleto(employee);
            addTableRow(documentsTable, "C. Identidade (RG):", rgCompleto);

            // Título de Eleitor Completo
            String tituloCompleto = buildTituloEleitorCompleto(employee);
            addTableRow(documentsTable, "Título de Eleitor:", tituloCompleto);

            // CNH
            String cnhCompleto = buildCNHCompleto(employee);
            if (!cnhCompleto.isEmpty()) {
                addTableRow(documentsTable, "CNH:", cnhCompleto);
            }

            // Certificado Militar
            if (employee.getCertificadoMilitar() != null && !employee.getCertificadoMilitar().trim().isEmpty()) {
                addTableRow(documentsTable, "Cert. Militar:", employee.getCertificadoMilitar());
            }

            document.add(documentsTable);

            // DADOS PROFISSIONAIS
            Paragraph professionalTitle = new Paragraph("DADOS PROFISSIONAIS")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(professionalTitle);

            Table professionalTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            if (employee.getRegistrationNumber() != null && !employee.getRegistrationNumber().trim().isEmpty()) {
                addTableRow(professionalTable, "Nº Registro:", employee.getRegistrationNumber());
            }
            addTableRow(professionalTable, "Data de Admissão:", formatDate(employee.getHireDate()));
            addTableRow(professionalTable, "Cargo:",
                    employee.getPosition() != null ? employee.getPosition().getName() : "");
            addTableRow(professionalTable, "Setor:", employee.getUnit() != null ? employee.getUnit().getName() : "");
            addTableRow(professionalTable, "CBO:", employee.getCbo());

            // Salário
            if (employee.getSalario() != null) {
                String salarioStr = "R$ " + String.format("%.2f", employee.getSalario());
                if (employee.getSalarioPorExtenso() != null && !employee.getSalarioPorExtenso().trim().isEmpty()) {
                    salarioStr += " (" + employee.getSalarioPorExtenso() + ")";
                }
                addTableRow(professionalTable, "Salário:", salarioStr);
            }

            addTableRow(professionalTable, "Período de Pagamento:", employee.getPeriodoPagamento());
            addTableRow(professionalTable, "Escala de Trabalho:", employee.getEscalaTrabalho());
            document.add(professionalTable);

            // Quebra de página antes do FGTS
            document.add(
                    new com.itextpdf.layout.element.AreaBreak(com.itextpdf.layout.properties.AreaBreakType.NEXT_PAGE));

            // FGTS
            Paragraph fgtsTitle = new Paragraph("SITUAÇÃO PERANTE O FUNDO DE GARANTIA DO TEMPO DE SERVIÇO (FGTS)")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(fgtsTitle);

            Table fgtsTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            String fgtsOptante = (employee.getFgtsOptante() != null && employee.getFgtsOptante()) ? "Sim" : "Não";
            addTableRow(fgtsTable, "É optante?", fgtsOptante);
            addTableRow(fgtsTable, "Data da opção:", formatDate(employee.getFgtsDataOpcao()));
            addTableRow(fgtsTable, "Data da retratação:", formatDate(employee.getFgtsDataRetratacao()));
            addTableRow(fgtsTable, "Banco depositário:", employee.getFgtsBancoDepositario());
            document.add(fgtsTable);

            // PIS COMPLETO
            Paragraph pisTitle = new Paragraph("PROGRAMA DE INTEGRAÇÃO SOCIAL (PIS)")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(pisTitle);

            Table pisTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            addTableRow(pisTable, "Número PIS:", employee.getPis());
            addTableRow(pisTable, "Cadastrado em:", formatDate(employee.getPisDataCadastro()));
            document.add(pisTable);

            // DADOS BANCÁRIOS
            Paragraph bankTitle = new Paragraph("DADOS BANCÁRIOS")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(bankTitle);

            Table bankTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            addTableRow(bankTable, "Banco:", employee.getBanco());
            addTableRow(bankTable, "Agência:", employee.getAgencia());

            String contaStr = employee.getContaCorrente() != null ? employee.getContaCorrente() : "";
            if (employee.getContaDigito() != null && !employee.getContaDigito().trim().isEmpty()) {
                contaStr += "-" + employee.getContaDigito();
            }
            addTableRow(bankTable, "Conta Corrente:", contaStr);
            addTableRow(bankTable, "Chave PIX:", employee.getPixKey());

            document.add(bankTable);

            // DADOS FAMILIARES
            Paragraph familyTitle = new Paragraph("DADOS FAMILIARES")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(familyTitle);

            Table familyTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            addTableRow(familyTable, "Filho de (Pai):", employee.getNomePai());
            addTableRow(familyTable, "Filho de (Mãe):", employee.getNomeMae());
            if (employee.getMaritalStatus() != null && !employee.getMaritalStatus().trim().isEmpty() &&
                    !employee.getMaritalStatus().equalsIgnoreCase("Solteiro")) {
                addTableRow(familyTable, "Nome do Cônjuge:", employee.getNomeConjugeEstrangeiro());
            }
            document.add(familyTable);

            // Bloco final: Visto, Observações e Assinatura mantidos juntos na mesma página
            com.itextpdf.layout.element.Div finalBlock = new com.itextpdf.layout.element.Div().setKeepTogether(true);

            // VISTO DA FISCALIZAÇÃO
            if (employee.getVistoFiscalizacao() != null && !employee.getVistoFiscalizacao().trim().isEmpty()) {
                Paragraph vistoTitle = new Paragraph("VISTO DA FISCALIZAÇÃO")
                        .setBold()
                        .setFontSize(12)
                        .setMarginTop(10)
                        .setMarginBottom(10);
                finalBlock.add(vistoTitle);

                Paragraph visto = new Paragraph(employee.getVistoFiscalizacao())
                        .setFontSize(10)
                        .setMarginBottom(15);
                finalBlock.add(visto);
            }

            // OBSERVAÇÕES
            if (employee.getNotes() != null && !employee.getNotes().trim().isEmpty()) {
                Paragraph notesTitle = new Paragraph("OBSERVAÇÕES")
                        .setBold()
                        .setFontSize(12)
                        .setMarginTop(10)
                        .setMarginBottom(10);
                finalBlock.add(notesTitle);

                Paragraph notes = new Paragraph(employee.getNotes())
                        .setFontSize(10)
                        .setMarginBottom(10);
                finalBlock.add(notes);
            }

            // LINHA PARA ASSINATURA DO EMPREGADO
            Paragraph signature = new Paragraph("Assinatura do Empregado: _________________________________")
                    .setFontSize(10)
                    .setMarginTop(30)
                    .setMarginBottom(10);
            finalBlock.add(signature);

            document.add(finalBlock);

            // DATA DE RESCISÃO (se houver)
            if (employee.getTerminationDate() != null) {
                Paragraph terminationDate = new Paragraph("Data Rescisão: " + formatDate(employee.getTerminationDate()))
                        .setFontSize(9)
                        .setTextAlignment(TextAlignment.RIGHT)
                        .setMarginTop(10);
                document.add(terminationDate);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar ficha de registro completa com layout padrão", e);
            throw e;
        }

        log.info("✅ Ficha de registro completa gerada com sucesso. Tamanho: {} bytes", baos.size());
        return baos.toByteArray();
    }

    private Image loadEmployeePhoto(Employee employee) throws IOException {
        // Verificar se há photoUrl ou outro campo de foto
        // Por enquanto, retornar null se não houver implementação de foto
        // TODO: Implementar carregamento de foto do funcionário quando disponível
        return null;
    }

    private String buildNaturalidade(Employee employee) {
        StringBuilder naturalidade = new StringBuilder();
        if (employee.getMunicipioNascimento() != null && !employee.getMunicipioNascimento().trim().isEmpty()) {
            naturalidade.append(employee.getMunicipioNascimento());
        } else if (employee.getLocalNascimento() != null && !employee.getLocalNascimento().trim().isEmpty()) {
            naturalidade.append(employee.getLocalNascimento());
        }
        if (employee.getEstadoNascimento() != null && !employee.getEstadoNascimento().trim().isEmpty()) {
            if (naturalidade.length() > 0) {
                naturalidade.append(" - ");
            }
            naturalidade.append(employee.getEstadoNascimento());
        }
        return naturalidade.toString();
    }

    private String buildCTPSCompleto(Employee employee) {
        StringBuilder ctps = new StringBuilder();
        if (employee.getCtps() != null && !employee.getCtps().trim().isEmpty()) {
            ctps.append(employee.getCtps());
        }
        if (employee.getCtpsSeries() != null && !employee.getCtpsSeries().trim().isEmpty()) {
            if (ctps.length() > 0)
                ctps.append(" - Série: ");
            ctps.append(employee.getCtpsSeries());
        }
        if (employee.getCtpsIssueDate() != null) {
            if (ctps.length() > 0)
                ctps.append(" - Emissão: ");
            ctps.append(formatDate(employee.getCtpsIssueDate()));
        }
        if (employee.getCtpsIssuingAgency() != null && !employee.getCtpsIssuingAgency().trim().isEmpty()) {
            if (ctps.length() > 0)
                ctps.append(" - Órgão: ");
            ctps.append(employee.getCtpsIssuingAgency());
        }
        return ctps.toString();
    }

    private String buildRGCompleto(Employee employee) {
        StringBuilder rg = new StringBuilder();
        // Tentar CIN primeiro (Carteira de Identidade Nacional)
        if (employee.getCinNumero() != null && !employee.getCinNumero().trim().isEmpty()) {
            rg.append(employee.getCinNumero());
            if (employee.getCinOrgaoEmissor() != null && !employee.getCinOrgaoEmissor().trim().isEmpty()) {
                rg.append(" - ").append(employee.getCinOrgaoEmissor());
            }
            if (employee.getCinDataEmissao() != null) {
                rg.append(" - Emissão: ").append(formatDate(employee.getCinDataEmissao()));
            }
        } else {
            // Usar campos de carteira de identidade se CIN não estiver disponível
            // Nota: Não há campo 'rg' direto no modelo, usando apenas CIN e carteira de
            // identidade
            if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                    && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
                rg.append(employee.getCarteiraIdentidadeOrgaoEmissor());
            }
            if (employee.getCarteiraIdentidadeDataEmissao() != null) {
                if (rg.length() > 0)
                    rg.append(" - ");
                rg.append("Emissão: ").append(formatDate(employee.getCarteiraIdentidadeDataEmissao()));
            }
        }
        return rg.toString();
    }

    private String buildTituloEleitorCompleto(Employee employee) {
        StringBuilder titulo = new StringBuilder();
        if (employee.getTituloEleitor() != null && !employee.getTituloEleitor().trim().isEmpty()) {
            titulo.append(employee.getTituloEleitor());
        }
        if (employee.getTituloEleitorZona() != null && !employee.getTituloEleitorZona().trim().isEmpty()) {
            if (titulo.length() > 0)
                titulo.append(" - Zona: ");
            titulo.append(employee.getTituloEleitorZona());
        }
        if (employee.getTituloEleitorSecao() != null && !employee.getTituloEleitorSecao().trim().isEmpty()) {
            if (titulo.length() > 0)
                titulo.append(" - Seção: ");
            titulo.append(employee.getTituloEleitorSecao());
        }
        if (employee.getTituloEleitorDataExpedicao() != null) {
            if (titulo.length() > 0)
                titulo.append(" - Expedição: ");
            titulo.append(formatDate(employee.getTituloEleitorDataExpedicao()));
        }
        return titulo.toString();
    }

    private String buildCNHCompleto(Employee employee) {
        StringBuilder cnh = new StringBuilder();
        if (employee.getCnhNumber() != null && !employee.getCnhNumber().trim().isEmpty()) {
            cnh.append(employee.getCnhNumber());
            if (employee.getCnhCategory() != null && !employee.getCnhCategory().trim().isEmpty()) {
                cnh.append(" - Categoria: ").append(employee.getCnhCategory());
            }
            if (employee.getCnhExpirationDate() != null) {
                cnh.append(" - Validade: ").append(formatDate(employee.getCnhExpirationDate()));
            }
        }
        return cnh.toString();
    }

    public byte[] generateEmployeeRecordExcel(UUID employeeId) throws Exception {
        log.info("📊 Gerando ficha de registro do funcionário (Excel) ID: {}", employeeId);

        Employee employee = employeeService.findById(employeeId);
        if (employee == null) {
            throw new RuntimeException("Funcionário não encontrado");
        }

        Company company = null;
        if (employee.getCompany() != null) {
            company = companyRepository.findById(employee.getCompany().getId()).orElse(null);
        }
        Company reportCompany = resolveCompany(company);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Ficha Registro");
            int lastColumn = 1;
            int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, reportCompany,
                    "FICHA DE REGISTRO DO FUNCIONÁRIO", lastColumn);

            CellStyle labelStyle = createLabelStyle(workbook);
            CellStyle valueStyle = createValueStyle(workbook);

            // DADOS DA EMPRESA
            if (company != null) {
                rowIndex = addSection(sheet, rowIndex, "DADOS DA EMPRESA", lastColumn, workbook);
                rowIndex = addRow(sheet, rowIndex, "Razão Social:", company.getName(), labelStyle, valueStyle);
                rowIndex = addRow(sheet, rowIndex, "CNPJ/CEI:", company.getCnpj(), labelStyle, valueStyle);
                rowIndex = addRow(sheet, rowIndex, "Endereço:", company.getAddress(), labelStyle, valueStyle);
            }

            // DADOS PESSOAIS
            rowIndex = addSection(sheet, rowIndex, "DADOS PESSOAIS", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Nome:", employee.getName(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "CPF:", employee.getDocument(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Data de Nascimento:", formatDate(employee.getBirthDate()), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Nacionalidade:",
                    employee.getNationality() != null ? employee.getNationality() : "Brasileira", labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Naturalidade:", buildNaturalidade(employee), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Estado Civil:", employee.getMaritalStatus(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Grau de Instrução:", employee.getGrauInstrucao(), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Telefone:", employee.getPhone(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Email:", employee.getEmail(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Endereço:", buildAddress(employee), labelStyle, valueStyle);

            // DOCUMENTOS
            rowIndex = addSection(sheet, rowIndex, "DOCUMENTOS", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "CTPS:", buildCTPSCompleto(employee), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "RG:", buildRGCompleto(employee), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Título de Eleitor:", buildTituloEleitorCompleto(employee), labelStyle,
                    valueStyle);
            String cnhCompleto = buildCNHCompleto(employee);
            if (!cnhCompleto.isEmpty()) {
                rowIndex = addRow(sheet, rowIndex, "CNH:", cnhCompleto, labelStyle, valueStyle);
            }
            rowIndex = addRow(sheet, rowIndex, "Cert. Militar:", employee.getCertificadoMilitar(), labelStyle,
                    valueStyle);

            // DADOS PROFISSIONAIS
            rowIndex = addSection(sheet, rowIndex, "DADOS PROFISSIONAIS", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Data de Admissão:", formatDate(employee.getHireDate()), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Cargo:",
                    employee.getPosition() != null ? employee.getPosition().getName() : "", labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Setor:", employee.getUnit() != null ? employee.getUnit().getName() : "",
                    labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "CBO:", employee.getCbo(), labelStyle, valueStyle);
            if (employee.getSalario() != null) {
                String salarioStr = "R$ " + String.format("%.2f", employee.getSalario());
                if (employee.getSalarioPorExtenso() != null && !employee.getSalarioPorExtenso().trim().isEmpty()) {
                    salarioStr += " (" + employee.getSalarioPorExtenso() + ")";
                }
                rowIndex = addRow(sheet, rowIndex, "Salário:", salarioStr, labelStyle, valueStyle);
            }
            rowIndex = addRow(sheet, rowIndex, "Horário de Trabalho:", employee.getHorarioTrabalho(), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Folga Semanal:", employee.getFolgaSemanal(), labelStyle, valueStyle);

            // FGTS
            rowIndex = addSection(sheet, rowIndex, "FGTS", lastColumn, workbook);
            String fgtsOptante = (employee.getFgtsOptante() != null && employee.getFgtsOptante()) ? "Sim" : "Não";
            rowIndex = addRow(sheet, rowIndex, "É optante?", fgtsOptante, labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Data da opção:", formatDate(employee.getFgtsDataOpcao()), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Banco depositário:", employee.getFgtsBancoDepositario(), labelStyle,
                    valueStyle);

            // PIS
            rowIndex = addSection(sheet, rowIndex, "PIS", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Número PIS:", employee.getPis(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Cadastrado em:", formatDate(employee.getPisDataCadastro()), labelStyle,
                    valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Banco depositário:", employee.getPisBancoDepositario(), labelStyle,
                    valueStyle);

            // DADOS FAMILIARES
            rowIndex = addSection(sheet, rowIndex, "DADOS FAMILIARES", lastColumn, workbook);
            rowIndex = addRow(sheet, rowIndex, "Pai:", employee.getNomePai(), labelStyle, valueStyle);
            rowIndex = addRow(sheet, rowIndex, "Mãe:", employee.getNomeMae(), labelStyle, valueStyle);

            if (employee.getNotes() != null && !employee.getNotes().trim().isEmpty()) {
                rowIndex = addSection(sheet, rowIndex, "OBSERVAÇÕES", lastColumn, workbook);
                rowIndex = addRow(sheet, rowIndex, "Notas:", employee.getNotes(), labelStyle, valueStyle);
            }

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            excelReportLayoutService.addFooter(sheet, workbook, reportCompany, lastColumn);

            // Configurar layout de impressão (headers/footers nativos, repetição de linhas,
            // margens)
            excelReportLayoutService.setupPrintLayout(sheet, reportCompany, "FICHA DE REGISTRO DE FUNCIONÁRIO", 6);

            workbook.write(out);
            log.info("✅ Ficha de registro (Excel) gerada com sucesso. Tamanho: {} bytes", out.size());
            return out.toByteArray();
        }
    }

    private void addTableRow(Table table, String label, String value) {
        table.addCell(createLabelCell(label));
        table.addCell(createValueCell(value));
    }

    private int addRow(Sheet sheet, int rowIndex, String label, String value, CellStyle labelStyle,
            CellStyle valueStyle) {
        Row row = sheet.createRow(rowIndex++);
        org.apache.poi.ss.usermodel.Cell labelCell = row.createCell(0);
        labelCell.setCellValue(label != null ? label : "");
        labelCell.setCellStyle(labelStyle);

        org.apache.poi.ss.usermodel.Cell valueCell = row.createCell(1);
        valueCell.setCellValue(value != null ? value : "");
        valueCell.setCellStyle(valueStyle);
        return rowIndex;
    }

    private int addSection(Sheet sheet, int rowIndex, String title, int lastColumn, Workbook workbook) {
        Row row = sheet.createRow(rowIndex++);
        org.apache.poi.ss.usermodel.Cell cell = row.createCell(0);
        cell.setCellValue(title);
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        cell.setCellStyle(style);
        sheet.addMergedRegion(
                new org.apache.poi.ss.util.CellRangeAddress(row.getRowNum(), row.getRowNum(), 0, lastColumn));
        return rowIndex;
    }

    private CellStyle createLabelStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        return style;
    }

    private CellStyle createValueStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setWrapText(true);
        style.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        return style;
    }

    private Cell createLabelCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "")
                        .setBold()
                        .setFontSize(10)
                        .setMultipliedLeading(1.0f))
                .setBackgroundColor(new DeviceRgb(240, 240, 240))
                .setPadding(1.5f); // Reduced padding to compress rows
    }

    private Cell createValueCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "")
                        .setFontSize(10)
                        .setMultipliedLeading(1.0f))
                .setPadding(1.5f); // Reduced padding to compress rows
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

    private String translateMaritalStatus(String status) {
        if (status == null || status.trim().isEmpty())
            return "";
        log.debug("Translating marital status: {}", status);
        switch (status.toUpperCase()) {
            case "SINGLE":
            case "SOLTEIRO":
            case "SOLTEIRA":
                return "Solteiro(a)";
            case "MARRIED":
            case "CASADO":
            case "CASADA":
                return "Casado(a)";
            case "DIVORCED":
            case "DIVORCIADO":
            case "DIVORCIADA":
                return "Divorciado(a)";
            case "WIDOWED":
            case "VIUVO":
            case "VIUVA":
                return "Viúvo(a)";
            case "SEPARATED":
            case "SEPARADO":
            case "SEPARADA":
                return "Separado(a)";
            case "STABLE_UNION":
            case "UNIAO_ESTAVEL":
                return "União Estável";
            default:
                return status;
        }
    }

    private String translateSexo(String sexo) {
        if (sexo == null || sexo.trim().isEmpty())
            return "";
        log.debug("Translating sexo: {}", sexo);
        switch (sexo.toUpperCase()) {
            case "M":
            case "MALE":
            case "MASCULINO":
                return "Masculino";
            case "F":
            case "FEMALE":
            case "FEMININO":
                return "Feminino";
            case "OTHER":
            case "OUTRO":
                return "Outro";
            default:
                return sexo;
        }
    }

    private String formatPhoneNumber(String phone) {
        if (phone == null || phone.trim().isEmpty())
            return "";
        String numbers = phone.replaceAll("\\D", "");
        if (numbers.length() == 11) {
            return String.format("(%s) %s-%s", numbers.substring(0, 2), numbers.substring(2, 7),
                    numbers.substring(7, 11));
        } else if (numbers.length() == 10) {
            return String.format("(%s) %s-%s", numbers.substring(0, 2), numbers.substring(2, 6),
                    numbers.substring(6, 10));
        }
        return phone;
    }

    private String translateGrauInstrucao(String grau) {
        if (grau == null || grau.trim().isEmpty())
            return "";
        log.debug("Translating grau instrução: {}", grau);
        // Mapeamento básico se vierem termos técnicos ou em inglês
        switch (grau.toUpperCase()) {
            case "ELEMENTARY":
                return "Ensino Fundamental";
            case "HIGH_SCHOOL":
                return "Ensino Médio";
            case "SUPERIOR":
            case "GRADUATE":
                return "Ensino Superior";
            case "POST_GRADUATE":
                return "Pós-Graduação";
            default:
                String[] words = grau.split("_");
                StringBuilder sb = new StringBuilder();
                for (String word : words) {
                    if (!word.isEmpty()) {
                        sb.append(Character.toUpperCase(word.charAt(0)));
                        if (word.length() > 1) {
                            sb.append(word.substring(1).toLowerCase());
                        }
                        sb.append(" ");
                    }
                }
                return sb.toString().trim();
        }
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
}
