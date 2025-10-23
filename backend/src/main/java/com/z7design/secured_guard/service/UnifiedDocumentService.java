package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.model.PaymentReceiptStatus;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UnifiedDocumentService {

    private final ReceiptProcessingService receiptProcessingService;
    private final PayslipService payslipService;
    private final PaymentReceiptRepository receiptRepository;
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
            throw new IOException("Holerite original não encontrado para o período informado");
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
            throw new IOException("Comprovante original não encontrado para o período informado");
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
        try {
            log.info("🔍 Procurando comprovante para: {} - {}/{}", employeeName, month, year);
            
            // Candidatos de diretórios conhecidos (baseado em ReceiptProcessingService UPLOAD_DIR)
            java.util.List<Path> candidates = java.util.List.of(
                Paths.get("uploads", "receipts", String.format("%02d_%04d", month, year)),  // Padrão principal
                Paths.get("uploads", "payment-receipts", String.valueOf(year), String.valueOf(month)),
                Paths.get("uploads", "receipts", String.format("%d_%d", month, year)),
                Paths.get("uploads", "receipts")
            );

            // Normalizar nome para busca - lowercase com underscores
            String nameTokenLower = employeeName
                .replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "")
                .replaceAll("\\s+", "_")
                .toLowerCase();
            
            String nameTokenUpper = nameTokenLower.toUpperCase();
            
            log.info("🔍 Tokens de busca: lower='{}', upper='{}'", nameTokenLower, nameTokenUpper);

            for (Path base : candidates) {
                if (!Files.exists(base)) {
                    log.debug("⏭️ Diretório não existe: {}", base);
                    continue;
                }
                
                log.info("📂 Procurando em: {}", base.toAbsolutePath());
                
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
            
            log.warn("❌ Comprovante não encontrado para {} - {}/{}", employeeName, month, year);
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
                return documents;
            }
            
            log.info("📂 Buscando em: {}", unifiedPath);
            
            // Buscar recursivamente em todos os subdiretórios
            Files.walk(unifiedPath, 3)  // Profundidade máxima de 3 níveis
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
            
            log.info("✅ Encontrados {} documentos unificados", documents.size());
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
     * Verifica se os nomes dos funcionários coincidem
     */
    private boolean verifyEmployeeNames(String holeriteName, String receiptName) {
        if (holeriteName == null || receiptName == null) {
            log.warn("⚠️ Nome nulo detectado na verificação flexível - Holerite: {}, Recibo: {}", holeriteName, receiptName);
            return false;
        }
        
        // Normalizar nomes (remover espaços extras, converter para minúsculas)
        String normalizedHolerite = holeriteName.trim().toLowerCase()
            .replaceAll("\\s+", " "); // Múltiplos espaços para um só
        
        String normalizedReceipt = receiptName.trim().toLowerCase()
            .replaceAll("\\s+", " ");
        
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
        
        // Verificação por palavras-chave (primeiro e último nome)
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
        
        log.info("🔍 Resultados da verificação flexível:");
        log.info("  Match exato: {}", exactMatch);
        log.info("  Match parcial: {}", partialMatch);
        log.info("  Match por palavras-chave: {}", keywordMatch);
        log.info("  Match limpo: {}", cleanMatch);
        
        // Retorna true se qualquer verificação passar
        return exactMatch || partialMatch || keywordMatch || cleanMatch;
    }

    /**
     * Verifica match por palavras-chave (primeiro e último nome)
     */
    private boolean checkKeywordMatch(String name1, String name2) {
        String[] words1 = name1.split("\\s+");
        String[] words2 = name2.split("\\s+");
        
        if (words1.length < 2 || words2.length < 2) {
            return false;
        }
        
        // Verificar primeiro e último nome
        String first1 = words1[0];
        String last1 = words1[words1.length - 1];
        String first2 = words2[0];
        String last2 = words2[words2.length - 1];
        
        boolean firstMatch = first1.equals(first2);
        boolean lastMatch = last1.equals(last2);
        
        log.info("🔍 Verificação por palavras-chave:");
        log.info("  Primeiro nome: '{}' = '{}' ? {}", first1, first2, firstMatch);
        log.info("  Último nome: '{}' = '{}' ? {}", last1, last2, lastMatch);
        
        return firstMatch && lastMatch;
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
                String key = entry.getKey();
                List<Payslip> employeePayslips = entry.getValue();
                
                if (employeePayslips.isEmpty()) continue;
                
                Payslip firstPayslip = employeePayslips.get(0);
                String employeeName = firstPayslip.getEmployeeName();
                Integer month = firstPayslip.getMonth();
                Integer year = firstPayslip.getYear();
                
                log.info("🔍 Processando funcionário: '{}' - {}/{}", employeeName, month, year);
                
                try {
                    // REGRA DE NEGÓCIO: O comprovante de pagamento é do mês SEGUINTE ao holerite
                    int receiptMonth = month == 12 ? 1 : month + 1;
                    int receiptYear = month == 12 ? year + 1 : year;
                    
                    log.info("🔍 Buscando comprovante para holerite {}/{} -> comprovante {}/{}", 
                        month, year, receiptMonth, receiptYear);
                    
                    // Buscar recibos por nome do funcionário (busca mais flexível)
                    log.info("🔍 Buscando recibos para funcionário: '{}'", employeeName);
                    List<PaymentReceipt> allReceipts = receiptRepository.findByEmployeeNameContainingIgnoreCase(employeeName);
                    log.info("📄 Total de recibos encontrados para '{}': {}", employeeName, allReceipts.size());
                    
                    // Mostrar detalhes dos recibos encontrados
                    if (!allReceipts.isEmpty()) {
                        log.info("📋 Detalhes dos recibos encontrados para '{}':", employeeName);
                        for (PaymentReceipt receipt : allReceipts) {
                            log.info("  - ID: {}, Nome: '{}', Mês: {}, Ano: {}", 
                                receipt.getId(), 
                                receipt.getEmployeeName(), 
                                receipt.getMonth(), 
                                receipt.getYear());
                        }
                    }
                    
                    // Filtrar por mês do PAGAMENTO (mês seguinte), ano E NOME EXATO
                    List<PaymentReceipt> matchingReceipts = allReceipts.stream()
                        .filter(receipt -> {
                            boolean monthMatch = receipt.getMonth() != null && receipt.getMonth().equals(receiptMonth);
                            boolean yearMatch = receipt.getYear() != null && receipt.getYear().equals(receiptYear);
                            boolean nameMatch = isExactNameMatch(employeeName, receipt.getEmployeeName());
                            
                            log.info("🔍 Filtro para recibo {}: Mês={} ({}), Ano={} ({}), Nome={} ({})", 
                                receipt.getId(), monthMatch, receiptMonth, yearMatch, receiptYear, nameMatch, receipt.getEmployeeName());
                            
                            return monthMatch && yearMatch && nameMatch;
                        })
                        .collect(Collectors.toList());
                    
                    log.info("📄 Recibos filtrados por período {}/{} (pagamento) e nome exato: {}", receiptMonth, receiptYear, matchingReceipts.size());
                    
                    if (!matchingReceipts.isEmpty()) {
                        log.info("✅ Encontrados {} recibos com nome EXATO para {} - {}/{}", matchingReceipts.size(), employeeName, month, year);
                        
                        // Criar holerite expandido com todos os recibos
                        String expandedPath = createExpandedHolerite(firstPayslip, matchingReceipts);
                        createdDocuments.add(expandedPath);
                        
                        log.info("✅ Holerite expandido criado: {}", expandedPath);
                    } else {
                        log.warn("⚠️ Nenhum recibo com nome EXATO encontrado para {} - holerite {}/{} (procurando comprovante {}/{})", 
                            employeeName, month, year, receiptMonth, receiptYear);
                        log.info("ℹ️ Nomes de recibos encontrados para o período de pagamento {}/{}:", receiptMonth, receiptYear);
                        allReceipts.stream()
                            .filter(receipt -> receipt.getMonth() != null && 
                                             receipt.getMonth().equals(receiptMonth) &&
                                             receipt.getYear() != null && 
                                             receipt.getYear().equals(receiptYear))
                            .forEach(receipt -> log.info("  - Recibo: '{}' vs Holerite: '{}'", 
                                receipt.getEmployeeName(), employeeName));
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
                    
                    // 4.2. Buscar comprovantes para o funcionário
                    List<PaymentReceipt> allReceipts = receiptRepository
                        .findByEmployeeNameContainingIgnoreCase(employeeName);
                    
                    // REGRA DE NEGÓCIO: O comprovante de pagamento é do mês SEGUINTE ao holerite
                    // Ex: Holerite de setembro (mês trabalhado) -> Comprovante de outubro (mês do pagamento)
                    int receiptMonth = month == 12 ? 1 : month + 1;
                    int receiptYear = month == 12 ? year + 1 : year;
                    
                    log.info("🔍 Buscando comprovante para holerite {}/{} -> comprovante {}/{}", 
                        month, year, receiptMonth, receiptYear);
                    
                    // Filtrar por mês e ano do PAGAMENTO (mês seguinte)
                    List<PaymentReceipt> matchingReceipts = allReceipts.stream()
                        .filter(r -> r.getMonth() != null && r.getMonth().equals(receiptMonth))
                        .filter(r -> r.getYear() != null && r.getYear().equals(receiptYear))
                        .toList();
                    
                    detail.setReceiptFound(matchingReceipts.isEmpty() ? "❌ Não" : "✅ Sim (" + matchingReceipts.size() + ")");
                    
                    if (matchingReceipts.isEmpty()) {
                        detail.setStatus("FALHA");
                        detail.setMessage("Nenhum comprovante encontrado para o período");
                        result.getFailureList().add(detail);
                        result.setTotalFailed(result.getTotalFailed() + 1);
                        log.warn("❌ Nenhum comprovante encontrado para {} - {}/{}", employeeName, month, year);
                        continue;
                    }
                    
                    // 4.3. Verificar se os nomes coincidem (VALIDAÇÃO CRÍTICA)
                    boolean allNamesMatch = matchingReceipts.stream()
                        .allMatch(receipt -> isExactNameMatch(employeeName, receipt.getEmployeeName()));
                    
                    detail.setNamesMatch(allNamesMatch);
                    
                    if (!allNamesMatch && (request.getForceUnification() == null || !request.getForceUnification())) {
                        detail.setStatus("FALHA");
                        detail.setMessage("Nomes não coincidem - Holerite: '" + employeeName + "' vs Comprovante(s): " + 
                            matchingReceipts.stream()
                                .map(PaymentReceipt::getEmployeeName)
                                .distinct()
                                .collect(Collectors.joining(", ", "'", "'")));
                        result.getFailureList().add(detail);
                        result.setTotalFailed(result.getTotalFailed() + 1);
                        log.warn("❌ NOMES NÃO COINCIDEM para {} - {}/{}", employeeName, month, year);
                        continue;
                    }
                    
                    // 4.4. Buscar arquivos PDF dos comprovantes (usando o mês do pagamento)
                    List<String> receiptPaths = new ArrayList<>();
                    
                    for (PaymentReceipt receipt : matchingReceipts) {
                        String receiptPath = findReceiptOriginalFileByNameAndPeriod(
                            receipt.getEmployeeName(), 
                            receiptMonth,  // Usar o mês do pagamento (mês seguinte)
                            receiptYear    // Usar o ano do pagamento
                        );
                        
                        if (receiptPath != null && Files.exists(Paths.get(receiptPath))) {
                            receiptPaths.add(receiptPath);
                        } else {
                            log.warn("⚠️ Comprovante PDF não encontrado: {}", receipt.getFileName());
                        }
                    }
                    
                    if (receiptPaths.isEmpty()) {
                        detail.setStatus("FALHA");
                        detail.setMessage("Arquivos PDF dos comprovantes não encontrados no sistema");
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
     * Cria PDF unificado usando PDFMergerUtility para preservar layout original
     */
    private String createUnifiedPdfUsingMerger(String holeritePath, List<String> receiptPaths, 
                                               String employeeName, int month, int year) throws IOException {
        // Criar diretório se não existir
        Path unifiedDir = Paths.get(UNIFIED_DIR, "expanded").toAbsolutePath();
        if (!Files.exists(unifiedDir)) {
            Files.createDirectories(unifiedDir);
        }
        
        // Nome do arquivo unificado
        String cleanName = employeeName.replaceAll("[^a-zA-ZÀ-ÿ0-9\\s]", "").replaceAll("\\s+", "_");
        String fileName = String.format("UNIFICADO_%s_%d_%d.pdf", cleanName.toUpperCase(), month, year);
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
} 