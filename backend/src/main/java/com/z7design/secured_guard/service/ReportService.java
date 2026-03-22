package com.z7design.secured_guard.service;

import com.z7design.secured_guard.config.JasperReportsConfig;
import com.z7design.secured_guard.dto.CompanyDTO;
import com.z7design.secured_guard.dto.ProductDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.InventoryItem;
import com.z7design.secured_guard.model.FinancialTransaction;
import com.z7design.secured_guard.exception.ReportGenerationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sf.jasperreports.engine.*;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.z7design.secured_guard.model.KmControl;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.ReportIssuanceContext;
import com.z7design.secured_guard.service.StandardReportLayoutService;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
// import com.z7design.secured_guard.repository.KmControlRepository; // Importar KmControlRepository

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final JasperReportsConfig jasperReportsConfig;
    private final EmployeeService employeeService;
    private final CompanyService companyService;
    private final ProductService productService;
    private final InventoryItemService inventoryItemService;
    private final FinancialTransactionService financialTransactionService;
    // private final KmControlRepository kmControlRepository; // Injetar
    // KmControlRepository (usado em relatórios de KM)
    private final com.z7design.secured_guard.repository.PayrollRepository payrollRepository;
    private final com.z7design.secured_guard.service.PayrollService payrollService;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    /**
     * Gera relatório de funcionários em PDF
     */
    public byte[] generateEmployeeReportPdf(Map<String, Object> filters) {
        try {
            List<Employee> employees = employeeService.findAll();
            log.info("Gerando relatório iText para {} funcionários", employees.size());

            // 1. Determinar empresa para layout (fallback para primeira ativa)
            java.util.UUID companyId = null;
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
            } else {
                List<Company> all = companyRepository.findAll();
                if (all != null && !all.isEmpty()) {
                    companyId = all.get(0).getId();
                } else {
                    // Fallback extremo
                    return jasperReportsConfig.generatePdfReport("reports/employee_report.jrxml", employees,
                            createEmployeeReportParameters(filters));
                }
            }

            // 2. Configurar Layout
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE FUNCIONÁRIOS")
                    .topMargin(130f)
                    .bottomMargin(95f)
                    .leftMargin(20f)
                    .rightMargin(20f)
                    .footerUserSummary(ReportIssuanceContext.resolveUserLabelForReportFooter())
                    .footerReportAt(ReportIssuanceContext.resolveReportTimestampFooter())
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // 3. Cabeçalho extra
            document.add(new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setMarginBottom(10));

            // 4. Tabela
            if (employees.isEmpty()) {
                document.add(new Paragraph("Nenhum funcionário encontrado.").setTextAlignment(TextAlignment.CENTER));
            } else {
                // Colunas: Nome (30%), CPF (15%), Cargo (20%), Depto (15%), Status (10%),
                // Admissão (10%)
                Table table = new Table(UnitValue.createPercentArray(new float[] { 30, 15, 20, 15, 10, 10 }))
                        .setWidth(UnitValue.createPercentValue(100));

                String[] headers = { "Nome", "CPF", "Cargo", "Departamento", "Status", "Admissão" };
                for (String h : headers) {
                    table.addHeaderCell(
                            new Paragraph(h).setBold().setFontSize(8).setTextAlignment(TextAlignment.CENTER));
                }

                DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

                for (Employee e : employees) {
                    table.addCell(new Paragraph(e.getName() != null ? e.getName().toUpperCase() : "").setFontSize(8));
                    table.addCell(new Paragraph(
                            e.getDocument() != null
                                    ? com.z7design.secured_guard.util.ValidationUtils.formatCpf(e.getDocument())
                                    : "")
                            .setFontSize(8).setTextAlignment(TextAlignment.CENTER));

                    String jobTitle = e.getPosition() != null ? e.getPosition().getName() : "";
                    table.addCell(new Paragraph(jobTitle).setFontSize(8));

                    String deptName = e.getDepartment() != null ? e.getDepartment().getName() : "";
                    table.addCell(new Paragraph(deptName).setFontSize(8));

                    String status = e.getStatus() != null ? e.getStatus().toString() : "-";
                    // Tentar pegar descrição amigável se possível, senão usar enum name
                    table.addCell(new Paragraph(status).setFontSize(8).setTextAlignment(TextAlignment.CENTER));

                    table.addCell(
                            new Paragraph(e.getHireDate() != null ? e.getHireDate().format(dateFmt) : "")
                                    .setFontSize(8).setTextAlignment(TextAlignment.CENTER));
                }

                document.add(table);
            }

            // 5. Finalizar
            // standardReportLayoutService.finalizeDocumentLayout(docWithPdf); // Deprecated
            document.close();

            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Erro ao gerar relatório iText de funcionários", e);
            throw new ReportGenerationException("Erro ao gerar relatório de funcionários", e);
        }
    }

    /**
     * Gera relatório de funcionários em Excel
     */
    public byte[] generateEmployeeReportExcel(Map<String, Object> filters) {
        try {
            List<Employee> employees = employeeService.findAll();
            Map<String, Object> parameters = createEmployeeReportParameters(filters);

            return jasperReportsConfig.generateExcelReport(
                    "reports/employee_report.jrxml",
                    employees,
                    parameters);
        } catch (JRException | IOException e) {
            log.error("Erro ao gerar relatório de funcionários em Excel", e);
            throw new ReportGenerationException("Erro ao gerar relatório de funcionários", e);
        }
    }

    /**
     * Gera relatório de empresas em PDF
     */
    public byte[] generateCompanyReportPdf(Map<String, Object> filters) {
        try {
            List<CompanyDTO> companies = companyService.getAllCompanies();
            log.info("Gerando relatório iText para {} empresas", companies.size());

            // 1. Determinar empresa para layout (fallback para primeira ativa)
            java.util.UUID companyId = null;
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
            } else {
                List<Company> all = companyRepository.findAll();
                if (all != null && !all.isEmpty()) {
                    companyId = all.get(0).getId();
                } else {
                    throw new ReportGenerationException("Nenhuma empresa cadastrada para gerar o relatório.");
                }
            }

            // 2. Configurar Layout
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE EMPRESAS")
                    .topMargin(130f)
                    .bottomMargin(80f)
                    .leftMargin(20f)
                    .rightMargin(20f)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // 3. Cabeçalho extra
            document.add(new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setMarginBottom(10));

            // 4. Tabela
            if (companies.isEmpty()) {
                document.add(new Paragraph("Nenhuma empresa encontrada.").setTextAlignment(TextAlignment.CENTER));
            } else {
                // Colunas: Nome (35%), CNPJ (20%), Email (25%), Telefone (10%), Status (10%)
                Table table = new Table(UnitValue.createPercentArray(new float[] { 35, 20, 25, 10, 10 }))
                        .setWidth(UnitValue.createPercentValue(100));

                String[] headers = { "Nome", "CNPJ", "Email", "Telefone", "Status" };
                for (String h : headers) {
                    table.addHeaderCell(createHeaderCell(h));
                }

                for (CompanyDTO c : companies) {
                    table.addCell(createCell(c.getName() != null ? c.getName().toUpperCase() : ""));
                    table.addCell(createCell(c.getCnpj() != null
                            ? com.z7design.secured_guard.util.CompanyDataFormatter.formatCnpj(c.getCnpj())
                            : "")).setTextAlignment(TextAlignment.CENTER);
                    table.addCell(createCell(c.getEmail() != null ? c.getEmail().toLowerCase() : ""));
                    table.addCell(createCell(c.getPhone() != null ? c.getPhone() : ""))
                            .setTextAlignment(TextAlignment.CENTER);

                    String status = c.getStatus() != null ? c.getStatus().toString() : "-";
                    table.addCell(createCell(status)).setTextAlignment(TextAlignment.CENTER);
                }

                document.add(table);

                document.add(new Paragraph(String.format("Total de empresas: %d", companies.size()))
                        .setFontSize(10).setBold().setMarginTop(10));
            }

            // 5. Finalizar
            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Erro ao gerar relatório iText de empresas", e);
            throw new ReportGenerationException("Erro ao gerar relatório de empresas", e);
        }
    }

    /**
     * Gera relatório de produtos em PDF
     */
    public byte[] generateProductReportPdf(Map<String, Object> filters) {
        try {
            List<ProductDTO> products = productService.getAllProducts();
            log.info("Gerando relatório iText para {} produtos", products.size());

            // 1. Determinar empresa para layout
            java.util.UUID companyId = null;
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
            } else {
                List<Company> all = companyRepository.findAll();
                if (all != null && !all.isEmpty()) {
                    companyId = all.get(0).getId();
                } else {
                    throw new ReportGenerationException("Nenhuma empresa cadastrada para gerar o relatório.");
                }
            }

            // 2. Configurar Layout
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE PRODUTOS")
                    .topMargin(130f)
                    .bottomMargin(80f)
                    .leftMargin(20f)
                    .rightMargin(20f)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // 3. Cabeçalho extra
            document.add(new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setMarginBottom(10));

            // 4. Tabela
            if (products.isEmpty()) {
                document.add(new Paragraph("Nenhum produto encontrado.").setTextAlignment(TextAlignment.CENTER));
            } else {
                // Colunas: Nome (40%), Código (15%), Categoria (20%), Localização (15%),
                // Estoque (10%)
                Table table = new Table(UnitValue.createPercentArray(new float[] { 40, 15, 20, 15, 10 }))
                        .setWidth(UnitValue.createPercentValue(100));

                String[] headers = { "Nome", "Código", "Categoria", "Localização", "Estoque" };
                for (String h : headers) {
                    table.addHeaderCell(createHeaderCell(h));
                }

                for (ProductDTO p : products) {
                    table.addCell(createCell(p.getName() != null ? p.getName().toUpperCase() : ""));
                    table.addCell(createCell(p.getCode() != null ? p.getCode() : ""))
                            .setTextAlignment(TextAlignment.CENTER);
                    table.addCell(createCell(p.getCategory() != null ? p.getCategory() : ""));
                    table.addCell(createCell(p.getLocation() != null ? p.getLocation() : ""));
                    table.addCell(createCell(p.getCurrentStock() != null ? String.valueOf(p.getCurrentStock()) : "0"))
                            .setTextAlignment(TextAlignment.RIGHT);
                }

                document.add(table);

                document.add(new Paragraph(String.format("Total de produtos: %d", products.size()))
                        .setFontSize(10).setBold().setMarginTop(10));
            }

            // 5. Finalizar
            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Erro ao gerar relatório iText de produtos", e);
            throw new ReportGenerationException("Erro ao gerar relatório de produtos", e);
        }
    }

    /**
     * Gera relatório de estoque em PDF
     */
    public byte[] generateInventoryReportPdf(Map<String, Object> filters) {
        try {
            List<InventoryItem> items = inventoryItemService.findAll();
            log.info("Gerando relatório iText para {} itens de estoque", items.size());

            // 1. Determinar empresa para layout
            java.util.UUID companyId = null;
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
            } else {
                List<Company> all = companyRepository.findAll();
                if (all != null && !all.isEmpty()) {
                    companyId = all.get(0).getId();
                } else {
                    throw new ReportGenerationException("Nenhuma empresa cadastrada para gerar o relatório.");
                }
            }

            // 2. Configurar Layout
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE ESTOQUE")
                    .topMargin(130f)
                    .bottomMargin(80f)
                    .leftMargin(20f)
                    .rightMargin(20f)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // 3. Cabeçalho extra
            document.add(new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT).setFontSize(9).setMarginBottom(10));

            // 4. Tabela
            if (items.isEmpty()) {
                document.add(
                        new Paragraph("Nenhum item de estoque encontrado.").setTextAlignment(TextAlignment.CENTER));
            } else {
                // Colunas: Item (35%), Código (15%), Esp. (10%), Cont. (10%), Dif. (10%),
                // Status (20%)
                Table table = new Table(UnitValue.createPercentArray(new float[] { 35, 15, 10, 10, 10, 20 }))
                        .setWidth(UnitValue.createPercentValue(100));

                String[] headers = { "Item", "Código", "Esp.", "Cont.", "Dif.", "Status" };
                for (String h : headers) {
                    table.addHeaderCell(createHeaderCell(h));
                }

                for (InventoryItem i : items) {
                    table.addCell(createCell(i.getItemName() != null ? i.getItemName().toUpperCase()
                            : (i.getProduct() != null ? i.getProduct().getName().toUpperCase() : "")));
                    table.addCell(createCell(i.getCode() != null ? i.getCode() : ""))
                            .setTextAlignment(TextAlignment.CENTER);
                    table.addCell(
                            createCell(i.getExpectedQuantity() != null ? String.valueOf(i.getExpectedQuantity()) : "0"))
                            .setTextAlignment(TextAlignment.RIGHT);
                    table.addCell(
                            createCell(i.getCountedQuantity() != null ? String.valueOf(i.getCountedQuantity()) : "0"))
                            .setTextAlignment(TextAlignment.RIGHT);
                    table.addCell(
                            createCell(i.getVarianceQuantity() != null ? String.valueOf(i.getVarianceQuantity()) : "0"))
                            .setTextAlignment(TextAlignment.RIGHT);
                    table.addCell(createCell(i.getStatus() != null ? i.getStatus() : "-"))
                            .setTextAlignment(TextAlignment.CENTER);
                }

                document.add(table);

                document.add(new Paragraph(String.format("Total de itens: %d", items.size()))
                        .setFontSize(10).setBold().setMarginTop(10));
            }

            // 5. Finalizar
            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Erro ao gerar relatório iText de estoque", e);
            throw new ReportGenerationException("Erro ao gerar relatório de estoque", e);
        }
    }

    /**
     * Gera relatório financeiro em PDF com layout padrão
     */
    public byte[] generateFinancialReportPdf(Map<String, Object> filters) {
        try {
            log.info("Gerando relatório financeiro em PDF com layout padrão");

            List<FinancialTransaction> transactions = financialTransactionService.findAll();

            // Determinar companyId - usar primeira empresa ativa
            java.util.UUID companyId = null;
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
                log.info("Usando primeira empresa ativa: {} (ID: {})",
                        activeCompanies.get(0).getName(), companyId);
            } else {
                List<Company> allCompanies = companyRepository.findAll();
                if (allCompanies != null && !allCompanies.isEmpty()) {
                    companyId = allCompanies.get(0).getId();
                    log.warn("Nenhuma empresa ativa encontrada. Usando primeira empresa cadastrada: {} (ID: {})",
                            allCompanies.get(0).getName(), companyId);
                } else {
                    throw new ReportGenerationException("Não foi possível determinar a empresa para o relatório. " +
                            "Nenhuma empresa cadastrada no sistema. Por favor, cadastre pelo menos uma empresa.");
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

            try {
                PdfWriter writer = new PdfWriter(baos);

                // Criar documento com layout padrão
                ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                        .companyId(companyId)
                        .reportTitle("RELATÓRIO FINANCEIRO")
                        .topMargin(120f) // Espaço para cabeçalho
                        .bottomMargin(80f) // Espaço para rodapé
                        .leftMargin(50f)
                        .rightMargin(50f)
                        .build();

                docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
                Document document = docWithPdf.getDocument();

                // Informações do relatório
                Paragraph reportInfo = new Paragraph(
                        "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                        .setTextAlignment(TextAlignment.RIGHT)
                        .setFontSize(10)
                        .setMarginBottom(10);
                document.add(reportInfo);

                // Estatísticas
                double totalIncome = transactions.stream()
                        .filter(t -> t.getType() != null && "INCOME".equalsIgnoreCase(t.getType()))
                        .mapToDouble(t -> t.getAmount() != null ? t.getAmount().doubleValue() : 0.0)
                        .sum();
                double totalExpense = transactions.stream()
                        .filter(t -> t.getType() != null && "EXPENSE".equalsIgnoreCase(t.getType()))
                        .mapToDouble(t -> t.getAmount() != null ? t.getAmount().doubleValue() : 0.0)
                        .sum();
                double balance = totalIncome - totalExpense;

                Paragraph stats = new Paragraph(String.format(
                        "Total de transações: %d | Receitas: R$ %,.2f | Despesas: R$ %,.2f | Saldo: R$ %,.2f",
                        transactions.size(), totalIncome, totalExpense, balance))
                        .setFontSize(12)
                        .setBold()
                        .setMarginBottom(15);
                document.add(stats);

                // Tabela de transações
                if (transactions.isEmpty()) {
                    Paragraph noData = new Paragraph("Nenhuma transação financeira encontrada.")
                            .setTextAlignment(TextAlignment.CENTER)
                            .setFontSize(12)
                            .setMarginTop(20);
                    document.add(noData);
                } else {
                    Table table = new Table(6).setWidth(UnitValue.createPercentValue(100));

                    // Cabeçalhos
                    table.addHeaderCell(createHeaderCell("Data"));
                    table.addHeaderCell(createHeaderCell("Tipo"));
                    table.addHeaderCell(createHeaderCell("Descrição"));
                    table.addHeaderCell(createHeaderCell("Valor"));
                    table.addHeaderCell(createHeaderCell("Status"));
                    table.addHeaderCell(createHeaderCell("Categoria"));

                    // Dados
                    DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                    for (FinancialTransaction transaction : transactions) {
                        table.addCell(createCell(
                                transaction.getDate() != null ? transaction.getDate().format(dateFormatter) : ""));
                        table.addCell(createCell(transaction.getType() != null ? transaction.getType() : ""));

                        // Descrição (truncar se muito longa)
                        String desc = transaction.getDescription() != null ? transaction.getDescription() : "";
                        if (desc.length() > 40) {
                            desc = desc.substring(0, 37) + "...";
                        }
                        table.addCell(createCell(desc));

                        table.addCell(createCell(
                                transaction.getAmount() != null ? String.format("R$ %,.2f", transaction.getAmount())
                                        .replace(",", "X").replace(".", ",").replace("X", ".") : ""));
                        table.addCell(createCell(transaction.getStatus() != null ? transaction.getStatus() : ""));
                        table.addCell(createCell(transaction.getCategory() != null ? transaction.getCategory() : ""));
                    }

                    document.add(table);
                }

                // Finalizar layout padrão (adiciona header/footer em todas as páginas)
                standardReportLayoutService.finalizeDocumentLayout(docWithPdf);

                document.close();

            } catch (Exception e) {
                log.error("Erro ao gerar PDF financeiro: {}", e.getMessage(), e);
                throw new ReportGenerationException("Erro ao gerar relatório financeiro: " + e.getMessage(), e);
            }

            byte[] result = baos.toByteArray();
            log.info("PDF financeiro gerado com sucesso, tamanho: {} bytes", result.length);
            return result;

        } catch (ReportGenerationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao gerar relatório financeiro em PDF", e);
            throw new ReportGenerationException("Erro ao gerar relatório financeiro", e);
        }
    }

    /**
     * Gera relatório consolidado em PDF com layout padrão
     */
    public byte[] generateConsolidatedReportPdf(Map<String, Object> filters) {
        try {
            log.info("Gerando relatório consolidado em PDF com layout padrão");

            // Determinar companyId - usar primeira empresa ativa
            java.util.UUID companyId = null;
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
            } else {
                List<Company> allCompanies = companyRepository.findAll();
                if (allCompanies != null && !allCompanies.isEmpty()) {
                    companyId = allCompanies.get(0).getId();
                } else {
                    throw new ReportGenerationException("Nenhuma empresa cadastrada.");
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO CONSOLIDADO DO SISTEMA")
                    .topMargin(120f)
                    .bottomMargin(80f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // 1. Visão Geral (Estatísticas Rápidas)
            document.add(new Paragraph("1. VISÃO GERAL").setBold().setFontSize(14).setMarginTop(10));
            Table summaryTable = new Table(2).setWidth(UnitValue.createPercentValue(100));
            summaryTable.addCell(createCell("Total de Funcionários:"));
            summaryTable.addCell(createCell(String.valueOf(employeeService.findAll().size())));
            summaryTable.addCell(createCell("Total de Empresas:"));
            summaryTable.addCell(createCell(String.valueOf(companyService.getAllCompanies().size())));
            summaryTable.addCell(createCell("Total de Produtos:"));
            summaryTable.addCell(createCell(String.valueOf(productService.getAllProducts().size())));
            document.add(summaryTable);

            // 2. Resumo Financeiro
            document.add(new Paragraph("2. RESUMO FINANCEIRO").setBold().setFontSize(14).setMarginTop(20));
            List<FinancialTransaction> transactions = financialTransactionService.findAll();
            double totalIncome = transactions.stream()
                    .filter(t -> "INCOME".equalsIgnoreCase(t.getType()))
                    .mapToDouble(t -> t.getAmount() != null ? t.getAmount().doubleValue() : 0.0)
                    .sum();
            double totalExpense = transactions.stream()
                    .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                    .mapToDouble(t -> t.getAmount() != null ? t.getAmount().doubleValue() : 0.0)
                    .sum();

            Table finTable = new Table(2).setWidth(UnitValue.createPercentValue(100));
            finTable.addCell(createCell("Total de Receitas:"));
            finTable.addCell(createCell(String.format("R$ %,.2f", totalIncome)));
            finTable.addCell(createCell("Total de Despesas:"));
            finTable.addCell(createCell(String.format("R$ %,.2f", totalExpense)));
            finTable.addCell(createCell("Saldo Geral:"));
            finTable.addCell(createCell(String.format("R$ %,.2f", totalIncome - totalExpense)));
            document.add(finTable);

            document.add(new Paragraph(
                    "\nEste relatório apresenta uma visão consolidada dos principais módulos do sistema Secure Guard.")
                    .setFontSize(10).setItalic());

            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();

            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar relatório consolidado em PDF", e);
            throw new ReportGenerationException("Erro ao gerar relatório consolidado", e);
        }
    }

    /**
     * Gera relatório de folha de pagamento em PDF com layout padrão
     */
    public byte[] generatePayrollReportPdf(String referenceMonth, UUID unitId, UUID employeeId) {
        try {
            log.info("Gerando relatório de folha em PDF com layout padrão - Mês: {}, Unidade: {}, Funcionário: {}",
                    referenceMonth, unitId, employeeId);

            // Montar dataset básico da folha
            List<com.z7design.secured_guard.model.Payroll> data;
            if (employeeId != null && referenceMonth != null) {
                data = payrollService.findByEmployeeId(employeeId).stream()
                        .filter(p -> referenceMonth.equals(p.getReferenceMonth()))
                        .collect(java.util.stream.Collectors.toList());
            } else if (unitId != null && referenceMonth != null) {
                data = payrollService.findByUnitId(unitId).stream()
                        .filter(p -> referenceMonth.equals(p.getReferenceMonth()))
                        .collect(java.util.stream.Collectors.toList());
            } else if (referenceMonth != null) {
                data = payrollRepository.findByReferenceMonth(referenceMonth);
            } else {
                data = payrollService.findAll();
            }

            // Determinar companyId - usar primeira empresa ativa
            java.util.UUID companyId = null;
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
            } else {
                List<Company> allCompanies = companyRepository.findAll();
                if (allCompanies != null && !allCompanies.isEmpty()) {
                    companyId = allCompanies.get(0).getId();
                } else {
                    throw new ReportGenerationException("Nenhuma empresa cadastrada para gerar o relatório.");
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE FOLHA DE PAGAMENTO")
                    .topMargin(120f)
                    .bottomMargin(80f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Informações do relatório
            Paragraph reportInfo = new Paragraph("Competência: " + (referenceMonth != null ? referenceMonth : "Todos"))
                    .setFontSize(11)
                    .setBold()
                    .setMarginBottom(10);
            document.add(reportInfo);

            if (data.isEmpty()) {
                document.add(new Paragraph("Nenhum registro de folha encontrado para os filtros selecionados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setMarginTop(20));
            } else {
                Table table = new Table(5).setWidth(UnitValue.createPercentValue(100));
                table.addHeaderCell(createHeaderCell("Funcionário"));
                table.addHeaderCell(createHeaderCell("Cargo"));
                table.addHeaderCell(createHeaderCell("Referência"));
                table.addHeaderCell(createHeaderCell("Salário Bruto"));
                table.addHeaderCell(createHeaderCell("Salário Líquido"));

                for (var payroll : data) {
                    table.addCell(createCell(payroll.getEmployee() != null ? payroll.getEmployee().getName() : "N/A"));
                    table.addCell(
                            createCell(payroll.getEmployee() != null && payroll.getEmployee().getPosition() != null
                                    ? payroll.getEmployee().getPosition().getName()
                                    : "N/A"));
                    table.addCell(createCell(payroll.getReferenceMonth()));
                    table.addCell(createCell(String.format("R$ %,.2f",
                            payroll.getGrossSalary() != null ? payroll.getGrossSalary() : 0.0)));
                    table.addCell(createCell(
                            String.format("R$ %,.2f", payroll.getNetSalary() != null ? payroll.getNetSalary() : 0.0)));
                }
                document.add(table);

                double totalNet = data.stream().map(p -> p.getNetSalary() == null ? 0d : p.getNetSalary()).reduce(0d,
                        Double::sum);
                Paragraph total = new Paragraph("TOTAL LÍQUIDO: " + String.format("R$ %,.2f", totalNet))
                        .setTextAlignment(TextAlignment.RIGHT)
                        .setBold()
                        .setMarginTop(15);
                document.add(total);
            }

            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();

            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de folha em PDF", e);
            throw new ReportGenerationException("Erro ao gerar relatório de folha", e);
        }
    }

    /**
     * Gera relatório de Controle de Quilometragem em PDF ou Excel
     */
    public byte[] generateKmControlReport(List<KmControl> kmControls, Map<String, Object> filters, String format)
            throws JRException, IOException {
        if ("pdf".equalsIgnoreCase(format)) {
            // Usar layout padrão para PDF
            return generateKmControlReportPDFWithIText(kmControls, filters);
        } else if ("xlsx".equalsIgnoreCase(format)) {
            // Excel ainda usa JasperReports
            Map<String, Object> parameters = createKmControlReportParameters(filters);
            return jasperReportsConfig.generateExcelReport("reports/km_control_report.jrxml", kmControls, parameters);
        } else {
            throw new IllegalArgumentException("Formato de relatório inválido: " + format);
        }
    }

    /**
     * Gera relatório PDF de Controle de KM usando iText com layout padrão
     */
    private byte[] generateKmControlReportPDFWithIText(List<KmControl> kmControls, Map<String, Object> filters)
            throws IOException {
        log.info("Gerando relatório PDF de Controle de KM com layout padrão - {} registros", kmControls.size());

        // Determinar companyId
        java.util.UUID companyId = null;
        if (!kmControls.isEmpty()) {
            for (KmControl kmControl : kmControls) {
                if (kmControl.getVehicle() != null && kmControl.getVehicle().getCompanyId() != null) {
                    companyId = kmControl.getVehicle().getCompanyId();
                    log.info("Usando empresa do veículo {}: {}", kmControl.getVehiclePlate(), companyId);
                    break;
                }
            }
        }

        // Fallback: usar primeira empresa ativa
        if (companyId == null) {
            log.warn("Nenhum registro possui empresa associada. Buscando primeira empresa ativa como fallback...");
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                companyId = activeCompanies.get(0).getId();
                log.info("Usando primeira empresa ativa como fallback: {} (ID: {})",
                        activeCompanies.get(0).getName(), companyId);
            } else {
                List<Company> allCompanies = companyRepository.findAll();
                if (allCompanies != null && !allCompanies.isEmpty()) {
                    companyId = allCompanies.get(0).getId();
                    log.warn("Nenhuma empresa ativa encontrada. Usando primeira empresa cadastrada: {} (ID: {})",
                            allCompanies.get(0).getName(), companyId);
                } else {
                    throw new ReportGenerationException("Não foi possível determinar a empresa para o relatório. " +
                            "Nenhuma empresa cadastrada no sistema. Por favor, cadastre pelo menos uma empresa.");
                }
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            // Criar documento com layout padrão
            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE CONTROLE DE QUILOMETRAGEM")
                    .topMargin(120f) // Espaço para cabeçalho
                    .bottomMargin(80f) // Espaço para rodapé
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Informações do relatório
            Paragraph reportInfo = new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10)
                    .setMarginBottom(10);
            document.add(reportInfo);

            // Filtros aplicados
            if (filters != null && !filters.isEmpty()) {
                if (filters.containsKey("startDate") || filters.containsKey("endDate")) {
                    String period = "";
                    if (filters.containsKey("startDate")) {
                        period = filters.get("startDate").toString();
                    }
                    if (filters.containsKey("endDate")) {
                        if (!period.isEmpty())
                            period += " a ";
                        period += filters.get("endDate").toString();
                    }
                    document.add(new Paragraph("Período: " + period).setFontSize(10).setMarginBottom(2));
                }
                if (filters.containsKey("supervisor")) {
                    document.add(new Paragraph("Supervisor: " + filters.get("supervisor")).setFontSize(10)
                            .setMarginBottom(2));
                }
                if (filters.containsKey("vehiclePlate")) {
                    document.add(
                            new Paragraph("Placa: " + filters.get("vehiclePlate")).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Estatísticas
            Paragraph stats = new Paragraph(String.format("Total de registros: %d", kmControls.size()))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            // Tabela de registros
            if (kmControls.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum registro encontrado com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(7).setWidth(UnitValue.createPercentValue(100));

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Data"));
                table.addHeaderCell(createHeaderCell("Supervisor"));
                table.addHeaderCell(createHeaderCell("Placa"));
                table.addHeaderCell(createHeaderCell("KM Inicial"));
                table.addHeaderCell(createHeaderCell("KM Final"));
                table.addHeaderCell(createHeaderCell("Total KM"));
                table.addHeaderCell(createHeaderCell("Valor"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (KmControl kmControl : kmControls) {
                    table.addCell(
                            createCell(kmControl.getDate() != null ? kmControl.getDate().format(dateFormatter) : ""));
                    table.addCell(createCell(kmControl.getSupervisor() != null ? kmControl.getSupervisor() : ""));
                    table.addCell(createCell(kmControl.getVehiclePlate() != null ? kmControl.getVehiclePlate() : ""));
                    table.addCell(createCell(
                            kmControl.getInitialKm() != null ? String.valueOf(kmControl.getInitialKm()) : ""));
                    table.addCell(
                            createCell(kmControl.getFinalKm() != null ? String.valueOf(kmControl.getFinalKm()) : ""));
                    table.addCell(
                            createCell(kmControl.getTotalKm() != null ? String.valueOf(kmControl.getTotalKm()) : ""));
                    table.addCell(
                            createCell(kmControl.getValue() != null
                                    ? "R$ " + kmControl.getValue().setScale(2, java.math.RoundingMode.HALF_UP)
                                            .toString().replace(".", ",")
                                    : ""));
                }

                document.add(table);
            }

            // Finalizar layout padrão (adiciona header/footer em todas as páginas)
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);

            document.close();

        } catch (Exception e) {
            log.error("Erro ao gerar PDF de Controle de KM: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de Controle de KM gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }

    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setTextAlignment(TextAlignment.LEFT);
    }

    // Métodos auxiliares para criar parâmetros dos relatórios
    private Map<String, Object> createEmployeeReportParameters(Map<String, Object> filters) {
        Map<String, Object> parameters = jasperReportsConfig.createDefaultParameters();
        parameters.put("REPORT_TITLE", "Relatório de Funcionários");
        parameters.put("REPORT_SUBTITLE", "Lista completa de funcionários do sistema");
        parameters.put("GENERATED_BY", "Sistema Secure Guard");
        parameters.put("FILTERS", filters);
        parameters.put("TOTAL_EMPLOYEES", employeeService.findAll().size());
        return parameters;
    }

    private Map<String, Object> createCompanyReportParameters(Map<String, Object> filters) {
        Map<String, Object> parameters = jasperReportsConfig.createDefaultParameters();
        parameters.put("REPORT_TITLE", "Relatório de Empresas");
        parameters.put("REPORT_SUBTITLE", "Lista completa de empresas cadastradas");
        parameters.put("GENERATED_BY", "Sistema Secure Guard");
        parameters.put("FILTERS", filters);
        parameters.put("TOTAL_COMPANIES", companyService.getAllCompanies().size());
        return parameters;
    }

    private Map<String, Object> createProductReportParameters(Map<String, Object> filters) {
        Map<String, Object> parameters = jasperReportsConfig.createDefaultParameters();
        parameters.put("REPORT_TITLE", "Relatório de Produtos");
        parameters.put("REPORT_SUBTITLE", "Catálogo completo de produtos");
        parameters.put("GENERATED_BY", "Sistema Secure Guard");
        parameters.put("FILTERS", filters);
        parameters.put("TOTAL_PRODUCTS", productService.getAllProducts().size());
        return parameters;
    }

    private Map<String, Object> createInventoryReportParameters(Map<String, Object> filters) {
        Map<String, Object> parameters = jasperReportsConfig.createDefaultParameters();
        parameters.put("REPORT_TITLE", "Relatório de Estoque");
        parameters.put("REPORT_SUBTITLE", "Situação atual do estoque");
        parameters.put("GENERATED_BY", "Sistema Secure Guard");
        parameters.put("FILTERS", filters);
        parameters.put("TOTAL_ITEMS", inventoryItemService.findAll().size());
        return parameters;
    }

    private Map<String, Object> createFinancialReportParameters(Map<String, Object> filters) {
        Map<String, Object> parameters = jasperReportsConfig.createDefaultParameters();
        parameters.put("FILTERS", filters);
        parameters.put("TOTAL_TRANSACTIONS", financialTransactionService.findAll().size());
        return parameters;
    }

    private Map<String, Object> createConsolidatedReportParameters(Map<String, Object> filters) {
        Map<String, Object> parameters = jasperReportsConfig.createDefaultParameters();
        parameters.put("REPORT_TITLE", "Relatório Consolidado");
        parameters.put("REPORT_SUBTITLE", "Visão geral do sistema");
        parameters.put("GENERATED_BY", "Sistema Secure Guard");
        parameters.put("FILTERS", filters);
        parameters.put("REPORT_DATE", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        return parameters;
    }

    private Map<String, Object> createKmControlReportParameters(Map<String, Object> filters) {
        Map<String, Object> parameters = jasperReportsConfig.createDefaultParameters();
        parameters.put("REPORT_TITLE", "Relatório de Controle de Quilometragem");
        parameters.put("REPORT_SUBTITLE", "Registros de Quilometragem da Frota");
        parameters.put("GENERATED_BY", "Sistema Secure Guard");
        parameters.put("FILTERS", filters);
        // Adicionar parâmetros de filtro específicos, se houver
        if (filters.containsKey("startDate")) {
            parameters.put("FILTER_START_DATE", filters.get("startDate"));
        }
        if (filters.containsKey("endDate")) {
            parameters.put("FILTER_END_DATE", filters.get("endDate"));
        }
        if (filters.containsKey("supervisor")) {
            parameters.put("FILTER_SUPERVISOR", filters.get("supervisor"));
        }
        if (filters.containsKey("vehiclePlate")) {
            parameters.put("FILTER_VEHICLE_PLATE", filters.get("vehiclePlate"));
        }
        parameters.put("REPORT_DATE", LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        return parameters;
    }
}