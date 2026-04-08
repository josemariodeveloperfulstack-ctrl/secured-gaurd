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
import com.z7design.secured_guard.model.Remanejamento;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.model.enums.ReportGroupBy;
import com.z7design.secured_guard.model.enums.ReportOrderBy;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.RemanejamentoRepository;
import com.z7design.secured_guard.util.ReportIssuanceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
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
    private final RemanejamentoRepository remanejamentoRepository;
    private final StandardReportLayoutService standardReportLayoutService;

    private static final List<String> DEFAULT_COLUMNS = List.of("name", "registrationNumber", "position", "workPost", "company", "status");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional(readOnly = true)
    public byte[] generateEmployeeReportPDF(UUID companyId, List<UUID> employeeIds, List<String> columns,
            ReportGroupBy groupBy, ReportOrderBy orderBy) throws IOException {
        log.info("Gerando relatório PDF de funcionários - Empresa: {}, Funcionários: {}, Colunas: {}, GroupBy: {}, OrderBy: {}",
                companyId, employeeIds != null ? employeeIds.size() : 0, columns != null ? columns.size() : 0, groupBy, orderBy);

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
        return generateWithIText(employees, company, effectiveColumns, groupBy, orderBy);
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
            ReportGroupBy groupBy, ReportOrderBy orderBy) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

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

            addReportHeaderInfo(document, employees.size());

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

    private void addReportHeaderInfo(Document document, int total) {
        document.add(new Paragraph("Total de funcionários: " + total).setBold().setFontSize(10).setMarginBottom(10));
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

        for (Employee emp : sorted) {
            for (String colKey : columns) {
                String value = getCellValue(emp, colKey);
                table.addCell(standardReportLayoutService.createDataCell(value));
            }
        }

        document.add(table);
    }

    /**
     * Retorna todos os postos de trabalho que o funcionário já ocupou (atual + histórico de remanejamentos).
     */
    private Set<WorkPost> getAllWorkPostsForEmployee(Employee emp) {
        Set<WorkPost> posts = new TreeSet<>(Comparator.comparing(
                (WorkPost w) -> w != null && w.getName() != null ? w.getName() : "",
                String.CASE_INSENSITIVE_ORDER));
        if (emp.getWorkPost() != null) {
            posts.add(emp.getWorkPost());
        }
        List<Remanejamento> remanejamentos = remanejamentoRepository.findByEmployeeIdWithRelations(emp.getId());
        for (Remanejamento r : remanejamentos) {
            if (r.getOriginWorkstation() != null) posts.add(r.getOriginWorkstation());
            if (r.getDestinationWorkstation() != null) posts.add(r.getDestinationWorkstation());
        }
        return posts;
    }

    /**
     * Agrupa por funcionário: cada funcionário com todos os postos que já passou.
     * Cada linha = funcionário + um posto (uma linha por posto).
     */
    private void addEmployeesTableGroupedByEmployee(Document document, List<Employee> employees, List<String> columns, ReportOrderBy orderBy) {
        if (employees.isEmpty()) {
            document.add(new Paragraph("Nenhum funcionário encontrado.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        List<Employee> sortedEmployees = sortEmployees(employees, orderBy);
        Map<Employee, Set<WorkPost>> employeeToPosts = new LinkedHashMap<>();
        for (Employee emp : sortedEmployees) {
            employeeToPosts.put(emp, getAllWorkPostsForEmployee(emp));
        }

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

        for (Employee emp : sortedEmployees) {
            Set<WorkPost> posts = employeeToPosts.get(emp);
            if (posts == null || posts.isEmpty()) {
                for (String colKey : columns) {
                    String value = getCellValue(emp, colKey);
                    table.addCell(standardReportLayoutService.createDataCell(value));
                }
            } else {
                for (WorkPost wp : posts) {
                    for (String colKey : columns) {
                        String value = getCellValueForWorkPost(emp, wp, colKey);
                        table.addCell(standardReportLayoutService.createDataCell(value));
                    }
                }
            }
        }

        document.add(table);
    }

    /**
     * Agrupa por posto de trabalho: cada posto com os funcionários que ocuparam.
     */
    private void addEmployeesTableGroupedByWorkPost(Document document, List<Employee> employees, List<String> columns, ReportOrderBy orderBy) {
        if (employees.isEmpty()) {
            document.add(new Paragraph("Nenhum funcionário encontrado.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        Map<String, List<EmployeeWorkPostRow>> workPostToRows = new LinkedHashMap<>();
        for (Employee emp : employees) {
            Set<WorkPost> posts = getAllWorkPostsForEmployee(emp);
            if (posts.isEmpty()) {
                String key = "-";
                workPostToRows.computeIfAbsent(key, k -> new ArrayList<>()).add(new EmployeeWorkPostRow(emp, null));
            } else {
                for (WorkPost wp : posts) {
                    String key = wp.getName() != null ? wp.getName() : "-";
                    workPostToRows.computeIfAbsent(key, k -> new ArrayList<>()).add(new EmployeeWorkPostRow(emp, wp));
                }
            }
        }

        List<String> sortedPostNames = new ArrayList<>(workPostToRows.keySet());
        sortedPostNames.sort(String.CASE_INSENSITIVE_ORDER);

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

        for (String postName : sortedPostNames) {
            List<EmployeeWorkPostRow> rows = workPostToRows.get(postName);
            if (rows == null) continue;
            rows.sort(Comparator.comparing(r -> r.employee.getName() != null ? r.employee.getName() : "", String.CASE_INSENSITIVE_ORDER));
            for (EmployeeWorkPostRow row : rows) {
                for (String colKey : columns) {
                    String value = getCellValueForWorkPost(row.employee, row.workPost, colKey);
                    table.addCell(standardReportLayoutService.createDataCell(value));
                }
            }
        }

        document.add(table);
    }

    private record EmployeeWorkPostRow(Employee employee, WorkPost workPost) {}

    private List<Employee> sortEmployees(List<Employee> employees, ReportOrderBy orderBy) {
        if (orderBy != null && orderBy == ReportOrderBy.POSTO_TRABALHO) {
            return employees.stream()
                    .sorted(Comparator.comparing(
                            (Employee e) -> e.getWorkPost() != null && e.getWorkPost().getName() != null ? e.getWorkPost().getName() : "",
                            String.CASE_INSENSITIVE_ORDER)
                            .thenComparing((Employee e) -> e.getName() != null ? e.getName() : "", String.CASE_INSENSITIVE_ORDER))
                    .toList();
        }
        return employees.stream()
                .sorted(Comparator.comparing((Employee e) -> e.getName() != null ? e.getName() : "", String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private String getCellValueForWorkPost(Employee emp, WorkPost overrideWorkPost, String key) {
        if ("workPost".equals(key)) {
            return overrideWorkPost != null && overrideWorkPost.getName() != null && !overrideWorkPost.getName().isBlank()
                    ? overrideWorkPost.getName() : "Não alocado";
        }
        return getCellValue(emp, key);
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
            case "proximasFeriasVencimento" -> "Venc. Férias";
            case "address" -> "Endereço";
            case "nationality" -> "Nacionalidade";
            case "motherName" -> "Nome Mãe";
            case "fatherName" -> "Nome Pai";
            case "escalaTrabalho" -> "Escala";
            case "horarioTrabalho" -> "Horário";
            default -> key;
        };
    }

    private String getCellValue(Employee emp, String key) {
        Object val = switch (key) {
            case "name" -> emp.getName();
            case "registrationNumber" -> emp.getRegistrationNumber();
            case "position" -> emp.getPosition() != null ? emp.getPosition().getName() : null;
            case "workPost" -> emp.getWorkPost() != null && emp.getWorkPost().getName() != null && !emp.getWorkPost().getName().isBlank()
                    ? emp.getWorkPost().getName() : null;
            case "company" -> emp.getCompany() != null ? (emp.getCompany().getSigla() != null ? emp.getCompany().getSigla() : emp.getCompany().getName()) : null;
            case "status" -> getStatusLabel(emp.getStatus());
            case "cpf" -> emp.getCpf() != null ? emp.getCpf() : emp.getDocument();
            case "rg" -> emp.getRg() != null ? emp.getRg() : emp.getNumeroRg();
            case "birthDate" -> emp.getBirthDate() != null ? emp.getBirthDate().format(DATE_FMT) : null;
            case "hireDate" -> emp.getHireDate() != null ? emp.getHireDate().format(DATE_FMT) : null;
            case "terminationDate" -> emp.getTerminationDate() != null ? emp.getTerminationDate().format(DATE_FMT) : null;
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
            case "proximasFeriasVencimento" -> emp.getProximasFeriasVencimento() != null ? emp.getProximasFeriasVencimento().format(DATE_FMT) : null;
            case "address" -> emp.getAddress();
            case "nationality" -> emp.getNationality();
            case "motherName" -> emp.getNomeMae();
            case "fatherName" -> emp.getNomePai();
            case "escalaTrabalho" -> emp.getEscalaTrabalho();
            case "horarioTrabalho" -> emp.getHorarioTrabalho();
            default -> null;
        };
        if (val == null || Objects.toString(val).isBlank()) {
            return "workPost".equals(key) ? "Não alocado" : "-";
        }
        return Objects.toString(val);
    }

    private String getStatusLabel(EmploymentStatus status) {
        if (status == null) return "-";
        return switch (status) {
            case ACTIVE -> "Ativo";
            case INACTIVE -> "Inativo";
            case TERMINATED -> "Demitido";
            default -> status.name();
        };
    }
}
