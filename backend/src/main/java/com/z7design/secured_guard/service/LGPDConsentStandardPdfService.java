package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.LGPDConsentRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.util.EmployeeDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LGPDConsentStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;
        private final EmployeeRepository employeeRepository;

        private static final String REPORT_TITLE = "";
        private static final String VARIANT_VIGILANCIA = "VIGILANCIA";

        public byte[] generatePdf(LGPDConsentRequest request) {
                enrichFromEmployee(request);
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(REPORT_TITLE)
                                        .includeEmailInFooter(true)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();

                        addContent(document, request, docWithPdf.getCompany());

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Termo LGPD", e);
                        throw new RuntimeException("Erro ao gerar PDF do Termo LGPD", e);
                }
        }

        public byte[] generateExcel(LGPDConsentRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Termo LGPD");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Nome do Funcionário:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CPF:");
                        row.createCell(1).setCellValue(request.getEmployeeCpf());

                        if (!isVigilanciaTerm(request, company)) {
                                row = sheet.createRow(startRow + 2);
                                row.createCell(0).setCellValue("RG:");
                                row.createCell(1).setCellValue(request.getEmployeeRg());
                        }

                        row = sheet.createRow(startRow + 3);
                        row.createCell(0).setCellValue("Cargo:");
                        row.createCell(1).setCellValue(request.getEmployeePosition());

                        row = sheet.createRow(startRow + 5);
                        row.createCell(0).setCellValue(
                                        "Termo de proteção de dados e confidencialidade conforme LGPD.");

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Termo LGPD", e);
                        throw new RuntimeException("Erro ao gerar Excel do Termo LGPD", e);
                }
        }

        private void enrichFromEmployee(LGPDConsentRequest request) {
                UUID employeeId = request.getEmployeeId();
                if (employeeId == null) {
                        return;
                }
                Optional<Employee> employeeOpt = employeeRepository.findById(employeeId);
                if (employeeOpt.isEmpty()) {
                        return;
                }
                Employee employee = employeeOpt.get();

                if (request.getEmployeeCpf() == null || request.getEmployeeCpf().isBlank()) {
                        request.setEmployeeCpf(employee.getDocument());
                }
                if (request.getEmployeeRg() == null || request.getEmployeeRg().isBlank()) {
                        request.setEmployeeRg(employee.getRg());
                }
                if (request.getEmployeeFullAddress() == null || request.getEmployeeFullAddress().isBlank()) {
                        request.setEmployeeFullAddress(EmployeeDataFormatter.formatAddressForLgpdVig(employee));
                }
        }

        private void addContent(Document document, LGPDConsentRequest request, Company company) {
                document.add(new Paragraph("TERMO DE PROTEÇÃO DE DADOS - LGPD")
                                .setBold()
                                .setFontSize(12f)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(15f));

                if (isVigilanciaTerm(request, company)) {
                        addVigilanciaIntro(document, request, company);
                        addClauses(document, true);
                } else {
                        addDefaultIntro(document, request, company);
                        addClauses(document, false);
                }

                addSignatures(document, request, company);
        }

        private boolean isVigilanciaTerm(LGPDConsentRequest request, Company company) {
                if (VARIANT_VIGILANCIA.equalsIgnoreCase(request.getTermVariant())) {
                        return true;
                }
                return company != null
                                && company.getSigla() != null
                                && "VIG".equalsIgnoreCase(company.getSigla().trim());
        }

        private void addVigilanciaIntro(Document document, LGPDConsentRequest request, Company company) {
                String employeeAddress = resolveEmployeeAddressForVig(request);

                Paragraph intro = new Paragraph()
                                .setFontSize(9f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f)
                                .setMultipliedLeading(1.2f);

                intro.add(new Text(request.getEmployeeName().toUpperCase()).setBold());
                intro.add(", CPF n° ");
                intro.add(new Text(
                                request.getEmployeeCpf() != null
                                                ? CompanyDataFormatter.formatCpf(request.getEmployeeCpf())
                                                : "________________")
                                .setBold());
                intro.add(", residente e domiciliado na ");
                intro.add(new Text(
                                employeeAddress != null && !employeeAddress.isBlank()
                                                ? employeeAddress
                                                : "________________")
                                .setBold());
                intro.add(", doravante denominado ");
                intro.add(new Text("'COLABORADOR(A)'").setBold());
                intro.add(".\n");

                if (company != null) {
                        intro.add(new Text(company.getName().toUpperCase()).setBold());
                        intro.add(", CNPJ n° ");
                        intro.add(new Text(
                                        company.getCnpj() != null
                                                        ? CompanyDataFormatter.formatCnpj(company.getCnpj())
                                                        : "________________")
                                        .setBold());
                        intro.add(", com sede na ");
                        intro.add(new Text(CompanyDataFormatter.formatAddressForLgpdVig(company)).setBold());
                        intro.add(", doravante denominado ");
                        intro.add(new Text("'EMPRESA'").setBold());
                        intro.add(".");
                }

                document.add(intro);
        }

        private String resolveEmployeeAddressForVig(LGPDConsentRequest request) {
                if (request.getEmployeeFullAddress() != null && !request.getEmployeeFullAddress().isBlank()) {
                        return request.getEmployeeFullAddress();
                }
                return EmployeeDataFormatter.formatAddressForLgpdVigFromRequest(
                                request.getEmployeeAddress(),
                                request.getEmployeeNumber(),
                                request.getEmployeeComplement(),
                                request.getEmployeeNeighborhood(),
                                request.getEmployeeCity(),
                                request.getEmployeeState(),
                                request.getEmployeeCep());
        }

        private void addDefaultIntro(Document document, LGPDConsentRequest request, Company company) {
                Paragraph intro = new Paragraph()
                                .setFontSize(9f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f)
                                .setMultipliedLeading(1.2f);

                intro.add(new Text(request.getEmployeeName().toUpperCase()).setBold());
                intro.add(", inscrito(a) no CPF nº ");
                intro.add(new Text(request.getEmployeeCpf() != null ? request.getEmployeeCpf() : "________________")
                                .setBold());
                intro.add(" e portador(a) do RG nº ");
                String rgFull = (request.getEmployeeRg() != null ? request.getEmployeeRg() : "________________")
                                + (request.getEmployeeRgOrgao() != null ? " " + request.getEmployeeRgOrgao() : "");
                intro.add(new Text(rgFull).setBold());
                intro.add(", com endereço na ");
                String address = (request.getEmployeeAddress() != null ? request.getEmployeeAddress()
                                : "________________")
                                + (request.getEmployeeNumber() != null ? ", " + request.getEmployeeNumber() : "")
                                + (request.getEmployeeComplement() != null ? ", " + request.getEmployeeComplement()
                                                : "")
                                + (request.getEmployeeNeighborhood() != null
                                                ? ", bairro " + request.getEmployeeNeighborhood()
                                                : "");
                intro.add(new Text(address).setBold());
                intro.add(", na cidade de ");
                intro.add(new Text(
                                request.getEmployeeCity() != null ? request.getEmployeeCity() : "________________")
                                .setBold());
                intro.add(", Estado de ");
                intro.add(new Text(request.getEmployeeState() != null ? request.getEmployeeState() : "____").setBold());
                intro.add(", doravante denominado ");
                intro.add(new Text("'COLABORADOR(A)'").setBold());
                intro.add(".\n");

                if (company != null) {
                        intro.add(new Text(company.getName().toUpperCase()).setBold());
                        intro.add(", inscrito no CNPJ sob o nº ");
                        intro.add(new Text(company.getCnpj() != null ? company.getCnpj() : "________________")
                                        .setBold());
                        intro.add(", com sede na Rua: ");
                        String compAddr = (company.getAddress() != null ? company.getAddress() : "________________")
                                        + (company.getZipCode() != null ? ", CEP: " + company.getZipCode() : "")
                                        + (company.getEnderecoNumero() != null ? " nº " + company.getEnderecoNumero()
                                                        : "")
                                        + (company.getEnderecoBairro() != null
                                                        ? ", bairro " + company.getEnderecoBairro()
                                                        : "");
                        intro.add(new Text(compAddr).setBold());
                        intro.add(", na cidade de ");
                        intro.add(new Text(company.getCity() != null ? company.getCity() : "________________")
                                        .setBold());
                        intro.add(", Estado de ");
                        intro.add(new Text(company.getState() != null ? company.getState() : "____").setBold());
                        intro.add(", doravante denominado ");
                        intro.add(new Text("'EMPRESA'").setBold());
                        intro.add(".");
                } else {
                        intro.add("PROMOVER TERCEIRIZAÇÃO & SERVIÇOS LTDA, inscrito no CNPJ sob o nº 36.698.521/0001-01, doravante denominada 'EMPRESA'.");
                }
                document.add(intro);
        }

        private void addClauses(Document document, boolean vigilanciaStyle) {
                addClause(document, vigilanciaStyle, "CLÁUSULA PRIMEIRA – DO OBJETO",
                                "Em razão do exercício da minha função, reconheço o acesso a informações de propriedade da EMPRESA e de seus Clientes e me comprometo a:\n\n"
                                                +
                                                "a) manter sigilo absoluto, tanto escrito como verbal, de todos os dados, informações e materiais com que tiver contato no desempenho do trabalho para o qual fui contratado;\n"
                                                +
                                                "b) não revelar, reproduzir, utilizar ou dar conhecimento, em hipótese alguma, a terceiros, de dados, informações ou materiais revelados pela EMPRESA ou elaborados por mim ou com a minha participação;\n"
                                                +
                                                "c) não utilizar qualquer dado, informação ou material revelado pela EMPRESA ou elaborado por mim ou com a minha participação, em redes privadas ou sociais;\n"
                                                +
                                                "d) reconhecer que todos os materiais, sejam modelos de documentos, contratos, regulamentos, formulários etc, pertencem à EMPRESA, ainda que elaborados por mim ou com a minha participação.");

                addClause(document, vigilanciaStyle, "CLÁUSULA SEGUNDA – DAS INFORMAÇÕES CONFIDENCIAIS",
                                "Para os fins deste Termo, serão consideradas confidenciais todas as informações transmitidas por meio escrito, eletrônico, verbal ou quaisquer outros e de qualquer natureza, incluindo, mas não se limitando a: cadastro de clientes, empresas prestadoras e tomadoras de serviços, informações de crédito, certidões e documentos pessoais, contratos e documentos de crédito e débito, softwares, mídias, planos de negócios, propostas comerciais, processos, tabelas, projetos, dentre outros.");

                Paragraph parUnico = new Paragraph()
                                .setFontSize(8f)
                                .setBold()
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f);
                parUnico.add("PARÁGRAFO ÚNICO: ");
                parUnico.add(new Text(
                                "Em caso de dúvida sobre a confidencialidade do dado, informação ou documento, o COLABORADOR deverá mantê-lo em absoluto sigilo, até que a EMPRESA se manifeste expressamente a respeito.")
                                .setBold());
                document.add(parUnico);

                addClause(document, vigilanciaStyle, "CLÁUSULA TERCEIRA – DO USO DAS INFORMAÇÕES CONFIDENCIAIS",
                                "O COLABORADOR(A) se compromete a utilizar as informações confidenciais apenas no âmbito da execução e desenvolvimento dos serviços e produtos de sua responsabilidade, sendo vedado o acesso e tratamento para fins estranhos à sua função.");

                addParagraph(document, "PARÁGRAFO PRIMEIRO",
                                "O COLABORADOR(A) deverá dispensar às informações confidenciais da EMPRESA o mesmo zelo e cuidado com que trata os seus próprios dados pessoais, e deverá mantê-las em local seguro, com acesso limitado apenas a pessoas envolvidas ou autorizadas.");

                addParagraph(document, "PARÁGRAFO SEGUNDO",
                                "Em caso de qualquer falha na segurança das informações confidenciais, o COLABORADOR(A) deverá comunicar imediatamente a EMPRESA. A pronta comunicação não exclui sua responsabilidade pela proteção dos dados sigilosos.");

                addClause(document, vigilanciaStyle, "CLÁUSULA QUARTA – DAS EXCEÇÕES À CONFIDENCIALIDADE",
                                "Não serão consideradas confidenciais as informações que:\n\n"
                                                +
                                                "a) Sejam ou venham a se tornar públicas, desde que tal publicidade não tenha sido, de qualquer forma, ocasionada pelo(a) COLABORADOR(A);\n"
                                                +
                                                "b) Tenham sido legitimamente recebidas de terceiros, desde que não derivadas de violação de dever de confidencialidade;\n"
                                                +
                                                "c) Sejam expressas ou tacitamente identificadas pela EMPRESA como não sendo sigilosas.");

                addClause(document, vigilanciaStyle, "CLÁUSULA QUINTA – DA QUEBRA DA CONFIDENCIALIDADE",
                                "A PARTE que violar as obrigações previstas neste Termo deverá indenizar e ressarcir a outra PARTE pelas perdas, lucros cessantes, danos diretos e indiretos, inclusive emergentes, e quaisquer prejuízos patrimoniais e/ou morais que surjam em decorrência deste descumprimento.");

                addParagraph(document, "PARÁGRAFO PRIMEIRO",
                                "O descumprimento de quaisquer das cláusulas do presente termo importará em falha gravíssima ao contrato de prestação de serviços celebrado entre as PARTES e poderá acarretar a sua imediata rescisão, além da responsabilização administrativa, civil e criminal dos que, comprovadamente, estiverem envolvidos no descumprimento ou violação.");

                addClause(document, vigilanciaStyle, "CLÁUSULA SEXTA – DA VIGÊNCIA",
                                "Mantido entre as PARTES, e se estenderá por um período de 5 (cinco) anos após o término do vínculo entre as PARTES.");
        }

        private void addClause(Document document, boolean blackHeader, String title, String content) {
                if (blackHeader) {
                        addBlackClauseHeader(document, title);
                } else {
                        document.add(new Paragraph(title).setBold().setFontSize(9f).setMarginTop(5f).setMarginBottom(2f));
                }
                document.add(new Paragraph(content).setFontSize(8f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f).setMultipliedLeading(1.1f));
        }

        private void addBlackClauseHeader(Document document, String title) {
                Table table = new Table(UnitValue.createPercentArray(1)).useAllAvailableWidth();
                table.addCell(new Cell()
                                .add(new Paragraph(title)
                                                .setBold()
                                                .setFontSize(9f)
                                                .setFontColor(ColorConstants.WHITE)
                                                .setMargin(0))
                                .setBackgroundColor(new DeviceRgb(0, 0, 0))
                                .setPadding(5)
                                .setBorder(Border.NO_BORDER));
                document.add(table.setMarginTop(5f).setMarginBottom(2f));
        }

        private void addParagraph(Document document, String title, String content) {
                Paragraph p = new Paragraph().setFontSize(8f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(8f);
                p.add(new Text(title + ": ").setBold());
                p.add(content);
                document.add(p);
        }

        private void addSignatures(Document document, LGPDConsentRequest request, Company company) {
                String city = request.getCity() != null && !request.getCity().isEmpty() ? request.getCity()
                                : (company != null && company.getCity() != null ? company.getCity()
                                                : "Contagem");

                LocalDate dateObj = request.getDate() != null ? request.getDate() : LocalDate.now();
                String dateStr = dateObj.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                document.add(new Paragraph(city + ", " + dateStr)
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginTop(20f)
                                .setMarginBottom(25f)
                                .setFontSize(9f));

                document.add(new Paragraph("__________________________________________________________________")
                                .setMarginTop(15f).setMarginBottom(0f).setTextAlignment(TextAlignment.LEFT));
                document.add(new Paragraph(company != null ? company.getName().toUpperCase() : "EMPRESA")
                                .setFontSize(8f).setBold().setMarginBottom(15f).setTextAlignment(TextAlignment.LEFT));

                document.add(new Paragraph("__________________________________________________________________")
                                .setMarginTop(15f).setMarginBottom(0f).setTextAlignment(TextAlignment.LEFT));
                document.add(new Paragraph(request.getEmployeeName().toUpperCase())
                                .setFontSize(8f).setBold().setMarginBottom(0f).setTextAlignment(TextAlignment.LEFT));
        }
}
