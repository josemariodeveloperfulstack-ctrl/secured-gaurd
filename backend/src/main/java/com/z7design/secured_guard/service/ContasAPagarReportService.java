package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.Invoice;
import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContasAPagarReportService {

    private final InvoiceService invoiceService;
    private final ReportTemplateService reportTemplateService;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    /**
     * Gera relatório de contas a pagar por período
     */
    public String generateContasAPagarReport(LocalDate startDate, LocalDate endDate) {
        log.info("Gerando relatório de contas a pagar para período: {} a {}", startDate, endDate);

        try {
            // Buscar todas as contas no período
            List<Invoice> invoices = invoiceService.findByDueDateBetween(startDate, endDate);

            // Preparar dados para o template
            Map<String, Object> reportData = prepareReportData(invoices, startDate, endDate);

            // Gerar relatório completo
            String report = reportTemplateService.generateFullReport("contas-a-pagar", reportData);

            log.info("Relatório gerado com sucesso para {} contas", invoices.size());
            return report;

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de contas a pagar: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório de contas a pagar por status
     */
    public String generateContasAPagarReportByStatus(ExpenseStatus status) {
        log.info("Gerando relatório de contas a pagar por status: {}", status);

        try {
            List<Invoice> invoices = invoiceService.findByStatus(status);

            Map<String, Object> reportData = prepareReportData(invoices, null, null);
            reportData.put("reportTitle", "Relatório de Contas " + getStatusDisplayName(status));

            String report = reportTemplateService.generateFullReport("contas-a-pagar", reportData);

            log.info("Relatório por status gerado com sucesso para {} contas", invoices.size());
            return report;

        } catch (Exception e) {
            log.error("Erro ao gerar relatório por status: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar por status com layout padrão
     */
    @Transactional(readOnly = true)
    public byte[] generateContasAPagarReportPDFByStatus(ExpenseStatus status) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar por status: {} com layout padrão", status);

        try {
            List<Invoice> invoices = invoiceService.findByStatus(status);
            log.info("Dados obtidos: {} contas a pagar", invoices.size());

            return generateContasAPagarReportPDFWithIText(invoices, null, null, status, null);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de contas a pagar por status", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório de contas a pagar por tipo
     */
    public String generateContasAPagarReportByType(ExpenseType type) {
        log.info("Gerando relatório de contas a pagar por tipo: {}", type);

        try {
            List<Invoice> invoices = invoiceService.findByType(type);

            Map<String, Object> reportData = prepareReportData(invoices, null, null);
            reportData.put("reportTitle", "Relatório de " + getTypeDisplayName(type));

            String report = reportTemplateService.generateFullReport("contas-a-pagar", reportData);

            log.info("Relatório por tipo gerado com sucesso para {} contas", invoices.size());
            return report;

        } catch (Exception e) {
            log.error("Erro ao gerar relatório por tipo: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar por tipo com layout padrão
     */
    public byte[] generateContasAPagarReportPDFByType(ExpenseType type) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar por tipo: {} com layout padrão", type);

        try {
            List<Invoice> invoices = invoiceService.findByType(type);
            log.info("Dados obtidos: {} contas a pagar", invoices.size());

            return generateContasAPagarReportPDFWithIText(invoices, null, null, null, type);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de contas a pagar por tipo", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório resumido de contas a pagar
     */
    public String generateContasAPagarSummaryReport() {
        log.info("Gerando relatório resumido de contas a pagar");

        try {
            List<Invoice> allInvoices = invoiceService.findAll();

            Map<String, Object> reportData = prepareSummaryData(allInvoices);

            String report = reportTemplateService.generateFullReport("contas-a-pagar", reportData);

            log.info("Relatório resumido gerado com sucesso");
            return report;

        } catch (Exception e) {
            log.error("Erro ao gerar relatório resumido: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF resumido de contas a pagar com layout padrão
     */
    public byte[] generateContasAPagarSummaryReportPDF() throws IOException {
        log.info("Gerando relatório PDF resumido de contas a pagar com layout padrão");

        try {
            List<Invoice> allInvoices = invoiceService.findAll();
            log.info("Dados obtidos: {} contas a pagar", allInvoices.size());

            return generateContasAPagarReportPDFWithITextResumo(allInvoices);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF resumido de contas a pagar", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF resumido de contas a pagar usando iText com layout padrão
     */
    private byte[] generateContasAPagarReportPDFWithITextResumo(List<Invoice> invoices) throws IOException {
        log.info("Gerando relatório PDF resumido de contas a pagar com iText - {} contas", invoices.size());

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
                throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório. " +
                        "Nenhuma empresa cadastrada no sistema. Por favor, cadastre pelo menos uma empresa.");
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            // Criar documento com layout padrão - título para relatório resumido
            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO RESUMO - CONTAS A PAGAR")
                    .landscape(true)
                    .topMargin(120f) // Espaço para cabeçalho
                    .bottomMargin(80f) // Espaço para rodapé
                    .leftMargin(30f)
                    .rightMargin(30f)
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
            BigDecimal totalAmount = invoices.stream()
                    .map(Invoice::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long contasAbertas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE)
                    .count();
            long contasPagas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PAGA)
                    .count();
            long contasVencidas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE &&
                            i.getDueDate() != null &&
                            i.getDueDate().isBefore(LocalDate.now()))
                    .count();

            Paragraph stats = new Paragraph(String.format(
                    "Total de contas: %d | Abertas: %d | Pagas: %d | Vencidas: %d | Valor Total: R$ %s",
                    invoices.size(), contasAbertas, contasPagas, contasVencidas,
                    totalAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")))
                    .setFontSize(11)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            // Tabela de contas
            if (invoices.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma conta a pagar encontrada.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(new float[]{9f, 15f, 20f, 13f, 12f, 7f, 9f, 9f, 6f}).useAllAvailableWidth();

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Vencimento"));
                table.addHeaderCell(createHeaderCell("Fornecedor"));
                table.addHeaderCell(createHeaderCell("Descrição"));
                table.addHeaderCell(createHeaderCell("Unidade / Setor"));
                table.addHeaderCell(createHeaderCell("Conta"));
                table.addHeaderCell(createHeaderCell("Tipo"));
                table.addHeaderCell(createHeaderCell("Valor"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Empresa"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Invoice invoice : invoices) {
                    table.addCell(
                            createCell(invoice.getDueDate() != null ? invoice.getDueDate().format(dateFormatter) : ""));
                    table.addCell(createCell(
                            invoice.getSupplier() != null ? invoice.getSupplier().getName() : "Não informado"));

                    // Descrição (truncar se muito longa)
                    String desc = invoice.getDescription() != null ? invoice.getDescription() : "";
                    if (desc.length() > 40) {
                        desc = desc.substring(0, 37) + "...";
                    }
                    table.addCell(createCell(desc));

                    table.addCell(createCell(getContaPlanoDeContas(invoice)));

                    table.addCell(createCell(getTypeDisplayName(invoice.getType())));
                    table.addCell(
                            createCell(
                                    invoice.getAmount() != null
                                            ? "R$ " + invoice.getAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                                                    .toString().replace(".", ",")
                                            : ""));
                    table.addCell(createCell(getStatusDisplayName(invoice.getStatus())));
                    table.addCell(createCell(
                            invoice.getCompanySigla() != null ? invoice.getCompanySigla() : "Não informado"));
                }

                document.add(table);
            }

            // Finalizar layout padrão (adiciona header/footer em todas as páginas)
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);

            document.close();

        } catch (Exception e) {
            log.error("Erro ao gerar PDF de contas a pagar: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF resumido de contas a pagar gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    /**
     * Gera relatório PDF de contas a pagar por empresa (sigla) com layout padrão
     */
    @Transactional(readOnly = true)
    public byte[] generateContasAPagarReportPDFByCompany(String companySigla,
            LocalDate startDate,
            LocalDate endDate) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar por empresa: {} com layout padrão", companySigla);

        try {
            List<Invoice> allInvoices;
            if (startDate != null && endDate != null) {
                allInvoices = invoiceService.findByDueDateBetween(startDate, endDate);
            } else {
                allInvoices = invoiceService.findAll();
            }

            // Filtrar por empresa (sigla) - se for "TODAS", não aplicar o filtro
            List<Invoice> invoices;
            if ("TODAS".equalsIgnoreCase(companySigla)) {
                invoices = allInvoices;
            } else {
                invoices = allInvoices.stream()
                        .filter(i -> i.getCompanySigla() != null && i.getCompanySigla().equalsIgnoreCase(companySigla))
                        .collect(Collectors.toList());
            }

            log.info("Dados obtidos: {} contas a pagar para empresa {}", invoices.size(), companySigla);

            return generateContasAPagarReportPDFWithITextByCompany(invoices, startDate, endDate, companySigla);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de contas a pagar por empresa", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar com layout padrão (versão com título
     * personalizado por empresa)
     */
    private byte[] generateContasAPagarReportPDFWithITextByCompany(List<Invoice> invoices,
            LocalDate startDate,
            LocalDate endDate,
            String companySigla) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar com iText - {} contas para empresa {}", invoices.size(),
                companySigla);

        // Determinar companyId baseado no companySigla
        java.util.UUID companyId = null;
        Company selectedCompany = null;

        // Se não for "TODAS", buscar a empresa específica pela sigla
        if (!"TODAS".equalsIgnoreCase(companySigla)) {
            Optional<Company> companyOpt = companyRepository.findBySigla(companySigla);
            if (companyOpt.isPresent()) {
                selectedCompany = companyOpt.get();
                companyId = selectedCompany.getId();
                log.info("Usando empresa específica: {} (ID: {}, Sigla: {})",
                        selectedCompany.getName(), companyId, companySigla);
            } else {
                log.warn("Empresa com sigla {} não encontrada. Usando empresa padrão.", companySigla);
            }
        }

        // Se for "TODAS" ou empresa não encontrada, usar primeira empresa ativa (padrão
        // Vigilância)
        if (companyId == null) {
            List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
            if (activeCompanies != null && !activeCompanies.isEmpty()) {
                selectedCompany = activeCompanies.get(0);
                companyId = selectedCompany.getId();
                log.info("Usando primeira empresa ativa (padrão): {} (ID: {})",
                        selectedCompany.getName(), companyId);
            } else {
                List<Company> allCompanies = companyRepository.findAll();
                if (allCompanies != null && !allCompanies.isEmpty()) {
                    selectedCompany = allCompanies.get(0);
                    companyId = selectedCompany.getId();
                    log.warn("Nenhuma empresa ativa encontrada. Usando primeira empresa cadastrada: {} (ID: {})",
                            selectedCompany.getName(), companyId);
                } else {
                    throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório. " +
                            "Nenhuma empresa cadastrada no sistema. Por favor, cadastre pelo menos uma empresa.");
                }
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            // Criar documento com layout padrão - título personalizado para relatório por
            // empresa
            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO POR EMPRESA - CONTAS A PAGAR")
                    .landscape(true)
                    .topMargin(120f) // Espaço para cabeçalho
                    .bottomMargin(80f) // Espaço para rodapé
                    .leftMargin(30f)
                    .rightMargin(30f)
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

            // Informação da empresa filtrada
            Paragraph companyInfo = new Paragraph("Empresa: " + companySigla)
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(10);
            document.add(companyInfo);

            // Filtros aplicados
            if (startDate != null || endDate != null) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);

                if (startDate != null && endDate != null) {
                    document.add(
                            new Paragraph("Período: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                                    " a " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10)
                                    .setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Estatísticas
            BigDecimal totalAmount = invoices.stream()
                    .map(Invoice::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long contasAbertas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE)
                    .count();
            long contasPagas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PAGA)
                    .count();
            long contasVencidas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE &&
                            i.getDueDate() != null &&
                            i.getDueDate().isBefore(LocalDate.now()))
                    .count();

            Paragraph stats = new Paragraph(String.format(
                    "Total de contas: %d | Abertas: %d | Pagas: %d | Vencidas: %d | Valor Total: R$ %s",
                    invoices.size(), contasAbertas, contasPagas, contasVencidas,
                    totalAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            // Tabela de contas
            if (invoices.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma conta a pagar encontrada com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(8).setWidth(UnitValue.createPercentValue(100));

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Vencimento"));
                table.addHeaderCell(createHeaderCell("Fornecedor"));
                table.addHeaderCell(createHeaderCell("Descrição"));
                table.addHeaderCell(createHeaderCell("Conta"));
                table.addHeaderCell(createHeaderCell("Tipo"));
                table.addHeaderCell(createHeaderCell("Valor"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Empresa"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Invoice invoice : invoices) {
                    table.addCell(
                            createCell(invoice.getDueDate() != null ? invoice.getDueDate().format(dateFormatter) : ""));

                    // Em rescisão de funcionários exibe o funcionário; nas demais, o fornecedor
                    table.addCell(createCell(getFornecedorOuFuncionario(invoice)));

                    // Descrição (truncar se muito longa)
                    String desc = invoice.getDescription() != null ? invoice.getDescription() : "";
                    if (desc.length() > 40) {
                        desc = desc.substring(0, 37) + "...";
                    }
                    table.addCell(createCell(desc));

                    table.addCell(createCell(getContaPlanoDeContas(invoice)));

                    table.addCell(createCell(getTypeDisplayName(invoice.getType())));
                    table.addCell(
                            createCell(
                                    invoice.getAmount() != null
                                            ? "R$ " + invoice.getAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                                                    .toString().replace(".", ",")
                                            : ""));
                    table.addCell(createCell(getStatusDisplayName(invoice.getStatus())));
                    table.addCell(createCell(
                            invoice.getCompanySigla() != null ? invoice.getCompanySigla() : "Não informado"));
                }

                document.add(table);
            }

            // Finalizar layout padrão (adiciona header/footer em todas as páginas)
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);

            document.close();

        } catch (Exception e) {
            log.error("Erro ao gerar PDF de contas a pagar: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de contas a pagar gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    /**
     * Gera relatório PDF de contas a pagar com layout padrão
     */
    @Transactional(readOnly = true)
    public byte[] generateContasAPagarReportPDF(LocalDate startDate, LocalDate endDate,
            ExpenseStatus statusFilter, ExpenseType typeFilter) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar com layout padrão - Período: {} a {}, Status: {}, Tipo: {}",
                startDate, endDate, statusFilter, typeFilter);

        try {
            // Buscar dados com filtros
            List<Invoice> invoices;
            if (startDate != null && endDate != null) {
                log.info("🔍 DEBUG: Buscando faturas com dueDate entre {} e {}", startDate, endDate);
                invoices = invoiceService.findByDueDateBetween(startDate, endDate);
                log.info("🔍 DEBUG: Encontradas {} faturas no período", invoices.size());

                // Debug: Mostrar todas as faturas para comparação
                List<Invoice> allInvoices = invoiceService.findAll();
                log.info("🔍 DEBUG: Total de faturas no sistema: {}", allInvoices.size());
                if (!allInvoices.isEmpty()) {
                    log.info("🔍 DEBUG: Primeiras 5 faturas (dueDate):");
                    allInvoices.stream().limit(5).forEach(inv -> log.info("  - ID: {}, DueDate: {}, Description: {}",
                            inv.getId(), inv.getDueDate(), inv.getDescription()));
                }
            } else {
                invoices = invoiceService.findAll();
            }

            // Aplicar filtros adicionais
            if (statusFilter != null) {
                invoices = invoices.stream()
                        .filter(i -> i.getStatus() == statusFilter)
                        .collect(Collectors.toList());
            }

            if (typeFilter != null) {
                invoices = invoices.stream()
                        .filter(i -> i.getType() == typeFilter)
                        .collect(Collectors.toList());
            }

            log.info("Dados obtidos: {} contas a pagar", invoices.size());

            return generateContasAPagarReportPDFWithIText(invoices, startDate, endDate, statusFilter, typeFilter);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de contas a pagar", e);
            throw new IOException("Erro ao gerar relatório de contas a pagar: " + e.getMessage(), e);
        }
    }

    /**
     * Gera relatório PDF de contas a pagar usando iText com layout padrão
     */
    private byte[] generateContasAPagarReportPDFWithIText(List<Invoice> invoices,
            LocalDate startDate,
            LocalDate endDate,
            ExpenseStatus statusFilter,
            ExpenseType typeFilter) throws IOException {
        log.info("Gerando relatório PDF de contas a pagar com iText - {} contas", invoices.size());

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
                throw new ResourceNotFoundException("Não foi possível determinar a empresa para o relatório. " +
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
                    .reportTitle("RELATÓRIO DE CONTAS A PAGAR")
                    .landscape(true)
                    .topMargin(120f) // Espaço para cabeçalho
                    .bottomMargin(80f) // Espaço para rodapé
                    .leftMargin(30f)
                    .rightMargin(30f)
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
            if (startDate != null || endDate != null || statusFilter != null || typeFilter != null) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);

                if (startDate != null && endDate != null) {
                    document.add(
                            new Paragraph("Período: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                                    " a " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10)
                                    .setMarginBottom(2));
                }
                if (statusFilter != null) {
                    document.add(new Paragraph("Status: " + getStatusDisplayName(statusFilter)).setFontSize(10)
                            .setMarginBottom(2));
                }
                if (typeFilter != null) {
                    document.add(new Paragraph("Tipo: " + getTypeDisplayName(typeFilter)).setFontSize(10)
                            .setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Estatísticas
            BigDecimal totalAmount = invoices.stream()
                    .map(Invoice::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long contasAbertas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE)
                    .count();
            long contasPagas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PAGA)
                    .count();
            long contasVencidas = invoices.stream()
                    .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE &&
                            i.getDueDate() != null &&
                            i.getDueDate().isBefore(LocalDate.now()))
                    .count();

            Paragraph stats = new Paragraph(String.format(
                    "Total de contas: %d | Abertas: %d | Pagas: %d | Vencidas: %d | Valor Total: R$ %s",
                    invoices.size(), contasAbertas, contasPagas, contasVencidas,
                    totalAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            // Tabela de contas
            if (invoices.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma conta a pagar encontrada com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(8).setWidth(UnitValue.createPercentValue(100));

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Vencimento"));
                table.addHeaderCell(createHeaderCell("Fornecedor"));
                table.addHeaderCell(createHeaderCell("Descrição"));
                table.addHeaderCell(createHeaderCell("Conta"));
                table.addHeaderCell(createHeaderCell("Tipo"));
                table.addHeaderCell(createHeaderCell("Valor"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Empresa"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Invoice invoice : invoices) {
                    table.addCell(
                            createCell(invoice.getDueDate() != null ? invoice.getDueDate().format(dateFormatter) : ""));
                    table.addCell(createCell(
                            invoice.getSupplier() != null ? invoice.getSupplier().getName() : "Não informado"));

                    // Descrição (truncar se muito longa)
                    String desc = invoice.getDescription() != null ? invoice.getDescription() : "";
                    if (desc.length() > 40) {
                        desc = desc.substring(0, 37) + "...";
                    }
                    table.addCell(createCell(desc));

                    table.addCell(createCell(getContaPlanoDeContas(invoice)));

                    table.addCell(createCell(getTypeDisplayName(invoice.getType())));
                    table.addCell(
                            createCell(
                                    invoice.getAmount() != null
                                            ? "R$ " + invoice.getAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                                                    .toString().replace(".", ",")
                                            : ""));
                    table.addCell(createCell(getStatusDisplayName(invoice.getStatus())));
                    table.addCell(createCell(
                            invoice.getCompanySigla() != null ? invoice.getCompanySigla() : "Não informado"));
                }

                document.add(table);
            }

            // Finalizar layout padrão (adiciona header/footer em todas as páginas)
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);

            document.close();

        } catch (Exception e) {
            log.error("Erro ao gerar PDF de contas a pagar: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de contas a pagar gerado com sucesso, tamanho: {} bytes", result.length);
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

    /**
     * Prepara dados para o template de relatório
     */
    private Map<String, Object> prepareReportData(List<Invoice> invoices, LocalDate startDate, LocalDate endDate) {
        Map<String, Object> data = new HashMap<>();

        // Dados básicos
        data.put("reportDate", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        data.put("currentDate", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        data.put("pageNumber", "1");

        if (startDate != null && endDate != null) {
            data.put("startDate", startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            data.put("endDate", endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }

        // Estatísticas
        int totalContas = invoices.size();
        BigDecimal valorTotal = invoices.stream()
                .map(Invoice::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long contasAbertas = invoices.stream()
                .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE)
                .count();

        long contasPagas = invoices.stream()
                .filter(i -> i.getStatus() == ExpenseStatus.PAGA)
                .count();

        long contasVencidas = invoices.stream()
                .filter(i -> i.getStatus() == ExpenseStatus.PENDENTE &&
                        i.getDueDate() != null &&
                        i.getDueDate().isBefore(LocalDate.now()))
                .count();

        data.put("totalContas", totalContas);
        data.put("valorTotal", formatCurrency(valorTotal));
        data.put("contasAbertas", contasAbertas);
        data.put("contasPagas", contasPagas);
        data.put("contasVencidas", contasVencidas);

        // Percentuais
        if (totalContas > 0) {
            data.put("percentualAbertas", String.format("%.1f", (contasAbertas * 100.0) / totalContas));
            data.put("percentualPagas", String.format("%.1f", (contasPagas * 100.0) / totalContas));
            data.put("percentualVencidas", String.format("%.1f", (contasVencidas * 100.0) / totalContas));
        } else {
            data.put("percentualAbertas", "0.0");
            data.put("percentualPagas", "0.0");
            data.put("percentualVencidas", "0.0");
        }

        // Dados das contas para a tabela
        List<Map<String, Object>> contasData = invoices.stream()
                .map(this::mapInvoiceToReportData)
                .collect(Collectors.toList());

        data.put("contas", contasData);

        return data;
    }

    /**
     * Prepara dados resumidos
     */
    private Map<String, Object> prepareSummaryData(List<Invoice> invoices) {
        Map<String, Object> data = prepareReportData(invoices, null, null);
        data.put("reportTitle", "Relatório Resumido de Contas a Pagar");

        // Análise por fornecedor
        Map<String, Long> contasPorFornecedor = invoices.stream()
                .filter(i -> i.getSupplier() != null)
                .collect(Collectors.groupingBy(
                        i -> i.getSupplier().getName(),
                        Collectors.counting()));

        data.put("contasPorFornecedor", contasPorFornecedor);

        return data;
    }

    /**
     * Mapeia uma invoice para dados do relatório
     */
    private Map<String, Object> mapInvoiceToReportData(Invoice invoice) {
        Map<String, Object> invoiceData = new HashMap<>();

        invoiceData.put("vencimento",
                invoice.getDueDate() != null ? invoice.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                        : "-");
        invoiceData.put("fornecedor", getFornecedorOuFuncionario(invoice));
        invoiceData.put("descricao", invoice.getDescription() != null ? invoice.getDescription() : "-");
        invoiceData.put("tipo", getTypeDisplayName(invoice.getType()));
        invoiceData.put("valor", formatCurrency(invoice.getAmount()));
        invoiceData.put("status", getStatusDisplayName(invoice.getStatus()));
        invoiceData.put("empresa", invoice.getCompanySigla() != null ? invoice.getCompanySigla() : "-");
        invoiceData.put("conta", getContaPlanoDeContas(invoice));

        return invoiceData;
    }

    /**
     * Obtém a conta do plano de contas vinculada à invoice (ex.: código - nome),
     * de forma segura contra lazy loading.
     */
    private String getContaPlanoDeContas(Invoice invoice) {
        try {
            if (invoice.getSubcategoria() != null) {
                String codigo = invoice.getSubcategoria().getCodigo();
                String nome = invoice.getSubcategoria().getNome();
                return (codigo != null ? codigo : "") + " - " + (nome != null ? nome : "");
            }
        } catch (Exception e) {
            log.warn("Erro ao acessar subcategoria da fatura {}: {}", invoice.getId(), e.getMessage());
        }
        return "Não informado";
    }

    private static final String CATEGORIA_RESCISAO_FUNCIONARIOS = "Rescisão de funcionários";

    /**
     * Em contas de rescisão de funcionários, exibe o nome do funcionário vinculado
     * em vez do fornecedor. Nas demais contas, mantém o fornecedor.
     */
    private String getFornecedorOuFuncionario(Invoice invoice) {
        try {
            if (invoice.getSubcategoria() != null
                    && invoice.getSubcategoria().getCategoriaPai() != null
                    && CATEGORIA_RESCISAO_FUNCIONARIOS.equals(invoice.getSubcategoria().getCategoriaPai().getNome())
                    && invoice.getEmployee() != null
                    && invoice.getEmployee().getName() != null
                    && !invoice.getEmployee().getName().isBlank()) {
                return invoice.getEmployee().getName();
            }
        } catch (Exception e) {
            log.warn("Erro ao acessar funcionário da fatura {}: {}", invoice.getId(), e.getMessage());
        }
        try {
            if (invoice.getSupplier() != null) {
                return invoice.getSupplier().getName();
            }
        } catch (Exception e) {
            log.warn("Erro ao acessar fornecedor da fatura {}: {}", invoice.getId(), e.getMessage());
        }
        return "Não informado";
    }

    /**
     * Formata valor monetário
     */
    private String formatCurrency(BigDecimal value) {
        if (value == null)
            return "R$ 0,00";
        return String.format("R$ %,.2f", value).replace(",", "X").replace(".", ",").replace("X", ".");
    }

    /**
     * Obtém nome de exibição do status
     */
    private String getStatusDisplayName(ExpenseStatus status) {
        if (status == null)
            return "Não definido";

        return switch (status) {
            case PENDENTE -> "Aberta";
            case PAGA -> "Paga";
            case CANCELADA -> "Cancelada";
            case ERRO -> "Erro";
            case SOLICITADA -> "Solicitada";
            case PAGA_ANTERIORMENTE -> "Paga Anteriormente";
            case PENDENTE_ERRO -> "Pendente/Erro";
        };
    }

    /**
     * Obtém nome de exibição do tipo
     */
    /**
     * Gera relatório PDF personalizado de contas a pagar com filtros dinâmicos,
     * seleção de colunas e agrupamento com subtotais por Unidade/Setor.
     */
    @Transactional(readOnly = true)
    public byte[] generateCustomContasAPagarReportPDF(com.z7design.secured_guard.dto.CustomContasAPagarReportRequestDTO req) throws IOException {
        log.info("Gerando relatório PDF personalizado de contas a pagar: {}", req);

        try {
            List<Invoice> allInvoices = invoiceService.findAll();

            // Filtragem dinâmica em memória
            List<Invoice> filtered = allInvoices.stream().filter(invoice -> {
                // Filtro por Data
                LocalDate targetDate = invoice.getDueDate();
                if ("issueDate".equalsIgnoreCase(req.getDateField())) {
                    targetDate = invoice.getIssueDate();
                } else if ("paymentDate".equalsIgnoreCase(req.getDateField())) {
                    targetDate = invoice.getPaymentDate();
                }

                if (req.getStartDate() != null && (targetDate == null || targetDate.isBefore(req.getStartDate()))) {
                    return false;
                }
                if (req.getEndDate() != null && (targetDate == null || targetDate.isAfter(req.getEndDate()))) {
                    return false;
                }

                // Filtro por Status
                if (req.getStatus() != null && invoice.getStatus() != req.getStatus()) {
                    return false;
                }

                // Filtro por Tipo
                if (req.getType() != null && invoice.getType() != req.getType()) {
                    return false;
                }

                // Filtro por Fornecedor
                if (req.getSupplierId() != null) {
                    if (invoice.getSupplier() == null || !req.getSupplierId().equals(invoice.getSupplier().getId())) {
                        return false;
                    }
                }

                // Filtro por Unidade
                if (req.getUnitId() != null) {
                    if (invoice.getUnit() == null || !req.getUnitId().equals(invoice.getUnit().getId())) {
                        return false;
                    }
                }

                // Filtro por Setor de Trabalho
                if (req.getWorkSector() != null && !req.getWorkSector().isBlank()) {
                    if (invoice.getWorkSector() == null || !invoice.getWorkSector().toLowerCase().contains(req.getWorkSector().trim().toLowerCase())) {
                        return false;
                    }
                }

                // Filtro por Empresa (Sigla)
                if (req.getCompanySigla() != null && !req.getCompanySigla().isBlank() && !"TODAS".equalsIgnoreCase(req.getCompanySigla())) {
                    if (invoice.getCompanySigla() == null || !invoice.getCompanySigla().equalsIgnoreCase(req.getCompanySigla().trim())) {
                        return false;
                    }
                }

                // Filtro por Subcategoria / Plano de Contas
                if (req.getSubcategoriaId() != null) {
                    if (invoice.getSubcategoria() == null || !req.getSubcategoriaId().equals(invoice.getSubcategoria().getId())) {
                        return false;
                    }
                }

                // Filtro por Funcionário
                if (req.getEmployeeId() != null) {
                    if (invoice.getEmployee() == null || !req.getEmployeeId().equals(invoice.getEmployee().getId())) {
                        return false;
                    }
                }

                return true;
            }).sorted((a, b) -> {
                // Ordenar por Unidade, Setor e Data de Vencimento
                String uA = a.getUnit() != null && a.getUnit().getName() != null ? a.getUnit().getName() : "";
                String uB = b.getUnit() != null && b.getUnit().getName() != null ? b.getUnit().getName() : "";
                int cmpUnit = uA.compareToIgnoreCase(uB);
                if (cmpUnit != 0) return cmpUnit;

                String sA = a.getWorkSector() != null ? a.getWorkSector() : "";
                String sB = b.getWorkSector() != null ? b.getWorkSector() : "";
                int cmpSector = sA.compareToIgnoreCase(sB);
                if (cmpSector != 0) return cmpSector;

                LocalDate dA = a.getDueDate() != null ? a.getDueDate() : LocalDate.MIN;
                LocalDate dB = b.getDueDate() != null ? b.getDueDate() : LocalDate.MIN;
                return dA.compareTo(dB);
            }).collect(Collectors.toList());

            log.info("Contas filtradas para o relatório personalizado: {} de {}", filtered.size(), allInvoices.size());

            return generateCustomPdfDocument(filtered, req);

        } catch (Exception e) {
            log.error("Erro ao gerar PDF personalizado de contas a pagar: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF personalizado: " + e.getMessage(), e);
        }
    }

    private byte[] generateCustomPdfDocument(List<Invoice> invoices, com.z7design.secured_guard.dto.CustomContasAPagarReportRequestDTO req) throws IOException {
        java.util.UUID companyId = null;
        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            companyId = activeCompanies.get(0).getId();
        } else {
            List<Company> allCompanies = companyRepository.findAll();
            if (allCompanies != null && !allCompanies.isEmpty()) {
                companyId = allCompanies.get(0).getId();
            } else {
                throw new ResourceNotFoundException("Nenhuma empresa cadastrada para gerar o cabeçalho do relatório.");
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO PERSONALIZADO - CONTAS A PAGAR")
                    .landscape(true)
                    .topMargin(120f)
                    .bottomMargin(80f)
                    .leftMargin(30f)
                    .rightMargin(30f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Informações do filtro aplicado
            StringBuilder filtrosText = new StringBuilder("Filtros: ");
            if (req.getStartDate() != null && req.getEndDate() != null) {
                filtrosText.append("Período: ").append(req.getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                        .append(" a ").append(req.getEndDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append(" | ");
            }
            if (req.getStatus() != null) {
                filtrosText.append("Status: ").append(getStatusDisplayName(req.getStatus())).append(" | ");
            }
            if (req.getType() != null) {
                filtrosText.append("Tipo: ").append(getTypeDisplayName(req.getType())).append(" | ");
            }
            if (req.getCompanySigla() != null && !req.getCompanySigla().isBlank()) {
                filtrosText.append("Empresa: ").append(req.getCompanySigla()).append(" | ");
            }
            if (req.getWorkSector() != null && !req.getWorkSector().isBlank()) {
                filtrosText.append("Setor: ").append(req.getWorkSector()).append(" | ");
            }

            Paragraph filterInfo = new Paragraph(filtrosText.toString().replaceAll(" \\| $", ""))
                    .setFontSize(9)
                    .setItalic()
                    .setMarginBottom(8);
            document.add(filterInfo);

            // Estatísticas gerais
            BigDecimal totalGeral = invoices.stream()
                    .map(Invoice::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Paragraph statsInfo = new Paragraph(String.format(
                    "Total de Registros: %d | Valor Total: %s",
                    invoices.size(), formatCurrency(totalGeral)))
                    .setFontSize(11)
                    .setBold()
                    .setMarginBottom(12);
            document.add(statsInfo);

            // Definição de colunas solicitadas
            List<String> cols = req.getSelectedColumns();
            if (cols == null || cols.isEmpty()) {
                cols = Arrays.asList("dueDate", "description", "supplier", "unit", "workSector", "category", "amount", "status");
            }

            if (invoices.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma conta encontrada com os filtros selecionados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(11)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                String groupMode = req.getGroupBy() != null ? req.getGroupBy().toUpperCase() : "UNIT_SECTOR";

                if (!"NONE".equals(groupMode)) {
                    Map<String, List<Invoice>> grouped;
                    switch (groupMode) {
                        case "WORK_SECTOR", "SETOR" -> {
                            grouped = invoices.stream().collect(
                                    Collectors.groupingBy(i -> {
                                        String s = i.getWorkSector() != null && !i.getWorkSector().isBlank() ? i.getWorkSector() : "Geral / Não especificado";
                                        return "🏷️ SETOR DE TRABALHO: " + s.toUpperCase();
                                    }, LinkedHashMap::new, Collectors.toList())
                            );
                        }
                        case "UNIT", "UNIDADE" -> {
                            grouped = invoices.stream().collect(
                                    Collectors.groupingBy(i -> {
                                        String u = i.getUnit() != null && i.getUnit().getName() != null ? i.getUnit().getName() : "Sem Unidade";
                                        return "🏢 UNIDADE: " + u.toUpperCase();
                                    }, LinkedHashMap::new, Collectors.toList())
                            );
                        }
                        case "COMPANY", "EMPRESA" -> {
                            grouped = invoices.stream().collect(
                                    Collectors.groupingBy(i -> {
                                        String c = i.getCompanySigla() != null && !i.getCompanySigla().isBlank() ? i.getCompanySigla() : "Sem Empresa";
                                        return "🏢 EMPRESA: " + c.toUpperCase();
                                    }, LinkedHashMap::new, Collectors.toList())
                            );
                        }
                        case "PERIOD", "PERIODO" -> {
                            grouped = invoices.stream().collect(
                                    Collectors.groupingBy(i -> {
                                        LocalDate dt = "issueDate".equalsIgnoreCase(req.getDateField()) ? i.getIssueDate()
                                                : ("paymentDate".equalsIgnoreCase(req.getDateField()) ? i.getPaymentDate() : i.getDueDate());
                                        if (dt == null) return "📅 PERÍODO: NÃO ESPECIFICADO";
                                        return "📅 PERÍODO: " + dt.format(DateTimeFormatter.ofPattern("MM/yyyy"));
                                    }, LinkedHashMap::new, Collectors.toList())
                            );
                        }
                        case "STATUS" -> {
                            grouped = invoices.stream().collect(
                                    Collectors.groupingBy(i -> {
                                        return "📊 STATUS: " + getStatusDisplayName(i.getStatus()).toUpperCase();
                                    }, LinkedHashMap::new, Collectors.toList())
                            );
                        }
                        case "SUPPLIER", "FORNECEDOR" -> {
                            grouped = invoices.stream().collect(
                                    Collectors.groupingBy(i -> {
                                        return "👤 FORNECEDOR / BENEFICIÁRIO: " + getFornecedorOuFuncionario(i).toUpperCase();
                                    }, LinkedHashMap::new, Collectors.toList())
                            );
                        }
                        default -> {
                            grouped = invoices.stream().collect(
                                    Collectors.groupingBy(i -> {
                                        String u = i.getUnit() != null && i.getUnit().getName() != null ? i.getUnit().getName() : "Sem Unidade";
                                        String s = i.getWorkSector() != null && !i.getWorkSector().isBlank() ? i.getWorkSector() : "Geral / Não especificado";
                                        return "🏢 UNIDADE: " + u.toUpperCase() + "   |   🏷️ SETOR: " + s.toUpperCase();
                                    }, LinkedHashMap::new, Collectors.toList())
                            );
                        }
                    }

                    for (Map.Entry<String, List<Invoice>> entry : grouped.entrySet()) {
                        String groupHeader = entry.getKey();
                        List<Invoice> groupInvoices = entry.getValue();

                        // Header do grupo
                        Paragraph groupTitle = new Paragraph(groupHeader)
                                .setFontSize(10)
                                .setBold()
                                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(235, 240, 248))
                                .setPadding(4)
                                .setMarginTop(8)
                                .setMarginBottom(4);
                        document.add(groupTitle);

                        // Tabela do grupo
                        Table table = createCustomTable(cols, groupInvoices);
                        document.add(table);

                        // Subtotal do grupo
                        BigDecimal subtotal = groupInvoices.stream()
                                .map(Invoice::getAmount)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                        Paragraph subtotalPara = new Paragraph(String.format(
                                "Subtotal (%d conta%s): %s",
                                groupInvoices.size(),
                                groupInvoices.size() > 1 ? "s" : "",
                                formatCurrency(subtotal)))
                                .setFontSize(9)
                                .setBold()
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginBottom(10);
                        document.add(subtotalPara);
                    }
                } else {
                    // Sem agrupamento
                    Table table = createCustomTable(cols, invoices);
                    document.add(table);
                }

                // Totalizador Final
                Paragraph finalTotal = new Paragraph("TOTAL GERAL: " + formatCurrency(totalGeral) + " (" + invoices.size() + " contas)")
                        .setFontSize(12)
                        .setBold()
                        .setTextAlignment(TextAlignment.RIGHT)
                        .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(225, 235, 245))
                        .setPadding(6)
                        .setMarginTop(12);
                document.add(finalTotal);
            }

            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();

        } catch (Exception e) {
            log.error("Erro ao montar PDF customizado: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    private Table createCustomTable(List<String> cols, List<Invoice> groupInvoices) {
        float[] colWidths = new float[cols.size()];
        for (int i = 0; i < cols.size(); i++) {
            colWidths[i] = getColumnProportionalWidth(cols.get(i));
        }
        Table table = new Table(UnitValue.createPercentArray(colWidths)).useAllAvailableWidth();
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        // Headers
        for (String col : cols) {
            table.addHeaderCell(createHeaderCell(getColumnHeaderLabel(col)));
        }

        // Rows
        for (Invoice inv : groupInvoices) {
            for (String col : cols) {
                table.addCell(createCell(getColumnValue(col, inv, dateFormatter)));
            }
        }

        return table;
    }

    private float getColumnProportionalWidth(String colKey) {
        return switch (colKey) {
            case "dueDate", "vencimento", "issueDate", "dataEmissao", "paymentDate", "dataPagamento" -> 9f;
            case "description", "descricao" -> 22f;
            case "supplier", "fornecedor" -> 16f;
            case "company", "empresa", "companySigla" -> 7f;
            case "unit", "unidade" -> 11f;
            case "workSector", "setor", "setorTrabalho" -> 13f;
            case "category", "categoria", "conta" -> 12f;
            case "centroCusto" -> 10f;
            case "type", "tipo" -> 8f;
            case "amount", "valor" -> 10f;
            case "status" -> 9f;
            case "barcode", "codigoBarras" -> 14f;
            case "observations", "observacoes" -> 14f;
            default -> 10f;
        };
    }

    private String getColumnHeaderLabel(String colKey) {
        return switch (colKey) {
            case "dueDate", "vencimento" -> "Vencimento";
            case "issueDate", "dataEmissao" -> "Emissão";
            case "paymentDate", "dataPagamento" -> "Pagamento";
            case "description", "descricao" -> "Descrição";
            case "supplier", "fornecedor" -> "Fornecedor / Beneficiário";
            case "company", "empresa", "companySigla" -> "Empresa";
            case "unit", "unidade" -> "Unidade";
            case "workSector", "setor", "setorTrabalho" -> "Setor";
            case "category", "categoria", "conta" -> "Conta / Categoria";
            case "centroCusto" -> "Centro Custo";
            case "type", "tipo" -> "Tipo";
            case "amount", "valor" -> "Valor (R$)";
            case "status" -> "Status";
            case "barcode", "codigoBarras" -> "Cód. Barras";
            case "observations", "observacoes" -> "Observações";
            default -> colKey;
        };
    }

    private String getColumnValue(String colKey, Invoice inv, DateTimeFormatter dateFormatter) {
        return switch (colKey) {
            case "dueDate", "vencimento" -> inv.getDueDate() != null ? inv.getDueDate().format(dateFormatter) : "-";
            case "issueDate", "dataEmissao" -> inv.getIssueDate() != null ? inv.getIssueDate().format(dateFormatter) : "-";
            case "paymentDate", "dataPagamento" -> inv.getPaymentDate() != null ? inv.getPaymentDate().format(dateFormatter) : "-";
            case "description", "descricao" -> {
                String d = inv.getDescription() != null ? inv.getDescription() : "";
                yield d.length() > 65 ? d.substring(0, 62) + "..." : d;
            }
            case "supplier", "fornecedor" -> getFornecedorOuFuncionario(inv);
            case "company", "empresa", "companySigla" -> inv.getCompanySigla() != null ? inv.getCompanySigla() : "-";
            case "unit", "unidade" -> inv.getUnit() != null && inv.getUnit().getName() != null ? inv.getUnit().getName() : "-";
            case "workSector", "setor", "setorTrabalho" -> inv.getWorkSector() != null && !inv.getWorkSector().isBlank() ? inv.getWorkSector() : "-";
            case "category", "categoria", "conta" -> getContaPlanoDeContas(inv);
            case "centroCusto" -> inv.getCentroCusto() != null ? inv.getCentroCusto() : "-";
            case "type", "tipo" -> getTypeDisplayName(inv.getType());
            case "amount", "valor" -> inv.getAmount() != null ? formatCurrency(inv.getAmount()) : "R$ 0,00";
            case "status" -> getStatusDisplayName(inv.getStatus());
            case "barcode", "codigoBarras" -> inv.getBarcode() != null ? inv.getBarcode() : "-";
            case "observations", "observacoes" -> inv.getNotes() != null && !inv.getNotes().isBlank() ? inv.getNotes() : "-";
            default -> "-";
        };
    }

    /**
     * Obtém nome de exibição do tipo
     */
    private String getTypeDisplayName(ExpenseType type) {
        if (type == null)
            return "Não definido";

        return switch (type) {
            case FIXA -> "Fixa";
            case VARIAVEL -> "Variável";
        };
    }
}

