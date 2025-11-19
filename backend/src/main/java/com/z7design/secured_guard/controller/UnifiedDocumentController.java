package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.UnifiedDocumentService;
import com.z7design.secured_guard.service.EmailService;
import com.z7design.secured_guard.service.WhatsAppService;
import com.z7design.secured_guard.service.PayslipService;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.util.AuthenticatedCpfResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

@RestController
@RequestMapping("/api/unified-documents")
@RequiredArgsConstructor
@Slf4j
public class UnifiedDocumentController {

    private final UnifiedDocumentService unifiedDocumentService;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final PayslipService payslipService;
    private final PaymentReceiptRepository paymentReceiptRepository;
    private final AuthenticatedCpfResolver authenticatedCpfResolver;

    private static final Pattern CPF_PATTERN = Pattern.compile("(\\d{11})");

    /**
     * Cria documento unificado para um funcionário específico
     */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createUnifiedDocument(
            @RequestParam String employeeName,
            @RequestParam int month,
            @RequestParam int year) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🎯 Criando documento unificado para: {} - {}/{}", employeeName, month, year);
            
            String unifiedPdfPath = unifiedDocumentService.createUnifiedDocumentForEmployee(employeeName, month, year);
            
            response.put("sucesso", true);
            response.put("mensagem", "Documento unificado criado com sucesso");
            response.put("filePath", unifiedPdfPath);
            response.put("employeeName", employeeName);
            response.put("month", month);
            response.put("year", year);
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            log.error("💥 Erro de I/O ao criar documento unificado: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            response.put("detalhes", e.getMessage());
            // Retornar 400 (Bad Request) para erros de arquivo não encontrado
            if (e.getMessage() != null && (e.getMessage().contains("não encontrado") || e.getMessage().contains("not found"))) {
                return ResponseEntity.badRequest().body(response);
            }
            return ResponseEntity.internalServerError().body(response);
        } catch (Exception e) {
            log.error("💥 Erro inesperado ao criar documento unificado: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao criar documento unificado: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            response.put("detalhes", e.getMessage());
            if (e.getCause() != null) {
                response.put("causa", e.getCause().getMessage());
            }
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Debug: Lista todos os holerites e comprovantes para diagnóstico
     */
    @GetMapping("/debug-data")
    public ResponseEntity<Map<String, Object>> debugUnificationData(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🔍 DEBUG: Listando dados para diagnóstico - Mês: {}, Ano: {}", month, year);
            
            // 1. Listar todos os holerites
            List<Payslip> allPayslips = payslipService.getAllPayslips();
            log.info("📊 Total de holerites: {}", allPayslips.size());
            
            // 2. Listar todos os comprovantes
            List<PaymentReceipt> allReceipts = paymentReceiptRepository.findAll();
            log.info("📊 Total de comprovantes: {}", allReceipts.size());
            
            // 3. Filtrar por período se especificado
            List<Payslip> filteredPayslips = allPayslips;
            List<PaymentReceipt> filteredReceipts = allReceipts;
            
            if (month != null || year != null) {
                filteredPayslips = allPayslips.stream()
                    .filter(p -> month == null || p.getMonth().equals(month))
                    .filter(p -> year == null || p.getYear().equals(year))
                    .collect(Collectors.toList());
                    
                filteredReceipts = allReceipts.stream()
                    .filter(r -> month == null || r.getMonth() != null && r.getMonth().equals(month))
                    .filter(r -> year == null || r.getYear() != null && r.getYear().equals(year))
                    .collect(Collectors.toList());
            }
            
            // 4. Preparar resposta
            response.put("sucesso", true);
            response.put("totalHolerites", allPayslips.size());
            response.put("totalReceipts", allReceipts.size());
            response.put("filteredHolerites", filteredPayslips.size());
            response.put("filteredReceipts", filteredReceipts.size());
            
            // 5. Listar nomes únicos para comparação
            Set<String> payslipNames = filteredPayslips.stream()
                .map(Payslip::getEmployeeName)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
                
            Set<String> receiptNames = filteredReceipts.stream()
                .map(PaymentReceipt::getEmployeeName)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
            
            response.put("payslipNames", payslipNames);
            response.put("receiptNames", receiptNames);
            
            // 6. Encontrar nomes que existem em ambos
            Set<String> commonNames = payslipNames.stream()
                .filter(receiptNames::contains)
                .collect(Collectors.toSet());
                
            response.put("commonNames", commonNames);
            response.put("commonNamesCount", commonNames.size());
            
            // 7. Listar detalhes dos primeiros 10 de cada
            List<Map<String, Object>> payslipDetails = filteredPayslips.stream()
                .limit(10)
                .map(p -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", p.getId());
                    detail.put("employeeName", p.getEmployeeName());
                    detail.put("month", p.getMonth());
                    detail.put("year", p.getYear());
                    detail.put("fileName", p.getFileName());
                    return detail;
                })
                .collect(Collectors.toList());
                
            List<Map<String, Object>> receiptDetails = filteredReceipts.stream()
                .limit(10)
                .map(r -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", r.getId());
                    detail.put("employeeName", r.getEmployeeName());
                    detail.put("month", r.getMonth());
                    detail.put("year", r.getYear());
                    detail.put("fileName", r.getFileName());
                    return detail;
                })
                .collect(Collectors.toList());
            
            response.put("samplePayslips", payslipDetails);
            response.put("sampleReceipts", receiptDetails);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no debug de dados: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao obter dados de debug: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Testa conexão e status do serviço
     */
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testUnifiedDocument() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🧪 Testando conexão do serviço de documentos unificados...");
            
            // Teste simples de conectividade
            response.put("sucesso", true);
            response.put("mensagem", "Serviço de documentos unificados está funcionando");
            response.put("timestamp", System.currentTimeMillis());
            response.put("status", "OK");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no teste de conectividade: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro no teste: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Testa criação real de documento unificado usando dados existentes
     */
    @PostMapping("/test-create")
    public ResponseEntity<Map<String, Object>> testCreateUnifiedDocument(
            @RequestParam(required = false) String employeeName,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🧪 Testando criação de documento unificado...");
            
            // Se não foram fornecidos parâmetros, buscar um holerite existente
            if (employeeName == null || month == null || year == null) {
                log.info("🔍 Buscando holerite existente para teste...");
                
                // Buscar um holerite existente
                List<Payslip> existingPayslips = payslipService.getAllPayslips();
                
                if (existingPayslips.isEmpty()) {
                    response.put("sucesso", false);
                    response.put("mensagem", "Nenhum holerite encontrado no sistema para teste");
                    response.put("sugestao", "Importe alguns holerites primeiro");
                    return ResponseEntity.ok(response);
                }
                
                // Usar o primeiro holerite encontrado
                Payslip firstPayslip = existingPayslips.get(0);
                employeeName = firstPayslip.getEmployeeName();
                month = firstPayslip.getMonth();
                year = firstPayslip.getYear();
                
                log.info("📋 Usando holerite existente para teste: {} - {}/{}", employeeName, month, year);
            }
            
            log.info("🧪 Testando criação de documento unificado para: {} - {}/{}", employeeName, month, year);
            
            String unifiedPdfPath = unifiedDocumentService.createUnifiedDocumentForEmployee(employeeName, month, year);
            
            response.put("sucesso", true);
            response.put("mensagem", "Teste de documento unificado realizado com sucesso");
            response.put("filePath", unifiedPdfPath);
            response.put("employeeName", employeeName);
            response.put("month", month);
            response.put("year", year);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no teste de criação de documento unificado: {}", e.getMessage(), e);
            response.put("sucesso", false);
            
            // Extrair informações da mensagem de erro
            String errorMessage = e.getMessage();
            if (errorMessage != null && errorMessage.contains("COMPROVANTE NÃO ENCONTRADO")) {
                // Parsear a mensagem estruturada
                String[] lines = errorMessage.split("\n");
                String errorEmployeeName = "";
                String holeritePeriod = "";
                String receiptPeriod = "";
                
                for (String line : lines) {
                    if (line.startsWith("Funcionário: ")) {
                        errorEmployeeName = line.replace("Funcionário: ", "").trim();
                    } else if (line.startsWith("Período do Holerite: ")) {
                        holeritePeriod = line.replace("Período do Holerite: ", "").trim();
                    } else if (line.startsWith("Período do Comprovante: ")) {
                        receiptPeriod = line.replace("Período do Comprovante: ", "").split("\\(")[0].trim();
                    }
                }
                
                response.put("mensagem", "Comprovante de Pagamento Não Encontrado");
                response.put("tipoErro", "COMPROVANTE_NAO_ENCONTRADO");
                response.put("funcionario", errorEmployeeName);
                response.put("periodoHolerite", holeritePeriod);
                response.put("periodoComprovante", receiptPeriod);
                response.put("acao", "Por favor, importe apenas o comprovante de pagamento que está faltando.");
                response.put("detalhes", errorMessage);
            } else {
                response.put("mensagem", "Erro no teste: " + errorMessage);
                response.put("erro", e.getClass().getSimpleName());
                
                // Se for erro de dados não encontrados, sugerir usar dados existentes
                if (errorMessage != null && errorMessage.contains("não encontrado")) {
                    response.put("sugestao", "Use o botão 'Analisar Dados' para ver quais holerites existem no sistema");
                }
            }
            
            return ResponseEntity.ok(response); // Retornar 200 com erro para mostrar a mensagem
        }
    }

    /**
     * Endpoint público para teste
     */
    @GetMapping("/public/test")
    public ResponseEntity<Map<String, Object>> testUnifiedDocumentPublic() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🌐 Teste público de documento unificado...");
            
            // Teste com dados mock
            String unifiedPdfPath = unifiedDocumentService.createUnifiedDocumentForEmployee("TESTE FUNCIONARIO", 7, 2025);
            
            response.put("sucesso", true);
            response.put("mensagem", "Teste público realizado com sucesso");
            response.put("filePath", unifiedPdfPath);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no teste público: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro no teste público: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Lista documentos unificados - endpoint público para debug
     */
    @GetMapping("/public/list")
    public ResponseEntity<Map<String, Object>> listUnifiedDocumentsPublic() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📋 Listando documentos unificados (público)...");
            
            List<Map<String, Object>> documents = unifiedDocumentService.listAllUnifiedDocuments();
            
            response.put("sucesso", true);
            response.put("mensagem", "Documentos unificados listados com sucesso");
            response.put("documents", documents);
            response.put("total", documents.size());
            
            log.info("✅ Encontrados {} documentos unificados", documents.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao listar documentos unificados: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao listar documentos unificados: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Endpoint de debug para listar arquivos disponíveis
     */
    @GetMapping("/public/debug/list-files")
    public ResponseEntity<Map<String, Object>> listAvailableFiles() {
        Map<String, Object> response = new HashMap<>();
        try {
            Path basePath = Paths.get("uploads", "unified");
            log.info("📁 Listando arquivos em: {}", basePath.toAbsolutePath());
            
            response.put("basePath", basePath.toAbsolutePath().toString());
            response.put("exists", Files.exists(basePath));
            
            if (Files.exists(basePath)) {
                List<String> files = Files.walk(basePath)
                    .filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .collect(java.util.stream.Collectors.toList());
                response.put("files", files);
                response.put("totalFiles", files.size());
            } else {
                response.put("files", new ArrayList<>());
                response.put("totalFiles", 0);
                response.put("error", "Diretório não existe");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Endpoint público para servir arquivos PDF de documentos unificados
     */
    @GetMapping("/public/file/{fileName:.+}")
    public ResponseEntity<Resource> serveUnifiedDocumentFile(@PathVariable String fileName) {
        try {
            log.info("📄 Servindo arquivo público: {}", fileName);
            
            // Procurar o arquivo recursivamente nas subpastas
            Path basePath = Paths.get("uploads", "unified");
            log.info("🔍 Procurando arquivo em: {}", basePath.toAbsolutePath());
            log.info("🔍 Nome do arquivo: {}", fileName);
            
            Path filePath = findFileRecursively(basePath, fileName);
            
            if (filePath == null) {
                log.error("❌ Arquivo não encontrado: {} no diretório: {}", fileName, basePath.toAbsolutePath());
                
                // Tentar listar arquivos disponíveis para debug
                try {
                    List<String> availableFiles = Files.walk(basePath)
                        .filter(Files::isRegularFile)
                        .map(p -> p.getFileName().toString())
                        .collect(java.util.stream.Collectors.toList());
                    log.error("📁 Arquivos disponíveis: {}", availableFiles);
                } catch (IOException e) {
                    log.error("💥 Erro ao listar arquivos: {}", e.getMessage());
                }
                
                return ResponseEntity.notFound().build();
            }
            
            log.info("✅ Arquivo encontrado em: {}", filePath);
            
            // Verificar se é um arquivo PDF
            if (!fileName.toLowerCase().endsWith(".pdf")) {
                log.warn("⚠️ Tipo de arquivo não permitido: {}", fileName);
                return ResponseEntity.badRequest().build();
            }
            
            // Criar recurso do arquivo
            Resource resource = new FileSystemResource(filePath.toFile());
            
            // Configurar headers para download/visualização
            return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "inline; filename=\"" + fileName + "\"")
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                .header("Access-Control-Allow-Headers", "*")
                .header("X-Frame-Options", "ALLOWALL")
                .header("X-Content-Type-Options", "nosniff")
                .header("Cache-Control", "no-cache, no-store, must-revalidate")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .body(resource);
                
        } catch (Exception e) {
            log.error("💥 Erro ao servir arquivo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/view/{fileName:.+}")
    public ResponseEntity<Resource> viewUnifiedDocument(@PathVariable String fileName) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));

            if (isColaborador) {
                Optional<String> resolvedCpf = authenticatedCpfResolver.resolve(auth);
                Optional<String> fileCpf = extractCpfFromFileName(fileName);
                if (resolvedCpf.isEmpty() || fileCpf.isEmpty() || !resolvedCpf.get().equals(fileCpf.get())) {
                    log.warn("⚠️ Colaborador {} sem permissão para visualizar documento {}", auth.getName(), fileName);
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }

            Path basePath = Paths.get("uploads", "unified");
            Path filePath = findFileRecursively(basePath, fileName);

            if (filePath == null) {
                log.warn("⚠️ Documento unificado não encontrado: {}", fileName);
                return ResponseEntity.notFound().build();
            }

            Resource resource = new FileSystemResource(filePath.toFile());
            if (!resource.exists()) {
                log.warn("⚠️ Recurso não encontrado no caminho: {}", filePath);
                return ResponseEntity.notFound().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", fileName);
            headers.setCacheControl("no-cache, no-store, must-revalidate");
            headers.setPragma("no-cache");
            headers.setExpires(0);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);
        } catch (Exception e) {
            log.error("💥 Erro ao visualizar documento unificado {}: {}", fileName, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Endpoint alternativo para download de arquivos unificados
     */
    @GetMapping("/download/{fileName:.+}")
    public ResponseEntity<Resource> downloadUnifiedDocument(@PathVariable String fileName) {
        try {
            log.info("📥 Download de arquivo: {}", fileName);
            
            // Procurar o arquivo recursivamente nas subpastas
            Path basePath = Paths.get("uploads", "unified");
            Path filePath = findFileRecursively(basePath, fileName);
            
            if (filePath == null) {
                log.warn("⚠️ Arquivo não encontrado para download: {}", fileName);
                return ResponseEntity.notFound().build();
            }
            
            log.info("✅ Arquivo encontrado para download em: {}", filePath);
            
            // Verificar se é um arquivo PDF
            if (!fileName.toLowerCase().endsWith(".pdf")) {
                log.warn("⚠️ Tipo de arquivo não permitido para download: {}", fileName);
                return ResponseEntity.badRequest().build();
            }
            
            // Criar recurso do arquivo
            Resource resource = new FileSystemResource(filePath.toFile());
            
            // Configurar headers para download forçado
            return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                .header("Access-Control-Allow-Headers", "*")
                .header("X-Frame-Options", "ALLOWALL")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
                
        } catch (Exception e) {
            log.error("💥 Erro ao fazer download do arquivo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
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
            
            // Procurar diretamente no diretório base
            Path directPath = basePath.resolve(fileName);
            if (Files.exists(directPath)) {
                return directPath;
            }
            
            // Procurar recursivamente nas subpastas
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

    private Optional<String> extractCpfFromFileName(String fileName) {
        if (fileName == null) {
            return Optional.empty();
        }

        Matcher matcher = CPF_PATTERN.matcher(fileName);
        if (matcher.find()) {
            return Optional.of(matcher.group(1));
        }

        return Optional.empty();
    }

    /**
     * Envia documento unificado por email
     */
    @PostMapping("/send-email")
    public ResponseEntity<Map<String, Object>> sendUnifiedDocumentByEmail(
            @RequestParam String toEmail,
            @RequestParam String employeeName,
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam String filePath) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📧 Enviando documento unificado por email para: {}", toEmail);
            
            boolean emailSent = emailService.sendUnifiedDocument(toEmail, employeeName, String.valueOf(month), String.valueOf(year), filePath);
            
            if (emailSent) {
                response.put("sucesso", true);
                response.put("mensagem", "Documento unificado enviado por email com sucesso");
                response.put("toEmail", toEmail);
                response.put("employeeName", employeeName);
                return ResponseEntity.ok(response);
            } else {
                response.put("sucesso", false);
                response.put("mensagem", "Erro ao enviar email");
                return ResponseEntity.internalServerError().body(response);
            }
            
        } catch (Exception e) {
            log.error("💥 Erro ao enviar email: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao enviar email: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Gera link do WhatsApp para envio de documento
     */
    @PostMapping("/whatsapp-link")
    public ResponseEntity<Map<String, Object>> generateWhatsAppLink(
            @RequestParam String phoneNumber,
            @RequestParam String employeeName,
            @RequestParam int month,
            @RequestParam int year) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📱 Gerando link do WhatsApp para: {}", phoneNumber);
            
            // Validar número de telefone
            if (!whatsAppService.isValidPhoneNumber(phoneNumber)) {
                response.put("sucesso", false);
                response.put("mensagem", "Número de telefone inválido");
                return ResponseEntity.badRequest().body(response);
            }
            
            String whatsappLink = whatsAppService.generateWhatsAppLink(phoneNumber, employeeName, String.valueOf(month), String.valueOf(year));
            
            if (whatsappLink != null) {
                response.put("sucesso", true);
                response.put("mensagem", "Link do WhatsApp gerado com sucesso");
                response.put("whatsappLink", whatsappLink);
                response.put("phoneNumber", whatsAppService.formatPhoneNumber(phoneNumber));
                response.put("employeeName", employeeName);
                return ResponseEntity.ok(response);
            } else {
                response.put("sucesso", false);
                response.put("mensagem", "Erro ao gerar link do WhatsApp");
                return ResponseEntity.internalServerError().body(response);
            }
            
        } catch (Exception e) {
            log.error("💥 Erro ao gerar link do WhatsApp: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao gerar link do WhatsApp: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Testa configuração de email
     */
    @GetMapping("/test-email")
    public ResponseEntity<Map<String, Object>> testEmailConfiguration() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🧪 Testando configuração de email...");
            
            boolean emailWorking = emailService.testEmailConfiguration();
            
            response.put("sucesso", emailWorking);
            response.put("mensagem", emailWorking ? "Configuração de email funcionando" : "Erro na configuração de email");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no teste de email: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro no teste de email: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Testa configuração do WhatsApp
     */
    @GetMapping("/test-whatsapp")
    public ResponseEntity<Map<String, Object>> testWhatsAppConfiguration() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🧪 Testando configuração do WhatsApp...");
            
            boolean whatsappWorking = whatsAppService.testWhatsAppConfiguration();
            
            response.put("sucesso", whatsappWorking);
            response.put("mensagem", whatsappWorking ? "Configuração do WhatsApp funcionando" : "Erro na configuração do WhatsApp");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no teste do WhatsApp: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro no teste do WhatsApp: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Endpoint de teste para verificar se os serviços estão funcionando
     */
    @GetMapping("/test-services")
    public ResponseEntity<Map<String, Object>> testServices() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🧪 Testando serviços...");
            
            Map<String, Object> testResult = unifiedDocumentService.testServices();
            
            response.put("sucesso", testResult.get("success"));
            response.put("mensagem", testResult.get("message"));
            response.put("dados", testResult);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no teste de serviços: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro no teste: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Lista todos os documentos unificados disponíveis
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> listUnifiedDocuments() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📋 Listando documentos unificados...");
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));
            
            List<Map<String, Object>> documents;
            if (isColaborador) {
                String cpf = auth.getName(); // username é o CPF
                log.info("👤 Usuário colaborador, buscando documentos unificados por CPF: {}", cpf);
                documents = unifiedDocumentService.listUnifiedDocumentsByCpf(cpf);
            } else {
                log.info("👑 Usuário admin, buscando todos os documentos unificados");
                documents = unifiedDocumentService.listAllUnifiedDocuments();
            }
            
            response.put("sucesso", true);
            response.put("mensagem", "Documentos unificados listados com sucesso");
            response.put("documents", documents);
            response.put("total", documents.size());
            
            log.info("✅ Encontrados {} documentos unificados", documents.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao listar documentos unificados: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao listar documentos unificados: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Lista todos os documentos unificados com informações detalhadas
     */
    @GetMapping("/list-all-detailed")
    public ResponseEntity<Map<String, Object>> listAllUnifiedDocumentsDetailed() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📋 Listando todos os documentos unificados com detalhes...");
            
            List<Map<String, Object>> documents = unifiedDocumentService.listAllUnifiedDocuments();
            
            // Adicionar informações sobre tipo de unificação
            List<Map<String, Object>> detailedDocuments = new ArrayList<>();
            int individualCount = 0;
            int batchCount = 0;
            
            for (Map<String, Object> doc : documents) {
                Map<String, Object> detailedDoc = new HashMap<>(doc);
                
                // Determinar tipo de unificação baseado no nome do arquivo
                String fileName = (String) doc.get("fileName");
                
                if (fileName != null && fileName.contains("UNIFICADO_")) {
                    // Documento unificado individual
                    detailedDoc.put("unificationType", "INDIVIDUAL");
                    detailedDoc.put("unificationTypeLabel", "Unificação Individual");
                    individualCount++;
                } else if (fileName != null && fileName.contains("BATCH_")) {
                    // Documento unificado em lote
                    detailedDoc.put("unificationType", "BATCH");
                    detailedDoc.put("unificationTypeLabel", "Unificação em Lote");
                    batchCount++;
                } else {
                    // Tipo não identificado
                    detailedDoc.put("unificationType", "UNKNOWN");
                    detailedDoc.put("unificationTypeLabel", "Tipo Não Identificado");
                }
                
                // Adicionar informações de data formatada
                String createdAt = (String) doc.get("createdAt");
                if (createdAt != null) {
                    try {
                        java.time.Instant instant = java.time.Instant.parse(createdAt);
                        java.time.LocalDateTime localDateTime = java.time.LocalDateTime.ofInstant(instant, java.time.ZoneId.systemDefault());
                        detailedDoc.put("createdAtFormatted", localDateTime.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
                    } catch (Exception e) {
                        detailedDoc.put("createdAtFormatted", createdAt);
                    }
                }
                
                detailedDocuments.add(detailedDoc);
            }
            
            response.put("sucesso", true);
            response.put("mensagem", "Documentos unificados listados com sucesso");
            response.put("documents", detailedDocuments);
            response.put("total", documents.size());
            response.put("individualCount", individualCount);
            response.put("batchCount", batchCount);
            response.put("unknownCount", documents.size() - individualCount - batchCount);
            
            log.info("✅ Encontrados {} documentos unificados: {} individuais, {} em lote, {} desconhecidos", 
                documents.size(), individualCount, batchCount, documents.size() - individualCount - batchCount);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao listar documentos unificados detalhados: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao listar documentos unificados: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Lista todos os documentos unificados com informações detalhadas - endpoint público
     */
    @GetMapping("/public/list-detailed")
    public ResponseEntity<Map<String, Object>> listAllUnifiedDocumentsDetailedPublic() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📋 Listando todos os documentos unificados com detalhes (público)...");
            
            List<Map<String, Object>> documents = unifiedDocumentService.listAllUnifiedDocuments();
            
            // Adicionar informações sobre tipo de unificação
            List<Map<String, Object>> detailedDocuments = new ArrayList<>();
            int individualCount = 0;
            int batchCount = 0;
            
            for (Map<String, Object> doc : documents) {
                Map<String, Object> detailedDoc = new HashMap<>(doc);
                
                // Determinar tipo de unificação baseado no nome do arquivo
                String fileName = (String) doc.get("fileName");
                
                if (fileName != null && fileName.contains("UNIFICADO_")) {
                    // Documento unificado individual
                    detailedDoc.put("unificationType", "INDIVIDUAL");
                    detailedDoc.put("unificationTypeLabel", "Unificação Individual");
                    individualCount++;
                } else if (fileName != null && fileName.contains("BATCH_")) {
                    // Documento unificado em lote
                    detailedDoc.put("unificationType", "BATCH");
                    detailedDoc.put("unificationTypeLabel", "Unificação em Lote");
                    batchCount++;
                } else {
                    // Tipo não identificado
                    detailedDoc.put("unificationType", "UNKNOWN");
                    detailedDoc.put("unificationTypeLabel", "Tipo Não Identificado");
                }
                
                // Adicionar informações de data formatada
                String createdAt = (String) doc.get("createdAt");
                if (createdAt != null) {
                    try {
                        java.time.Instant instant = java.time.Instant.parse(createdAt);
                        java.time.LocalDateTime localDateTime = java.time.LocalDateTime.ofInstant(instant, java.time.ZoneId.systemDefault());
                        detailedDoc.put("createdAtFormatted", localDateTime.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
                    } catch (Exception e) {
                        detailedDoc.put("createdAtFormatted", createdAt);
                    }
                }
                
                detailedDocuments.add(detailedDoc);
            }
            
            response.put("sucesso", true);
            response.put("mensagem", "Documentos unificados listados com sucesso");
            response.put("documents", detailedDocuments);
            response.put("total", documents.size());
            response.put("individualCount", individualCount);
            response.put("batchCount", batchCount);
            response.put("unknownCount", documents.size() - individualCount - batchCount);
            
            log.info("✅ Encontrados {} documentos unificados: {} individuais, {} em lote, {} desconhecidos", 
                documents.size(), individualCount, batchCount, documents.size() - individualCount - batchCount);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao listar documentos unificados detalhados (público): {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao listar documentos unificados: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Cria documentos unificados em lote para um período - endpoint público para testes
     */
    @PostMapping("/public/batch-create")
    public ResponseEntity<Map<String, Object>> createBatchUnifiedDocumentsPublic(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📦 PÚBLICO: Criando documentos unificados em lote para {}/{}", month, year);
            
            // Criar request DTO
            com.z7design.secured_guard.dto.BatchUnificationRequest request = 
                com.z7design.secured_guard.dto.BatchUnificationRequest.builder()
                    .month(month)
                    .year(year)
                    .forceUnification(true)
                    .build();
            
            com.z7design.secured_guard.dto.BatchUnificationResult result = 
                unifiedDocumentService.createBatchUnifiedDocuments(request);
            
            response.put("sucesso", true);
            response.put("mensagem", "Documentos unificados criados em lote com sucesso");
            response.put("totalProcessed", result.getTotalProcessed());
            response.put("totalSuccess", result.getTotalSuccess());
            response.put("totalFailed", result.getTotalFailed());
            response.put("successList", result.getSuccessList());
            response.put("failureList", result.getFailureList());
            response.put("processingTimeMs", result.getProcessingTimeMs());
            response.put("month", month);
            response.put("year", year);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao criar documentos em lote (público): {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao criar documentos em lote: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Lista documentos unificados por período
     */
    @GetMapping("/list-by-period")
    public ResponseEntity<Map<String, Object>> listUnifiedDocumentsByPeriod(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("📋 Listando documentos unificados por período: {}/{}", month, year);
            
            List<Map<String, Object>> documents = unifiedDocumentService.listUnifiedDocumentsByPeriod(month, year);
            
            response.put("sucesso", true);
            response.put("mensagem", "Documentos unificados listados com sucesso");
            response.put("documents", documents);
            response.put("total", documents.size());
            response.put("month", month);
            response.put("year", year);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao listar documentos unificados por período: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao listar documentos unificados por período: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Busca documentos unificados por nome do funcionário
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchUnifiedDocuments(
            @RequestParam String employeeName) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🔍 Buscando documentos unificados para: {}", employeeName);
            
            List<Map<String, Object>> documents = unifiedDocumentService.searchUnifiedDocumentsByEmployee(employeeName);
            
            response.put("sucesso", true);
            response.put("mensagem", "Busca realizada com sucesso");
            response.put("documents", documents);
            response.put("total", documents.size());
            response.put("employeeName", employeeName);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro na busca de documentos unificados: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro na busca: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Exclui um documento unificado pelo nome do arquivo
     */
    @DeleteMapping("/delete/{fileName:.+}")
    public ResponseEntity<Map<String, Object>> deleteUnifiedDocument(@PathVariable String fileName) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🗑️ Excluindo documento unificado: {}", fileName);
            
            boolean deleted = unifiedDocumentService.deleteUnifiedDocument(fileName);
            
            if (deleted) {
                response.put("sucesso", true);
                response.put("mensagem", "Documento unificado excluído com sucesso");
                response.put("fileName", fileName);
                return ResponseEntity.ok(response);
            } else {
                response.put("sucesso", false);
                response.put("mensagem", "Documento não encontrado ou não pôde ser excluído");
                response.put("fileName", fileName);
                return ResponseEntity.status(404).body(response);
            }
            
        } catch (Exception e) {
            log.error("💥 Erro ao excluir documento unificado: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao excluir documento: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Exclui múltiplos documentos unificados
     */
    @DeleteMapping("/delete-multiple")
    public ResponseEntity<Map<String, Object>> deleteMultipleUnifiedDocuments(@RequestBody List<String> fileNames) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🗑️ Excluindo {} documentos unificados", fileNames.size());
            
            int deletedCount = 0;
            List<String> failedFiles = new ArrayList<>();
            
            for (String fileName : fileNames) {
                try {
                    if (unifiedDocumentService.deleteUnifiedDocument(fileName)) {
                        deletedCount++;
                    } else {
                        failedFiles.add(fileName);
                    }
                } catch (Exception e) {
                    log.error("💥 Erro ao excluir arquivo {}: {}", fileName, e.getMessage());
                    failedFiles.add(fileName);
                }
            }
            
            response.put("sucesso", true);
            response.put("mensagem", String.format("Excluídos %d de %d documentos", deletedCount, fileNames.size()));
            response.put("deletedCount", deletedCount);
            response.put("totalCount", fileNames.size());
            response.put("failedFiles", failedFiles);
            
            if (failedFiles.isEmpty()) {
                return ResponseEntity.ok(response);
            } else {
                response.put("sucesso", false);
                response.put("mensagem", String.format("Excluídos %d de %d documentos. %d falharam.", deletedCount, fileNames.size(), failedFiles.size()));
                return ResponseEntity.status(207).body(response); // Multi-Status
            }
            
        } catch (Exception e) {
            log.error("💥 Erro ao excluir múltiplos documentos: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao excluir documentos: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Cria documentos unificados automaticamente para todos os funcionários
     */
    @PostMapping("/create-all")
    public ResponseEntity<Map<String, Object>> createAllUnifiedDocuments() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🎯 Criando documentos unificados para todos os funcionários...");
            
            List<String> createdDocuments = unifiedDocumentService.createAllUnifiedDocuments();
            
            response.put("sucesso", true);
            response.put("mensagem", String.format("Documentos unificados criados com sucesso! %d documentos gerados.", createdDocuments.size()));
            response.put("unifiedDocuments", createdDocuments);
            response.put("count", createdDocuments.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao criar documentos unificados: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao criar documentos unificados: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Cria holerites expandidos automaticamente para todos os funcionários
     */
    @PostMapping("/create-expanded-holerites")
    public ResponseEntity<Map<String, Object>> createExpandedHolerites() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🎯 Criando holerites expandidos para todos os funcionários...");
            
            List<String> createdDocuments = unifiedDocumentService.createAllUnifiedDocuments();
            
            response.put("sucesso", true);
            response.put("mensagem", String.format("Holerites expandidos criados com sucesso! %d documentos gerados.", createdDocuments.size()));
            response.put("expandedHolerites", createdDocuments);
            response.put("count", createdDocuments.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao criar holerites expandidos: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao criar holerites expandidos: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Cria documentos unificados em lote/massa com verificação rigorosa de nomes
     */
    @PostMapping("/create-batch")
    public ResponseEntity<Map<String, Object>> createBatchUnifiedDocuments(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false, defaultValue = "false") Boolean forceUnification) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🎯 Iniciando unificação em lote: Mês={}, Ano={}, Force={}", month, year, forceUnification);
            
            com.z7design.secured_guard.dto.BatchUnificationRequest request = 
                com.z7design.secured_guard.dto.BatchUnificationRequest.builder()
                    .month(month)
                    .year(year)
                    .forceUnification(forceUnification)
                    .build();
            
            com.z7design.secured_guard.dto.BatchUnificationResult result = 
                unifiedDocumentService.createBatchUnifiedDocuments(request);
            
            response.put("sucesso", result.getTotalSuccess() > 0);
            response.put("mensagem", String.format(
                "Processamento concluído: %d sucesso, %d falhas de %d total",
                result.getTotalSuccess(), 
                result.getTotalFailed(), 
                result.getTotalProcessed()
            ));
            response.put("totalProcessed", result.getTotalProcessed());
            response.put("totalSuccess", result.getTotalSuccess());
            response.put("totalFailed", result.getTotalFailed());
            response.put("processingTimeMs", result.getProcessingTimeMs());
            response.put("successList", result.getSuccessList());
            response.put("failureList", result.getFailureList());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro na unificação em lote: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro na unificação em lote: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Organiza documentos unificados por Empresa/Setor/Ano/Mês
     */
    @GetMapping("/organization")
    public ResponseEntity<com.z7design.secured_guard.dto.PayslipOrganizationResponse> getUnifiedDocumentsOrganization() {
        try {
            log.info("📋 Organizando documentos unificados por Empresa/Setor/Ano/Mês...");
            com.z7design.secured_guard.dto.PayslipOrganizationResponse response = 
                unifiedDocumentService.organizeUnifiedDocumentsByCompany();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("💥 Erro ao organizar documentos unificados: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Analisa falhas na unificação de documentos
     */
    @GetMapping("/analyze-failures")
    public ResponseEntity<Map<String, Object>> analyzeFailures() {
        Map<String, Object> response = new HashMap<>();
        try {
            log.info("🔍 Analisando falhas na unificação...");
            
            // Obter todos os holerites
            List<Payslip> allPayslips = payslipService.getAllPayslips();
            List<PaymentReceipt> allReceipts = paymentReceiptRepository.findAll();
            
            List<Map<String, Object>> failedUnifications = new ArrayList<>();
            
            // Analisar cada holerite para verificar se tem comprovante correspondente
            for (Payslip payslip : allPayslips) {
                String employeeName = payslip.getEmployeeName();
                int month = payslip.getMonth();
                int year = payslip.getYear();
                
                // REGRA: O comprovante de pagamento é do mês SEGUINTE ao holerite
                int receiptMonth = month == 12 ? 1 : month + 1;
                int receiptYear = month == 12 ? year + 1 : year;
                
                // Procurar comprovante correspondente
                boolean receiptFound = allReceipts.stream()
                    .anyMatch(r -> r.getEmployeeName() != null && 
                                  r.getEmployeeName().equalsIgnoreCase(employeeName) &&
                                  r.getMonth() != null && r.getMonth().equals(receiptMonth) &&
                                  r.getYear() != null && r.getYear().equals(receiptYear));
                
                if (!receiptFound) {
                    Map<String, Object> failure = new HashMap<>();
                    failure.put("employeeName", employeeName);
                    failure.put("month", month);
                    failure.put("year", year);
                    failure.put("reason", "Comprovante de pagamento não encontrado para o mês " + receiptMonth + "/" + receiptYear);
                    failure.put("status", "FALHA");
                    failure.put("holeriteFound", true);
                    failure.put("holeriteFileName", payslip.getFileName());
                    failure.put("receiptFound", false);
                    failure.put("receiptFileName", null);
                    
                    failedUnifications.add(failure);
                }
            }
            
            // Analisar comprovantes órfãos (sem holerite correspondente)
            for (PaymentReceipt receipt : allReceipts) {
                String employeeName = receipt.getEmployeeName();
                int month = receipt.getMonth();
                int year = receipt.getYear();
                
                // REGRA: O holerite é do mês ANTERIOR ao comprovante
                int payslipMonth = month == 1 ? 12 : month - 1;
                int payslipYear = month == 1 ? year - 1 : year;
                
                // Procurar holerite correspondente
                boolean payslipFound = allPayslips.stream()
                    .anyMatch(p -> p.getEmployeeName() != null && 
                                  p.getEmployeeName().equalsIgnoreCase(employeeName) &&
                                  p.getMonth() == payslipMonth &&
                                  p.getYear() == payslipYear);
                
                if (!payslipFound) {
                    Map<String, Object> failure = new HashMap<>();
                    failure.put("employeeName", employeeName);
                    failure.put("month", payslipMonth);
                    failure.put("year", payslipYear);
                    failure.put("reason", "Holerite não encontrado para o mês " + payslipMonth + "/" + payslipYear);
                    failure.put("status", "FALHA");
                    failure.put("holeriteFound", false);
                    failure.put("holeriteFileName", null);
                    failure.put("receiptFound", true);
                    failure.put("receiptFileName", receipt.getFileName());
                    
                    failedUnifications.add(failure);
                }
            }
            
            response.put("sucesso", true);
            response.put("mensagem", "Análise de falhas concluída");
            response.put("failedUnifications", failedUnifications);
            response.put("totalFailures", failedUnifications.size());
            response.put("totalPayslips", allPayslips.size());
            response.put("totalReceipts", allReceipts.size());
            
            log.info("✅ Análise concluída: {} falhas encontradas", failedUnifications.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao analisar falhas: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao analisar falhas: " + e.getMessage());
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(response);
        }
    }
} 