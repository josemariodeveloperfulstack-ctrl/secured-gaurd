package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.model.UnifiedDocument;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.UnifiedDocumentRepository;
import com.z7design.secured_guard.service.UnifiedDocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Worker responsável por fazer matching e unificação de holerites e comprovantes
 * já processados e salvos nas tabelas payslips e payment_receipts.
 * 
 * Este worker roda periodicamente e faz matching entre documentos já processados.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UnificationWorker {
    
    private final PayslipRepository payslipRepository;
    private final PaymentReceiptRepository paymentReceiptRepository;
    private final UnifiedDocumentRepository unifiedDocumentRepository;
    private final UnifiedDocumentService unifiedDocumentService;
    private final JaroWinklerSimilarity jaroWinkler = new JaroWinklerSimilarity();
    
    private static final double SIMILARITY_THRESHOLD = 0.85;
    
    /**
     * Processa unificação periodicamente (a cada 5 minutos)
     * Busca holerites e comprovantes não unificados e tenta fazer matching
     */
    @Scheduled(fixedDelay = 300000) // 5 minutos
    @Transactional
    public void processUnification() {
        try {
            log.info("🔄 UnificationWorker: Iniciando processo de unificação...");
            
            // Buscar holerites que ainda não foram unificados
            List<Payslip> ununifiedPayslips = payslipRepository.findAll().stream()
                .filter(p -> !isUnified(p))
                .toList();
            
            log.info("📊 UnificationWorker: Encontrados {} holerites não unificados", ununifiedPayslips.size());
            
            int matchedCount = 0;
            for (Payslip payslip : ununifiedPayslips) {
                try {
                    Optional<PaymentReceipt> match = findMatchingReceipt(payslip);
                    if (match.isPresent()) {
                        createUnifiedDocument(payslip, match.get());
                        matchedCount++;
                    }
                } catch (Exception e) {
                    log.error("❌ Erro ao processar unificação para payslip {}", payslip.getId(), e);
                }
            }
            
            log.info("✅ UnificationWorker: Processamento concluído - {} documentos unificados", matchedCount);
        } catch (Exception e) {
            log.error("❌ Erro no UnificationWorker", e);
        }
    }
    
    /**
     * Verifica se um payslip já foi unificado
     */
    private boolean isUnified(Payslip payslip) {
        return unifiedDocumentRepository.findByPayslipId(payslip.getId()).isPresent();
    }
    
    /**
     * Encontra um comprovante que corresponde ao holerite
     */
    private Optional<PaymentReceipt> findMatchingReceipt(Payslip payslip) {
        // Buscar comprovantes do mesmo período
        List<PaymentReceipt> candidates = paymentReceiptRepository.findByYearAndMonth(
            payslip.getYear(), payslip.getMonth());
        
        for (PaymentReceipt receipt : candidates) {
            // Verificar se já foi unificado
            if (unifiedDocumentRepository.findByReceiptId(receipt.getId()).isPresent()) {
                continue;
            }
            
            // REGRA A: Match perfeito (CPF + Valor + Período)
            if (payslip.getCpf() != null && receipt.getEmployeeName() != null) {
                // Normalizar CPF
                String payslipCpf = normalizeCpf(payslip.getCpf());
                String receiptCpf = extractCpfFromName(receipt.getEmployeeName());
                
                if (payslipCpf.equals(receiptCpf) && 
                    valuesMatch(payslip.getNetValue(), receipt.getNetSalary())) {
                    log.info("✅ Match perfeito encontrado - Payslip: {}, Receipt: {}", 
                        payslip.getId(), receipt.getId());
                    return Optional.of(receipt);
                }
            }
            
            // REGRA B: Match por nome similar + valor + período
            if (payslip.getEmployeeName() != null && receipt.getEmployeeName() != null) {
                double similarity = jaroWinkler.apply(
                    normalizeName(payslip.getEmployeeName()),
                    normalizeName(receipt.getEmployeeName())
                );
                
                if (similarity >= SIMILARITY_THRESHOLD && 
                    valuesMatch(payslip.getNetValue(), receipt.getNetSalary())) {
                    log.info("✅ Match por similaridade encontrado ({}%) - Payslip: {}, Receipt: {}", 
                        similarity * 100, payslip.getId(), receipt.getId());
                    return Optional.of(receipt);
                }
            }
        }
        
        return Optional.empty();
    }
    
    /**
     * Cria documento unificado
     */
    private void createUnifiedDocument(Payslip payslip, PaymentReceipt receipt) {
        try {
            // Verificar se já existe
            if (unifiedDocumentRepository.findByPayslipIdAndReceiptId(
                payslip.getId(), receipt.getId()).isPresent()) {
                log.debug("Documento unificado já existe para payslip {} e receipt {}", 
                    payslip.getId(), receipt.getId());
                return;
            }
            
            // Criar PDF unificado
            String unifiedPdfPath;
            try {
                unifiedPdfPath = unifiedDocumentService.createUnifiedDocument(payslip, receipt);
            } catch (java.io.IOException e) {
                log.error("❌ Erro de I/O ao criar PDF unificado", e);
                throw new RuntimeException("Erro ao criar PDF unificado: " + e.getMessage(), e);
            }
            
            // Criar entidade UnifiedDocument
            UnifiedDocument unifiedDocument = UnifiedDocument.builder()
                .payslip(payslip)
                .receipt(receipt)
                .month(payslip.getMonth())
                .year(payslip.getYear())
                .employeeName(payslip.getEmployeeName())
                .filePath(unifiedPdfPath)
                .fileName(extractFileName(unifiedPdfPath))
                .fileSize(0L) // Será calculado depois se necessário
                .status(UnifiedDocument.UnifiedDocumentStatus.PROCESSED)
                .matchingConfidence(new BigDecimal("1.0"))
                .notes("Unificação automática via UnificationWorker")
                .build();
            
            unifiedDocumentRepository.save(unifiedDocument);
            
            log.info("✅ Documento unificado criado - Payslip: {}, Receipt: {}, UnifiedDocument: {}", 
                payslip.getId(), receipt.getId(), unifiedDocument.getId());
        } catch (Exception e) {
            log.error("❌ Erro ao criar documento unificado", e);
            throw e;
        }
    }
    
    // Métodos auxiliares
    private String normalizeCpf(String cpf) {
        if (cpf == null) return "";
        return cpf.replaceAll("[^0-9]", "");
    }
    
    private String normalizeName(String name) {
        if (name == null) return "";
        return name.trim().toUpperCase()
            .replaceAll("\\s+", " ")
            .replaceAll("[^A-ZÀ-ÿ\\s]", "");
    }
    
    private String extractCpfFromName(String name) {
        // Tentar extrair CPF do nome (caso esteja no formato "NOME - CPF")
        if (name == null) return "";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d{11})");
        java.util.regex.Matcher matcher = pattern.matcher(name);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "";
    }
    
    private boolean valuesMatch(BigDecimal value1, BigDecimal value2) {
        if (value1 == null || value2 == null) return false;
        return value1.compareTo(value2) == 0;
    }
    
    private String extractFileName(String filePath) {
        if (filePath == null) return "unified.pdf";
        int lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
    }
}

