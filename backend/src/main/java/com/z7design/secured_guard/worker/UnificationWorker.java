package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.model.UnifiedDocument;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.UnifiedDocumentRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.UnifiedDocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.Scheduled;
import com.z7design.secured_guard.config.WorkerComponent;
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
@WorkerComponent
@RequiredArgsConstructor
public class UnificationWorker {
    
    private final PayslipRepository payslipRepository;
    private final PaymentReceiptRepository paymentReceiptRepository;
    private final UnifiedDocumentRepository unifiedDocumentRepository;
    private final UnifiedDocumentService unifiedDocumentService;
    private final EmployeeRepository employeeRepository;
    private final ApplicationContext applicationContext;
    private final JaroWinklerSimilarity jaroWinkler = new JaroWinklerSimilarity();
    
    private static final double SIMILARITY_THRESHOLD = 0.85;
    
    /**
     * Processa unificação periodicamente (a cada 5 minutos)
     * Busca holerites e comprovantes não unificados e tenta fazer matching
     */
    @Scheduled(fixedDelay = 300000) // 5 minutos
    public void processUnification() {
        try {
            // Verificar se o contexto da aplicação ainda está ativo
            if (!isApplicationContextActive()) {
                log.warn("⚠️ UnificationWorker: Contexto da aplicação não está mais ativo. Pulando execução.");
                return;
            }
            
            log.info("🔄 UnificationWorker: Iniciando processo de unificação...");
            
            // Buscar holerites que ainda não foram unificados (em transação separada)
            List<Payslip> ununifiedPayslips = findUnunifiedPayslips();
            
            log.info("📊 UnificationWorker: Encontrados {} holerites não unificados", ununifiedPayslips.size());
            
            int matchedCount = 0;
            for (Payslip payslip : ununifiedPayslips) {
                // Verificar novamente se o contexto ainda está ativo antes de processar cada item
                if (!isApplicationContextActive()) {
                    log.warn("⚠️ UnificationWorker: Contexto da aplicação foi fechado durante o processamento. Interrompendo.");
                    break;
                }
                
                try {
                    Optional<PaymentReceipt> match = findMatchingReceipt(payslip);
                    if (match.isPresent()) {
                        // Processar cada unificação em transação separada para evitar problemas de conexão
                        processUnificationInTransaction(payslip, match.get());
                        matchedCount++;
                    }
                } catch (org.springframework.context.ApplicationContextException e) {
                    log.warn("⚠️ Contexto da aplicação fechado durante processamento. Interrompendo.");
                    break;
                } catch (org.springframework.dao.DataAccessResourceFailureException e) {
                    log.warn("⚠️ Erro de acesso ao banco de dados (possivelmente contexto fechado): {}", e.getMessage());
                    break;
                } catch (org.springframework.dao.DataAccessException e) {
                    if (e.getMessage() != null && (e.getMessage().contains("closed") || e.getMessage().contains("Connection"))) {
                        log.warn("⚠️ Conexão com banco de dados foi fechada. Interrompendo processamento.");
                        break;
                    }
                    log.error("❌ Erro de banco de dados ao processar unificação para payslip {}", payslip.getId(), e);
                } catch (IllegalStateException e) {
                    if (e.getMessage() != null && e.getMessage().contains("closed")) {
                        log.warn("⚠️ Contexto da aplicação foi fechado. Interrompendo processamento.");
                        break;
                    }
                    log.error("❌ Erro ao processar unificação para payslip {}", payslip.getId(), e);
                } catch (Exception e) {
                    log.error("❌ Erro ao processar unificação para payslip {}", payslip.getId(), e);
                }
            }
            
            log.info("✅ UnificationWorker: Processamento concluído - {} documentos unificados", matchedCount);
        } catch (org.springframework.context.ApplicationContextException e) {
            log.warn("⚠️ UnificationWorker: Contexto da aplicação não está mais disponível. Pulando execução.");
        } catch (IllegalStateException e) {
            if (e.getMessage() != null && e.getMessage().contains("closed")) {
                log.warn("⚠️ UnificationWorker: Contexto da aplicação foi fechado. Pulando execução.");
            } else {
                log.error("❌ Erro no UnificationWorker", e);
            }
        } catch (org.springframework.dao.DataAccessResourceFailureException e) {
            log.warn("⚠️ UnificationWorker: Erro de acesso ao banco de dados (possivelmente contexto fechado): {}", e.getMessage());
        } catch (org.springframework.dao.DataAccessException e) {
            if (e.getMessage() != null && (e.getMessage().contains("closed") || e.getMessage().contains("Connection"))) {
                log.warn("⚠️ UnificationWorker: Conexão com banco de dados foi fechada. Pulando execução.");
            } else {
                log.error("❌ Erro de banco de dados no UnificationWorker", e);
            }
        } catch (Exception e) {
            log.error("❌ Erro no UnificationWorker", e);
        }
    }
    
    /**
     * Busca holerites não unificados em transação separada
     */
    @Transactional(readOnly = true, timeout = 30)
    private List<Payslip> findUnunifiedPayslips() {
        return payslipRepository.findAll().stream()
            .filter(p -> {
                try {
                    return !isUnified(p);
                } catch (Exception e) {
                    // Se houver erro ao verificar (ex: contexto fechado), considerar como não unificado
                    log.warn("⚠️ Erro ao verificar se payslip {} está unificado: {}", p.getId(), e.getMessage());
                    return false;
                }
            })
            .toList();
    }
    
    /**
     * Processa uma unificação em transação separada para evitar problemas de conexão
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW, timeout = 60)
    private void processUnificationInTransaction(Payslip payslip, PaymentReceipt receipt) {
        createUnifiedDocument(payslip, receipt);
    }
    
    /**
     * Verifica se o contexto da aplicação ainda está ativo
     */
    private boolean isApplicationContextActive() {
        try {
            if (applicationContext == null) {
                return false;
            }
            // Tentar obter um bean simples para verificar se o contexto está ativo
            // Se o contexto foi fechado, isso lançará IllegalStateException
            applicationContext.getBean(PayslipRepository.class);
            return true;
        } catch (IllegalStateException e) {
            // Contexto foi fechado
            return false;
        } catch (Exception e) {
            // Qualquer outro erro, assumir que não está ativo
            log.debug("Erro ao verificar contexto: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Verifica se um payslip já foi unificado
     */
    private boolean isUnified(Payslip payslip) {
        try {
            // Pode haver múltiplos documentos unificados para o mesmo payslip (ex: unificações individuais e em lote)
            // Verificar se existe pelo menos um
            List<UnifiedDocument> unifiedDocs = unifiedDocumentRepository.findAllByPayslipId(payslip.getId());
            return unifiedDocs != null && !unifiedDocs.isEmpty();
        } catch (Exception e) {
            log.warn("⚠️ Erro ao verificar se payslip {} está unificado: {}", payslip.getId(), e.getMessage());
            return false;
        }
    }
    
    /**
     * Encontra um comprovante que corresponde ao holerite
     * REGRA DE NEGÓCIO: Comparar Nome, Valor Líquido e Conta Corrente (quando disponível)
     */
    private Optional<PaymentReceipt> findMatchingReceipt(Payslip payslip) {
        log.info("🔍 Buscando comprovante correspondente para holerite: {} - {}/{}", 
            payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear());
        
        // Buscar comprovantes do mesmo período (mês seguinte ou mesmo mês)
        int receiptMonthNext = payslip.getMonth() == 12 ? 1 : payslip.getMonth() + 1;
        int receiptYearNext = payslip.getMonth() == 12 ? payslip.getYear() + 1 : payslip.getYear();
        
        List<PaymentReceipt> candidates = new java.util.ArrayList<>();
        candidates.addAll(paymentReceiptRepository.findByYearAndMonth(receiptYearNext, receiptMonthNext));
        candidates.addAll(paymentReceiptRepository.findByYearAndMonth(payslip.getYear(), payslip.getMonth()));
        
        log.info("📊 Candidatos encontrados: {} comprovante(s) para período {}/{} ou {}/{}", 
            candidates.size(), receiptMonthNext, receiptYearNext, payslip.getMonth(), payslip.getYear());
        
        // Buscar funcionário na tabela employees para obter dados adicionais (CPF, conta corrente)
        Employee employee = null;
        if (payslip.getEmployeeName() != null || payslip.getCpf() != null) {
            employee = findEmployeeForPayslip(payslip);
            if (employee != null) {
                log.info("✅ Funcionário encontrado na tabela employees: {} (ID: {}, CPF: {}, Conta: {})", 
                    employee.getName(), employee.getId(), 
                    employee.getDocument() != null ? employee.getDocument() : "N/A",
                    employee.getContaCorrente() != null ? employee.getContaCorrente() : "N/A");
            }
        }
        
        for (PaymentReceipt receipt : candidates) {
            // Verificar se já foi unificado (pode haver múltiplos documentos unificados para o mesmo receipt)
            try {
                List<UnifiedDocument> existingUnified = unifiedDocumentRepository.findAllByReceiptId(receipt.getId());
                if (existingUnified != null && !existingUnified.isEmpty()) {
                    continue;
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao verificar se receipt {} está unificado: {}", receipt.getId(), e.getMessage());
            }
            
            // REGRA DE NEGÓCIO: Verificar matching usando múltiplos critérios
            boolean nameMatches = false;
            boolean valueMatches = false;
            boolean accountMatches = false; // Conta corrente (comentado para uso futuro)
            
            // 1. VERIFICAR NOME
            if (payslip.getEmployeeName() != null && receipt.getEmployeeName() != null) {
                String payslipName = normalizeName(payslip.getEmployeeName());
                String receiptName = normalizeName(receipt.getEmployeeName());
                
                // Usar também o nome da conta creditada se disponível
                String receiptCreditedName = receipt.getCreditedName() != null 
                    ? normalizeName(receipt.getCreditedName()) 
                    : receiptName;
                
                double similarity = Math.max(
                    jaroWinkler.apply(payslipName, receiptName),
                    jaroWinkler.apply(payslipName, receiptCreditedName)
                );
                
                nameMatches = similarity >= SIMILARITY_THRESHOLD || 
                             payslipName.equals(receiptName) || 
                             payslipName.equals(receiptCreditedName) ||
                             payslipName.contains(receiptName) || 
                             receiptName.contains(payslipName);
                
                log.debug("   Nome - Payslip: '{}' vs Receipt: '{}' (creditado: '{}') -> Match: {}", 
                    payslipName, receiptName, receiptCreditedName, nameMatches);
            }
            
            // 2. VERIFICAR VALOR (Valor Líquido do Holerite vs Valor do Comprovante)
            valueMatches = valuesMatch(payslip.getNetValue(), receipt.getNetSalary());
            log.debug("   Valor - Payslip: {} vs Receipt: {} -> Match: {}", 
                payslip.getNetValue(), receipt.getNetSalary(), valueMatches);
            
            // 3. VERIFICAR CONTA CORRENTE (regra obrigatória para unificar)
            // Prioridade da conta do holerite: campo contaCorrente do próprio holerite.
            // Se o holerite não tiver conta extraída do PDF, usar o cadastro (tabela employees).
            String payslipAccountSource = null;
            if (payslip.getContaCorrente() != null && !payslip.getContaCorrente().isBlank()) {
                payslipAccountSource = normalizeAccount(payslip.getContaCorrente());
            } else if (employee != null && employee.getContaCorrente() != null
                    && !employee.getContaCorrente().isBlank()) {
                payslipAccountSource = normalizeAccount(employee.getContaCorrente());
                log.debug("   Conta corrente do holerite não extraída, usando cadastro employees: '{}'",
                        employee.getContaCorrente());
            }

            if (payslipAccountSource != null && receipt.getCreditedAccount() != null) {
                String receiptAccount = normalizeAccount(receipt.getCreditedAccount());
                accountMatches = payslipAccountSource.equals(receiptAccount);

                if (accountMatches) {
                    log.info("✅ Conta corrente corresponde: '{}' = '{}' (origem: {})",
                            payslipAccountSource, receiptAccount,
                            payslip.getContaCorrente() != null ? "holerite" : "employees");
                } else {
                    log.debug("   Conta Corrente - Payslip: '{}' vs Receipt: '{}' -> NÃO corresponde",
                            payslipAccountSource, receiptAccount);
                }
            } else if (receipt.getCreditedAccount() != null) {
                log.debug("   Conta corrente do holerite não identificada (nem no PDF nem no cadastro) - "
                        + "receipt tem conta creditada '{}', sem verificação possível", receipt.getCreditedAccount());
            }
            
            // REGRA A: Match perfeito (Nome + Valor + Conta Corrente obrigatória)
            if (nameMatches && valueMatches) {
                // REGRA DE NEGÓCIO: A conta corrente é OBRIGATÓRIA para unificar.
                // Se o holerite (ou cadastro) tem conta e o comprovante tem conta creditada,
                // elas DEVEM ser iguais. Apenas quando o comprovante não expõe conta
                // creditada (não verificável) o match segue por Nome + Valor.
                if (accountMatches || (!accountMatches && receipt.getCreditedAccount() == null)) {
                    log.info("✅ Match encontrado - Payslip: {}, Receipt: {} (Nome: {}, Valor: {}, Conta: {})", 
                        payslip.getId(), receipt.getId(), nameMatches, valueMatches, 
                        accountMatches ? "✅" : "N/A");
                    return Optional.of(receipt);
                } else {
                    log.warn("🚫 Match bloqueado - Nome e Valor OK, mas Conta Corrente não corresponde "
                            + "(payslip: '{}', receipt creditada: '{}')",
                            payslipAccountSource, receipt.getCreditedAccount());
                }
            }
            
            // REGRA B: Match por CPF (se disponível) + Valor
            if (payslip.getCpf() != null && receipt.getEmployeeName() != null) {
                String payslipCpf = normalizeCpf(payslip.getCpf());
                String receiptCpf = extractCpfFromName(receipt.getEmployeeName());
                
                // Se não encontrou CPF no nome do comprovante, tentar buscar via employee
                if (receiptCpf.isEmpty() && employee != null && employee.getDocument() != null) {
                    String employeeCpf = normalizeCpf(employee.getDocument());
                    if (payslipCpf.equals(employeeCpf) && valueMatches) {
                        // REGRA DE NEGÓCIO: conta corrente obrigatória também neste caminho
                        if (accountMatches || (!accountMatches && receipt.getCreditedAccount() == null)) {
                            log.info("✅ Match por CPF (via employees) + Valor - Payslip: {}, Receipt: {}", 
                                payslip.getId(), receipt.getId());
                            return Optional.of(receipt);
                        } else {
                            log.warn("🚫 Match por CPF (via employees) bloqueado - Conta Corrente não corresponde "
                                    + "(payslip: '{}', receipt creditada: '{}')",
                                    payslipAccountSource, receipt.getCreditedAccount());
                        }
                    }
                } else if (payslipCpf.equals(receiptCpf) && valueMatches) {
                    // REGRA DE NEGÓCIO: conta corrente obrigatória também neste caminho
                    if (accountMatches || (!accountMatches && receipt.getCreditedAccount() == null)) {
                        log.info("✅ Match por CPF + Valor - Payslip: {}, Receipt: {}", 
                            payslip.getId(), receipt.getId());
                        return Optional.of(receipt);
                    } else {
                        log.warn("🚫 Match por CPF+Valor bloqueado - Conta Corrente não corresponde "
                                + "(payslip: '{}', receipt creditada: '{}')",
                                payslipAccountSource, receipt.getCreditedAccount());
                    }
                }
            }
        }
        
        log.debug("❌ Nenhum comprovante correspondente encontrado para holerite: {} - {}/{}", 
            payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear());
        return Optional.empty();
    }
    
    /**
     * Busca funcionário na tabela employees usando dados do holerite
     * Estratégia: CPF > Nome exato > Nome parcial
     */
    private Employee findEmployeeForPayslip(Payslip payslip) {
        try {
            // ESTRATÉGIA 1: Buscar por CPF
            if (payslip.getCpf() != null && !payslip.getCpf().trim().isEmpty()) {
                String normalizedCpf = normalizeCpf(payslip.getCpf());
                if (normalizedCpf.length() >= 11) {
                    Optional<Employee> employeeOpt = employeeRepository.findByCpf(normalizedCpf);
                    if (employeeOpt.isPresent()) {
                        return employeeOpt.get();
                    }
                }
            }
            
            // ESTRATÉGIA 2: Buscar por nome exato
            if (payslip.getEmployeeName() != null && !payslip.getEmployeeName().trim().isEmpty()) {
                Optional<Employee> employeeOpt = employeeRepository.findByNameExact(payslip.getEmployeeName().trim());
                if (employeeOpt.isPresent()) {
                    return employeeOpt.get();
                }
            }
            
            // ESTRATÉGIA 3: Buscar por nome parcial
            if (payslip.getEmployeeName() != null && !payslip.getEmployeeName().trim().isEmpty()) {
                List<Employee> employees = employeeRepository.findByNameContainingIgnoreCase(payslip.getEmployeeName().trim());
                if (!employees.isEmpty()) {
                    // Retornar o primeiro (ou o mais próximo se houver lógica de matching)
                    return employees.get(0);
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ Erro ao buscar funcionário na tabela employees: {}", e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Normaliza conta corrente removendo espaços, hífens e pontos
     */
    private String normalizeAccount(String account) {
        if (account == null) return "";
        return account.replaceAll("[^0-9]", "");
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


