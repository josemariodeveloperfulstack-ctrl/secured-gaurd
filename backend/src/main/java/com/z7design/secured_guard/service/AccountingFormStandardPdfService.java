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
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.apache.poi.ss.usermodel.CellStyle;
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
        private final EmployeeDocumentDateResolver documentDateResolver;

        @Transactional(readOnly = true)
        public byte[] generateAccountingFormPdf(UUID employeeId) throws Exception {
                log.info("📄 Gerando ficha de contabilidade em PDF para funcionário ID: {}", employeeId);

                Employee employee = loadEmployee(employeeId);
                Company company = loadCompany(employee);

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                try {
                        UUID companyId = resolveCompanyId(company);
                        PdfWriter writer = new PdfWriter(baos);
                        var layoutBuilder = ReportLayoutConfig.builder()
                                        .companyId(companyId)
                                        .reportTitle("FICHA DE CADASTRO DE FUNCIONÁRIO")
                                        .reportSubTitle("Para Departamento de Contabilidade")
                                        .topMargin(108f)
                                        .bottomMargin(60f)
                                        .leftMargin(22f)
                                        .rightMargin(22f);
                        documentDateResolver.applyAdmissionDateFooter(layoutBuilder, employeeId);
                        ReportLayoutConfig layoutConfig = layoutBuilder.build();
                        DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                        Document document = docWithPdf.getDocument();

                        document.add(new Paragraph("PROMOVER TERCEIRIZAÇÃO E SERVIÇOS LTDA")
                                        .setBold().setFontSize(9).setTextAlignment(TextAlignment.CENTER).setMarginBottom(4));

                        Table empresaTopo = new Table(UnitValue.createPercentArray(new float[] { 18, 52, 15, 15 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        empresaTopo.addCell(topLabel("EMPRESA CONTRATANTE"));
                        empresaTopo.addCell(topValue(nvl(company != null ? company.getName() : employee.getEmpresaNome())));
                        empresaTopo.addCell(topLabel("CNPJ"));
                        empresaTopo.addCell(topValue(CompanyDataFormatter.formatCnpj(company != null ? company.getCnpj() : employee.getEmpresaCnpj())));
                        empresaTopo.addCell(topLabel("ENDEREÇO"));
                        empresaTopo.addCell(new Cell(1, 3)
                                        .add(new Paragraph(nvl(company != null ? company.getAddress() : employee.getEmpresaEndereco())).setFontSize(8f))
                                        .setPadding(3f));
                        document.add(empresaTopo);

                        document.add(sectionTitle("Dados pessoais"));
                        Table pessoais = new Table(UnitValue.createPercentArray(new float[] { 18, 32, 18, 32 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        addRow(pessoais, "Nome Completo", employee.getFullName(), "Nome da Mãe", employee.getNomeMae());
                        addRow(pessoais, "Nome do Pai", employee.getNomePai(), "Endereço", buildAddress(employee));
                        addRow(pessoais, "Data Nascimento", displayDate(employee.getBirthDate()), "Naturalidade", buildNaturalidade(employee));
                        addRow(pessoais, "UF", employee.getEstadoNascimento(), "Sexo", employee.getSexo());
                        addRow(pessoais, "Grau de Instrução", employee.getGrauInstrucao(), "Estado Civil", translateMaritalStatus(employee.getMaritalStatus()));
                        addRow(pessoais, "Raça/Cor", employee.getRacaCor(), "Deficiente", "Nenhuma");
                        document.add(pessoais);

                        document.add(sectionTitle("Documentos"));
                        Table docs = new Table(UnitValue.createPercentArray(new float[] { 18, 32, 18, 32 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        addRow(docs, "RG", buildRg(employee), "Data Emissão", displayDate(employee.getCarteiraIdentidadeDataEmissao()));
                        addRow(docs, "Órgão Emissor", employee.getCarteiraIdentidadeOrgaoEmissor(), "UF", employee.getRgUf());
                        addRow(docs, "CPF", employee.getCpf() != null && !employee.getCpf().isBlank() ? employee.getCpf() : employee.getDocument(), "Título de Eleitor", employee.getTituloEleitor());
                        addRow(docs, "Zona/Seção", buildZonaSecao(employee), "PIS", employee.getPis());
                        addRow(docs, "CTPS", CompanyDataFormatter.formatCtps(employee.getCtps()), "Série", employee.getCtpsSeries());
                        addRow(docs, "CNH", employee.getCnhNumber(), "Validade", displayDate(employee.getCnhExpirationDate()));
                        addRow(docs, "Certificado Militar", employee.getCertificadoMilitar(), "Carteira de Reservista", "");
                        document.add(docs);

                        document.add(sectionTitle("Dados do Exame Médico"));
                        Table aso = new Table(UnitValue.createPercentArray(new float[] { 18, 32, 18, 32 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        addRow(aso, "Data Exame Médico (ASO)", displayDate(employee.getExameMedicoData()), "Tipo Exames Realizados", employee.getExameMedicoTipo());
                        addRow(aso, "Nome do Médico", employee.getExameMedicoDoctor() != null ? employee.getExameMedicoDoctor().getName() : "", "CRM nº", "");
                        addRow(aso, "Horário", employee.getExameMedicoHorario(), "Intervalos Almoço/Janta", displayYesNo(employee.getExameMedicoIntervalosRefeicao()));
                        addRow(aso, "Horário Intervalo", employee.getExameMedicoHorarioIntervalo(), "Contribuição Sindical paga", displayYesNo(employee.getExameMedicoContribuicaoSindicalPaga()));
                        addRow(aso, "Primeiro Emprego", displayYesNo(employee.getExameMedicoPrimeiroEmprego()), "Observações", employee.getExameMedicoObservacoes());
                        document.add(aso);

                        document.add(sectionTitle("Para Estrangeiro"));
                        Table estrangeiro = new Table(UnitValue.createPercentArray(new float[] { 18, 32, 18, 32 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        addRow(estrangeiro, "RNE nº", employee.getRneNumero(), "Validade", displayDate(employee.getRneValidade()));
                        addRow(estrangeiro, "Tipo de Visto", employee.getTipoVisto(), "Casado Brasileiro", displayYesNo(employee.getCasadoBrasileiro()));
                        addRow(estrangeiro, "Possui Filhos Brasileiros", displayYesNo(employee.getTemFilhosBrasileiros()), "Quantos",
                                        employee.getQuantidadeFilhosBrasileiros() != null ? String.valueOf(employee.getQuantidadeFilhosBrasileiros()) : "");
                        addRow(estrangeiro, "RIC nº", employee.getRicNumero(), "Órgão/Data Emissão",
                                        nvl(employee.getRicOrgaoEmissor()) + " / " + displayDate(employee.getRicDataEmissao()));
                        document.add(estrangeiro);

                        document.add(sectionTitle("Relação de Dependentes para Imposto de Renda e Salário Família"));
                        Table dependentes = new Table(UnitValue.createPercentArray(new float[] { 40, 25, 20, 15 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        dependentes.addHeaderCell(headCell("Nome"));
                        dependentes.addHeaderCell(headCell("Parentesco"));
                        dependentes.addHeaderCell(headCell("Data Nascimento"));
                        dependentes.addHeaderCell(headCell("CPF"));
                        List<com.z7design.secured_guard.model.Dependent> deps = employee.getDependents() != null ? employee.getDependents() : List.of();
                        for (int i = 0; i < 4; i++) {
                                com.z7design.secured_guard.model.Dependent d = i < deps.size() ? deps.get(i) : null;
                                dependentes.addCell(bodyCell(d != null ? d.getName() : ""));
                                dependentes.addCell(bodyCell(d != null ? d.getRelationship() : ""));
                                dependentes.addCell(bodyCell(d != null ? displayDate(d.getBirthDate()) : ""));
                                dependentes.addCell(bodyCell(d != null ? d.getCpf() : ""));
                        }
                        document.add(dependentes);

                        document.add(sectionTitle("Para Preenchimento da Empresa"));
                        Table empresa = new Table(UnitValue.createPercentArray(new float[] { 18, 32, 18, 32 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        addRow(empresa, "Data de admissão", displayDate(employee.getHireDate()), "Função", employee.getPosition() != null ? employee.getPosition().getName() : "");
                        addRow(empresa, "Setor", employee.getUnit() != null ? employee.getUnit().getName() : "", "Salário", employee.getSalario() != null ? String.format("R$ %.2f", employee.getSalario()) : "");
                        addRow(empresa, "Forma de Pagamento", employee.getPeriodoPagamento(), "Prazo de Experiência", employee.getPrazoExperienciaTexto());
                        addRow(empresa, "Prorrogação", employee.getProrrogacaoExperiencia(), "Dias de Trabalho", employee.getDiasTrabalho());
                        addRow(empresa, "Horário de Trabalho", employee.getHorarioTrabalho(), "Intervalo", employee.getHorarioTrabalhoIntervalo());
                        addRow(empresa, "Dias de Folga", employee.getFolgaSemanal(), "Escala de Trabalho", employee.getEscalaTrabalho());
                        document.add(empresa);

                        document.add(sectionTitle("Tipo de Contrato"));
                        Table contrato = new Table(UnitValue.createPercentArray(new float[] { 33, 33, 34 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        contrato.addCell(bodyCell("(  X  ) Empregado / CLT"));
                        contrato.addCell(bodyCell("(     ) MEI"));
                        contrato.addCell(bodyCell("(     ) Autônomo"));
                        document.add(contrato);

                        document.add(sectionTitle("Benefícios"));
                        Table beneficios = new Table(UnitValue.createPercentArray(new float[] { 26, 14, 20, 20, 20 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        beneficios.addHeaderCell(headCell("Benefício"));
                        beneficios.addHeaderCell(headCell("Possui"));
                        beneficios.addHeaderCell(headCell("Valor Diário"));
                        beneficios.addHeaderCell(headCell("% Desconto"));
                        beneficios.addHeaderCell(headCell("Valor Desconto Mensal"));
                        addBeneficioRow(beneficios, "Vale Transporte", resolveBeneficioPossui(employee, "TRANSPORT"), "", "", "");
                        addBeneficioRow(beneficios, "Vale Refeição", resolveBeneficioPossui(employee, "MEAL"), "", "", "");
                        addBeneficioRow(beneficios, "Vale Alimentação", resolveBeneficioPossui(employee, "FOOD", "ALIMENTACAO"), "", "", "");
                        addBeneficioRow(beneficios, "Vale Assistência Médica", resolveBeneficioPossui(employee, "HEALTH"), "", "", "");
                        addBeneficioRow(beneficios, "Vale Odontológica", resolveBeneficioPossui(employee, "DENTAL"), "", "", "");
                        addBeneficioRow(beneficios, "Seguro de Vida", resolveBeneficioPossui(employee, "LIFE_INSURANCE"), "", "", "");
                        document.add(beneficios);

                        document.add(sectionTitle("Pagamento de Salário em Conta"));
                        Table banco = new Table(UnitValue.createPercentArray(new float[] { 25, 25, 25, 25 }))
                                        .useAllAvailableWidth().setFontSize(8f);
                        banco.addHeaderCell(headCell("Tipo da Conta"));
                        banco.addHeaderCell(headCell("Banco"));
                        banco.addHeaderCell(headCell("Agência"));
                        banco.addHeaderCell(headCell("Conta"));
                        banco.addCell(bodyCell(employee.getAccountType()));
                        banco.addCell(bodyCell(employee.getBanco()));
                        banco.addCell(bodyCell(employee.getAgencia()));
                        banco.addCell(bodyCell(employee.getContaCorrente()));
                        document.add(banco);

                        document.add(sectionTitle("Documentos Necessários"));
                        document.add(new Paragraph(
                                        "• 01 foto 3x4\n" +
                                        "• Carteira Profissional\n" +
                                        "• Exame Admissional\n" +
                                        "• 01 Cópia do documento RG ou RNE se estrangeiro\n" +
                                        "• 01 Cópia do CPF\n" +
                                        "• 01 Cópia da Carteira de Habilitação\n" +
                                        "• 01 Cópia do Título de Eleitor\n" +
                                        "• 01 Cópia do Comprovante de Residência Recente\n" +
                                        "• 01 Cópia do Cartão do Banco para pagamento de salário\n" +
                                        "• 01 Cópia do Cartão do PIS e/ou Cartão Cidadão\n" +
                                        "• 01 Cópia da Carteira Profissional\n" +
                                        "• 01 Cópia da Certidão de Conclusão de Curso")
                                        .setFontSize(8f)
                                        .setMarginTop(4)
                                        .setMarginBottom(8));

                        document.close();
                } catch (Exception e) {
                        log.error("Erro ao gerar ficha de contabilidade com layout estruturado", e);
                        throw e;
                }

                log.info("✅ Ficha de contabilidade gerada com sucesso. Tamanho: {} bytes", baos.size());
                return baos.toByteArray();
        }

        @Transactional(readOnly = true)
        public String generateAccountingFormHtml(UUID employeeId) {
                log.info("📄 Gerando ficha de contabilidade HTML (layout padrão) para funcionário ID: {}", employeeId);
                Employee employee = loadEmployee(employeeId);
                Company company = loadCompany(employee);
                return buildStructuredHtml(employee, company);
        }

        @Transactional(readOnly = true)
        public byte[] generateAccountingFormExcel(UUID employeeId) throws Exception {
                log.info("📊 Gerando ficha de contabilidade (Excel) para funcionário ID: {}", employeeId);

                Employee employee = loadEmployee(employeeId);
                Company company = loadCompany(employee);
                Company reportCompany = resolveCompany(company);

                try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Sheet sheet = workbook.createSheet("Ficha Contabilidade");
                        int lastColumn = 3;
                        int rowIndex = excelReportLayoutService.addHeader(sheet, workbook, reportCompany,
                                        "FICHA DE CADASTRO DE FUNCIONÁRIO", lastColumn);

                        CellStyle labelStyle = excelReportLayoutService.createLabelStyle(workbook);
                        CellStyle valueStyle = excelReportLayoutService.createValueStyle(workbook);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex,
                                        "Para Departamento de Contabilidade", lastColumn, workbook);
                        rowIndex = addExcelFullRow(sheet, rowIndex, "PROMOVER TERCEIRIZAÇÃO E SERVIÇOS LTDA",
                                        labelStyle, valueStyle, lastColumn);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Empresa contratante",
                                        lastColumn, workbook);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "EMPRESA CONTRATANTE",
                                        nvl(company != null ? company.getName() : employee.getEmpresaNome()), "CNPJ",
                                        CompanyDataFormatter.formatCnpj(
                                                        company != null ? company.getCnpj() : employee.getEmpresaCnpj()),
                                        labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "ENDEREÇO",
                                        nvl(company != null ? company.getAddress() : employee.getEmpresaEndereco()), "",
                                        "", labelStyle, valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Dados pessoais", lastColumn,
                                        workbook);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Nome Completo", employee.getFullName(),
                                        "Nome da Mãe", employee.getNomeMae(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Nome do Pai", employee.getNomePai(), "Endereço",
                                        buildAddress(employee), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Data Nascimento",
                                        displayDate(employee.getBirthDate()), "Naturalidade", buildNaturalidade(employee),
                                        labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "UF", employee.getEstadoNascimento(), "Sexo",
                                        employee.getSexo(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Grau de Instrução", employee.getGrauInstrucao(),
                                        "Estado Civil", translateMaritalStatus(employee.getMaritalStatus()), labelStyle,
                                        valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Raça/Cor", employee.getRacaCor(), "Deficiente",
                                        "Nenhuma", labelStyle, valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Documentos", lastColumn,
                                        workbook);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "RG", buildRg(employee), "Data Emissão",
                                        displayDate(employee.getCarteiraIdentidadeDataEmissao()), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Órgão Emissor",
                                        employee.getCarteiraIdentidadeOrgaoEmissor(), "UF", employee.getRgUf(),
                                        labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "CPF",
                                        employee.getCpf() != null && !employee.getCpf().isBlank() ? employee.getCpf()
                                                        : employee.getDocument(),
                                        "Título de Eleitor", employee.getTituloEleitor(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Zona/Seção", buildZonaSecao(employee), "PIS",
                                        employee.getPis(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "CTPS",
                                        CompanyDataFormatter.formatCtps(employee.getCtps()), "Série",
                                        employee.getCtpsSeries(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "CNH", employee.getCnhNumber(), "Validade",
                                        displayDate(employee.getCnhExpirationDate()), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Certificado Militar",
                                        employee.getCertificadoMilitar(), "Carteira de Reservista", "", labelStyle,
                                        valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Dados do Exame Médico",
                                        lastColumn, workbook);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Data Exame Médico (ASO)",
                                        displayDate(employee.getExameMedicoData()), "Tipo Exames Realizados",
                                        employee.getExameMedicoTipo(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Nome do Médico",
                                        employee.getExameMedicoDoctor() != null ? employee.getExameMedicoDoctor().getName()
                                                        : "",
                                        "CRM nº", "", labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Horário", employee.getExameMedicoHorario(),
                                        "Intervalos Almoço/Janta",
                                        displayYesNo(employee.getExameMedicoIntervalosRefeicao()), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Horário Intervalo",
                                        employee.getExameMedicoHorarioIntervalo(), "Contribuição Sindical paga",
                                        displayYesNo(employee.getExameMedicoContribuicaoSindicalPaga()), labelStyle,
                                        valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Primeiro Emprego",
                                        displayYesNo(employee.getExameMedicoPrimeiroEmprego()), "Observações",
                                        employee.getExameMedicoObservacoes(), labelStyle, valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Para Estrangeiro", lastColumn,
                                        workbook);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "RNE nº", employee.getRneNumero(), "Validade",
                                        displayDate(employee.getRneValidade()), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Tipo de Visto", employee.getTipoVisto(),
                                        "Casado Brasileiro", displayYesNo(employee.getCasadoBrasileiro()), labelStyle,
                                        valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Possui Filhos Brasileiros",
                                        displayYesNo(employee.getTemFilhosBrasileiros()), "Quantos",
                                        employee.getQuantidadeFilhosBrasileiros() != null
                                                        ? String.valueOf(employee.getQuantidadeFilhosBrasileiros())
                                                        : "",
                                        labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "RIC nº", employee.getRicNumero(),
                                        "Órgão/Data Emissão",
                                        nvl(employee.getRicOrgaoEmissor()) + " / " + displayDate(employee.getRicDataEmissao()),
                                        labelStyle, valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex,
                                        "Relação de Dependentes para Imposto de Renda e Salário Família", lastColumn,
                                        workbook);
                        rowIndex = addExcelHeaderRow(sheet, rowIndex,
                                        new String[] { "Nome", "Parentesco", "Data Nascimento", "CPF" }, labelStyle);
                        List<com.z7design.secured_guard.model.Dependent> deps = employee.getDependents() != null
                                        ? employee.getDependents()
                                        : List.of();
                        for (int i = 0; i < 4; i++) {
                                com.z7design.secured_guard.model.Dependent d = i < deps.size() ? deps.get(i) : null;
                                rowIndex = addExcelHeaderRow(sheet, rowIndex,
                                                new String[] {
                                                                d != null ? nvl(d.getName()) : " - ",
                                                                d != null ? nvl(d.getRelationship()) : " - ",
                                                                d != null ? displayDate(d.getBirthDate()) : " - ",
                                                                d != null ? nvl(d.getCpf()) : " - "
                                                }, valueStyle);
                        }

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Para Preenchimento da Empresa",
                                        lastColumn, workbook);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Data de admissão",
                                        displayDate(employee.getHireDate()), "Função",
                                        employee.getPosition() != null ? employee.getPosition().getName() : "",
                                        labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Setor",
                                        employee.getUnit() != null ? employee.getUnit().getName() : "", "Salário",
                                        employee.getSalario() != null ? String.format("R$ %.2f", employee.getSalario())
                                                        : "",
                                        labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Forma de Pagamento", employee.getPeriodoPagamento(),
                                        "Prazo de Experiência", employee.getPrazoExperienciaTexto(), labelStyle,
                                        valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Prorrogação", employee.getProrrogacaoExperiencia(),
                                        "Dias de Trabalho", employee.getDiasTrabalho(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Horário de Trabalho", employee.getHorarioTrabalho(),
                                        "Intervalo", employee.getHorarioTrabalhoIntervalo(), labelStyle, valueStyle);
                        rowIndex = addExcelQuadRow(sheet, rowIndex, "Dias de Folga", employee.getFolgaSemanal(),
                                        "Escala de Trabalho", employee.getEscalaTrabalho(), labelStyle, valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Tipo de Contrato", lastColumn,
                                        workbook);
                        rowIndex = addExcelHeaderRow(sheet, rowIndex,
                                        new String[] { "(  X  ) Empregado / CLT", "(     ) MEI", "(     ) Autônomo", "" },
                                        valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Benefícios", lastColumn,
                                        workbook);
                        rowIndex = addExcelHeaderRow(sheet, rowIndex,
                                        new String[] { "Benefício", "Possui", "Valor Diário", "% Desconto" },
                                        labelStyle);
                        rowIndex = addExcelBeneficioRow(sheet, rowIndex, "Vale Transporte",
                                        resolveBeneficioPossui(employee, "TRANSPORT"), valueStyle);
                        rowIndex = addExcelBeneficioRow(sheet, rowIndex, "Vale Refeição",
                                        resolveBeneficioPossui(employee, "MEAL"), valueStyle);
                        rowIndex = addExcelBeneficioRow(sheet, rowIndex, "Vale Alimentação",
                                        resolveBeneficioPossui(employee, "FOOD", "ALIMENTACAO"), valueStyle);
                        rowIndex = addExcelBeneficioRow(sheet, rowIndex, "Vale Assistência Médica",
                                        resolveBeneficioPossui(employee, "HEALTH"), valueStyle);
                        rowIndex = addExcelBeneficioRow(sheet, rowIndex, "Vale Odontológica",
                                        resolveBeneficioPossui(employee, "DENTAL"), valueStyle);
                        rowIndex = addExcelBeneficioRow(sheet, rowIndex, "Seguro de Vida",
                                        resolveBeneficioPossui(employee, "LIFE_INSURANCE"), valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex,
                                        "Pagamento de Salário em Conta", lastColumn, workbook);
                        rowIndex = addExcelHeaderRow(sheet, rowIndex,
                                        new String[] { "Tipo da Conta", "Banco", "Agência", "Conta" }, labelStyle);
                        rowIndex = addExcelHeaderRow(sheet, rowIndex,
                                        new String[] { nvl(employee.getAccountType()), nvl(employee.getBanco()),
                                                        nvl(employee.getAgencia()), nvl(employee.getContaCorrente()) },
                                        valueStyle);

                        rowIndex = excelReportLayoutService.addSection(sheet, rowIndex, "Documentos Necessários",
                                        lastColumn, workbook);
                        rowIndex = addExcelFullRow(sheet, rowIndex, getDocumentosNecessariosText(), valueStyle,
                                        valueStyle, lastColumn);

                        for (int col = 0; col <= lastColumn; col++) {
                                sheet.autoSizeColumn(col);
                        }

                        excelReportLayoutService.addFooter(sheet, workbook, reportCompany, lastColumn);
                        excelReportLayoutService.setupPrintLayout(sheet, reportCompany,
                                        "FICHA DE CADASTRO DE FUNCIONÁRIO", 6);

                        workbook.write(out);
                        log.info("✅ Ficha de contabilidade (Excel) gerada com sucesso. Tamanho: {} bytes", out.size());
                        return out.toByteArray();
                }
        }

        private Employee loadEmployee(UUID employeeId) {
                return employeeRepository.findById(employeeId)
                                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));
        }

        private Company loadCompany(Employee employee) {
                if (employee.getCompany() == null) {
                        return null;
                }
                return companyRepository.findById(employee.getCompany().getId()).orElse(null);
        }

        private String buildStructuredHtml(Employee employee, Company company) {
                StringBuilder html = new StringBuilder();
                html.append("<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>");
                html.append("<title>Ficha de Cadastro - ").append(nvl(employee.getFullName())).append("</title>");
                html.append("<style>");
                html.append("body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:16px;}");
                html.append("h1{font-size:16px;text-align:center;margin:0 0 4px;} .sub{text-align:center;color:#444;margin:0 0 12px;}");
                html.append(".empresa-topo{text-align:center;font-weight:bold;margin-bottom:8px;}");
                html.append("h2{font-size:11px;color:#003366;margin:14px 0 4px;border-bottom:1px solid #ccd6e0;}");
                html.append("table{width:100%;border-collapse:collapse;margin-bottom:6px;}");
                html.append("td,th{border:1px solid #b8c4d0;padding:4px 6px;vertical-align:top;}");
                html.append("th{background:#ecf2f8;font-weight:bold;text-align:left;}");
                html.append(".lbl{font-weight:bold;background:#f7f9fb;width:18%;} .val{width:32%;}");
                html.append(".docs{white-space:pre-line;margin-top:4px;}");
                html.append("@media print{body{margin:10mm;} h2{page-break-after:avoid;} table{page-break-inside:avoid;}}");
                html.append("</style></head><body>");
                html.append("<h1>FICHA DE CADASTRO DE FUNCIONÁRIO</h1>");
                html.append("<p class='sub'>Para Departamento de Contabilidade</p>");
                html.append("<p class='empresa-topo'>PROMOVER TERCEIRIZAÇÃO E SERVIÇOS LTDA</p>");

                html.append("<table><tr>");
                html.append(htmlLabelCell("EMPRESA CONTRATANTE"));
                html.append(htmlValueCell(nvl(company != null ? company.getName() : employee.getEmpresaNome())));
                html.append(htmlLabelCell("CNPJ"));
                html.append(htmlValueCell(CompanyDataFormatter.formatCnpj(company != null ? company.getCnpj() : employee.getEmpresaCnpj())));
                html.append("</tr><tr>");
                html.append(htmlLabelCell("ENDEREÇO"));
                html.append("<td colspan='3'>").append(escapeHtml(nvl(company != null ? company.getAddress() : employee.getEmpresaEndereco()))).append("</td>");
                html.append("</tr></table>");

                appendHtmlSection(html, "Dados pessoais", employee);
                appendHtmlDocumentos(html, employee);
                appendHtmlExame(html, employee);
                appendHtmlEstrangeiro(html, employee);
                appendHtmlDependentes(html, employee);
                appendHtmlEmpresa(html, employee);
                appendHtmlContrato(html);
                appendHtmlBeneficios(html, employee);
                appendHtmlBanco(html, employee);
                html.append("<h2>Documentos Necessários</h2><div class='docs'>").append(escapeHtml(getDocumentosNecessariosText())).append("</div>");
                html.append("</body></html>");
                return html.toString();
        }

        private void appendHtmlSection(StringBuilder html, String title, Employee employee) {
                html.append("<h2>").append(escapeHtml(title)).append("</h2><table>");
                htmlRow(html, "Nome Completo", employee.getFullName(), "Nome da Mãe", employee.getNomeMae());
                htmlRow(html, "Nome do Pai", employee.getNomePai(), "Endereço", buildAddress(employee));
                htmlRow(html, "Data Nascimento", displayDate(employee.getBirthDate()), "Naturalidade", buildNaturalidade(employee));
                htmlRow(html, "UF", employee.getEstadoNascimento(), "Sexo", employee.getSexo());
                htmlRow(html, "Grau de Instrução", employee.getGrauInstrucao(), "Estado Civil", translateMaritalStatus(employee.getMaritalStatus()));
                htmlRow(html, "Raça/Cor", employee.getRacaCor(), "Deficiente", "Nenhuma");
                html.append("</table>");
        }

        private void appendHtmlDocumentos(StringBuilder html, Employee employee) {
                html.append("<h2>Documentos</h2><table>");
                htmlRow(html, "RG", buildRg(employee), "Data Emissão", displayDate(employee.getCarteiraIdentidadeDataEmissao()));
                htmlRow(html, "Órgão Emissor", employee.getCarteiraIdentidadeOrgaoEmissor(), "UF", employee.getRgUf());
                htmlRow(html, "CPF",
                                employee.getCpf() != null && !employee.getCpf().isBlank() ? employee.getCpf() : employee.getDocument(),
                                "Título de Eleitor", employee.getTituloEleitor());
                htmlRow(html, "Zona/Seção", buildZonaSecao(employee), "PIS", employee.getPis());
                htmlRow(html, "CTPS", CompanyDataFormatter.formatCtps(employee.getCtps()), "Série", employee.getCtpsSeries());
                htmlRow(html, "CNH", employee.getCnhNumber(), "Validade", displayDate(employee.getCnhExpirationDate()));
                htmlRow(html, "Certificado Militar", employee.getCertificadoMilitar(), "Carteira de Reservista", "");
                html.append("</table>");
        }

        private void appendHtmlExame(StringBuilder html, Employee employee) {
                html.append("<h2>Dados do Exame Médico</h2><table>");
                htmlRow(html, "Data Exame Médico (ASO)", displayDate(employee.getExameMedicoData()), "Tipo Exames Realizados",
                                employee.getExameMedicoTipo());
                htmlRow(html, "Nome do Médico",
                                employee.getExameMedicoDoctor() != null ? employee.getExameMedicoDoctor().getName() : "", "CRM nº", "");
                htmlRow(html, "Horário", employee.getExameMedicoHorario(), "Intervalos Almoço/Janta",
                                displayYesNo(employee.getExameMedicoIntervalosRefeicao()));
                htmlRow(html, "Horário Intervalo", employee.getExameMedicoHorarioIntervalo(), "Contribuição Sindical paga",
                                displayYesNo(employee.getExameMedicoContribuicaoSindicalPaga()));
                htmlRow(html, "Primeiro Emprego", displayYesNo(employee.getExameMedicoPrimeiroEmprego()), "Observações",
                                employee.getExameMedicoObservacoes());
                html.append("</table>");
        }

        private void appendHtmlEstrangeiro(StringBuilder html, Employee employee) {
                html.append("<h2>Para Estrangeiro</h2><table>");
                htmlRow(html, "RNE nº", employee.getRneNumero(), "Validade", displayDate(employee.getRneValidade()));
                htmlRow(html, "Tipo de Visto", employee.getTipoVisto(), "Casado Brasileiro", displayYesNo(employee.getCasadoBrasileiro()));
                htmlRow(html, "Possui Filhos Brasileiros", displayYesNo(employee.getTemFilhosBrasileiros()), "Quantos",
                                employee.getQuantidadeFilhosBrasileiros() != null
                                                ? String.valueOf(employee.getQuantidadeFilhosBrasileiros())
                                                : "");
                htmlRow(html, "RIC nº", employee.getRicNumero(), "Órgão/Data Emissão",
                                nvl(employee.getRicOrgaoEmissor()) + " / " + displayDate(employee.getRicDataEmissao()));
                html.append("</table>");
        }

        private void appendHtmlDependentes(StringBuilder html, Employee employee) {
                html.append("<h2>Relação de Dependentes para Imposto de Renda e Salário Família</h2>");
                html.append("<table><tr><th>Nome</th><th>Parentesco</th><th>Data Nascimento</th><th>CPF</th></tr>");
                List<com.z7design.secured_guard.model.Dependent> deps = employee.getDependents() != null ? employee.getDependents() : List.of();
                for (int i = 0; i < 4; i++) {
                        com.z7design.secured_guard.model.Dependent d = i < deps.size() ? deps.get(i) : null;
                        html.append("<tr><td>").append(escapeHtml(d != null ? nvl(d.getName()) : " - ")).append("</td>");
                        html.append("<td>").append(escapeHtml(d != null ? nvl(d.getRelationship()) : " - ")).append("</td>");
                        html.append("<td>").append(escapeHtml(d != null ? displayDate(d.getBirthDate()) : " - ")).append("</td>");
                        html.append("<td>").append(escapeHtml(d != null ? nvl(d.getCpf()) : " - ")).append("</td></tr>");
                }
                html.append("</table>");
        }

        private void appendHtmlEmpresa(StringBuilder html, Employee employee) {
                html.append("<h2>Para Preenchimento da Empresa</h2><table>");
                htmlRow(html, "Data de admissão", displayDate(employee.getHireDate()), "Função",
                                employee.getPosition() != null ? employee.getPosition().getName() : "");
                htmlRow(html, "Setor", employee.getUnit() != null ? employee.getUnit().getName() : "", "Salário",
                                employee.getSalario() != null ? String.format("R$ %.2f", employee.getSalario()) : "");
                htmlRow(html, "Forma de Pagamento", employee.getPeriodoPagamento(), "Prazo de Experiência",
                                employee.getPrazoExperienciaTexto());
                htmlRow(html, "Prorrogação", employee.getProrrogacaoExperiencia(), "Dias de Trabalho", employee.getDiasTrabalho());
                htmlRow(html, "Horário de Trabalho", employee.getHorarioTrabalho(), "Intervalo",
                                employee.getHorarioTrabalhoIntervalo());
                htmlRow(html, "Dias de Folga", employee.getFolgaSemanal(), "Escala de Trabalho", employee.getEscalaTrabalho());
                html.append("</table>");
        }

        private void appendHtmlContrato(StringBuilder html) {
                html.append("<h2>Tipo de Contrato</h2><table><tr>");
                html.append("<td>(  X  ) Empregado / CLT</td><td>(     ) MEI</td><td colspan='2'>(     ) Autônomo</td>");
                html.append("</tr></table>");
        }

        private void appendHtmlBeneficios(StringBuilder html, Employee employee) {
                html.append("<h2>Benefícios</h2><table><tr><th>Benefício</th><th>Possui</th><th>Valor Diário</th><th>% Desconto</th><th>Valor Desconto Mensal</th></tr>");
                htmlBeneficioRow(html, "Vale Transporte", resolveBeneficioPossui(employee, "TRANSPORT"));
                htmlBeneficioRow(html, "Vale Refeição", resolveBeneficioPossui(employee, "MEAL"));
                htmlBeneficioRow(html, "Vale Alimentação", resolveBeneficioPossui(employee, "FOOD", "ALIMENTACAO"));
                htmlBeneficioRow(html, "Vale Assistência Médica", resolveBeneficioPossui(employee, "HEALTH"));
                htmlBeneficioRow(html, "Vale Odontológica", resolveBeneficioPossui(employee, "DENTAL"));
                htmlBeneficioRow(html, "Seguro de Vida", resolveBeneficioPossui(employee, "LIFE_INSURANCE"));
                html.append("</table>");
        }

        private void appendHtmlBanco(StringBuilder html, Employee employee) {
                html.append("<h2>Pagamento de Salário em Conta</h2><table>");
                html.append("<tr><th>Tipo da Conta</th><th>Banco</th><th>Agência</th><th>Conta</th></tr>");
                html.append("<tr><td>").append(escapeHtml(nvl(employee.getAccountType()))).append("</td>");
                html.append("<td>").append(escapeHtml(nvl(employee.getBanco()))).append("</td>");
                html.append("<td>").append(escapeHtml(nvl(employee.getAgencia()))).append("</td>");
                html.append("<td>").append(escapeHtml(nvl(employee.getContaCorrente()))).append("</td></tr></table>");
        }

        private void htmlRow(StringBuilder html, String l1, String v1, String l2, String v2) {
                html.append("<tr>").append(htmlLabelCell(l1)).append(htmlValueCell(v1));
                html.append(htmlLabelCell(l2)).append(htmlValueCell(v2)).append("</tr>");
        }

        private void htmlBeneficioRow(StringBuilder html, String beneficio, String possui) {
                html.append("<tr><td>").append(escapeHtml(beneficio)).append("</td><td>").append(escapeHtml(nvl(possui)));
                html.append("</td><td> - </td><td> - </td><td> - </td></tr>");
        }

        private String htmlLabelCell(String label) {
                return "<td class='lbl'>" + escapeHtml(label) + "</td>";
        }

        private String htmlValueCell(String value) {
                return "<td class='val'>" + escapeHtml(nvl(value)) + "</td>";
        }

        private String escapeHtml(String text) {
                if (text == null) {
                        return "";
                }
                return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        }

        private int addExcelQuadRow(Sheet sheet, int rowIndex, String l1, String v1, String l2, String v2,
                        CellStyle labelStyle, CellStyle valueStyle) {
                Row row = sheet.createRow(rowIndex);
                createStyledCell(row, 0, l1, labelStyle);
                createStyledCell(row, 1, nvl(v1), valueStyle);
                createStyledCell(row, 2, l2, labelStyle);
                createStyledCell(row, 3, nvl(v2), valueStyle);
                return rowIndex + 1;
        }

        private int addExcelFullRow(Sheet sheet, int rowIndex, String value, CellStyle labelStyle, CellStyle valueStyle,
                        int lastColumn) {
                Row row = sheet.createRow(rowIndex);
                org.apache.poi.ss.usermodel.Cell cell = row.createCell(0);
                cell.setCellValue(value);
                cell.setCellStyle(valueStyle);
                if (lastColumn > 0) {
                        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIndex, rowIndex, 0, lastColumn));
                }
                return rowIndex + 1;
        }

        private int addExcelHeaderRow(Sheet sheet, int rowIndex, String[] values, CellStyle style) {
                Row row = sheet.createRow(rowIndex);
                for (int i = 0; i < values.length && i < 4; i++) {
                        createStyledCell(row, i, values[i] != null ? values[i] : " - ", style);
                }
                return rowIndex + 1;
        }

        private int addExcelBeneficioRow(Sheet sheet, int rowIndex, String beneficio, String possui, CellStyle valueStyle) {
                Row row = sheet.createRow(rowIndex);
                createStyledCell(row, 0, beneficio, valueStyle);
                createStyledCell(row, 1, nvl(possui), valueStyle);
                createStyledCell(row, 2, " - ", valueStyle);
                createStyledCell(row, 3, " - ", valueStyle);
                return rowIndex + 1;
        }

        private void createStyledCell(Row row, int column, String value, CellStyle style) {
                org.apache.poi.ss.usermodel.Cell cell = row.createCell(column);
                cell.setCellValue(value != null ? value : " - ");
                if (style != null) {
                        cell.setCellStyle(style);
                }
        }

        private String getDocumentosNecessariosText() {
                return "• 01 foto 3x4\n"
                                + "• Carteira Profissional\n"
                                + "• Exame Admissional\n"
                                + "• 01 Cópia do documento RG ou RNE se estrangeiro\n"
                                + "• 01 Cópia do CPF\n"
                                + "• 01 Cópia da Carteira de Habilitação\n"
                                + "• 01 Cópia do Título de Eleitor\n"
                                + "• 01 Cópia do Comprovante de Residência Recente\n"
                                + "• 01 Cópia do Cartão do Banco para pagamento de salário\n"
                                + "• 01 Cópia do Cartão do PIS e/ou Cartão Cidadão\n"
                                + "• 01 Cópia da Carteira Profissional\n"
                                + "• 01 Cópia da Certidão de Conclusão de Curso";
        }

        private String displayDate(LocalDate date) {
                return nvl(formatDate(date));
        }

        private String displayYesNo(Boolean value) {
                if (value == null) {
                        return " - ";
                }
                return value ? "Sim" : "Não";
        }

        private String resolveBeneficioPossui(Employee employee, String... types) {
                if (employee.getBenefits() == null || employee.getBenefits().isEmpty()) {
                        return " - ";
                }
                for (com.z7design.secured_guard.model.Benefit benefit : employee.getBenefits()) {
                        if (benefit.getType() == null) {
                                continue;
                        }
                        for (String type : types) {
                                if (type.equalsIgnoreCase(benefit.getType())
                                                && (benefit.getIsActive() == null || Boolean.TRUE.equals(benefit.getIsActive()))) {
                                        return "Sim";
                                }
                        }
                }
                return " - ";
        }

        private Paragraph sectionTitle(String title) {
                return new Paragraph(title)
                                .setBold()
                                .setFontSize(9f)
                                .setFontColor(new DeviceRgb(0, 51, 102))
                                .setMarginTop(8f)
                                .setMarginBottom(3f);
        }

        private Cell topLabel(String text) {
                return new Cell()
                                .add(new Paragraph(text).setBold().setFontSize(8f))
                                .setPadding(3f);
        }

        private Cell topValue(String text) {
                return new Cell()
                                .add(new Paragraph(nvl(text)).setFontSize(8f))
                                .setPadding(3f);
        }

        private Cell headCell(String text) {
                return new Cell()
                                .add(new Paragraph(text).setBold().setFontSize(8f))
                                .setBackgroundColor(new DeviceRgb(236, 242, 248))
                                .setPadding(3f);
        }

        private Cell bodyCell(String value) {
                return new Cell()
                                .add(new Paragraph(nvl(value)).setFontSize(8f))
                                .setPadding(3f);
        }

        private void addRow(Table table, String l1, String v1, String l2, String v2) {
                table.addCell(topLabel(l1));
                table.addCell(topValue(v1));
                table.addCell(topLabel(l2));
                table.addCell(topValue(v2));
        }

        private void addBeneficioRow(Table table, String beneficio, String possui, String valorDiario,
                        String percentual, String valorMensal) {
                table.addCell(bodyCell(beneficio));
                table.addCell(bodyCell(possui));
                table.addCell(bodyCell(valorDiario));
                table.addCell(bodyCell(percentual));
                table.addCell(bodyCell(valorMensal));
        }

        private String nvl(String value) {
                return value != null && !value.trim().isEmpty() ? value.trim() : " - ";
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
                        address.append(CompanyDataFormatter.formatZipCode(employee.getEnderecoCep()));
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
                // Prioridade 1: Campo rg legado
                if (employee.getRg() != null && !employee.getRg().trim().isEmpty()) {
                        rg = employee.getRg();
                }
                // Prioridade 2: CIN
                else if (employee.getCinNumero() != null && !employee.getCinNumero().trim().isEmpty()) {
                        rg = employee.getCinNumero();
                        if (employee.getCinOrgaoEmissor() != null && !employee.getCinOrgaoEmissor().trim().isEmpty()) {
                                rg = employee.getCinOrgaoEmissor() + "-" + rg;
                        }
                }
                // Prioridade 3: Campo numeroRg
                else if (employee.getNumeroRg() != null && !employee.getNumeroRg().trim().isEmpty()) {
                        rg = employee.getNumeroRg();
                        if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                                        && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
                                rg = employee.getCarteiraIdentidadeOrgaoEmissor() + "-" + rg;
                        }
                }
                // Prioridade 4: Órgão Emissor apenas
                else if (employee.getCarteiraIdentidadeOrgaoEmissor() != null
                                && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
                        rg = employee.getCarteiraIdentidadeOrgaoEmissor();
                }
                return rg;
        }

        private String buildZonaSecao(Employee employee) {
                if (employee.getTituloEleitorZona() != null || employee.getTituloEleitorSecao() != null) {
                        return (employee.getTituloEleitorZona() != null ? employee.getTituloEleitorZona() : "") +
                                        " / "
                                        + (employee.getTituloEleitorSecao() != null ? employee.getTituloEleitorSecao()
                                                        : "");
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

        private String translateMaritalStatus(String status) {
                if (status == null || status.trim().isEmpty())
                        return "";
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

        private String yesNo(Boolean value) {
                if (value == null) {
                        return "";
                }
                return value ? "Sim" : "Não";
        }

        private String buildNaturalidade(Employee employee) {
                if (employee == null) {
                        return "";
                }
                String cidade = employee.getMunicipioNascimento() != null ? employee.getMunicipioNascimento().trim() : "";
                if (cidade.isEmpty() && employee.getLocalNascimento() != null) {
                        cidade = employee.getLocalNascimento().trim();
                }
                String uf = employee.getEstadoNascimento() != null ? employee.getEstadoNascimento().trim() : "";
                if (cidade.isEmpty()) {
                        return uf;
                }
                if (uf.isEmpty()) {
                        return cidade;
                }
                return cidade + "/" + uf;
        }
}
