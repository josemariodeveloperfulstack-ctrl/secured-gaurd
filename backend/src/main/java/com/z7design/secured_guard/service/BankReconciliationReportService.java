package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.BankTransaction;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.repository.BankFileRepository;
import com.z7design.secured_guard.repository.BankTransactionRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankReconciliationReportService {

    private final BankTransactionRepository bankTransactionRepository;
    private final BankFileRepository bankFileRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public byte[] generateBankReconciliationReportPDF(UUID fileId, String statusFilter) throws IOException {
        log.info("Gerando relatório PDF de conciliação bancária (iText) - Arquivo: {}, Filtro: {}", fileId,
                statusFilter);

        try {
            // Buscar transações com filtro
            List<BankTransaction> transactions = getTransactionsFiltered(fileId, statusFilter);
            log.info("Dados obtidos: {} transações", transactions.size());

            // Buscar arquivo para infos do cabeçalho
            String bankName = "Todos os bancos";
            String period = "Todos os períodos";
            String accountNumber = "Todas as contas";

            if (fileId != null) {
                var fileOpt = bankFileRepository.findById(fileId);
                if (fileOpt.isPresent()) {
                    var file = fileOpt.get();
                    bankName = file.getBankName();
                    period = file.getPeriod();
                    accountNumber = file.getAccountNumber();
                }
            }

            return generateReportInternal(transactions, "RELATÓRIO DE CONCILIAÇÃO BANCÁRIA",
                    bankName, period, accountNumber, statusFilter);

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de conciliação bancária", e);
            throw new IOException("Erro ao gerar relatório PDF de conciliação bancária: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateBankReconciliationSummaryReportPDF(LocalDate startDate, LocalDate endDate, String bankName)
            throws IOException {
        log.info("Gerando relatório PDF de resumo de conciliação (iText) - Período: {} a {}, Banco: {}",
                startDate, endDate, bankName);

        try {
            // Buscar dados para resumo
            List<BankTransaction> transactions = getTransactionsForSummary(startDate, endDate, bankName);
            log.info("Dados obtidos para resumo: {} transações", transactions.size());

            String periodStr = (startDate != null ? startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    : "Início") +
                    " a " + (endDate != null ? endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Fim");

            return generateReportInternal(transactions, "RESUMO DE CONCILIAÇÃO BANCÁRIA",
                    bankName != null ? bankName : "Todos os bancos", periodStr, null, "ALL");

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de resumo de conciliação bancária", e);
            throw new IOException("Erro ao gerar relatório PDF de resumo de conciliação bancária: " + e.getMessage(),
                    e);
        }
    }

    private byte[] generateReportInternal(List<BankTransaction> transactions, String title,
            String bankName, String period, String accountNumber, String statusFilter) throws IOException {

        // Determinar companyId - usar primeira empresa ativa como fallback
        java.util.UUID companyId = null;
        List<Company> activeCompaniesList = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompaniesList != null && !activeCompaniesList.isEmpty()) {
            companyId = activeCompaniesList.get(0).getId();
        } else {
            List<Company> allCompanies = companyRepository.findAll();
            if (allCompanies != null && !allCompanies.isEmpty()) {
                companyId = allCompanies.get(0).getId();
            } else {
                throw new ResourceNotFoundException("Nenhuma empresa cadastrada no sistema.");
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;

        try {
            PdfWriter writer = new PdfWriter(baos);

            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle(title)
                    .topMargin(130f) // Margem para cabeçalho
                    .bottomMargin(80f)
                    .leftMargin(40f)
                    .rightMargin(40f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Informações do Relatório
            Paragraph reportInfo = new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) + "\n" +
                            "Banco: " + bankName + "\n" +
                            "Período: " + period + "\n" +
                            (accountNumber != null ? "Conta: " + accountNumber + "\n" : "") +
                            "Filtro: " + (statusFilter != null ? statusFilter : "Todos"))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(9)
                    .setMarginBottom(15);
            document.add(reportInfo);

            // Estatísticas
            long matchedCount = transactions.stream()
                    .filter(t -> t.getStatus() == BankTransaction.ReconciliationStatus.MATCHED).count();
            long unmatchedCount = transactions.stream()
                    .filter(t -> t.getStatus() == BankTransaction.ReconciliationStatus.UNMATCHED).count();
            long pendingCount = transactions.stream()
                    .filter(t -> t.getStatus() == BankTransaction.ReconciliationStatus.PENDING).count();

            BigDecimal totalCredit = transactions.stream()
                    .filter(t -> t.getAmount().compareTo(BigDecimal.ZERO) >= 0)
                    .map(BankTransaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalDebit = transactions.stream()
                    .filter(t -> t.getAmount().compareTo(BigDecimal.ZERO) < 0)
                    .map(BankTransaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Paragraph stats = new Paragraph(String.format(
                    "Total Transações: %d | Conciliadas: %d | Não Conciliadas: %d | Pendentes: %d\n" +
                            "Total Créditos: R$ %s | Total Débitos: R$ %s",
                    transactions.size(), matchedCount, unmatchedCount, pendingCount,
                    totalCredit.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ","),
                    totalDebit.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")))
                    .setFontSize(10)
                    .setBold()
                    .setMarginBottom(15)
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY, 0.5f)
                    .setPadding(5);
            document.add(stats);

            // Tabela de Transações
            if (transactions.isEmpty()) {
                document.add(new Paragraph("Nenhuma transação encontrada com os filtros atuais.")
                        .setTextAlignment(TextAlignment.CENTER).setMarginTop(20));
            } else {
                Table table = new Table(UnitValue.createPercentArray(new float[] { 15, 30, 40, 15 }))
                        .setWidth(UnitValue.createPercentValue(100));

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Data"));
                table.addHeaderCell(createHeaderCell("Valor"));
                table.addHeaderCell(createHeaderCell("Descrição"));
                table.addHeaderCell(createHeaderCell("Status"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (BankTransaction t : transactions) {
                    table.addCell(createCell(
                            t.getTransactionDate() != null ? t.getTransactionDate().format(dateFormatter) : ""));

                    String valorStr = "R$ "
                            + t.getAmount().setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",");
                    Cell valorCell = createCell(valorStr);
                    if (t.getAmount().compareTo(BigDecimal.ZERO) < 0) {
                        valorCell.setFontColor(ColorConstants.RED);
                    } else {
                        valorCell.setFontColor(ColorConstants.GREEN);
                    }
                    table.addCell(valorCell);

                    table.addCell(createCell(t.getDescription() != null ? t.getDescription() : ""));

                    String statusLabel = switch (t.getStatus()) {
                        case MATCHED -> "Conciliado";
                        case UNMATCHED -> "Não Conciliado";
                        case PENDING -> "Pendente";
                        default -> t.getStatus().toString();
                    };
                    table.addCell(createCell(statusLabel));
                }
                document.add(table);
            }

            // standardReportLayoutService.finalizeDocumentLayout(docWithPdf); //
            // Deprecated/Removed
            document.close();

        } catch (Exception e) {
            log.error("Erro ao gerar PDF iText: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private Cell createHeaderCell(String text) {
        return new Cell().add(new Paragraph(text).setBold().setFontSize(9))
                .setBackgroundColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER);
    }

    private Cell createCell(String text) {
        return new Cell().add(new Paragraph(text != null ? text : "").setFontSize(8))
                .setTextAlignment(TextAlignment.LEFT);
    }

    private List<BankTransaction> getTransactionsFiltered(UUID fileId, String statusFilter) {
        if (fileId != null) {
            if (statusFilter != null && !statusFilter.isEmpty() && !statusFilter.equals("ALL")) {
                BankTransaction.ReconciliationStatus status = BankTransaction.ReconciliationStatus
                        .valueOf(statusFilter);
                return bankTransactionRepository.findByBankFileIdAndStatus(fileId, status);
            } else {
                return bankTransactionRepository.findByBankFileId(fileId);
            }
        } else {
            if (statusFilter != null && !statusFilter.isEmpty() && !statusFilter.equals("ALL")) {
                BankTransaction.ReconciliationStatus status = BankTransaction.ReconciliationStatus
                        .valueOf(statusFilter);
                return bankTransactionRepository.findByStatus(status);
            } else {
                return bankTransactionRepository.findAll();
            }
        }
    }

    private List<BankTransaction> getTransactionsForSummary(LocalDate startDate, LocalDate endDate, String bankName) {
        // Implementação simplificada: filtro por data se datas presentes, senão todos
        // Em um cenário real, filtraria também por bankName se necessário e se houver
        // relacionamento
        List<BankTransaction> all = bankTransactionRepository.findAll();

        return all.stream()
                .filter(t -> startDate == null || !t.getTransactionDate().isBefore(startDate))
                .filter(t -> endDate == null || !t.getTransactionDate().isAfter(endDate))
                .collect(Collectors.toList());
    }
}
