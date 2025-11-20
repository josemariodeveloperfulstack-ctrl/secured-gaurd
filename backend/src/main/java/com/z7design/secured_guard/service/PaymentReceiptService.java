package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreatePaymentReceiptDTO;
import com.z7design.secured_guard.dto.PaymentReceiptDTO;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.model.PaymentReceiptStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

import java.text.Normalizer;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.Employee;

import java.util.Set;
import java.util.HashSet;

@Service
@Transactional
@Slf4j
public class PaymentReceiptService {

    @Autowired
    private PaymentReceiptRepository paymentReceiptRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private CompanyRepository companyRepository;
    
    public PaymentReceiptDTO createPaymentReceipt(CreatePaymentReceiptDTO createDTO) {
        PaymentReceipt paymentReceipt = new PaymentReceipt(
            createDTO.getEmployeeId(),
            createDTO.getEmployeeName(),
            createDTO.getMonth(),
            createDTO.getYear(),
            createDTO.getFileName(),
            createDTO.getFilePath(),
            PaymentReceiptStatus.PENDING
        );
        
        // Definir campos adicionais
        paymentReceipt.setReceiptNumber(createDTO.getReceiptNumber());
        paymentReceipt.setPaymentDate(createDTO.getPaymentDate());
        paymentReceipt.setGrossSalary(createDTO.getGrossSalary());
        paymentReceipt.setNetSalary(createDTO.getNetSalary());
        paymentReceipt.setFileSize(createDTO.getFileSize());
        paymentReceipt.setNotes(createDTO.getNotes());
        paymentReceipt.setCreatedBy(createDTO.getCreatedBy());
        paymentReceipt.setCompanyName(createDTO.getCompanyName());
        paymentReceipt.setCompanyCnpj(createDTO.getCompanyCnpj());
        paymentReceipt.setCompanySigla(createDTO.getCompanySigla());
        if (createDTO.getCompanyId() != null) {
            companyRepository.findById(createDTO.getCompanyId()).ifPresent(paymentReceipt::setCompany);
        }
        
        // Campos bancários
        paymentReceipt.setDebitedAgency(createDTO.getDebitedAgency());
        paymentReceipt.setDebitedAccount(createDTO.getDebitedAccount());
        paymentReceipt.setDebitedName(createDTO.getDebitedName());
        paymentReceipt.setCreditedAgency(createDTO.getCreditedAgency());
        paymentReceipt.setCreditedAccount(createDTO.getCreditedAccount());
        paymentReceipt.setCreditedName(createDTO.getCreditedName());
        paymentReceipt.setControlNumber(createDTO.getControlNumber());
        paymentReceipt.setAuthenticationCode(createDTO.getAuthenticationCode());
        paymentReceipt.setTransferDate(createDTO.getTransferDate());
        paymentReceipt.setTransferTime(createDTO.getTransferTime());
        paymentReceipt.setBankName(createDTO.getBankName());
        paymentReceipt.setTransactionType(createDTO.getTransactionType());
        paymentReceipt.setStatementIdentification(createDTO.getStatementIdentification());

        applyCompanyHierarchy(paymentReceipt);
        
        PaymentReceipt savedReceipt = paymentReceiptRepository.save(paymentReceipt);
        return convertToDTO(savedReceipt);
    }
    
    @Transactional(readOnly = true)
    public List<PaymentReceiptDTO> findAll() {
        return paymentReceiptRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PaymentReceiptDTO> findByUserCpf(String cpf) {
        log.info("🔍 Buscando comprovantes para CPF: {}", cpf);

        String sanitizedCpf = sanitizeCpf(cpf);
        if (sanitizedCpf.isEmpty()) {
            log.warn("⚠️ CPF informado vazio ou inválido. Retornando lista vazia.");
            return List.of();
        }

        Optional<User> userOptional = userRepository.findByUsername(sanitizedCpf);
        Optional<Employee> employeeOptional = employeeRepository.findByDocument(sanitizedCpf);

        UUID userId = userOptional.map(User::getId).orElse(null);
        UUID employeeId = employeeOptional.map(Employee::getId).orElse(null);

        Set<String> normalizedNames = new HashSet<>();
        userOptional.map(User::getName).map(this::normalizeName).ifPresent(normalizedNames::add);
        employeeOptional.map(Employee::getName).map(this::normalizeName).ifPresent(normalizedNames::add);

        List<PaymentReceiptDTO> receipts = paymentReceiptRepository.findAll()
                .stream()
                .filter(receipt -> matchesReceiptForUser(receipt, sanitizedCpf, normalizedNames, userId, employeeId))
                .sorted((r1, r2) -> {
                    int yearCompare = r2.getYear().compareTo(r1.getYear());
                    if (yearCompare != 0) {
                        return yearCompare;
                    }
                    return r2.getMonth().compareTo(r1.getMonth());
                })
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.info("✅ Comprovantes encontrados para CPF {}: {}", cpf, receipts.size());
        return receipts;
    }

    private boolean matchesReceiptForUser(PaymentReceipt receipt, String sanitizedCpf, Set<String> normalizedNames, UUID userId, UUID employeeId) {
        if (receipt == null) {
            return false;
        }

        if (userId != null && receipt.getEmployeeId() != null && receipt.getEmployeeId().equals(userId)) {
            return true;
        }

        if (employeeId != null && receipt.getEmployeeId() != null && receipt.getEmployeeId().equals(employeeId)) {
            return true;
        }

        String receiptFileName = Optional.ofNullable(receipt.getFileName()).orElse("");
        if (!sanitizedCpf.isEmpty() && receiptFileName.contains(sanitizedCpf)) {
            return true;
        }

        String receiptFilePath = Optional.ofNullable(receipt.getFilePath()).orElse("");
        if (!sanitizedCpf.isEmpty() && receiptFilePath.contains(sanitizedCpf)) {
            return true;
        }

        String receiptEmployeeName = Optional.ofNullable(receipt.getEmployeeName()).orElse("");
        String receiptCreditedName = Optional.ofNullable(receipt.getCreditedName()).orElse("");

        String normalizedReceiptEmployeeName = normalizeName(receiptEmployeeName);
        String normalizedReceiptCreditedName = normalizeName(receiptCreditedName);

        if (!normalizedNames.isEmpty()) {
            for (String normalizedName : normalizedNames) {
                if (normalizedName.isEmpty()) {
                    continue;
                }
                if (normalizedName.equals(normalizedReceiptEmployeeName) ||
                        normalizedName.equals(normalizedReceiptCreditedName)) {
                    return true;
                }
                if (!normalizedReceiptEmployeeName.isEmpty() &&
                        (normalizedReceiptEmployeeName.contains(normalizedName) || normalizedName.contains(normalizedReceiptEmployeeName))) {
                    return true;
                }
                if (!normalizedReceiptCreditedName.isEmpty() &&
                        (normalizedReceiptCreditedName.contains(normalizedName) || normalizedName.contains(normalizedReceiptCreditedName))) {
                    return true;
                }
            }
        }

        return false;
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
    
    @Transactional(readOnly = true)
    public List<PaymentReceiptDTO> findByYearAndMonth(Integer year, Integer month) {
        return paymentReceiptRepository.findByYearAndMonth(year, month)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<Integer> findDistinctYears() {
        return paymentReceiptRepository.findDistinctYears();
    }
    
    @Transactional(readOnly = true)
    public List<Integer> findDistinctMonthsByYear(Integer year) {
        return paymentReceiptRepository.findDistinctMonthsByYear(year);
    }
    
    @Transactional(readOnly = true)
    public long count() {
        return paymentReceiptRepository.count();
    }
    
    @Transactional(readOnly = true)
    public long countProcessedToday() {
        return paymentReceiptRepository.countProcessedToday();
    }
    
    @Transactional(readOnly = true)
    public List<PaymentReceiptDTO> findByStatus(PaymentReceiptStatus status) {
        List<PaymentReceipt> receipts = paymentReceiptRepository.findByStatus(status);
        return receipts.stream()
                .map(this::convertToDTO)
                .toList();
    }
    
    @Transactional(readOnly = true)
    public List<PaymentReceiptDTO> findByIds(List<UUID> ids) {
        return paymentReceiptRepository.findByIdIn(ids)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PaymentReceiptDTO> search(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().length() < 4) {
            log.warn("⚠️ Termo de busca muito curto (mínimo 4 caracteres): {}", searchTerm);
            return List.of();
        }
        
        String trimmedSearch = searchTerm.trim();
        String normalizedSearch = normalizeName(trimmedSearch);
        log.info("🔍 Buscando comprovantes com termo: '{}' (normalizado: '{}')", trimmedSearch, normalizedSearch);
        
        List<PaymentReceipt> allReceipts = paymentReceiptRepository.findAll();
        log.info("📊 Total de comprovantes no banco: {}", allReceipts.size());
        
        // Debug: mostrar alguns nomes de comprovantes para verificar
        if (allReceipts.size() > 0 && allReceipts.size() <= 10) {
            log.info("📋 Nomes dos comprovantes no banco:");
            allReceipts.forEach(r -> {
                String name = r.getEmployeeName() != null ? r.getEmployeeName() : "N/A";
                log.info("   - '{}' (normalizado: '{}')", name, normalizeName(name));
            });
        }
        
        List<PaymentReceiptDTO> results = allReceipts.stream()
                .filter(receipt -> {
                    boolean matches = matchesSearchTerm(receipt, normalizedSearch, trimmedSearch);
                    if (matches && receipt.getEmployeeName() != null) {
                        log.debug("✅ Match encontrado: '{}' para busca '{}'", receipt.getEmployeeName(), trimmedSearch);
                    }
                    return matches;
                })
                .sorted((r1, r2) -> {
                    // Ordenar por data de transferência (mais recente primeiro)
                    if (r1.getTransferDate() != null && r2.getTransferDate() != null) {
                        return r2.getTransferDate().compareTo(r1.getTransferDate());
                    }
                    // Se não tiver data, ordenar por ano/mês
                    int yearCompare = r2.getYear().compareTo(r1.getYear());
                    if (yearCompare != 0) {
                        return yearCompare;
                    }
                    return r2.getMonth().compareTo(r1.getMonth());
                })
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        
        log.info("✅ Comprovantes encontrados: {} registros (de {} total)", results.size(), allReceipts.size());
        if (results.isEmpty() && !allReceipts.isEmpty()) {
            log.warn("⚠️ Nenhum comprovante encontrado para '{}'. Verifique se o nome está correto.", trimmedSearch);
        }
        return results;
    }
    
    private boolean matchesSearchTerm(PaymentReceipt receipt, String normalizedSearch, String originalSearch) {
        if (receipt == null) {
            return false;
        }
        
        String originalSearchLower = originalSearch.toLowerCase().trim();
        
        // Buscar por nome do funcionário - MÚLTIPLAS ESTRATÉGIAS
        String employeeName = Optional.ofNullable(receipt.getEmployeeName()).orElse("");
        if (!employeeName.isEmpty()) {
            String employeeNameLower = employeeName.toLowerCase();
            String normalizedEmployeeName = normalizeName(employeeName);
            
            // Estratégia 1: Busca normalizada (sem acentos, sem espaços)
            if (normalizedEmployeeName.contains(normalizedSearch) || 
                normalizedSearch.contains(normalizedEmployeeName)) {
                return true;
            }
            
            // Estratégia 2: Busca case-insensitive simples
            if (employeeNameLower.contains(originalSearchLower)) {
                return true;
            }
            
            // Estratégia 3: Busca por palavras individuais (se o termo de busca tiver múltiplas palavras)
            String[] searchWords = originalSearchLower.split("\\s+");
            if (searchWords.length > 1) {
                boolean allWordsMatch = true;
                for (String word : searchWords) {
                    if (word.length() >= 3 && !employeeNameLower.contains(word)) {
                        allWordsMatch = false;
                        break;
                    }
                }
                if (allWordsMatch) {
                    return true;
                }
            }
            
            // Estratégia 4: Busca por primeiro e último nome
            String[] employeeNameParts = employeeNameLower.split("\\s+");
            String[] searchParts = originalSearchLower.split("\\s+");
            if (employeeNameParts.length >= 2 && searchParts.length >= 2) {
                String employeeFirst = employeeNameParts[0];
                String employeeLast = employeeNameParts[employeeNameParts.length - 1];
                String searchFirst = searchParts[0];
                String searchLast = searchParts[searchParts.length - 1];
                
                if (employeeFirst.contains(searchFirst) && employeeLast.contains(searchLast)) {
                    return true;
                }
                if (searchFirst.contains(employeeFirst) && searchLast.contains(employeeLast)) {
                    return true;
                }
            }
            
            // Estratégia 5: Busca considerando abreviações de nomes do meio (1-3 caracteres)
            // Ex: "SILVANA FERREIRA S HONORATO" vs "SILVANA FERREIRA SELVO HONORATO"
            if (employeeNameParts.length >= 3 && searchParts.length >= 3) {
                // Verificar primeiro e último nome
                String employeeFirst = employeeNameParts[0];
                String employeeLast = employeeNameParts[employeeNameParts.length - 1];
                String searchFirst = searchParts[0];
                String searchLast = searchParts[searchParts.length - 1];
                
                boolean firstMatches = employeeFirst.contains(searchFirst) || searchFirst.contains(employeeFirst);
                boolean lastMatches = employeeLast.contains(searchLast) || searchLast.contains(employeeLast);
                
                if (firstMatches && lastMatches) {
                    // Verificar nomes do meio considerando abreviações
                    List<String> employeeMiddle = new ArrayList<>();
                    List<String> searchMiddle = new ArrayList<>();
                    
                    for (int i = 1; i < employeeNameParts.length - 1; i++) {
                        employeeMiddle.add(employeeNameParts[i]);
                    }
                    for (int i = 1; i < searchParts.length - 1; i++) {
                        searchMiddle.add(searchParts[i]);
                    }
                    
                    // Verificar se as abreviações correspondem
                    boolean middleMatches = checkMiddleNamesWithAbbreviations(employeeMiddle, searchMiddle);
                    if (middleMatches) {
                        return true;
                    }
                }
            }
        }
        
        // Buscar por empresa
        String companyName = Optional.ofNullable(receipt.getCompanyName()).orElse("");
        if (!companyName.isEmpty()) {
            String normalizedCompanyName = normalizeName(companyName);
            if (normalizedCompanyName.contains(normalizedSearch) || 
                companyName.toLowerCase().contains(originalSearchLower)) {
                return true;
            }
        }
        
        // Buscar por CNPJ da empresa
        String companyCnpj = Optional.ofNullable(receipt.getCompanyCnpj()).orElse("");
        if (!companyCnpj.isEmpty()) {
            String cnpjDigits = companyCnpj.replaceAll("\\D", "");
            String searchDigits = originalSearch.replaceAll("\\D", "");
            if (!searchDigits.isEmpty() && cnpjDigits.contains(searchDigits)) {
                return true;
            }
        }
        
        // Buscar por data (transferDate é String)
        if (receipt.getTransferDate() != null) {
            String dateStr = receipt.getTransferDate().toLowerCase();
            if (dateStr.contains(originalSearchLower)) {
                return true;
            }
        }
        
        // Buscar por mês/ano (formato MM/YYYY ou MM-YYYY)
        String monthYear1 = String.format("%02d/%d", receipt.getMonth(), receipt.getYear());
        String monthYear2 = String.format("%02d-%d", receipt.getMonth(), receipt.getYear());
        if (monthYear1.contains(originalSearch) || monthYear2.contains(originalSearch)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Verifica se os nomes do meio correspondem, considerando abreviações (1-3 caracteres)
     */
    private boolean checkMiddleNamesWithAbbreviations(List<String> middle1, List<String> middle2) {
        if (middle1.isEmpty() && middle2.isEmpty()) {
            return true;
        }
        
        // Se um não tem nomes do meio e o outro tem, verificar se são abreviações
        if (middle1.isEmpty() || middle2.isEmpty()) {
            return false; // Se um tem e outro não, não é match
        }
        
        // Comparar palavra por palavra considerando abreviações
        for (String w1 : middle1) {
            boolean found = false;
            for (String w2 : middle2) {
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
        for (String w2 : middle2) {
            boolean found = false;
            for (String w1 : middle1) {
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
     * Verifica se uma palavra corresponde a outra, considerando abreviações (1-3 caracteres)
     */
    private boolean wordsMatchWithAbbreviation(String word1, String word2) {
        if (word1.equals(word2)) {
            return true;
        }
        
        // Se uma palavra tem 1-3 caracteres, pode ser abreviação da outra
        if (word1.length() >= 1 && word1.length() <= 3 && word2.length() > word1.length()) {
            // word1 é abreviação? Verificar se word2 começa com word1
            if (word2.toLowerCase().startsWith(word1.toLowerCase())) {
                return true;
            }
        }
        if (word2.length() >= 1 && word2.length() <= 3 && word1.length() > word2.length()) {
            // word2 é abreviação? Verificar se word1 começa com word2
            if (word1.toLowerCase().startsWith(word2.toLowerCase())) {
                return true;
            }
        }
        
        // Verificar se uma contém a outra (para casos como "FERREIRA" vs "FERREIRA")
        if (word1.length() >= 3 && word2.length() >= 3) {
            return word1.toLowerCase().contains(word2.toLowerCase()) || 
                   word2.toLowerCase().contains(word1.toLowerCase());
        }
        
        return false;
    }

    @Transactional
    public PaymentReceiptDTO processUploadedFile(MultipartFile file, String employeeName, Integer month, Integer year) {
        try {
            // Validar arquivo
        if (file.isEmpty()) {
                throw new IllegalArgumentException("Arquivo não pode estar vazio");
            }
            
            if (!file.getContentType().equals("application/pdf")) {
                throw new IllegalArgumentException("Apenas arquivos PDF são aceitos");
            }
            
            // Criar diretório de upload se não existir
            String uploadDir = "uploads/payment-receipts/" + year + "/" + month;
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Gerar nome único para o arquivo
            String originalFileName = file.getOriginalFilename();
            String fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String uniqueFileName = employeeName.toLowerCase().replaceAll("\\s+", "_") + "_" + 
                                  year + "_" + month + "_" + System.currentTimeMillis() + fileExtension;
            
            // Salvar arquivo
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Derivar mês/ano da pasta do caminho quando não fornecido corretamente
            if (month == null || year == null) {
                try {
                    // uploads/payment-receipts/{year}/{month}
                    String[] parts = uploadDir.replace('\\', '/').split("/");
                    int len = parts.length;
                    int derivedYear = Integer.parseInt(parts[len - 2]);
                    int derivedMonth = Integer.parseInt(parts[len - 1]);
                    month = derivedMonth;
                    year = derivedYear;
                } catch (Exception ignored) {}
            }

            // Criar registro no banco
            PaymentReceipt paymentReceipt = new PaymentReceipt();
            paymentReceipt.setEmployeeName(employeeName);
            paymentReceipt.setMonth(month);
            paymentReceipt.setYear(year);
            paymentReceipt.setFileName(uniqueFileName);
            paymentReceipt.setFilePath(filePath.toString());
            paymentReceipt.setFileSize(file.getSize());
            paymentReceipt.setStatus(PaymentReceiptStatus.PENDING);
            paymentReceipt.setCompanyName(paymentReceipt.getDebitedName());
            paymentReceipt.setCompanySigla(null);
            paymentReceipt.setCompanyCnpj(null);

            // Ajustar datas: usar primeiro dia do mês/ano da pasta
            try {
                // Armazenar apenas MM/AAAA
                String normalizedTransferDate = String.format("%02d/%04d", month, year);
                paymentReceipt.setTransferDate(normalizedTransferDate);
                paymentReceipt.setTransferTime(null);
            } catch (Exception e) {
                // ignore e deixe para etapa de processamento
            }
            
            // Salvar no banco
            PaymentReceipt savedReceipt = paymentReceiptRepository.save(paymentReceipt);
            
            // TODO: Implementar processamento de PDF para extrair dados bancários
            // Por enquanto, marcar como processado
            savedReceipt.setStatus(PaymentReceiptStatus.PROCESSED);
            savedReceipt.setNetSalary(java.math.BigDecimal.ZERO); // Será preenchido após processamento
            savedReceipt.setGrossSalary(java.math.BigDecimal.ZERO);
            applyCompanyHierarchy(savedReceipt);
            
            PaymentReceipt finalReceipt = paymentReceiptRepository.save(savedReceipt);
            
            return convertToDTO(finalReceipt);
            
        } catch (IOException e) {
            throw new RuntimeException("Erro ao processar arquivo: " + e.getMessage(), e);
        }
    }
    
    public void deletePaymentReceipt(UUID id) {
        paymentReceiptRepository.deleteById(id);
    }
    
    public ResponseEntity<byte[]> downloadReceiptFile(String id) {
        try {
            UUID receiptId = UUID.fromString(id);
            Optional<PaymentReceipt> receiptOpt = paymentReceiptRepository.findById(receiptId);
            
            if (receiptOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            PaymentReceipt receipt = receiptOpt.get();
            Path filePath = Paths.get(receipt.getFilePath());
            
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }
            
            byte[] fileContent = Files.readAllBytes(filePath);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", receipt.getFileName());
            headers.setContentLength(fileContent.length);
            
            return new ResponseEntity<>(fileContent, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    public ResponseEntity<byte[]> viewReceiptFile(String id) {
        try {
            UUID receiptId = UUID.fromString(id);
            Optional<PaymentReceipt> receiptOpt = paymentReceiptRepository.findById(receiptId);
            
            if (receiptOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            PaymentReceipt receipt = receiptOpt.get();
            Path filePath = Paths.get(receipt.getFilePath());
            
            if (!Files.exists(filePath)) {
                log.warn("Arquivo não encontrado: {}", filePath);
                return ResponseEntity.notFound().build();
            }
            
            byte[] fileContent = Files.readAllBytes(filePath);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", receipt.getFileName());
            headers.setContentLength(fileContent.length);
            headers.setCacheControl("no-cache, no-store, must-revalidate");
            headers.setPragma("no-cache");
            headers.setExpires(0);
            
            return new ResponseEntity<>(fileContent, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            log.error("Erro ao visualizar arquivo: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    private PaymentReceiptDTO convertToDTO(PaymentReceipt paymentReceipt) {
        PaymentReceiptDTO dto = new PaymentReceiptDTO();
        dto.setId(paymentReceipt.getId());
        dto.setEmployeeId(paymentReceipt.getEmployeeId());
        dto.setEmployeeName(paymentReceipt.getEmployeeName());
        dto.setCompanyId(paymentReceipt.getCompanyId());
        dto.setCompanyName(paymentReceipt.getCompanyName());
        dto.setCompanyCnpj(paymentReceipt.getCompanyCnpj());
        dto.setCompanySigla(paymentReceipt.getCompanySigla());
        dto.setMonth(paymentReceipt.getMonth());
        dto.setYear(paymentReceipt.getYear());
        dto.setReceiptNumber(paymentReceipt.getReceiptNumber());
        dto.setPaymentDate(paymentReceipt.getPaymentDate());
        dto.setGrossSalary(paymentReceipt.getGrossSalary());
        dto.setNetSalary(paymentReceipt.getNetSalary());
        dto.setFilePath(paymentReceipt.getFilePath());
        dto.setFileName(paymentReceipt.getFileName());
        dto.setFileSize(paymentReceipt.getFileSize());
        dto.setStatus(paymentReceipt.getStatus());
        dto.setNotes(paymentReceipt.getNotes());
        dto.setCreatedAt(paymentReceipt.getCreatedAt());
        dto.setUpdatedAt(paymentReceipt.getUpdatedAt());
        dto.setProcessedAt(paymentReceipt.getProcessedAt());
        dto.setCreatedBy(paymentReceipt.getCreatedBy());
        dto.setUpdatedBy(paymentReceipt.getUpdatedBy());
        
        // Campos bancários
        dto.setDebitedAgency(paymentReceipt.getDebitedAgency());
        dto.setDebitedAccount(paymentReceipt.getDebitedAccount());
        dto.setDebitedName(paymentReceipt.getDebitedName());
        dto.setCreditedAgency(paymentReceipt.getCreditedAgency());
        dto.setCreditedAccount(paymentReceipt.getCreditedAccount());
        dto.setCreditedName(paymentReceipt.getCreditedName());
        dto.setControlNumber(paymentReceipt.getControlNumber());
        dto.setAuthenticationCode(paymentReceipt.getAuthenticationCode());
        dto.setTransferDate(paymentReceipt.getTransferDate());
        dto.setTransferTime(paymentReceipt.getTransferTime());
        dto.setBankName(paymentReceipt.getBankName());
        dto.setTransactionType(paymentReceipt.getTransactionType());
        dto.setStatementIdentification(paymentReceipt.getStatementIdentification());
        
        return dto;
    }

    public void applyCompanyHierarchy(PaymentReceipt paymentReceipt) {
        if (paymentReceipt == null) {
            return;
        }

        if (!hasText(paymentReceipt.getCompanyName()) && hasText(paymentReceipt.getDebitedName())) {
            paymentReceipt.setCompanyName(paymentReceipt.getDebitedName());
        }

        String normalizedCnpj = normalizeCnpj(paymentReceipt.getCompanyCnpj());
        if (normalizedCnpj != null) {
            paymentReceipt.setCompanyCnpj(normalizedCnpj);
            companyRepository.findByNormalizedCnpj(normalizedCnpj).ifPresent(company -> applyCompanyLink(paymentReceipt, company));
        }

        if (paymentReceipt.getCompany() == null && hasText(paymentReceipt.getCompanySigla())) {
            companyRepository.findFirstBySiglaIgnoreCase(paymentReceipt.getCompanySigla().trim())
                    .ifPresent(company -> applyCompanyLink(paymentReceipt, company));
        }

        if (paymentReceipt.getCompany() == null && hasText(paymentReceipt.getCompanyName())) {
            String normalizedName = normalizeText(paymentReceipt.getCompanyName());
            companyRepository.findByNormalizedName(normalizedName)
                    .ifPresent(company -> applyCompanyLink(paymentReceipt, company));
        }
    }

    private void applyCompanyLink(PaymentReceipt receipt, Company company) {
        receipt.setCompany(company);
        if (!hasText(receipt.getCompanyName())) {
            receipt.setCompanyName(company.getName());
        }
        receipt.setCompanySigla(company.getSigla());
        String normalizedCompanyCnpj = normalizeCnpj(company.getCnpj());
        if (normalizedCompanyCnpj != null) {
            receipt.setCompanyCnpj(normalizedCompanyCnpj);
        }
    }

    private String normalizeCnpj(String cnpj) {
        if (!hasText(cnpj)) {
            return null;
        }
        String digits = cnpj.replaceAll("\\D", "");
        return digits.length() == 14 ? digits : digits;
    }

    private String normalizeText(String value) {
        if (!hasText(value)) {
            return null;
        }
        String noAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccents.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
    
    // Excluir comprovante por ID
    public void deleteById(String id) {
        try {
            UUID receiptId = UUID.fromString(id);
            Optional<PaymentReceipt> receiptOpt = paymentReceiptRepository.findById(receiptId);
            
            if (receiptOpt.isPresent()) {
                PaymentReceipt receipt = receiptOpt.get();
                
                // Excluir arquivo físico se existir
                if (receipt.getFilePath() != null) {
                    try {
                        Path filePath = Paths.get(receipt.getFilePath());
                        if (Files.exists(filePath)) {
                            Files.delete(filePath);
                            log.info("Arquivo físico excluído: {}", filePath);
                        }
                    } catch (Exception e) {
                        log.warn("Erro ao excluir arquivo físico: {}", e.getMessage());
                    }
                }
                
                // Excluir do banco de dados
                paymentReceiptRepository.deleteById(receiptId);
                log.info("Comprovante excluído do banco: {}", id);
            } else {
                log.warn("Comprovante não encontrado para exclusão: {}", id);
            }
        } catch (Exception e) {
            log.error("Erro ao excluir comprovante: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao excluir comprovante", e);
        }
    }
    
    // Excluir múltiplos comprovantes
    public Map<String, Object> deleteMultiplePaymentReceipts(List<String> ids) {
        Map<String, Object> result = new HashMap<>();
        int deleted = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();
        
        for (String id : ids) {
            try {
                deleteById(id);
                deleted++;
                log.info("Comprovante excluído com sucesso: {}", id);
            } catch (Exception e) {
                failed++;
                String error = "Erro ao excluir comprovante " + id + ": " + e.getMessage();
                errors.add(error);
                log.error(error, e);
            }
        }
        
        result.put("deleted", deleted);
        result.put("failed", failed);
        result.put("errors", errors);
        
        log.info("Exclusão múltipla concluída: {} excluídos, {} falharam", deleted, failed);
        return result;
    }
}
