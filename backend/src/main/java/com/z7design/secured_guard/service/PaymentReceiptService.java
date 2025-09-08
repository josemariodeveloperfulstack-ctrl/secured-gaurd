package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PaymentReceiptDTO;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.text.PDFTextStripper;
import java.util.ArrayList;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentReceiptService {

    private final PaymentReceiptRepository receiptRepository;

    public Page<PaymentReceiptDTO> findAll(Pageable pageable) {
        return receiptRepository.findAll(pageable).map(PaymentReceiptDTO::fromEntity);
    }

    public List<PaymentReceiptDTO> findAll() {
        return receiptRepository.findAll().stream()
                .map(PaymentReceiptDTO::fromEntity)
                .collect(java.util.stream.Collectors.toList());
    }

    public PaymentReceiptDTO findById(UUID id) {
        PaymentReceipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recibo não encontrado: " + id));
        return PaymentReceiptDTO.fromEntity(receipt);
    }

    public List<PaymentReceiptDTO> findByClientId(UUID clientId) {
        // Como PaymentReceipt não tem clientId, retornar lista vazia ou implementar lógica específica
        return List.of();
    }

    public List<PaymentReceiptDTO> findByDate(LocalDate date) {
        // Implementar busca por data se necessário
        return List.of();
    }

    public List<PaymentReceiptDTO> findByDateBetween(LocalDate startDate, LocalDate endDate) {
        // Implementar busca por período se necessário
        return List.of();
    }

    public PaymentReceiptDTO save(PaymentReceipt receipt) {
        PaymentReceipt saved = receiptRepository.save(receipt);
        return PaymentReceiptDTO.fromEntity(saved);
    }

    public PaymentReceiptDTO update(PaymentReceipt receipt) {
        if (!receiptRepository.existsById(receipt.getId())) {
            throw new ResourceNotFoundException("Recibo não encontrado: " + receipt.getId());
        }
        PaymentReceipt updated = receiptRepository.save(receipt);
        return PaymentReceiptDTO.fromEntity(updated);
    }

    public void deleteById(UUID id) {
        if (!receiptRepository.existsById(id)) {
            throw new ResourceNotFoundException("Recibo não encontrado: " + id);
        }
        receiptRepository.deleteById(id);
    }
    
    public int deleteByIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        
        // Verificar se todos os IDs existem
        List<UUID> existingIds = ids.stream()
                .filter(id -> receiptRepository.existsById(id))
                .collect(java.util.stream.Collectors.toList());
        
        if (existingIds.isEmpty()) {
            return 0;
        }
        
        // Deletar todos os recibos existentes
        receiptRepository.deleteAllById(existingIds);
        
        return existingIds.size();
    }

    public List<PaymentReceiptDTO> findByEmployeeAndMonthYear(UUID employeeId, Integer month, Integer year) {
        return receiptRepository.findByEmployeeAndMonthYear(employeeId, month, year)
                .map(PaymentReceiptDTO::fromEntity)
                .stream()
                .collect(java.util.stream.Collectors.toList());
    }

    public List<PaymentReceiptDTO> findByMonthAndYear(Integer month, Integer year) {
        return receiptRepository.findByMonthAndYear(month, year).stream()
                .map(PaymentReceiptDTO::fromEntity)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<PaymentReceiptDTO> findByStatus(PaymentReceipt.ReceiptStatus status) {
        return receiptRepository.findByStatus(status).stream()
                .map(PaymentReceiptDTO::fromEntity)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<PaymentReceiptDTO> findByEmployeeNameContaining(String employeeName) {
        return receiptRepository.findByEmployeeNameContaining(employeeName).stream()
                .map(PaymentReceiptDTO::fromEntity)
                .collect(java.util.stream.Collectors.toList());
    }
    
    public List<PaymentReceiptDTO> processPdfReceipts(MultipartFile file) throws IOException {
        log.info("=== INICIANDO PROCESSAMENTO DE RECIBOS ===");
        log.info("Arquivo: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
        
        if (file.isEmpty()) {
            log.error("❌ ARQUIVO ESTÁ VAZIO!");
            throw new IOException("Arquivo está vazio");
        }
        
        if (!"application/pdf".equals(file.getContentType())) {
            log.error("❌ TIPO DE ARQUIVO INVÁLIDO: {}", file.getContentType());
            throw new IOException("Apenas arquivos PDF são aceitos");
        }
        
        List<PaymentReceiptDTO> processedReceipts = new ArrayList<>();
        
        try (InputStream inputStream = file.getInputStream();
             PDDocument document = PDDocument.load(inputStream)) {
            
            int pageCount = document.getNumberOfPages();
            log.info("📄 Arquivo contém {} páginas", pageCount);

            PDFTextStripper stripper = new PDFTextStripper();
            
            for (int pageNum = 0; pageNum < pageCount; pageNum++) {
                log.info("=== PROCESSANDO PÁGINA {} DE {} ===", pageNum + 1, pageCount);
                
                stripper.setStartPage(pageNum + 1);
                stripper.setEndPage(pageNum + 1);
                
                String pageText = stripper.getText(document);
                log.info("📝 Texto extraído da página {}: {} caracteres", pageNum + 1, pageText.length());
                
                // Extrair informações do recibo
                PaymentReceipt receipt = extractReceiptInfo(pageText, pageNum + 1);
                if (receipt != null) {
                    log.info("✅ Recibo extraído da página {}: {}", pageNum + 1, receipt.getEmployeeName());
                    
                    // Salvar o recibo
                    PaymentReceipt savedReceipt = receiptRepository.save(receipt);
                    processedReceipts.add(PaymentReceiptDTO.fromEntity(savedReceipt));
                } else {
                    log.warn("❌ Nenhum recibo extraído da página {}", pageNum + 1);
                }
            }
        } catch (Exception e) {
            log.error("💥 ERRO AO PROCESSAR ARQUIVO PDF: {}", e.getMessage(), e);
            throw new IOException("Erro ao processar arquivo PDF: " + e.getMessage());
        }
        
        log.info("=== PROCESSAMENTO CONCLUÍDO ===");
        log.info("📊 Total de recibos processados: {}", processedReceipts.size());
        
        return processedReceipts;
    }
    
    private PaymentReceipt extractReceiptInfo(String pageText, int pageNumber) {
        try {
            log.info("Extraindo informações do recibo da página {}", pageNumber);
            
            if (pageText == null || pageText.trim().isEmpty()) {
                log.warn("Texto da página {} está vazio", pageNumber);
                return null;
            }
            
            // Extrair nome do funcionário
            String employeeName = extractEmployeeName(pageText);
            if (employeeName == null || employeeName.trim().isEmpty()) {
                log.warn("Nome do funcionário não encontrado na página {}", pageNumber);
                employeeName = "Funcionário_Página_" + pageNumber;
            }
            
            // Extrair valor
            Double amount = extractAmount(pageText);
            
            // Extrair data (mês/ano)
            int[] monthYear = extractMonthYear(pageText);
            int month = monthYear[0];
            int year = monthYear[1];
            
            log.info("Dados extraídos - Nome: {}, Mês: {}, Ano: {}, Valor: {}", 
                    employeeName, month, year, amount);

            // Gerar nome do arquivo
            String fileName = generateReceiptFileName(employeeName, month, year, pageNumber);
            
            // Salvar arquivo PDF individual (opcional - para manter o arquivo original da página)
            String filePath = null;
            try {
                filePath = saveIndividualReceiptPage(pageText, employeeName, month, year, pageNumber, fileName);
                log.info("📁 Arquivo PDF individual salvo: {}", filePath);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível salvar arquivo PDF individual: {}", e.getMessage());
            }

            // Criar objeto PaymentReceipt
            PaymentReceipt receipt = PaymentReceipt.builder()
                    .employeeName(employeeName.trim())
                    .month(month)
                    .year(year)
                    .grossSalary(amount != null ? BigDecimal.valueOf(amount) : BigDecimal.ZERO)
                    .netSalary(amount != null ? BigDecimal.valueOf(amount) : BigDecimal.ZERO)
                    .fileName(fileName)
                    .filePath(filePath)
                    .status(PaymentReceipt.ReceiptStatus.PROCESSED)
                    .paymentDate(LocalDateTime.now())
                    .receiptNumber("REC-" + System.currentTimeMillis())
                    .notes("Recibo extraído automaticamente do PDF - Página " + pageNumber + 
                           (amount != null ? String.format(" - Valor: R$ %.2f", amount) : ""))
                    .build();

            log.info("Recibo criado com sucesso para: {} (Mês: {}, Ano: {}, Valor: {})", 
                    receipt.getEmployeeName(), receipt.getMonth(), receipt.getYear(), receipt.getGrossSalary());
            return receipt;

        } catch (Exception e) {
            log.error("Erro ao extrair informações do recibo na página {}: {}", pageNumber, e.getMessage(), e);
            return null;
        }
    }
    
    private String extractEmployeeName(String text) {
        log.info("=== 🔍 EXTRAÇÃO DE NOME DO FUNCIONÁRIO ===");
        log.info("📝 Tamanho do texto: {} caracteres", text.length());
        
        if (text == null || text.trim().isEmpty()) {
            log.warn("❌ Texto está vazio ou nulo!");
            return null;
        }
        
        // Mostrar primeiros 300 caracteres para debug
        String preview = text.substring(0, Math.min(300, text.length()));
        log.info("🔍 Preview do texto: {}", preview);
        
        String employeeName = null;
        
        // Padrão 1: "Dados da conta a ser creditada" seguido de "Nome: [NOME COMPLETO]"
        java.util.regex.Pattern namePattern1 = java.util.regex.Pattern.compile(
            "Dados\\s+da\\s+conta\\s+a\\s+ser\\s+creditada[\\s\\S]*?Nome\\s*:\\s*([A-ZÀ-ÿ\\s]{3,50})", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher nameMatcher1 = namePattern1.matcher(text);
        if (nameMatcher1.find()) {
            employeeName = nameMatcher1.group(1).trim();
            log.info("✅ Nome encontrado (padrão Itaú creditada): '{}'", employeeName);
        }
        
        // Padrão 2: "Nome: [NOME COMPLETO]" em qualquer lugar
        if (employeeName == null || employeeName.isEmpty()) {
            java.util.regex.Pattern namePattern2 = java.util.regex.Pattern.compile(
                "Nome\\s*:\\s*([A-ZÀ-ÿ\\s]{3,50})", 
                java.util.regex.Pattern.CASE_INSENSITIVE
            );
            java.util.regex.Matcher nameMatcher2 = namePattern2.matcher(text);
            if (nameMatcher2.find()) {
                employeeName = nameMatcher2.group(1).trim();
                log.info("✅ Nome encontrado (padrão genérico): '{}'", employeeName);
            }
        }
        
        // Padrão 3: Buscar por "Favorecido:" ou "Beneficiário:"
        if (employeeName == null || employeeName.isEmpty()) {
            java.util.regex.Pattern namePattern3 = java.util.regex.Pattern.compile(
                "(?:Favorecido|Beneficiário)\\s*:\\s*([A-ZÀ-ÿ\\s]{3,50})", 
                java.util.regex.Pattern.CASE_INSENSITIVE
            );
            java.util.regex.Matcher nameMatcher3 = namePattern3.matcher(text);
            if (nameMatcher3.find()) {
                employeeName = nameMatcher3.group(1).trim();
                log.info("✅ Nome encontrado (padrão favorecido): '{}'", employeeName);
            }
        }
        
        // Padrão 4: Buscar por nomes após "Conta:" ou "Titular:"
        if (employeeName == null || employeeName.isEmpty()) {
            java.util.regex.Pattern namePattern4 = java.util.regex.Pattern.compile(
                "(?:Conta|Titular)\\s*:.*?([A-ZÀ-ÿ]{3,}\\s+[A-ZÀ-ÿ]{3,}(?:\\s+[A-ZÀ-ÿ]{2,})*)", 
                java.util.regex.Pattern.CASE_INSENSITIVE
            );
            java.util.regex.Matcher nameMatcher4 = namePattern4.matcher(text);
            if (nameMatcher4.find()) {
                employeeName = nameMatcher4.group(1).trim();
                log.info("✅ Nome encontrado (padrão titular): '{}'", employeeName);
            }
        }
        
        // Padrão 5: Buscar por sequências que parecem nomes completos (mais flexível)
        if (employeeName == null || employeeName.isEmpty()) {
            java.util.regex.Pattern namePattern5 = java.util.regex.Pattern.compile(
                "([A-ZÀ-ÿ]{3,}\\s+[A-ZÀ-ÿ]{3,}(?:\\s+[A-ZÀ-ÿ]{2,})*)", 
                java.util.regex.Pattern.CASE_INSENSITIVE
            );
            java.util.regex.Matcher nameMatcher5 = namePattern5.matcher(text);
            
            // Procurar por nomes que não sejam palavras comuns
            while (nameMatcher5.find()) {
                String candidateName = nameMatcher5.group(1).trim();
                
                // Filtrar palavras comuns que não são nomes
                if (!isCommonWord(candidateName)) {
                    employeeName = candidateName;
                    log.info("✅ Nome encontrado (padrão flexível): '{}'", employeeName);
                    break;
                }
            }
        }
        
        // Limpar o nome extraído
        if (employeeName != null && !employeeName.trim().isEmpty()) {
            String cleanedName = cleanEmployeeName(employeeName);
            log.info("🧹 Nome limpo: '{}' -> '{}'", employeeName, cleanedName);
            return cleanedName;
        }
        
        log.warn("❌ Nenhum nome de funcionário encontrado no texto");
        return null;
    }
    
    private boolean isCommonWord(String text) {
        String[] commonWords = {
            "VALOR", "BANCO", "ITAU", "CONTA", "AGENCIA", "TRANSFERENCIA", 
            "COMPROVANTE", "OPERACAO", "DADOS", "SISPAG", "SALARIOS",
            "CORRENTE", "DEBITO", "CREDITO", "REAL", "REAIS", "BRASIL",
            "DOCUMENTO", "NUMERO", "DATA", "HORA", "CONTROLE", "AUTENTICACAO"
        };
        
        String upperText = text.toUpperCase();
        for (String word : commonWords) {
            if (upperText.contains(word)) {
                return true;
            }
        }
        
        return false;
    }
    
    private String cleanEmployeeName(String name) {
        if (name == null) return null;
        
        String cleaned = name.trim()
            // Remover palavras comuns que podem estar sendo incluídas incorretamente
            .replaceAll("(?i)\\b(?:valor|funcionario|empregado|colaborador|banco|itau|conta|agencia)\\b", "")
            // Remover números e caracteres especiais
            .replaceAll("[0-9.,\\-/()\\[\\]{}]", "")
            // Múltiplos espaços para um só
            .replaceAll("\\s+", " ")
            .trim()
            .toLowerCase();
        
        // Converter para formato adequado (primeira letra maiúscula de cada palavra)
        String[] words = cleaned.split("\\s+");
        StringBuilder result = new StringBuilder();
        
        for (int i = 0; i < words.length; i++) {
            if (i > 0) result.append(" ");
            if (words[i].length() > 0) {
                result.append(Character.toUpperCase(words[i].charAt(0)));
                if (words[i].length() > 1) {
                    result.append(words[i].substring(1));
                }
            }
        }
        
        return result.toString();
    }
    
    private Double extractAmount(String text) {
        log.info("💰 Extraindo valor monetário do texto...");
        
        Double amount = null;
        
        // Padrão 1: "Valor: R$ [VALOR]" - padrão principal do Itaú
        java.util.regex.Pattern amountPattern1 = java.util.regex.Pattern.compile(
            "Valor\\s*:\\s*R\\$\\s*([\\d.,]+)", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher amountMatcher1 = amountPattern1.matcher(text);
        if (amountMatcher1.find()) {
            String amountStr = amountMatcher1.group(1);
            amount = parseAmount(amountStr);
            if (amount != null) {
                log.info("✅ Valor extraído (padrão Itaú): R$ {:.2f}", amount);
                return amount;
            }
        }
        
        // Padrão 2: "R$ [VALOR]" - padrão alternativo
        java.util.regex.Pattern amountPattern2 = java.util.regex.Pattern.compile(
            "R\\$\\s*([\\d.,]+)", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher amountMatcher2 = amountPattern2.matcher(text);
        if (amountMatcher2.find()) {
            String amountStr = amountMatcher2.group(1);
            amount = parseAmount(amountStr);
            if (amount != null) {
                log.info("✅ Valor extraído (padrão R$): R$ {:.2f}", amount);
                return amount;
            }
        }
        
        // Padrão 3: Procurar por valores monetários em formato brasileiro
        java.util.regex.Pattern amountPattern3 = java.util.regex.Pattern.compile(
            "([\\d]{1,3}(?:\\.[\\d]{3})*,[\\d]{2})", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher amountMatcher3 = amountPattern3.matcher(text);
        if (amountMatcher3.find()) {
            String amountStr = amountMatcher3.group(1);
            amount = parseAmount(amountStr);
            if (amount != null && amount > 100) { // Filtrar valores muito pequenos que podem ser outros números
                log.info("✅ Valor extraído (padrão brasileiro): R$ {:.2f}", amount);
                return amount;
            }
        }
        
        log.warn("⚠️ Nenhum valor monetário encontrado no texto");
        return null;
    }
    
    private Double parseAmount(String amountStr) {
        if (amountStr == null || amountStr.trim().isEmpty()) {
            return null;
        }
        
        try {
            // Tratar formato brasileiro: 1.234,56 -> 1234.56
            String cleanAmount = amountStr.trim();
            
            // Se tem vírgula, assumir que é separador decimal brasileiro
            if (cleanAmount.contains(",")) {
                // Remover pontos (separadores de milhares) e trocar vírgula por ponto
                cleanAmount = cleanAmount.replaceAll("\\.", "").replace(",", ".");
            }
            // Se não tem vírgula mas tem ponto, pode ser formato americano ou separador de milhares
            else if (cleanAmount.contains(".")) {
                // Se tem mais de um ponto ou o último ponto não está nas últimas 3 posições, 
                // assumir que são separadores de milhares
                int lastDotIndex = cleanAmount.lastIndexOf(".");
                if (cleanAmount.indexOf(".") != lastDotIndex || 
                    (cleanAmount.length() - lastDotIndex - 1) != 2) {
                    // Remover todos os pontos (separadores de milhares)
                    cleanAmount = cleanAmount.replaceAll("\\.", "");
                }
            }
            
            double value = Double.parseDouble(cleanAmount);
            log.info("💱 Valor convertido: '{}' -> {:.2f}", amountStr, value);
            return value;
            
        } catch (NumberFormatException e) {
            log.warn("❌ Erro ao converter valor '{}': {}", amountStr, e.getMessage());
            return null;
        }
    }
    
    private int[] extractMonthYear(String text) {
        log.info("📅 Extraindo data do texto...");
        
        // Padrão 1: "Transferência realizada em DD.MM.YYYY às HH:MM:SS" (formato Itaú)
        java.util.regex.Pattern datePattern1 = java.util.regex.Pattern.compile(
            "Transferência\\s+realizada\\s+em\\s+(\\d{2})\\.(\\d{2})\\.(\\d{4})", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher dateMatcher1 = datePattern1.matcher(text);
        if (dateMatcher1.find()) {
            int day = Integer.parseInt(dateMatcher1.group(1));
            int month = Integer.parseInt(dateMatcher1.group(2));
            int year = Integer.parseInt(dateMatcher1.group(3));
            log.info("✅ Data extraída (padrão Itaú): {}/{}/{}", day, month, year);
            return new int[]{month, year};
        }
        
        // Padrão 2: "DD/MM/YYYY" - formato brasileiro comum
        java.util.regex.Pattern datePattern2 = java.util.regex.Pattern.compile(
            "(\\d{2})/(\\d{2})/(\\d{4})", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher dateMatcher2 = datePattern2.matcher(text);
        if (dateMatcher2.find()) {
            int day = Integer.parseInt(dateMatcher2.group(1));
            int month = Integer.parseInt(dateMatcher2.group(2));
            int year = Integer.parseInt(dateMatcher2.group(3));
            log.info("✅ Data extraída (formato brasileiro): {}/{}/{}", day, month, year);
            return new int[]{month, year};
        }
        
        // Padrão 3: "DD.MM.YYYY" - formato com pontos
        java.util.regex.Pattern datePattern3 = java.util.regex.Pattern.compile(
            "(\\d{2})\\.(\\d{2})\\.(\\d{4})", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher dateMatcher3 = datePattern3.matcher(text);
        if (dateMatcher3.find()) {
            int day = Integer.parseInt(dateMatcher3.group(1));
            int month = Integer.parseInt(dateMatcher3.group(2));
            int year = Integer.parseInt(dateMatcher3.group(3));
            log.info("✅ Data extraída (formato pontos): {}/{}/{}", day, month, year);
            return new int[]{month, year};
        }
        
        // Padrão 4: "Data: DD/MM/YYYY"
        java.util.regex.Pattern datePattern4 = java.util.regex.Pattern.compile(
            "Data\\s*:\\s*(\\d{2})/(\\d{2})/(\\d{4})", 
            java.util.regex.Pattern.CASE_INSENSITIVE
        );
        java.util.regex.Matcher dateMatcher4 = datePattern4.matcher(text);
        if (dateMatcher4.find()) {
            int day = Integer.parseInt(dateMatcher4.group(1));
            int month = Integer.parseInt(dateMatcher4.group(2));
            int year = Integer.parseInt(dateMatcher4.group(3));
            log.info("✅ Data extraída (padrão Data:): {}/{}/{}", day, month, year);
            return new int[]{month, year};
        }
        
        // Usar data atual como fallback
        LocalDateTime now = LocalDateTime.now();
        log.warn("⚠️ Data não encontrada, usando data atual: {}/{}", now.getMonthValue(), now.getYear());
        return new int[]{now.getMonthValue(), now.getYear()};
    }
    
    private String generateReceiptFileName(String employeeName, int month, int year, int pageNumber) {
        log.info("🏷️ Gerando nome do arquivo para: '{}'", employeeName);
        
        if (employeeName == null || employeeName.trim().isEmpty()) {
            employeeName = "funcionario_desconhecido";
        }
        
        // Limpar e formatar o nome para uso em arquivo
        String cleanName = employeeName
                // Remover acentos e caracteres especiais
                .replaceAll("[àáâãäåæ]", "a")
                .replaceAll("[èéêë]", "e")
                .replaceAll("[ìíîï]", "i")
                .replaceAll("[òóôõöø]", "o")
                .replaceAll("[ùúûü]", "u")
                .replaceAll("[ýÿ]", "y")
                .replaceAll("[ñ]", "n")
                .replaceAll("[ç]", "c")
                .replaceAll("[ÀÁÂÃÄÅÆ]", "A")
                .replaceAll("[ÈÉÊË]", "E")
                .replaceAll("[ÌÍÎÏ]", "I")
                .replaceAll("[ÒÓÔÕÖØ]", "O")
                .replaceAll("[ÙÚÛÜ]", "U")
                .replaceAll("[ÝŸ]", "Y")
                .replaceAll("[Ñ]", "N")
                .replaceAll("[Ç]", "C")
                // Remover caracteres não alfanuméricos exceto espaços
                .replaceAll("[^a-zA-Z\\s]", "")
                // Converter para minúsculas
                .toLowerCase()
                // Substituir espaços por underscores
                .replaceAll("\\s+", "_")
                // Remover underscores múltiplos
                .replaceAll("_{2,}", "_")
                // Remover underscores no início e fim
                .replaceAll("^_+|_+$", "")
                .trim();
        
        // Se após a limpeza ficou vazio, usar nome genérico
        if (cleanName.isEmpty()) {
            cleanName = "funcionario_pagina_" + pageNumber;
        }
        
        // Limitar o tamanho do nome para evitar nomes de arquivo muito longos
        if (cleanName.length() > 50) {
            cleanName = cleanName.substring(0, 50);
        }
        
        String fileName = String.format("recibo_%s_%02d_%d_pagina_%d.pdf", 
                cleanName, month, year, pageNumber);
        
        log.info("📁 Nome do arquivo gerado: '{}'", fileName);
        return fileName;
    }
    
    private String saveIndividualReceiptPage(String pageText, String employeeName, int month, int year, int pageNumber, String fileName) throws IOException {
        // Criar diretório por mês/ano
        String monthFolder = String.format("%02d_%04d", month, year);
        java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "receipts", monthFolder);
        
        if (!java.nio.file.Files.exists(uploadDir)) {
            java.nio.file.Files.createDirectories(uploadDir);
            log.info("📁 Diretório criado: {}", uploadDir.toAbsolutePath());
        }
        
        java.nio.file.Path filePath = uploadDir.resolve(fileName);
        
        // Criar um PDF simples com os dados extraídos (para referência)
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            
            try (org.apache.pdfbox.pdmodel.PDPageContentStream contentStream = 
                 new org.apache.pdfbox.pdmodel.PDPageContentStream(document, page)) {
                
                contentStream.beginText();
                contentStream.setFont(org.apache.pdfbox.pdmodel.font.PDType1Font.HELVETICA_BOLD, 16);
                contentStream.newLineAtOffset(50, 750);
                contentStream.showText("RECIBO DE PAGAMENTO");
                
                contentStream.setFont(org.apache.pdfbox.pdmodel.font.PDType1Font.HELVETICA, 12);
                contentStream.newLineAtOffset(0, -30);
                contentStream.showText("Funcionário: " + employeeName);
                
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Período: " + String.format("%02d/%04d", month, year));
                
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Página: " + pageNumber);
                
                contentStream.newLineAtOffset(0, -20);
                contentStream.showText("Processado em: " + LocalDateTime.now().format(
                    java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
                
                contentStream.endText();
            }
            
            document.save(filePath.toFile());
            log.info("💾 PDF individual salvo: {}", filePath.toAbsolutePath());
        }
        
        return filePath.toString();
    }
}
