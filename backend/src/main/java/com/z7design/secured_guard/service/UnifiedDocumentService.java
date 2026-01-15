package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.model.PaymentReceiptStatus;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.UnifiedDocument;
import com.z7design.secured_guard.dto.PayslipOrganizationResponse;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UnifiedDocumentRepository;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;
import java.text.Normalizer;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UnifiedDocumentService {

    private final ReceiptProcessingService receiptProcessingService;
    private final PayslipService payslipService;
    private final PaymentReceiptRepository receiptRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final UnifiedDocumentRepository unifiedDocumentRepository;
    private final PayslipRepository payslipRepository;
    private final com.z7design.secured_guard.repository.UnificationJobRepository unificationJobRepository;
    private final com.z7design.secured_guard.repository.DeletionJobRepository deletionJobRepository;
    private static final String UNIFIED_DIR = "uploads/unified/";

    /**
     * Cria documento unificado usando IDs específicos do payslip e receipt
     * Garante que os documentos corretos sejam usados na unificação individual
     */
    public String createUnifiedDocumentByIds(java.util.UUID payslipId, java.util.UUID receiptId) throws IOException {
        log.info("🎯 Criando documento unificado por IDs: payslipId={}, receiptId={}", payslipId, receiptId);
        
        // Buscar payslip e receipt pelos IDs
        Payslip payslip = payslipRepository.findById(payslipId)
            .orElseThrow(() -> new IOException("Payslip não encontrado com ID: " + payslipId));
        
        PaymentReceipt receipt = receiptRepository.findById(receiptId)
            .orElseThrow(() -> new IOException("PaymentReceipt não encontrado com ID: " + receiptId));
        
        log.info("✅ Payslip encontrado: {} - {}/{}", payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear());
        log.info("✅ Receipt encontrado: {} - {}/{}", receipt.getEmployeeName(), receipt.getMonth(), receipt.getYear());
        
        // Criar documento unificado usando os objetos encontrados
        return createUnifiedDocument(payslip, receipt);
    }

    /**
     * Cria um documento unificado combinando holerite e recibo
     */
    public String createUnifiedDocument(Payslip payslip, PaymentReceipt receipt) throws IOException {
        log.info("=== 🎯 CRIANDO DOCUMENTO UNIFICADO ===");
        log.info("Funcionário: {}", payslip.getEmployeeName());
        log.info("Mês/Ano: {}/{}", payslip.getMonth(), payslip.getYear());
        log.info("Recibo: {}", receipt.getFileName());

        // VERIFICAÇÃO INTELIGENTE DE NOMES
        boolean namesMatch = verifyEmployeeNames(payslip.getEmployeeName(), receipt.getEmployeeName());
        log.info("🔍 Verificação de nomes: {} = {} ? {}", 
            payslip.getEmployeeName(), receipt.getEmployeeName(), namesMatch ? "✅ MATCH" : "❌ NO MATCH");

        if (!namesMatch) {
            log.warn("⚠️ Nomes não coincidem! Holerite: {} | Recibo: {}", 
                payslip.getEmployeeName(), receipt.getEmployeeName());
        }

        // Criar diretório se não existir
        Path unifiedPath = Paths.get(UNIFIED_DIR).toAbsolutePath();
        if (!Files.exists(unifiedPath)) {
            Files.createDirectories(unifiedPath);
            log.info("Diretório criado: {}", unifiedPath);
        }

        // Nome do arquivo unificado
        String fileName = generateUnifiedFileName(payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear());
        String filePath = unifiedPath.resolve(fileName).toString();

        try (PDDocument unifiedDocument = new PDDocument()) {
            
            // PÁGINA 1: HOLERITE
            log.info("📄 Adicionando página 1: Holerite");
            addHoleritePage(unifiedDocument, payslip);
            
            // PÁGINA 2: RECIBO DE PAGAMENTO
            log.info("📄 Adicionando página 2: Recibo de Pagamento");
            addReceiptPage(unifiedDocument, receipt);
            
            // PÁGINA 3: VERIFICAÇÃO E RESULTADOS DA UNIFICAÇÃO
            log.info("📄 Adicionando página 3: Verificação e Resultados");
            addVerificationPage(unifiedDocument, payslip, receipt, namesMatch);
            
            // Salvar documento unificado
            unifiedDocument.save(filePath);
            log.info("✅ Documento unificado criado: {}", filePath);
            
            // Verificar se foi criado
            File savedFile = new File(filePath);
            if (savedFile.exists()) {
                log.info("📊 Arquivo verificado: {} bytes", savedFile.length());
            } else {
                throw new IOException("Arquivo unificado não foi criado");
            }
            
            return filePath;
            
        } catch (Exception e) {
            log.error("💥 Erro ao criar documento unificado: {}", e.getMessage(), e);
            throw new IOException("Erro ao criar documento unificado: " + e.getMessage(), e);
        }
    }

    /**
     * Adiciona página do holerite ao documento unificado
     */
    private void addHoleritePage(PDDocument document, Payslip payslip) throws IOException {
        PDPage page = new PDPage();
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            // Configurar fontes
            contentStream.setNonStrokingColor(0, 0, 0); // Preto
            
            // HEADER - Título da página
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 18);
            contentStream.newLineAtOffset(50, 750);
            contentStream.showText("HOLERITE - " + payslip.getEmployeeName().toUpperCase());
            contentStream.endText();
            
            // Informações do funcionário
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
            contentStream.newLineAtOffset(50, 700);
            contentStream.showText("INFORMAÇÕES DO FUNCIONÁRIO");
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.newLineAtOffset(50, 670);
            contentStream.showText("Nome: " + cleanText(payslip.getEmployeeName()));
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("CPF: " + cleanText(payslip.getCpf()));
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Cargo: Vigilante");
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Mês/Ano: " + payslip.getMonth() + "/" + payslip.getYear());
            contentStream.endText();
            
            // Informações salariais
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
            contentStream.newLineAtOffset(50, 550);
            contentStream.showText("INFORMAÇÕES SALARIAIS");
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.newLineAtOffset(50, 520);
            contentStream.showText("Salário Bruto: R$ 1.500,00");
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Salário Líquido: R$ 911,00");
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Data de Pagamento: 25/" + payslip.getMonth() + "/" + payslip.getYear());
            contentStream.endText();
            
            // Footer
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 10);
            contentStream.newLineAtOffset(50, 100);
            contentStream.showText("Documento gerado automaticamente pelo sistema SecuredGuard");
            contentStream.newLineAtOffset(0, -15);
            contentStream.showText("Data de geração: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")));
            contentStream.endText();
        }
    }

    /**
     * Adiciona página do recibo ao documento unificado
     */
    private void addReceiptPage(PDDocument document, PaymentReceipt receipt) throws IOException {
        PDPage page = new PDPage();
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            // Configurar fontes
            contentStream.setNonStrokingColor(0, 0, 0); // Preto
            
            // HEADER - Logo e branding
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
            contentStream.newLineAtOffset(50, 750);
            contentStream.showText("ITAÚ");
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 18);
            contentStream.newLineAtOffset(200, 0);
            contentStream.showText("30 HORAS");
            contentStream.endText();
            
            // Linha separadora
            contentStream.setLineWidth(1);
            contentStream.moveTo(50, 740);
            contentStream.lineTo(550, 740);
            contentStream.stroke();
            
            // TÍTULO PRINCIPAL
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 16);
            contentStream.newLineAtOffset(50, 710);
            contentStream.showText("COMPROVANTE DE OPERAÇÃO");
            contentStream.endText();
            
            // Tipo de operação
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.newLineAtOffset(50, 690);
            contentStream.showText("Transferência de Conta Corrente para Conta Corrente");
            contentStream.endText();
            
            // Identificação no extrato
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.newLineAtOffset(50, 670);
            contentStream.showText("Identificação no Extrato: SISPAG SALARIOS");
            contentStream.endText();
            
            // DADOS DA CONTA DEBITADA
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
            contentStream.newLineAtOffset(50, 630);
            contentStream.showText("Dados da conta a ser debitada:");
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 11);
            contentStream.newLineAtOffset(50, 610);
            contentStream.showText("Agência: 0925");
            contentStream.newLineAtOffset(0, -15);
            contentStream.showText("Conta: 98240 - 7");
            contentStream.newLineAtOffset(0, -15);
            contentStream.showText("Nome: PROMOVER VIGILANCIA PATRIMONIA");
            contentStream.endText();
            
            // DADOS DA CONTA CREDITADA
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
            contentStream.newLineAtOffset(50, 540);
            contentStream.showText("Dados da conta a ser creditada:");
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 11);
            contentStream.newLineAtOffset(50, 520);
            contentStream.showText("Agência: 0925");
            contentStream.newLineAtOffset(0, -15);
            contentStream.showText("Conta: 98240 - 7");
            contentStream.newLineAtOffset(0, -15);
            contentStream.showText("Nome: " + cleanText(receipt.getEmployeeName()));
            contentStream.newLineAtOffset(0, -15);
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
            contentStream.showText("Valor: R$ " + receipt.getNetSalary().toString());
            contentStream.endText();
            
            // INFORMAÇÕES DO PAGADOR
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 11);
            contentStream.newLineAtOffset(50, 450);
            contentStream.showText("Informações fornecidas pelo pagador:");
            contentStream.endText();
            
            // DETALHES DA TRANSFERÊNCIA
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 11);
            contentStream.newLineAtOffset(50, 410);
            contentStream.showText("Transferência realizada via Sispag");
            contentStream.endText();
            
            // FOOTER - Linha de corte
            contentStream.setLineDashPattern(new float[]{5, 5}, 0);
            contentStream.moveTo(50, 100);
            contentStream.lineTo(550, 100);
            contentStream.stroke();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 10);
            contentStream.newLineAtOffset(250, 90);
            contentStream.showText("Cortar aqui");
            contentStream.endText();
            
            // Informações do sistema
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 8);
            contentStream.newLineAtOffset(50, 50);
            contentStream.showText("Documento unificado gerado automaticamente pelo sistema SecuredGuard");
            contentStream.newLineAtOffset(0, -12);
            contentStream.showText("Data de geração: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")));
            contentStream.endText();
        }
    }

    /**
     * Adiciona página de verificação e resultados da unificação
     */
    private void addVerificationPage(PDDocument document, Payslip payslip, PaymentReceipt receipt, boolean namesMatch) throws IOException {
        PDPage page = new PDPage();
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            contentStream.setNonStrokingColor(0, 0, 0); // Preto
            
            // HEADER - Título da página
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 18);
            contentStream.newLineAtOffset(50, 750);
            contentStream.showText("RESULTADOS DA UNIFICAÇÃO");
            contentStream.endText();
            
            // Linha separadora
            contentStream.setLineWidth(1);
            contentStream.moveTo(50, 740);
            contentStream.lineTo(550, 740);
            contentStream.stroke();
            
            // TÍTULO PRINCIPAL
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 16);
            contentStream.newLineAtOffset(50, 710);
            contentStream.showText("Resumo da Unificação");
            contentStream.endText();
            
            // Informações do funcionário
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.newLineAtOffset(50, 670);
            contentStream.showText("Funcionário: " + cleanText(payslip.getEmployeeName()));
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Mês/Ano: " + payslip.getMonth() + "/" + payslip.getYear());
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Recibo: " + cleanText(receipt.getFileName()));
            contentStream.endText();
            
            // Resultado da verificação de nomes
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 14);
            contentStream.newLineAtOffset(50, 630);
            contentStream.showText("Resultado da Verificação de Nomes:");
            contentStream.endText();
            
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.newLineAtOffset(50, 600);
            contentStream.showText("Nomes Coincidentes: " + (namesMatch ? "SIM" : "NAO"));
            contentStream.endText();
            
            // Footer
            contentStream.beginText();
            contentStream.setFont(PDType1Font.HELVETICA, 10);
            contentStream.newLineAtOffset(50, 100);
            contentStream.showText("Documento gerado automaticamente pelo sistema SecuredGuard");
            contentStream.newLineAtOffset(0, -15);
            contentStream.showText("Data de geração: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")));
            contentStream.endText();
        }
    }

    /**
     * Gera nome do arquivo unificado
     */
    private String generateUnifiedFileName(String employeeName, int month, int year) {
        String sanitizedName = cleanText(employeeName).toLowerCase().replaceAll("\\s+", "_");
        return String.format("documento_unificado_%s_%02d_%d.pdf", sanitizedName, month, year);
    }



    /**
     * Busca holerite e recibo por funcionário e mês/ano
     */
    public String createUnifiedDocumentForEmployee(String employeeName, int month, int year) throws IOException {
        log.info("🔍 Unificação por nome/mês/ano: {} - {}/{}", employeeName, month, year);

        final String cleanEmployeeName = cleanText(employeeName);
        log.info("🧹 Nome normalizado: '{}' -> '{}'", employeeName, cleanEmployeeName);

        // 1) Localizar PDF original do holerite - PRIMEIRO BUSCAR NO BANCO DE DADOS
        String holeritePath = null;
        
        // Buscar holerites no banco de dados para o período
        List<Payslip> payslipsInDb = payslipService.getAllPayslips().stream()
            .filter(p -> p.getMonth() != null && p.getMonth().equals(month))
            .filter(p -> p.getYear() != null && p.getYear().equals(year))
            .collect(java.util.stream.Collectors.toList());
        
        log.info("📊 Holerites encontrados no banco para {}/{}: {}", month, year, payslipsInDb.size());
        
        // Buscar holerite no banco pelo nome (flexível)
        Payslip matchingPayslip = null;
        String normalizedSearchNameHolerite = normalizeNameForSearch(cleanEmployeeName);
        
        log.info("🔍 Buscando holerite com nome normalizado: '{}' (original: '{}')", normalizedSearchNameHolerite, cleanEmployeeName);
        log.info("📊 Total de holerites no banco para {}/{}: {}", month, year, payslipsInDb.size());
        
        // Log de todos os holerites encontrados para debug
        if (!payslipsInDb.isEmpty()) {
            log.info("📋 Lista de holerites no banco para {}/{}:", month, year);
            for (Payslip p : payslipsInDb) {
                if (p.getEmployeeName() != null) {
                    String normalizedP = normalizeNameForSearch(p.getEmployeeName());
                    log.info("  • '{}' (normalizado: '{}')", p.getEmployeeName(), normalizedP);
                }
            }
        }
        
        for (Payslip payslip : payslipsInDb) {
            if (payslip.getEmployeeName() != null) {
                String normalizedPayslipName = normalizeNameForSearch(payslip.getEmployeeName());
                
                log.info("  🔍 Comparando: '{}' (payslip original: '{}') vs '{}' (search original: '{}')", 
                    normalizedPayslipName, payslip.getEmployeeName(), 
                    normalizedSearchNameHolerite, cleanEmployeeName);
                
                // Verificar se os nomes coincidem (flexível)
                boolean exactMatch = normalizedPayslipName.equals(normalizedSearchNameHolerite);
                boolean containsMatch = normalizedPayslipName.contains(normalizedSearchNameHolerite) || 
                                       normalizedSearchNameHolerite.contains(normalizedPayslipName);
                boolean verifyMatch = verifyEmployeeNames(cleanEmployeeName, payslip.getEmployeeName());
                
                log.info("    Match exato: {}, Match por contenção: {}, Match por verifyEmployeeNames: {}", 
                    exactMatch, containsMatch, verifyMatch);
                
                if (exactMatch || containsMatch || verifyMatch) {
                    matchingPayslip = payslip;
                    log.info("✅ Holerite encontrado no banco: {} - {}/{} (arquivoCaminho: {})", 
                        payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear(),
                        payslip.getArquivoCaminho() != null ? payslip.getArquivoCaminho() : "N/A");
                    break;
                }
            } else {
                log.warn("  ⚠️ Holerite sem nome de funcionário: {}/{}", payslip.getMonth(), payslip.getYear());
            }
        }
        
        if (matchingPayslip == null) {
            log.warn("❌ Nenhum holerite encontrado no banco que corresponda ao nome '{}' (normalizado: '{}')", 
                cleanEmployeeName, normalizedSearchNameHolerite);
            log.warn("📋 Holerites disponíveis no banco para {}/{}:", month, year);
            for (Payslip p : payslipsInDb) {
                if (p.getEmployeeName() != null) {
                    log.warn("  • '{}' (normalizado: '{}')", p.getEmployeeName(), normalizeNameForSearch(p.getEmployeeName()));
                }
            }
        }
        
        // Se encontrou no banco, usar o arquivoCaminho
        if (matchingPayslip != null && matchingPayslip.getArquivoCaminho() != null) {
            holeritePath = matchingPayslip.getArquivoCaminho();
            log.info("🔍 Tentando usar arquivoCaminho do banco: {}", holeritePath);
            
            // Tentar caminho absoluto primeiro
            Path absolutePath = Paths.get(holeritePath);
            if (Files.exists(absolutePath)) {
                log.info("✅ Holerite encontrado via banco de dados (caminho absoluto): {}", absolutePath.toAbsolutePath());
                holeritePath = absolutePath.toAbsolutePath().toString();
            } else {
                // Tentar caminho relativo
                Path relativePath = Paths.get(System.getProperty("user.dir"), holeritePath);
                if (Files.exists(relativePath)) {
                    log.info("✅ Holerite encontrado via banco de dados (caminho relativo): {}", relativePath.toAbsolutePath());
                    holeritePath = relativePath.toAbsolutePath().toString();
                } else {
                    log.warn("⚠️ Arquivo do holerite não existe no caminho do banco:");
                    log.warn("  • Caminho absoluto testado: {}", absolutePath.toAbsolutePath());
                    log.warn("  • Caminho relativo testado: {}", relativePath.toAbsolutePath());
                    log.warn("  • Tentando buscar em outros locais...");
                    holeritePath = null; // Tentar buscar em outros locais
                }
            }
        }
        
        // Se não encontrou no banco ou arquivo não existe, buscar nos diretórios conhecidos
        if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
            log.info("🔍 Buscando holerite nos diretórios conhecidos...");
            holeritePath = findHoleriteOriginalFileByNameAndPeriod(cleanEmployeeName, month, year);
        }
        
        // Verificação final
        if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
            log.error("❌ Holerite não encontrado para {} {}/{}", cleanEmployeeName, month, year);
            
            // Construir mensagem de erro detalhada
            StringBuilder errorDetails = new StringBuilder();
            errorDetails.append("❌ HOLERITE NÃO ENCONTRADO\n\n");
            errorDetails.append("📋 DETALHES:\n");
            errorDetails.append(String.format("• Funcionário: %s\n", employeeName));
            errorDetails.append(String.format("• Nome normalizado para busca: %s\n", normalizedSearchNameHolerite));
            errorDetails.append(String.format("• Período: %d/%d\n\n", month, year));
            
            if (!payslipsInDb.isEmpty()) {
                errorDetails.append("📊 HOLERITES ENCONTRADOS NO BANCO PARA ESTE PERÍODO:\n");
                for (Payslip p : payslipsInDb) {
                    String payslipNormalizedName = p.getEmployeeName() != null ? normalizeNameForSearch(p.getEmployeeName()) : "N/A";
                    errorDetails.append(String.format("  • %s (normalizado: %s) - %d/%d\n", 
                        p.getEmployeeName() != null ? p.getEmployeeName() : "N/A",
                        payslipNormalizedName,
                        p.getMonth(), p.getYear()));
                    if (p.getArquivoCaminho() != null) {
                        errorDetails.append(String.format("    arquivoCaminho: %s\n", p.getArquivoCaminho()));
                        Path testPath = Paths.get(p.getArquivoCaminho());
                        errorDetails.append(String.format("    Arquivo existe: %s\n", Files.exists(testPath) ? "SIM" : "NÃO"));
                    }
                }
                errorDetails.append("\n");
            } else {
                errorDetails.append("⚠️ Nenhum holerite encontrado no banco para o período ").append(month).append("/").append(year).append("\n\n");
            }
            
            errorDetails.append("💡 SOLUÇÃO:\n");
            errorDetails.append(String.format("1. Verifique se o holerite foi importado para '%s'\n", employeeName));
            errorDetails.append(String.format("2. O holerite deve ser do período %d/%d\n", month, year));
            errorDetails.append("3. Verifique se o nome do funcionário está correto no holerite\n");
            errorDetails.append("4. Se o holerite foi importado, verifique se o arquivo PDF existe no servidor\n");
            
            throw new IOException(errorDetails.toString());
        }
        log.info("📄 Holerite encontrado: {}", holeritePath);

        // 2) Localizar PDF original do comprovante (REGRA: mês seguinte ao holerite)
        int receiptMonth = month == 12 ? 1 : month + 1;
        int receiptYear = month == 12 ? year + 1 : year;
        
        log.info("🔍 Buscando comprovante para holerite {}/{} -> comprovante {}/{}", 
            month, year, receiptMonth, receiptYear);
        
        // ESTRATÉGIA MELHORADA: Primeiro buscar no banco de dados, depois nos arquivos
        String receiptPath = null;
        List<PaymentReceipt> receiptsInDb = receiptRepository.findByYearAndMonth(receiptYear, receiptMonth);
        
        log.info("📊 Comprovantes encontrados no banco para {}/{}: {}", receiptMonth, receiptYear, receiptsInDb.size());
        
        // Log detalhado de todos os comprovantes encontrados
        if (!receiptsInDb.isEmpty()) {
            log.info("📋 Lista de comprovantes no banco para {}/{}:", receiptMonth, receiptYear);
            for (PaymentReceipt r : receiptsInDb) {
                log.info("  • {} - {}/{} (filePath: {})", 
                    r.getEmployeeName() != null ? r.getEmployeeName() : "N/A",
                    r.getMonth(), r.getYear(),
                    r.getFilePath() != null ? r.getFilePath() : "N/A");
            }
        }
        
        // Buscar comprovante no banco usando o nome da conta creditada e verificando no PDF do holerite
        PaymentReceipt matchingReceipt = null;
        String normalizedSearchName = normalizeNameForSearch(cleanEmployeeName);
        
        log.info("🔍 Buscando comprovante usando nome da conta creditada e verificação no PDF do holerite");
        log.info("📝 Nome do funcionário (holerite): '{}' (normalizado: '{}')", cleanEmployeeName, normalizedSearchName);
        
        // NOVA ESTRATÉGIA: Verificar cada comprovante usando o nome da conta creditada e o PDF do holerite
        for (PaymentReceipt receipt : receiptsInDb) {
            if (receipt.getEmployeeName() == null && receipt.getCreditedName() == null) {
                log.warn("  ⚠️ Comprovante sem nome de funcionário nem conta creditada: {}/{}", receipt.getMonth(), receipt.getYear());
                continue;
            }
            
            // Usar o nome da conta creditada (que pode estar abreviado) ou o nome do funcionário
            String receiptName = receipt.getCreditedName() != null ? receipt.getCreditedName() : receipt.getEmployeeName();
            
            log.info("  🔍 Verificando comprovante: '{}' (conta creditada: '{}')", 
                receipt.getEmployeeName(), receipt.getCreditedName());
            
            // Verificar no PDF do holerite se o nome do comprovante aparece na mesma linha do código e CPF
            if (matchingPayslip != null && matchingPayslip.getArquivoCaminho() != null) {
                Payslip matchedPayslip = findPayslipByReceiptNameInPDF(receiptName, List.of(matchingPayslip));
                
                if (matchedPayslip != null) {
                    matchingReceipt = receipt;
                    log.info("✅ Comprovante encontrado! '{}' corresponde ao holerite '{}' (verificado no PDF)", 
                        receiptName, matchingPayslip.getEmployeeName());
                    break;
                }
            }
            
            // Fallback: verificar usando estratégias tradicionais de matching
            if (receipt.getEmployeeName() != null) {
                String normalizedReceiptName = normalizeNameForSearch(receipt.getEmployeeName());
                
                log.info("  🔍 Comparando (fallback): '{}' (receipt) vs '{}' (search)", normalizedReceiptName, normalizedSearchName);
                
                boolean exactMatch = normalizedReceiptName.equals(normalizedSearchName);
                boolean containsMatch = normalizedReceiptName.contains(normalizedSearchName) || 
                                       normalizedSearchName.contains(normalizedReceiptName);
                boolean verifyMatch = verifyEmployeeNames(cleanEmployeeName, receipt.getEmployeeName());
                
                log.info("    Match exato: {}, Match por contenção: {}, Match por verifyEmployeeNames: {}", 
                    exactMatch, containsMatch, verifyMatch);
                
                if (exactMatch || containsMatch || verifyMatch) {
                    matchingReceipt = receipt;
                    log.info("✅ Comprovante encontrado no banco (fallback): {} - {}/{} (filePath: {})", 
                        receipt.getEmployeeName(), receipt.getMonth(), receipt.getYear(),
                        receipt.getFilePath() != null ? receipt.getFilePath() : "N/A");
                    break;
                }
            }
        }
        
        if (matchingReceipt == null) {
            log.warn("❌ Nenhum comprovante encontrado no banco que corresponda ao nome '{}'", cleanEmployeeName);
        }
        
        // Se encontrou no banco, usar o filePath
        if (matchingReceipt != null && matchingReceipt.getFilePath() != null) {
            receiptPath = matchingReceipt.getFilePath();
            log.info("🔍 Tentando usar filePath do banco: {}", receiptPath);
            
            // Tentar caminho absoluto primeiro
            Path absolutePath = Paths.get(receiptPath);
            if (Files.exists(absolutePath)) {
                log.info("✅ Comprovante encontrado via banco de dados (caminho absoluto): {}", absolutePath.toAbsolutePath());
                receiptPath = absolutePath.toAbsolutePath().toString();
            } else {
                // Tentar caminho relativo
                Path relativePath = Paths.get(System.getProperty("user.dir"), receiptPath);
                if (Files.exists(relativePath)) {
                    log.info("✅ Comprovante encontrado via banco de dados (caminho relativo): {}", relativePath.toAbsolutePath());
                    receiptPath = relativePath.toAbsolutePath().toString();
                } else {
                    log.warn("⚠️ Arquivo do comprovante não existe no caminho do banco:");
                    log.warn("  • Caminho absoluto testado: {}", absolutePath.toAbsolutePath());
                    log.warn("  • Caminho relativo testado: {}", relativePath.toAbsolutePath());
                    log.warn("  • Tentando buscar em outros locais...");
                    receiptPath = null; // Tentar buscar em outros locais
                }
            }
        }
        
        // Se não encontrou no banco ou arquivo não existe, buscar nos diretórios conhecidos
        if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
            log.info("🔍 Buscando comprovante nos diretórios conhecidos...");
            receiptPath = findReceiptOriginalFileByNameAndPeriod(cleanEmployeeName, receiptMonth, receiptYear);
        }
        
        // Se ainda não encontrou, tentar buscar apenas pelo nome (sem período)
        if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
            log.info("🔍 Tentando buscar comprovante apenas pelo nome (sem período)...");
            java.util.List<String> searchedPaths = new java.util.ArrayList<>();
            receiptPath = findReceiptOriginalFileByNameOnly(cleanEmployeeName, searchedPaths);
        }
        
            // Verificação final
        if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
            log.error("❌ Comprovante não encontrado para {} {}/{} (holerite {}/{})", 
                cleanEmployeeName, receiptMonth, receiptYear, month, year);
            
            // Construir mensagem de erro mais clara e útil
            StringBuilder errorDetails = new StringBuilder();
            errorDetails.append("❌ COMPROVANTE NÃO ENCONTRADO\n\n");
            errorDetails.append("📋 DETALHES:\n");
            errorDetails.append(String.format("• Funcionário: %s\n", employeeName));
            errorDetails.append(String.format("• Nome normalizado para busca: %s\n", normalizedSearchName));
            errorDetails.append(String.format("• Holerite: %d/%d (já importado ✓)\n", month, year));
            errorDetails.append(String.format("• Comprovante esperado: %d/%d (mês seguinte ao holerite)\n\n", receiptMonth, receiptYear));
            
            // Adicionar informações sobre o que foi encontrado no banco
            if (!receiptsInDb.isEmpty()) {
                errorDetails.append("📊 COMPROVANTES ENCONTRADOS NO BANCO PARA ESTE PERÍODO:\n");
                for (PaymentReceipt r : receiptsInDb) {
                    String receiptNormalizedName = r.getEmployeeName() != null ? normalizeNameForSearch(r.getEmployeeName()) : "N/A";
                    errorDetails.append(String.format("  • %s (normalizado: %s) - %d/%d\n", 
                        r.getEmployeeName() != null ? r.getEmployeeName() : "N/A",
                        receiptNormalizedName,
                        r.getMonth(), r.getYear()));
                    if (r.getFilePath() != null) {
                        errorDetails.append(String.format("    filePath: %s\n", r.getFilePath()));
                        Path testPath = Paths.get(r.getFilePath());
                        errorDetails.append(String.format("    Arquivo existe: %s\n", Files.exists(testPath) ? "SIM" : "NÃO"));
                    }
                }
                errorDetails.append("\n");
                
                // Adicionar informações sobre por que não houve match
                errorDetails.append("🔍 ANÁLISE DE MATCH:\n");
                errorDetails.append(String.format("Nome buscado (normalizado): '%s'\n", normalizedSearchName));
                for (PaymentReceipt r : receiptsInDb) {
                    if (r.getEmployeeName() != null) {
                        String rNormalized = normalizeNameForSearch(r.getEmployeeName());
                        boolean exact = rNormalized.equals(normalizedSearchName);
                        boolean contains = rNormalized.contains(normalizedSearchName) || normalizedSearchName.contains(rNormalized);
                        boolean verify = verifyEmployeeNames(cleanEmployeeName, r.getEmployeeName());
                        errorDetails.append(String.format("  • '%s' -> Match exato: %s, Match contenção: %s, Match verify: %s\n", 
                            r.getEmployeeName(), exact, contains, verify));
                    }
                }
                errorDetails.append("\n");
            } else {
                errorDetails.append("⚠️ Nenhum comprovante encontrado no banco para o período ").append(receiptMonth).append("/").append(receiptYear).append("\n\n");
            }
            
            errorDetails.append("💡 SOLUÇÃO:\n");
            errorDetails.append(String.format("1. Verifique se o comprovante de pagamento foi importado para '%s'\n", employeeName));
            errorDetails.append(String.format("2. O comprovante deve ser do período %d/%d (mês seguinte ao holerite)\n", receiptMonth, receiptYear));
            errorDetails.append("3. Verifique se o nome do funcionário está correto no comprovante\n");
            errorDetails.append("4. Se o comprovante foi importado, verifique se o arquivo PDF existe no servidor\n");
            
            throw new IOException(errorDetails.toString());
        }
        log.info("📄 Comprovante encontrado: {}", receiptPath);

        // 3) Verificar nomes (flexível) antes de unificar
        boolean namesOk = verifyEmployeeNames(cleanEmployeeName, cleanEmployeeName);
        if (!namesOk) {
            log.warn("⚠️ Nomes não coincidem (verificação flexível) - prosseguindo mesmo assim");
        }

        // 4) Extrair nome do funcionário do holerite e do comprovante e verificar correspondência
        String employeeNameFromPayslip = null;
        String employeeNameFromReceipt = null;
        
        // Extrair nome do holerite (do PDF ou do objeto)
        if (matchingPayslip != null && matchingPayslip.getEmployeeName() != null) {
            employeeNameFromPayslip = matchingPayslip.getEmployeeName();
            log.info("📝 Nome do funcionário extraído do holerite: '{}'", employeeNameFromPayslip);
        } else {
            // Tentar extrair do PDF do holerite
            try {
                employeeNameFromPayslip = extractEmployeeNameFromPayslipPDF(holeritePath);
                log.info("📝 Nome do funcionário extraído do PDF do holerite: '{}'", employeeNameFromPayslip);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível extrair nome do PDF do holerite: {}", e.getMessage());
            }
        }
        
        // Extrair nome do comprovante (do PDF ou do objeto)
        if (matchingReceipt != null) {
            // Priorizar o nome da conta creditada (que pode estar abreviado)
            employeeNameFromReceipt = matchingReceipt.getCreditedName() != null ? 
                matchingReceipt.getCreditedName() : matchingReceipt.getEmployeeName();
            log.info("📝 Nome do funcionário extraído do comprovante: '{}' (conta creditada: '{}')", 
                employeeNameFromReceipt, matchingReceipt.getCreditedName());
        } else {
            // Tentar extrair do PDF do comprovante
            try {
                employeeNameFromReceipt = extractEmployeeNameFromReceiptPDF(receiptPath);
                log.info("📝 Nome do funcionário extraído do PDF do comprovante: '{}'", employeeNameFromReceipt);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível extrair nome do PDF do comprovante: {}", e.getMessage());
            }
        }
        
        // Verificar se os nomes correspondem usando as regras de abreviação
        String finalEmployeeName = cleanEmployeeName; // Fallback para o nome original
        if (employeeNameFromPayslip != null && employeeNameFromReceipt != null) {
            boolean namesMatch = verifyEmployeeNames(employeeNameFromPayslip, employeeNameFromReceipt);
            log.info("🔍 Verificação de nomes: '{}' (holerite) vs '{}' (comprovante) = {}", 
                employeeNameFromPayslip, employeeNameFromReceipt, namesMatch ? "✅ MATCH" : "❌ NO MATCH");
            
            if (namesMatch) {
                // Usar o nome do holerite (que é o completo) para salvar o arquivo
                finalEmployeeName = employeeNameFromPayslip;
                log.info("✅ Nomes correspondem! Usando nome do holerite para salvar arquivo: '{}'", finalEmployeeName);
            } else {
                log.warn("⚠️ Nomes não correspondem! Usando nome original: '{}'", finalEmployeeName);
            }
        } else if (employeeNameFromPayslip != null) {
            // Se só temos o nome do holerite, usar ele
            finalEmployeeName = employeeNameFromPayslip;
            log.info("✅ Usando nome do holerite para salvar arquivo: '{}'", finalEmployeeName);
        } else if (employeeNameFromReceipt != null) {
            // Se só temos o nome do comprovante, tentar encontrar o nome completo no holerite
            log.warn("⚠️ Apenas nome do comprovante disponível. Tentando encontrar nome completo no holerite...");
            // Usar o nome original como fallback
        }
        
        // 5) Unificar mantendo holerite na página 1 e comprovante na página 2
        log.info("🔄 Criando documento unificado individual com nome do funcionário: '{}'", finalEmployeeName);
        List<String> receiptPaths = new ArrayList<>();
        receiptPaths.add(receiptPath);
        
        String unifiedPath = createUnifiedPdfUsingMerger(
            holeritePath, 
            receiptPaths, 
            finalEmployeeName, // Usar o nome verificado
            month, 
            year,
            matchingPayslip, // Passar o payslip para extrair informações adicionais
            matchingReceipt  // Passar o receipt para extrair informações adicionais
        );

        log.info("✅ Documento unificado criado: {}", unifiedPath);
        return unifiedPath;
    }

    /**
     * Procura o arquivo PDF do holerite por nome e período em locais conhecidos
     */
    private String findHoleriteOriginalFileByNameAndPeriod(String employeeName, int month, int year) {
        try {
            log.info("🔍 Procurando holerite para: {} - {}/{}", employeeName, month, year);
            
            // Candidatos de diretórios conhecidos (baseado em PayslipService OUTPUT_DIR)
            java.util.List<Path> candidates = java.util.List.of(
                Paths.get("backend", "holerites", month + "-" + year),              // Padrão principal
                Paths.get("backend", "holerites", String.format("%d-%d", month, year)),
                Paths.get("uploads", "holerites", String.format("%02d_%d", month, year)),
                Paths.get("uploads", "holerites_processados", String.format("%02d_%d", month, year)),
                Paths.get("uploads", "payslips"),
                Paths.get("backend", "payslips_output")
            );

            // Normalizar nome para busca - remover caracteres especiais e underscores
            String nameToken = employeeName
                .replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "")
                .replaceAll("\\s+", "_")
                .toUpperCase();
            
            log.info("🔍 Token de busca do nome: {}", nameToken);

            for (Path base : candidates) {
                if (!Files.exists(base)) {
                    log.debug("⏭️ Diretório não existe: {}", base);
                    continue;
                }
                
                log.info("📂 Procurando em: {}", base.toAbsolutePath());
                
                try (var stream = Files.walk(base, 2)) {  // Limitar profundidade para performance
                    var match = stream
                        .filter(Files::isRegularFile)
                        .filter(p -> p.toString().toLowerCase().endsWith(".pdf"))
                        .filter(p -> {
                            String fileName = p.getFileName().toString().toUpperCase();
                            boolean nameMatch = fileName.contains(nameToken);
                            // Aceitar tanto formato "_9_2025" quanto "9_2025" e variações
                            boolean periodMatch = fileName.contains("_" + month + "_" + year) ||
                                                fileName.contains(month + "_" + year) ||
                                                fileName.contains("_" + month + "_" + year + ".PDF") ||
                                                fileName.contains(month + "_" + year + ".PDF");
                            
                            if (nameMatch && periodMatch) {
                                log.info("✅ Arquivo encontrado: {}", p);
                            }
                            
                            return nameMatch && periodMatch;
                        })
                        .map(Path::toString)
                        .findFirst();
                    
                    if (match.isPresent()) {
                        log.info("✅ Holerite encontrado: {}", match.get());
                        return match.get();
                    }
                }
            }
            
            log.warn("❌ Holerite não encontrado para {} - {}/{}", employeeName, month, year);
        } catch (Exception e) {
            log.error("💥 Erro ao procurar holerite: {}", e.getMessage(), e);
        }
        return null;
    }

    /**
     * Procura o arquivo PDF do comprovante por nome e período em locais conhecidos
     */
    private String findReceiptOriginalFileByNameAndPeriod(String employeeName, int month, int year) {
        return findReceiptOriginalFileByNameAndPeriod(employeeName, month, year, null);
    }
    
    /**
     * Busca comprovante apenas pelo nome do funcionário, sem período
     */
    private String findReceiptOriginalFileByNameOnly(String employeeName, java.util.List<String> searchedPaths) {
        try {
            log.info("🔍 Procurando comprovante apenas pelo nome: {}", employeeName);
            
            // Candidatos de diretórios conhecidos (buscar em todas as pastas possíveis)
            java.util.List<Path> candidates = java.util.List.of(
                Paths.get("uploads", "receipts"),  // Raiz
                Paths.get("uploads", "payment-receipts")  // Alternativa
            );
            
            // Normalizar nome para busca
            String nameTokenLower = employeeName
                .replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "")
                .replaceAll("\\s+", "_")
                .toLowerCase();
            
            String nameTokenUpper = nameTokenLower.toUpperCase();
            
            for (Path base : candidates) {
                Path absoluteBase = base.toAbsolutePath();
                String pathStr = absoluteBase.toString();
                
                if (searchedPaths != null) {
                    searchedPaths.add(pathStr);
                }
                
                if (!Files.exists(base)) {
                    log.debug("⏭️ Diretório não existe: {}", absoluteBase);
                    continue;
                }
                
                log.info("📂 Procurando em: {}", absoluteBase);
                
                try (var stream = Files.walk(base, 3)) {  // Buscar recursivamente até 3 níveis
                    var match = stream
                        .filter(Files::isRegularFile)
                        .filter(p -> p.toString().toLowerCase().endsWith(".pdf"))
                        .filter(p -> {
                            String fileName = p.getFileName().toString();
                            String fileNameLower = fileName.toLowerCase();
                            String fileNameUpper = fileName.toUpperCase();
                            
                            // Buscar apenas por nome (case insensitive)
                            return fileNameLower.contains(nameTokenLower) || 
                                   fileNameUpper.contains(nameTokenUpper);
                        })
                        .map(Path::toString)
                        .findFirst();
                    
                    if (match.isPresent()) {
                        log.info("✅ Comprovante encontrado (apenas por nome): {}", match.get());
                        return match.get();
                    }
                }
            }
            
            log.warn("❌ Comprovante não encontrado apenas pelo nome: {}", employeeName);
        } catch (Exception e) {
            log.error("💥 Erro ao procurar comprovante apenas por nome: {}", e.getMessage(), e);
        }
        return null;
    }
    
    private String findReceiptOriginalFileByNameAndPeriod(String employeeName, int month, int year, java.util.List<String> searchedPaths) {
        try {
            log.info("🔍 Procurando comprovante para: {} - {}/{}", employeeName, month, year);
            
            // Candidatos de diretórios conhecidos (baseado em ReceiptProcessingService UPLOAD_DIR)
            // ADICIONADAS MAIS PASTAS PARA AUMENTAR A EFICIÊNCIA
            java.util.List<Path> candidates = java.util.List.of(
                Paths.get("uploads", "receipts", String.format("%02d_%04d", month, year)),  // Padrão principal: 10_2025
                Paths.get("uploads", "receipts", String.format("%d_%d", month, year)),      // Sem zero: 10_2025
                Paths.get("uploads", "receipts", String.format("%02d/%04d", month, year)),  // Com barra: 10/2025
                Paths.get("uploads", "receipts", String.format("%d/%d", month, year)),      // Sem zero com barra
                Paths.get("uploads", "payment-receipts", String.valueOf(year), String.format("%02d", month)), // YYYY/MM
                Paths.get("uploads", "payment-receipts", String.valueOf(year), String.valueOf(month)),       // YYYY/M
                Paths.get("uploads", "payment-receipts", String.format("%04d", year), String.format("%02d", month)), // YYYY/MM (com zeros)
                Paths.get("uploads", "receipts")  // Raiz (última tentativa)
            );

            // Normalizar nome para busca - lowercase com underscores
            String nameTokenLower = employeeName
                .replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "")
                .replaceAll("\\s+", "_")
                .toLowerCase();
            
            String nameTokenUpper = nameTokenLower.toUpperCase();
            
            log.info("🔍 Tokens de busca: lower='{}', upper='{}'", nameTokenLower, nameTokenUpper);
            
            java.util.List<String> pathsChecked = new java.util.ArrayList<>();

            for (Path base : candidates) {
                Path absoluteBase = base.toAbsolutePath();
                String pathStr = absoluteBase.toString();
                pathsChecked.add(pathStr);
                
                if (searchedPaths != null) {
                    searchedPaths.add(pathStr);
                }
                
                if (!Files.exists(base)) {
                    log.debug("⏭️ Diretório não existe: {}", absoluteBase);
                    continue;
                }
                
                log.info("📂 Procurando em: {}", absoluteBase);
                
                try (var stream = Files.walk(base, 2)) {  // Limitar profundidade
                    var match = stream
                        .filter(Files::isRegularFile)
                        .filter(p -> p.toString().toLowerCase().endsWith(".pdf"))
                        .filter(p -> {
                            String fileName = p.getFileName().toString();
                            String fileNameLower = fileName.toLowerCase();
                            String fileNameUpper = fileName.toUpperCase();
                            
                            // Buscar por nome (case insensitive) e período
                            boolean nameMatch = fileNameLower.contains(nameTokenLower) || 
                                              fileNameUpper.contains(nameTokenUpper);
                            
                            // Aceitar diferentes formatos de período: _9_2025, _09_2025, 9_2025, etc
                            boolean periodMatch = fileNameLower.contains("_" + month + "_" + year) ||
                                                fileNameLower.contains("_" + String.format("%02d", month) + "_" + year) ||
                                                fileNameLower.contains(month + "_" + year) ||
                                                fileNameLower.contains(String.format("%02d", month) + "_" + year) ||
                                                fileNameLower.contains("_" + year + "_" + month) ||
                                                fileNameLower.contains("_" + year + "_" + String.format("%02d", month));
                            
                            if (nameMatch && periodMatch) {
                                log.info("✅ Arquivo encontrado: {}", p);
                            }
                            
                            return nameMatch && periodMatch;
                        })
                        .map(Path::toString)
                        .findFirst();
                    
                    if (match.isPresent()) {
                        log.info("✅ Comprovante encontrado: {}", match.get());
                        return match.get();
                    }
                }
            }
            
            log.warn("❌ Comprovante não encontrado para {} - {}/{} nas pastas: {}", 
                employeeName, month, year, String.join(", ", pathsChecked));
        } catch (Exception e) {
            log.error("💥 Erro ao procurar comprovante: {}", e.getMessage(), e);
        }
        return null;
    }

    /**
     * Cria holerite mock para teste
     */
    private Payslip createMockPayslip(String employeeName, int month, int year) {
        try {
            log.info("🏗️ Criando Payslip mock para: {} - {}/{}", employeeName, month, year);
            
            // Usar o builder do Payslip para criar um mock
            return Payslip.builder()
                .employeeName(employeeName)
                .cpf("123.456.789-00")
                .month(month)
                .year(year)
                .fileName("holerite_" + employeeName.toLowerCase().replaceAll("\\s+", "_") + "_" + month + "_" + year + ".pdf")
                .build();
                
        } catch (Exception e) {
            log.error("💥 Erro ao criar Payslip mock: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Cria recibo mock para teste
     */
    private PaymentReceipt createMockReceipt(String employeeName, int month, int year) {
        try {
            log.info("🏗️ Criando PaymentReceipt mock para: {} - {}/{}", employeeName, month, year);
            
            // Criar um PaymentReceipt mock usando construtor
            PaymentReceipt receipt = new PaymentReceipt();
            receipt.setEmployeeName(employeeName);
            receipt.setMonth(month);
            receipt.setYear(year);
            receipt.setFileName("recibo_" + employeeName.toLowerCase().replaceAll("\\s+", "_") + "_" + month + "_" + year + ".pdf");
            receipt.setNetSalary(new java.math.BigDecimal("911.00"));
            receipt.setStatus(PaymentReceiptStatus.PROCESSED);
            return receipt;
                
        } catch (Exception e) {
            log.error("💥 Erro ao criar PaymentReceipt mock: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Lista todos os documentos unificados disponíveis
     */
    public List<Map<String, Object>> listAllUnifiedDocuments() throws IOException {
        log.info("📋 Listando todos os documentos unificados...");
        
        List<Map<String, Object>> documents = new ArrayList<>();
        
        try {
            // Listar arquivos da pasta unificada principal
            Path unifiedPath = Paths.get(UNIFIED_DIR).toAbsolutePath();
            if (!Files.exists(unifiedPath)) {
                log.warn("⚠️ Pasta unificada não existe: {}", unifiedPath);
                Files.createDirectories(unifiedPath);
                // Não retornar vazio imediatamente - tentar buscar também no banco de dados
                log.info("📋 Pasta não existe, buscando documentos unificados no banco de dados...");
            } else {
                log.info("📂 Buscando em: {}", unifiedPath);
            }
            
            // ESTRATÉGIA 1: Buscar arquivos físicos na pasta
            if (Files.exists(unifiedPath)) {
                // Buscar recursivamente em todos os subdiretórios (aumentar profundidade para 5 níveis)
                Files.walk(unifiedPath, 5)  // Profundidade máxima de 5 níveis
                    .filter(Files::isRegularFile)
                    .filter(path -> path.toString().toLowerCase().endsWith(".pdf"))
                    .forEach(path -> {
                    try {
                        String fileName = path.getFileName().toString();
                        Map<String, Object> doc = new HashMap<>();
                        
                        // Determinar tipo baseado no nome do arquivo ou diretório pai
                        String parentDir = path.getParent().getFileName().toString().toLowerCase();
                        String type = "UNIFICADO";
                        if (fileName.toLowerCase().contains("holerite") || parentDir.contains("holerite")) {
                            type = "HOLERITE";
                        } else if (fileName.toLowerCase().contains("recibo") || parentDir.contains("recibo") || parentDir.contains("receipt")) {
                            type = "RECIBO";
                        } else if (fileName.toLowerCase().contains("unificado") || fileName.toLowerCase().contains("unified")) {
                            type = "UNIFICADO";
                        }
                        
                        doc.put("type", type);
                        doc.put("fileName", fileName);
                        doc.put("filePath", path.toString());
                        doc.put("fileSize", getFileSize(path));
                        doc.put("createdAt", getFileCreationTime(path));
                        
                        // Extrair informações do nome do arquivo
                        String employeeName = extractEmployeeNameFromFileName(fileName);
                        doc.put("employeeName", employeeName);
                        
                        // Tentar extrair CPF do nome do arquivo (padrão: NOME_CPF_MES_ANO)
                        java.util.regex.Pattern cpfPattern = java.util.regex.Pattern.compile("(\\d{11})");
                        java.util.regex.Matcher cpfMatcher = cpfPattern.matcher(fileName);
                        if (cpfMatcher.find()) {
                            String cpf = cpfMatcher.group(1);
                            doc.put("cpf", cpf);
                            log.debug("📄 CPF extraído do arquivo: {}", cpf);
                        }
                        
                        // Tentar extrair mês e ano do nome do arquivo
                        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("_(\\d{1,2})_(\\d{4})");
                        java.util.regex.Matcher matcher = pattern.matcher(fileName);
                        if (matcher.find()) {
                            doc.put("month", Integer.parseInt(matcher.group(1)));
                            doc.put("year", Integer.parseInt(matcher.group(2)));
                        }
                        
                        documents.add(doc);
                        log.debug("📄 Adicionado: {} - {}", type, fileName);
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao processar arquivo {}: {}", path, e.getMessage());
                    }
                });
            }
            
            // ESTRATÉGIA 2: Buscar também no banco de dados (UnifiedDocument)
            try {
                List<UnifiedDocument> unifiedDocsFromDb = unifiedDocumentRepository.findAll();
                log.info("📋 Encontrados {} documentos unificados no banco de dados", unifiedDocsFromDb.size());
                
                for (UnifiedDocument ud : unifiedDocsFromDb) {
                    // Verificar se já não foi adicionado pela busca de arquivos
                    boolean alreadyAdded = documents.stream()
                        .anyMatch(doc -> {
                            String docFileName = (String) doc.get("fileName");
                            String docEmployeeName = (String) doc.get("employeeName");
                            Integer docMonth = (Integer) doc.get("month");
                            Integer docYear = (Integer) doc.get("year");
                            
                            return (docFileName != null && ud.getFilePath() != null && ud.getFilePath().contains(docFileName)) ||
                                   (docEmployeeName != null && ud.getEmployeeName() != null && 
                                    docEmployeeName.equals(ud.getEmployeeName()) &&
                                    docMonth != null && docYear != null &&
                                    docMonth.equals(ud.getMonth()) && docYear.equals(ud.getYear()));
                        });
                    
                    if (!alreadyAdded && ud.getFilePath() != null && Files.exists(Paths.get(ud.getFilePath()))) {
                        Map<String, Object> doc = new HashMap<>();
                        doc.put("type", "UNIFICADO");
                        doc.put("fileName", ud.getFilePath().substring(ud.getFilePath().lastIndexOf(java.io.File.separator) + 1));
                        doc.put("filePath", ud.getFilePath());
                        doc.put("fileSize", getFileSize(Paths.get(ud.getFilePath())));
                        doc.put("createdAt", ud.getCreatedAt() != null ? ud.getCreatedAt().toString() : getFileCreationTime(Paths.get(ud.getFilePath())));
                        doc.put("employeeName", ud.getEmployeeName());
                        doc.put("month", ud.getMonth());
                        doc.put("year", ud.getYear());
                        if (ud.getPayslip() != null && ud.getPayslip().getCpf() != null) {
                            doc.put("cpf", ud.getPayslip().getCpf());
                        }
                        documents.add(doc);
                        log.debug("📄 Adicionado do banco: {}", ud.getFilePath());
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao buscar documentos unificados no banco: {}", e.getMessage());
            }
            
            log.info("✅ Encontrados {} documentos unificados (arquivos + banco)", documents.size());
            return documents;
            
        } catch (Exception e) {
            log.error("💥 Erro ao listar documentos unificados: {}", e.getMessage(), e);
            throw new IOException("Erro ao listar documentos unificados: " + e.getMessage(), e);
        }
    }

    /**
     * Lista documentos unificados por período
     */
    public List<Map<String, Object>> listUnifiedDocumentsByPeriod(Integer month, Integer year) throws IOException {
        log.info("📋 Listando documentos unificados por período: {}/{}", month, year);
        
        List<Map<String, Object>> allDocuments = listAllUnifiedDocuments();
        List<Map<String, Object>> filteredDocuments = new ArrayList<>();
        
        for (Map<String, Object> doc : allDocuments) {
            String fileName = (String) doc.get("fileName");
            if (fileName != null) {
                boolean matchesPeriod = true;
                
                if (month != null) {
                    matchesPeriod = matchesPeriod && fileName.contains(String.format("_%02d_", month));
                }
                
                if (year != null) {
                    matchesPeriod = matchesPeriod && fileName.contains(String.valueOf(year));
                }
                
                if (matchesPeriod) {
                    filteredDocuments.add(doc);
                }
            }
        }
        
        log.info("✅ Encontrados {} documentos para o período {}/{}", filteredDocuments.size(), month, year);
        return filteredDocuments;
    }

    /**
     * Busca documentos unificados por nome do funcionário
     */
    /**
     * Busca documentos unificados por múltiplos critérios
     * Dá preferência aos dados do holerite quando disponível
     */
    public List<Map<String, Object>> searchUnifiedDocuments(String searchTerm) throws IOException {
        if (searchTerm == null || searchTerm.trim().length() < 4) {
            log.warn("⚠️ Termo de busca muito curto (mínimo 4 caracteres): {}", searchTerm);
            return Collections.emptyList();
        }
        
        log.info("🔍 Buscando documentos unificados com termo: '{}'", searchTerm);
        
        String trimmedSearch = searchTerm.trim();
        String normalizedSearch = normalizeNameForSearch(trimmedSearch);
        String searchLower = trimmedSearch.toLowerCase();
        
        // Buscar todos os documentos
        List<Map<String, Object>> allDocuments = listAllUnifiedDocuments();
        List<Map<String, Object>> filteredDocuments = new ArrayList<>();
        
        // Buscar holerites correspondentes para enriquecer os dados
        List<Payslip> matchingPayslips = new ArrayList<>();
        try {
            matchingPayslips = payslipService.getAllPayslips().stream()
                .filter(p -> p.getEmployeeName() != null && 
                    (normalizeNameForSearch(p.getEmployeeName()).contains(normalizedSearch) ||
                     p.getEmployeeName().toLowerCase().contains(searchLower) ||
                     (p.getCpf() != null && p.getCpf().replaceAll("[^0-9]", "").contains(trimmedSearch.replaceAll("[^0-9]", ""))) ||
                     (p.getCompanyName() != null && normalizeNameForSearch(p.getCompanyName()).contains(normalizedSearch))))
                .collect(Collectors.toList());
            log.info("📊 Encontrados {} holerite(s) correspondentes", matchingPayslips.size());
        } catch (Exception e) {
            log.warn("⚠️ Erro ao buscar holerites: {}", e.getMessage());
        }
        
        // Criar mapa de holerites por nome/CPF/período para acesso rápido
        Map<String, Payslip> payslipMap = new HashMap<>();
        for (Payslip payslip : matchingPayslips) {
            String key = String.format("%s|%s|%d|%d", 
                normalizeNameForSearch(payslip.getEmployeeName()),
                payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : "",
                payslip.getMonth(), payslip.getYear());
            payslipMap.put(key, payslip);
        }
        
        // Filtrar documentos unificados
        for (Map<String, Object> doc : allDocuments) {
            if (matchesSearchTerm(doc, normalizedSearch, searchLower, trimmedSearch, payslipMap)) {
                // Enriquecer documento com dados do holerite se disponível
                enrichDocumentWithPayslipData(doc, payslipMap);
                filteredDocuments.add(doc);
            }
        }
        
        // Ordenar: documentos com dados do holerite primeiro
        filteredDocuments.sort((d1, d2) -> {
            boolean d1HasPayslip = d1.containsKey("payslipData") && d1.get("payslipData") != null;
            boolean d2HasPayslip = d2.containsKey("payslipData") && d2.get("payslipData") != null;
            
            if (d1HasPayslip && !d2HasPayslip) return -1;
            if (!d1HasPayslip && d2HasPayslip) return 1;
            
            // Se ambos têm ou não têm, ordenar por data (mais recente primeiro)
            Integer year1 = (Integer) d1.get("year");
            Integer year2 = (Integer) d2.get("year");
            Integer month1 = (Integer) d1.get("month");
            Integer month2 = (Integer) d2.get("month");
            
            if (year1 != null && year2 != null) {
                int yearCompare = year2.compareTo(year1);
                if (yearCompare != 0) return yearCompare;
            }
            if (month1 != null && month2 != null) {
                return month2.compareTo(month1);
            }
            return 0;
        });
        
        log.info("✅ Encontrados {} documentos unificados para busca: '{}'", filteredDocuments.size(), trimmedSearch);
        return filteredDocuments;
    }
    
    /**
     * Verifica se um documento corresponde ao termo de busca
     */
    private boolean matchesSearchTerm(Map<String, Object> doc, String normalizedSearch, 
                                     String searchLower, String trimmedSearch, 
                                     Map<String, Payslip> payslipMap) {
        // Buscar por nome do funcionário
        String employeeName = (String) doc.get("employeeName");
        if (employeeName != null) {
            String normalizedName = normalizeNameForSearch(employeeName);
            if (normalizedName.contains(normalizedSearch) || 
                employeeName.toLowerCase().contains(searchLower)) {
                return true;
            }
        }
        
        // Buscar por CPF
        String cpf = (String) doc.get("cpf");
        if (cpf != null) {
            String cpfDigits = cpf.replaceAll("[^0-9]", "");
            String searchDigits = trimmedSearch.replaceAll("[^0-9]", "");
            if (!searchDigits.isEmpty() && cpfDigits.contains(searchDigits)) {
                return true;
            }
        }
        
        // Buscar por período (MM/YYYY ou MM-YYYY)
        Integer month = (Integer) doc.get("month");
        Integer year = (Integer) doc.get("year");
        if (month != null && year != null) {
            String period1 = String.format("%02d/%d", month, year);
            String period2 = String.format("%02d-%d", month, year);
            String period3 = String.format("%d/%d", month, year);
            if (trimmedSearch.contains(period1) || trimmedSearch.contains(period2) || 
                trimmedSearch.contains(period3) || trimmedSearch.contains(String.valueOf(year))) {
                return true;
            }
        }
        
        // Buscar no nome do arquivo
        String fileName = (String) doc.get("fileName");
        if (fileName != null && fileName.toLowerCase().contains(searchLower)) {
            return true;
        }
        
        // Buscar nos dados do holerite associado (se disponível)
        for (Payslip payslip : payslipMap.values()) {
            String key = String.format("%s|%s|%d|%d", 
                normalizeNameForSearch(payslip.getEmployeeName()),
                payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : "",
                payslip.getMonth(), payslip.getYear());
            
            Integer docMonth = (Integer) doc.get("month");
            Integer docYear = (Integer) doc.get("year");
            String docEmployeeName = (String) doc.get("employeeName");
            
            if (docMonth != null && docYear != null && docEmployeeName != null &&
                docMonth.equals(payslip.getMonth()) && 
                docYear.equals(payslip.getYear()) &&
                normalizeNameForSearch(docEmployeeName).equals(normalizeNameForSearch(payslip.getEmployeeName()))) {
                // Verificar se o holerite corresponde à busca
                if (payslip.getCompanyName() != null && 
                    normalizeNameForSearch(payslip.getCompanyName()).contains(normalizedSearch)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Enriquece documento com dados do holerite quando disponível
     */
    private void enrichDocumentWithPayslipData(Map<String, Object> doc, Map<String, Payslip> payslipMap) {
        String employeeName = (String) doc.get("employeeName");
        Integer month = (Integer) doc.get("month");
        Integer year = (Integer) doc.get("year");
        
        if (employeeName != null && month != null && year != null) {
            String key = String.format("%s|%s|%d|%d", 
                normalizeNameForSearch(employeeName),
                doc.get("cpf") != null ? ((String) doc.get("cpf")).replaceAll("[^0-9]", "") : "",
                month, year);
            
            Payslip matchingPayslip = payslipMap.values().stream()
                .filter(p -> p.getMonth().equals(month) && 
                            p.getYear().equals(year) &&
                            normalizeNameForSearch(p.getEmployeeName()).equals(normalizeNameForSearch(employeeName)))
                .findFirst()
                .orElse(null);
            
            if (matchingPayslip != null) {
                Map<String, Object> payslipData = new HashMap<>();
                payslipData.put("cpf", matchingPayslip.getCpf());
                payslipData.put("companyName", matchingPayslip.getCompanyName());
                payslipData.put("companyCnpj", matchingPayslip.getCompanyCnpj());
                payslipData.put("workPostName", matchingPayslip.getWorkPostName());
                payslipData.put("netValue", matchingPayslip.getNetValue());
                doc.put("payslipData", payslipData);
                log.debug("✅ Documento enriquecido com dados do holerite: {}", employeeName);
            }
        }
    }
    
    /**
     * Busca documentos unificados por nome do funcionário (método legado - mantido para compatibilidade)
     */
    public List<Map<String, Object>> searchUnifiedDocumentsByEmployee(String employeeName) throws IOException {
        return searchUnifiedDocuments(employeeName);
    }

    /**
     * Lista documentos unificados por CPF do funcionário
     */
    public List<Map<String, Object>> listUnifiedDocumentsByCpf(String cpf) throws IOException {
        log.info("🔍 Buscando documentos unificados para CPF: {}", cpf);

        String sanitizedCpf = sanitizeCpf(cpf);
        if (sanitizedCpf.isEmpty()) {
            log.warn("⚠️ CPF informado vazio ou inválido. Retornando lista vazia.");
            return Collections.emptyList();
        }

        Optional<User> userOptional = userRepository.findByUsername(sanitizedCpf);
        Optional<Employee> employeeOptional = employeeRepository.findByDocument(sanitizedCpf);

        Set<String> normalizedNames = new HashSet<>();
        userOptional.map(User::getName).map(this::normalizeName).ifPresent(normalizedNames::add);
        employeeOptional.map(Employee::getName).map(this::normalizeName).ifPresent(normalizedNames::add);

        List<Map<String, Object>> allDocuments = listAllUnifiedDocuments();
        List<Map<String, Object>> filteredDocuments = allDocuments.stream()
                .filter(doc -> matchesDocumentForUser(doc, sanitizedCpf, normalizedNames))
                .collect(Collectors.toList());

        log.info("✅ Encontrados {} documentos unificados para CPF: {}", filteredDocuments.size(), cpf);
        return filteredDocuments;
    }

    private boolean matchesDocumentForUser(Map<String, Object> doc, String sanitizedCpf, Set<String> normalizedNames) {
        if (doc == null) {
            return false;
        }

        String fileName = String.valueOf(doc.getOrDefault("fileName", ""));
        String documentCpf = sanitizeCpf(String.valueOf(doc.getOrDefault("cpf", "")));

        if (!sanitizedCpf.isEmpty() && (fileName.contains(sanitizedCpf) || documentCpf.contains(sanitizedCpf))) {
            return true;
        }

        String employeeName = String.valueOf(doc.getOrDefault("employeeName", ""));
        String normalizedEmployeeName = normalizeName(employeeName);

        return normalizedNames.stream()
                .filter(name -> !name.isEmpty())
                .anyMatch(name ->
                        normalizedEmployeeName.equals(name) ||
                                normalizedEmployeeName.contains(name) ||
                                name.contains(normalizedEmployeeName));
    }

    private String sanitizeCpf(String cpf) {
        if (cpf == null) {
            return "";
        }
        return cpf.replaceAll("\\D", "");
    }

    private String normalizeName(String value) {
        if (value == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return withoutAccents.replaceAll("[^a-zA-Z0-9]", "")
                .toLowerCase();
    }

    /**
     * Extrai nome do funcionário do nome do arquivo
     */
    private String extractEmployeeNameFromFileName(String fileName) {
        try {
            // Remove prefixos e extensões
            String name = fileName
                .replace("HOLERITE_", "")
                .replace("RECIBO_recibo_", "")
                .replace(".pdf", "");
            
            // Extrai o nome (remove CPF e período)
            String[] parts = name.split("_");
            StringBuilder employeeName = new StringBuilder();
            
            for (int i = 0; i < parts.length - 2; i++) {
                if (employeeName.length() > 0) {
                    employeeName.append(" ");
                }
                employeeName.append(parts[i].toUpperCase());
            }
            
            return employeeName.toString();
        } catch (Exception e) {
            log.warn("⚠️ Erro ao extrair nome do funcionário do arquivo: {}", fileName);
            return "Nome não identificado";
        }
    }

    /**
     * Obtém tamanho do arquivo
     */
    private long getFileSize(Path path) {
        try {
            return Files.size(path);
        } catch (IOException e) {
            return 0;
        }
    }

    /**
     * Obtém data de criação do arquivo
     */
    private String getFileCreationTime(Path path) {
        try {
            return Files.getAttribute(path, "creationTime").toString();
        } catch (IOException e) {
            return "Data não disponível";
        }
    }

    /**
     * Verifica se os nomes dos funcionários coincidem (com suporte a nomes truncados)
     */
    private boolean verifyEmployeeNames(String holeriteName, String receiptName) {
        if (holeriteName == null || receiptName == null) {
            log.warn("⚠️ Nome nulo detectado na verificação flexível - Holerite: {}, Recibo: {}", holeriteName, receiptName);
            return false;
        }
        
        // Normalizar nomes (remover espaços extras, converter para minúsculas, remover acentos)
        String normalizedHolerite = normalizeNameForSearch(holeriteName);
        String normalizedReceipt = normalizeNameForSearch(receiptName);
        
        log.info("🔍 Comparando nomes (verificação flexível com abreviações):");
        log.info("  Holerite original: '{}'", holeriteName);
        log.info("  Recibo original: '{}'", receiptName);
        log.info("  Holerite normalizado: '{}'", normalizedHolerite);
        log.info("  Recibo normalizado: '{}'", normalizedReceipt);
        
        // Verificação exata
        boolean exactMatch = normalizedHolerite.equals(normalizedReceipt);
        
        // Verificação parcial (se um nome contém o outro)
        boolean partialMatch = normalizedHolerite.contains(normalizedReceipt) || 
                              normalizedReceipt.contains(normalizedHolerite);
        
        // Verificação por palavras-chave (primeiro e último nome) - com suporte a truncamentos E ABREVIAÇÕES
        boolean keywordMatch = checkKeywordMatch(normalizedHolerite, normalizedReceipt);
        
        // Verificação limpa (removendo palavras comuns)
        String cleanHolerite = normalizedHolerite
            .replace("valor", "")
            .replace("funcionario", "")
            .replace("empregado", "")
            .replace("colaborador", "")
            .trim();
        
        String cleanReceipt = normalizedReceipt
            .replace("valor", "")
            .replace("funcionario", "")
            .replace("empregado", "")
            .replace("colaborador", "")
            .trim();
        
        boolean cleanMatch = cleanHolerite.equals(cleanReceipt);
        
        // Verificação por prefixo do último nome (para lidar com truncamentos: PEREIRA vs PERE)
        boolean truncatedLastMatch = checkTruncatedLastName(normalizedHolerite, normalizedReceipt);
        
        // NOVA: Verificação específica para abreviações de nomes do meio
        boolean abbreviationMatch = checkNamesWithAbbreviations(normalizedHolerite, normalizedReceipt);
        
        log.info("🔍 Resultados da verificação flexível:");
        log.info("  Match exato: {}", exactMatch);
        log.info("  Match parcial: {}", partialMatch);
        log.info("  Match por palavras-chave (com abreviações): {}", keywordMatch);
        log.info("  Match limpo: {}", cleanMatch);
        log.info("  Match por último nome truncado: {}", truncatedLastMatch);
        log.info("  Match por abreviações: {}", abbreviationMatch);
        
        // Retorna true se qualquer verificação passar
        return exactMatch || partialMatch || keywordMatch || cleanMatch || truncatedLastMatch || abbreviationMatch;
    }
    
    /**
     * Verifica se os nomes correspondem considerando abreviações de nomes do meio (1-3 caracteres)
     * Ex: "SILVANA FERREIRA S HONORATO" vs "SILVANA FERREIRA SELVO HONORATO"
     */
    private boolean checkNamesWithAbbreviations(String name1, String name2) {
        String[] words1 = name1.split("\\s+");
        String[] words2 = name2.split("\\s+");
        
        if (words1.length < 2 || words2.length < 2) {
            return false;
        }
        
        // Verificar primeiro e último nome primeiro
        String first1 = words1[0];
        String last1 = words1[words1.length - 1];
        String first2 = words2[0];
        String last2 = words2[words2.length - 1];
        
        // Primeiro e último nome devem corresponder (com suporte a abreviações)
        boolean firstMatch = first1.equalsIgnoreCase(first2) || 
                            wordsMatchWithAbbreviation(first1, first2) ||
                            (first1.length() >= 3 && first2.length() >= 3 && 
                             (first1.toLowerCase().contains(first2.toLowerCase()) || first2.toLowerCase().contains(first1.toLowerCase())));
        boolean lastMatch = last1.equalsIgnoreCase(last2) || 
                           wordsMatchWithAbbreviation(last1, last2) ||
                           (last1.length() >= 3 && last2.length() >= 3 && 
                            (last1.toLowerCase().contains(last2.toLowerCase()) || last2.toLowerCase().contains(last1.toLowerCase())));
        
        if (!firstMatch || !lastMatch) {
            return false;
        }
        
        // Se primeiro e último batem, verificar nomes do meio com abreviações
        return checkMiddleNamesWithAbbreviations(words1, words2);
    }

    /**
     * Verifica match por palavras-chave (primeiro e último nome) - com suporte a truncamentos e abreviações
     * Trata corretamente nomes com preposições como "DA COSTA", "DE SOUZA", etc.
     */
    private boolean checkKeywordMatch(String name1, String name2) {
        // Primeiro, normalizar os nomes para garantir que preposições sejam tratadas corretamente
        String normalized1 = normalizeNameForSearch(name1);
        String normalized2 = normalizeNameForSearch(name2);
        
        String[] words1 = normalized1.split("\\s+");
        String[] words2 = normalized2.split("\\s+");
        
        if (words1.length < 2 || words2.length < 2) {
            // Se não tem pelo menos 2 palavras, usar matching por contenção
            return normalized1.contains(normalized2) || normalized2.contains(normalized1);
        }
        
        // Verificar primeiro e último nome
        String first1 = words1[0];
        String last1 = words1[words1.length - 1];
        String first2 = words2[0];
        String last2 = words2[words2.length - 1];
        
        // Log para debug
        log.debug("🔍 checkKeywordMatch - name1: '{}' (normalizado: '{}'), name2: '{}' (normalizado: '{}')", 
            name1, normalized1, name2, normalized2);
        log.debug("  words1: {}, first1: '{}', last1: '{}'", java.util.Arrays.toString(words1), first1, last1);
        log.debug("  words2: {}, first2: '{}', last2: '{}'", java.util.Arrays.toString(words2), first2, last2);
        
        // Primeiro nome: exato, um contém o outro, ou um é abreviação do outro
        boolean firstMatch = first1.equalsIgnoreCase(first2) || 
                            wordsMatchWithAbbreviation(first1, first2) ||
                            (first1.length() >= 3 && first2.length() >= 3 && 
                             (first1.toLowerCase().contains(first2.toLowerCase()) || first2.toLowerCase().contains(first1.toLowerCase())));
        
        // Último nome: exato, um contém o outro, um é prefixo do outro (truncamentos), ou um é abreviação do outro
        boolean lastMatch = last1.equalsIgnoreCase(last2) || 
                           wordsMatchWithAbbreviation(last1, last2) ||
                           (last1.length() >= 3 && last2.length() >= 3 && 
                            (last1.toLowerCase().contains(last2.toLowerCase()) || last2.toLowerCase().contains(last1.toLowerCase()))) ||
                           (last1.length() >= 4 && last2.length() >= 4 && 
                            (last1.toLowerCase().startsWith(last2.toLowerCase()) || last2.toLowerCase().startsWith(last1.toLowerCase())));
        
        // Verificar nomes do meio com suporte a abreviações (1-3 caracteres)
        boolean middleMatch = checkMiddleNamesWithAbbreviations(words1, words2);
        
        log.info("🔍 Verificação por palavras-chave:");
        log.info("  Primeiro nome: '{}' = '{}' ? {}", first1, first2, firstMatch);
        log.info("  Último nome: '{}' = '{}' ? {}", last1, last2, lastMatch);
        log.info("  Nomes do meio (com abreviações): {}", middleMatch);
        
        // Se primeiro e último nome batem, e os nomes do meio também batem (ou não há nomes do meio), é match
        return firstMatch && lastMatch && (middleMatch || words1.length <= 2 || words2.length <= 2);
    }
    
    /**
     * Verifica se os nomes do meio correspondem, considerando abreviações (1-3 caracteres)
     * Ex: "FERREIRA S HONORATO" vs "FERREIRA SELVO HONORATO" -> "S" é abreviação de "SELVO"
     */
    private boolean checkMiddleNamesWithAbbreviations(String[] words1, String[] words2) {
        // Se não há nomes do meio (apenas primeiro e último), retornar true
        if (words1.length <= 2 && words2.length <= 2) {
            return true;
        }
        
        // Pegar nomes do meio (excluindo primeiro e último)
        List<String> middle1 = new ArrayList<>();
        List<String> middle2 = new ArrayList<>();
        
        for (int i = 1; i < words1.length - 1; i++) {
            middle1.add(words1[i]);
        }
        for (int i = 1; i < words2.length - 1; i++) {
            middle2.add(words2[i]);
        }
        
        // Se um não tem nomes do meio e o outro tem, verificar se os nomes do meio do outro podem ser abreviações
        if (middle1.isEmpty() && !middle2.isEmpty()) {
            // Verificar se todos os nomes do meio de words2 são abreviações que podem corresponder a palavras em words1
            return checkIfAllAreAbbreviations(middle2, words1);
        }
        if (middle2.isEmpty() && !middle1.isEmpty()) {
            return checkIfAllAreAbbreviations(middle1, words2);
        }
        
        // Se ambos têm nomes do meio, comparar considerando abreviações
        if (middle1.size() == middle2.size()) {
            // Comparar palavra por palavra
            for (int i = 0; i < middle1.size(); i++) {
                String w1 = middle1.get(i);
                String w2 = middle2.get(i);
                
                if (!wordsMatchWithAbbreviation(w1, w2)) {
                    return false;
                }
            }
            return true;
        } else {
            // Números diferentes de nomes do meio - tentar matching flexível
            return flexibleMiddleNameMatch(middle1, middle2, words1, words2);
        }
    }
    
    /**
     * Verifica se uma palavra corresponde a outra, considerando abreviações (1-3 caracteres)
     */
    /**
     * Verifica se duas palavras correspondem, considerando abreviações (1-3 caracteres)
     * Exemplos:
     * - "M" (abreviado) vs "MARIO" (completo) -> true (MARIO começa com M)
     * - "J" (abreviado) vs "JOSE" (completo) -> true (JOSE começa com J)
     * - "JOSE" vs "JOSE" -> true (exato)
     */
    private boolean wordsMatchWithAbbreviation(String word1, String word2) {
        if (word1 == null || word2 == null) {
            return false;
        }
        
        String w1 = word1.trim();
        String w2 = word2.trim();
        
        if (w1.isEmpty() || w2.isEmpty()) {
            return false;
        }
        
        // Verificação exata (case-insensitive)
        if (w1.equalsIgnoreCase(w2)) {
            return true;
        }
        
        // Se uma palavra tem 1-3 caracteres, pode ser abreviação da outra
        // Ex: "M" (1 char) é abreviação de "MARIO" (5 chars)
        if (w1.length() >= 1 && w1.length() <= 3 && w2.length() > w1.length()) {
            // word1 é abreviação? Verificar se word2 começa com word1 (case-insensitive)
            if (w2.toLowerCase().startsWith(w1.toLowerCase())) {
                log.debug("   ✅ Abreviação detectada: '{}' é abreviação de '{}'", w1, w2);
                return true;
            }
        }
        if (w2.length() >= 1 && w2.length() <= 3 && w1.length() > w2.length()) {
            // word2 é abreviação? Verificar se word1 começa com word2 (case-insensitive)
            if (w1.toLowerCase().startsWith(w2.toLowerCase())) {
                log.debug("   ✅ Abreviação detectada: '{}' é abreviação de '{}'", w2, w1);
                return true;
            }
        }
        
        // Verificar se uma contém a outra (para casos como "FERREIRA" vs "FERREIRA")
        if (w1.length() >= 3 && w2.length() >= 3) {
            return w1.toLowerCase().contains(w2.toLowerCase()) || 
                   w2.toLowerCase().contains(w1.toLowerCase());
        }
        
        return false;
    }
    
    /**
     * Verifica se todas as palavras são abreviações que correspondem a palavras no nome completo
     */
    private boolean checkIfAllAreAbbreviations(List<String> abbreviations, String[] fullWords) {
        for (String abbrev : abbreviations) {
            boolean found = false;
            // Verificar se a abreviação corresponde a alguma palavra do nome completo
            for (String fullWord : fullWords) {
                if (wordsMatchWithAbbreviation(abbrev, fullWord)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Matching flexível de nomes do meio quando há números diferentes de palavras
     */
    private boolean flexibleMiddleNameMatch(List<String> middle1, List<String> middle2, 
                                           String[] words1, String[] words2) {
        // Tentar encontrar correspondências entre as palavras do meio
        // Ex: ["FERREIRA", "S"] vs ["FERREIRA", "SELVO"] -> "S" corresponde a "SELVO"
        
        // Criar lista de todas as palavras (exceto primeiro e último) para comparação
        List<String> all1 = new ArrayList<>();
        List<String> all2 = new ArrayList<>();
        
        for (int i = 1; i < words1.length - 1; i++) {
            all1.add(words1[i]);
        }
        for (int i = 1; i < words2.length - 1; i++) {
            all2.add(words2[i]);
        }
        
        // Para cada palavra em all1, verificar se há correspondência em all2
        for (String w1 : all1) {
            boolean found = false;
            for (String w2 : all2) {
                if (wordsMatchWithAbbreviation(w1, w2)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        
        // E vice-versa
        for (String w2 : all2) {
            boolean found = false;
            for (String w1 : all1) {
                if (wordsMatchWithAbbreviation(w1, w2)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Verifica match por último nome truncado (ex: PEREIRA vs PERE, SOARES PEREIRA vs SOARES PERE)
     */
    private boolean checkTruncatedLastName(String name1, String name2) {
        String[] words1 = name1.split("\\s+");
        String[] words2 = name2.split("\\s+");
        
        if (words1.length < 2 || words2.length < 2) {
            return false;
        }
        
        // Pegar último nome de cada
        String last1 = words1[words1.length - 1];
        String last2 = words2[words2.length - 1];
        
        // Verificar se um último nome é prefixo do outro (com pelo menos 4 caracteres)
        boolean truncatedMatch = false;
        if (last1.length() >= 4 && last2.length() >= 4) {
            // Verificar se um começa com o outro (truncamento)
            truncatedMatch = last1.startsWith(last2) || last2.startsWith(last1);
            
            if (truncatedMatch) {
                log.info("🔍 Match por último nome truncado encontrado:");
                log.info("  Último nome 1: '{}' ({} caracteres)", last1, last1.length());
                log.info("  Último nome 2: '{}' ({} caracteres)", last2, last2.length());
                log.info("  Match: {}", truncatedMatch);
            }
        }
        
        // Também verificar se os primeiros nomes batem
        if (truncatedMatch) {
            String first1 = words1[0];
            String first2 = words2[0];
            boolean firstMatches = first1.equals(first2) || 
                                  (first1.length() >= 3 && first2.length() >= 3 && 
                                   (first1.contains(first2) || first2.contains(first1)));
            
            if (firstMatches) {
                log.info("✅ Match completo por último nome truncado: primeiro nome também bate");
                return true;
            }
        }
        
        return truncatedMatch;
    }

    /**
     * Limpa texto para exibição segura no PDF
     */
    private String cleanText(String text) {
        if (text == null) {
            return "N/A";
        }
        
        // Remover caracteres especiais que podem causar problemas no PDF
        return text.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s\\.\\-\\,]", "")
                  .replaceAll("\\s+", " ")
                  .trim();
    }

    /**
     * Exclui um documento unificado pelo nome do arquivo
     */
    public boolean deleteUnifiedDocument(String fileName) throws IOException {
        log.info("🗑️ Excluindo documento unificado: {}", fileName);
        
        boolean fileDeleted = false;
        boolean dbRecordDeleted = false;
        
        try {
            // PASSO 1: Excluir o arquivo físico
            Path basePath = Paths.get("uploads", "unified");
            Path filePath = findFileRecursively(basePath, fileName);
            
            if (filePath != null) {
                log.info("✅ Arquivo encontrado em: {}", filePath);
                
                // Verificar se é um arquivo PDF
                if (fileName.toLowerCase().endsWith(".pdf")) {
                    // Excluir o arquivo
                    fileDeleted = Files.deleteIfExists(filePath);
                    
                    if (fileDeleted) {
                        log.info("✅ Arquivo físico excluído com sucesso: {}", fileName);
                        
                        // Tentar excluir a pasta pai se estiver vazia
                        Path parentDir = filePath.getParent();
                        if (parentDir != null && Files.exists(parentDir)) {
                            try {
                                if (Files.list(parentDir).findFirst().isEmpty()) {
                                    Files.deleteIfExists(parentDir);
                                    log.info("✅ Pasta vazia removida: {}", parentDir);
                                }
                            } catch (IOException e) {
                                log.warn("⚠️ Não foi possível verificar/remover pasta pai: {}", e.getMessage());
                            }
                        }
                    } else {
                        log.warn("⚠️ Arquivo físico não pôde ser excluído: {}", fileName);
                    }
                } else {
                    log.warn("⚠️ Tipo de arquivo não permitido: {}", fileName);
                }
            } else {
                log.warn("⚠️ Arquivo físico não encontrado: {}", fileName);
            }
            
            // PASSO 2: Excluir o registro do banco de dados
            try {
                List<UnifiedDocument> documentsToDelete = unifiedDocumentRepository.findByFileName(fileName);
                
                if (!documentsToDelete.isEmpty()) {
                    unifiedDocumentRepository.deleteAll(documentsToDelete);
                    dbRecordDeleted = true;
                    log.info("✅ {} registro(s) excluído(s) do banco de dados para o arquivo: {}", 
                        documentsToDelete.size(), fileName);
                } else {
                    log.warn("⚠️ Nenhum registro encontrado no banco para o arquivo: {}", fileName);
                }
            } catch (Exception dbError) {
                log.error("💥 Erro ao excluir registro do banco de dados: {}", dbError.getMessage(), dbError);
                // Continuar mesmo se falhar a exclusão do banco
            }
            
            // Retornar true se pelo menos uma operação foi bem-sucedida
            return fileDeleted || dbRecordDeleted;
            
        } catch (Exception e) {
            log.error("💥 Erro ao excluir documento: {}", e.getMessage(), e);
            throw new IOException("Erro ao excluir documento: " + e.getMessage(), e);
        }
    }

    /**
     * Método auxiliar para encontrar arquivo recursivamente
     */
    private Path findFileRecursively(Path basePath, String fileName) {
        try {
            if (!Files.exists(basePath)) {
                return null;
            }
            
            // Tentar caminho direto primeiro
            Path directPath = basePath.resolve(fileName);
            if (Files.exists(directPath)) {
                return directPath;
            }
            
            // Buscar recursivamente
            return Files.walk(basePath)
                .filter(Files::isRegularFile)
                .filter(path -> path.getFileName().toString().equals(fileName))
                .findFirst()
                .orElse(null);
                
        } catch (IOException e) {
            log.error("💥 Erro ao procurar arquivo recursivamente: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Cria documentos unificados para todos os funcionários automaticamente
     */
    public List<String> createAllUnifiedDocuments() throws IOException {
        log.info("🎯 Criando holerites expandidos para todos os funcionários...");
        
        List<String> createdDocuments = new ArrayList<>();
        
        try {
            // Buscar todos os holerites disponíveis
            log.info("🔍 Buscando holerites no serviço...");
            List<Payslip> payslips = payslipService.getAllPayslips();
            log.info("📊 Encontrados {} holerites", payslips.size());
            
            if (payslips.isEmpty()) {
                log.warn("⚠️ Nenhum holerite encontrado para processar");
                return createdDocuments;
            }
            
            // Mostrar detalhes dos holerites encontrados
            log.info("📋 Detalhes dos holerites encontrados:");
            for (Payslip payslip : payslips) {
                log.info("  - ID: {}, Nome: '{}', Mês: {}, Ano: {}, CPF: '{}'", 
                    payslip.getId(), 
                    payslip.getEmployeeName(), 
                    payslip.getMonth(), 
                    payslip.getYear(), 
                    payslip.getCpf());
            }
            
            // Agrupar holerites por funcionário e período
            Map<String, List<Payslip>> payslipsByEmployee = payslips.stream()
                .filter(payslip -> payslip.getEmployeeName() != null && 
                                 payslip.getMonth() != null && 
                                 payslip.getYear() != null)
                .collect(Collectors.groupingBy(payslip -> 
                    payslip.getEmployeeName().trim().toUpperCase() + "_" + payslip.getMonth() + "_" + payslip.getYear()
                ));
            
            log.info("👥 Funcionários únicos encontrados: {}", payslipsByEmployee.size());
            log.info("🔑 Chaves de agrupamento:");
            payslipsByEmployee.keySet().forEach(key -> log.info("  - {}", key));
            
            // Para cada funcionário, buscar recibos correspondentes e criar holerite expandido
            for (Map.Entry<String, List<Payslip>> entry : payslipsByEmployee.entrySet()) {
                List<Payslip> employeePayslips = entry.getValue();
                
                if (employeePayslips.isEmpty()) continue;
                
                Payslip firstPayslip = employeePayslips.get(0);
                String employeeName = firstPayslip.getEmployeeName();
                Integer month = firstPayslip.getMonth();
                Integer year = firstPayslip.getYear();
                
                log.info("🔍 Processando funcionário: '{}' - {}/{}", employeeName, month, year);
                
                try {
                    // REGRA DE NEGÓCIO MELHORADA: O comprovante pode ser do mês ANTERIOR, MESMO mês ou SEGUINTE
                    // Ex: Holerite de setembro -> Comprovante de agosto, setembro ou outubro
                    int receiptMonthPrev = month == 1 ? 12 : month - 1;
                    int receiptYearPrev = month == 1 ? year - 1 : year;
                    int receiptMonthNext = month == 12 ? 1 : month + 1;
                    int receiptYearNext = month == 12 ? year + 1 : year;
                    
                    log.info("🔍 Buscando comprovante para holerite {}/{} -> tentando comprovantes: {}/{} (anterior), {}/{} (mesmo), {}/{} (seguinte)", 
                        month, year, receiptMonthPrev, receiptYearPrev, month, year, receiptMonthNext, receiptYearNext);
                    
                    // Usar Set para evitar duplicatas
                    java.util.Set<PaymentReceipt> allReceiptsSet = new java.util.HashSet<>();
                    
                    // ESTRATÉGIA 1: Buscar por CPF via Employee (mais preciso)
                    String payslipCpf = firstPayslip.getCpf();
                    if (payslipCpf != null && !payslipCpf.trim().isEmpty()) {
                        try {
                            String normalizedCpf = payslipCpf.replaceAll("[^0-9]", "");
                            log.info("🔍 Estratégia 1: Buscando Employee por CPF: {}", normalizedCpf);
                            
                            Optional<com.z7design.secured_guard.model.Employee> employeeOpt = employeeRepository.findByCpf(normalizedCpf);
                            if (employeeOpt.isPresent()) {
                                UUID employeeId = employeeOpt.get().getId();
                                log.info("✅ Employee encontrado por CPF: {} (ID: {})", employeeOpt.get().getName(), employeeId);
                                
                                // Buscar comprovantes por employeeId
                                List<PaymentReceipt> receiptsByEmployeeId = receiptRepository.findByEmployeeId(employeeId);
                                allReceiptsSet.addAll(receiptsByEmployeeId);
                                log.info("📋 Encontrados {} comprovante(s) por employeeId", receiptsByEmployeeId.size());
                            } else {
                                log.warn("⚠️ Employee não encontrado por CPF: {}", normalizedCpf);
                            }
                        } catch (Exception e) {
                            log.warn("⚠️ Erro ao buscar Employee por CPF: {}", e.getMessage());
                        }
                    }
                    
                    // ESTRATÉGIA 2: Buscar por nome completo (contains ignore case)
                    String normalizedName = normalizeNameForSearch(employeeName);
                    log.info("🔍 Estratégia 2: Buscando comprovantes por nome completo '{}' (normalizado: '{}')", employeeName, normalizedName);
                    
                    List<PaymentReceipt> receiptsByName = receiptRepository
                        .findByEmployeeNameContainingIgnoreCase(employeeName);
                    allReceiptsSet.addAll(receiptsByName);
                    log.info("📋 Encontrados {} comprovante(s) por nome completo", receiptsByName.size());
                    
                    // ESTRATÉGIA 3: Buscar por partes do nome (primeiro e último nome)
                    String[] nameParts = employeeName.trim().toUpperCase().split("\\s+");
                    if (nameParts.length >= 2) {
                        String firstName = nameParts[0];
                        String lastName = nameParts[nameParts.length - 1];
                        log.info("🔍 Estratégia 3: Buscando por primeiro nome '{}' e último nome '{}'", firstName, lastName);
                        
                        // Buscar por primeiro nome
                        List<PaymentReceipt> receiptsByFirst = receiptRepository
                            .findByEmployeeNameContainingIgnoreCase(firstName);
                        for (PaymentReceipt receipt : receiptsByFirst) {
                            if (receipt.getEmployeeName() != null) {
                                String receiptNameUpper = receipt.getEmployeeName().toUpperCase();
                                // Verificar se contém o último nome
                                if (receiptNameUpper.contains(lastName)) {
                                    allReceiptsSet.add(receipt);
                                }
                            }
                        }
                        log.info("📋 Encontrados {} comprovante(s) adicionais por partes do nome", 
                            allReceiptsSet.size() - receiptsByName.size());
                    }
                    
                    // ESTRATÉGIA 4: Buscar por nome normalizado (sem acentos) - mais flexível
                    if (!normalizedName.equals(employeeName.trim().toLowerCase())) {
                        String[] normalizedParts = normalizedName.split("\\s+");
                        if (normalizedParts.length > 0 && normalizedParts[0].length() >= 3) {
                            log.info("🔍 Estratégia 4: Buscando por nome normalizado (primeira parte: '{}')", normalizedParts[0]);
                            List<PaymentReceipt> receiptsByNormalized = receiptRepository
                                .findByEmployeeNameContainingIgnoreCase(normalizedParts[0]);
                            for (PaymentReceipt receipt : receiptsByNormalized) {
                                String receiptNormalized = normalizeNameForSearch(receipt.getEmployeeName());
                                // Verificar se há overlap significativo entre os nomes normalizados
                                if (normalizedName.contains(receiptNormalized) || 
                                    receiptNormalized.contains(normalizedName) ||
                                    calculateNameSimilarity(normalizedName, receiptNormalized) >= 0.6) {
                                    allReceiptsSet.add(receipt);
                                }
                            }
                        }
                    }
                    
                    // ESTRATÉGIA 5: Buscar por último nome apenas (para casos de nomes muito diferentes)
                    if (nameParts.length >= 2) {
                        String lastName = nameParts[nameParts.length - 1];
                        if (lastName.length() >= 4) {
                            log.info("🔍 Estratégia 5: Buscando por último nome '{}' (apenas se >= 4 caracteres)", lastName);
                            List<PaymentReceipt> receiptsByLast = receiptRepository
                                .findByEmployeeNameContainingIgnoreCase(lastName);
                            for (PaymentReceipt receipt : receiptsByLast) {
                                // Verificar se o primeiro nome também bate (pelo menos parcialmente)
                                String receiptNameUpper = receipt.getEmployeeName() != null ? 
                                    receipt.getEmployeeName().toUpperCase() : "";
                                if (receiptNameUpper.contains(nameParts[0].substring(0, Math.min(3, nameParts[0].length())))) {
                                    allReceiptsSet.add(receipt);
                                }
                            }
                        }
                    }
                    
                    List<PaymentReceipt> allReceipts = new ArrayList<>(allReceiptsSet);
                    log.info("📊 Total de comprovantes únicos encontrados (todas as estratégias): {}", allReceipts.size());
                    
                    // Mostrar detalhes dos recibos encontrados
                    if (!allReceipts.isEmpty()) {
                        log.info("📋 Detalhes dos comprovantes encontrados para '{}':", employeeName);
                        for (PaymentReceipt receipt : allReceipts) {
                            log.info("  - ID: {}, Nome: '{}', Mês: {}, Ano: {}, EmployeeId: {}", 
                                receipt.getId(), 
                                receipt.getEmployeeName(), 
                                receipt.getMonth(), 
                                receipt.getYear(),
                                receipt.getEmployeeId());
                        }
                    }
                    
                    // Filtrar por período - EXPANDIDO: mês anterior, mesmo mês e mês seguinte
                    List<PaymentReceipt> matchingReceipts = new ArrayList<>();
                    
                    // Tentativa 1: Mês seguinte (pagamento típico) - PRIORIDADE ALTA
                    List<PaymentReceipt> receiptsNextMonth = allReceipts.stream()
                        .filter(r -> r.getMonth() != null && r.getMonth().equals(receiptMonthNext))
                        .filter(r -> r.getYear() != null && r.getYear().equals(receiptYearNext))
                        .collect(Collectors.toList());
                    
                    if (!receiptsNextMonth.isEmpty()) {
                        matchingReceipts.addAll(receiptsNextMonth);
                        log.info("✅ Encontrados {} comprovante(s) no mês seguinte {}/{}", 
                            receiptsNextMonth.size(), receiptMonthNext, receiptYearNext);
                    }
                    
                    // Tentativa 2: Mesmo mês - PRIORIDADE MÉDIA
                    List<PaymentReceipt> receiptsSameMonth = allReceipts.stream()
                        .filter(r -> r.getMonth() != null && r.getMonth().equals(month))
                        .filter(r -> r.getYear() != null && r.getYear().equals(year))
                        .filter(r -> !matchingReceipts.contains(r)) // Evitar duplicatas
                        .collect(Collectors.toList());
                    
                    if (!receiptsSameMonth.isEmpty()) {
                        matchingReceipts.addAll(receiptsSameMonth);
                        log.info("✅ Encontrados {} comprovante(s) no mesmo mês {}/{}", 
                            receiptsSameMonth.size(), month, year);
                    }
                    
                    // Tentativa 3: Mês anterior - PRIORIDADE BAIXA (fallback)
                    if (matchingReceipts.isEmpty()) {
                        List<PaymentReceipt> receiptsPrevMonth = allReceipts.stream()
                            .filter(r -> r.getMonth() != null && r.getMonth().equals(receiptMonthPrev))
                            .filter(r -> r.getYear() != null && r.getYear().equals(receiptYearPrev))
                            .collect(Collectors.toList());
                        
                        if (!receiptsPrevMonth.isEmpty()) {
                            matchingReceipts.addAll(receiptsPrevMonth);
                            log.info("✅ Encontrados {} comprovante(s) no mês anterior {}/{} (fallback)", 
                                receiptsPrevMonth.size(), receiptMonthPrev, receiptYearPrev);
                        }
                    }
                    
                    // Filtrar por matching de nome usando verificação flexível
                    List<PaymentReceipt> matchedByName = matchingReceipts.stream()
                        .filter(receipt -> verifyEmployeeNames(employeeName, receipt.getEmployeeName()))
                        .collect(Collectors.toList());
                    
                    log.info("📋 Comprovantes após filtro de nome: {} (de {} por período)", 
                        matchedByName.size(), matchingReceipts.size());
                    
                    // Se não encontrou com verificação flexível, usar os que passaram pelo período
                    if (matchedByName.isEmpty() && !matchingReceipts.isEmpty()) {
                        log.warn("⚠️ Nenhum comprovante passou na verificação de nome, mas {} comprovante(s) encontrado(s) no período. Usando verificação mais flexível...", 
                            matchingReceipts.size());
                        
                        // Tentar matching mais flexível (primeiro e último nome)
                        matchedByName = matchingReceipts.stream()
                            .filter(receipt -> isFlexibleNameMatch(employeeName, receipt.getEmployeeName()))
                            .collect(Collectors.toList());
                        
                        if (!matchedByName.isEmpty()) {
                            log.info("✅ Encontrados {} comprovante(s) com matching flexível", matchedByName.size());
                        } else {
                            // Última tentativa: usar todos os que estão no período se não houver nenhum match
                            log.warn("⚠️ Nenhum match de nome encontrado, mas usando {} comprovante(s) do período como fallback", matchingReceipts.size());
                            matchedByName = matchingReceipts;
                        }
                    }
                    
                    if (!matchedByName.isEmpty()) {
                        log.info("✅ Encontrados {} comprovante(s) para {} - {}/{}", matchedByName.size(), employeeName, month, year);
                        
                        // Criar holerite expandido com todos os recibos
                        String expandedPath = createExpandedHolerite(firstPayslip, matchedByName);
                        createdDocuments.add(expandedPath);
                        
                        log.info("✅ Holerite expandido criado: {}", expandedPath);
                    } else {
                        log.warn("⚠️ Nenhum comprovante encontrado para {} - holerite {}/{} (procurando comprovante {}/{} ou {}/{})", 
                            employeeName, month, year, receiptMonthNext, receiptYearNext, month, year);
                        log.warn("   Total de comprovantes no banco para nome '{}': {}", employeeName, allReceipts.size());
                        if (!allReceipts.isEmpty()) {
                            log.warn("   Períodos dos comprovantes encontrados:");
                            allReceipts.forEach(r -> log.warn("     - {}: {}/{}", 
                                r.getEmployeeName(), r.getMonth(), r.getYear()));
                        }
                    }
                    
                } catch (Exception e) {
                    log.error("💥 Erro ao processar funcionário {}: {}", employeeName, e.getMessage(), e);
                    // Continuar com o próximo funcionário
                }
            }
            
            log.info("🎉 Processamento concluído! {} holerites expandidos criados", createdDocuments.size());
            return createdDocuments;
            
        } catch (Exception e) {
            log.error("💥 Erro ao criar holerites expandidos: {}", e.getMessage(), e);
            throw new IOException("Erro ao criar holerites expandidos: " + e.getMessage(), e);
        }
    }

    /**
     * Verifica se os nomes dos funcionários são EXATAMENTE iguais
     */
    private boolean isExactNameMatch(String holeriteName, String receiptName) {
        if (holeriteName == null || receiptName == null) {
            log.warn("⚠️ Nome nulo detectado - Holerite: {}, Recibo: {}", holeriteName, receiptName);
            return false;
        }
        
        // Normalizar nomes: remover espaços extras, converter para maiúsculas
        String normalizedHolerite = holeriteName.trim().toUpperCase();
        String normalizedReceipt = receiptName.trim().toUpperCase();
        
        // Verificar se são exatamente iguais
        boolean exactMatch = normalizedHolerite.equals(normalizedReceipt);
        
        log.info("🔍 Verificação EXATA de nomes:");
        log.info("  Holerite original: '{}'", holeriteName);
        log.info("  Recibo original: '{}'", receiptName);
        log.info("  Holerite normalizado: '{}'", normalizedHolerite);
        log.info("  Recibo normalizado: '{}'", normalizedReceipt);
        log.info("  Match EXATO: {}", exactMatch ? "✅ SIM" : "❌ NÃO");
        
        // Se não houver match exato, tentar match mais flexível
        if (!exactMatch) {
            // Remover palavras comuns que podem estar causando diferenças
            String cleanHolerite = normalizedHolerite
                .replace("VALOR", "")
                .replace("FUNCIONARIO", "")
                .replace("EMPREGADO", "")
                .replace("COLABORADOR", "")
                .trim();
            
            String cleanReceipt = normalizedReceipt
                .replace("VALOR", "")
                .replace("FUNCIONARIO", "")
                .replace("EMPREGADO", "")
                .replace("COLABORADOR", "")
                .trim();
            
            boolean cleanMatch = cleanHolerite.equals(cleanReceipt);
            
            log.info("🔍 Verificação LIMPA de nomes:");
            log.info("  Holerite limpo: '{}'", cleanHolerite);
            log.info("  Recibo limpo: '{}'", cleanReceipt);
            log.info("  Match LIMPO: {}", cleanMatch ? "✅ SIM" : "❌ NÃO");
            
            if (cleanMatch) {
                log.info("✅ Match encontrado após limpeza - aceitando unificação");
                return true;
            }
            
            // Verificar se um nome contém o outro (mais flexível)
            boolean containsMatch = cleanHolerite.contains(cleanReceipt) || cleanReceipt.contains(cleanHolerite);
            log.info("  Match por contenção: {}", containsMatch ? "✅ SIM" : "❌ NÃO");
            
            if (containsMatch) {
                log.info("✅ Match por contenção encontrado - aceitando unificação");
                return true;
            }
        }
        
        return exactMatch;
    }

    /**
     * Normaliza nome para busca (remove acentos, normaliza espaços, converte para minúsculas)
     * Trata variações comuns como "DA COSTA" vs "DACOSTA", "DE SOUZA" vs "DESOUZA", etc.
     * A estratégia é normalizar removendo espaços após preposições comuns para padronizar.
     */
    /**
     * Normaliza número de conta corrente removendo espaços, hífens e pontos
     */
    private String normalizeAccountNumber(String account) {
        if (account == null) return "";
        return account.replaceAll("[^0-9]", "");
    }
    
    /**
     * Normaliza CPF removendo formatação
     */
    private String normalizeCpf(String cpf) {
        if (cpf == null) return "";
        return cpf.replaceAll("[^0-9]", "");
    }
    
    /**
     * Busca funcionário na tabela employees usando dados do holerite
     * Estratégia: CPF > Nome exato > Nome parcial
     */
    private Employee findEmployeeForPayslip(Payslip payslip) {
        try {
            // ESTRATÉGIA 1: Buscar por CPF
            if (payslip.getCpf() != null && !payslip.getCpf().trim().isEmpty()) {
                String normalizedCpf = payslip.getCpf().replaceAll("[^0-9]", "");
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
    
    private String normalizeNameForSearch(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "";
        }
        
        // Remover acentos
        String withoutAccents = Normalizer.normalize(name.trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        
        // Normalizar espaços e converter para minúsculas
        String normalized = withoutAccents
            .replaceAll("\\s+", " ")
            .trim()
            .toLowerCase();
        
        // Primeiro, tratar casos onde preposições estão juntas com a palavra seguinte
        // Ex: "dacosta" -> "da costa", "desouza" -> "de souza"
        // Isso padroniza para o formato com espaço
        normalized = normalized
            .replaceAll("\\bda([a-z]{2,})", "da $1")  // "dacosta" -> "da costa"
            .replaceAll("\\bde([a-z]{2,})", "de $1")  // "desouza" -> "de souza"
            .replaceAll("\\bdos([a-z]{2,})", "dos $1") // "dossantos" -> "dos santos"
            .replaceAll("\\bdas([a-z]{2,})", "das $1") // "dasneves" -> "das neves"
            .replaceAll("\\bdo([a-z]{2,})", "do $1")   // "donascimento" -> "do nascimento"
            .replaceAll("\\bdel([a-z]{2,})", "del $1") // "delcastillo" -> "del castillo"
            .replaceAll("\\bdu([a-z]{2,})", "du $1")   // "dumont" -> "du mont"
            .replaceAll("\\bvan([a-z]{2,})", "van $1") // "vanderberg" -> "van derberg"
            .replaceAll("\\bvon([a-z]{2,})", "von $1") // "vonneumann" -> "von neumann"
            .replaceAll("\\s+", " ")                    // Normalizar espaços
            .trim();
        
        // Agora, remover espaços após preposições para padronizar
        // Ex: "da costa" -> "dacosta", "de souza" -> "desouza"
        // Isso garante que ambos os formatos sejam normalizados para o mesmo resultado
        normalized = normalized
            .replaceAll("\\bda\\s+", "da")  // "da costa" -> "dacosta"
            .replaceAll("\\bde\\s+", "de")  // "de souza" -> "desouza"
            .replaceAll("\\bdos\\s+", "dos") // "dos santos" -> "dossantos"
            .replaceAll("\\bdas\\s+", "das") // "das neves" -> "dasneves"
            .replaceAll("\\bdo\\s+", "do")   // "do nascimento" -> "donascimento"
            .replaceAll("\\bdel\\s+", "del") // "del castillo" -> "delcastillo"
            .replaceAll("\\bdu\\s+", "du")   // "du mont" -> "dumont"
            .replaceAll("\\bvan\\s+", "van") // "van der berg" -> "vanderberg"
            .replaceAll("\\bvon\\s+", "von") // "von neumann" -> "vonneumann"
            .replaceAll("\\s+", " ")         // Normalizar espaços novamente
            .trim();
        
        // Log mais detalhado para nomes com preposições
        if (normalized.contains("dacosta") || normalized.contains("desouza") || 
            normalized.contains("dossantos") || normalized.contains("dasneves") ||
            name.toLowerCase().contains("da costa") || name.toLowerCase().contains("de souza")) {
            log.info("🔍 Normalização de nome com preposição: '{}' -> '{}'", name, normalized);
        } else {
            log.debug("🔍 Normalização de nome: '{}' -> '{}'", name, normalized);
        }
        
        return normalized;
    }

    /**
     * Calcula similaridade entre dois nomes (0.0 a 1.0)
     * Usa algoritmo de similaridade baseado em palavras comuns
     */
    private double calculateNameSimilarity(String name1, String name2) {
        if (name1 == null || name2 == null || name1.isEmpty() || name2.isEmpty()) {
            return 0.0;
        }
        
        String[] words1 = name1.split("\\s+");
        String[] words2 = name2.split("\\s+");
        
        if (words1.length == 0 || words2.length == 0) {
            return 0.0;
        }
        
        int commonWords = 0;
        int totalWords = Math.max(words1.length, words2.length);
        
        for (String word1 : words1) {
            if (word1.length() >= 3) { // Ignorar palavras muito curtas
                for (String word2 : words2) {
                    if (word2.length() >= 3) {
                        // Verificar match exato ou por prefixo (para truncamentos)
                        if (word1.equals(word2) || 
                            (word1.length() >= 4 && word2.length() >= 4 && 
                             (word1.startsWith(word2) || word2.startsWith(word1)))) {
                            commonWords++;
                            break;
                        }
                    }
                }
            }
        }
        
        return totalWords > 0 ? (double) commonWords / totalWords : 0.0;
    }

    /**
     * Matching flexível baseado em primeiro e último nome - com suporte a truncamentos
     */
    private boolean isFlexibleNameMatch(String name1, String name2) {
        if (name1 == null || name2 == null || name1.trim().isEmpty() || name2.trim().isEmpty()) {
            return false;
        }
        
        String normalized1 = normalizeNameForSearch(name1);
        String normalized2 = normalizeNameForSearch(name2);
        
        // Se já são iguais após normalização, retornar true
        if (normalized1.equals(normalized2)) {
            return true;
        }
        
        // Usar a mesma lógica de verificação com abreviações
        return checkNamesWithAbbreviations(normalized1, normalized2) || 
               checkKeywordMatch(normalized1, normalized2);
    }

    /**
     * Cria um holerite expandido preservando o layout original e anexando recibos
     */
    public String createExpandedHolerite(Payslip payslip, List<PaymentReceipt> receipts) throws IOException {
        log.info("=== 🎯 CRIANDO HOLERITE EXPANDIDO ===");
        log.info("Funcionário: {}", payslip.getEmployeeName());
        log.info("Mês/Ano: {}/{}", payslip.getMonth(), payslip.getYear());
        log.info("Recibos encontrados: {}", receipts.size());

        // Criar diretório se não existir
        Path expandedPath = Paths.get(UNIFIED_DIR, "expanded").toAbsolutePath();
        if (!Files.exists(expandedPath)) {
            Files.createDirectories(expandedPath);
            log.info("Diretório criado: {}", expandedPath);
        }

        // Nome do arquivo expandido
        String fileName = generateExpandedHoleriteFileName(payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear());
        String filePath = expandedPath.resolve(fileName).toString();

        try (PDDocument expandedDocument = new PDDocument()) {
            
            // PÁGINA 1: HOLERITE ORIGINAL (PRESERVANDO LAYOUT)
            log.info("📄 Adicionando página 1: Holerite Original (layout preservado)");
            addOriginalHoleritePage(expandedDocument, payslip);
            
            // PÁGINAS ADICIONAIS: RECIBOS DE PAGAMENTO
            if (!receipts.isEmpty()) {
                for (int i = 0; i < receipts.size(); i++) {
                    PaymentReceipt receipt = receipts.get(i);
                    log.info("📄 Adicionando página {}: Recibo de Pagamento {}", i + 2, i + 1);
                    addReceiptPage(expandedDocument, receipt);
                }
            } else {
                log.info("📄 Nenhum recibo para anexar");
            }
            
            // Salvar documento expandido
            expandedDocument.save(filePath);
            log.info("✅ Holerite expandido criado: {}", filePath);
            
            // Verificar se foi criado
            File savedFile = new File(filePath);
            if (savedFile.exists()) {
                log.info("📊 Arquivo verificado: {} bytes", savedFile.length());
            } else {
                throw new IOException("Arquivo expandido não foi criado");
            }
            
            return filePath;
            
        } catch (Exception e) {
            log.error("💥 Erro ao criar holerite expandido: {}", e.getMessage(), e);
            throw new IOException("Erro ao criar holerite expandido: " + e.getMessage(), e);
        }
    }

    /**
     * Adiciona o holerite original preservando seu layout
     */
    private void addOriginalHoleritePage(PDDocument document, Payslip payslip) throws IOException {
        try {
            // Tentar carregar o arquivo PDF original do holerite
            String holeriteFilePath = findHoleriteOriginalFile(payslip);
            
            if (holeriteFilePath != null && Files.exists(Paths.get(holeriteFilePath))) {
                log.info("📄 Carregando holerite original: {}", holeriteFilePath);
                
                // Carregar o PDF original
                try (PDDocument holeriteDoc = PDDocument.load(new File(holeriteFilePath))) {
                    // Copiar todas as páginas do holerite original
                    for (int i = 0; i < holeriteDoc.getNumberOfPages(); i++) {
                        PDPage page = holeriteDoc.getPage(i);
                        document.addPage(page);
                        log.info("📄 Página {} do holerite original adicionada", i + 1);
                    }
                }
            } else {
                log.warn("⚠️ Arquivo original do holerite não encontrado, criando página padrão");
                // Fallback: criar uma página padrão se o arquivo original não for encontrado
                addHoleritePage(document, payslip);
            }
            
        } catch (Exception e) {
            log.error("💥 Erro ao adicionar holerite original: {}", e.getMessage());
            // Fallback: criar uma página padrão em caso de erro
            addHoleritePage(document, payslip);
        }
    }

    /**
     * Tenta encontrar o arquivo PDF original do holerite usando o Payslip do banco
     */
    private String findHoleriteOriginalFile(Payslip payslip) {
        // Usar o método já existente e atualizado
        return findHoleriteOriginalFileByNameAndPeriod(
            payslip.getEmployeeName(), 
            payslip.getMonth(), 
            payslip.getYear()
        );
    }

    /**
     * Gera nome de arquivo para holerite expandido
     */
    private String generateExpandedHoleriteFileName(String employeeName, int month, int year) {
        String cleanName = employeeName.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "").replaceAll("\\s+", "_");
        return String.format("HOLERITE_EXPANDIDO_%s_%d_%d.pdf", cleanName.toUpperCase(), month, year);
    }

    /**
     * Adiciona página de resumo e verificação
     */
    private void addSummaryPage(PDDocument document, Payslip payslip, List<PaymentReceipt> receipts) throws IOException {
        PDPage page = new PDPage();
        document.addPage(page);
        
        PDPageContentStream contentStream = new PDPageContentStream(document, page);
        
        try {
            // Configurar fonte
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 16);
            contentStream.setNonStrokingColor(0, 0, 0);
            
            // Título
            contentStream.beginText();
            contentStream.newLineAtOffset(50, 750);
            contentStream.showText("RESUMO E VERIFICAÇÃO - HOLERITE EXPANDIDO");
            contentStream.endText();
            
            // Informações do funcionário
            contentStream.setFont(PDType1Font.HELVETICA, 12);
            contentStream.beginText();
            contentStream.newLineAtOffset(50, 700);
            contentStream.showText("Funcionário: " + cleanText(payslip.getEmployeeName()));
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Período: " + payslip.getMonth() + "/" + payslip.getYear());
            contentStream.newLineAtOffset(0, -20);
            contentStream.showText("Total de Recibos Anexados: " + receipts.size());
            contentStream.endText();
            
            // Lista de recibos
            int yPosition = 570;
            if (!receipts.isEmpty()) {
                contentStream.beginText();
                contentStream.newLineAtOffset(50, 600);
                contentStream.showText("Recibos Incluídos:");
                contentStream.endText();
                
                for (int i = 0; i < receipts.size(); i++) {
                    PaymentReceipt receipt = receipts.get(i);
                    String receiptInfo = String.format("%d. %s - R$ %.2f", 
                        i + 1, 
                        cleanText(receipt.getEmployeeName() != null ? receipt.getEmployeeName() : "N/A"),
                        receipt.getNetSalary() != null ? receipt.getNetSalary() : 0.0
                    );
                    
                    contentStream.beginText();
                    contentStream.newLineAtOffset(70, yPosition);
                    contentStream.showText(receiptInfo);
                    contentStream.endText();
                    
                    yPosition -= 20;
                    
                    // Quebrar página se necessário
                    if (yPosition < 100 && i < receipts.size() - 1) {
                        contentStream.close();
                        PDPage newPage = new PDPage();
                        document.addPage(newPage);
                        contentStream = new PDPageContentStream(document, newPage);
                        yPosition = 750;
                    }
                }
            }
            
            // Verificação de nomes
            contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
            contentStream.beginText();
            contentStream.newLineAtOffset(50, yPosition - 40);
            contentStream.showText("Verificação de Consistência:");
            contentStream.endText();
            
            contentStream.setFont(PDType1Font.HELVETICA, 10);
            if (!receipts.isEmpty()) {
                boolean namesConsistent = receipts.stream()
                    .allMatch(receipt -> verifyEmployeeNames(payslip.getEmployeeName(), receipt.getEmployeeName()));
                
                contentStream.beginText();
                contentStream.newLineAtOffset(70, yPosition - 60);
                contentStream.showText("Nomes Consistentes: " + (namesConsistent ? "✅ Sim" : "❌ Não"));
                contentStream.endText();
            } else {
                contentStream.beginText();
                contentStream.newLineAtOffset(70, yPosition - 60);
                contentStream.showText("Nomes Consistentes: N/A (sem recibos para comparar)");
                contentStream.endText();
            }
            
            // Rodapé
            contentStream.setFont(PDType1Font.HELVETICA, 8);
            contentStream.beginText();
            contentStream.newLineAtOffset(50, 50);
            contentStream.showText("Documento gerado automaticamente em: " + 
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
            contentStream.endText();
            
        } finally {
            contentStream.close();
        }
    }

    /**
     * Cria documentos unificados em lote para múltiplos funcionários
     * Verifica rigorosamente se os nomes no Holerite e Comprovante coincidem
     */
    public com.z7design.secured_guard.dto.BatchUnificationResult createBatchUnifiedDocuments(
            com.z7design.secured_guard.dto.BatchUnificationRequest request) {
        
        long startTime = System.currentTimeMillis();
        log.info("=== 🎯 INICIANDO UNIFICAÇÃO EM LOTE ===");
        log.info("Filtros: Mês={}, Ano={}, ForceUnification={}", 
            request.getMonth(), request.getYear(), request.getForceUnification());
        
        com.z7design.secured_guard.dto.BatchUnificationResult result = com.z7design.secured_guard.dto.BatchUnificationResult.builder()
            .successList(new ArrayList<>())
            .failureList(new ArrayList<>())
            .build();
        
        try {
            // OTIMIZAÇÃO 1: Pré-carregar todos os dados necessários de uma vez
            log.info("⚡ Pré-carregando dados para otimização...");
            
            // 1. Buscar todos os holerites
            List<Payslip> allPayslips = payslipService.getAllPayslips();
            log.info("📊 Total de holerites no banco: {}", allPayslips.size());
            
            // 2. Filtrar por período se especificado
            List<Payslip> filteredPayslips = allPayslips.stream()
                .filter(p -> request.getMonth() == null || p.getMonth().equals(request.getMonth()))
                .filter(p -> request.getYear() == null || p.getYear().equals(request.getYear()))
                .filter(p -> p.getEmployeeName() != null && p.getMonth() != null && p.getYear() != null)
                .toList();
            
            log.info("📊 Holerites após filtro: {}", filteredPayslips.size());
            result.setTotalProcessed(filteredPayslips.size());
            
            // OTIMIZAÇÃO 2: Pré-carregar todos os employees em um mapa (CPF -> Employee e Nome -> Employee)
            Map<String, Employee> employeesByCpf = new HashMap<>();
            Map<String, Employee> employeesByName = new HashMap<>();
            List<Employee> allEmployees = employeeRepository.findAll();
            for (Employee emp : allEmployees) {
                if (emp.getDocument() != null) {
                    String normalizedCpf = normalizeCpf(emp.getDocument());
                    if (!normalizedCpf.isEmpty()) {
                        employeesByCpf.put(normalizedCpf, emp);
                    }
                }
                if (emp.getName() != null) {
                    String normalizedName = normalizeNameForSearch(emp.getName());
                    if (!normalizedName.isEmpty()) {
                        employeesByName.put(normalizedName, emp);
                    }
                }
            }
            log.info("⚡ Pré-carregados {} employees em cache", allEmployees.size());
            
            // OTIMIZAÇÃO 3: Pré-carregar comprovantes por período (mês seguinte e mesmo mês)
            Map<String, List<PaymentReceipt>> receiptsByPeriod = new HashMap<>();
            for (Payslip p : filteredPayslips) {
                int receiptMonthNext = p.getMonth() == 12 ? 1 : p.getMonth() + 1;
                int receiptYearNext = p.getMonth() == 12 ? p.getYear() + 1 : p.getYear();
                String keyNext = receiptMonthNext + "_" + receiptYearNext;
                String keySame = p.getMonth() + "_" + p.getYear();
                
                if (!receiptsByPeriod.containsKey(keyNext)) {
                    receiptsByPeriod.put(keyNext, receiptRepository.findByYearAndMonth(receiptYearNext, receiptMonthNext));
                }
                if (!receiptsByPeriod.containsKey(keySame)) {
                    receiptsByPeriod.put(keySame, receiptRepository.findByYearAndMonth(p.getYear(), p.getMonth()));
                }
            }
            log.info("⚡ Pré-carregados comprovantes para {} períodos", receiptsByPeriod.size());
            
            // 3. Agrupar por funcionário e período (um documento por funcionário/mês/ano)
            Map<String, Payslip> uniquePayslips = filteredPayslips.stream()
                .collect(Collectors.toMap(
                    p -> p.getEmployeeName().trim().toUpperCase() + "_" + p.getMonth() + "_" + p.getYear(),
                    p -> p,
                    (existing, replacement) -> existing  // Manter o primeiro se houver duplicatas
                ));
            
            log.info("👥 Funcionários únicos a processar: {}", uniquePayslips.size());
            
            // 4. Processar cada funcionário
            for (Payslip payslip : uniquePayslips.values()) {
                String employeeName = payslip.getEmployeeName();
                Integer month = payslip.getMonth();
                Integer year = payslip.getYear();
                
                log.info("🔄 Processando: {} - {}/{}", employeeName, month, year);
                
                com.z7design.secured_guard.dto.BatchUnificationResult.UnificationDetail detail = 
                    com.z7design.secured_guard.dto.BatchUnificationResult.UnificationDetail.builder()
                        .employeeName(employeeName)
                        .month(month)
                        .year(year)
                        .build();
                
                try {
                    // 4.1. Buscar arquivo do holerite - PRIMEIRO BUSCAR NO BANCO DE DADOS
                    String holeritePath = null;
                    String holeriteErrorReason = null;
                    
                    // Buscar holerite no banco de dados
                    final String cleanEmployeeName = cleanText(employeeName);
                    String normalizedSearchNameHolerite = normalizeNameForSearch(cleanEmployeeName);
                    
                    // Buscar holerites no banco para o período
                    List<Payslip> payslipsInDb = payslipService.getAllPayslips().stream()
                        .filter(p -> p.getMonth() != null && p.getMonth().equals(month))
                        .filter(p -> p.getYear() != null && p.getYear().equals(year))
                        .collect(java.util.stream.Collectors.toList());
                    
                    Payslip matchingPayslip = null;
                    for (Payslip p : payslipsInDb) {
                        if (p.getEmployeeName() != null) {
                            String normalizedPayslipName = normalizeNameForSearch(p.getEmployeeName());
                            boolean exactMatch = normalizedPayslipName.equals(normalizedSearchNameHolerite);
                            boolean containsMatch = normalizedPayslipName.contains(normalizedSearchNameHolerite) || 
                                                   normalizedSearchNameHolerite.contains(normalizedPayslipName);
                            boolean verifyMatch = verifyEmployeeNames(cleanEmployeeName, p.getEmployeeName());
                            
                            if (exactMatch || containsMatch || verifyMatch) {
                                matchingPayslip = p;
                                break;
                            }
                        }
                    }
                    
                    // Se encontrou no banco, usar o arquivoCaminho
                    if (matchingPayslip != null && matchingPayslip.getArquivoCaminho() != null) {
                        holeritePath = matchingPayslip.getArquivoCaminho();
                        Path absolutePath = Paths.get(holeritePath);
                        if (Files.exists(absolutePath)) {
                            holeritePath = absolutePath.toAbsolutePath().toString();
                        } else {
                            Path relativePath = Paths.get(System.getProperty("user.dir"), holeritePath);
                            if (Files.exists(relativePath)) {
                                holeritePath = relativePath.toAbsolutePath().toString();
                            } else {
                                holeritePath = null;
                                holeriteErrorReason = String.format("Holerite encontrado no banco mas arquivo não existe. Caminho: %s", matchingPayslip.getArquivoCaminho());
                            }
                        }
                    }
                    
                    // Se não encontrou no banco ou arquivo não existe, buscar nos diretórios conhecidos
                    if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
                        holeritePath = findHoleriteOriginalFileByNameAndPeriod(cleanEmployeeName, month, year);
                        if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
                            holeriteErrorReason = holeriteErrorReason != null ? holeriteErrorReason : 
                                String.format("Holerite não encontrado no banco nem nos arquivos físicos. Total de holerites no banco para %d/%d: %d", 
                                    month, year, payslipsInDb.size());
                        }
                    }
                    
                    detail.setHoleriteFound(holeritePath != null && Files.exists(Paths.get(holeritePath)) ? "✅ Sim" : "❌ Não");
                    
                    if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
                        detail.setStatus("FALHA");
                        detail.setMessage(holeriteErrorReason != null ? holeriteErrorReason : "Arquivo PDF do holerite não encontrado");
                        result.getFailureList().add(detail);
                        result.setTotalFailed(result.getTotalFailed() + 1);
                        log.warn("❌ Holerite não encontrado para {} - {}/{}: {}", employeeName, month, year, holeriteErrorReason);
                        continue;
                    }
                    
                    // 4.2. Buscar comprovantes para o funcionário usando múltiplas estratégias
                    // ESTRATÉGIA MELHORADA: Primeiro buscar por PERÍODO, depois verificar NOME
                    // Isso resolve o problema onde o comprovante existe mas o nome pode ter pequenas diferenças
                    String normalizedEmployeeName = normalizeNameForSearch(employeeName);
                    log.info("🔍 Buscando comprovantes para '{}' (normalizado: '{}')", employeeName, normalizedEmployeeName);
                    
                    // REGRA DE NEGÓCIO: O comprovante de pagamento pode ser do mês SEGUINTE ou do MESMO mês
                    // Ex: Holerite de setembro -> Comprovante de outubro (mês do pagamento) OU setembro
                    int receiptMonthNext = month == 12 ? 1 : month + 1;
                    int receiptYearNext = month == 12 ? year + 1 : year;
                    
                    log.info("🔍 Buscando comprovante para holerite {}/{} -> tentando comprovante {}/{} (mês seguinte) ou {}/{} (mesmo mês)", 
                        month, year, receiptMonthNext, receiptYearNext, month, year);
                    
                    // OTIMIZAÇÃO: Usar cache pré-carregado de comprovantes
                    List<PaymentReceipt> receiptsInPeriod = new ArrayList<>();
                    
                    // Tentativa 1: Mês seguinte (pagamento típico)
                    String keyNext = receiptMonthNext + "_" + receiptYearNext;
                    List<PaymentReceipt> receiptsNextMonth = receiptsByPeriod.getOrDefault(keyNext, new ArrayList<>());
                    log.info("📋 Encontrados {} comprovante(s) no cache para o período {}/{} (mês seguinte)", 
                        receiptsNextMonth.size(), receiptMonthNext, receiptYearNext);
                    receiptsInPeriod.addAll(receiptsNextMonth);
                    
                    // Tentativa 2: Mesmo mês (fallback)
                    String keySame = month + "_" + year;
                    List<PaymentReceipt> receiptsSameMonth = receiptsByPeriod.getOrDefault(keySame, new ArrayList<>());
                    log.info("📋 Encontrados {} comprovante(s) no cache para o período {}/{} (mesmo mês)", 
                        receiptsSameMonth.size(), month, year);
                    // Adicionar apenas os que não estão na lista do mês seguinte
                    Set<UUID> existingIds = receiptsInPeriod.stream()
                        .map(PaymentReceipt::getId)
                        .collect(Collectors.toSet());
                    for (PaymentReceipt receipt : receiptsSameMonth) {
                        if (!existingIds.contains(receipt.getId())) {
                            receiptsInPeriod.add(receipt);
                        }
                    }
                    
                    log.info("📊 Total de comprovantes no período: {} ({} do mês seguinte + {} do mesmo mês)", 
                        receiptsInPeriod.size(), receiptsNextMonth.size(), receiptsSameMonth.size());
                    
                    // ESTRATÉGIA 2: Verificar se algum comprovante do período corresponde ao nome do funcionário
                    // REGRA DE NEGÓCIO: Comparar Nome, Valor Líquido e Conta Corrente (quando disponível)
                    // NOVA ESTRATÉGIA: Usar o nome da conta creditada do comprovante e verificar no PDF do holerite
                    // se esse nome aparece na mesma linha do código e CPF
                    List<PaymentReceipt> matchedByName = new ArrayList<>();
                    
                    // OTIMIZAÇÃO: Buscar funcionário no cache pré-carregado (mais rápido)
                    Employee employee = null;
                    if (payslip.getCpf() != null) {
                        String normalizedCpf = normalizeCpf(payslip.getCpf());
                        employee = employeesByCpf.get(normalizedCpf);
                        if (employee != null) {
                            log.debug("✅ Employee encontrado por CPF no cache: {} (ID: {})", employee.getName(), employee.getId());
                        }
                    }
                    if (employee == null && employeeName != null && !employeeName.trim().isEmpty()) {
                        String normalizedEmployeeNameForCache = normalizeNameForSearch(employeeName);
                        employee = employeesByName.get(normalizedEmployeeNameForCache);
                        if (employee != null) {
                            log.debug("✅ Employee encontrado por nome no cache: {} (ID: {})", employee.getName(), employee.getId());
                        }
                    }
                    // Fallback: buscar via método tradicional se não encontrou no cache
                    if (employee == null) {
                        employee = findEmployeeForPayslip(payslip);
                    }
                    if (employee != null) {
                        log.info("✅ Funcionário encontrado na tabela employees: {} (ID: {}, CPF: {}, Conta: {})", 
                            employee.getName(), employee.getId(), 
                            employee.getDocument() != null ? employee.getDocument() : "N/A",
                            employee.getContaCorrente() != null ? employee.getContaCorrente() : "N/A");
                    }
                    
                    // Primeiro, tentar buscar usando o nome da conta creditada do comprovante
                    for (PaymentReceipt receipt : receiptsInPeriod) {
                        if (receipt.getEmployeeName() == null && receipt.getCreditedName() == null) {
                            continue;
                        }
                        
                        // Usar o nome da conta creditada (que pode estar abreviado) ou o nome do funcionário
                        String receiptName = receipt.getCreditedName() != null ? receipt.getCreditedName() : receipt.getEmployeeName();
                        
                        // Verificar no PDF do holerite se o nome do comprovante aparece na mesma linha do código e CPF
                        Payslip matchedPayslip = findPayslipByReceiptNameInPDF(receiptName, List.of(payslip));
                        
                        boolean nameMatches = false;
                        boolean cpfMatches = false;
                        boolean valueMatches = false;
                        boolean accountMatches = false;
                        
                        // 1. VERIFICAR NOME
                        if (matchedPayslip != null) {
                            nameMatches = true;
                            log.debug("✅ Comprovante '{}' corresponde ao holerite '{}' (verificado no PDF)", 
                                receiptName, payslip.getEmployeeName());
                        } else {
                            // Fallback: verificar usando estratégias tradicionais de matching
                            boolean exactMatch = verifyEmployeeNames(employeeName, receipt.getEmployeeName());
                            boolean flexibleMatch = isFlexibleNameMatch(employeeName, receipt.getEmployeeName());
                            String receiptNormalizedName = normalizeNameForSearch(receipt.getEmployeeName());
                            boolean normalizedMatch = receiptNormalizedName.contains(normalizedEmployeeName) || 
                                normalizedEmployeeName.contains(receiptNormalizedName);
                            
                            nameMatches = exactMatch || flexibleMatch || normalizedMatch;
                        }
                        
                        // 2. VERIFICAR CPF (prioridade alta para matching preciso)
                        if (payslip.getCpf() != null) {
                            String payslipCpf = normalizeCpf(payslip.getCpf());
                            if (!payslipCpf.isEmpty()) {
                                // Verificar CPF do employee se disponível
                                if (employee != null && employee.getDocument() != null) {
                                    String employeeCpf = normalizeCpf(employee.getDocument());
                                    if (payslipCpf.equals(employeeCpf)) {
                                        // Se o receipt tem employeeId, verificar se corresponde
                                        if (receipt.getEmployeeId() != null && receipt.getEmployeeId().equals(employee.getId())) {
                                            cpfMatches = true;
                                            log.debug("✅ CPF corresponde (via employeeId do receipt): {}", payslipCpf);
                                        } else {
                                            // Verificar se o receipt pertence a um employee com mesmo CPF
                                            cpfMatches = true; // Se o employee tem o CPF, assume match
                                            log.debug("✅ CPF corresponde (via employee): {}", payslipCpf);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 3. VERIFICAR VALOR (Valor Líquido do Holerite vs Valor do Comprovante)
                        if (payslip.getNetValue() != null && receipt.getNetSalary() != null) {
                            valueMatches = payslip.getNetValue().compareTo(receipt.getNetSalary()) == 0;
                        }
                        
                        // 4. VERIFICAR CONTA CORRENTE USANDO TABELA EMPLOYEES (quando não tiver no holerite)
                        // PRIORIDADE: Se não encontrou match de conta corrente no holerite, buscar na tabela employees
                        if (employee != null && employee.getContaCorrente() != null && receipt.getCreditedAccount() != null) {
                            String employeeAccount = normalizeAccountNumber(employee.getContaCorrente());
                            String receiptAccount = normalizeAccountNumber(receipt.getCreditedAccount());
                            accountMatches = employeeAccount.equals(receiptAccount);
                            
                            if (accountMatches) {
                                log.debug("✅ Conta corrente corresponde (via tabela employees): '{}' = '{}'", 
                                    employeeAccount, receiptAccount);
                            }
                        }
                        
                        // REGRA DE NEGÓCIO MELHORADA: Match se (Nome OU CPF) E Valor correspondem
                        // Conta Corrente é usado para validação adicional quando disponível
                        boolean basicMatch = (nameMatches || cpfMatches) && valueMatches;
                        
                        if (basicMatch) {
                            // Se conta corrente foi verificada e não corresponde, dar aviso mas ainda fazer match
                            // (conta corrente é validação adicional, não bloqueante)
                            if (accountMatches) {
                                matchedByName.add(receipt);
                                log.info("✅ Comprovante adicionado ao match - Nome: {}, CPF: {}, Valor: {}, Conta: ✅", 
                                    nameMatches, cpfMatches, valueMatches);
                            } else if (receipt.getCreditedAccount() == null || employee == null || employee.getContaCorrente() == null) {
                                // Se não tem conta corrente para verificar, fazer match mesmo assim
                                matchedByName.add(receipt);
                                log.info("✅ Comprovante adicionado ao match - Nome: {}, CPF: {}, Valor: {}, Conta: N/A", 
                                    nameMatches, cpfMatches, valueMatches);
                            } else {
                                // Conta corrente foi verificada e não corresponde - avisar mas ainda fazer match
                                matchedByName.add(receipt);
                                log.warn("⚠️ Comprovante adicionado com AVISO - Nome: {}, CPF: {}, Valor: {}, Conta: ❌ (não corresponde)", 
                                    nameMatches, cpfMatches, valueMatches);
                            }
                        } else {
                            log.debug("   Match não encontrado - Nome: {}, CPF: {}, Valor: {}", 
                                nameMatches, cpfMatches, valueMatches);
                        }
                    }
                    
                    log.info("📋 Comprovantes após filtro de nome: {} (de {} no período)", 
                        matchedByName.size(), receiptsInPeriod.size());
                    
                    // ESTRATÉGIA 3: Se não encontrou no período, buscar TODOS os comprovantes do funcionário (sem restrição de período)
                    if (matchedByName.isEmpty()) {
                        log.warn("⚠️ Nenhum comprovante encontrado no período. Buscando em TODOS os comprovantes do funcionário...");
                        
                        // Buscar por nome completo
                        List<PaymentReceipt> receiptsByName = receiptRepository
                            .findByEmployeeNameContainingIgnoreCase(employeeName);
                        log.info("📋 Encontrados {} comprovante(s) por nome completo '{}'", receiptsByName.size(), employeeName);
                        
                        // Buscar por partes do nome (primeiro e último nome)
                        if (employeeName != null && !employeeName.trim().isEmpty()) {
                            String[] nameParts = employeeName.trim().toUpperCase().split("\\s+");
                            if (nameParts.length >= 2) {
                                String firstName = nameParts[0];
                                String lastName = nameParts[nameParts.length - 1];
                                log.info("🔍 Buscando por primeiro nome '{}' e último nome '{}'", firstName, lastName);
                                
                                List<PaymentReceipt> receiptsByFirst = receiptRepository
                                    .findByEmployeeNameContainingIgnoreCase(firstName);
                                for (PaymentReceipt receipt : receiptsByFirst) {
                                    if (receipt.getEmployeeName() != null && 
                                        receipt.getEmployeeName().toUpperCase().contains(lastName)) {
                                        if (!receiptsByName.contains(receipt)) {
                                            receiptsByName.add(receipt);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Filtrar por matching de nome usando verificação no PDF do holerite
                        matchedByName = new ArrayList<>();
                        for (PaymentReceipt receipt : receiptsByName) {
                            if (receipt.getEmployeeName() == null && receipt.getCreditedName() == null) {
                                continue;
                            }
                            
                            // Usar o nome da conta creditada (que pode estar abreviado) ou o nome do funcionário
                            String receiptName = receipt.getCreditedName() != null ? receipt.getCreditedName() : receipt.getEmployeeName();
                            
                            // Verificar no PDF do holerite se o nome do comprovante aparece na mesma linha do código e CPF
                            Payslip matchedPayslip = findPayslipByReceiptNameInPDF(receiptName, List.of(payslip));
                            
                            if (matchedPayslip != null) {
                                matchedByName.add(receipt);
                                log.info("✅ Comprovante '{}' corresponde ao holerite '{}' (verificado no PDF, sem restrição de período)", 
                                    receiptName, payslip.getEmployeeName());
                            } else {
                                // Fallback: verificar usando estratégias tradicionais de matching
                                boolean exactMatch = verifyEmployeeNames(employeeName, receipt.getEmployeeName());
                                boolean flexibleMatch = isFlexibleNameMatch(employeeName, receipt.getEmployeeName());
                                String receiptNormalizedNameForMatch = normalizeNameForSearch(receipt.getEmployeeName());
                                boolean normalizedMatch = receiptNormalizedNameForMatch.contains(normalizedEmployeeName) || 
                                    normalizedEmployeeName.contains(receiptNormalizedNameForMatch);
                                
                                if (exactMatch || flexibleMatch || normalizedMatch) {
                                    matchedByName.add(receipt);
                                }
                            }
                        }
                        
                        log.info("📋 Comprovantes encontrados por nome (sem restrição de período): {}", matchedByName.size());
                        
                        if (!matchedByName.isEmpty()) {
                            log.warn("⚠️ Encontrados {} comprovante(s) do funcionário, mas em período diferente do esperado:", matchedByName.size());
                            matchedByName.forEach(r -> log.warn("     - {}: {}/{} (esperado: {}/{} ou {}/{})", 
                                r.getEmployeeName(), r.getMonth(), r.getYear(), 
                                receiptMonthNext, receiptYearNext, month, year));
                        }
                    }
                    
                    List<PaymentReceipt> uniqueReceipts = deduplicateReceiptsByDateCompanyAndEmployee(matchedByName);
                    if (matchedByName.size() != uniqueReceipts.size()) {
                        log.info("♻️ Removidos {} comprovante(s) duplicado(s) para {} {}/{} com base em data/nome/empresa",
                            matchedByName.size() - uniqueReceipts.size(), employeeName, month, year);
                    }
                    
                    detail.setReceiptFound(uniqueReceipts.isEmpty() ? "❌ Não" : "✅ Sim (" + uniqueReceipts.size() + ")");
                    
                    if (uniqueReceipts.isEmpty()) {
                        // Construir mensagem de erro detalhada
                        StringBuilder errorMsg = new StringBuilder();
                        errorMsg.append("Comprovante não encontrado. ");
                        
                        if (receiptsInPeriod.isEmpty()) {
                            errorMsg.append(String.format("Nenhum comprovante no banco para o período %d/%d (mês seguinte) ou %d/%d (mesmo mês). ", 
                                receiptMonthNext, receiptYearNext, month, year));
                        } else {
                            errorMsg.append(String.format("Encontrados %d comprovante(s) no banco para o período %d/%d ou %d/%d, mas nenhum corresponde ao nome '%s'. ", 
                                receiptsInPeriod.size(), receiptMonthNext, receiptYearNext, month, year, employeeName));
                            
                            // Listar os comprovantes encontrados no período
                            List<PaymentReceipt> receiptsToShow = receiptsInPeriod.size() <= 5 ? receiptsInPeriod : receiptsInPeriod.subList(0, 5);
                            errorMsg.append(receiptsInPeriod.size() <= 5 ? "Comprovantes encontrados: " : "Primeiros 5 comprovantes: ");
                            for (int i = 0; i < receiptsToShow.size(); i++) {
                                PaymentReceipt r = receiptsToShow.get(i);
                                if (i > 0) errorMsg.append(", ");
                                errorMsg.append(String.format("%s (%d/%d)", 
                                    r.getEmployeeName() != null ? r.getEmployeeName() : "N/A", 
                                    r.getMonth(), r.getYear()));
                            }
                            if (receiptsInPeriod.size() > 5) {
                                errorMsg.append(String.format(" e mais %d...", receiptsInPeriod.size() - 5));
                            }
                        }
                        
                        // Log detalhado para debug
                        log.warn("❌ Nenhum comprovante encontrado para {} - {}/{}", employeeName, month, year);
                        log.warn("   Tentou buscar no período {}/{} (mês seguinte) e {}/{} (mesmo mês)", 
                            receiptMonthNext, receiptYearNext, month, year);
                        log.warn("   Total de comprovantes no período: {}", receiptsInPeriod.size());
                        if (!receiptsInPeriod.isEmpty()) {
                            log.warn("   Comprovantes encontrados no período (mas nomes não correspondem):");
                            receiptsInPeriod.forEach(r -> log.warn("     - {}: {}/{}", 
                                r.getEmployeeName(), r.getMonth(), r.getYear()));
                        }
                        
                        detail.setStatus("FALHA");
                        detail.setMessage(errorMsg.toString());
                        result.getFailureList().add(detail);
                        result.setTotalFailed(result.getTotalFailed() + 1);
                        continue;
                    }
                    
                    // 4.3. Verificar se os nomes coincidem (VALIDAÇÃO CRÍTICA) - usando verificação flexível
                    boolean allNamesMatch = uniqueReceipts.stream()
                        .allMatch(receipt -> verifyEmployeeNames(employeeName, receipt.getEmployeeName()));
                    
                    detail.setNamesMatch(allNamesMatch);
                    
                    if (!allNamesMatch && (request.getForceUnification() == null || !request.getForceUnification())) {
                        detail.setStatus("FALHA");
                        detail.setMessage("Nomes não coincidem - Holerite: '" + employeeName + "' vs Comprovante(s): " + 
                            uniqueReceipts.stream()
                                .map(PaymentReceipt::getEmployeeName)
                                .distinct()
                                .collect(Collectors.joining(", ", "'", "'")));
                        result.getFailureList().add(detail);
                        result.setTotalFailed(result.getTotalFailed() + 1);
                        log.warn("❌ NOMES NÃO COINCIDEM para {} - {}/{}", employeeName, month, year);
                        continue;
                    }
                    
                    // 4.4. Buscar arquivos PDF dos comprovantes
                    // ESTRATÉGIA MELHORADA: Tentar múltiplos períodos e pastas
                    List<String> receiptPaths = new ArrayList<>();
                    java.util.List<String> searchedPaths = new java.util.ArrayList<>();
                    
                    for (PaymentReceipt receipt : uniqueReceipts) {
                        java.util.List<String> receiptSearchedPaths = new java.util.ArrayList<>();
                        String receiptPath = null;
                        
                        // Tentativa 1: Usar o mês/ano do comprovante encontrado no banco
                        receiptPath = findReceiptOriginalFileByNameAndPeriod(
                            receipt.getEmployeeName(), 
                            receipt.getMonth(),
                            receipt.getYear(),
                            receiptSearchedPaths
                        );
                        
                        // Tentativa 2: Se não encontrou, tentar mês seguinte (caso o arquivo esteja em outra pasta)
                        if ((receiptPath == null || !Files.exists(Paths.get(receiptPath))) && receipt.getMonth() != null) {
                            int nextMonth = receipt.getMonth() == 12 ? 1 : receipt.getMonth() + 1;
                            int nextYear = receipt.getMonth() == 12 ? receipt.getYear() + 1 : receipt.getYear();
                            log.info("🔍 Tentativa 2: Buscando comprovante no mês seguinte {}/{}", nextMonth, nextYear);
                            receiptPath = findReceiptOriginalFileByNameAndPeriod(
                                receipt.getEmployeeName(),
                                nextMonth,
                                nextYear,
                                receiptSearchedPaths
                            );
                        }
                        
                        // Tentativa 3: Se ainda não encontrou, tentar mês anterior
                        if ((receiptPath == null || !Files.exists(Paths.get(receiptPath))) && receipt.getMonth() != null) {
                            int prevMonth = receipt.getMonth() == 1 ? 12 : receipt.getMonth() - 1;
                            int prevYear = receipt.getMonth() == 1 ? receipt.getYear() - 1 : receipt.getYear();
                            log.info("🔍 Tentativa 3: Buscando comprovante no mês anterior {}/{}", prevMonth, prevYear);
                            receiptPath = findReceiptOriginalFileByNameAndPeriod(
                                receipt.getEmployeeName(),
                                prevMonth,
                                prevYear,
                                receiptSearchedPaths
                            );
                        }
                        
                        // Tentativa 4: Buscar apenas pelo nome, sem período (última tentativa)
                        if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
                            log.info("🔍 Tentativa 4: Buscando comprovante apenas pelo nome (sem período)");
                            receiptPath = findReceiptOriginalFileByNameOnly(receipt.getEmployeeName(), receiptSearchedPaths);
                        }
                        
                        if (receiptPath != null && Files.exists(Paths.get(receiptPath))) {
                            receiptPaths.add(receiptPath);
                            log.info("✅ Comprovante PDF encontrado: {}", receiptPath);
                        } else {
                            log.warn("⚠️ Comprovante PDF não encontrado após todas as tentativas: {}", receipt.getFileName());
                            searchedPaths.addAll(receiptSearchedPaths);
                        }
                    }
                    
                    if (receiptPaths.isEmpty()) {
                        detail.setStatus("FALHA");
                        
                        // Construir mensagem detalhada explicando o problema
                        int receiptMonth = month == 12 ? 1 : month + 1;
                        int receiptYear = month == 12 ? year + 1 : year;
                        
                        StringBuilder errorMsg = new StringBuilder();
                        errorMsg.append("Nenhum comprovante encontrado para o período ").append(receiptMonth).append("/").append(receiptYear);
                        errorMsg.append(" (mês seguinte ao holerite ").append(month).append("/").append(year).append(").\n\n");
                        errorMsg.append("O sistema procurou os arquivos PDF nas seguintes pastas:\n");
                        if (searchedPaths.isEmpty()) {
                            // Listar as pastas padrão que seriam verificadas
                            errorMsg.append("• uploads/receipts/").append(String.format("%02d_%04d", receiptMonth, receiptYear)).append("\n");
                            errorMsg.append("• uploads/receipts/").append(receiptMonth).append("_").append(receiptYear).append("\n");
                            errorMsg.append("• uploads/payment-receipts/").append(receiptYear).append("/").append(String.format("%02d", receiptMonth)).append("\n");
                            errorMsg.append("• uploads/receipts/\n");
                        } else {
                            for (String path : searchedPaths) {
                                errorMsg.append("• ").append(path).append("\n");
                            }
                        }
                        errorMsg.append("\n");
                        errorMsg.append("POSSÍVEIS CAUSAS:\n");
                        errorMsg.append("1. O comprovante ainda não foi importado no sistema\n");
                        errorMsg.append("2. O arquivo PDF foi salvo em uma pasta diferente da esperada\n");
                        errorMsg.append("3. O nome do arquivo não contém o nome do funcionário ou período correto\n");
                        errorMsg.append("4. O comprovante está no banco de dados mas o arquivo físico foi movido ou deletado\n\n");
                        errorMsg.append("AÇÃO NECESSÁRIA:\n");
                        errorMsg.append("Por favor, importe o comprovante de pagamento para o funcionário '").append(employeeName);
                        errorMsg.append("' referente ao período ").append(receiptMonth).append("/").append(receiptYear);
                        errorMsg.append(" (mês seguinte ao holerite).");
                        
                        detail.setMessage(errorMsg.toString());
                        result.getFailureList().add(detail);
                        result.setTotalFailed(result.getTotalFailed() + 1);
                        log.warn("❌ PDFs dos comprovantes não encontrados para {} - {}/{}", employeeName, month, year);
                        continue;
                    }
                    
                    // 4.5. Extrair nome do funcionário do holerite e do comprovante e verificar correspondência
                    String employeeNameFromPayslip = matchingPayslip != null ? matchingPayslip.getEmployeeName() : null;
                    String employeeNameFromReceipt = null;
                    
                    // Usar o primeiro receipt da lista para extrair o nome
                    PaymentReceipt firstReceipt = uniqueReceipts.isEmpty() ? null : uniqueReceipts.get(0);
                    if (firstReceipt != null) {
                        employeeNameFromReceipt = firstReceipt.getCreditedName() != null ? 
                            firstReceipt.getCreditedName() : firstReceipt.getEmployeeName();
                    }
                    
                    // Se não temos os nomes dos objetos, tentar extrair dos PDFs
                    if (employeeNameFromPayslip == null) {
                        employeeNameFromPayslip = extractEmployeeNameFromPayslipPDF(holeritePath);
                    }
                    if (employeeNameFromReceipt == null && !receiptPaths.isEmpty()) {
                        employeeNameFromReceipt = extractEmployeeNameFromReceiptPDF(receiptPaths.get(0));
                    }
                    
                    // Verificar correspondência e usar nome do holerite (completo)
                    String finalEmployeeName = employeeName;
                    if (employeeNameFromPayslip != null && employeeNameFromReceipt != null) {
                        boolean namesMatch = verifyEmployeeNames(employeeNameFromPayslip, employeeNameFromReceipt);
                        if (namesMatch) {
                            finalEmployeeName = employeeNameFromPayslip;
                            log.info("✅ Nomes correspondem! Usando nome do holerite: '{}'", finalEmployeeName);
                        } else {
                            log.warn("⚠️ Nomes não correspondem. Usando nome original: '{}'", finalEmployeeName);
                        }
                    } else if (employeeNameFromPayslip != null) {
                        finalEmployeeName = employeeNameFromPayslip;
                        log.info("✅ Usando nome do holerite: '{}'", finalEmployeeName);
                    }
                    
                    // Criar documento unificado usando PDFMergerUtility
                    String unifiedPath = createUnifiedPdfUsingMerger(
                        holeritePath, 
                        receiptPaths, 
                        finalEmployeeName, 
                        month, 
                        year,
                        matchingPayslip,
                        firstReceipt  // Usar o primeiro receipt da lista
                    );
                    
                    detail.setStatus("SUCESSO");
                    detail.setMessage(allNamesMatch ? 
                        "Documento unificado criado com sucesso" : 
                        "Documento criado com AVISO: nomes não coincidem exatamente");
                    detail.setFilePath(unifiedPath);
                    result.getSuccessList().add(detail);
                    result.setTotalSuccess(result.getTotalSuccess() + 1);
                    
                    log.info("✅ Documento unificado criado: {}", unifiedPath);
                    
                } catch (Exception e) {
                    detail.setStatus("ERRO");
                    detail.setMessage("Erro ao processar: " + e.getMessage());
                    result.getFailureList().add(detail);
                    result.setTotalFailed(result.getTotalFailed() + 1);
                    log.error("💥 Erro ao processar {} - {}/{}: {}", employeeName, month, year, e.getMessage(), e);
                }
            }
            
            long endTime = System.currentTimeMillis();
            result.setProcessingTimeMs(endTime - startTime);
            
            log.info("=== ✅ UNIFICAÇÃO EM LOTE CONCLUÍDA ===");
            log.info("Total processado: {}", result.getTotalProcessed());
            log.info("Total sucesso: {}", result.getTotalSuccess());
            log.info("Total falhas: {}", result.getTotalFailed());
            log.info("Tempo de processamento: {} ms", result.getProcessingTimeMs());
            
        } catch (Exception e) {
            log.error("💥 Erro crítico na unificação em lote: {}", e.getMessage(), e);
            result.setTotalFailed(result.getTotalProcessed());
        }
        
        return result;
    }
    
    /**
     * Remove comprovantes duplicados considerando data, funcionário e empresa
     */
    private List<PaymentReceipt> deduplicateReceiptsByDateCompanyAndEmployee(List<PaymentReceipt> receipts) {
        if (receipts == null || receipts.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, PaymentReceipt> uniqueReceipts = new LinkedHashMap<>();

        for (PaymentReceipt receipt : receipts) {
            if (receipt == null) {
                continue;
            }

            String normalizedCompany = normalizeKeyText(receipt.getDebitedName());
            String employeeNameForKey = emptyToNull(receipt.getCreditedName());
            if (employeeNameForKey == null) {
                employeeNameForKey = emptyToNull(receipt.getEmployeeName());
            }
            String normalizedEmployee = normalizeKeyText(employeeNameForKey);
            String normalizedDate = normalizeTransferDateKey(receipt);

            boolean canDeduplicate = !normalizedCompany.isEmpty() && !normalizedEmployee.isEmpty() && !normalizedDate.isEmpty();
            String dedupKey;

            if (canDeduplicate) {
                dedupKey = normalizedDate + "|" + normalizedCompany + "|" + normalizedEmployee;
            } else {
                dedupKey = "FALLBACK-" + uniqueReceipts.size() + "-" +
                    Objects.toString(receipt.getId(), receipt.getFileName());
            }

            if (uniqueReceipts.containsKey(dedupKey)) {
                log.info("🔁 Ignorando comprovante duplicado (chave {}): {}", dedupKey, receipt.getFileName());
                continue;
            }

            uniqueReceipts.put(dedupKey, receipt);
        }

        return new ArrayList<>(uniqueReceipts.values());
    }

    private String normalizeKeyText(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
            .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
            .replaceAll("\\s+", " ")
            .toUpperCase();
        return normalized.trim();
    }

    private String normalizeTransferDateKey(PaymentReceipt receipt) {
        if (receipt.getTransferDate() != null && !receipt.getTransferDate().isBlank()) {
            return receipt.getTransferDate().replaceAll("[^0-9]", "");
        }
        if (receipt.getPaymentDate() != null) {
            return receipt.getPaymentDate().toLocalDate().format(DateTimeFormatter.BASIC_ISO_DATE);
        }
        return "";
    }

    private String emptyToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Cria PDF unificado usando PDFMergerUtility para preservar layout original
     * O nome do arquivo será baseado no nome do funcionário extraído do holerite (completo)
     */
    private String createUnifiedPdfUsingMerger(String holeritePath, List<String> receiptPaths, 
                                               String employeeName, int month, int year,
                                               Payslip payslip, PaymentReceipt receipt) throws IOException {
        // Criar diretório se não existir
        Path unifiedDir = Paths.get(UNIFIED_DIR, "expanded").toAbsolutePath();
        if (!Files.exists(unifiedDir)) {
            Files.createDirectories(unifiedDir);
        }
        
        // Extrair CPF do nome do arquivo do holerite
        String cpf = "";
        String holeriteFileName = Paths.get(holeritePath).getFileName().toString();
        java.util.regex.Pattern cpfPattern = java.util.regex.Pattern.compile("(\\d{11})");
        java.util.regex.Matcher cpfMatcher = cpfPattern.matcher(holeriteFileName);
        if (cpfMatcher.find()) {
            cpf = cpfMatcher.group(1);
            log.info("✅ CPF extraído do holerite: {}", cpf);
        } else {
            log.warn("⚠️ CPF não encontrado no nome do holerite: {}", holeriteFileName);
        }
        
        // Nome do arquivo unificado (SEM prefixo "UNIFICADO" - removido conforme solicitado)
        String cleanName = employeeName.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "").replaceAll("\\s+", "_");
        String fileName;
        if (!cpf.isEmpty()) {
            fileName = String.format("%s_%s_%d_%d.pdf", cleanName.toUpperCase(), cpf, month, year);
            log.info("📄 Nome do arquivo unificado COM CPF: {}", fileName);
        } else {
            fileName = String.format("%s_%d_%d.pdf", cleanName.toUpperCase(), month, year);
            log.info("📄 Nome do arquivo unificado SEM CPF: {}", fileName);
        }
        String outputPath = unifiedDir.resolve(fileName).toString();
        
        log.info("🔄 Criando PDF unificado: {}", outputPath);
        log.info("📄 Holerite: {}", holeritePath);
        log.info("📄 Comprovantes: {}", receiptPaths.size());
        
        try {
            // Usar PDFMergerUtility para manter layout original
            org.apache.pdfbox.multipdf.PDFMergerUtility merger = new org.apache.pdfbox.multipdf.PDFMergerUtility();
            merger.setDestinationFileName(outputPath);
            
            // Adicionar holerite primeiro
            merger.addSource(new File(holeritePath));
            log.info("✅ Holerite adicionado ao merge");
            
            // Adicionar todos os comprovantes
            for (String receiptPath : receiptPaths) {
                merger.addSource(new File(receiptPath));
                log.info("✅ Comprovante adicionado: {}", Paths.get(receiptPath).getFileName());
            }
            
            // Executar merge
            merger.mergeDocuments(null);
            log.info("✅ Merge concluído: {}", outputPath);
            
            // Verificar se foi criado
            File outputFile = new File(outputPath);
            if (outputFile.exists()) {
                log.info("✅ Arquivo verificado: {} bytes", outputFile.length());
                
                // Salvar no banco de dados
                try {
                    // Usar os payslip e receipt passados como parâmetros, ou buscar se não foram fornecidos
                    Payslip payslipToSave = payslip;
                    PaymentReceipt receiptToSave = receipt;
                    Employee employee = null;
                    
                    // Se payslip ou receipt não foram fornecidos, buscar no banco
                    if (payslipToSave == null) {
                        List<Payslip> payslips = payslipService.getAllPayslips();
                        for (Payslip p : payslips) {
                            if (p.getMonth() != null && p.getMonth().equals(month) &&
                                p.getYear() != null && p.getYear().equals(year) &&
                                p.getEmployeeName() != null) {
                                if (verifyEmployeeNames(employeeName, p.getEmployeeName())) {
                                    payslipToSave = p;
                                    log.info("✅ Payslip encontrado para documento unificado: {} - {}/{}", 
                                        employeeName, month, year);
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (receiptToSave == null) {
                        int receiptMonth = month == 12 ? 1 : month + 1;
                        int receiptYear = month == 12 ? year + 1 : year;
                        List<PaymentReceipt> receipts = receiptRepository.findAll();
                        for (PaymentReceipt r : receipts) {
                            if (r.getEmployeeName() != null && 
                                verifyEmployeeNames(employeeName, r.getEmployeeName()) &&
                                r.getMonth() != null && r.getMonth().equals(receiptMonth) &&
                                r.getYear() != null && r.getYear().equals(receiptYear)) {
                                receiptToSave = r;
                                break;
                            }
                        }
                    }
                    
                    // Buscar employee por CPF se disponível
                    if (payslipToSave != null && payslipToSave.getCpf() != null) {
                        employee = employeeRepository.findByCpf(payslipToSave.getCpf()).orElse(null);
                    }
                    
                    // Criar e salvar UnifiedDocument
                    UnifiedDocument unifiedDoc = UnifiedDocument.builder()
                        .employee(employee)
                        .payslip(payslipToSave)
                        .receipt(receiptToSave)
                        .employeeName(employeeName)
                        .month(month)
                        .year(year)
                        .fileName(fileName)
                        .filePath(outputPath)
                        .fileSize(outputFile.length())
                        .status(UnifiedDocument.UnifiedDocumentStatus.PROCESSED)
                        .build();
                    
                    unifiedDocumentRepository.save(unifiedDoc);
                    log.info("✅ Documento unificado salvo no banco de dados: ID={}", unifiedDoc.getId());
                    
                } catch (Exception dbError) {
                    log.warn("⚠️ Erro ao salvar documento unificado no banco de dados: {}", dbError.getMessage());
                    // Não falhar a criação do arquivo se houver erro ao salvar no banco
                }
                
                return outputPath;
            } else {
                throw new IOException("Arquivo unificado não foi criado");
            }
            
        } catch (Exception e) {
            log.error("💥 Erro ao criar PDF unificado: {}", e.getMessage(), e);
            throw new IOException("Erro ao unificar PDFs: " + e.getMessage(), e);
        }
    }

    /**
     * Método de teste para verificar se os serviços estão funcionando
     */
    public Map<String, Object> testServices() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Testar busca de holerites
            List<Payslip> payslips = payslipService.getAllPayslips();
            result.put("payslipsCount", payslips.size());
            result.put("payslips", payslips.stream()
                .map(p -> Map.of(
                    "id", p.getId(),
                    "employeeName", p.getEmployeeName(),
                    "month", p.getMonth(),
                    "year", p.getYear()
                ))
                .collect(Collectors.toList()));
            
            // Testar busca de recibos
            List<PaymentReceipt> receipts = receiptRepository.findAll();
            result.put("receiptsCount", receipts.size());
            result.put("receipts", receipts.stream()
                .map(r -> Map.of(
                    "id", r.getId(),
                    "employeeName", r.getEmployeeName(),
                    "month", r.getMonth(),
                    "year", r.getYear()
                ))
                .collect(Collectors.toList()));
            
            result.put("success", true);
            result.put("message", "Serviços testados com sucesso");
            
        } catch (Exception e) {
            log.error("💥 Erro ao testar serviços: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return result;
    }

    /**
     * Organiza documentos unificados por Empresa/Setor/Ano/Mês
     * VERSÃO OTIMIZADA: Usa queries eficientes e evita carregar dados desnecessários
     */
    @Transactional(readOnly = true)
    public PayslipOrganizationResponse organizeUnifiedDocumentsByCompany() {
        long startTime = System.currentTimeMillis();
        PayslipOrganizationResponse response = new PayslipOrganizationResponse();
        response.setGeneratedAt(LocalDateTime.now());
        
        // Timeout de segurança: máximo 25 segundos
        long maxExecutionTime = 25000;

        try {
            log.info("⚡ [OTIMIZADO] Iniciando organização de documentos unificados...");
            
            // Verificar timeout periodicamente
            if (System.currentTimeMillis() - startTime > maxExecutionTime) {
                log.warn("⏱️ Timeout detectado antes de iniciar processamento");
                response.setTotalPayslips(0);
                response.setCompanies(Collections.emptyList());
                response.setTotalCompanies(0);
                response.setTotalSectors(0);
                return response;
            }
            
            // OTIMIZAÇÃO 1: Buscar unified documents do banco (limitado para evitar travamento)
            List<UnifiedDocument> unifiedDocumentsFromDb;
            try {
                unifiedDocumentsFromDb = unifiedDocumentRepository.findAllWithPayslipOptimized();
                
                // Limitar a 2000 registros para evitar travamento e respostas muito grandes
                if (unifiedDocumentsFromDb.size() > 2000) {
                    log.warn("⚠️ Muitos documentos unificados ({}) encontrados. Limitando a 2000 para performance e evitar travamento do navegador.", unifiedDocumentsFromDb.size());
                    unifiedDocumentsFromDb = unifiedDocumentsFromDb.subList(0, 2000);
                }
                
                log.info("📋 [OTIMIZADO] Encontrados {} documentos unificados no banco (limitado a 2000)", unifiedDocumentsFromDb.size());
            } catch (Exception dbError) {
                log.error("❌ Erro ao buscar documentos unificados: {}", dbError.getMessage(), dbError);
                // Retornar resposta vazia ao invés de tentar método padrão que pode travar
                response.setTotalPayslips(0);
                response.setCompanies(Collections.emptyList());
                response.setTotalCompanies(0);
                response.setTotalSectors(0);
                return response;
            }
            
            if (unifiedDocumentsFromDb.isEmpty()) {
                log.info("📋 Nenhum documento unificado encontrado no banco, tentando listar arquivos físicos...");
                // Fallback: tentar listar arquivos físicos
                try {
                    List<Map<String, Object>> unifiedDocs = listAllUnifiedDocuments();
                    if (unifiedDocs.isEmpty()) {
                        response.setTotalPayslips(0);
                        response.setCompanies(Collections.emptyList());
                        response.setTotalCompanies(0);
                        response.setTotalSectors(0);
                        return response;
                    }
                    // Continuar com processamento de arquivos físicos (código antigo)
                } catch (IOException e) {
                    log.error("❌ Erro ao listar documentos unificados: {}", e.getMessage(), e);
                    response.setTotalPayslips(0);
                    response.setCompanies(Collections.emptyList());
                    response.setTotalCompanies(0);
                    response.setTotalSectors(0);
                    return response;
                }
            }

            // OTIMIZAÇÃO 2: Criar mapa de payslips apenas dos que estão relacionados aos unified documents
            // Isso evita carregar TODOS os payslips do banco
            Map<UUID, Payslip> payslipByIdMap = new HashMap<>();
            Set<String> payslipKeys = new HashSet<>();
            
            for (UnifiedDocument ud : unifiedDocumentsFromDb) {
                try {
                    Payslip payslip = ud.getPayslip();
                    if (payslip != null && payslip.getId() != null) {
                        payslipByIdMap.put(payslip.getId(), payslip);
                        String key = String.format("%s|%d|%d", 
                            normalizeName(payslip.getEmployeeName()), 
                            payslip.getMonth(), 
                            payslip.getYear());
                        payslipKeys.add(key);
                    }
                } catch (Exception e) {
                    log.debug("⚠️ Erro ao acessar payslip do unified document: {}", e.getMessage());
                }
            }
            
            log.info("📊 [OTIMIZADO] Mapeados {} payslips únicos relacionados aos documentos unificados", payslipByIdMap.size());

            // OTIMIZAÇÃO 3: Buscar apenas payslips que não estão no mapa mas podem corresponder aos unified documents
            // OTIMIZAÇÃO: Agrupar por mês/ano para evitar queries repetidas e limitar processamento
            List<Payslip> additionalPayslips = new ArrayList<>();
            Set<String> processedPeriods = new HashSet<>();
            int maxPeriodsToProcess = 30; // Limitar a 30 períodos diferentes para evitar travamento e respostas grandes
            int periodsProcessed = 0;
            
            for (UnifiedDocument ud : unifiedDocumentsFromDb) {
                // Verificar timeout
                if (System.currentTimeMillis() - startTime > maxExecutionTime) {
                    log.warn("⏱️ Timeout durante busca de payslips adicionais. Processando dados já carregados...");
                    break;
                }
                
                if (ud.getPayslip() == null && ud.getEmployeeName() != null && ud.getMonth() != null && ud.getYear() != null) {
                    String periodKey = String.format("%d|%d", ud.getMonth(), ud.getYear());
                    
                    // Evitar buscar o mesmo período múltiplas vezes e limitar quantidade
                    if (!processedPeriods.contains(periodKey) && periodsProcessed < maxPeriodsToProcess) {
                        processedPeriods.add(periodKey);
                        periodsProcessed++;
                        try {
                            List<Payslip> matchingPayslips = payslipRepository.findByMonthAndYear(ud.getMonth(), ud.getYear());
                            
                            // Limitar quantidade de payslips processados por período
                            if (matchingPayslips.size() > 500) {
                                log.warn("⚠️ Muitos payslips ({}) para período {}/{}. Limitando processamento a 500 para evitar travamento.", 
                                    matchingPayslips.size(), ud.getMonth(), ud.getYear());
                                matchingPayslips = matchingPayslips.subList(0, 500);
                            }
                            
                            // Processar unified documents deste período
                            for (UnifiedDocument ud2 : unifiedDocumentsFromDb) {
                                if (ud2.getPayslip() == null && 
                                    ud2.getMonth() != null && ud2.getMonth().equals(ud.getMonth()) &&
                                    ud2.getYear() != null && ud2.getYear().equals(ud.getYear()) &&
                                    ud2.getEmployeeName() != null) {
                                    
                                    for (Payslip p : matchingPayslips) {
                                        if (verifyEmployeeNames(ud2.getEmployeeName(), p.getEmployeeName())) {
                                            String key = String.format("%s|%d|%d", 
                                                normalizeName(p.getEmployeeName()), 
                                                p.getMonth(), 
                                                p.getYear());
                                            if (!payslipKeys.contains(key)) {
                                                payslipByIdMap.put(p.getId(), p);
                                                payslipKeys.add(key);
                                                additionalPayslips.add(p);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("⚠️ Erro ao buscar payslip adicional para período {}/{}: {}", 
                                ud.getMonth(), ud.getYear(), e.getMessage());
                        }
                    }
                }
            }
            
            log.info("📊 [OTIMIZADO] Adicionados {} payslips adicionais encontrados", additionalPayslips.size());
            
            // OTIMIZAÇÃO 4: Converter unified documents diretamente em payslips usando os dados já carregados
            List<Payslip> payslipsForOrganization = new ArrayList<>();
            int processedCount = 0;
            int skippedCount = 0;
            int foundPayslipCount = 0;
            int tempPayslipCount = 0;
            
            for (UnifiedDocument ud : unifiedDocumentsFromDb) {
                if (ud.getEmployeeName() == null || ud.getMonth() == null || ud.getYear() == null) {
                    skippedCount++;
                    continue;
                }
                
                processedCount++;
                Payslip payslip = null;
                
                // Estratégia 1: Usar payslip já carregado via JOIN FETCH
                try {
                    payslip = ud.getPayslip();
                    if (payslip != null) {
                        // Verificar se o payslip realmente existe e FORÇAR carregamento de todos os campos necessários
                        try {
                            // Forçar carregamento de todos os campos dentro da transação
                            payslip.getCompanyName();
                            payslip.getFileName(); // Carregar fileName dentro da transação
                            payslip.getCpf();
                            payslip.getEmployeeName();
                            payslip.getMonth();
                            payslip.getYear();
                            payslip.getCompanyCnpj();
                            payslip.getCompanySigla();
                            payslip.getWorkPostName();
                            foundPayslipCount++;
                        } catch (jakarta.persistence.EntityNotFoundException e) {
                            log.debug("⚠️ Payslip referenciado não existe mais: {}", e.getMessage());
                            payslip = null;
                        } catch (org.hibernate.LazyInitializationException e) {
                            log.debug("⚠️ Erro de lazy initialization ao acessar payslip: {}", e.getMessage());
                            payslip = null;
                        }
                    }
                } catch (org.hibernate.LazyInitializationException e) {
                    log.debug("⚠️ Erro de lazy initialization ao acessar payslip: {}", e.getMessage());
                    payslip = null;
                } catch (Exception e) {
                    log.debug("⚠️ Erro ao acessar payslip: {}", e.getMessage());
                }
                
                // Estratégia 2: Se não encontrou, buscar no mapa de payslips adicionais
                if (payslip == null) {
                    String key = String.format("%s|%d|%d", 
                        normalizeName(ud.getEmployeeName()), 
                        ud.getMonth(), 
                        ud.getYear());
                    
                    // Buscar nos payslips adicionais encontrados
                    for (Payslip p : additionalPayslips) {
                        if (p.getMonth() != null && p.getMonth().equals(ud.getMonth()) &&
                            p.getYear() != null && p.getYear().equals(ud.getYear()) &&
                            verifyEmployeeNames(ud.getEmployeeName(), p.getEmployeeName())) {
                            // Garantir que todos os campos foram carregados
                            try {
                                p.getFileName();
                                p.getCompanyName();
                            } catch (org.hibernate.LazyInitializationException e) {
                                log.debug("⚠️ Erro de lazy initialization em payslip adicional: {}", e.getMessage());
                                continue;
                            }
                            payslip = p;
                            foundPayslipCount++;
                            break;
                        }
                    }
                }
                
                // Estratégia 3: Se ainda não encontrou, criar payslip temporário com dados do unified document
                if (payslip == null) {
                    tempPayslipCount++;
                    // Tentar obter dados do payslip relacionado se existir (mesmo que não carregado)
                    String cpf = "";
                    String companyName = "";
                    String companyCnpj = "";
                    String companySigla = "";
                    String workPostName = "";
                    
                    try {
                        Payslip relatedPayslip = ud.getPayslip();
                        if (relatedPayslip != null) {
                            try {
                                // Tentar carregar todos os campos dentro da transação
                                cpf = relatedPayslip.getCpf() != null ? relatedPayslip.getCpf() : "";
                                companyName = relatedPayslip.getCompanyName() != null ? relatedPayslip.getCompanyName() : "";
                                companyCnpj = relatedPayslip.getCompanyCnpj() != null ? relatedPayslip.getCompanyCnpj() : "";
                                companySigla = relatedPayslip.getCompanySigla() != null ? relatedPayslip.getCompanySigla() : "";
                                workPostName = relatedPayslip.getWorkPostName() != null ? relatedPayslip.getWorkPostName() : "";
                            } catch (org.hibernate.LazyInitializationException e) {
                                log.debug("⚠️ Erro de lazy initialization ao acessar dados do payslip relacionado: {}", e.getMessage());
                            } catch (Exception e) {
                                log.debug("⚠️ Erro ao acessar dados do payslip relacionado: {}", e.getMessage());
                            }
                        }
                    } catch (org.hibernate.LazyInitializationException e) {
                        log.debug("⚠️ Erro de lazy initialization ao acessar payslip relacionado: {}", e.getMessage());
                    } catch (Exception e) {
                        log.debug("⚠️ Erro ao acessar payslip relacionado: {}", e.getMessage());
                    }
                    
                    payslip = Payslip.builder()
                        .employeeName(ud.getEmployeeName())
                        .cpf(cpf)
                        .month(ud.getMonth())
                        .year(ud.getYear())
                        .fileName(ud.getFileName() != null ? ud.getFileName() : "")
                        .companyName(companyName)
                        .companyCnpj(companyCnpj)
                        .companySigla(companySigla)
                        .workPostName(workPostName)
                        .build();
                } else {
                    // Garantir que o nome do arquivo está definido (já foi carregado acima)
                    try {
                        if (payslip.getFileName() == null || payslip.getFileName().isEmpty()) {
                            payslip.setFileName(ud.getFileName() != null ? ud.getFileName() : "");
                        }
                    } catch (org.hibernate.LazyInitializationException e) {
                        log.debug("⚠️ Erro de lazy initialization ao acessar fileName: {}", e.getMessage());
                        // Usar fileName do unified document como fallback
                        if (ud.getFileName() != null) {
                            try {
                                payslip.setFileName(ud.getFileName());
                            } catch (Exception ex) {
                                log.debug("⚠️ Não foi possível definir fileName: {}", ex.getMessage());
                            }
                        }
                    }
                }
                
                payslipsForOrganization.add(payslip);
            }
            
            log.info("📊 [OTIMIZADO] Estatísticas: {} processados, {} ignorados, {} com payslip encontrado, {} temporários", 
                processedCount, skippedCount, foundPayslipCount, tempPayslipCount);
            
            log.info("📊 Estatísticas de processamento: {} processados, {} ignorados, {} com payslip encontrado, {} com payslip temporário", 
                processedCount, skippedCount, foundPayslipCount, tempPayslipCount);

            log.info("📊 [OTIMIZADO] Total de payslips preparados para organização: {}", payslipsForOrganization.size());
            
            // Verificar timeout antes de organizar
            long timeBeforeOrg = System.currentTimeMillis() - startTime;
            if (timeBeforeOrg > maxExecutionTime) {
                log.warn("⏱️ Timeout antes de organizar ({}ms). Retornando resposta parcial...", timeBeforeOrg);
                response.setTotalPayslips(payslipsForOrganization.size());
                response.setCompanies(Collections.emptyList());
                response.setTotalCompanies(0);
                response.setTotalSectors(0);
                return response;
            }
            
            // Usar o método de organização de payslips
            PayslipOrganizationResponse organizedResponse = payslipService.organizePayslipsByCompany(payslipsForOrganization);
            
            long elapsedTime = System.currentTimeMillis() - startTime;
            log.info("✅ [OTIMIZADO] Organização concluída em {}ms: {} empresas, {} setores, {} documentos", 
                elapsedTime,
                organizedResponse.getTotalCompanies(), 
                organizedResponse.getTotalSectors(),
                organizedResponse.getTotalPayslips());
            
            // Verificar se demorou muito
            if (elapsedTime > 20000) {
                log.warn("⚠️ Organização demorou {}ms (mais de 20 segundos). Considere otimizar mais.", elapsedTime);
            }
            
            return organizedResponse;
            
        } catch (Exception e) {
            log.error("❌ Erro ao organizar documentos unificados: {}", e.getMessage(), e);
            log.error("❌ Stack trace:", e);
            response.setTotalPayslips(0);
            response.setCompanies(Collections.emptyList());
            response.setTotalCompanies(0);
            response.setTotalSectors(0);
            return response;
        }
    }
    
    /**
     * Extrai informações de empresa e setor do PDF do documento unificado
     */
    private Payslip extractPayslipInfoFromUnifiedDocument(String filePath, String employeeName, Integer month, Integer year, String cpf) {
        log.info("📄 Extraindo informações do PDF unificado: {}", filePath);
        
        try {
            File pdfFile = new File(filePath);
            if (!pdfFile.exists()) {
                log.warn("⚠️ Arquivo não encontrado: {}", filePath);
                return null;
            }
            
            try (PDDocument document = PDDocument.load(pdfFile)) {
                // Extrair texto da primeira página (onde geralmente está o holerite)
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(1);
                stripper.setEndPage(1);
                String pageText = stripper.getText(document);
                
                if (pageText == null || pageText.trim().isEmpty()) {
                    log.warn("⚠️ Não foi possível extrair texto da primeira página do PDF unificado");
                    return null;
                }
                
                String[] linhas = pageText.split("\r?\n");
                String empresaNome = null;
                String empresaCnpj = null;
                String workPostName = null;
                
                // ============================================
                // EXTRAÇÃO DE EMPRESA: Código + Nome + CNPJ na mesma linha
                // Exemplo: "0055 PROMOVER VIGILANCIA PATRIMONIAL LTDA  43576260000112"
                // ============================================
                Pattern empresaPattern = Pattern.compile("^(\\d{4})\\s+(.+?)\\s+(\\d{14})$");
                for (String linha : linhas) {
                    linha = linha.trim();
                    Matcher empresaMatcher = empresaPattern.matcher(linha);
                    if (empresaMatcher.find()) {
                        String codigo = empresaMatcher.group(1);
                        empresaNome = empresaMatcher.group(2).trim();
                        empresaCnpj = empresaMatcher.group(3);
                        
                        log.info("✅ Empresa encontrada (código + nome + CNPJ na mesma linha):");
                        log.info("   Código: {}, Nome: {}, CNPJ: {}", codigo, empresaNome, empresaCnpj);
                        break;
                    }
                }
                
                // Fallback: buscar padrão mais flexível (código + nome + CNPJ, mas com espaços variáveis)
                if (empresaNome == null || empresaCnpj == null) {
                    Pattern empresaPatternFlex = Pattern.compile("^(\\d{3,5})\\s+(.+?)\\s+(\\d{14})$");
                    for (String linha : linhas) {
                        linha = linha.trim();
                        Matcher empresaMatcher = empresaPatternFlex.matcher(linha);
                        if (empresaMatcher.find()) {
                            String codigo = empresaMatcher.group(1);
                            String nome = empresaMatcher.group(2).trim();
                            String cnpj = empresaMatcher.group(3);
                            
                            // Validar que o nome parece ser um nome de empresa (contém palavras comuns)
                            if (nome.length() > 10 && (nome.toUpperCase().contains("LTDA") || 
                                nome.toUpperCase().contains("S.A") || nome.toUpperCase().contains("ME") ||
                                nome.toUpperCase().contains("EIRELI") || nome.length() > 20)) {
                                empresaNome = nome;
                                empresaCnpj = cnpj;
                                log.info("✅ Empresa encontrada (padrão flexível):");
                                log.info("   Código: {}, Nome: {}, CNPJ: {}", codigo, empresaNome, empresaCnpj);
                                break;
                            }
                        }
                    }
                }
                
                // ============================================
                // EXTRAÇÃO DE SETOR: Período + Nome do Setor na mesma linha
                // Exemplo: "01/10/2025 a 31/10/2025 TRUCK PARK BR"
                // ============================================
                Pattern periodoSetorPattern = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})\\s+(?:a|à)\\s+(\\d{2})/(\\d{2})/(\\d{4})\\s+(.+)$");
                for (String linha : linhas) {
                    linha = linha.trim();
                    Matcher periodoSetorMatcher = periodoSetorPattern.matcher(linha);
                    if (periodoSetorMatcher.find()) {
                        String setor = periodoSetorMatcher.group(6).trim();
                        // Limpar o setor removendo caracteres especiais e espaços extras
                        setor = setor.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", " ").replaceAll("\\s+", " ").trim();
                        if (setor.length() > 2) {
                            workPostName = setor;
                            log.info("✅ Setor encontrado (período + setor na mesma linha):");
                            log.info("   Período: {}/{}/{} a {}/{}/{}", 
                                periodoSetorMatcher.group(1), periodoSetorMatcher.group(2), periodoSetorMatcher.group(3),
                                periodoSetorMatcher.group(4), periodoSetorMatcher.group(5), periodoSetorMatcher.group(3));
                            log.info("   Setor: {}", workPostName);
                            break;
                        }
                    }
                }
                
                // Fallback: buscar período e setor em linhas próximas
                if (workPostName == null) {
                    Pattern periodoPattern = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})\\s+(?:a|à)\\s+(\\d{2})/(\\d{2})/(\\d{4})");
                    for (int idx = 0; idx < linhas.length; idx++) {
                        String linha = linhas[idx].trim();
                        Matcher periodoMatcher = periodoPattern.matcher(linha);
                        if (periodoMatcher.find()) {
                            // Verificar se há texto após o período na mesma linha
                            String trailingText = linha.substring(periodoMatcher.end()).trim();
                            if (trailingText.length() > 3) {
                                trailingText = trailingText.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", " ").replaceAll("\\s+", " ").trim();
                                if (trailingText.length() > 2) {
                                    workPostName = trailingText;
                                    log.info("✅ Setor encontrado (texto após período na mesma linha): {}", workPostName);
                                    break;
                                }
                            }
                            
                            // Verificar linha seguinte
                            if (idx + 1 < linhas.length) {
                                String nextLine = linhas[idx + 1].trim();
                                nextLine = nextLine.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", " ").replaceAll("\\s+", " ").trim();
                                if (nextLine.length() > 2 && nextLine.length() < 100) {
                                    workPostName = nextLine;
                                    log.info("✅ Setor encontrado (linha após período): {}", workPostName);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Criar Payslip com informações extraídas
                return Payslip.builder()
                    .employeeName(employeeName != null ? employeeName : "Desconhecido")
                    .cpf(cpf != null && !cpf.isEmpty() ? cpf : "")
                    .companyName(empresaNome)
                    .companyCnpj(empresaCnpj)
                    .workPostName(workPostName)
                    .month(month)
                    .year(year)
                    .fileName(new File(filePath).getName())
                    .build();
            }
        } catch (Exception e) {
            log.error("❌ Erro ao extrair informações do PDF unificado {}: {}", filePath, e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Extrai o nome do funcionário do PDF do holerite
     * Busca por linha que contenha código (6 dígitos), nome e CPF
     */
    private String extractEmployeeNameFromPayslipPDF(String payslipPath) {
        try {
            File payslipFile = new File(payslipPath);
            if (!payslipFile.exists()) {
                log.warn("⚠️ Arquivo do holerite não existe: {}", payslipPath);
                return null;
            }
            
            try (PDDocument document = PDDocument.load(payslipFile)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String payslipText = stripper.getText(document);
                
                if (payslipText == null || payslipText.trim().isEmpty()) {
                    return null;
                }
                
                String[] lines = payslipText.split("\r?\n");
                Pattern codePattern = Pattern.compile("\\b\\d{6}\\b");
                Pattern cpfPattern = Pattern.compile("(?:CPF|cpf)[:\\s]*([0-9]{11}|[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2})", Pattern.CASE_INSENSITIVE);
                
                for (String line : lines) {
                    if (line == null || line.trim().isEmpty()) {
                        continue;
                    }
                    
                    Matcher codeMatcher = codePattern.matcher(line);
                    Matcher cpfMatcher = cpfPattern.matcher(line);
                    
                    if (codeMatcher.find() && cpfMatcher.find()) {
                        String code = codeMatcher.group();
                        String cpf = cpfMatcher.group(1).replaceAll("[^0-9]", "");
                        
                        int codeStart = codeMatcher.start();
                        int cpfStart = cpfMatcher.start();
                        String nameSection = line.substring(codeStart + code.length(), cpfStart).trim();
                        
                        String extractedName = nameSection
                            .replaceAll("[^a-zA-ZÀ-ÿ\\s]", " ")
                            .replaceAll("\\s+", " ")
                            .replaceAll("(?i)\\b(codigo|código|funcionario|funcionário|empregado|colaborador)\\b", "")
                            .replaceAll("\\s+", " ")
                            .trim();
                        
                        if (extractedName != null && extractedName.length() >= 3) {
                            log.info("✅ Nome extraído do holerite: '{}' (código: {}, CPF: {})", extractedName, code, cpf);
                            return extractedName;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ Erro ao extrair nome do PDF do holerite {}: {}", payslipPath, e.getMessage());
        }
        return null;
    }
    
    /**
     * Extrai o nome do funcionário do PDF do comprovante
     * Busca pelo nome da conta creditada
     */
    private String extractEmployeeNameFromReceiptPDF(String receiptPath) {
        try {
            File receiptFile = new File(receiptPath);
            if (!receiptFile.exists()) {
                log.warn("⚠️ Arquivo do comprovante não existe: {}", receiptPath);
                return null;
            }
            
            try (PDDocument document = PDDocument.load(receiptFile)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String receiptText = stripper.getText(document);
                
                if (receiptText == null || receiptText.trim().isEmpty()) {
                    return null;
                }
                
                // Buscar por padrões de conta creditada
                Pattern creditedPattern = Pattern.compile("(?i)(?:conta\\s+creditada|favorecido|beneficiário|nome)[:\\s]+([A-ZÀ-ÿ][A-ZÀ-ÿ\\s\\.]+)", Pattern.MULTILINE);
                Matcher creditedMatcher = creditedPattern.matcher(receiptText);
                
                if (creditedMatcher.find()) {
                    String extractedName = creditedMatcher.group(1).trim();
                    log.info("✅ Nome extraído do comprovante: '{}'", extractedName);
                    return extractedName;
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ Erro ao extrair nome do PDF do comprovante {}: {}", receiptPath, e.getMessage());
        }
        return null;
    }
    
    /**
     * Busca o holerite correspondente ao comprovante verificando no PDF do holerite
     * se o nome da conta creditada (que pode estar abreviado) aparece na mesma linha
     * do código e do CPF.
     * 
     * @param receiptCreditedName Nome da conta creditada do comprovante (pode estar abreviado, ex: "Jose M. Ramos")
     * @param payslips Lista de holerites candidatos para verificar
     * @return O holerite correspondente ou null se não encontrado
     */
    private Payslip findPayslipByReceiptNameInPDF(String receiptCreditedName, List<Payslip> payslips) {
        if (receiptCreditedName == null || receiptCreditedName.trim().isEmpty() || payslips == null || payslips.isEmpty()) {
            return null;
        }
        
        log.info("🔍 Buscando holerite para comprovante com nome: '{}' (verificando no PDF)", receiptCreditedName);
        
        // Normalizar nome do comprovante para comparação
        String normalizedReceiptName = normalizeNameForSearch(receiptCreditedName.trim());
        log.info("📝 Nome normalizado do comprovante: '{}'", normalizedReceiptName);
        
        for (Payslip payslip : payslips) {
            if (payslip.getArquivoCaminho() == null || payslip.getArquivoCaminho().trim().isEmpty()) {
                log.debug("⚠️ Holerite sem arquivoCaminho, pulando: {}", payslip.getEmployeeName());
                continue;
            }
            
            try {
                File payslipFile = new File(payslip.getArquivoCaminho());
                if (!payslipFile.exists()) {
                    log.debug("⚠️ Arquivo do holerite não existe: {}", payslip.getArquivoCaminho());
                    continue;
                }
                
                log.info("📄 Verificando holerite: {} - {}/{} (arquivo: {})", 
                    payslip.getEmployeeName(), payslip.getMonth(), payslip.getYear(), payslipFile.getName());
                
                // Extrair texto do PDF do holerite
                try (PDDocument document = PDDocument.load(payslipFile)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    String payslipText = stripper.getText(document);
                    
                    if (payslipText == null || payslipText.trim().isEmpty()) {
                        log.debug("⚠️ Não foi possível extrair texto do PDF do holerite: {}", payslipFile.getName());
                        continue;
                    }
                    
                    // Dividir em linhas
                    String[] lines = payslipText.split("\r?\n");
                    
                    // Procurar por linhas que contenham código (6 dígitos), nome e CPF na mesma linha
                    // Padrão: código (ex: 000026), nome (ex: SERGIO PEREIRA LEMOS), CPF (ex: CPF: 28469549847)
                    Pattern codePattern = Pattern.compile("\\b\\d{6}\\b"); // Código de 6 dígitos
                    Pattern cpfPattern = Pattern.compile("(?:CPF|cpf)[:\\s]*([0-9]{11}|[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2})", Pattern.CASE_INSENSITIVE);
                    
                    for (String line : lines) {
                        if (line == null || line.trim().isEmpty()) {
                            continue;
                        }
                        
                        // Verificar se a linha contém código e CPF
                        Matcher codeMatcher = codePattern.matcher(line);
                        Matcher cpfMatcher = cpfPattern.matcher(line);
                        
                        if (codeMatcher.find() && cpfMatcher.find()) {
                            // Linha contém código e CPF - extrair o nome dessa linha
                            String code = codeMatcher.group();
                            String cpf = cpfMatcher.group(1).replaceAll("[^0-9]", "");
                            
                            // Encontrar posições do código e CPF na linha
                            int codeStart = codeMatcher.start();
                            int cpfStart = cpfMatcher.start();
                            
                            // Extrair nome da linha (entre o código e o CPF)
                            // O nome geralmente está entre o código e o CPF
                            String nameSection = line.substring(codeStart + code.length(), cpfStart).trim();
                            
                            // Limpar o nome: remover caracteres especiais, números isolados, etc.
                            // Manter apenas letras, espaços e acentos
                            String extractedName = nameSection
                                .replaceAll("[^a-zA-ZÀ-ÿ\\s]", " ") // Substituir caracteres especiais por espaço
                                .replaceAll("\\s+", " ") // Múltiplos espaços para um só
                                .trim();
                            
                            // Remover palavras comuns que podem estar na linha
                            extractedName = extractedName
                                .replaceAll("(?i)\\b(codigo|código|funcionario|funcionário|empregado|colaborador)\\b", "")
                                .replaceAll("\\s+", " ")
                                .trim();
                            
                            if (extractedName == null || extractedName.trim().isEmpty() || extractedName.length() < 3) {
                                log.debug("⚠️ Nome extraído muito curto ou vazio: '{}'", extractedName);
                                continue;
                            }
                            
                            log.info("🔍 Linha encontrada com código e CPF: '{}'", line.trim());
                            log.info("   Código: {}, Nome extraído do holerite: '{}', CPF: {}", code, extractedName, cpf);
                            log.info("   Nome do comprovante (conta creditada): '{}'", receiptCreditedName);
                            
                            // Verificar se o nome do comprovante (que pode estar abreviado) corresponde ao nome extraído da linha (completo)
                            // Exemplo: "Jose M. Ramos" (comprovante) vs "JOSE MARIO RAMOS" (holerite)
                            // O método verifyEmployeeNames já suporta abreviações através de checkNamesWithAbbreviations
                            log.info("🔍 Verificando se o nome do comprovante (pode estar abreviado) corresponde ao nome do holerite (completo)...");
                            boolean nameMatches = verifyEmployeeNames(extractedName, receiptCreditedName) ||
                                                verifyEmployeeNames(receiptCreditedName, extractedName);
                            
                            if (nameMatches) {
                                log.info("✅ Holerite encontrado! Nome do comprovante corresponde ao nome no holerite");
                                log.info("   Linha completa: '{}'", line.trim());
                                log.info("   Código: {}, Nome no holerite: '{}', CPF: {}", code, extractedName, cpf);
                                log.info("   Nome no comprovante: '{}'", receiptCreditedName);
                                
                                return payslip;
                            } else {
                                log.debug("   ❌ Nome do comprovante '{}' NÃO corresponde ao nome extraído '{}'", receiptCreditedName, extractedName);
                            }
                        }
                    }
                    
                    log.debug("⚠️ Nome '{}' não encontrado no PDF do holerite {}", receiptCreditedName, payslipFile.getName());
                    
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao processar PDF do holerite {}: {}", payslip.getArquivoCaminho(), e.getMessage());
                }
                
            } catch (Exception e) {
                log.warn("⚠️ Erro ao abrir arquivo do holerite {}: {}", payslip.getArquivoCaminho(), e.getMessage());
            }
        }
        
        log.warn("❌ Nenhum holerite encontrado para o comprovante com nome: '{}'", receiptCreditedName);
        return null;
    }
    
    /**
     * Sanitiza candidato a setor (mesma lógica do PayslipService)
     */
    private String sanitizeWorkPostCandidate(String candidate) {
        if (candidate == null) {
            return null;
        }
        String cleaned = candidate.replaceAll("[\\p{Cntrl}]", " ").trim();
        if (cleaned.isEmpty()) {
            return null;
        }

        // Se houver rótulo "SETOR: ..." manter apenas o que vem depois dos dois pontos
        int colonIndex = cleaned.indexOf(':');
        if (colonIndex >= 0 && colonIndex < cleaned.length() - 1) {
            cleaned = cleaned.substring(colonIndex + 1).trim();
        }

        cleaned = cleaned.replaceAll("[•·]+", " ");
        cleaned = cleaned.replaceAll("[\\s]+", " ").trim();
        cleaned = cleaned.replaceAll("[.,;]+$", "").trim();
        
        // Validar se parece um setor válido (mais de 2 caracteres, não é apenas números)
        if (cleaned.length() < 3) {
            return null;
        }
        if (cleaned.matches("^\\d+$")) {
            return null;
        }
        
        // Remover palavras comuns que não são setor
        String upper = cleaned.toUpperCase();
        if (upper.contains("PERÍODO") || upper.contains("REFERÊNCIA") || 
            upper.contains("COMPETÊNCIA") || upper.contains("FUNCIONÁRIO") ||
            upper.contains("CPF") || upper.contains("CNPJ") ||
            upper.contains("EMPRESA") || upper.contains("NOME")) {
            return null;
        }
        
        return cleaned;
    }

    // ===== PROCESSAMENTO ASSÍNCRONO =====

    /**
     * Cria um job de unificação em lote e retorna imediatamente
     */
    @Transactional
    public com.z7design.secured_guard.model.UnificationJob createUnificationJob(
            Integer month, Integer year, Boolean forceUnification, UUID createdBy) {
        
        log.info("📋 Criando job de unificação em lote: Mês={}, Ano={}, Force={}", month, year, forceUnification);
        
        try {
            // Verificar se a tabela existe tentando fazer uma query simples
            try {
                log.debug("🔍 Verificando se a tabela unification_jobs existe...");
                long count = unificationJobRepository.count();
                log.debug("✅ Tabela unification_jobs existe. Total de jobs: {}", count);
            } catch (Exception e) {
                String errorMsg = e.getMessage() != null ? e.getMessage() : "";
                String causeMsg = e.getCause() != null && e.getCause().getMessage() != null ? 
                    e.getCause().getMessage() : "";
                
                log.error("❌ Erro ao verificar tabela unification_jobs: {}", errorMsg);
                log.error("❌ Causa: {}", causeMsg);
                log.error("❌ Tipo de exceção: {}", e.getClass().getName());
                
                if (errorMsg.contains("não existe") || 
                    errorMsg.contains("does not exist") ||
                    errorMsg.contains("unification_jobs") ||
                    causeMsg.contains("não existe") ||
                    causeMsg.contains("does not exist") ||
                    causeMsg.contains("unification_jobs") ||
                    e.getClass().getName().contains("SQLGrammarException") ||
                    e.getClass().getName().contains("PSQLException")) {
                    log.error("❌ ERRO CRÍTICO: A tabela 'unification_jobs' não existe no banco de dados!");
                    log.error("❌ Por favor, execute a migration V338__create_unification_jobs_table.sql");
                    throw new RuntimeException("A tabela 'unification_jobs' não existe no banco de dados. " +
                        "Por favor, execute a migration V338__create_unification_jobs_table.sql para criar a tabela. " +
                        "Erro: " + errorMsg, e);
                }
                // Se não for erro de tabela não existente, relançar
                log.error("❌ Erro inesperado ao verificar tabela: {}", e.getClass().getName());
                throw e;
            }
            
            // Contar quantos documentos serão processados
            log.debug("📊 Buscando holerites para processamento...");
            List<Payslip> allPayslips = payslipService.getAllPayslips();
            log.debug("📊 Total de holerites encontrados: {}", allPayslips.size());
            
            List<Payslip> filteredPayslips = allPayslips.stream()
                .filter(p -> month == null || p.getMonth().equals(month))
                .filter(p -> year == null || p.getYear().equals(year))
                .filter(p -> p.getEmployeeName() != null && p.getMonth() != null && p.getYear() != null)
                .toList();
            
            log.debug("📊 Holerites após filtro: {}", filteredPayslips.size());
            
            Map<String, Payslip> uniquePayslips = filteredPayslips.stream()
                .filter(p -> p.getEmployeeName() != null && !p.getEmployeeName().trim().isEmpty())
                .collect(Collectors.toMap(
                    p -> p.getEmployeeName().trim().toUpperCase() + "_" + p.getMonth() + "_" + p.getYear(),
                    p -> p,
                    (existing, replacement) -> existing
                ));
            
            int totalDocuments = uniquePayslips.size();
            log.debug("📊 Documentos únicos para processar: {}", totalDocuments);
            
            // Criar job
            log.debug("📝 Criando objeto UnificationJob...");
            com.z7design.secured_guard.model.UnificationJob job = com.z7design.secured_guard.model.UnificationJob.builder()
                .status(com.z7design.secured_guard.model.UnificationJob.JobStatus.PENDING)
                .month(month)
                .year(year)
                .forceUnification(forceUnification != null ? forceUnification : false)
                .totalDocuments(totalDocuments)
                .processedDocuments(0)
                .successCount(0)
                .failureCount(0)
                .createdBy(createdBy)
                .build();
            
            log.debug("💾 Salvando job no banco de dados...");
            try {
                job = unificationJobRepository.save(job);
                log.info("✅ Job criado com sucesso: ID={}, Total de documentos: {}", job.getId(), totalDocuments);
            } catch (Exception saveError) {
                log.error("❌ Erro ao salvar job no banco de dados: {}", saveError.getMessage(), saveError);
                log.error("❌ Tipo de exceção: {}", saveError.getClass().getName());
                if (saveError.getCause() != null) {
                    log.error("❌ Causa: {}", saveError.getCause().getMessage());
                }
                throw saveError;
            }
            
            // Retornar o job (a transação será commitada antes do processamento assíncrono)
            // O método assíncrono será executado em thread separada e transação separada
            com.z7design.secured_guard.model.UnificationJob savedJob = job;
            
            // Iniciar processamento assíncrono (será executado em thread separada após o commit)
            // O @Async garante execução em thread separada, e REQUIRES_NEW garante transação separada
            try {
                processUnificationJobAsync(savedJob.getId());
                log.info("✅ Processamento assíncrono iniciado para job: {}", savedJob.getId());
            } catch (Exception e) {
                log.error("⚠️ Erro ao iniciar processamento assíncrono (job continuará em PENDING): {}", e.getMessage(), e);
                // Não propagar o erro - o job foi criado e pode ser processado manualmente depois
            }
            
            return savedJob;
            
        } catch (org.hibernate.exception.SQLGrammarException e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : "";
            if (errorMsg.contains("não existe") || 
                errorMsg.contains("does not exist") ||
                errorMsg.contains("unification_jobs")) {
                log.error("❌ ERRO CRÍTICO: A tabela 'unification_jobs' não existe no banco de dados!");
                log.error("❌ Erro: {}", errorMsg);
                throw new RuntimeException("A tabela 'unification_jobs' não existe no banco de dados. " +
                    "Por favor, execute a migration V338__create_unification_jobs_table.sql para criar a tabela. " +
                    "Erro original: " + errorMsg, e);
            }
            throw e;
        } catch (Exception e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : "";
            // Verificar se é erro de tabela não existente (PostgreSQL)
            if (errorMsg.contains("não existe") || 
                errorMsg.contains("does not exist") ||
                errorMsg.contains("unification_jobs") ||
                (e.getCause() != null && e.getCause().getMessage() != null && 
                 (e.getCause().getMessage().contains("não existe") || 
                  e.getCause().getMessage().contains("does not exist") ||
                  e.getCause().getMessage().contains("unification_jobs")))) {
                log.error("❌ ERRO CRÍTICO: A tabela 'unification_jobs' não existe no banco de dados!");
                log.error("❌ Erro: {}", errorMsg);
                throw new RuntimeException("A tabela 'unification_jobs' não existe no banco de dados. " +
                    "Por favor, execute a migration V338__create_unification_jobs_table.sql para criar a tabela. " +
                    "Reinicie a aplicação para que o Flyway execute as migrations pendentes. " +
                    "Erro original: " + errorMsg, e);
            }
            throw e;
        }
    }

    /**
     * Processa um job de unificação em lote de forma assíncrona
     */
    @Async
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void processUnificationJobAsync(UUID jobId) {
        log.info("🚀 Iniciando processamento assíncrono do job: {}", jobId);
        
        try {
            com.z7design.secured_guard.model.UnificationJob job = unificationJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job não encontrado: " + jobId));
            
            processUnificationJobInternal(jobId, job);
            
        } catch (Exception e) {
            log.error("💥 Erro crítico no processamento assíncrono do job {}: {}", jobId, e.getMessage(), e);
            // Tentar atualizar o job com status de erro (em nova transação)
            try {
                updateJobStatusInNewTransaction(jobId, com.z7design.secured_guard.model.UnificationJob.JobStatus.FAILED, 
                    "Erro crítico: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
            } catch (Exception updateError) {
                log.error("💥 Erro ao atualizar status do job após falha: {}", updateError.getMessage(), updateError);
            }
        }
    }
    
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    private void updateJobStatusInNewTransaction(UUID jobId, com.z7design.secured_guard.model.UnificationJob.JobStatus status, String errorMessage) {
        com.z7design.secured_guard.model.UnificationJob job = unificationJobRepository.findById(jobId).orElse(null);
        if (job != null) {
            job.setStatus(status);
            if (errorMessage != null) {
                job.setErrorMessage(errorMessage);
            }
            job.setCompletedAt(LocalDateTime.now());
            unificationJobRepository.save(job);
        }
    }
    
    private void processUnificationJobInternal(UUID jobId, com.z7design.secured_guard.model.UnificationJob job) {
        try {
            // Atualizar status para PROCESSING
            job.setStatus(com.z7design.secured_guard.model.UnificationJob.JobStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            unificationJobRepository.save(job);
            
            long startTime = System.currentTimeMillis();
            
            // Criar request
            com.z7design.secured_guard.dto.BatchUnificationRequest request = 
                com.z7design.secured_guard.dto.BatchUnificationRequest.builder()
                    .month(job.getMonth())
                    .year(job.getYear())
                    .forceUnification(job.getForceUnification())
                    .build();
            
            // Buscar todos os holerites
            List<Payslip> allPayslips = payslipService.getAllPayslips();
            List<Payslip> filteredPayslips = allPayslips.stream()
                .filter(p -> request.getMonth() == null || p.getMonth().equals(request.getMonth()))
                .filter(p -> request.getYear() == null || p.getYear().equals(request.getYear()))
                .filter(p -> p.getEmployeeName() != null && p.getMonth() != null && p.getYear() != null)
                .toList();
            
            Map<String, Payslip> uniquePayslips = filteredPayslips.stream()
                .filter(p -> p.getEmployeeName() != null && !p.getEmployeeName().trim().isEmpty())
                .collect(Collectors.toMap(
                    p -> p.getEmployeeName().trim().toUpperCase() + "_" + p.getMonth() + "_" + p.getYear(),
                    p -> p,
                    (existing, replacement) -> existing
                ));
            
            int totalDocuments = uniquePayslips.size();
            job.setTotalDocuments(totalDocuments);
            unificationJobRepository.save(job);
            
            log.info("📊 Processando {} documentos únicos", totalDocuments);
            
            // Processar cada documento
            int processed = 0;
            int success = 0;
            int failure = 0;
            
            for (Payslip payslip : uniquePayslips.values()) {
                // Verificar se o job foi cancelado
                job = unificationJobRepository.findById(jobId).orElse(null);
                if (job == null || job.getStatus() == com.z7design.secured_guard.model.UnificationJob.JobStatus.CANCELLED) {
                    log.warn("⚠️ Job {} foi cancelado. Parando processamento.", jobId);
                    break;
                }
                
                String employeeName = payslip.getEmployeeName();
                Integer month = payslip.getMonth();
                Integer year = payslip.getYear();
                
                try {
                    // Usar a mesma lógica do método síncrono, mas atualizando o job
                    boolean successResult = processSingleDocumentForJob(jobId, employeeName, month, year, request.getForceUnification());
                    
                    if (successResult) {
                        success++;
                    } else {
                        failure++;
                    }
                } catch (Exception e) {
                    log.error("💥 Erro ao processar documento {} - {}/{}: {}", employeeName, month, year, e.getMessage());
                    failure++;
                }
                
                processed++;
                
                // Atualizar progresso a cada 10 documentos ou no último
                if (processed % 10 == 0 || processed == totalDocuments) {
                    job = unificationJobRepository.findById(jobId).orElse(null);
                    if (job != null) {
                        job.setProcessedDocuments(processed);
                        job.setSuccessCount(success);
                        job.setFailureCount(failure);
                        unificationJobRepository.save(job);
                        log.info("📊 Progresso: {}/{} processados ({} sucesso, {} falhas)", 
                            processed, totalDocuments, success, failure);
                    }
                }
            }
            
            // Finalizar job
            long endTime = System.currentTimeMillis();
            job = unificationJobRepository.findById(jobId).orElse(null);
            if (job != null) {
                // Status será COMPLETED mesmo com falhas (o job foi processado completamente)
                job.setStatus(com.z7design.secured_guard.model.UnificationJob.JobStatus.COMPLETED);
                job.setProcessedDocuments(processed);
                job.setSuccessCount(success);
                job.setFailureCount(failure);
                job.setProcessingTimeMs(endTime - startTime);
                job.setCompletedAt(LocalDateTime.now());
                if (failure > 0) {
                    job.setErrorMessage(String.format("Processamento concluído com %d sucesso(s) e %d falha(s)", success, failure));
                }
                unificationJobRepository.save(job);
                
                log.info("✅ Job {} concluído: {} processados, {} sucesso, {} falhas, tempo: {} ms", 
                    jobId, processed, success, failure, endTime - startTime);
            }
            
        } catch (Exception e) {
            log.error("💥 Erro crítico ao processar job {}: {}", jobId, e.getMessage(), e);
            // Atualizar status do job em nova transação para evitar problemas de rollback
            try {
                updateJobStatusInNewTransaction(jobId, com.z7design.secured_guard.model.UnificationJob.JobStatus.FAILED, 
                    "Erro crítico: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
            } catch (Exception updateError) {
                log.error("💥 Erro ao atualizar status do job após falha: {}", updateError.getMessage(), updateError);
            }
        }
    }

    /**
     * Processa um único documento para um job (extraído da lógica do método síncrono)
     */
    private boolean processSingleDocumentForJob(UUID jobId, String employeeName, Integer month, Integer year, Boolean forceUnification) {
        try {
            // Buscar holerite
            final String cleanEmployeeName = cleanText(employeeName);
            String normalizedSearchNameHolerite = normalizeNameForSearch(cleanEmployeeName);
            
            List<Payslip> payslipsInDb = payslipService.getAllPayslips().stream()
                .filter(p -> p.getMonth() != null && p.getMonth().equals(month))
                .filter(p -> p.getYear() != null && p.getYear().equals(year))
                .collect(java.util.stream.Collectors.toList());
            
            Payslip matchingPayslip = null;
            for (Payslip p : payslipsInDb) {
                if (p.getEmployeeName() != null) {
                    String normalizedPayslipName = normalizeNameForSearch(p.getEmployeeName());
                    boolean exactMatch = normalizedPayslipName.equals(normalizedSearchNameHolerite);
                    boolean containsMatch = normalizedPayslipName.contains(normalizedSearchNameHolerite) || 
                                           normalizedSearchNameHolerite.contains(normalizedPayslipName);
                    boolean verifyMatch = verifyEmployeeNames(cleanEmployeeName, p.getEmployeeName());
                    
                    if (exactMatch || containsMatch || verifyMatch) {
                        matchingPayslip = p;
                        break;
                    }
                }
            }
            
            String holeritePath = null;
            if (matchingPayslip != null && matchingPayslip.getArquivoCaminho() != null) {
                holeritePath = matchingPayslip.getArquivoCaminho();
                Path absolutePath = Paths.get(holeritePath);
                if (!Files.exists(absolutePath)) {
                    Path relativePath = Paths.get(System.getProperty("user.dir"), holeritePath);
                    if (Files.exists(relativePath)) {
                        holeritePath = relativePath.toAbsolutePath().toString();
                    } else {
                        holeritePath = null;
                    }
                }
            }
            
            if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
                holeritePath = findHoleriteOriginalFileByNameAndPeriod(cleanEmployeeName, month, year);
            }
            
            if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
                log.warn("❌ Holerite não encontrado para {} - {}/{}", employeeName, month, year);
                return false;
            }
            
            // Buscar comprovantes
            String normalizedName = normalizeNameForSearch(employeeName);
            int receiptMonthNext = month == 12 ? 1 : month + 1;
            int receiptYearNext = month == 12 ? year + 1 : year;
            
            List<PaymentReceipt> receiptsInPeriod = new ArrayList<>();
            List<PaymentReceipt> receiptsNextMonth = receiptRepository.findByYearAndMonth(receiptYearNext, receiptMonthNext);
            receiptsInPeriod.addAll(receiptsNextMonth);
            
            List<PaymentReceipt> receiptsSameMonth = receiptRepository.findByYearAndMonth(year, month);
            for (PaymentReceipt receipt : receiptsSameMonth) {
                if (!receiptsInPeriod.contains(receipt)) {
                    receiptsInPeriod.add(receipt);
                }
            }
            
            List<PaymentReceipt> matchedByName = receiptsInPeriod.stream()
                .filter(receipt -> {
                    if (receipt.getEmployeeName() == null) return false;
                    boolean exactMatch = verifyEmployeeNames(employeeName, receipt.getEmployeeName());
                    boolean flexibleMatch = isFlexibleNameMatch(employeeName, receipt.getEmployeeName());
                    boolean normalizedMatch = normalizeNameForSearch(receipt.getEmployeeName())
                        .contains(normalizedName) || normalizedName.contains(normalizeNameForSearch(receipt.getEmployeeName()));
                    return exactMatch || flexibleMatch || normalizedMatch;
                })
                .collect(Collectors.toList());
            
            if (matchedByName.isEmpty()) {
                List<PaymentReceipt> receiptsByName = receiptRepository
                    .findByEmployeeNameContainingIgnoreCase(employeeName);
                
                String[] nameParts = employeeName.trim().toUpperCase().split("\\s+");
                if (nameParts.length >= 2) {
                    String firstName = nameParts[0];
                    String lastName = nameParts[nameParts.length - 1];
                    List<PaymentReceipt> receiptsByFirst = receiptRepository
                        .findByEmployeeNameContainingIgnoreCase(firstName);
                    for (PaymentReceipt receipt : receiptsByFirst) {
                        if (receipt.getEmployeeName() != null && 
                            receipt.getEmployeeName().toUpperCase().contains(lastName)) {
                            if (!receiptsByName.contains(receipt)) {
                                receiptsByName.add(receipt);
                            }
                        }
                    }
                }
                
                matchedByName = receiptsByName.stream()
                    .filter(receipt -> {
                        if (receipt.getEmployeeName() == null) return false;
                        boolean exactMatch = verifyEmployeeNames(employeeName, receipt.getEmployeeName());
                        boolean flexibleMatch = isFlexibleNameMatch(employeeName, receipt.getEmployeeName());
                        boolean normalizedMatch = normalizeNameForSearch(receipt.getEmployeeName())
                            .contains(normalizedName) || normalizedName.contains(normalizeNameForSearch(receipt.getEmployeeName()));
                        return exactMatch || flexibleMatch || normalizedMatch;
                    })
                    .collect(Collectors.toList());
            }
            
            List<PaymentReceipt> uniqueReceipts = deduplicateReceiptsByDateCompanyAndEmployee(matchedByName);
            
            if (uniqueReceipts.isEmpty()) {
                log.warn("❌ Comprovante não encontrado para {} - {}/{}", employeeName, month, year);
                return false;
            }
            
            boolean allNamesMatch = uniqueReceipts.stream()
                .allMatch(receipt -> verifyEmployeeNames(employeeName, receipt.getEmployeeName()));
            
            if (!allNamesMatch && (forceUnification == null || !forceUnification)) {
                log.warn("❌ Nomes não coincidem para {} - {}/{}", employeeName, month, year);
                return false;
            }
            
            // Buscar arquivos PDF dos comprovantes
            List<String> receiptPaths = new ArrayList<>();
            for (PaymentReceipt receipt : uniqueReceipts) {
                String receiptPath = findReceiptOriginalFileByNameAndPeriod(
                    receipt.getEmployeeName(), 
                    receipt.getMonth(),
                    receipt.getYear(),
                    new java.util.ArrayList<>()
                );
                
                if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
                    int nextMonth = receipt.getMonth() == 12 ? 1 : receipt.getMonth() + 1;
                    int nextYear = receipt.getMonth() == 12 ? receipt.getYear() + 1 : receipt.getYear();
                    receiptPath = findReceiptOriginalFileByNameAndPeriod(
                        receipt.getEmployeeName(),
                        nextMonth,
                        nextYear,
                        new java.util.ArrayList<>()
                    );
                }
                
                if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
                    int prevMonth = receipt.getMonth() == 1 ? 12 : receipt.getMonth() - 1;
                    int prevYear = receipt.getMonth() == 1 ? receipt.getYear() - 1 : receipt.getYear();
                    receiptPath = findReceiptOriginalFileByNameAndPeriod(
                        receipt.getEmployeeName(),
                        prevMonth,
                        prevYear,
                        new java.util.ArrayList<>()
                    );
                }
                
                if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
                    receiptPath = findReceiptOriginalFileByNameOnly(receipt.getEmployeeName(), new java.util.ArrayList<>());
                }
                
                if (receiptPath != null && Files.exists(Paths.get(receiptPath))) {
                    receiptPaths.add(receiptPath);
                }
            }
            
            if (receiptPaths.isEmpty()) {
                log.warn("❌ PDFs dos comprovantes não encontrados para {} - {}/{}", employeeName, month, year);
                return false;
            }
            
            // Extrair nome do funcionário e verificar correspondência antes de criar documento unificado
            // (implementação similar à unificação individual)
            String finalEmployeeName = employeeName; // Fallback
            // TODO: Implementar extração de nomes se necessário neste contexto
            
            // Criar documento unificado
            String unifiedPath = createUnifiedPdfUsingMerger(
                holeritePath, 
                receiptPaths, 
                finalEmployeeName, 
                month, 
                year,
                null, // payslip não disponível neste contexto
                null  // receipt não disponível neste contexto
            );
            
            log.info("✅ Documento unificado criado: {}", unifiedPath);
            return true;
            
        } catch (Exception e) {
            log.error("💥 Erro ao processar documento {} - {}/{}: {}", employeeName, month, year, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Busca um job por ID
     */
    @Transactional(readOnly = true)
    public com.z7design.secured_guard.model.UnificationJob getJobById(UUID jobId) {
        return unificationJobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job não encontrado: " + jobId));
    }

    /**
     * Cancela um job em processamento
     */
    @Transactional
    public void cancelJob(UUID jobId) {
        com.z7design.secured_guard.model.UnificationJob job = unificationJobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job não encontrado: " + jobId));
        
        if (job.getStatus() == com.z7design.secured_guard.model.UnificationJob.JobStatus.PROCESSING) {
            job.setStatus(com.z7design.secured_guard.model.UnificationJob.JobStatus.CANCELLED);
            job.setCompletedAt(LocalDateTime.now());
            unificationJobRepository.save(job);
            log.info("✅ Job {} cancelado", jobId);
        } else {
            throw new IllegalStateException("Job não pode ser cancelado. Status atual: " + job.getStatus());
        }
    }

    // ===== PROCESSAMENTO ASSÍNCRONO DE EXCLUSÃO =====

    /**
     * Cria um job de exclusão em lote e retorna imediatamente
     */
    @Transactional
    public com.z7design.secured_guard.model.DeletionJob createDeletionJob(
            List<String> fileNames, UUID createdBy) {
        
        log.info("🗑️ Criando job de exclusão em lote: {} arquivo(s)", fileNames.size());
        
        // Salvar lista de arquivos como JSON
        String fileNamesJson;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            fileNamesJson = mapper.writeValueAsString(fileNames);
        } catch (Exception e) {
            log.error("💥 Erro ao serializar lista de arquivos: {}", e.getMessage());
            fileNamesJson = "[]";
        }
        
        com.z7design.secured_guard.model.DeletionJob job = com.z7design.secured_guard.model.DeletionJob.builder()
            .status(com.z7design.secured_guard.model.DeletionJob.JobStatus.PENDING)
            .totalFiles(fileNames.size())
            .processedFiles(0)
            .deletedCount(0)
            .failedCount(0)
            .fileNames(fileNamesJson)
            .createdBy(createdBy)
            .build();
        
        job = deletionJobRepository.save(job);
        log.info("✅ Job de exclusão criado: {} ({} arquivos)", job.getId(), fileNames.size());
        
        // Iniciar processamento assíncrono
        processDeletionJobAsync(job.getId());
        
        return job;
    }

    /**
     * Processa um job de exclusão em lote de forma assíncrona
     */
    @Async
    @Transactional
    public void processDeletionJobAsync(UUID jobId) {
        log.info("🗑️ Iniciando processamento assíncrono do job de exclusão: {}", jobId);
        
        com.z7design.secured_guard.model.DeletionJob job = deletionJobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job de exclusão não encontrado: " + jobId));
        
        try {
            // Atualizar status para PROCESSING
            job.setStatus(com.z7design.secured_guard.model.DeletionJob.JobStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            deletionJobRepository.save(job);
            
            long startTime = System.currentTimeMillis();
            
            // Parsear lista de arquivos
            List<String> fileNames;
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                fileNames = mapper.readValue(job.getFileNames(), 
                    mapper.getTypeFactory().constructCollectionType(List.class, String.class));
            } catch (Exception e) {
                log.error("💥 Erro ao parsear lista de arquivos: {}", e.getMessage());
                throw new RuntimeException("Erro ao parsear lista de arquivos", e);
            }
            
            int deletedCount = 0;
            int failedCount = 0;
            List<String> failedFiles = new ArrayList<>();
            
            // Processar exclusões em paralelo (usando stream paralelo para melhor performance)
            log.info("🗑️ Processando {} arquivo(s) para exclusão...", fileNames.size());
            
            for (int i = 0; i < fileNames.size(); i++) {
                String fileName = fileNames.get(i);
                
                // Verificar se job foi cancelado
                job = deletionJobRepository.findById(jobId).orElse(null);
                if (job == null || job.getStatus() == com.z7design.secured_guard.model.DeletionJob.JobStatus.CANCELLED) {
                    log.info("⚠️ Job de exclusão foi cancelado. Parando processamento.");
                    break;
                }
                
                try {
                    if (deleteUnifiedDocument(fileName)) {
                        deletedCount++;
                        log.debug("✅ Arquivo excluído: {} ({}/{})", fileName, i + 1, fileNames.size());
                    } else {
                        failedCount++;
                        failedFiles.add(fileName);
                        log.warn("⚠️ Falha ao excluir arquivo: {} ({}/{})", fileName, i + 1, fileNames.size());
                    }
                } catch (Exception e) {
                    failedCount++;
                    failedFiles.add(fileName);
                    log.error("💥 Erro ao excluir arquivo {}: {}", fileName, e.getMessage());
                }
                
                // Atualizar progresso a cada 10 arquivos ou no final
                if ((i + 1) % 10 == 0 || (i + 1) == fileNames.size()) {
                    job.setProcessedFiles(i + 1);
                    job.setDeletedCount(deletedCount);
                    job.setFailedCount(failedCount);
                    deletionJobRepository.save(job);
                    log.info("📊 Progresso: {}/{} processados, {} excluídos, {} falhas", 
                        i + 1, fileNames.size(), deletedCount, failedCount);
                }
            }
            
            // Finalizar job
            long endTime = System.currentTimeMillis();
            job.setStatus(com.z7design.secured_guard.model.DeletionJob.JobStatus.COMPLETED);
            job.setProcessedFiles(fileNames.size());
            job.setDeletedCount(deletedCount);
            job.setFailedCount(failedCount);
            job.setProcessingTimeMs(endTime - startTime);
            job.setCompletedAt(LocalDateTime.now());
            
            if (failedCount > 0) {
                job.setErrorMessage(String.format("%d arquivo(s) não puderam ser excluídos: %s", 
                    failedCount, String.join(", ", failedFiles.subList(0, Math.min(10, failedFiles.size())))));
            }
            
            deletionJobRepository.save(job);
            
            log.info("✅ Job de exclusão concluído: {} ({} excluídos, {} falhas, {}ms)", 
                jobId, deletedCount, failedCount, endTime - startTime);
            
        } catch (Exception e) {
            log.error("💥 Erro ao processar job de exclusão {}: {}", jobId, e.getMessage(), e);
            job.setStatus(com.z7design.secured_guard.model.DeletionJob.JobStatus.FAILED);
            job.setErrorMessage("Erro ao processar exclusão: " + e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            deletionJobRepository.save(job);
        }
    }

    /**
     * Busca um job de exclusão por ID
     */
    public com.z7design.secured_guard.model.DeletionJob getDeletionJobById(UUID jobId) {
        return deletionJobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job de exclusão não encontrado: " + jobId));
    }

    /**
     * Cancela um job de exclusão em processamento
     */
    @Transactional
    public void cancelDeletionJob(UUID jobId) {
        com.z7design.secured_guard.model.DeletionJob job = deletionJobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job de exclusão não encontrado: " + jobId));
        
        if (job.getStatus() == com.z7design.secured_guard.model.DeletionJob.JobStatus.PROCESSING) {
            job.setStatus(com.z7design.secured_guard.model.DeletionJob.JobStatus.CANCELLED);
            job.setCompletedAt(LocalDateTime.now());
            deletionJobRepository.save(job);
            log.info("✅ Job de exclusão {} cancelado", jobId);
        } else {
            throw new IllegalStateException("Job não pode ser cancelado. Status atual: " + job.getStatus());
        }
    }
} 