package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.model.enums.ReportGroupBy;
import com.z7design.secured_guard.model.enums.ReportOrderBy;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.util.ReportIssuanceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Gera o PDF do relatório de funcionários usando o mesmo layout padrão
 * do Relatório de Propostas (StandardReportLayoutService): template de fundo,
 * cabeçalho, tabela Nome/Matrícula/Cargo/Posto/Empresa/Status e rodapé.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeReportPdfService {

    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final StandardReportLayoutService standardReportLayoutService;

    private static final List<String> DEFAULT_COLUMNS = List.of("name", "registrationNumber", "position", "workPost", "company", "status");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public byte[] generateEmployeeReportPDF(UUID companyId, List<UUID> employeeIds, List<String> columns,
            ReportGroupBy groupBy, ReportOrderBy orderBy, String filterSummary) throws IOException {
        log.info("Gerando relatório PDF de funcionários - Empresa: {}, Funcionários: {}, Colunas: {}, GroupBy: {}, OrderBy: {}, Filtros: {}",
                companyId, employeeIds != null ? employeeIds.size() : 0, columns != null ? columns.size() : 0, groupBy, orderBy, filterSummary);

        List<Employee> employees;
        if (employeeIds != null && !employeeIds.isEmpty()) {
            // Lista sem duplicados evita "Duplicate row was found and ASSERT was specified" no Hibernate
            List<UUID> distinctIds = employeeIds.stream().distinct().toList();
            // Retorna Set para garantir deduplicação pelo Hibernate 6 em ambiente CI com dados inconsistentes
            java.util.Set<Employee> employeeSet = employeeRepository.findAllByIdIn(distinctIds);
            employees = new ArrayList<>(employeeSet);
        } else {
            // Retorna Set para garantir deduplicação no caso geral (todos os funcionários)
            java.util.Set<Employee> allSet = employeeRepository.findAllDistinct();
            employees = new ArrayList<>(allSet);
        }

        List<String> effectiveColumns = (columns != null && !columns.isEmpty()) ? columns : DEFAULT_COLUMNS;
        Company company = resolveCompanyForLayout(companyId, employees);
        return generateWithIText(employees, company, effectiveColumns, groupBy, orderBy, filterSummary);
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

    private byte[] generateWithIText(List<Employee> employees, Company company, List<String> columns,
            ReportGroupBy groupBy, ReportOrderBy orderBy, String filterSummary) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream(64 * 1024);

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(company.getId())
                    .reportTitle("RELATÓRIO DE FUNCIONÁRIOS")
                    .landscape(true)
                    .showPageNumbers(true)
                    .bottomMargin(95f)
                    .footerUserSummary(ReportIssuanceContext.resolveUserLabelForReportFooter())
                    .footerReportAt(ReportIssuanceContext.resolveReportTimestampFooter())
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            addReportHeaderInfo(document, employees.size(), filterSummary);

            if (groupBy != null && groupBy == ReportGroupBy.FUNCIONARIO) {
                addEmployeesTableGroupedByEmployee(document, employees, columns, orderBy);
            } else if (groupBy != null && groupBy == ReportGroupBy.POSTO_TRABALHO) {
                addEmployeesTableGroupedByWorkPost(document, employees, columns, orderBy);
            } else {
                addEmployeesTable(document, employees, columns, orderBy);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de funcionários com iText: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de funcionários gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private void addReportHeaderInfo(Document document, int total, String filterSummary) {
        document.add(new Paragraph("Total de funcionários: " + total).setBold().setFontSize(10).setMarginBottom(4));
        if (filterSummary != null && !filterSummary.isBlank()) {
            document.add(new Paragraph("Filtros aplicados: " + filterSummary.trim())
                    .setFontSize(9)
                    .setMarginBottom(10));
        } else {
            document.add(new Paragraph(" ").setMarginBottom(6));
        }
    }

    private void addEmployeesTable(Document document, List<Employee> employees, List<String> columns, ReportOrderBy orderBy) {
        if (employees.isEmpty()) {
            document.add(new Paragraph("Nenhum funcionário encontrado.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        List<Employee> sorted = sortEmployees(employees, orderBy);

        int colCount = columns.size();
        float[] colWidths = new float[colCount];
        float equalWidth = 100f / colCount;
        for (int i = 0; i < colCount; i++) colWidths[i] = equalWidth;

        Table table = new Table(UnitValue.createPercentArray(colWidths))
                .useAllAvailableWidth()
                .setMarginTop(10);

        for (String colKey : columns) {
            String header = getColumnHeader(colKey);
            table.addHeaderCell(standardReportLayoutService.createHeaderCell(header));
        }

        for (Employee employee : sorted) {
            for (String colKey : columns) {
                String value = getCellValue(employee, colKey);
                table.addCell(standardReportLayoutService.createDataCell(value));
            }
        }

        document.add(table);
    }

    private void addEmployeesTableGroupedByEmployee(Document document, List<Employee> employees, List<String> columns, ReportOrderBy orderBy) {
        if (employees.isEmpty()) {
            document.add(new Paragraph("Nenhum funcionário encontrado.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        addEmployeesTable(document, employees, columns, orderBy);
    }

    private void addEmployeesTableGroupedByWorkPost(Document document, List<Employee> employees, List<String> columns, ReportOrderBy orderBy) {
        if (employees.isEmpty()) {
            document.add(new Paragraph("Nenhum funcionário encontrado.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        List<Employee> sortedEmployees = sortEmployees(employees, ReportOrderBy.POSTO_TRABALHO);

        int colCount = columns.size();
        float[] colWidths = new float[colCount];
        float equalWidth = 100f / colCount;
        for (int i = 0; i < colCount; i++) colWidths[i] = equalWidth;

        Table table = new Table(UnitValue.createPercentArray(colWidths))
                .useAllAvailableWidth()
                .setMarginTop(10);

        for (String colKey : columns) {
            String header = getColumnHeader(colKey);
            table.addHeaderCell(standardReportLayoutService.createHeaderCell(header));
        }

        for (Employee employee : sortedEmployees) {
            for (String colKey : columns) {
                String value = getCellValue(employee, colKey);
                table.addCell(standardReportLayoutService.createDataCell(value));
            }
        }

        document.add(table);
    }

    private List<Employee> sortEmployees(List<Employee> employees, ReportOrderBy orderBy) {
        if (orderBy != null && orderBy == ReportOrderBy.POSTO_TRABALHO) {
            return employees.stream()
                    .sorted(Comparator.comparing(
                            this::resolveWorkPostName,
                            String.CASE_INSENSITIVE_ORDER)
                            .thenComparing((Employee e) -> e.getName() != null ? e.getName() : "", String.CASE_INSENSITIVE_ORDER)
                            .thenComparing((Employee e) -> e.getHireDate() != null ? e.getHireDate() : java.time.LocalDate.MIN, Comparator.reverseOrder()))
                    .toList();
        }
        return employees.stream()
                .sorted(Comparator.comparing((Employee e) -> e.getName() != null ? e.getName() : "", String.CASE_INSENSITIVE_ORDER)
                        .thenComparing((Employee e) -> e.getHireDate() != null ? e.getHireDate() : java.time.LocalDate.MIN, Comparator.reverseOrder()))
                .toList();
    }

    private String getColumnHeader(String key) {
        return switch (key) {
            case "name" -> "Nome";
            case "registrationNumber" -> "Matrícula";
            case "position" -> "Cargo";
            case "workPost" -> "Posto";
            case "company" -> "Empresa";
            case "status" -> "Status";
            case "cpf" -> "CPF";
            case "rg" -> "RG";
            case "birthDate" -> "Data Nasc.";
            case "hireDate" -> "Admissão";
            case "terminationDate" -> "Data Rescisão";
            case "terminationReason" -> "Motivo Demissão";
            case "email" -> "E-mail";
            case "phone" -> "Telefone";
            case "sexo" -> "Gênero";
            case "maritalStatus" -> "Estado Civil";
            case "salario" -> "Salário";
            case "ctps" -> "CTPS";
            case "pis" -> "PIS";
            case "cbo" -> "CBO";
            case "matriculaEsocial" -> "Matr. eSocial";
            case "cnhNumber" -> "CNH";
            case "cnhCategory" -> "Categ. CNH";
            case "cnhExpirationDate" -> "Validade CNH";
            case "exameMedicoVencimento" -> "Próx. ASO";
            case "laudoPsicologicoVencimento" -> "Venc. Laudo Psicológico";
            case "laudoPsicologicoData" -> "Data Laudo Psicológico";
            case "laudoPsicologicoResultado" -> "Res. Laudo Psicológico";
            case "proximasFeriasVencimento" -> "Venc. Férias";
            case "address" -> "Endereço";
            case "nationality" -> "Nacionalidade";
            case "motherName" -> "Nome Mãe";
            case "fatherName" -> "Nome Pai";
            case "escalaTrabalho" -> "Escala";
            case "horarioTrabalho" -> "Horário";
            case "bankAccount" -> "Conta Bancária";
            case "pixKey" -> "Chave PIX";
            case "previousStatus" -> "Status / Vínculo Anterior";
            default -> key;
        };
    }

    private String getCellValue(Employee emp, String key) {
        if (emp == null) return "-";

        Object val = switch (key) {
            case "name" -> emp.getName();
            case "registrationNumber" -> emp.getRegistrationNumber();
            case "position" -> emp.getPosition() != null ? emp.getPosition().getName() : null;
            case "workPost" -> resolveWorkPostName(emp);
            case "company" -> emp.getCompany() != null ? (emp.getCompany().getSigla() != null ? emp.getCompany().getSigla() : emp.getCompany().getName()) : null;
            case "status" -> getStatusLabel(emp.getStatus());
            case "previousStatus" -> formatPreviousStatus(emp);
            case "cpf" -> emp.getCpf() != null ? emp.getCpf() : emp.getDocument();
            case "rg" -> emp.getRg() != null ? emp.getRg() : emp.getNumeroRg();
            case "birthDate" -> emp.getBirthDate() != null ? emp.getBirthDate().format(DATE_FMT) : null;
            case "hireDate" -> emp.getHireDate() != null ? emp.getHireDate().format(DATE_FMT) : null;
            case "terminationDate" -> emp.getDataRescisao() != null ? emp.getDataRescisao().format(DATE_FMT) : (emp.getTerminationDate() != null ? emp.getTerminationDate().format(DATE_FMT) : null);
            case "terminationReason" -> emp.getTerminationReason();
            case "email" -> emp.getEmail();
            case "phone" -> emp.getPhone() != null ? emp.getPhone() : emp.getTelefoneContato();
            case "sexo" -> emp.getSexo();
            case "maritalStatus" -> emp.getMaritalStatus();
            case "salario" -> emp.getSalario() != null ? "R$ " + emp.getSalario() : null;
            case "ctps" -> emp.getCtps();
            case "pis" -> emp.getPis();
            case "cbo" -> emp.getCbo();
            case "matriculaEsocial" -> emp.getMatriculaEsocial();
            case "cnhNumber" -> emp.getCnhNumber();
            case "cnhCategory" -> emp.getCnhCategory();
            case "cnhExpirationDate" -> emp.getCnhExpirationDate() != null ? emp.getCnhExpirationDate().format(DATE_FMT) : null;
            case "exameMedicoVencimento" -> emp.getExameMedicoVencimento() != null ? emp.getExameMedicoVencimento().format(DATE_FMT) : null;
            case "laudoPsicologicoVencimento" -> emp.getLaudoPsicologicoVencimento() != null ? emp.getLaudoPsicologicoVencimento().format(DATE_FMT) : null;
            case "laudoPsicologicoData" -> emp.getLaudoPsicologicoData() != null ? emp.getLaudoPsicologicoData().format(DATE_FMT) : null;
            case "laudoPsicologicoResultado" -> emp.getLaudoPsicologicoResultado();
            case "proximasFeriasVencimento" -> emp.getProximasFeriasVencimento() != null ? emp.getProximasFeriasVencimento().format(DATE_FMT) : null;
            case "address" -> emp.getAddress();
            case "nationality" -> emp.getNationality();
            case "motherName" -> emp.getNomeMae();
            case "fatherName" -> emp.getNomePai();
            case "escalaTrabalho" -> emp.getEscalaTrabalho();
            case "horarioTrabalho" -> emp.getHorarioTrabalho();
            case "bankAccount" -> resolveBankAccount(emp);
            case "pixKey" -> emp.getPixKey();
            default -> null;
        };
        if (val == null || Objects.toString(val).isBlank()) {
            return "workPost".equals(key) ? "Não alocado" : "-";
        }
        return Objects.toString(val);
    }

    private String resolveBankAccount(Employee emp) {
        if (emp == null) return "";
        StringBuilder sb = new StringBuilder();
        if (emp.getBanco() != null && !emp.getBanco().isBlank()) {
            sb.append(emp.getBanco());
        }
        if (emp.getAgencia() != null && !emp.getAgencia().isBlank()) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append("Ag: ").append(emp.getAgencia());
        }
        if (emp.getContaCorrente() != null && !emp.getContaCorrente().isBlank()) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append("Cc: ").append(emp.getContaCorrente());
            if (emp.getContaDigito() != null && !emp.getContaDigito().isBlank()) {
                sb.append("-").append(emp.getContaDigito());
            }
        }
        return sb.toString();
    }

    private String resolveWorkPostName(Employee employee) {
        if (employee == null) return "";
        WorkPost workPost = employee.getWorkPost();
        if (workPost != null && workPost.getName() != null && !workPost.getName().isBlank()) {
            return workPost.getName();
        }
        return "";
    }

    private String getStatusLabel(EmploymentStatus status) {
        if (status == null) return "-";
        if (EmploymentStatus.ACTIVE.equals(status)) return "Ativo";
        if (EmploymentStatus.TERMINATED.equals(status)) return "Demitido";
        if (EmploymentStatus.INSS_LEAVE.equals(status)) return "Afastamento INSS";
        return status.name();
    }

    private String formatPreviousStatus(Employee emp) {
        if (emp == null) return "-";
        LocalDate termDate = emp.getDataRescisao() != null ? emp.getDataRescisao() : emp.getTerminationDate();
        String status = emp.getStatus() != null ? getStatusLabel(emp.getStatus()) : null;
        String wp = resolveWorkPostName(emp);
        String reason = emp.getTerminationReason();

        if (termDate == null && reason == null && emp.getStatus() != EmploymentStatus.TERMINATED) {
            return "-";
        }

        StringBuilder sb = new StringBuilder();
        if (emp.getStatus() == EmploymentStatus.TERMINATED) {
            sb.append("Demitido");
        } else if (status != null) {
            sb.append(status);
        } else {
            sb.append("Encerrado");
        }

        if (termDate != null) {
            sb.append(" em ").append(DATE_FMT.format(termDate));
        }

        if (wp != null && !wp.isBlank()) {
            sb.append(" (").append(wp).append(")");
        }

        if (reason != null && !reason.isBlank()) {
            sb.append(" - ").append(reason);
        }

        return sb.toString();
    }
}
