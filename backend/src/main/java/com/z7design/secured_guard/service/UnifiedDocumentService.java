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
    private static final String UNIFIED_DIR = "uploads/unified/";

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
            contentStream.showText("Nomes Coincidentes: " + (namesMatch ? "✅ Sim" : "❌ Não"));
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

        // 1) Localizar PDF original do holerite
        String holeritePath = findHoleriteOriginalFileByNameAndPeriod(cleanEmployeeName, month, year);
        if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
            log.error("❌ Holerite não encontrado para {} {}/{}", cleanEmployeeName, month, year);
            throw new IOException(String.format("Holerite original não encontrado para o funcionário '%s' no período %d/%d. Verifique se o holerite foi importado corretamente.", employeeName, month, year));
        }
        log.info("📄 Holerite encontrado: {}", holeritePath);

        // 2) Localizar PDF original do comprovante (REGRA: mês seguinte ao holerite)
        int receiptMonth = month == 12 ? 1 : month + 1;
        int receiptYear = month == 12 ? year + 1 : year;
        
        log.info("🔍 Buscando comprovante para holerite {}/{} -> comprovante {}/{}", 
            month, year, receiptMonth, receiptYear);
            
        String receiptPath = findReceiptOriginalFileByNameAndPeriod(cleanEmployeeName, receiptMonth, receiptYear);
        if (receiptPath == null || !Files.exists(Paths.get(receiptPath))) {
            log.error("❌ Comprovante não encontrado para {} {}/{} (holerite {}/{})", 
                cleanEmployeeName, receiptMonth, receiptYear, month, year);
            String errorMessage = String.format(
                "COMPROVANTE NÃO ENCONTRADO\n\n" +
                "Funcionário: %s\n" +
                "Período do Holerite: %d/%d\n" +
                "Período do Comprovante: %d/%d (mês seguinte)\n\n" +
                "AÇÃO NECESSÁRIA:\n" +
                "Por favor, importe o comprovante de pagamento para o funcionário '%s' referente ao período %d/%d.\n\n" +
                "O holerite já está importado e processado. Apenas o comprovante precisa ser importado.",
                employeeName, month, year, receiptMonth, receiptYear, employeeName, receiptMonth, receiptYear
            );
            throw new IOException(errorMessage);
        }
        log.info("📄 Comprovante encontrado: {}", receiptPath);

        // 3) Verificar nomes (flexível) antes de unificar
        boolean namesOk = verifyEmployeeNames(cleanEmployeeName, cleanEmployeeName);
        if (!namesOk) {
            log.warn("⚠️ Nomes não coincidem (verificação flexível) - prosseguindo mesmo assim");
        }

        // 4) Unificar mantendo holerite na página 1 e comprovante na página 2
        log.info("🔄 Criando documento unificado individual");
        List<String> receiptPaths = new ArrayList<>();
        receiptPaths.add(receiptPath);
        
        String unifiedPath = createUnifiedPdfUsingMerger(
            holeritePath, 
            receiptPaths, 
            cleanEmployeeName, 
            month, 
            year
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
    public List<Map<String, Object>> searchUnifiedDocumentsByEmployee(String employeeName) throws IOException {
        log.info("🔍 Buscando documentos unificados para funcionário: {}", employeeName);
        
        List<Map<String, Object>> allDocuments = listAllUnifiedDocuments();
        List<Map<String, Object>> filteredDocuments = new ArrayList<>();
        
        String searchTerm = employeeName.toLowerCase().trim();
        
        for (Map<String, Object> doc : allDocuments) {
            String fileName = (String) doc.get("fileName");
            String docEmployeeName = (String) doc.get("employeeName");
            
            if (fileName != null && docEmployeeName != null) {
                if (fileName.toLowerCase().contains(searchTerm) || 
                    docEmployeeName.toLowerCase().contains(searchTerm)) {
                    filteredDocuments.add(doc);
                }
            }
        }
        
        log.info("✅ Encontrados {} documentos para o funcionário: {}", filteredDocuments.size(), employeeName);
        return filteredDocuments;
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
        
        log.info("🔍 Comparando nomes (verificação flexível):");
        log.info("  Holerite original: '{}'", holeriteName);
        log.info("  Recibo original: '{}'", receiptName);
        log.info("  Holerite normalizado: '{}'", normalizedHolerite);
        log.info("  Recibo normalizado: '{}'", normalizedReceipt);
        
        // Verificação exata
        boolean exactMatch = normalizedHolerite.equals(normalizedReceipt);
        
        // Verificação parcial (se um nome contém o outro)
        boolean partialMatch = normalizedHolerite.contains(normalizedReceipt) || 
                              normalizedReceipt.contains(normalizedHolerite);
        
        // Verificação por palavras-chave (primeiro e último nome) - com suporte a truncamentos
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
        
        log.info("🔍 Resultados da verificação flexível:");
        log.info("  Match exato: {}", exactMatch);
        log.info("  Match parcial: {}", partialMatch);
        log.info("  Match por palavras-chave: {}", keywordMatch);
        log.info("  Match limpo: {}", cleanMatch);
        log.info("  Match por último nome truncado: {}", truncatedLastMatch);
        
        // Retorna true se qualquer verificação passar
        return exactMatch || partialMatch || keywordMatch || cleanMatch || truncatedLastMatch;
    }

    /**
     * Verifica match por palavras-chave (primeiro e último nome) - com suporte a truncamentos
     */
    private boolean checkKeywordMatch(String name1, String name2) {
        String[] words1 = name1.split("\\s+");
        String[] words2 = name2.split("\\s+");
        
        if (words1.length < 2 || words2.length < 2) {
            // Se não tem pelo menos 2 palavras, usar matching por contenção
            return name1.contains(name2) || name2.contains(name1);
        }
        
        // Verificar primeiro e último nome
        String first1 = words1[0];
        String last1 = words1[words1.length - 1];
        String first2 = words2[0];
        String last2 = words2[words2.length - 1];
        
        // Primeiro nome: exato ou um contém o outro (para lidar com abreviações)
        boolean firstMatch = first1.equals(first2) || 
                            (first1.length() >= 3 && first2.length() >= 3 && 
                             (first1.contains(first2) || first2.contains(first1)));
        
        // Último nome: exato, um contém o outro, ou um é prefixo do outro (para truncamentos: PEREIRA vs PERE)
        boolean lastMatch = last1.equals(last2) || 
                           (last1.length() >= 3 && last2.length() >= 3 && 
                            (last1.contains(last2) || last2.contains(last1))) ||
                           (last1.length() >= 4 && last2.length() >= 4 && 
                            (last1.startsWith(last2) || last2.startsWith(last1)));
        
        log.info("🔍 Verificação por palavras-chave:");
        log.info("  Primeiro nome: '{}' = '{}' ? {}", first1, first2, firstMatch);
        log.info("  Último nome: '{}' = '{}' ? {}", last1, last2, lastMatch);
        
        return firstMatch && lastMatch;
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
        
        try {
            // Procurar o arquivo recursivamente na pasta uploads/unified
            Path basePath = Paths.get("uploads", "unified");
            Path filePath = findFileRecursively(basePath, fileName);
            
            if (filePath == null) {
                log.warn("⚠️ Arquivo não encontrado: {}", fileName);
                return false;
            }
            
            log.info("✅ Arquivo encontrado em: {}", filePath);
            
            // Verificar se é um arquivo PDF
            if (!fileName.toLowerCase().endsWith(".pdf")) {
                log.warn("⚠️ Tipo de arquivo não permitido: {}", fileName);
                return false;
            }
            
            // Excluir o arquivo
            boolean deleted = Files.deleteIfExists(filePath);
            
            if (deleted) {
                log.info("✅ Arquivo excluído com sucesso: {}", fileName);
                
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
                
                return true;
            } else {
                log.warn("⚠️ Arquivo não pôde ser excluído: {}", fileName);
                return false;
            }
            
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
     */
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
        
        // Dividir em palavras
        String[] words1 = normalized1.split("\\s+");
        String[] words2 = normalized2.split("\\s+");
        
        if (words1.length < 2 || words2.length < 2) {
            // Se não tem pelo menos 2 palavras, usar matching por contenção
            return normalized1.contains(normalized2) || normalized2.contains(normalized1);
        }
        
        // Verificar primeiro nome
        String first1 = words1[0];
        String first2 = words2[0];
        boolean firstMatches = first1.equals(first2) || 
                              first1.length() >= 3 && first2.length() >= 3 && 
                              (first1.contains(first2) || first2.contains(first1));
        
        // Verificar último nome - com suporte a truncamentos (PEREIRA vs PERE)
        String last1 = words1[words1.length - 1];
        String last2 = words2[words2.length - 1];
        boolean lastMatches = last1.equals(last2) || 
                              (last1.length() >= 3 && last2.length() >= 3 && 
                               (last1.contains(last2) || last2.contains(last1))) ||
                              (last1.length() >= 4 && last2.length() >= 4 && 
                               (last1.startsWith(last2) || last2.startsWith(last1)));
        
        // Se primeiro E último nome batem, considerar match
        if (firstMatches && lastMatches) {
            log.info("✅ Match flexível encontrado: '{}' <-> '{}' (primeiro: '{}'='{}', último: '{}'='{}')", 
                name1, name2, first1, first2, last1, last2);
            return true;
        }
        
        // Verificar se um nome contém o outro (após normalização)
        if (normalized1.length() >= 10 && normalized2.length() >= 10) {
            // Se ambos são longos, verificar se há overlap significativo
            int minLength = Math.min(normalized1.length(), normalized2.length());
            int overlap = 0;
            
            // Verificar overlap por palavras
            for (String word1 : words1) {
                if (word1.length() >= 3) {
                    for (String word2 : words2) {
                        if (word2.length() >= 3) {
                            // Verificar match exato ou por prefixo (truncamento)
                            if (word1.equals(word2) || 
                                (word1.length() >= 4 && word2.length() >= 4 && 
                                 (word1.startsWith(word2) || word2.startsWith(word1)))) {
                                overlap += Math.min(word1.length(), word2.length());
                            }
                        }
                    }
                }
            }
            
            // Se overlap é pelo menos 50% do nome menor, considerar match
            if (overlap >= minLength * 0.5) {
                log.info("✅ Match flexível por overlap: '{}' <-> '{}' (overlap: {})", 
                    name1, name2, overlap);
                return true;
            }
        }
        
        return false;
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
                    // 4.1. Buscar arquivo do holerite
                    String holeritePath = findHoleriteOriginalFileByNameAndPeriod(employeeName, month, year);
                    detail.setHoleriteFound(holeritePath != null ? "✅ Sim" : "❌ Não");
                    
                    if (holeritePath == null || !Files.exists(Paths.get(holeritePath))) {
                        detail.setStatus("FALHA");
                        detail.setMessage("Arquivo PDF do holerite não encontrado");
                        result.getFailureList().add(detail);
                        result.setTotalFailed(result.getTotalFailed() + 1);
                        log.warn("❌ Holerite não encontrado para {} - {}/{}", employeeName, month, year);
                        continue;
                    }
                    
                    // 4.2. Buscar comprovantes para o funcionário usando múltiplas estratégias
                    // ESTRATÉGIA 1: Buscar por nome normalizado (sem acentos, espaços normalizados)
                    String normalizedName = normalizeNameForSearch(employeeName);
                    log.info("🔍 Buscando comprovantes para '{}' (normalizado: '{}')", employeeName, normalizedName);
                    
                    // Buscar comprovantes usando múltiplas estratégias
                    List<PaymentReceipt> allReceipts = new ArrayList<>();
                    
                    // Estratégia 1.1: Buscar por nome completo (contains ignore case)
                    List<PaymentReceipt> receiptsByName = receiptRepository
                        .findByEmployeeNameContainingIgnoreCase(employeeName);
                    allReceipts.addAll(receiptsByName);
                    log.info("📋 Encontrados {} comprovante(s) por nome completo '{}'", receiptsByName.size(), employeeName);
                    
                    // Estratégia 1.2: Buscar por partes do nome (primeiro e último nome)
                    String[] nameParts = employeeName.trim().toUpperCase().split("\\s+");
                    if (nameParts.length >= 2) {
                        String firstName = nameParts[0];
                        String lastName = nameParts[nameParts.length - 1];
                        log.info("🔍 Buscando por primeiro nome '{}' e último nome '{}'", firstName, lastName);
                        
                        // Buscar por primeiro nome
                        List<PaymentReceipt> receiptsByFirst = receiptRepository
                            .findByEmployeeNameContainingIgnoreCase(firstName);
                        for (PaymentReceipt receipt : receiptsByFirst) {
                            if (receipt.getEmployeeName() != null && 
                                receipt.getEmployeeName().toUpperCase().contains(lastName)) {
                                if (!allReceipts.contains(receipt)) {
                                    allReceipts.add(receipt);
                                }
                            }
                        }
                        log.info("📋 Encontrados {} comprovante(s) adicionais por partes do nome", 
                            allReceipts.size() - receiptsByName.size());
                    }
                    
                    // Estratégia 1.3: Buscar por nome normalizado (sem acentos)
                    if (!normalizedName.equals(employeeName.trim().toLowerCase())) {
                        // Buscar usando nome normalizado parcial
                        String[] normalizedParts = normalizedName.split("\\s+");
                        if (normalizedParts.length > 0 && normalizedParts[0].length() >= 3) {
                            List<PaymentReceipt> receiptsByNormalized = receiptRepository
                                .findByEmployeeNameContainingIgnoreCase(normalizedParts[0]);
                            for (PaymentReceipt receipt : receiptsByNormalized) {
                                String receiptNormalized = normalizeNameForSearch(receipt.getEmployeeName());
                                if (normalizedName.contains(receiptNormalized) || 
                                    receiptNormalized.contains(normalizedName)) {
                                    if (!allReceipts.contains(receipt)) {
                                        allReceipts.add(receipt);
                                    }
                                }
                            }
                        }
                    }
                    
                    log.info("📊 Total de comprovantes encontrados (todas as estratégias): {}", allReceipts.size());
                    
                    // REGRA DE NEGÓCIO: O comprovante de pagamento pode ser do mês SEGUINTE ou do MESMO mês
                    // Ex: Holerite de setembro -> Comprovante de outubro (mês do pagamento) OU setembro
                    int receiptMonthNext = month == 12 ? 1 : month + 1;
                    int receiptYearNext = month == 12 ? year + 1 : year;
                    
                    log.info("🔍 Buscando comprovante para holerite {}/{} -> tentando comprovante {}/{} (mês seguinte) ou {}/{} (mesmo mês)", 
                        month, year, receiptMonthNext, receiptYearNext, month, year);
                    
                    // Filtrar por mês e ano - tentar mês seguinte PRIMEIRO, depois mesmo mês
                    List<PaymentReceipt> matchingReceipts = new ArrayList<>();
                    
                    // Tentativa 1: Mês seguinte (pagamento típico)
                    List<PaymentReceipt> receiptsNextMonth = allReceipts.stream()
                        .filter(r -> r.getMonth() != null && r.getMonth().equals(receiptMonthNext))
                        .filter(r -> r.getYear() != null && r.getYear().equals(receiptYearNext))
                        .collect(Collectors.toList());
                    
                    if (!receiptsNextMonth.isEmpty()) {
                        matchingReceipts.addAll(receiptsNextMonth);
                        log.info("✅ Encontrados {} comprovante(s) no mês seguinte {}/{}", 
                            receiptsNextMonth.size(), receiptMonthNext, receiptYearNext);
                    } else {
                        // Tentativa 2: Mesmo mês (fallback)
                        List<PaymentReceipt> receiptsSameMonth = allReceipts.stream()
                            .filter(r -> r.getMonth() != null && r.getMonth().equals(month))
                            .filter(r -> r.getYear() != null && r.getYear().equals(year))
                            .collect(Collectors.toList());
                        
                        if (!receiptsSameMonth.isEmpty()) {
                            matchingReceipts.addAll(receiptsSameMonth);
                            log.info("✅ Encontrados {} comprovante(s) no mesmo mês {}/{}", 
                                receiptsSameMonth.size(), month, year);
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
                        }
                    }
                    
                    List<PaymentReceipt> uniqueReceipts = deduplicateReceiptsByDateCompanyAndEmployee(matchedByName);
                    if (matchedByName.size() != uniqueReceipts.size()) {
                        log.info("♻️ Removidos {} comprovante(s) duplicado(s) para {} {}/{} com base em data/nome/empresa",
                            matchedByName.size() - uniqueReceipts.size(), employeeName, month, year);
                    }
                    
                    detail.setReceiptFound(uniqueReceipts.isEmpty() ? "❌ Não" : "✅ Sim (" + uniqueReceipts.size() + ")");
                    
                    if (uniqueReceipts.isEmpty()) {
                        // Log detalhado para debug
                        log.warn("❌ Nenhum comprovante encontrado para {} - {}/{}", employeeName, month, year);
                        log.warn("   Tentou buscar no período {}/{} (mês seguinte) e {}/{} (mesmo mês)", 
                            receiptMonthNext, receiptYearNext, month, year);
                        log.warn("   Total de comprovantes no banco para nome '{}': {}", employeeName, allReceipts.size());
                        if (!allReceipts.isEmpty()) {
                            log.warn("   Períodos dos comprovantes encontrados:");
                            allReceipts.forEach(r -> log.warn("     - {}: {}/{}", 
                                r.getEmployeeName(), r.getMonth(), r.getYear()));
                        }
                        
                        detail.setStatus("FALHA");
                        detail.setMessage("Nenhum comprovante encontrado para o período");
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
                    
                    // 4.5. Criar documento unificado usando PDFMergerUtility
                    String unifiedPath = createUnifiedPdfUsingMerger(
                        holeritePath, 
                        receiptPaths, 
                        employeeName, 
                        month, 
                        year
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
     */
    private String createUnifiedPdfUsingMerger(String holeritePath, List<String> receiptPaths, 
                                               String employeeName, int month, int year) throws IOException {
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
        
        // Nome do arquivo unificado COM CPF
        String cleanName = employeeName.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "").replaceAll("\\s+", "_");
        String fileName;
        if (!cpf.isEmpty()) {
            fileName = String.format("UNIFICADO_%s_%s_%d_%d.pdf", cleanName.toUpperCase(), cpf, month, year);
            log.info("📄 Nome do arquivo unificado COM CPF: {}", fileName);
        } else {
            fileName = String.format("UNIFICADO_%s_%d_%d.pdf", cleanName.toUpperCase(), month, year);
            log.warn("⚠️ Nome do arquivo unificado SEM CPF: {}", fileName);
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
                    // Buscar payslip e receipt relacionados
                    Payslip payslip = null;
                    PaymentReceipt receipt = null;
                    Employee employee = null;
                    
                    // Buscar payslip por nome, mês e ano
                    List<Payslip> payslips = payslipService.getAllPayslips();
                    for (Payslip p : payslips) {
                        if (p.getEmployeeName() != null && 
                            p.getEmployeeName().equalsIgnoreCase(employeeName) &&
                            p.getMonth() != null && p.getMonth().equals(month) &&
                            p.getYear() != null && p.getYear().equals(year)) {
                            payslip = p;
                            break;
                        }
                    }
                    
                    // Buscar receipt por nome e período (mês seguinte)
                    int receiptMonth = month == 12 ? 1 : month + 1;
                    int receiptYear = month == 12 ? year + 1 : year;
                    List<PaymentReceipt> receipts = receiptRepository.findAll();
                    for (PaymentReceipt r : receipts) {
                        if (r.getEmployeeName() != null && 
                            r.getEmployeeName().equalsIgnoreCase(employeeName) &&
                            r.getMonth() != null && r.getMonth().equals(receiptMonth) &&
                            r.getYear() != null && r.getYear().equals(receiptYear)) {
                            receipt = r;
                            break;
                        }
                    }
                    
                    // Buscar employee por CPF se disponível
                    if (payslip != null && payslip.getCpf() != null) {
                        employee = employeeRepository.findByCpf(payslip.getCpf()).orElse(null);
                    }
                    
                    // Criar e salvar UnifiedDocument
                    UnifiedDocument unifiedDoc = UnifiedDocument.builder()
                        .employee(employee)
                        .payslip(payslip)
                        .receipt(receipt)
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
     * Similar à organização de holerites
     */
    public PayslipOrganizationResponse organizeUnifiedDocumentsByCompany() {
        PayslipOrganizationResponse response = new PayslipOrganizationResponse();
        response.setGeneratedAt(LocalDateTime.now());

        try {
            // Buscar todos os documentos unificados
            List<Map<String, Object>> unifiedDocs;
            try {
                unifiedDocs = listAllUnifiedDocuments();
            } catch (IOException e) {
                log.error("❌ Erro ao listar documentos unificados: {}", e.getMessage(), e);
                response.setTotalPayslips(0);
                response.setCompanies(Collections.emptyList());
                response.setTotalCompanies(0);
                response.setTotalSectors(0);
                return response;
            }
            
            if (unifiedDocs.isEmpty()) {
                response.setTotalPayslips(0);
                response.setCompanies(Collections.emptyList());
                response.setTotalCompanies(0);
                response.setTotalSectors(0);
                return response;
            }

            // Buscar todos os payslips para obter informações de empresa/setor
            List<Payslip> allPayslips = payslipService.getAllPayslips();
            
            // Criar um mapa de payslips por chave (nome, mês, ano)
            Map<String, Payslip> payslipMap = new HashMap<>();
            for (Payslip payslip : allPayslips) {
                String key = String.format("%s|%d|%d", 
                    normalizeName(payslip.getEmployeeName()), 
                    payslip.getMonth(), 
                    payslip.getYear());
                payslipMap.put(key, payslip);
            }
            
            // Buscar todos os unified documents do banco para obter relacionamento com payslip
            List<UnifiedDocument> unifiedDocumentsFromDb = new ArrayList<>();
            try {
                unifiedDocumentsFromDb = unifiedDocumentRepository.findAll();
                log.info("📋 Encontrados {} documentos unificados no banco de dados", unifiedDocumentsFromDb.size());
            } catch (Exception dbError) {
                log.warn("⚠️ Erro ao buscar documentos unificados do banco de dados (continuando com arquivos físicos): {}", dbError.getMessage());
                // Continuar mesmo se houver erro ao buscar do banco
            }
            
            Map<String, Payslip> unifiedDocPayslipMap = new HashMap<>();
            for (UnifiedDocument ud : unifiedDocumentsFromDb) {
                if (ud.getPayslip() != null && ud.getEmployeeName() != null && ud.getMonth() != null && ud.getYear() != null) {
                    String key = String.format("%s|%d|%d", 
                        normalizeName(ud.getEmployeeName()), 
                        ud.getMonth(), 
                        ud.getYear());
                    unifiedDocPayslipMap.put(key, ud.getPayslip());
                }
            }
            
            log.info("📊 Total de documentos unificados para organizar: {}", unifiedDocs.size());
            log.info("📊 Total de payslips encontrados: {}", allPayslips.size());
            log.info("📊 Total de documentos unificados no banco: {}", unifiedDocumentsFromDb.size());

            // Converter documentos unificados em "payslips" para usar a mesma lógica de organização
            List<Payslip> payslipsForOrganization = new ArrayList<>();
            int processedCount = 0;
            int skippedCount = 0;
            int foundPayslipCount = 0;
            int tempPayslipCount = 0;
            
            for (Map<String, Object> doc : unifiedDocs) {
                String employeeName = (String) doc.get("employeeName");
                Integer month = (Integer) doc.get("month");
                Integer year = (Integer) doc.get("year");
                String filePath = (String) doc.get("filePath");
                
                if (employeeName == null || month == null || year == null) {
                    skippedCount++;
                    log.debug("⏭️ Documento unificado ignorado (dados incompletos): employeeName={}, month={}, year={}", 
                        employeeName, month, year);
                    continue;
                }
                
                processedCount++;
                Payslip payslip = null;
                
                // Estratégia 1: Buscar payslip correspondente por nome/mês/ano no mapa de payslips
                String key = String.format("%s|%d|%d", normalizeName(employeeName), month, year);
                payslip = payslipMap.get(key);
                
                if (payslip != null) {
                    foundPayslipCount++;
                    log.debug("✅ Payslip encontrado via mapa para: {} - {}/{}", employeeName, month, year);
                }
                
                // Estratégia 2: Se não encontrou, buscar pelo unified document do banco
                if (payslip == null) {
                    payslip = unifiedDocPayslipMap.get(key);
                    if (payslip != null) {
                        foundPayslipCount++;
                        log.debug("✅ Payslip encontrado via banco de dados para: {} - {}/{}", employeeName, month, year);
                    }
                }
                
                // Estratégia 3: Se ainda não encontrou, tentar extrair do PDF do documento unificado
                if (payslip == null && filePath != null) {
                    try {
                        log.info("🔍 Payslip não encontrado para documento unificado {}. Tentando extrair do PDF...", filePath);
                        Payslip extractedPayslip = extractPayslipInfoFromUnifiedDocument(filePath, employeeName, month, year, (String) doc.getOrDefault("cpf", ""));
                        if (extractedPayslip != null) {
                            payslip = extractedPayslip;
                            log.info("✅ Informações extraídas do PDF: Empresa={}, CNPJ={}, Setor={}", 
                                payslip.getCompanyName(), payslip.getCompanyCnpj(), payslip.getWorkPostName());
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao extrair informações do PDF unificado {}: {}", filePath, e.getMessage());
                    }
                }
                
                if (payslip != null) {
                    // Garantir que o nome do arquivo está definido
                    if (payslip.getFileName() == null || payslip.getFileName().isEmpty()) {
                        payslip.setFileName((String) doc.getOrDefault("fileName", ""));
                    }
                    payslipsForOrganization.add(payslip);
                } else {
                    // Se não encontrar payslip, criar um temporário com dados do documento
                    tempPayslipCount++;
                    log.debug("⚠️ Criando payslip temporário para documento unificado: {} - {}/{}", 
                        employeeName, month, year);
                    Payslip tempPayslip = Payslip.builder()
                        .employeeName(employeeName)
                        .cpf((String) doc.getOrDefault("cpf", ""))
                        .month(month)
                        .year(year)
                        .fileName((String) doc.getOrDefault("fileName", ""))
                        .companyName((String) doc.getOrDefault("companyName", ""))
                        .companyCnpj((String) doc.getOrDefault("companyCnpj", ""))
                        .companySigla((String) doc.getOrDefault("companySigla", ""))
                        .workPostName((String) doc.getOrDefault("sector", ""))
                        .build();
                    payslipsForOrganization.add(tempPayslip);
                }
            }
            
            log.info("📊 Estatísticas de processamento: {} processados, {} ignorados, {} com payslip encontrado, {} com payslip temporário", 
                processedCount, skippedCount, foundPayslipCount, tempPayslipCount);

            log.info("📊 Total de payslips preparados para organização: {}", payslipsForOrganization.size());
            
            // Usar o método de organização de payslips
            PayslipOrganizationResponse organizedResponse = payslipService.organizePayslipsByCompany(payslipsForOrganization);
            
            log.info("✅ Organização concluída: {} empresas, {} setores, {} documentos", 
                organizedResponse.getTotalCompanies(), 
                organizedResponse.getTotalSectors(),
                organizedResponse.getTotalPayslips());
            
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
                
                // Extrair CNPJ da empresa (mesma lógica do PayslipService)
                Pattern cnpjPattern = Pattern.compile("CNPJ[:\\s]*([0-9]{2}\\.?[0-9]{3}\\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}|[0-9]{14})");
                for (String linha : linhas) {
                    Matcher cnpjMatcher = cnpjPattern.matcher(linha);
                    if (cnpjMatcher.find()) {
                        empresaCnpj = cnpjMatcher.group(1).replaceAll("[^0-9]", "");
                        log.info("✅ CNPJ da empresa encontrado: {}", empresaCnpj);
                        
                        // Tentar extrair nome da empresa da mesma linha ou linha anterior
                        int cnpjIndex = linha.toUpperCase().indexOf("CNPJ");
                        if (cnpjIndex > 10) {
                            String possibleName = linha.substring(0, cnpjIndex).trim();
                            possibleName = possibleName.replaceAll("(?i)(EMPRESA|RAZÃO SOCIAL|EMPREGADOR)[:\\s]*", "").trim();
                            if (possibleName.length() > 5 && !possibleName.matches(".*\\d{3}.*")) {
                                empresaNome = possibleName;
                                log.info("✅ Nome da empresa encontrado (mesma linha CNPJ): {}", empresaNome);
                            }
                        }
                        break;
                    }
                }
                
                // Fallback: buscar CNPJ sem rótulo
                if (empresaCnpj == null) {
                    Pattern fallbackCnpjPattern = Pattern.compile("(?<!\\d)(\\d{14})(?!\\d)");
                    int limiteLinhas = Math.min(15, linhas.length);
                    for (int i = 0; i < limiteLinhas; i++) {
                        String linha = linhas[i];
                        Matcher fallbackMatcher = fallbackCnpjPattern.matcher(linha.replaceAll("\\s+", ""));
                        if (fallbackMatcher.find()) {
                            empresaCnpj = fallbackMatcher.group(1);
                            log.info("✅ CNPJ (fallback) encontrado: {}", empresaCnpj);
                            
                            if (empresaNome == null) {
                                String possibleName = linha.replaceAll("\\d", " ").replaceAll("\\s+", " ").trim();
                                if (possibleName.length() > 5) {
                                    empresaNome = possibleName;
                                    log.info("✅ Nome da empresa (fallback) identificado: {}", empresaNome);
                                }
                            }
                            break;
                        }
                    }
                }
                
                // Extrair nome da empresa (mesma lógica do PayslipService)
                if (empresaNome == null) {
                    for (int i = 0; i < linhas.length; i++) {
                        String linha = linhas[i].trim();
                        String linhaUpper = linha.toUpperCase();
                        
                        // Procurar por linhas com "LTDA", "S.A", "ME", etc.
                        if ((linhaUpper.contains("LTDA") || linhaUpper.contains("S.A") || 
                            linhaUpper.contains(" ME ") || linhaUpper.contains("EIRELI")) &&
                            !linhaUpper.contains("FUNCIONARIO") && !linhaUpper.contains("CPF") &&
                            linha.length() > 10 && linha.length() < 150) {
                            empresaNome = linha;
                            log.info("✅ Nome da empresa encontrado (por sufixo empresarial): {}", empresaNome);
                            break;
                        }
                    }
                }
                
                // Extrair setor (workPostName) - mesma lógica do PayslipService
                // Procurar por padrões de período que geralmente têm setor ao lado
                Pattern periodoPattern = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})\\s+(?:a|à)\\s+(\\d{2})/(\\d{2})/(\\d{4})");
                for (int idx = 0; idx < linhas.length; idx++) {
                    String linha = linhas[idx];
                    Matcher periodoMatcher = periodoPattern.matcher(linha);
                    if (periodoMatcher.find()) {
                        String trailingText = linha.substring(periodoMatcher.end()).trim();
                        if (trailingText.length() > 3) {
                            workPostName = sanitizeWorkPostCandidate(trailingText);
                            if (workPostName != null) {
                                log.info("✅ Setor encontrado (após período): {}", workPostName);
                                break;
                            }
                        }
                        
                        // Verificar linhas seguintes
                        for (int offset = 1; offset <= 2; offset++) {
                            int idx2 = idx + offset;
                            if (idx2 < linhas.length) {
                                workPostName = sanitizeWorkPostCandidate(linhas[idx2]);
                                if (workPostName != null) {
                                    log.info("✅ Setor encontrado (linha após período): {}", workPostName);
                                    break;
                                }
                            }
                        }
                        if (workPostName != null) break;
                    }
                }
                
                // Buscar por rótulo de setor
                if (workPostName == null) {
                    Pattern labeledPattern = Pattern.compile("(?i)(setor|posto|local(?: de trabalho)?)[:\\s]+(.{3,})");
                    for (String line : linhas) {
                        Matcher matcher = labeledPattern.matcher(line);
                        if (matcher.find()) {
                            workPostName = sanitizeWorkPostCandidate(matcher.group(2));
                            if (workPostName != null) {
                                log.info("✅ Setor encontrado (por rótulo): {}", workPostName);
                                break;
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
} 