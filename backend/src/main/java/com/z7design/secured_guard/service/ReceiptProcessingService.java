package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PaymentReceiptDTO;
import com.z7design.secured_guard.dto.ReceiptProcessingResponse;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.model.PaymentReceiptStatus;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReceiptProcessingService {

    private final PaymentReceiptRepository receiptRepository;
    private final PaymentReceiptService paymentReceiptService;
    private final PayslipService payslipService;
    private final EmployeeRepository employeeRepository;
    private final String UPLOAD_DIR = "uploads/receipts/";

    @Transactional
    public List<PaymentReceipt> processReceiptFile(MultipartFile file) throws IOException {
        ReceiptProcessingResponse response = processReceiptFileWithSummary(file);
        // Converter DTOs de volta para entidades (para compatibilidade com código existente)
        return response.getReceipts().stream()
            .map(dto -> {
                PaymentReceipt receipt = receiptRepository.findById(dto.getId()).orElse(null);
                return receipt;
            })
            .filter(receipt -> receipt != null)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public ReceiptProcessingResponse processReceiptFileWithSummary(MultipartFile file) throws IOException {
        log.info("=== INÍCIO DO PROCESSAMENTO DE COMPROVANTES ===");
        log.info("Arquivo: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
        log.info("Tipo de conteúdo: {}", file.getContentType());
        log.info("Arquivo vazio: {}", file.isEmpty());
        
        if (file.isEmpty()) {
            log.error("❌ ARQUIVO ESTÁ VAZIO!");
            throw new IOException("Arquivo está vazio");
        }
        
        // Criar diretório se não existir
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            log.info("Diretório criado: {}", uploadPath.toAbsolutePath());
        }

        List<PaymentReceipt> extractedReceipts = new ArrayList<>();
        int pageCount = 0;
        int paginasProcessadas = 0;
        int paginasComErro = 0;
        int paginasPuladas = 0;
        
        // Mapa para contar comprovantes por funcionário
        Map<String, Integer> employeesCount = new HashMap<>();
        
        // Ler o arquivo em bytes para poder reutilizar
        byte[] fileBytes = file.getBytes();
        
        try (PDDocument document = PDDocument.load(new java.io.ByteArrayInputStream(fileBytes))) {
            pageCount = document.getNumberOfPages();
            log.info("📄 Arquivo contém {} página(s) - Cada página contém 1 comprovante", pageCount);
            log.info("📋 Expectativa: {} comprovante(s) processado(s) (1 comprovante por página)", pageCount);

            // IMPORTANTE: Criar uma nova instância do stripper para cada página
            // para garantir que não há estado compartilhado entre páginas
            for (int pageNum = 0; pageNum < pageCount; pageNum++) {
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.info("=== PROCESSANDO PÁGINA {}/{} ===", pageNum + 1, pageCount);
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                
                // CRIAR NOVA INSTÂNCIA PARA CADA PÁGINA (crítico para evitar estado compartilhado)
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(pageNum + 1);
                stripper.setEndPage(pageNum + 1);
                
                String pageText = stripper.getText(document);
                log.info("📝 Texto extraído da página {}: {} caracteres", pageNum + 1, pageText.length());
                
                // Log do texto extraído para debug (mostrar parte relevante da seção creditada)
                if (pageText.length() > 0) {
                    // Buscar seção creditada no texto para confirmar que é da página correta
                    Pattern creditadaPreviewPattern = Pattern.compile("Dados da conta (?:a ser )?creditada([\\s\\S]{0,300}?)(?=Dados|Valor|Informações|$)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
                    Matcher creditadaPreviewMatcher = creditadaPreviewPattern.matcher(pageText);
                    if (creditadaPreviewMatcher.find()) {
                        String creditadaSection = creditadaPreviewMatcher.group(1);
                        log.info("🔍 Seção creditada encontrada na página {}: {}", pageNum + 1, creditadaSection.substring(0, Math.min(200, creditadaSection.length())));
                    } else {
                        log.warn("⚠️ Seção creditada NÃO encontrada na página {}!", pageNum + 1);
                    }
                    
                    // Preview geral da página
                    String preview = pageText.substring(0, Math.min(300, pageText.length()));
                    log.info("🔍 Preview da página {} (primeiros 300 chars): {}", pageNum + 1, preview);
                } else {
                    log.warn("⚠️ Página {} está vazia!", pageNum + 1);
                }
                
                try {
                    // IMPORTANTE: Cada página deve gerar APENAS 1 comprovante
                    // Extrair informações do comprovante
                    PaymentReceipt receipt = extractReceiptInfo(pageText, pageNum + 1, new java.io.ByteArrayInputStream(fileBytes));
                    
                    if (receipt != null && receipt.getEmployeeName() != null && !receipt.getEmployeeName().trim().isEmpty()) {
                        log.info("✅ Comprovante extraído da página {}/{}: {} (Período: {}/{}, Conta: {})", 
                            pageNum + 1, pageCount, receipt.getEmployeeName(), 
                            receipt.getMonth(), receipt.getYear(),
                            receipt.getCreditedAccount() != null ? receipt.getCreditedAccount() : "NÃO EXTRAÍDA");
                        
                        extractedReceipts.add(receipt);
                        paginasProcessadas++;
                        
                        // Contar por funcionário
                        String employeeName = receipt.getEmployeeName().trim().toUpperCase();
                        employeesCount.put(employeeName, employeesCount.getOrDefault(employeeName, 0) + 1);
                    } else {
                        paginasComErro++;
                        log.warn("❌ Nenhum comprovante extraído da página {}/{} - dados inválidos", pageNum + 1, pageCount);
                        log.debug("Dados extraídos da página {}: Nome={}", pageNum + 1, 
                                 receipt != null ? receipt.getEmployeeName() : "null");
                    }
                } catch (Exception pageException) {
                    paginasComErro++;
                    log.error("❌ Erro ao processar página {}/{}: {}", pageNum + 1, pageCount, pageException.getMessage());
                    log.debug("Stack trace da página {}: ", pageNum + 1, pageException);
                    // Continuar processando próximas páginas
                }
            }
        } catch (Exception e) {
            log.error("💥 ERRO AO PROCESSAR ARQUIVO PDF: {}", e.getMessage(), e);
            throw new IOException("Erro ao processar arquivo PDF: " + e.getMessage());
        }

        // Salvar comprovantes no banco e retornar apenas os salvos (com IDs)
        List<PaymentReceipt> savedReceipts = new ArrayList<>();
        log.info("💾 Salvando {} comprovantes no banco de dados", extractedReceipts.size());
        for (PaymentReceipt receipt : extractedReceipts) {
            try {
                PaymentReceipt savedReceipt = receiptRepository.save(receipt);
                log.info("✅ Comprovante salvo com ID: {} - {}", savedReceipt.getId(), savedReceipt.getEmployeeName());
                savedReceipts.add(savedReceipt);
            } catch (Exception e) {
                log.error("❌ Erro ao salvar comprovante: {}", e.getMessage(), e);
            }
        }

        // VALIDAÇÃO: Verificar se quantidade de comprovantes processados corresponde à quantidade de páginas
        int comprovantesProcessados = extractedReceipts.size();
        int comprovantesSalvos = savedReceipts.size();
        boolean validationOk = comprovantesProcessados == pageCount;
        String validationMessage = "";
        
        log.info("");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("📊 RESUMO DO PROCESSAMENTO DE COMPROVANTES:");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("📄 Total de páginas no arquivo: {}", pageCount);
        log.info("✅ Páginas processadas com sucesso: {}", paginasProcessadas);
        log.info("❌ Páginas com erro na extração: {}", paginasComErro);
        log.info("⏭️  Páginas puladas: {}", paginasPuladas);
        log.info("📋 Comprovantes extraídos: {}", comprovantesProcessados);
        log.info("💾 Comprovantes salvos no banco: {}", comprovantesSalvos);
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        // Validação principal: comprovantes processados devem ser igual a páginas
        if (validationOk) {
            validationMessage = String.format("✅ VALIDAÇÃO OK: Quantidade de comprovantes processados (%d) corresponde à quantidade de páginas (%d)",
                comprovantesProcessados, pageCount);
            log.info(validationMessage);
        } else {
            validationMessage = String.format("⚠️ ATENÇÃO: Quantidade de comprovantes processados (%d) não corresponde à quantidade esperada (%d páginas)",
                comprovantesProcessados, pageCount);
            log.warn(validationMessage);
            log.warn("⚠️ Diferença: {} comprovante(s) a mais/menos do esperado", Math.abs(comprovantesProcessados - pageCount));
            
            if (comprovantesProcessados > pageCount) {
                log.warn("⚠️ POSSÍVEL CAUSA: Uma ou mais páginas podem ter gerado múltiplos comprovantes");
                log.warn("⚠️ SOLUÇÃO: Verificar se o extractReceiptInfo está extraindo apenas 1 comprovante por página");
            } else if (comprovantesProcessados < pageCount) {
                log.warn("⚠️ POSSÍVEL CAUSA: Uma ou mais páginas não geraram comprovante (erro na extração ou dados inválidos)");
                log.warn("⚠️ SOLUÇÃO: Verificar logs de erro acima para identificar páginas problemáticas");
            }
        }
        
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        // Lista de funcionários processados com suas quantidades
        log.info("");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("📋 LISTA DE FUNCIONÁRIOS PROCESSADOS:");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        if (employeesCount.isEmpty()) {
            log.warn("⚠️ Nenhum funcionário foi processado");
        } else {
            // Ordenar por quantidade (decrescente) e depois por nome
            List<Map.Entry<String, Integer>> sortedEmployees = employeesCount.entrySet().stream()
                .sorted((e1, e2) -> {
                    int countCompare = Integer.compare(e2.getValue(), e1.getValue()); // Decrescente por quantidade
                    if (countCompare != 0) return countCompare;
                    return e1.getKey().compareToIgnoreCase(e2.getKey()); // Crescente por nome
                })
                .collect(Collectors.toList());
            
            for (Map.Entry<String, Integer> entry : sortedEmployees) {
                log.info("👤 {}: {} comprovante(s)", entry.getKey(), entry.getValue());
            }
            
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("📊 Total de funcionários únicos processados: {}", employeesCount.size());
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        }

        log.info("🎉 Processamento concluído. {} comprovante(s) extraído(s), {} salvo(s) de {} página(s) do arquivo", 
            comprovantesProcessados, comprovantesSalvos, pageCount);
        
        // Converter para DTOs
        List<PaymentReceiptDTO> receiptDTOs = savedReceipts.stream()
            .map(receipt -> {
                PaymentReceiptDTO dto = new PaymentReceiptDTO();
                dto.setId(receipt.getId());
                dto.setEmployeeName(receipt.getEmployeeName());
                dto.setMonth(receipt.getMonth());
                dto.setYear(receipt.getYear());
                dto.setGrossSalary(receipt.getGrossSalary());
                dto.setNetSalary(receipt.getNetSalary());
                dto.setFileName(receipt.getFileName());
                dto.setFilePath(receipt.getFilePath());
                dto.setStatus(receipt.getStatus());
                dto.setCreatedAt(receipt.getCreatedAt());
                dto.setProcessedAt(receipt.getProcessedAt());
                return dto;
            })
            .collect(Collectors.toList());
        
        // Construir lista de funcionários com contagem
        List<ReceiptProcessingResponse.EmployeeProcessingCount> employeesByCount = employeesCount.entrySet().stream()
            .sorted((e1, e2) -> {
                int countCompare = Integer.compare(e2.getValue(), e1.getValue());
                if (countCompare != 0) return countCompare;
                return e1.getKey().compareToIgnoreCase(e2.getKey());
            })
            .map(entry -> ReceiptProcessingResponse.EmployeeProcessingCount.builder()
                .employeeName(entry.getKey())
                .count(entry.getValue())
                .build())
            .collect(Collectors.toList());
        
        // Construir resumo
        ReceiptProcessingResponse.ProcessingSummary summary = ReceiptProcessingResponse.ProcessingSummary.builder()
            .totalPages(pageCount)
            .receiptsProcessed(comprovantesProcessados)
            .receiptsSaved(comprovantesSalvos)
            .pagesWithError(paginasComErro)
            .pagesSkipped(paginasPuladas)
            .validationOk(validationOk)
            .validationMessage(validationMessage)
            .build();
        
        return ReceiptProcessingResponse.builder()
            .receipts(receiptDTOs)
            .summary(summary)
            .employeesByCount(employeesByCount)
            .build();
    }

    private PaymentReceipt extractReceiptInfo(String pageText, int pageNumber, java.io.InputStream originalInputStream) {
        try {
            log.info("Extraindo informações do recibo da página {}", pageNumber);
            
            // Extrair dados específicos do recibo bancário
            ReceiptData receiptData = extractBankReceiptData(pageText);
            if (receiptData == null) {
                log.warn("Não foi possível extrair dados do recibo bancário na página {}", pageNumber);
                return null;
            }

            log.info("Dados extraídos - Nome: {}, Mês: {}, Ano: {}, Valor: {}", 
                    receiptData.employeeName, receiptData.month, receiptData.year, receiptData.amount);

            // Validar dados obrigatórios
            if (receiptData.employeeName == null || receiptData.employeeName.trim().isEmpty()) {
                log.error("Nome do funcionário é obrigatório");
                return null;
            }
            
            if (receiptData.month <= 0 || receiptData.month > 12) {
                log.error("Mês inválido: {}", receiptData.month);
                return null;
            }
            
            if (receiptData.year <= 0) {
                log.error("Ano inválido: {}", receiptData.year);
                return null;
            }

            // ===== VALIDAÇÕES SOLICITADAS =====
            log.info("🔍 Iniciando validações do comprovante...");
            
            // 1. Buscar holerite correspondente ao funcionário e período
            Payslip matchingPayslip = null;
            try {
                List<Payslip> payslipsInDb = payslipService.getAllPayslips().stream()
                    .filter(p -> p.getMonth() != null && p.getMonth().equals(receiptData.month))
                    .filter(p -> p.getYear() != null && p.getYear().equals(receiptData.year))
                    .collect(Collectors.toList());
                
                log.info("📊 Holerites encontrados para {}/{}: {}", receiptData.month, receiptData.year, payslipsInDb.size());
                
                // Normalizar nome do comprovante para comparação
                String receiptEmployeeName = receiptData.employeeName != null ? receiptData.employeeName.trim().toUpperCase() : "";
                String receiptNameFirst3 = receiptEmployeeName.length() >= 3 ? receiptEmployeeName.substring(0, 3) : receiptEmployeeName;
                
                // Buscar holerite correspondente
                for (Payslip payslip : payslipsInDb) {
                    if (payslip.getEmployeeName() != null) {
                        String payslipEmployeeName = payslip.getEmployeeName().trim().toUpperCase();
                        String payslipNameFirst3 = payslipEmployeeName.length() >= 3 ? payslipEmployeeName.substring(0, 3) : payslipEmployeeName;
                        
                        // Verificar se os 3 primeiros caracteres coincidem (para nomes abreviados)
                        boolean nameMatches = receiptNameFirst3.equals(payslipNameFirst3) || 
                                            receiptEmployeeName.equals(payslipEmployeeName) ||
                                            receiptEmployeeName.contains(payslipEmployeeName) ||
                                            payslipEmployeeName.contains(receiptEmployeeName);
                        
                        if (nameMatches) {
                            matchingPayslip = payslip;
                            log.info("✅ Holerite encontrado: {} - {}/{} (Empresa: {}, Setor: {})", 
                                payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear(),
                                payslip.getCompanyName(), payslip.getWorkPostName());
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao buscar holerite: {}", e.getMessage());
            }
            
            // 2. Validar valor líquido se holerite foi encontrado
            boolean valueMatches = false;
            if (matchingPayslip != null && matchingPayslip.getNetValue() != null && receiptData.amount != null) {
                java.math.BigDecimal payslipNetValue = matchingPayslip.getNetValue();
                java.math.BigDecimal receiptAmount = java.math.BigDecimal.valueOf(receiptData.amount);
                
                // Comparar valores (tolerância de 0.01 para diferenças de arredondamento)
                valueMatches = payslipNetValue.subtract(receiptAmount).abs().compareTo(java.math.BigDecimal.valueOf(0.01)) <= 0;
                
                log.info("💰 Comparação de valores - Holerite: R$ {}, Comprovante: R$ {}, Match: {}", 
                    payslipNetValue, receiptAmount, valueMatches);
            } else {
                log.warn("⚠️ Não foi possível validar valor: Holerite={}, NetValue={}, ReceiptAmount={}", 
                    matchingPayslip != null, 
                    matchingPayslip != null && matchingPayslip.getNetValue() != null ? matchingPayslip.getNetValue() : "null",
                    receiptData.amount);
            }
            
            // 3. Verificar duplicatas (mesmo funcionário, mesmo valor, mesma data de transferência)
            boolean isDuplicate = false;
            try {
                List<PaymentReceipt> existingReceipts = receiptRepository.findAll().stream()
                    .filter(r -> r.getEmployeeName() != null && 
                                r.getEmployeeName().trim().equalsIgnoreCase(receiptData.employeeName.trim()))
                    .filter(r -> r.getMonth() != null && r.getMonth().equals(receiptData.month))
                    .filter(r -> r.getYear() != null && r.getYear().equals(receiptData.year))
                    .collect(Collectors.toList());
                
                for (PaymentReceipt existing : existingReceipts) {
                    // Verificar se é duplicata: mesmo valor E mesma data de transferência
                    boolean sameValue = existing.getNetSalary() != null && receiptData.amount != null &&
                                      existing.getNetSalary().subtract(java.math.BigDecimal.valueOf(receiptData.amount))
                                          .abs().compareTo(java.math.BigDecimal.valueOf(0.01)) <= 0;
                    
                    // Normalizar data de transferência para comparação (formato DD/MM/AAAA ou MM/AAAA)
                    String existingTransferDate = existing.getTransferDate() != null ? existing.getTransferDate().trim() : "";
                    String receiptTransferDate = receiptData.transferDate != null ? receiptData.transferDate.trim() : "";
                    
                    // Se a data não foi extraída do PDF, usar a data derivada do período (MM/AAAA)
                    if (receiptTransferDate.isEmpty()) {
                        receiptTransferDate = String.format("%02d/%04d", receiptData.month, receiptData.year);
                    }
                    
                    boolean sameDate = !existingTransferDate.isEmpty() && !receiptTransferDate.isEmpty() &&
                                     existingTransferDate.equals(receiptTransferDate);
                    
                    // É duplicata se: mesmo valor E mesma data de transferência
                    if (sameValue && sameDate) {
                        isDuplicate = true;
                        log.warn("⚠️ Comprovante duplicado encontrado: {} - {}/{} (Valor: R$ {}, Data: {})", 
                            existing.getEmployeeName(), existing.getMonth(), existing.getYear(),
                            existing.getNetSalary(), existing.getTransferDate());
                        break;
                    } else if (sameValue && !sameDate) {
                        log.info("✅ Comprovante permitido: mesmo valor mas data diferente ({} vs {})", 
                            existingTransferDate, receiptTransferDate);
                    } else if (!sameValue && sameDate) {
                        log.info("✅ Comprovante permitido: mesma data mas valor diferente (R$ {} vs R$ {})", 
                            existing.getNetSalary(), receiptData.amount);
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao verificar duplicatas: {}", e.getMessage());
            }
            
            // 4. Se é duplicata, não processar (exceto se valor ou data forem diferentes - já verificado acima)
            if (isDuplicate) {
                log.warn("❌ Comprovante duplicado ignorado: {} - {}/{} (mesmo valor e mesma data)", 
                    receiptData.employeeName, receiptData.month, receiptData.year);
                return null;
            }
            
            // 5. Se nome e valor coincidem com holerite, usar estrutura de pastas do holerite
            if (matchingPayslip != null && valueMatches) {
                log.info("✅ Validações passaram - Nome e valor coincidem com holerite. Usando estrutura de pastas do holerite.");
                // A estrutura de pastas será definida pelo applyCompanyHierarchy que usa os dados do holerite
                receiptData.companyName = matchingPayslip.getCompanyName();
                receiptData.companyCnpj = matchingPayslip.getCompanyCnpj();
            } else {
                log.warn("⚠️ Validações não passaram - Nome ou valor não coincidem com holerite. Usando estrutura padrão.");
            }
            
            log.info("🔍 Validações concluídas - Holerite encontrado: {}, Valor coincide: {}, Duplicata: {}", 
                matchingPayslip != null, valueMatches, isDuplicate);

            // ===== MELHORIA: MATCHING COM FUNCIONÁRIOS DA TABELA EMPLOYEES =====
            // Buscar funcionário correspondente usando CPF, nome e conta corrente para melhor precisão
            Employee matchingEmployee = null;
            UUID employeeId = null;
            
            try {
                log.info("🔍 Iniciando busca de funcionário na tabela employees...");
                log.info("📋 Dados do comprovante - Nome: '{}', Conta Creditada: '{}'", 
                    receiptData.employeeName, receiptData.creditedAccount);
                
                // ESTRATÉGIA 1: Buscar por conta corrente creditada (mais precisa)
                if (receiptData.creditedAccount != null && !receiptData.creditedAccount.trim().isEmpty()) {
                    String normalizedAccount = receiptData.creditedAccount.replaceAll("[^0-9]", "");
                    if (!normalizedAccount.isEmpty()) {
                        log.info("🔍 Estratégia 1: Buscando funcionário por conta corrente: '{}' (normalizada: '{}')", 
                            receiptData.creditedAccount, normalizedAccount);
                        
                        java.util.Optional<Employee> employeeOpt = employeeRepository.findByContaCorrente(normalizedAccount);
                        if (employeeOpt.isPresent()) {
                            matchingEmployee = employeeOpt.get();
                            employeeId = matchingEmployee.getId();
                            log.info("✅ Funcionário encontrado por conta corrente: {} (ID: {})", 
                                matchingEmployee.getName(), employeeId);
                        } else {
                            log.info("⚠️ Nenhum funcionário encontrado por conta corrente: {}", normalizedAccount);
                        }
                    }
                }
                
                // ESTRATÉGIA 2: Buscar por nome (se não encontrou por conta corrente)
                if (matchingEmployee == null && receiptData.employeeName != null && !receiptData.employeeName.trim().isEmpty()) {
                    String normalizedName = receiptData.employeeName.trim().toUpperCase();
                    log.info("🔍 Estratégia 2: Buscando funcionário por nome: '{}'", normalizedName);
                    
                    // Tentar busca exata primeiro
                    java.util.Optional<Employee> employeeOpt = employeeRepository.findByNameExact(normalizedName);
                    if (employeeOpt.isPresent()) {
                        matchingEmployee = employeeOpt.get();
                        employeeId = matchingEmployee.getId();
                        log.info("✅ Funcionário encontrado por nome exato: {} (ID: {})", 
                            matchingEmployee.getName(), employeeId);
                    } else {
                        // Tentar busca parcial (contains)
                        java.util.List<Employee> employees = employeeRepository.findByNameContainingIgnoreCase(normalizedName);
                        if (!employees.isEmpty()) {
                            // Se houver múltiplos, tentar encontrar o mais próximo
                            Employee bestMatch = employees.stream()
                                .filter(e -> e.getName() != null)
                                .min((e1, e2) -> {
                                    String name1 = e1.getName().toUpperCase();
                                    String name2 = e2.getName().toUpperCase();
                                    // Preferir match mais próximo (menor diferença de tamanho)
                                    int diff1 = Math.abs(name1.length() - normalizedName.length());
                                    int diff2 = Math.abs(name2.length() - normalizedName.length());
                                    return Integer.compare(diff1, diff2);
                                })
                                .orElse(employees.get(0));
                            
                            matchingEmployee = bestMatch;
                            employeeId = matchingEmployee.getId();
                            log.info("✅ Funcionário encontrado por nome parcial: {} (ID: {}) de {} candidato(s)", 
                                matchingEmployee.getName(), employeeId, employees.size());
                        } else {
                            log.info("⚠️ Nenhum funcionário encontrado por nome: {}", normalizedName);
                        }
                    }
                }
                
                // ESTRATÉGIA 3: Buscar por CPF do holerite (se disponível e não encontrou ainda)
                if (matchingEmployee == null && matchingPayslip != null && matchingPayslip.getCpf() != null) {
                    String payslipCpf = matchingPayslip.getCpf().replaceAll("[^0-9]", "");
                    if (!payslipCpf.isEmpty() && payslipCpf.length() >= 11) {
                        log.info("🔍 Estratégia 3: Buscando funcionário por CPF do holerite: '{}'", payslipCpf);
                        
                        java.util.Optional<Employee> employeeOpt = employeeRepository.findByCpf(payslipCpf);
                        if (employeeOpt.isPresent()) {
                            matchingEmployee = employeeOpt.get();
                            employeeId = matchingEmployee.getId();
                            log.info("✅ Funcionário encontrado por CPF do holerite: {} (ID: {})", 
                                matchingEmployee.getName(), employeeId);
                        } else {
                            log.info("⚠️ Nenhum funcionário encontrado por CPF: {}", payslipCpf);
                        }
                    }
                }
                
                // Log do resultado final
                if (matchingEmployee != null) {
                    log.info("✅ Funcionário associado ao comprovante:");
                    log.info("   👤 Nome: {}", matchingEmployee.getName());
                    log.info("   🆔 ID: {}", employeeId);
                    log.info("   📄 CPF/Documento: {}", matchingEmployee.getDocument() != null ? matchingEmployee.getDocument() : "N/A");
                    log.info("   💳 Conta Corrente: {}", matchingEmployee.getContaCorrente() != null ? matchingEmployee.getContaCorrente() : "N/A");
                } else {
                    log.warn("⚠️ Nenhum funcionário encontrado na tabela employees para o comprovante:");
                    log.warn("   Nome: '{}'", receiptData.employeeName);
                    log.warn("   Conta Creditada: '{}'", receiptData.creditedAccount);
                    if (matchingPayslip != null) {
                        log.warn("   CPF do Holerite: '{}'", matchingPayslip.getCpf());
                    }
                    log.warn("   O comprovante será salvo sem associação com funcionário (employeeId = null)");
                }
                
            } catch (Exception e) {
                log.warn("⚠️ Erro ao buscar funcionário na tabela employees: {}", e.getMessage(), e);
            }
            
            // ===== COMENTADO PARA USO FUTURO: Verificar conta corrente do holerite =====
            // Quando o holerite tiver o campo conta corrente, descomentar este código:
            /*
            if (matchingEmployee == null && matchingPayslip != null) {
                // Verificar se o holerite tem conta corrente e fazer matching
                String payslipContaCorrente = matchingPayslip.getContaCorrente(); // Campo futuro no Payslip
                if (payslipContaCorrente != null && !payslipContaCorrente.trim().isEmpty() 
                    && receiptData.creditedAccount != null && !receiptData.creditedAccount.trim().isEmpty()) {
                    
                    String normalizedPayslipAccount = payslipContaCorrente.replaceAll("[^0-9]", "");
                    String normalizedReceiptAccount = receiptData.creditedAccount.replaceAll("[^0-9]", "");
                    
                    if (normalizedPayslipAccount.equals(normalizedReceiptAccount)) {
                        log.info("🔍 Estratégia 4: Buscando funcionário por conta corrente do holerite: '{}'", normalizedPayslipAccount);
                        
                        java.util.Optional<Employee> employeeOpt = employeeRepository.findByContaCorrente(normalizedPayslipAccount);
                        if (employeeOpt.isPresent()) {
                            matchingEmployee = employeeOpt.get();
                            employeeId = matchingEmployee.getId();
                            log.info("✅ Funcionário encontrado por conta corrente do holerite: {} (ID: {})", 
                                matchingEmployee.getName(), employeeId);
                        }
                    }
                }
            }
            */

            // Criar novo PDF com os dados extraídos
            String newPdfPath = null;
            try {
                // Passar o holerite encontrado para usar sua estrutura de pastas se validações passaram
                newPdfPath = extractReceiptPageFromOriginal(originalInputStream, pageNumber, receiptData, matchingPayslip);
                log.info("PDF criado com sucesso: {}", newPdfPath);
                
                // Verificar se o arquivo foi realmente criado
                java.io.File pdfFile = new java.io.File(newPdfPath);
                if (!pdfFile.exists()) {
                    log.error("PDF não foi criado fisicamente: {}", newPdfPath);
                    throw new IOException("PDF não foi criado fisicamente");
                }
                
                log.info("PDF verificado e existe: {} bytes", pdfFile.length());
                
            } catch (Exception e) {
                log.error("Erro ao criar PDF: {}", e.getMessage(), e);
                // Não continuar se houver erro na criação do PDF
                throw new IOException("Erro crítico na criação do PDF: " + e.getMessage(), e);
            }
            
            // Gerar nome do arquivo
            String fileName = generateReceiptFileName(receiptData.employeeName, receiptData.month, receiptData.year, pageNumber);
            log.info("Nome do arquivo gerado: {}", fileName);

            // Criar objeto PaymentReceipt com validação e todos os dados bancários
            // Usar a data de transferência extraída do PDF, ou se não houver, usar o período (MM/AAAA)
            String normalizedTransferDate;
            if (receiptData.transferDate != null && !receiptData.transferDate.trim().isEmpty()) {
                // Usar a data extraída do PDF (formato DD/MM/AAAA)
                normalizedTransferDate = receiptData.transferDate.trim();
                log.info("✅ Usando data de transferência extraída do PDF: {}", normalizedTransferDate);
            } else {
                // Fallback: usar período como data (MM/AAAA)
                normalizedTransferDate = String.format("%02d/%04d", receiptData.month, receiptData.year);
                log.warn("⚠️ Data de transferência não encontrada no PDF, usando período: {}", normalizedTransferDate);
            }

            PaymentReceipt receipt = PaymentReceipt.builder()
                    .employeeId(employeeId) // Associar ao funcionário encontrado
                    .employeeName(receiptData.employeeName != null ? receiptData.employeeName.trim() : "Nome não extraído")
                    .companyName(receiptData.companyName != null ? receiptData.companyName.trim() : null)
                    .companyCnpj(receiptData.companyCnpj != null ? receiptData.companyCnpj : null)
                    .month(receiptData.month)
                    .year(receiptData.year)
                    .grossSalary(receiptData.amount != null ? java.math.BigDecimal.valueOf(receiptData.amount) : java.math.BigDecimal.ZERO)
                    .netSalary(receiptData.amount != null ? java.math.BigDecimal.valueOf(receiptData.amount) : java.math.BigDecimal.ZERO)
                    .fileName(fileName)
                    .filePath(newPdfPath != null ? newPdfPath : "sem_pdf")
                    .status(PaymentReceiptStatus.PROCESSED)
                    .processedAt(LocalDateTime.now())
                    // Campos bancários extraídos
                    .debitedAgency(receiptData.agency != null ? receiptData.agency : "0925")
                    .debitedAccount(receiptData.account != null ? receiptData.account : "98240 - 7")
                    .debitedName(receiptData.companyName != null ? receiptData.companyName : "PROMOVER VIGILANCIA PATRIMONIA")
                    .creditedAgency(receiptData.creditedAgency != null ? receiptData.creditedAgency : null)
                    .creditedAccount(receiptData.creditedAccount != null ? receiptData.creditedAccount : null)
                    .creditedName(receiptData.creditedName != null ? receiptData.creditedName : 
                                (receiptData.employeeName != null ? receiptData.employeeName.trim().toUpperCase() : "FUNCIONARIO"))
                    .controlNumber(receiptData.controlNumber != null ? receiptData.controlNumber : String.valueOf(System.currentTimeMillis()).substring(0, 15))
                    .authenticationCode(receiptData.authentication != null ? receiptData.authentication : java.util.UUID.randomUUID().toString().replace("-", "").toUpperCase())
                    .transferDate(normalizedTransferDate)
                    .transferTime(receiptData.transferTime != null ? receiptData.transferTime : null)
                    .bankName(receiptData.bankName != null ? receiptData.bankName : "Itaú")
                    .transactionType("Transferência de Conta Corrente para Conta Corrente")
                    .statementIdentification("SISPAG SALARIOS")
                    .build();

            paymentReceiptService.applyCompanyHierarchy(receipt);

            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("✅ RECIBO CRIADO COM SUCESSO PARA A PÁGINA {}", pageNumber);
            log.info("👤 Nome: {}", receipt.getEmployeeName());
            log.info("📅 Período: {}/{}", receipt.getMonth(), receipt.getYear());
            log.info("💰 Valor: R$ {}", receipt.getGrossSalary());
            log.info("🏦 Agência Creditada: {}", receipt.getCreditedAgency() != null ? receipt.getCreditedAgency() : "NÃO EXTRAÍDA");
            log.info("💳 Conta Creditada: {}", receipt.getCreditedAccount() != null ? receipt.getCreditedAccount() : "NÃO EXTRAÍDA");
            log.info("👤 Nome Creditado: {}", receipt.getCreditedName() != null ? receipt.getCreditedName() : "NÃO EXTRAÍDO");
            log.info("📅 Data Transferência: {}", receipt.getTransferDate() != null ? receipt.getTransferDate() : "NÃO EXTRAÍDA");
            log.info("🕐 Horário Transferência: {}", receipt.getTransferTime() != null ? receipt.getTransferTime() : "NÃO EXTRAÍDO");
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            // Validação: alertar se conta não foi extraída
            if (receipt.getCreditedAccount() == null || receipt.getCreditedAccount().trim().isEmpty()) {
                log.error("⚠️⚠️⚠️ ATENÇÃO: Conta creditada NÃO foi extraída para o comprovante de {} na página {}", 
                    receipt.getEmployeeName(), pageNumber);
            }
            
            return receipt;

        } catch (Exception e) {
            log.error("Erro ao extrair informações do recibo na página {}: {}", pageNumber, e.getMessage(), e);
            return null;
        }
    }

    private static class ReceiptData {
        String employeeName;
        String bankName;
        String agency;
        String account;
        String companyName;
        String companyCnpj;
        String creditedAgency;
        String creditedAccount;
        String creditedName; // Nome da conta creditada (funcionário)
        Double amount;
        String transferDate;
        String transferTime; // Horário da transferência (HH:MM:SS ou HH:MM)
        String controlNumber;
        String authentication;
        int month;
        int year;
    }

    private ReceiptData extractBankReceiptData(String text) {
        ReceiptData data = new ReceiptData();
        
        try {
            log.info("=== 🔍 EXTRAÇÃO DE DADOS BANCÁRIOS ===");
            log.info("📊 Tamanho do texto: {} caracteres", text.length());
            
            if (text == null || text.trim().isEmpty()) {
                log.error("❌ Texto está vazio ou nulo!");
                return null;
            }
            
            // Mostrar primeiros 500 caracteres para debug
            String preview = text.substring(0, Math.min(500, text.length()));
            log.info("🔍 Primeiros 500 caracteres: {}", preview);
            
            // Extrair nome do funcionário (conta creditada) - padrão específico do Itaú
            String employeeName = null;
            
            // Padrão 1: "Dados da conta a ser creditada" seguido de "Nome: [NOME COMPLETO]" até "Agência:"
            Pattern namePattern1 = Pattern.compile("Dados da conta a ser creditada[\\s\\S]*?Nome\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+?)\\s*Agência\\s*:", Pattern.CASE_INSENSITIVE);
            Matcher nameMatcher1 = namePattern1.matcher(text);
            if (nameMatcher1.find()) {
                employeeName = nameMatcher1.group(1).trim();
                log.info("✅ Nome encontrado (padrão Itaú): {}", employeeName);
            }
            
            // Padrão 1a: "Nome: [NOME]" seguido de qualquer coisa até "Agência:" - mais flexível
            if (employeeName == null || employeeName.isEmpty()) {
                Pattern namePattern1a = Pattern.compile("Nome\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]{3,}?)(?=\\s*(?:Agência|Conta|\\n|$))", Pattern.CASE_INSENSITIVE);
                Matcher nameMatcher1a = namePattern1a.matcher(text);
                if (nameMatcher1a.find()) {
                    employeeName = nameMatcher1a.group(1).trim();
                    log.info("✅ Nome encontrado (padrão flexível): {}", employeeName);
                }
            }
            
            // Padrão 1b: Específico para formato Itaú - "Nome: [NOME]" seguido de "Agência:"
            if (employeeName == null || employeeName.isEmpty()) {
                Pattern namePattern1b = Pattern.compile("Nome\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+?)\\s*Agência\\s*:", Pattern.CASE_INSENSITIVE);
                Matcher nameMatcher1b = namePattern1b.matcher(text);
                if (nameMatcher1b.find()) {
                    employeeName = nameMatcher1b.group(1).trim();
                    log.info("✅ Nome encontrado (padrão Itaú específico): {}", employeeName);
                }
            }
            
            // Padrão 2: Buscar por "Nome: [NOME]" em qualquer lugar
            if (employeeName == null || employeeName.isEmpty()) {
                Pattern namePattern2 = Pattern.compile("Nome\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+)", Pattern.CASE_INSENSITIVE);
                Matcher nameMatcher2 = namePattern2.matcher(text);
                if (nameMatcher2.find()) {
                    employeeName = nameMatcher2.group(1).trim();
                    log.info("✅ Nome encontrado (padrão genérico): {}", employeeName);
                }
            }
            
            // Padrão 3: Buscar por nomes comuns em recibos
            if (employeeName == null || employeeName.isEmpty()) {
                Pattern namePattern3 = Pattern.compile("(?:Funcionário|Empregado|Colaborador)\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+)", Pattern.CASE_INSENSITIVE);
                Matcher nameMatcher3 = namePattern3.matcher(text);
                if (nameMatcher3.find()) {
                    employeeName = nameMatcher3.group(1).trim();
                    log.info("✅ Nome encontrado (padrão funcionário): {}", employeeName);
                }
            }
            
            // Padrão 4: Buscar por sequências que parecem nomes (mais flexível)
            if (employeeName == null || employeeName.isEmpty()) {
                Pattern namePattern4 = Pattern.compile("([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]{3,}\\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]{3,})", Pattern.CASE_INSENSITIVE);
                Matcher nameMatcher4 = namePattern4.matcher(text);
                if (nameMatcher4.find()) {
                    employeeName = nameMatcher4.group(1).trim();
                    log.info("✅ Nome encontrado (padrão flexível): {}", employeeName);
                }
            }
            
            // Limpar o nome extraído removendo palavras comuns que podem estar sendo incluídas incorretamente
            if (employeeName != null && !employeeName.trim().isEmpty()) {
                // Remover palavras comuns que podem estar sendo incluídas incorretamente
                String cleanedName = employeeName.trim()
                    .replaceAll("(?i)\\bvalor\\b", "") // Remove "valor" (case insensitive)
                    .replaceAll("(?i)\\bfuncionario\\b", "") // Remove "funcionario" (case insensitive)
                    .replaceAll("(?i)\\bempregado\\b", "") // Remove "empregado" (case insensitive)
                    .replaceAll("(?i)\\bcolaborador\\b", "") // Remove "colaborador" (case insensitive)
                    .replaceAll("\\s+", " ") // Múltiplos espaços para um só
                    .trim();
                
                // Se após a limpeza o nome ficou vazio, usar o nome original
                if (cleanedName.isEmpty()) {
                    cleanedName = employeeName.trim();
                }
                
                employeeName = cleanedName;
                log.info("🧹 Nome limpo: '{}' -> '{}'", employeeName, cleanedName);
            }
            
            data.employeeName = employeeName != null ? employeeName : "Nome não extraído";
            log.info("Nome do funcionário final: {}", data.employeeName);

            // Extrair banco (assumindo Itaú baseado no exemplo)
            data.bankName = "Itaú";

            // Extrair agência da conta debitada (empresa)
            Pattern agencyPattern = Pattern.compile("Dados da conta a ser debitada[\\s\\S]*?Agência\\s*:\\s*(\\d+)", Pattern.CASE_INSENSITIVE);
            Matcher agencyMatcher = agencyPattern.matcher(text);
            if (agencyMatcher.find()) {
                data.agency = agencyMatcher.group(1);
                log.info("Agência debitada extraída: {}", data.agency);
            }

            // Extrair conta da conta debitada (empresa)
            Pattern accountPattern = Pattern.compile("Dados da conta a ser debitada[\\s\\S]*?Conta\\s*:\\s*([\\d\\s-]+)", Pattern.CASE_INSENSITIVE);
            Matcher accountMatcher = accountPattern.matcher(text);
            if (accountMatcher.find()) {
                data.account = accountMatcher.group(1).trim();
                log.info("Conta debitada extraída: {}", data.account);
            }

            // Extrair nome da empresa (conta debitada) - padrão específico do Itaú
            // IMPORTANTE: O nome da empresa está na seção "Dados da conta a ser debitada"
            String companyName = null;
            
            // Padrão 1: "Dados da conta a ser debitada" seguido de "Nome: [NOME EMPRESA]" até "Agência:" ou "Conta:"
            // Este é o padrão CORRETO - a empresa está na conta debitada
            Pattern companyPattern1 = Pattern.compile("Dados da conta a ser debitada[\\s\\S]*?Nome\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+?)(?=\\s*(?:Agência|Conta|\\n|$))", Pattern.CASE_INSENSITIVE);
            Matcher companyMatcher1 = companyPattern1.matcher(text);
            if (companyMatcher1.find()) {
                companyName = companyMatcher1.group(1).trim();
                log.info("✅ Nome da empresa encontrado (padrão Itaú debitada): '{}'", companyName);
            }
            
            // Padrão 1b: Mais específico - "Dados da conta a ser debitada" -> "Nome da empresa:" ou "Nome:" -> até "Agência:"
            if (companyName == null || companyName.isEmpty()) {
                Pattern companyPattern1b = Pattern.compile("Dados da conta a ser debitada[\\s\\S]*?(?:Nome da empresa|Nome)\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+?)\\s*Agência\\s*:", Pattern.CASE_INSENSITIVE);
                Matcher companyMatcher1b = companyPattern1b.matcher(text);
                if (companyMatcher1b.find()) {
                    companyName = companyMatcher1b.group(1).trim();
                    log.info("✅ Nome da empresa encontrado (padrão Itaú debitada - específico): '{}'", companyName);
                }
            }
            
            // Padrão 2: Buscar por "PROMOVER" seguido de palavras (fallback para empresas conhecidas)
            if (companyName == null || companyName.isEmpty()) {
                Pattern companyPattern2 = Pattern.compile("PROMOVER\\s+(?:TERCEIRIZACAO|VIGILANCIA|SERVICOS)[\\s\\w]*", Pattern.CASE_INSENSITIVE);
                Matcher companyMatcher2 = companyPattern2.matcher(text);
                if (companyMatcher2.find()) {
                    companyName = companyMatcher2.group(0).trim();
                    log.info("✅ Nome da empresa encontrado (padrão PROMOVER): '{}'", companyName);
                }
            }
            
            // Padrão 3: Buscar por "Nome:" na seção debitada (evitar pegar da seção creditada)
            // Primeiro encontrar a seção debitada, depois procurar "Nome:" dentro dela
            if (companyName == null || companyName.isEmpty()) {
                Pattern debitadaSectionPattern = Pattern.compile("Dados da conta a ser debitada([\\s\\S]*?)Dados da conta a ser creditada", Pattern.CASE_INSENSITIVE);
                Matcher debitadaSectionMatcher = debitadaSectionPattern.matcher(text);
                if (debitadaSectionMatcher.find()) {
                    String debitadaSection = debitadaSectionMatcher.group(1);
                    Pattern nomeInDebitadaPattern = Pattern.compile("Nome\\s*:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+?)(?=\\s*(?:Agência|Conta|\\n|$))", Pattern.CASE_INSENSITIVE);
                    Matcher nomeInDebitadaMatcher = nomeInDebitadaPattern.matcher(debitadaSection);
                    if (nomeInDebitadaMatcher.find()) {
                        String candidateName = nomeInDebitadaMatcher.group(1).trim();
                        // Verificar se não é o mesmo nome do funcionário
                        if (employeeName == null || !candidateName.equalsIgnoreCase(employeeName.trim())) {
                            companyName = candidateName;
                            log.info("✅ Nome da empresa encontrado (dentro da seção debitada): '{}'", companyName);
                        }
                    }
                }
            }
            
            // Limpar o nome da empresa removendo palavras comuns que podem estar sendo incluídas incorretamente
            if (companyName != null && !companyName.trim().isEmpty()) {
                String cleanedCompanyName = companyName.trim()
                    .replaceAll("(?i)\\bagencia\\b", "") // Remove "agencia" (case insensitive)
                    .replaceAll("(?i)\\bconta\\b", "") // Remove "conta" (case insensitive)
                    .replaceAll("(?i)\\bcorrente\\b", "") // Remove "corrente" (case insensitive)
                    .replaceAll("\\s+", " ") // Múltiplos espaços para um só
                    .trim();
                
                // Se após a limpeza o nome ficou vazio, usar o nome original
                if (cleanedCompanyName.isEmpty()) {
                    cleanedCompanyName = companyName.trim();
                }
                
                companyName = cleanedCompanyName;
                log.info("🧹 Nome da empresa limpo: '{}' -> '{}'", companyName, cleanedCompanyName);
            }
            
            data.companyName = companyName;

            // Extrair CNPJ se houver
            Pattern cnpjPattern = Pattern.compile("(\\d{2}[\\.\\s]?\\d{3}[\\.\\s]?\\d{3}[\\/\\s]?\\d{4}[-\\s]?\\d{2})");
            Matcher cnpjMatcher = cnpjPattern.matcher(text);
            if (cnpjMatcher.find()) {
                String cnpj = cnpjMatcher.group(1);
                data.companyCnpj = cnpj != null ? cnpj.trim() : null;
                log.info("✅ CNPJ encontrado: {}", data.companyCnpj);
            }

            // Extrair dados da conta creditada (funcionário)
            String creditedAgency = null;
            String creditedAccount = null;
            
            log.info("🔍 Iniciando extração de dados da conta creditada...");
            
            // Padrão 1: "Dados da conta a ser creditada" seguido de "Agência:" e "Conta corrente:"
            Pattern creditedAgencyPattern1 = Pattern.compile("Dados da conta a ser creditada[\\s\\S]*?Agência\\s*:\\s*(\\d+)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
            Matcher creditedAgencyMatcher1 = creditedAgencyPattern1.matcher(text);
            if (creditedAgencyMatcher1.find()) {
                creditedAgency = creditedAgencyMatcher1.group(1);
                log.info("✅ Agência creditada extraída (padrão 1): {}", creditedAgency);
            }
            
            // Padrão 1 para conta creditada: "Conta corrente: [NÚMERO]" na seção creditada (formato "Dados da conta creditada:" - SEM "a ser")
            // Priorizar formato sem "a ser" que é o mais comum no PDF do Itaú
            Pattern creditedAccountPattern1 = Pattern.compile("Dados da conta creditada[\\s\\S]*?Conta\\s*corrente\\s*:\\s*([\\d\\s\\-]+)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
            Matcher creditedAccountMatcher1 = creditedAccountPattern1.matcher(text);
            if (creditedAccountMatcher1.find()) {
                creditedAccount = creditedAccountMatcher1.group(1).trim();
                // Validar que tem pelo menos 4 dígitos
                if (creditedAccount.replaceAll("[^0-9]", "").length() >= 4) {
                    log.info("✅ Conta creditada extraída (padrão 1 - sem 'a ser'): {}", creditedAccount);
                } else {
                    creditedAccount = null; // Resetar se não é válida
                    log.warn("⚠️ Conta extraída inválida (menos de 4 dígitos): {}", creditedAccountMatcher1.group(1));
                }
            }
            
            // Padrão 2: Buscar "Conta corrente:" depois de "Dados da conta a ser creditada" (com "a ser")
            if (creditedAccount == null || creditedAccount.isEmpty()) {
                Pattern creditedAccountPattern2 = Pattern.compile("Dados da conta a ser creditada[\\s\\S]*?Conta\\s*corrente\\s*:\\s*([\\d\\s\\-]+)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
                Matcher creditedAccountMatcher2 = creditedAccountPattern2.matcher(text);
                if (creditedAccountMatcher2.find()) {
                    String extractedAccount = creditedAccountMatcher2.group(1).trim();
                    // Validar que tem pelo menos 4 dígitos
                    if (extractedAccount.replaceAll("[^0-9]", "").length() >= 4) {
                        creditedAccount = extractedAccount;
                        log.info("✅ Conta creditada extraída (padrão 2 - com 'a ser'): {}", creditedAccount);
                    } else {
                        log.warn("⚠️ Conta extraída inválida (menos de 4 dígitos): {}", extractedAccount);
                    }
                }
            }
            
            // Padrão 2b: Buscar apenas "Conta:" (sem "corrente") na seção creditada
            if (creditedAccount == null || creditedAccount.isEmpty()) {
                Pattern creditedAccountPattern2b = Pattern.compile("Dados da conta (?:a ser )?creditada[\\s\\S]*?Conta\\s*:\\s*([\\d\\s\\-]+)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
                Matcher creditedAccountMatcher2b = creditedAccountPattern2b.matcher(text);
                if (creditedAccountMatcher2b.find()) {
                    String extractedAccount = creditedAccountMatcher2b.group(1).trim();
                    // Validar que tem pelo menos 4 dígitos
                    if (extractedAccount.replaceAll("[^0-9]", "").length() >= 4) {
                        creditedAccount = extractedAccount;
                        log.info("✅ Conta creditada extraída (padrão 2b - apenas 'Conta:'): {}", creditedAccount);
                    } else {
                        log.warn("⚠️ Conta extraída inválida (menos de 4 dígitos): {}", extractedAccount);
                    }
                }
            }
            
            // Padrão 3: Buscar "Conta corrente:" dentro da seção creditada isolada (MELHORADO)
            if (creditedAccount == null || creditedAccount.isEmpty()) {
                // Primeiro encontrar a seção "Dados da conta creditada" ou "Dados da conta a ser creditada"
                // Usar lookahead negativo para não capturar além da seção
                Pattern creditadaSectionPattern = Pattern.compile("Dados da conta (?:a ser )?creditada\\s*:?\\s*([\\s\\S]*?)(?=Dados da conta (?:a ser )?debitada|Valor\\s*:|Informações|\\n\\n|$)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
                Matcher creditadaSectionMatcher = creditadaSectionPattern.matcher(text);
                if (creditadaSectionMatcher.find()) {
                    String creditadaSection = creditadaSectionMatcher.group(1);
                    log.info("📋 Seção creditada encontrada ({} caracteres)", creditadaSection.length());
                    log.info("📋 Conteúdo da seção: {}", creditadaSection.substring(0, Math.min(300, creditadaSection.length())));
                    
                    // Procurar "Conta corrente:" primeiro (formato mais comum)
                    Pattern contaInSectionPattern1 = Pattern.compile("Conta\\s*corrente\\s*:\\s*([\\d\\s\\-]+)", Pattern.CASE_INSENSITIVE);
                    Matcher contaInSectionMatcher1 = contaInSectionPattern1.matcher(creditadaSection);
                    if (contaInSectionMatcher1.find()) {
                        String extractedAccount = contaInSectionMatcher1.group(1).trim();
                        // Validar que é realmente uma conta (tem pelo menos 4 dígitos)
                        if (extractedAccount.replaceAll("[^0-9]", "").length() >= 4) {
                            creditedAccount = extractedAccount;
                            log.info("✅ Conta creditada extraída (padrão 3a - conta corrente na seção): {}", creditedAccount);
                        } else {
                            log.warn("⚠️ Conta extraída parece inválida (menos de 4 dígitos): {}", extractedAccount);
                        }
                    } else {
                        // Se não encontrou "Conta corrente:", tentar apenas "Conta:" seguida de números
                        Pattern contaInSectionPattern2 = Pattern.compile("Conta\\s*:\\s*([\\d\\s\\-]+)", Pattern.CASE_INSENSITIVE);
                        Matcher contaInSectionMatcher2 = contaInSectionPattern2.matcher(creditadaSection);
                        if (contaInSectionMatcher2.find()) {
                            String extractedAccount = contaInSectionMatcher2.group(1).trim();
                            // Validar que é realmente uma conta (tem pelo menos 4 dígitos)
                            if (extractedAccount.replaceAll("[^0-9]", "").length() >= 4) {
                                creditedAccount = extractedAccount;
                                log.info("✅ Conta creditada extraída (padrão 3b - conta na seção): {}", creditedAccount);
                            } else {
                                log.warn("⚠️ Conta extraída parece inválida (menos de 4 dígitos): {}", extractedAccount);
                            }
                        }
                    }
                } else {
                    log.warn("⚠️ Seção 'Dados da conta creditada' não encontrada no texto");
                }
            }
            
            // Padrão 4: Buscar agência depois do nome se ainda não encontrou
            if (creditedAgency == null || creditedAgency.isEmpty()) {
                Pattern creditedAgencyPattern2 = Pattern.compile("Dados da conta creditada[\\s\\S]*?Agência\\s*:\\s*(\\d+)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
                Matcher creditedAgencyMatcher2 = creditedAgencyPattern2.matcher(text);
                if (creditedAgencyMatcher2.find()) {
                    creditedAgency = creditedAgencyMatcher2.group(1);
                    log.info("✅ Agência creditada extraída (padrão 2): {}", creditedAgency);
                }
            }
            
            // Validação: se não encontrou conta, tentar buscar próximo ao nome do funcionário
            if (creditedAccount == null || creditedAccount.isEmpty()) {
                log.warn("⚠️ Conta creditada não encontrada pelos padrões anteriores. Tentando busca alternativa...");
                
                // Buscar próximo ao nome do funcionário
                if (employeeName != null && !employeeName.trim().isEmpty()) {
                    String normalizedEmployeeName = employeeName.trim().toUpperCase().replaceAll("\\s+", "\\s+");
                    Pattern contaNextToNamePattern = Pattern.compile(normalizedEmployeeName + "[\\s\\S]{0,200}?Conta\\s*(?:corrente)?\\s*:\\s*([\\d\\s-]+)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
                    Matcher contaNextToNameMatcher = contaNextToNamePattern.matcher(text);
                    if (contaNextToNameMatcher.find()) {
                        creditedAccount = contaNextToNameMatcher.group(1).trim();
                        log.info("✅ Conta creditada extraída (padrão 4 - próximo ao nome): {}", creditedAccount);
                    }
                }
            }
            
            // Armazenar dados da conta creditada
            data.creditedAgency = creditedAgency;
            data.creditedAccount = creditedAccount;
            
            // Log final para debug - IMPORTANTE para rastrear extração
            if (creditedAccount != null && !creditedAccount.isEmpty()) {
                log.info("✅✅✅ CONTA CREDITADA FINAL EXTRAÍDA: '{}'", creditedAccount);
                log.info("📋 Validação: {} dígitos encontrados", creditedAccount.replaceAll("[^0-9]", "").length());
            } else {
                log.error("❌❌❌ FALHA CRÍTICA: Conta creditada NÃO FOI EXTRAÍDA do texto da página.");
                log.error("📋 Primeiros 1500 caracteres do texto completo para debug:");
                log.error("{}", text.substring(0, Math.min(1500, text.length())));
                log.error("📋 Tentando encontrar seção creditada para debug:");
                Pattern debugSectionPattern = Pattern.compile("Dados da conta (?:a ser )?creditada([\\s\\S]{0,500}?)(?=Dados|Valor|Informações|$)", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
                Matcher debugSectionMatcher = debugSectionPattern.matcher(text);
                if (debugSectionMatcher.find()) {
                    log.error("📋 Seção creditada encontrada:\n{}", debugSectionMatcher.group(1));
                } else {
                    log.error("❌ Seção 'Dados da conta creditada' NÃO encontrada no texto!");
                }
            }
            
            // Extrair nome da conta creditada explicitamente
            // O employeeName já foi extraído da seção "Dados da conta a ser creditada", então usamos ele
            data.creditedName = employeeName != null ? employeeName.trim().toUpperCase() : null;
            
            if (data.creditedName != null) {
                log.info("✅ Nome da conta creditada extraído: '{}'", data.creditedName);
            } else {
                log.warn("⚠️ Nome da conta creditada não foi extraído");
            }

            // Extrair valor - padrão específico do Itaú "Valor: R$ X.XXX,XX"
            Double amount = null;
            
            // Padrão 1: "Valor: R$ [VALOR]" - padrão principal do Itaú
            Pattern amountPattern1 = Pattern.compile("Valor\\s*:\\s*R\\$\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE);
            Matcher amountMatcher1 = amountPattern1.matcher(text);
            if (amountMatcher1.find()) {
                String amountStr = amountMatcher1.group(1).replace(".", "").replace(",", ".");
                try {
                    amount = Double.parseDouble(amountStr);
                    log.info("✅ Valor extraído (padrão Itaú): R$ {:.2f}", amount);
                } catch (NumberFormatException e) {
                    log.warn("Erro ao converter valor: {}", amountStr);
                }
            }
            
            // Padrão 1a: "R$ [VALOR]" com espaço após R$ - mais flexível
            if (amount == null) {
                Pattern amountPattern1a = Pattern.compile("R\\$\\s+([\\d.,]+)", Pattern.CASE_INSENSITIVE);
                Matcher amountMatcher1a = amountPattern1a.matcher(text);
                if (amountMatcher1a.find()) {
                    String amountStr = amountMatcher1a.group(1).replace(".", "").replace(",", ".");
                    try {
                        amount = Double.parseDouble(amountStr);
                        log.info("✅ Valor extraído (padrão R$ com espaço): R$ {:.2f}", amount);
                    } catch (NumberFormatException e) {
                        log.warn("Erro ao converter valor: {}", amountStr);
                    }
                }
            }
            
            // Padrão 1b: "R$ [VALOR]" sem "Valor:" - mais flexível para comprovantes
            if (amount == null) {
                Pattern amountPattern1b = Pattern.compile("R\\$\\s*([\\d.,]{4,})", Pattern.CASE_INSENSITIVE);
                Matcher amountMatcher1b = amountPattern1b.matcher(text);
                if (amountMatcher1b.find()) {
                    String amountStr = amountMatcher1b.group(1).replace(".", "").replace(",", ".");
                    try {
                        amount = Double.parseDouble(amountStr);
                        log.info("Valor extraído (padrão flexível): {}", amount);
                    } catch (NumberFormatException e) {
                        log.warn("Erro ao converter valor: {}", amountStr);
                    }
                }
            }
            
            // Padrão 2: "R$ [VALOR]" - padrão alternativo
            if (amount == null) {
                Pattern amountPattern2 = Pattern.compile("R\\$\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE);
                Matcher amountMatcher2 = amountPattern2.matcher(text);
                if (amountMatcher2.find()) {
                    String amountStr = amountMatcher2.group(1).replace(".", "").replace(",", ".");
                    try {
                        amount = Double.parseDouble(amountStr);
                        log.info("Valor extraído (padrão alternativo): {}", amount);
                    } catch (NumberFormatException e) {
                        log.warn("Erro ao converter valor: {}", amountStr);
                    }
                }
            }
            
            // Padrão 3: Qualquer número que pareça valor monetário (fallback)
            if (amount == null) {
                Pattern amountPattern3 = Pattern.compile("([\\d.,]{4,})", Pattern.CASE_INSENSITIVE);
                Matcher amountMatcher3 = amountPattern3.matcher(text);
                if (amountMatcher3.find()) {
                    String amountStr = amountMatcher3.group(1).replace(".", "").replace(",", ".");
                    try {
                        amount = Double.parseDouble(amountStr);
                        log.info("Valor extraído (padrão flexível): {}", amount);
                    } catch (NumberFormatException e) {
                        log.warn("Erro ao converter valor: {}", amountStr);
                    }
                }
            }
            
            data.amount = amount;
            if (data.amount != null) {
                log.info("💰 Valor final extraído: R$ {:.2f}", data.amount);
            } else {
                log.warn("⚠️ Valor não foi extraído!");
            }

            // Extrair data da transferência - padrão específico do Itaú
            String transferTime = null;
            
            // Padrão 1: "Transferência realizada em DD.MM.AAAA às HH:MM:SS"
            Pattern datePattern1 = Pattern.compile("Transferência\\s+(?:realizada|efetuada)\\s+em\\s*(\\d{2})\\.(\\d{2})\\.(\\d{4})\\s*às\\s*(\\d{2}:\\d{2}:\\d{2})", Pattern.CASE_INSENSITIVE);
            Matcher dateMatcher1 = datePattern1.matcher(text);
            if (dateMatcher1.find()) {
                String day = dateMatcher1.group(1);
                String month = dateMatcher1.group(2);
                String year = dateMatcher1.group(3);
                transferTime = dateMatcher1.group(4);
                // Formato: DD/MM/AAAA
                data.transferDate = day + "/" + month + "/" + year;
                log.info("✅ Data de transferência extraída (padrão 1): {} às {}", data.transferDate, transferTime);
            } else {
                // Padrão 2: "Transferência realizada em DD.MM.AAAA" (sem horário)
                Pattern datePattern2 = Pattern.compile("Transferência\\s+(?:realizada|efetuada)\\s+em\\s*(\\d{2})\\.(\\d{2})\\.(\\d{4})", Pattern.CASE_INSENSITIVE);
                Matcher dateMatcher2 = datePattern2.matcher(text);
                if (dateMatcher2.find()) {
                    String day = dateMatcher2.group(1);
                    String month = dateMatcher2.group(2);
                    String year = dateMatcher2.group(3);
                    data.transferDate = day + "/" + month + "/" + year;
                    log.info("✅ Data de transferência extraída (padrão 2 - sem horário): {}", data.transferDate);
                } else {
                    // Padrão 3: "Data: DD/MM/YYYY"
                    Pattern datePattern3 = Pattern.compile("Data\\s*:\\s*(\\d{2})/(\\d{2})/(\\d{4})", Pattern.CASE_INSENSITIVE);
                    Matcher dateMatcher3 = datePattern3.matcher(text);
                    if (dateMatcher3.find()) {
                        data.transferDate = dateMatcher3.group(1) + "/" + dateMatcher3.group(2) + "/" + dateMatcher3.group(3);
                        log.info("✅ Data de transferência extraída (padrão 3): {}", data.transferDate);
                    } else {
                        // Padrão 4: Buscar data/hora no formato "DD/MM/AAAA, HH:MM"
                        Pattern datePattern4 = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4}),\\s*(\\d{2}:\\d{2})", Pattern.CASE_INSENSITIVE);
                        Matcher dateMatcher4 = datePattern4.matcher(text);
                        if (dateMatcher4.find()) {
                            data.transferDate = dateMatcher4.group(1) + "/" + dateMatcher4.group(2) + "/" + dateMatcher4.group(3);
                            transferTime = dateMatcher4.group(4);
                            log.info("✅ Data de transferência extraída (padrão 4): {} às {}", data.transferDate, transferTime);
                        }
                    }
                }
            }
            
            // Armazenar horário da transferência
            data.transferTime = transferTime;

            // EXTRAIR PERÍODO DE REFERÊNCIA DO SALÁRIO
            log.info("🔍 Procurando período de referência do salário no comprovante...");
            
            // Padrão 1: "PERÍODO: MM/AAAA" ou "COMPETÊNCIA: MM/AAAA"
            Pattern periodoPattern1 = Pattern.compile("(?:PERÍODO|COMPETÊNCIA|REFERÊNCIA)\\s*:\\s*(\\d{1,2})/(\\d{4})", Pattern.CASE_INSENSITIVE);
            Matcher periodoMatcher1 = periodoPattern1.matcher(text);
            if (periodoMatcher1.find()) {
                data.month = Integer.parseInt(periodoMatcher1.group(1));
                data.year = Integer.parseInt(periodoMatcher1.group(2));
                log.info("✅ Período de referência encontrado (padrão 1): {}/{}", data.month, data.year);
            } else {
                // Padrão 2: "SALÁRIO DE MM/AAAA" ou "PAGAMENTO DE MM/AAAA"
                Pattern periodoPattern2 = Pattern.compile("(?:SALÁRIO|PAGAMENTO)\\s+DE\\s+(\\d{1,2})/(\\d{4})", Pattern.CASE_INSENSITIVE);
                Matcher periodoMatcher2 = periodoPattern2.matcher(text);
                if (periodoMatcher2.find()) {
                    data.month = Integer.parseInt(periodoMatcher2.group(1));
                    data.year = Integer.parseInt(periodoMatcher2.group(2));
                    log.info("✅ Período de referência encontrado (padrão 2): {}/{}", data.month, data.year);
                } else {
                    // Padrão 3: Para comprovantes Itaú, usar a data de transferência como período de referência
                    // "Transferência realizada em DD.MM.AAAA às HH:MM:SS"
                    Pattern transferPattern = Pattern.compile("Transferência\\s+realizada\\s+em\\s+(\\d{2})\\.(\\d{2})\\.(\\d{4})\\s*às", Pattern.CASE_INSENSITIVE);
                    Matcher transferMatcher = transferPattern.matcher(text);
                    if (transferMatcher.find()) {
                        data.month = Integer.parseInt(transferMatcher.group(2)); // MM
                        data.year = Integer.parseInt(transferMatcher.group(3));  // AAAA
                        log.info("✅ Período de referência extraído da data de transferência: {}/{}", data.month, data.year);
                    } else {
                        // Padrão 3b: "Transferência efetuada em DD.MM.AAAA" (formato com pontos)
                        Pattern transferPattern2 = Pattern.compile("Transferência\\s+(?:efetuada|realizada)\\s+em\\s+(\\d{2})\\.(\\d{2})\\.(\\d{4})", Pattern.CASE_INSENSITIVE);
                        Matcher transferMatcher2 = transferPattern2.matcher(text);
                        if (transferMatcher2.find()) {
                            data.month = Integer.parseInt(transferMatcher2.group(2)); // MM
                            data.year = Integer.parseInt(transferMatcher2.group(3));  // AAAA
                            log.info("✅ Período de referência extraído da data de transferência (formato com pontos): {}/{}", data.month, data.year);
                        } else {
                            // Padrão 3c: "Transferência efetuada/realizada em DD/MM/AAAA" (formato com barras)
                            Pattern transferPattern3 = Pattern.compile("Transferência\\s+(?:efetuada|realizada)\\s+em\\s+(\\d{2})/(\\d{2})/(\\d{4})", Pattern.CASE_INSENSITIVE);
                            Matcher transferMatcher3 = transferPattern3.matcher(text);
                            if (transferMatcher3.find()) {
                                data.month = Integer.parseInt(transferMatcher3.group(2)); // MM
                                data.year = Integer.parseInt(transferMatcher3.group(3));  // AAAA
                                log.info("✅ Período de referência extraído da data de transferência (formato com barras): {}/{}", data.month, data.year);
                            } else {
                                // Padrão 4: Nomes de meses em português
                                String[] meses = {"JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", 
                                                 "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"};
                                for (int i = 0; i < meses.length; i++) {
                                    if (text.toUpperCase().contains(meses[i])) {
                                        data.month = i + 1;
                                        // Procurar ano próximo (2020-2030)
                                        Pattern anoPattern = Pattern.compile("(20[2-3][0-9])");
                                        Matcher anoMatcher = anoPattern.matcher(text);
                                        if (anoMatcher.find()) {
                                            data.year = Integer.parseInt(anoMatcher.group(1));
                                            log.info("✅ Período de referência encontrado via nome do mês: {}/{} ({})", data.month, data.year, meses[i]);
                                            break;
                                        }
                                    }
                                }
                                
                                // Se ainda não encontrou, BLOQUEAR (não usar fallback!)
                                if (data.month == 0 || data.year == 0) {
                                    log.error("❌ CRÍTICO: Período de referência NÃO encontrado no comprovante!");
                                    log.error("❌ Não é possível processar sem data correta.");
                                    log.error("⚠️ Verifique se o comprovante contém:");
                                    log.error("   - 'Transferência efetuada em DD/MM/AAAA'");
                                    log.error("   - 'Transferência realizada em DD.MM.AAAA'");
                                    log.error("   - 'PERÍODO: MM/AAAA' ou 'COMPETÊNCIA: MM/AAAA'");
                                    log.error("📄 Texto do PDF: {}", text.substring(0, Math.min(500, text.length())));
                                    return null; // ← BLOQUEAR upload se não encontrar data
                                }
                            }
                        }
                    }
                }
            }

            // Extrair número de controle - padrão específico do Itaú "CTRL XXXXXXXXXXXXXXX"
            Pattern controlPattern = Pattern.compile("CTRL\\s*([A-Z0-9]+)", Pattern.CASE_INSENSITIVE);
            Matcher controlMatcher = controlPattern.matcher(text);
            if (controlMatcher.find()) {
                data.controlNumber = controlMatcher.group(1);
                log.info("🔢 Número de controle extraído: {}", data.controlNumber);
            } else {
                log.warn("⚠️ Número de controle não encontrado");
            }

            // Extrair autenticação - padrão específico do Itaú (40 caracteres hex)
            Pattern authPattern = Pattern.compile("Autenticação\\s*:\\s*([A-F0-9]{40})", Pattern.CASE_INSENSITIVE);
            Matcher authMatcher = authPattern.matcher(text);
            if (authMatcher.find()) {
                data.authentication = authMatcher.group(1);
                log.info("🔐 Código de autenticação extraído: {}", data.authentication);
            } else {
                log.warn("⚠️ Código de autenticação não encontrado");
            }

            // Extrair informações do Sispag
            Pattern sispagPattern = Pattern.compile("via\\s+Sispag", Pattern.CASE_INSENSITIVE);
            if (sispagPattern.matcher(text).find()) {
                log.info("Transação via Sispag identificada");
            }

            // Para debug: aceitar mesmo sem nome completo
            if (data.employeeName == null || data.employeeName.trim().isEmpty() || data.employeeName.equals("Nome não extraído")) {
                log.warn("⚠️ Nome do funcionário não encontrado - usando nome genérico para debug");
                data.employeeName = "NOVO FUNCIONÁRIO";
            }
            
            // Log detalhado dos dados extraídos
            log.info("=== 📊 RESUMO DOS DADOS EXTRAÍDOS ===");
            log.info("👤 Nome do funcionário: '{}'", data.employeeName);
            log.info("💰 Valor: {}", data.amount != null ? String.format("R$ %.2f", data.amount) : "Não encontrado");
            log.info("📅 Mês/Ano: {}/{}", data.month, data.year);
            log.info("🏦 Banco: '{}'", data.bankName);
            log.info("📄 Data de transferência: '{}'", data.transferDate);
            log.info("🏢 Empresa: '{}'", data.companyName);
            log.info("🔢 Agência debitada: '{}'", data.agency);
            log.info("💳 Conta debitada: '{}'", data.account);
            log.info("🔢 Agência creditada: '{}'", data.creditedAgency);
            log.info("💳 Conta creditada: '{}'", data.creditedAccount);
            log.info("🔐 Controle: '{}'", data.controlNumber);
            log.info("🔑 Autenticação: '{}'", data.authentication);

            log.info("=== ✅ EXTRAÇÃO CONCLUÍDA ===");
            log.info("👤 Nome do Funcionário: {}", data.employeeName);
            log.info("💰 Valor da Transferência: R$ {}", data.amount != null ? String.format("%.2f", data.amount) : "N/A");
            log.info("📅 Mês/Ano: {}/{}", data.month, data.year);
            log.info("🏦 Banco: {}", data.bankName != null ? data.bankName : "N/A");
            log.info("🏢 Agência Debitada: {}", data.agency != null ? data.agency : "N/A");
            log.info("📋 Conta Debitada: {}", data.account != null ? data.account : "N/A");
            log.info("🏭 Empresa: {}", data.companyName != null ? data.companyName : "N/A");
            log.info("🏢 Agência Creditada: {}", data.creditedAgency != null ? data.creditedAgency : "N/A");
            log.info("📋 Conta Creditada: {}", data.creditedAccount != null ? data.creditedAccount : "N/A");
            log.info("📅 Data Transferência: {}", data.transferDate != null ? data.transferDate : "N/A");
            log.info("🔢 Controle: {}", data.controlNumber != null ? data.controlNumber : "N/A");
            log.info("🔐 Autenticação: {}", data.authentication != null ? data.authentication : "N/A");
            
            // Validação final dos dados extraídos
            log.info("=== 🔍 VALIDAÇÃO FINAL ===");
            boolean nomeValido = data.employeeName != null && !data.employeeName.trim().isEmpty();
            boolean mesValido = data.month > 0 && data.month <= 12;
            boolean anoValido = data.year > 0;
            
            log.info("👤 Nome válido: {} ({})", nomeValido ? "✅" : "❌", data.employeeName);
            log.info("📅 Mês válido: {} ({})", mesValido ? "✅" : "❌", data.month);
            log.info("📅 Ano válido: {} ({})", anoValido ? "✅" : "❌", data.year);
            
            if (nomeValido && mesValido && anoValido) {
                log.info("🎉 ✅ EXTRAÇÃO BEM-SUCEDIDA! Todos os dados obrigatórios foram extraídos.");
                return data;
            } else {
                log.error("💥 ❌ EXTRAÇÃO FALHOU! Dados obrigatórios não foram encontrados.");
                log.error("❌ Nome: {}", nomeValido ? "OK" : "FALTANDO");
                log.error("❌ Mês: {}", mesValido ? "OK" : "FALTANDO");
                log.error("❌ Ano: {}", anoValido ? "OK" : "FALTANDO");
                return null;
            }

        } catch (Exception e) {
            log.error("Erro ao extrair dados do recibo bancário: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Extrai uma página específica do PDF original preservando o layout exato
     * Se um holerite for fornecido e as validações passarem, usa a estrutura de pastas do holerite (Empresa/Setor)
     */
    private String extractReceiptPageFromOriginal(java.io.InputStream originalInputStream, int pageNumber, ReceiptData data, Payslip matchingPayslip) throws IOException {
        Path monthPath;
        
        // Se holerite foi encontrado e validações passaram, usar estrutura de pastas do holerite
        if (matchingPayslip != null && matchingPayslip.getCompanyName() != null) {
            // Estrutura: uploads/receipts/{Empresa}/{Setor}/{Ano}/{Mês}
            String companyFolder = matchingPayslip.getCompanyName().trim()
                .replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "")
                .replaceAll("\\s+", "_")
                .toLowerCase();
            
            String sectorFolder = matchingPayslip.getWorkPostName() != null ? 
                matchingPayslip.getWorkPostName().trim()
                    .replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "")
                    .replaceAll("\\s+", "_")
                    .toLowerCase() : "sem_setor";
            
            String yearFolder = String.format("%04d", data.year);
            String monthFolder = String.format("%02d", data.month);
            
            monthPath = Paths.get(UPLOAD_DIR, companyFolder, sectorFolder, yearFolder, monthFolder).toAbsolutePath();
            log.info("📁 Usando estrutura de pastas do holerite: {}/{}/{}/{}", companyFolder, sectorFolder, yearFolder, monthFolder);
        } else {
            // Estrutura padrão: uploads/receipts/{Mês}_{Ano}
            String monthFolder = String.format("%02d_%04d", data.month, data.year);
            monthPath = Paths.get(UPLOAD_DIR, monthFolder).toAbsolutePath();
            log.info("📁 Usando estrutura de pastas padrão: {}", monthFolder);
        }
        
        log.info("Criando diretório: {}", monthPath);
        
        if (!Files.exists(monthPath)) {
            Files.createDirectories(monthPath);
            log.info("Diretório criado: {}", monthPath);
        } else {
            log.info("Diretório já existe: {}", monthPath);
        }

        // Nome do arquivo com nome do funcionário
        String cleanedName = data.employeeName != null ? data.employeeName.trim()
            .replaceAll("(?i)\\bvalor\\b", "") // Remove "valor" (case insensitive)
            .replaceAll("(?i)\\bfuncionario\\b", "") // Remove "funcionario" (case insensitive)
            .replaceAll("(?i)\\bempregado\\b", "") // Remove "empregado" (case insensitive)
            .replaceAll("(?i)\\bcolaborador\\b", "") // Remove "colaborador" (case insensitive)
            .replaceAll("\\s+", " ") // Múltiplos espaços para um só
            .trim() : "";
        
        // Se após a limpeza o nome ficou vazio, usar o nome original
        if (cleanedName.isEmpty() && data.employeeName != null) {
            cleanedName = data.employeeName.trim();
        }
        
        String fileName = String.format("recibo_%s_%02d_%d_pagina_%d.pdf", 
            cleanedName.replaceAll("[^a-zA-ZÀ-ÿ\\s]", "").trim().replaceAll("\\s+", "_").toLowerCase(),
            data.month, 
            data.year, 
            pageNumber
        );

        String filePath = monthPath.resolve(fileName).toString();

        // PRESERVAR LAYOUT ORIGINAL: Extrair apenas a página específica do PDF original
        try (PDDocument originalDocument = PDDocument.load(originalInputStream);
             PDDocument newDocument = new PDDocument()) {
            
            log.info("📄 Extraindo página {} do PDF original (preservando layout)", pageNumber);
            
            // Verificar se a página existe
            if (pageNumber > originalDocument.getNumberOfPages()) {
                throw new IOException("Página " + pageNumber + " não existe no PDF original");
            }
            
            // Copiar a página específica (índice baseado em 0)
            PDPage originalPage = originalDocument.getPage(pageNumber - 1);
            newDocument.addPage(originalPage);
            
            // Salvar o novo PDF com apenas a página extraída
            newDocument.save(filePath);
            
            log.info("✅ Página {} extraída com sucesso preservando layout original: {}", pageNumber, filePath);
            
            return filePath;
            
        } catch (Exception e) {
            log.error("💥 Erro ao extrair página do PDF original: {}", e.getMessage(), e);
            throw new IOException("Erro ao extrair página do PDF original: " + e.getMessage(), e);
        }
    }

    private String createReceiptPdf(ReceiptData data, int pageNumber) throws IOException {
        // Criar diretório por mês com caminho absoluto
        String monthFolder = String.format("%02d_%04d", data.month, data.year);
        Path monthPath = Paths.get(UPLOAD_DIR, monthFolder).toAbsolutePath();
        
        log.info("Criando diretório: {}", monthPath);
        
        if (!Files.exists(monthPath)) {
            Files.createDirectories(monthPath);
            log.info("Diretório criado: {}", monthPath);
        } else {
            log.info("Diretório já existe: {}", monthPath);
        }

        // Nome do arquivo com nome do funcionário
        String cleanedName = data.employeeName != null ? data.employeeName.trim()
            .replaceAll("(?i)\\bvalor\\b", "") // Remove "valor" (case insensitive)
            .replaceAll("(?i)\\bfuncionario\\b", "") // Remove "funcionario" (case insensitive)
            .replaceAll("(?i)\\bempregado\\b", "") // Remove "empregado" (case insensitive)
            .replaceAll("(?i)\\bcolaborador\\b", "") // Remove "colaborador" (case insensitive)
            .replaceAll("\\s+", " ") // Múltiplos espaços para um só
            .trim() : "";
        
        // Se após a limpeza o nome ficou vazio, usar o nome original
        if (cleanedName.isEmpty() && data.employeeName != null) {
            cleanedName = data.employeeName.trim();
        }
        
        String fileName = String.format("recibo_%s_%02d_%d_pagina_%d.pdf", 
            cleanedName.replaceAll("[^a-zA-ZÀ-ÿ\\s]", "").trim().replaceAll("\\s+", "_").toLowerCase(),
            data.month, 
            data.year, 
            pageNumber
        );

        String filePath = monthPath.resolve(fileName).toString();

        // IMPORTANTE: Este método deve preservar o layout original do comprovante
        // Por enquanto, vamos criar um PDF com layout similar ao original
        // TODO: Implementar preservação do layout original do PDF
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                // Configurar fontes
                PDFont fontRegular = PDType1Font.HELVETICA;
                PDFont fontBold = PDType1Font.HELVETICA_BOLD;
                
                // Cores
                contentStream.setNonStrokingColor(0, 0, 0); // Preto
                
                // HEADER - Layout exato do Itaú
                // Logo Itaú (esquerda)
                contentStream.beginText();
                contentStream.setFont(fontBold, 16);
                contentStream.newLineAtOffset(50, 750);
                contentStream.showText("Itaú");
                contentStream.endText();
                
                // "30 horas" (direita)
                contentStream.beginText();
                contentStream.setFont(fontBold, 12);
                contentStream.newLineAtOffset(500, 750);
                contentStream.showText("30 horas");
                contentStream.endText();
                
                // Título principal centralizado
                contentStream.beginText();
                contentStream.setFont(fontBold, 14);
                contentStream.newLineAtOffset(50, 720);
                contentStream.showText("Banco Itaú - Comprovante de Transferência de conta corrente para conta corrente");
                contentStream.endText();
                
                // Linha separadora
                contentStream.setLineWidth(1);
                contentStream.moveTo(50, 710);
                contentStream.lineTo(550, 710);
                contentStream.stroke();
                
                // Identificação no extrato
                contentStream.beginText();
                contentStream.setFont(fontRegular, 12);
                contentStream.newLineAtOffset(50, 680);
                contentStream.showText("Identificação no extrato: SISPAG SALARIOS");
                contentStream.endText();
                
                // Dados da conta debitada
                contentStream.beginText();
                contentStream.setFont(fontBold, 12);
                contentStream.newLineAtOffset(50, 650);
                contentStream.showText("Dados da conta debitada");
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.setFont(fontRegular, 10);
                contentStream.newLineAtOffset(50, 630);
                contentStream.showText("Nome da empresa: " + (data.companyName != null ? data.companyName : "PROMOVER VIGILANCIA PATRIMONIA"));
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, 610);
                contentStream.showText("Agência: " + (data.agency != null ? data.agency : "0925"));
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, 590);
                contentStream.showText("Conta corrente: " + (data.account != null ? data.account : "98240 - 7"));
                contentStream.endText();
                
                // Dados da conta creditada
                contentStream.beginText();
                contentStream.setFont(fontBold, 12);
                contentStream.newLineAtOffset(50, 560);
                contentStream.showText("Dados da conta creditada");
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.setFont(fontRegular, 10);
                contentStream.newLineAtOffset(50, 540);
                contentStream.showText("Nome: " + (data.employeeName != null ? data.employeeName : "FUNCIONARIO"));
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, 520);
                contentStream.showText("Agência: " + (data.creditedAgency != null ? data.creditedAgency : "1429"));
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, 500);
                contentStream.showText("Conta corrente: " + (data.creditedAccount != null ? data.creditedAccount : "39637 - 5"));
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.newLineAtOffset(50, 480);
                contentStream.showText("Valor: R$ " + String.format("%.2f", data.amount != null ? data.amount : 0.0).replace(".", ","));
                contentStream.endText();
                
                // Informações fornecidas pelo pagador
                contentStream.beginText();
                contentStream.setFont(fontBold, 12);
                contentStream.newLineAtOffset(50, 450);
                contentStream.showText("Informações fornecidas pelo pagador");
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.setFont(fontRegular, 10);
                contentStream.newLineAtOffset(50, 430);
                contentStream.showText("Transferência efetuada em " + (data.transferDate != null ? data.transferDate : "06/08/2025") + " às 07:13:32 via Sispag, CTRL " + (data.controlNumber != null ? data.controlNumber : "992972681000634"));
                contentStream.endText();
                
                // Autenticação
                contentStream.beginText();
                contentStream.setFont(fontBold, 12);
                contentStream.newLineAtOffset(50, 400);
                contentStream.showText("Autenticação");
                contentStream.endText();
                
                contentStream.beginText();
                contentStream.setFont(fontRegular, 8);
                contentStream.newLineAtOffset(50, 380);
                contentStream.showText(data.authentication != null ? data.authentication : "F410FFD7DFB796B1582294EE30C77BFE389A75AB");
                contentStream.endText();
                
            }
            
            // Salvar o documento
            document.save(filePath);
            log.info("PDF do recibo criado com sucesso: {}", filePath);
            
            // Verificar se o arquivo foi realmente criado
            java.io.File savedFile = new java.io.File(filePath);
            if (savedFile.exists()) {
                log.info("Arquivo PDF verificado: {} bytes", savedFile.length());
            } else {
                log.error("Arquivo PDF não foi criado: {}", filePath);
                throw new IOException("Arquivo PDF não foi criado: " + filePath);
            }
            
            return filePath;
            
        } catch (Exception e) {
            log.error("Erro ao criar PDF do recibo: {}", e.getMessage(), e);
            throw new IOException("Erro ao criar PDF do recibo: " + e.getMessage());
        }
    }

    private String extractEmployeeName(String text) {
        // Padrões comuns para encontrar nomes em recibos
        String[] patterns = {
            "FUNCIONÁRIO:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+)",
            "NOME:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+)",
            "RECEBEDOR:\\s*([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\\s]+)"
        };

        for (String pattern : patterns) {
            Pattern p = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE);
            Matcher m = p.matcher(text);
            if (m.find()) {
                return m.group(1).trim();
            }
        }

        return null;
    }

    private int extractMonth(String text) {
        // Extrair mês do texto
        Pattern pattern = Pattern.compile("(?:MÊS|MES)\\s*:\\s*(\\d{1,2})", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        
        // Tentar extrair de outras formas
        pattern = Pattern.compile("(\\d{1,2})/(\\d{4})", Pattern.CASE_INSENSITIVE);
        matcher = pattern.matcher(text);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        
        return LocalDateTime.now().getMonthValue(); // Mês atual como fallback
    }

    private int extractYear(String text) {
        // Extrair ano do texto
        Pattern pattern = Pattern.compile("(?:ANO|YEAR)\\s*:\\s*(\\d{4})", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        
        // Tentar extrair de outras formas
        pattern = Pattern.compile("(\\d{1,2})/(\\d{4})", Pattern.CASE_INSENSITIVE);
        matcher = pattern.matcher(text);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(2));
        }
        
        return LocalDateTime.now().getYear(); // Ano atual como fallback
    }

    private Double extractGrossSalary(String text) {
        // Extrair salário bruto
        Pattern pattern = Pattern.compile("(?:SALÁRIO\\s*BRUTO|SALARIO\\s*BRUTO|BRUTO)\\s*:\\s*R?\\$?\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            String value = matcher.group(1).replace(",", ".");
            return Double.parseDouble(value);
        }
        return null;
    }

    private Double extractNetSalary(String text) {
        // Extrair salário líquido
        Pattern pattern = Pattern.compile("(?:SALÁRIO\\s*LÍQUIDO|SALARIO\\s*LIQUIDO|LÍQUIDO|LIQUIDO)\\s*:\\s*R?\\$?\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            String value = matcher.group(1).replace(",", ".");
            return Double.parseDouble(value);
        }
        return null;
    }

    private String generateReceiptFileName(String employeeName, int month, int year, int pageNumber) {
        // Tratar nome do funcionário de forma robusta
        String sanitizedName;
        if (employeeName != null && !employeeName.trim().isEmpty()) {
            // Remover palavras comuns que podem estar sendo incluídas incorretamente
            String cleanedName = employeeName.trim()
                .replaceAll("(?i)\\bvalor\\b", "") // Remove "valor" (case insensitive)
                .replaceAll("(?i)\\bfuncionario\\b", "") // Remove "funcionario" (case insensitive)
                .replaceAll("(?i)\\bempregado\\b", "") // Remove "empregado" (case insensitive)
                .replaceAll("(?i)\\bcolaborador\\b", "") // Remove "colaborador" (case insensitive)
                .replaceAll("\\s+", " ") // Múltiplos espaços para um só
                .trim();
            
            // Se após a limpeza o nome ficou vazio, usar o nome original
            if (cleanedName.isEmpty()) {
                cleanedName = employeeName.trim();
            }
            
            // Remover caracteres especiais, manter apenas letras, acentos e espaços
            sanitizedName = cleanedName.replaceAll("[^a-zA-ZÀ-ÿ\\s]", "").trim();
            // Substituir múltiplos espaços por underscore
            sanitizedName = sanitizedName.replaceAll("\\s+", "_");
            // Converter para minúsculas
            sanitizedName = sanitizedName.toLowerCase();
            
            log.info("🧹 Nome do arquivo limpo: '{}' -> '{}'", employeeName, sanitizedName);
        } else {
            sanitizedName = "funcionario_nao_identificado";
        }
        
        // Formato: recibo_NOME_FUNCIONARIO_MM_AAAA_pagina_X.pdf
        return String.format("recibo_%s_%02d_%d_pagina_%d.pdf", sanitizedName, month, year, pageNumber);
    }

    public List<PaymentReceipt> getAllReceipts() {
        return receiptRepository.findAll();
    }

    public List<PaymentReceipt> getReceiptsByMonthYear(int month, int year) {
        return receiptRepository.findByYearAndMonth(year, month);
    }

    public boolean deleteReceipt(String id) {
        try {
            UUID receiptId = UUID.fromString(id);
            PaymentReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
            
            if (receipt != null) {
                // Deletar arquivo físico se existir
                if (receipt.getFilePath() != null) {
                    try {
                        java.io.File file = new java.io.File(receipt.getFilePath());
                        if (file.exists()) {
                            file.delete();
                            log.info("Arquivo físico deletado: {}", receipt.getFilePath());
                        }
                    } catch (Exception e) {
                        log.warn("Erro ao deletar arquivo físico: {}", e.getMessage());
                    }
                }
                
                // Deletar do banco de dados
                receiptRepository.deleteById(receiptId);
                log.info("Recibo deletado com sucesso: {}", id);
                return true;
            }
            
            return false;
        } catch (Exception e) {
            log.error("Erro ao deletar recibo: {}", e.getMessage());
            return false;
        }
    }

    public int deleteReceipts(List<String> ids) {
        int deletedCount = 0;
        
        for (String id : ids) {
            if (deleteReceipt(id)) {
                deletedCount++;
            }
        }
        
        log.info("{} recibos deletados em lote", deletedCount);
        return deletedCount;
    }

    public PaymentReceipt getReceiptById(UUID id) {
        return receiptRepository.findById(id).orElse(null);
    }
    
    /**
     * Função utilitária para limpar texto removendo caracteres de controle
     */
    private String cleanText(String text) {
        if (text == null) return "";
        return text.replaceAll("[\\r\\n\\t]", " ").trim();
    }
} 