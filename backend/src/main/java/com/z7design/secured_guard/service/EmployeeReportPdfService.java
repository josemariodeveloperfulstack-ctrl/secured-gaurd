package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.colors.ColorConstants;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Gera o PDF do relatório de funcionários usando o mesmo layout padrão
 * do Relatório de Veículos (StandardReportLayoutService): barra gradiente,
 * logo da empresa, título, "Gerado em:", estatísticas, tabela e rodapé.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeReportPdfService {

    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final StandardReportLayoutService standardReportLayoutService;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Transactional(readOnly = true)
    public byte[] generateEmployeeReportPDF(UUID companyId, List<UUID> employeeIds) throws IOException {
        log.info("Gerando relatório PDF de funcionários - Empresa: {}, Funcionários: {}", companyId, employeeIds != null ? employeeIds.size() : 0);

        List<Employee> employees = employeeIds != null && !employeeIds.isEmpty()
                ? employeeRepository.findAllById(employeeIds)
                : employeeRepository.findAll();

        Company company = resolveCompanyForLayout(companyId, employees);
        return generateWithIText(employees, company);
    }

    /**
     * Define a empresa para cabeçalho/rodapé do PDF (logo, nome, CNPJ).
     * Se companyId for informado, usa essa empresa.
     * Se "Todos" (companyId == null): usa a empresa com sigla "VIG" como padrão para logo/dados;
     * se não houver VIG, usa a empresa do primeiro funcionário da lista ou a primeira ativa.
     */
    private Company resolveCompanyForLayout(UUID companyId, List<Employee> employees) {
        if (companyId != null) {
            return companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId));
        }
        // Filtro "Todos": logo e dados do cabeçalho/rodapé usam VIG como padrão
        return companyRepository.findFirstBySiglaIgnoreCase("VIG")
                .orElseGet(() -> {
                    for (Employee emp : employees) {
                        if (emp.getCompany() != null && emp.getCompany().getId() != null) {
                            return emp.getCompany();
                        }
                    }
                    List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
                    if (activeCompanies != null && !activeCompanies.isEmpty()) {
                        return activeCompanies.get(0);
                    }
                    List<Company> all = companyRepository.findAll();
                    if (all != null && !all.isEmpty()) {
                        return all.get(0);
                    }
                    throw new ResourceNotFoundException("Nenhuma empresa cadastrada. Cadastre ao menos uma empresa para gerar o relatório.");
                });
    }

    private byte[] generateWithIText(List<Employee> employees, Company company) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(company.getId())
                    .reportTitle("RELATÓRIO DETALHADO DE FUNCIONÁRIOS")
                    .landscape(true)
                    .topMargin(120f)
                    .bottomMargin(50f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Gerado em: dd/MM/yyyy HH:mm (alinhado à direita)
            document.add(new Paragraph("Gerado em: " + LocalDateTime.now().format(DATETIME_FORMAT))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10)
                    .setMarginBottom(10));

            // Nome da empresa e CNPJ (quando uma empresa foi escolhida)
            document.add(new Paragraph(company.getName()).setFontSize(12).setBold().setMarginBottom(2));
            document.add(new Paragraph("CNPJ: " + CompanyDataFormatter.formatCnpj(company.getCnpj())).setFontSize(10).setMarginBottom(10));

            // Estatísticas (mesmo estilo do relatório de veículos)
            long ativos = employees.stream().filter(e -> e.getStatus() == EmploymentStatus.ACTIVE).count();
            long inativos = employees.stream().filter(e -> e.getStatus() == EmploymentStatus.INACTIVE).count();
            long outros = employees.size() - ativos - inativos;
            Paragraph stats = new Paragraph(String.format(
                    "Total de funcionários: %d | Ativos: %d | Inativos: %d | Outros: %d",
                    employees.size(), ativos, inativos, outros))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            if (employees.isEmpty()) {
                document.add(new Paragraph("Nenhum funcionário na lista.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20));
            } else {
                // Colunas com larguras proporcionais (paisagem): Nome/CPF, Dados Prof., Contatos, Data ASO/Médico, Observações
                float[] colWidths = new float[]{ 18f, 24f, 20f, 18f, 20f };
                Table table = new Table(UnitValue.createPercentArray(colWidths)).setWidth(UnitValue.createPercentValue(100));
                table.addHeaderCell(createHeaderCell("Nome / CPF"));
                table.addHeaderCell(createHeaderCell("Dados Profissionais (Cargo / Posto / Empresa)"));
                table.addHeaderCell(createHeaderCell("Contatos / Endereço"));
                table.addHeaderCell(createHeaderCell("Data ASO / Médico"));
                table.addHeaderCell(createHeaderCell("Observações"));

                for (Employee emp : employees) {
                    table.addCell(createCell(buildNomeCpf(emp)));
                    table.addCell(createCell(buildDadosProfissionais(emp)));
                    table.addCell(createCell(buildContatosEndereco(emp)));
                    table.addCell(createCell(buildDataAsoMedico(emp)));
                    table.addCell(createCell(emp.getNotes() != null ? emp.getNotes() : "Sem observações."));
                }
                document.add(table);
            }

            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de funcionários com iText: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de funcionários gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private String buildNomeCpf(Employee emp) {
        StringBuilder sb = new StringBuilder();
        if (emp.getName() != null) sb.append(emp.getName()).append("\n");
        String cpf = emp.getCpf() != null ? emp.getCpf() : emp.getDocument();
        if (cpf != null && !cpf.isEmpty()) sb.append("CPF: ").append(CompanyDataFormatter.formatCpf(cpf)).append("\n");
        if (emp.getBirthDate() != null) sb.append("Nasc: ").append(emp.getBirthDate().format(DATE_FORMAT));
        return sb.toString().trim();
    }

    private String buildDadosProfissionais(Employee emp) {
        StringBuilder sb = new StringBuilder();
        if (emp.getPosition() != null && emp.getPosition().getName() != null)
            sb.append("Cargo: ").append(emp.getPosition().getName()).append("\n");
        if (emp.getWorkPost() != null && emp.getWorkPost().getName() != null)
            sb.append("Posto: ").append(emp.getWorkPost().getName()).append("\n");
        if (emp.getCompany() != null)
            sb.append("Empresa: ").append(emp.getCompany().getSigla() != null ? emp.getCompany().getSigla() : emp.getCompany().getName()).append("\n");
        if (emp.getHireDate() != null)
            sb.append("Admissão: ").append(emp.getHireDate().format(DATE_FORMAT));
        return sb.toString().trim();
    }

    private String buildContatosEndereco(Employee emp) {
        StringBuilder sb = new StringBuilder();
        if (emp.getPhone() != null && !emp.getPhone().isEmpty()) sb.append("Tel: ").append(emp.getPhone()).append("\n");
        if (emp.getEmail() != null && !emp.getEmail().isEmpty()) sb.append("E-mail: ").append(emp.getEmail()).append("\n");
        String end = fullAddress(emp);
        if (!end.isEmpty()) sb.append("End: ").append(end);
        return sb.toString().trim();
    }

    private String fullAddress(Employee emp) {
        if (emp.getEnderecoRua() != null && !emp.getEnderecoRua().isEmpty()) {
            String n = emp.getEnderecoNumero() != null ? emp.getEnderecoNumero() : "";
            return emp.getEnderecoRua() + (n.isEmpty() ? "" : ", " + n);
        }
        return emp.getAddress() != null ? emp.getAddress() : "";
    }

    /** Data do ASO e nome do médico (para coluna Data ASO / Médico). */
    private String buildDataAsoMedico(Employee emp) {
        StringBuilder sb = new StringBuilder();
        if (emp.getExameMedicoData() != null) {
            sb.append("ASO: ").append(emp.getExameMedicoData().format(DATE_FORMAT)).append("\n");
        }
        if (emp.getExameMedicoDoctor() != null && emp.getExameMedicoDoctor().getName() != null) {
            String doctor = emp.getExameMedicoDoctor().getName();
            if (emp.getExameMedicoDoctor().getCrmNumber() != null && emp.getExameMedicoDoctor().getCrmState() != null) {
                doctor += " (CRM " + emp.getExameMedicoDoctor().getCrmNumber() + "/" + emp.getExameMedicoDoctor().getCrmState() + ")";
            }
            sb.append("Médico: ").append(doctor);
        }
        if (sb.length() == 0) {
            sb.append("—");
        }
        return sb.toString().trim();
    }

    private Cell createHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(ColorConstants.LIGHT_GRAY);
    }

    private Cell createCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setTextAlignment(TextAlignment.LEFT);
    }
}
