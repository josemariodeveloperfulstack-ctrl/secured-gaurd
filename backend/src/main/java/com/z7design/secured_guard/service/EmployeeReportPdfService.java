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
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
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
                    .reportTitle("RELATÓRIO DE FUNCIONÁRIOS")
                    .landscape(true)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            addReportHeaderInfo(document, employees.size());
            addEmployeesTable(document, employees);

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

    private void addEmployeesTable(Document document, List<Employee> employees) {
        if (employees.isEmpty()) {
            document.add(new Paragraph("Nenhum funcionário encontrado.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20));
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{20, 10, 18, 14, 30, 8}))
                .useAllAvailableWidth()
                .setMarginTop(10);

        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Nome"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Matrícula"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Cargo"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Posto"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Empresa"));
        table.addHeaderCell(standardReportLayoutService.createHeaderCell("Status"));

        for (Employee emp : employees) {
            table.addCell(standardReportLayoutService.createDataCell(emp.getName() != null ? emp.getName() : "-"));
            table.addCell(standardReportLayoutService.createDataCell(emp.getRegistrationNumber() != null ? emp.getRegistrationNumber() : "-"));
            String cargo = emp.getPosition() != null && emp.getPosition().getName() != null ? emp.getPosition().getName() : "-";
            table.addCell(standardReportLayoutService.createDataCell(cargo));
            String posto = emp.getWorkPost() != null && emp.getWorkPost().getName() != null ? emp.getWorkPost().getName() : "-";
            table.addCell(standardReportLayoutService.createDataCell(posto));
            String empresa = emp.getCompany() != null ? (emp.getCompany().getSigla() != null ? emp.getCompany().getSigla() : emp.getCompany().getName()) : "-";
            table.addCell(standardReportLayoutService.createDataCell(empresa != null ? empresa : "-"));
            table.addCell(standardReportLayoutService.createDataCell(getStatusLabel(emp.getStatus())));
        }

        document.add(table);
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
