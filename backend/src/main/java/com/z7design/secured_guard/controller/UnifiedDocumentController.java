package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.UnifiedDocumentService;
import com.z7design.secured_guard.service.EmailService;
import com.z7design.secured_guard.service.WhatsAppService;
import com.z7design.secured_guard.service.PayslipService;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.PayslipRepository;
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
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.io.BufferedOutputStream;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.io.FileInputStream;
import java.io.BufferedInputStream;
import java.util.UUID;

@RestController
@RequestMapping("/api/unified-documents")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
@RequiredArgsConstructor
@Slf4j
public class UnifiedDocumentController {

    private final UnifiedDocumentService unifiedDocumentService;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final PayslipService payslipService;
    private final PaymentReceiptRepository paymentReceiptRepository;
    private final AuthenticatedCpfResolver authenticatedCpfResolver;
    private final com.z7design.secured_guard.repository.UserRepository userRepository;
    private final PayslipRepository payslipRepository;

    private static final Pattern CPF_PATTERN = Pattern.compile("(\\d{11})");
    
    // Log de inicialização para confirmar que o controller foi carregado
    {
        log.info("✅ UnifiedDocumentController inicializado - Endpoint /download/company disponível");
    }

    /**
     * Cria documento unificado para um funcionário específico
     * Aceita payslipId e receiptId opcionais para garantir que os documentos corretos sejam usados
     */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createUnifiedDocument(
            @RequestParam String employeeName,
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) java.util.UUID payslipId,
            @RequestParam(required = false) java.util.UUID receiptId) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🎯 Criando documento unificado para: {} - {}/{} (payslipId: {}, receiptId: {})", 
                employeeName, month, year, payslipId, receiptId);
            
            String unifiedPdfPath;
            
            // Se temos IDs específicos, usar eles para garantir que os documentos corretos sejam usados
            if (payslipId != null && receiptId != null) {
                log.info("✅ Usando IDs específicos para garantir documentos corretos");
                unifiedPdfPath = unifiedDocumentService.createUnifiedDocumentByIds(payslipId, receiptId);
            } else {
                // Fallback para busca por nome/mês/ano (comportamento antigo)
                log.info("⚠️ Usando busca por nome/mês/ano (pode encontrar documentos incorretos se houver nomes similares)");
                unifiedPdfPath = unifiedDocumentService.createUnifiedDocumentForEmployee(employeeName, month, year);
            }
            
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
     * Debug: Testa busca de comprovante para um funcionário específico
     */
    @GetMapping("/debug-search-receipt")
    public ResponseEntity<Map<String, Object>> debugSearchReceipt(
            @RequestParam String employeeName,
            @RequestParam int month,
            @RequestParam int year) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🔍 DEBUG: Testando busca de comprovante para: {} - {}/{}", employeeName, month, year);
            
            // Calcular mês do comprovante (mês seguinte)
            int receiptMonth = month == 12 ? 1 : month + 1;
            int receiptYear = month == 12 ? year + 1 : year;
            
            // Buscar comprovantes no banco
            List<PaymentReceipt> receiptsInDb = paymentReceiptRepository.findByYearAndMonth(receiptYear, receiptMonth);
            
            response.put("sucesso", true);
            response.put("employeeName", employeeName);
            response.put("holeriteMonth", month);
            response.put("holeriteYear", year);
            response.put("receiptMonth", receiptMonth);
            response.put("receiptYear", receiptYear);
            response.put("totalReceiptsInDb", receiptsInDb.size());
            
            // Listar todos os comprovantes encontrados
            List<Map<String, Object>> receiptsInfo = new ArrayList<>();
            for (PaymentReceipt r : receiptsInDb) {
                Map<String, Object> receiptInfo = new HashMap<>();
                receiptInfo.put("id", r.getId());
                receiptInfo.put("employeeName", r.getEmployeeName());
                receiptInfo.put("month", r.getMonth());
                receiptInfo.put("year", r.getYear());
                receiptInfo.put("fileName", r.getFileName());
                receiptInfo.put("filePath", r.getFilePath());
                
                // Verificar se arquivo existe
                if (r.getFilePath() != null) {
                    Path filePath = Paths.get(r.getFilePath());
                    receiptInfo.put("fileExists", Files.exists(filePath));
                    receiptInfo.put("absolutePath", filePath.toAbsolutePath().toString());
                    
                    // Tentar caminho relativo também
                    Path relativePath = Paths.get(System.getProperty("user.dir"), r.getFilePath());
                    receiptInfo.put("relativePathExists", Files.exists(relativePath));
                    if (Files.exists(relativePath)) {
                        receiptInfo.put("relativeAbsolutePath", relativePath.toAbsolutePath().toString());
                    }
                } else {
                    receiptInfo.put("fileExists", false);
                }
                
                receiptsInfo.add(receiptInfo);
            }
            response.put("receipts", receiptsInfo);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro no debug: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("erro", e.getMessage());
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
     * Download em lote por empresa (ZIP) - VERSÃO OTIMIZADA
     * Busca diretamente do banco de dados para melhor performance
     * IMPORTANTE: Este endpoint deve vir ANTES do /download/{fileName} para evitar conflito de rotas
     */
    @GetMapping("/download/company")
    public ResponseEntity<StreamingResponseBody> downloadByCompany(@RequestParam("name") String companyName) {
        long startTime = System.currentTimeMillis();
        try {
            // Decodificar o nome da empresa (pode vir com %20 para espaços)
            String decodedCompanyName = java.net.URLDecoder.decode(companyName, "UTF-8");
            log.info("📦 [OTIMIZADO] Download em lote por empresa: '{}'", decodedCompanyName);
            
            // OTIMIZAÇÃO: Buscar payslips diretamente do banco de dados usando query otimizada
            // Primeiro tentar buscar por CNPJ (mais rápido e preciso)
            List<Payslip> companyPayslips = payslipRepository.findByCompanyCnpj(decodedCompanyName);
            
            // Se não encontrou por CNPJ, buscar por nome da empresa (busca flexível)
            if (companyPayslips.isEmpty()) {
                companyPayslips = payslipRepository.findByCompanyNameContainingIgnoreCase(decodedCompanyName);
            }
            
            log.info("✅ {} payslip(s) encontrado(s) para a empresa '{}'", companyPayslips.size(), decodedCompanyName);
            
            if (companyPayslips.isEmpty()) {
                log.warn("⚠️ Nenhum payslip encontrado para a empresa: '{}'", decodedCompanyName);
                return ResponseEntity.notFound().build();
            }
            
            // Criar mapa para organizar arquivos por estrutura: Empresa/Setor/Período/Funcionário
            // Usar UUID do Payslip como chave para evitar LazyInitializationException
            Map<UUID, Path> payslipToFileMap = new HashMap<>();
            Map<UUID, Payslip> payslipMap = new HashMap<>();
            
            // Inicializar relações lazy antes de usar
            for (Payslip payslip : companyPayslips) {
                // Inicializar company se necessário (para evitar LazyInitializationException)
                if (payslip.getCompany() != null) {
                    try {
                        // Forçar inicialização da relação lazy
                        org.hibernate.Hibernate.initialize(payslip.getCompany());
                    } catch (Exception e) {
                        log.warn("⚠️ Não foi possível inicializar company para payslip {}: {}", payslip.getId(), e.getMessage());
                    }
                }
                payslipMap.put(payslip.getId(), payslip);
            }
            
            // Mapear cada payslip para seu arquivo encontrado
            for (Payslip payslip : companyPayslips) {
                String fileName = payslip.getFileName();
                if (fileName == null || fileName.isEmpty()) {
                    continue;
                }
                
                // Tentar encontrar o arquivo para este payslip específico
                Path foundFile = null;
                
                // PRIORIDADE 1: Usar arquivo_caminho se disponível
                if (payslip.getArquivoCaminho() != null && !payslip.getArquivoCaminho().isEmpty()) {
                    Path candidate = Paths.get(payslip.getArquivoCaminho());
                    if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                        foundFile = candidate;
                    }
                }
                
                // PRIORIDADE 2: Estrutura PRD completa
                if (foundFile == null && payslip.getCompanyCnpj() != null && payslip.getWorkPostName() != null) {
                    String empresaCnpj = normalizeCnpjForPath(payslip.getCompanyCnpj());
                    String setorNome = normalizeSectorNameForPath(payslip.getWorkPostName());
                    String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
                    String funcionarioNome = payslip.getEmployeeName() != null ? normalizeEmployeeNameForPath(payslip.getEmployeeName()) : null;
                    String funcionarioCpf = payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : null;
                    
                    if (empresaCnpj != null && setorNome != null && funcionarioNome != null && funcionarioCpf != null) {
                        String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                        Path candidate = Paths.get("backend/holerites", empresaCnpj, setorNome, periodo, pastaFuncionario, fileName);
                        if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                            foundFile = candidate;
                        }
                    }
                }
                
                // PRIORIDADE 3: Estrutura PRD sem pasta funcionário
                if (foundFile == null && payslip.getCompanyCnpj() != null && payslip.getWorkPostName() != null) {
                    String empresaCnpj = normalizeCnpjForPath(payslip.getCompanyCnpj());
                    String setorNome = normalizeSectorNameForPath(payslip.getWorkPostName());
                    String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
                    
                    if (empresaCnpj != null && setorNome != null) {
                        Path candidate = Paths.get("backend/holerites", empresaCnpj, setorNome, periodo, fileName);
                        if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                            foundFile = candidate;
                        }
                    }
                }
                
                // PRIORIDADE 4: Estrutura antiga
                if (foundFile == null) {
                    String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
                    Path candidate = Paths.get("backend/holerites", mesAno, fileName);
                    if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                        foundFile = candidate;
                    }
                }
                
                // PRIORIDADE 5: Buscar recursivamente
                if (foundFile == null) {
                    Path holeritesDir = Paths.get("backend/holerites");
                    if (Files.exists(holeritesDir)) {
                        try {
                            java.util.stream.Stream<Path> stream = Files.walk(holeritesDir, 5);
                            Optional<Path> found = stream
                                .filter(Files::isRegularFile)
                                .filter(p -> p.getFileName().toString().equals(fileName))
                                .findFirst();
                            stream.close();
                            
                            if (found.isPresent()) {
                                foundFile = found.get();
                            }
                        } catch (IOException e) {
                            log.warn("⚠️ Erro ao buscar arquivo recursivamente: {}", e.getMessage());
                        }
                    }
                }
                
                // PRIORIDADE 6: Outros diretórios
                if (foundFile == null) {
                    String[] fallbackDirs = {
                        System.getProperty("payslips.upload.dir", "uploads/payslips"),
                        "uploads/holerites_processados",
                        "backend/payslips_output",
                        "holerites"
                    };
                    
                    for (String baseDir : fallbackDirs) {
                        Path filePath = Paths.get(baseDir, fileName);
                        if (Files.exists(filePath) && Files.isRegularFile(filePath)) {
                            foundFile = filePath;
                            break;
                        }
                    }
                }
                
                if (foundFile != null) {
                    payslipToFileMap.put(payslip.getId(), foundFile);
                } else {
                    log.warn("⚠️ Arquivo não encontrado para payslip {}: {}", payslip.getId(), fileName);
                }
            }
            
            log.info("📊 {} arquivo(s) encontrado(s) de {} payslip(s) para empresa '{}'", 
                payslipToFileMap.size(), companyPayslips.size(), decodedCompanyName);
            
            if (payslipToFileMap.isEmpty()) {
                log.warn("⚠️ Nenhum arquivo físico encontrado para os payslips da empresa: '{}'", decodedCompanyName);
                return ResponseEntity.notFound().build();
            }
            
            // Normalizar nome da empresa para pasta
            String empresaFolderName = normalizeCompanyNameForPath(decodedCompanyName);
            
            // Criar ZIP streaming com estrutura organizada: Empresa/Setor/Período/Funcionário/arquivo.pdf
            log.info("📦 Criando ZIP organizado com {} arquivo(s) para empresa '{}'...", payslipToFileMap.size(), decodedCompanyName);
            StreamingResponseBody responseBody = outputStream -> {
                try (ZipOutputStream zos = new ZipOutputStream(new BufferedOutputStream(outputStream, 65536))) {
                    int filesAdded = 0;
                    
                    for (Map.Entry<UUID, Path> entry : payslipToFileMap.entrySet()) {
                        UUID payslipId = entry.getKey();
                        Payslip payslip = payslipMap.get(payslipId);
                        Path filePath = entry.getValue();
                        
                        if (payslip == null) {
                            log.warn("⚠️ Payslip não encontrado para ID: {}", payslipId);
                            continue;
                        }
                        
                        // Construir caminho no ZIP: Empresa/Setor/Período/Funcionário/arquivo.pdf
                        String setorNome = payslip.getWorkPostName() != null 
                            ? normalizeSectorNameForPath(payslip.getWorkPostName()) 
                            : "SETOR_NAO_INFORMADO";
                        String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
                        String funcionarioNome = payslip.getEmployeeName() != null 
                            ? normalizeEmployeeNameForPath(payslip.getEmployeeName()) 
                            : "FUNCIONARIO_NAO_INFORMADO";
                        String funcionarioCpf = payslip.getCpf() != null 
                            ? payslip.getCpf().replaceAll("[^0-9]", "") 
                            : "SEM_CPF";
                        String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                        
                        String fileName = filePath.getFileName().toString();
                        String zipEntryPath = String.format("%s/%s/%s/%s/%s", 
                            empresaFolderName, setorNome, periodo, pastaFuncionario, fileName);
                        
                        ZipEntry zipEntry = new ZipEntry(zipEntryPath);
                        zos.putNextEntry(zipEntry);
                        
                        // Usar buffer maior para melhor performance
                        try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(filePath.toFile()), 65536)) {
                            byte[] buffer = new byte[65536]; // 64KB buffer
                            int bytesRead;
                            while ((bytesRead = bis.read(buffer)) != -1) {
                                zos.write(buffer, 0, bytesRead);
                            }
                        }
                        zos.closeEntry();
                        filesAdded++;
                        
                        if (filesAdded % 10 == 0) {
                            log.debug("📦 Progresso: {} arquivo(s) adicionado(s)...", filesAdded);
                        }
                    }
                    log.info("✅ ZIP criado com sucesso: {} arquivo(s) adicionado(s) em estrutura organizada", filesAdded);
                } catch (Exception e) {
                    log.error("💥 Erro ao criar ZIP: {}", e.getMessage(), e);
                    throw new RuntimeException("Erro ao criar ZIP", e);
                }
            };
            
            String zipFileName = decodedCompanyName.replaceAll("[^a-zA-Z0-9]", "_") + "_documentos_unificados.zip";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", zipFileName);
            
            long duration = System.currentTimeMillis() - startTime;
            log.info("⚡ Download otimizado concluído em {}ms para empresa '{}'", duration, decodedCompanyName);
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(responseBody);
                
        } catch (Exception e) {
            log.error("💥 Erro ao fazer download por empresa: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Download em lote por setor (ZIP) - VERSÃO OTIMIZADA
     * Busca diretamente do banco de dados para melhor performance
     * IMPORTANTE: Este endpoint deve vir ANTES do /download/{fileName} para evitar conflito de rotas
     */
    @GetMapping("/download/sector")
    public ResponseEntity<StreamingResponseBody> downloadBySector(@RequestParam("name") String sectorName) {
        long startTime = System.currentTimeMillis();
        try {
            // Decodificar o nome do setor (pode vir com %20 para espaços)
            String decodedSectorName = java.net.URLDecoder.decode(sectorName, "UTF-8");
            log.info("📦 [OTIMIZADO] Download em lote por setor: '{}'", decodedSectorName);
            
            // OTIMIZAÇÃO: Buscar payslips diretamente do banco de dados usando query otimizada
            List<Payslip> sectorPayslips = payslipRepository.findByWorkPostNameContainingIgnoreCase(decodedSectorName);
            
            log.info("✅ {} payslip(s) encontrado(s) para o setor '{}'", sectorPayslips.size(), decodedSectorName);
            
            if (sectorPayslips.isEmpty()) {
                log.warn("⚠️ Nenhum payslip encontrado para o setor: '{}'", decodedSectorName);
                return ResponseEntity.notFound().build();
            }
            
            // Criar mapa para organizar arquivos por estrutura: Empresa/Setor/Período/Funcionário
            // Usar UUID do Payslip como chave para evitar LazyInitializationException
            Map<UUID, Path> payslipToFileMap = new HashMap<>();
            Map<UUID, Payslip> payslipMap = new HashMap<>();
            
            // Inicializar relações lazy antes de usar
            for (Payslip payslip : sectorPayslips) {
                // Inicializar company se necessário (para evitar LazyInitializationException)
                if (payslip.getCompany() != null) {
                    try {
                        // Forçar inicialização da relação lazy
                        org.hibernate.Hibernate.initialize(payslip.getCompany());
                    } catch (Exception e) {
                        log.warn("⚠️ Não foi possível inicializar company para payslip {}: {}", payslip.getId(), e.getMessage());
                    }
                }
                payslipMap.put(payslip.getId(), payslip);
            }
            
            log.info("🔍 Buscando arquivos físicos para {} payslip(s)...", sectorPayslips.size());
            
            // Mapear cada payslip para seu arquivo encontrado (mesma lógica do downloadByCompany)
            for (Payslip payslip : sectorPayslips) {
                String fileName = payslip.getFileName();
                if (fileName == null || fileName.isEmpty()) {
                    log.warn("⚠️ Payslip {} não tem fileName", payslip.getId());
                    continue;
                }
                
                Path foundFile = findPayslipFile(payslip, fileName);
                if (foundFile != null) {
                    payslipToFileMap.put(payslip.getId(), foundFile);
                } else {
                    log.warn("⚠️ Arquivo não encontrado para payslip {}: {}", payslip.getId(), fileName);
                }
            }
            
            log.info("📊 {} arquivo(s) encontrado(s) de {} payslip(s) para setor '{}'", 
                payslipToFileMap.size(), sectorPayslips.size(), decodedSectorName);
            
            if (payslipToFileMap.isEmpty()) {
                log.warn("⚠️ Nenhum arquivo físico encontrado para os payslips do setor: '{}'", decodedSectorName);
                return ResponseEntity.notFound().build();
            }
            
            // Normalizar nome do setor para pasta
            String setorFolderName = normalizeSectorNameForPath(decodedSectorName);
            
            // Criar ZIP streaming com estrutura organizada: Empresa/Setor/Período/Funcionário/arquivo.pdf
            log.info("📦 Criando ZIP organizado com {} arquivo(s) para setor '{}'...", payslipToFileMap.size(), decodedSectorName);
            StreamingResponseBody responseBody = outputStream -> {
                try (ZipOutputStream zos = new ZipOutputStream(new BufferedOutputStream(outputStream, 65536))) {
                    int filesAdded = 0;
                    
                    for (Map.Entry<UUID, Path> entry : payslipToFileMap.entrySet()) {
                        UUID payslipId = entry.getKey();
                        Payslip payslip = payslipMap.get(payslipId);
                        Path filePath = entry.getValue();
                        
                        if (payslip == null) {
                            log.warn("⚠️ Payslip não encontrado para ID: {}", payslipId);
                            continue;
                        }
                        
                        // Construir caminho no ZIP: Empresa/Setor/Período/Funcionário/arquivo.pdf
                        String empresaNome = payslip.getCompanyName() != null 
                            ? normalizeCompanyNameForPath(payslip.getCompanyName()) 
                            : "EMPRESA_NAO_INFORMADA";
                        String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
                        String funcionarioNome = payslip.getEmployeeName() != null 
                            ? normalizeEmployeeNameForPath(payslip.getEmployeeName()) 
                            : "FUNCIONARIO_NAO_INFORMADO";
                        String funcionarioCpf = payslip.getCpf() != null 
                            ? payslip.getCpf().replaceAll("[^0-9]", "") 
                            : "SEM_CPF";
                        String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                        
                        String fileName = filePath.getFileName().toString();
                        String zipEntryPath = String.format("%s/%s/%s/%s/%s", 
                            empresaNome, setorFolderName, periodo, pastaFuncionario, fileName);
                        
                        ZipEntry zipEntry = new ZipEntry(zipEntryPath);
                        zos.putNextEntry(zipEntry);
                        
                        // Usar buffer maior para melhor performance
                        try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(filePath.toFile()), 65536)) {
                            byte[] buffer = new byte[65536]; // 64KB buffer
                            int bytesRead;
                            while ((bytesRead = bis.read(buffer)) != -1) {
                                zos.write(buffer, 0, bytesRead);
                            }
                        }
                        zos.closeEntry();
                        filesAdded++;
                        
                        if (filesAdded % 10 == 0) {
                            log.debug("📦 Progresso: {} arquivo(s) adicionado(s)...", filesAdded);
                        }
                    }
                    log.info("✅ ZIP criado com sucesso: {} arquivo(s) adicionado(s) em estrutura organizada", filesAdded);
                } catch (Exception e) {
                    log.error("💥 Erro ao criar ZIP: {}", e.getMessage(), e);
                    throw new RuntimeException("Erro ao criar ZIP", e);
                }
            };
            
            String zipFileName = decodedSectorName.replaceAll("[^a-zA-Z0-9]", "_") + "_holerites.zip";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", zipFileName);
            
            long duration = System.currentTimeMillis() - startTime;
            log.info("⚡ Download otimizado concluído em {}ms para setor '{}'", duration, decodedSectorName);
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(responseBody);
                
        } catch (Exception e) {
            log.error("💥 Erro ao fazer download por setor: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Método auxiliar para encontrar arquivo físico de um payslip
     * Reutiliza a mesma lógica do downloadByCompany
     */
    private Path findPayslipFile(Payslip payslip, String fileName) {
        // PRIORIDADE 1: Usar arquivo_caminho se disponível
        if (payslip.getArquivoCaminho() != null && !payslip.getArquivoCaminho().isEmpty()) {
            Path candidate = Paths.get(payslip.getArquivoCaminho());
            if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath();
            }
        }
        
        // PRIORIDADE 2: Estrutura PRD completa
        if (payslip.getCompanyCnpj() != null && payslip.getWorkPostName() != null) {
            String empresaCnpj = normalizeCnpjForPath(payslip.getCompanyCnpj());
            String setorNome = normalizeSectorNameForPath(payslip.getWorkPostName());
            String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
            String funcionarioNome = payslip.getEmployeeName() != null ? normalizeEmployeeNameForPath(payslip.getEmployeeName()) : null;
            String funcionarioCpf = payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : null;
            
            if (empresaCnpj != null && setorNome != null && funcionarioNome != null && funcionarioCpf != null) {
                String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                Path candidate = Paths.get("backend/holerites", empresaCnpj, setorNome, periodo, pastaFuncionario, fileName);
                if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                    return candidate.toAbsolutePath();
                }
            }
            
            // Tentar sem pasta funcionário
            if (empresaCnpj != null && setorNome != null) {
                Path candidate = Paths.get("backend/holerites", empresaCnpj, setorNome, periodo, fileName);
                if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                    return candidate.toAbsolutePath();
                }
            }
        }
        
        // PRIORIDADE 3: Estrutura antiga
        String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
        Path candidate = Paths.get("backend/holerites", mesAno, fileName);
        if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
            return candidate.toAbsolutePath();
        }
        
        // PRIORIDADE 4: Buscar recursivamente
        Path holeritesDir = Paths.get("backend/holerites");
        if (Files.exists(holeritesDir)) {
            try {
                java.util.stream.Stream<Path> stream = Files.walk(holeritesDir, 5);
                Optional<Path> found = stream
                    .filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().equals(fileName))
                    .findFirst();
                stream.close();
                
                if (found.isPresent()) {
                    return found.get().toAbsolutePath();
                }
            } catch (IOException e) {
                log.warn("⚠️ Erro ao buscar arquivo recursivamente: {}", e.getMessage());
            }
        }
        
        // PRIORIDADE 5: Outros diretórios
        String[] fallbackDirs = {
            System.getProperty("payslips.upload.dir", "uploads/payslips"),
            "uploads/holerites_processados",
            "backend/payslips_output",
            "holerites"
        };
        
        for (String baseDir : fallbackDirs) {
            Path filePath = Paths.get(baseDir, fileName);
            if (Files.exists(filePath) && Files.isRegularFile(filePath)) {
                return filePath.toAbsolutePath();
            }
        }
        
        return null;
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
            
            // Configurar headers para download forçado (sem headers CORS manuais - deixar SecurityConfig gerenciar)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(org.springframework.http.ContentDisposition.attachment()
                .filename(fileName, java.nio.charset.StandardCharsets.UTF_8)
                .build());
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
                
        } catch (Exception e) {
            log.error("💥 Erro ao fazer download do arquivo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Método auxiliar para encontrar arquivo recursivamente
     * Tenta encontrar o arquivo com e sem o prefixo "UNIFICADO_"
     */
    private Path findFileRecursively(Path basePath, String fileName) {
        if (!Files.exists(basePath)) {
            log.warn("⚠️ Diretório base não existe: {}", basePath);
            return null;
        }
        
        // Lista de nomes de arquivo para tentar (com e sem prefixo UNIFICADO_)
        java.util.List<String> fileNameVariants = new java.util.ArrayList<>();
        fileNameVariants.add(fileName); // Nome original
        
        // Se o nome começa com "UNIFICADO_", tentar sem o prefixo
        if (fileName.startsWith("UNIFICADO_")) {
            String withoutPrefix = fileName.substring("UNIFICADO_".length());
            fileNameVariants.add(withoutPrefix);
            log.debug("🔍 Tentando variante sem prefixo: {}", withoutPrefix);
        } else {
            // Se não começa com "UNIFICADO_", tentar com o prefixo
            String withPrefix = "UNIFICADO_" + fileName;
            fileNameVariants.add(withPrefix);
            log.debug("🔍 Tentando variante com prefixo: {}", withPrefix);
        }
        
        // Tentar cada variante
        for (String variant : fileNameVariants) {
            // Procurar diretamente no diretório base
            Path directPath = basePath.resolve(variant);
            if (Files.exists(directPath)) {
                log.info("✅ Arquivo encontrado diretamente: {}", directPath);
                return directPath;
            }
            
            // Procurar recursivamente nas subpastas
            try {
                java.util.Optional<Path> found = Files.walk(basePath)
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equals(variant))
                    .findFirst();
                
                if (found.isPresent()) {
                    log.info("✅ Arquivo encontrado recursivamente: {}", found.get());
                    return found.get();
                }
            } catch (IOException e) {
                log.warn("⚠️ Erro ao procurar variante '{}': {}", variant, e.getMessage());
            }
        }
        
        log.warn("⚠️ Arquivo não encontrado em nenhuma variante: {}", fileName);
        return null;
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
     * Busca o caminho do arquivo unificado correspondente a um funcionário/mês/ano
     */
    private String findUnifiedDocumentPath(List<Map<String, Object>> allUnifiedDocs, String employeeName, Integer month, Integer year) {
        if (employeeName == null || month == null || year == null) {
            log.warn("⚠️ findUnifiedDocumentPath: Parâmetros inválidos - employeeName: {}, month: {}, year: {}", 
                employeeName, month, year);
            return null;
        }
        
        String normalizedSearchName = normalizeNameForMatching(employeeName);
        log.debug("🔍 Buscando documento unificado: '{}' (normalizado: '{}') - {}/{}", 
            employeeName, normalizedSearchName, month, year);
        
        for (Map<String, Object> doc : allUnifiedDocs) {
            String docEmployeeName = (String) doc.get("employeeName");
            Object docMonthObj = doc.get("month");
            Object docYearObj = doc.get("year");
            String filePath = (String) doc.get("filePath");
            
            // Normalizar month e year (podem vir como Integer ou String)
            Integer docMonth = null;
            Integer docYear = null;
            if (docMonthObj instanceof Integer) {
                docMonth = (Integer) docMonthObj;
            } else if (docMonthObj != null) {
                try {
                    docMonth = Integer.parseInt(docMonthObj.toString());
                } catch (NumberFormatException e) {
                    log.warn("⚠️ Mês inválido no documento: {}", docMonthObj);
                }
            }
            if (docYearObj instanceof Integer) {
                docYear = (Integer) docYearObj;
            } else if (docYearObj != null) {
                try {
                    docYear = Integer.parseInt(docYearObj.toString());
                } catch (NumberFormatException e) {
                    log.warn("⚠️ Ano inválido no documento: {}", docYearObj);
                }
            }
            
            if (docEmployeeName != null && docMonth != null && docYear != null && filePath != null) {
                // Verificar correspondência de mês e ano primeiro (mais rápido)
                boolean monthMatch = docMonth.equals(month);
                boolean yearMatch = docYear.equals(year);
                
                if (monthMatch && yearMatch) {
                    // Normalizar nome do documento
                    String normalizedDocName = normalizeNameForMatching(docEmployeeName);
                    
                    // Estratégia 1: Correspondência exata (case-insensitive)
                    if (docEmployeeName.equalsIgnoreCase(employeeName)) {
                        log.debug("✅ Documento encontrado (exata): {} - {}/{}", docEmployeeName, month, year);
                        return filePath;
                    }
                    
                    // Estratégia 2: Correspondência normalizada exata
                    if (normalizedDocName.equals(normalizedSearchName)) {
                        log.debug("✅ Documento encontrado (normalizada exata): {} - {}/{}", docEmployeeName, month, year);
                        return filePath;
                    }
                    
                    // Estratégia 3: Correspondência por contenção
                    if (normalizedDocName.contains(normalizedSearchName) || 
                        normalizedSearchName.contains(normalizedDocName)) {
                        log.debug("✅ Documento encontrado (contenção): {} - {}/{}", docEmployeeName, month, year);
                        return filePath;
                    }
                    
                    // Estratégia 4: Correspondência por primeiro e último nome
                    String[] searchParts = normalizedSearchName.split("\\s+");
                    String[] docParts = normalizedDocName.split("\\s+");
                    if (searchParts.length >= 2 && docParts.length >= 2) {
                        String searchFirst = searchParts[0];
                        String searchLast = searchParts[searchParts.length - 1];
                        String docFirst = docParts[0];
                        String docLast = docParts[docParts.length - 1];
                        
                        if (searchFirst.equals(docFirst) && searchLast.equals(docLast)) {
                            log.debug("✅ Documento encontrado (primeiro/último): {} - {}/{}", docEmployeeName, month, year);
                            return filePath;
                        }
                    }
                }
            }
        }
        
        log.warn("⚠️ Documento não encontrado: '{}' - {}/{} (total de documentos: {})", 
            employeeName, month, year, allUnifiedDocs.size());
        return null;
    }
    
    /**
     * Normaliza nome para correspondência (remove acentos, normaliza espaços, converte para minúsculas)
     */
    private String normalizeNameForMatching(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "";
        }
        
        // Remover acentos
        String withoutAccents = java.text.Normalizer.normalize(name.trim(), java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        
        // Normalizar espaços e converter para minúsculas
        return withoutAccents
            .replaceAll("\\s+", " ")
            .trim()
            .toLowerCase();
    }
    
    /**
     * Normaliza CNPJ para uso em caminhos de arquivo (remove caracteres não numéricos)
     */
    private String normalizeCnpjForPath(String rawCnpj) {
        if (rawCnpj == null) {
            return null;
        }
        String digitsOnly = rawCnpj.replaceAll("\\D", "");
        return digitsOnly.length() == 14 ? digitsOnly : null;
    }
    
    /**
     * Normaliza nome do setor para uso em pastas do sistema de arquivos
     */
    private String normalizeSectorNameForPath(String sector) {
        if (sector == null || sector.trim().isEmpty()) {
            return "SETOR_NAO_INFORMADO";
        }
        String upper = sector.trim().toUpperCase();
        String normalized = java.text.Normalizer.normalize(upper, java.text.Normalizer.Form.NFD)
            .replaceAll("[\\p{M}]", "")
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+", "")
            .replaceAll("_+$", "");
        return normalized.isEmpty() ? "SETOR_NAO_INFORMADO" : normalized;
    }
    
    /**
     * Normaliza nome do funcionário para uso em pastas do sistema de arquivos
     */
    private String normalizeEmployeeNameForPath(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "FUNCIONARIO_NAO_INFORMADO";
        }
        String upper = name.trim().toUpperCase();
        String normalized = java.text.Normalizer.normalize(upper, java.text.Normalizer.Form.NFD)
            .replaceAll("[\\p{M}]", "")
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+", "")
            .replaceAll("_+$", "");
        
        // Limitar tamanho para evitar problemas com sistemas de arquivos (máximo 100 caracteres)
        if (normalized.length() > 100) {
            normalized = normalized.substring(0, 100);
        }
        
        return normalized.isEmpty() ? "FUNCIONARIO_NAO_INFORMADO" : normalized;
    }
    
    /**
     * Normaliza nome da empresa para uso em pastas do sistema de arquivos
     */
    private String normalizeCompanyNameForPath(String companyName) {
        if (companyName == null || companyName.trim().isEmpty()) {
            return "EMPRESA_NAO_INFORMADA";
        }
        String upper = companyName.trim().toUpperCase();
        String normalized = java.text.Normalizer.normalize(upper, java.text.Normalizer.Form.NFD)
            .replaceAll("[\\p{M}]", "")
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+", "")
            .replaceAll("_+$", "");
        
        // Limitar tamanho para evitar problemas com sistemas de arquivos (máximo 150 caracteres)
        if (normalized.length() > 150) {
            normalized = normalized.substring(0, 150);
        }
        
        return normalized.isEmpty() ? "EMPRESA_NAO_INFORMADA" : normalized;
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
     * Busca documentos unificados por múltiplos critérios
     * Aceita: nome do funcionário, empresa, período (MM/YYYY), CPF
     * Dá preferência aos dados do holerite quando disponível
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchUnifiedDocuments(
            @RequestParam(required = false) String search) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (search == null || search.trim().isEmpty()) {
                response.put("sucesso", false);
                response.put("mensagem", "Termo de busca é obrigatório");
                return ResponseEntity.badRequest().body(response);
            }
            
            log.info("🔍 Buscando documentos unificados com termo: '{}'", search);
            
            List<Map<String, Object>> documents = unifiedDocumentService.searchUnifiedDocuments(search);
            
            response.put("sucesso", true);
            response.put("mensagem", "Busca realizada com sucesso");
            response.put("documents", documents);
            response.put("total", documents.size());
            response.put("searchTerm", search);
            
            log.info("✅ Encontrados {} documentos unificados para busca: '{}'", documents.size(), search);
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
     * PROCESSAMENTO SÍNCRONO para exclusão em massa - retorna resultado imediato
     */
    @DeleteMapping("/delete-multiple")
    public ResponseEntity<Map<String, Object>> deleteMultipleUnifiedDocuments(@RequestBody List<String> fileNames) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🗑️ Excluindo documentos em lote: {} arquivo(s)", fileNames.size());
            
            if (fileNames == null || fileNames.isEmpty()) {
                response.put("sucesso", false);
                response.put("mensagem", "Lista de arquivos vazia");
                return ResponseEntity.badRequest().body(response);
            }
            
            int deletedCount = 0;
            int failedCount = 0;
            List<String> deletedFiles = new ArrayList<>();
            List<String> failedFiles = new ArrayList<>();
            
            // Processar exclusões de forma síncrona
            for (int i = 0; i < fileNames.size(); i++) {
                String fileName = fileNames.get(i);
                try {
                    boolean deleted = unifiedDocumentService.deleteUnifiedDocument(fileName);
                    if (deleted) {
                        deletedCount++;
                        deletedFiles.add(fileName);
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
            }
            
            log.info("✅ Exclusão em lote concluída: {} sucessos, {} falhas de {} total", 
                deletedCount, failedCount, fileNames.size());
            
            // Retornar resultado completo
            response.put("sucesso", true);
            response.put("mensagem", String.format("Exclusão concluída: %d sucesso(s), %d falha(s)", 
                deletedCount, failedCount));
            response.put("deletedCount", deletedCount);
            response.put("failedCount", failedCount);
            response.put("totalFiles", fileNames.size());
            response.put("deletedFiles", deletedFiles);
            if (!failedFiles.isEmpty()) {
                response.put("failedFiles", failedFiles);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao processar exclusão em lote: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao processar exclusão em lote: " + (e.getMessage() != null ? e.getMessage() : "Erro desconhecido"));
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Consulta o status de um job de exclusão
     */
    @GetMapping("/deletion-job/{jobId}/status")
    public ResponseEntity<Map<String, Object>> getDeletionJobStatus(@PathVariable java.util.UUID jobId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            com.z7design.secured_guard.model.DeletionJob job = unifiedDocumentService.getDeletionJobById(jobId);
            com.z7design.secured_guard.dto.DeletionJobDTO jobDTO = 
                com.z7design.secured_guard.dto.DeletionJobDTO.fromEntity(job);
            
            response.put("sucesso", true);
            response.put("job", jobDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao consultar status do job de exclusão {}: {}", jobId, e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Job não encontrado: " + jobId);
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Cancela um job de exclusão em processamento
     */
    @PostMapping("/deletion-job/{jobId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelDeletionJob(@PathVariable java.util.UUID jobId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            unifiedDocumentService.cancelDeletionJob(jobId);
            response.put("sucesso", true);
            response.put("mensagem", "Job de exclusão cancelado com sucesso");
            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            response.put("sucesso", false);
            response.put("mensagem", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("💥 Erro ao cancelar job de exclusão {}: {}", jobId, e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao cancelar job: " + e.getMessage());
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
     * AGORA COM PROCESSAMENTO ASSÍNCRONO - retorna imediatamente com jobId
     */
    @PostMapping("/create-batch")
    public ResponseEntity<Map<String, Object>> createBatchUnifiedDocuments(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false, defaultValue = "false") Boolean forceUnification) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            log.info("🎯 Criando job de unificação em lote: Mês={}, Ano={}, Force={}", month, year, forceUnification);
            
            // Obter usuário autenticado
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            java.util.UUID createdBy = null;
            if (auth != null && auth.getName() != null) {
                try {
                    com.z7design.secured_guard.model.User user = 
                        userRepository.findByUsername(auth.getName()).orElse(null);
                    if (user != null) {
                        createdBy = user.getId();
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Não foi possível obter ID do usuário: {}", e.getMessage());
                }
            }
            
            // Criar job (processamento assíncrono será iniciado automaticamente)
            com.z7design.secured_guard.model.UnificationJob job = 
                unifiedDocumentService.createUnificationJob(month, year, forceUnification, createdBy);
            
            // Retornar imediatamente com informações do job
            response.put("sucesso", true);
            response.put("mensagem", "Processamento iniciado! Use o jobId para acompanhar o progresso.");
            response.put("jobId", job.getId());
            response.put("status", job.getStatus().name());
            response.put("totalDocuments", job.getTotalDocuments());
            response.put("createdAt", job.getCreatedAt());
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            log.error("💥 Erro RuntimeException ao criar job de unificação em lote: {}", e.getMessage(), e);
            log.error("💥 Tipo de exceção: {}", e.getClass().getName());
            if (e.getCause() != null) {
                log.error("💥 Causa: {}", e.getCause().getMessage());
                log.error("💥 Tipo da causa: {}", e.getCause().getClass().getName());
            }
            
            response.put("sucesso", false);
            
            // Verificar se é erro de tabela não existente
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Erro desconhecido";
            String causeMessage = "";
            if (e.getCause() != null && e.getCause().getMessage() != null) {
                causeMessage = e.getCause().getMessage();
            }
            
            if (errorMessage.contains("unification_jobs") || 
                errorMessage.contains("não existe") ||
                errorMessage.contains("does not exist") ||
                causeMessage.contains("unification_jobs") ||
                causeMessage.contains("não existe") ||
                causeMessage.contains("does not exist") ||
                e.getClass().getName().contains("SQLGrammarException") ||
                e.getClass().getName().contains("PSQLException")) {
                response.put("mensagem", "ERRO: A tabela 'unification_jobs' não existe no banco de dados. " +
                    "Por favor, execute a migration V338__create_unification_jobs_table.sql para criar a tabela. " +
                    "Reinicie a aplicação para que o Flyway execute as migrations pendentes.");
                response.put("tipoErro", "MIGRATION_PENDENTE");
                response.put("detalhes", errorMessage);
            } else {
                response.put("mensagem", "Erro ao iniciar processamento: " + errorMessage);
                response.put("detalhes", errorMessage);
                if (!causeMessage.isEmpty()) {
                    response.put("causa", causeMessage);
                }
            }
            
            response.put("erro", e.getClass().getSimpleName());
            if (e.getCause() != null) {
                response.put("causaTipo", e.getCause().getClass().getSimpleName());
            }
            return ResponseEntity.internalServerError().body(response);
        } catch (Exception e) {
            log.error("💥 Erro Exception genérico ao criar job de unificação em lote: {}", e.getMessage(), e);
            log.error("💥 Tipo de exceção: {}", e.getClass().getName());
            if (e.getCause() != null) {
                log.error("💥 Causa: {}", e.getCause().getMessage());
                log.error("💥 Tipo da causa: {}", e.getCause().getClass().getName());
            }
            log.error("💥 Erro inesperado ao criar job de unificação em lote: {}", e.getMessage(), e);
            response.put("sucesso", false);
            
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Erro desconhecido";
            String causeMessage = "";
            if (e.getCause() != null && e.getCause().getMessage() != null) {
                causeMessage = e.getCause().getMessage();
            }
            
            response.put("mensagem", "Erro inesperado ao iniciar processamento: " + errorMessage);
            response.put("erro", e.getClass().getSimpleName());
            response.put("detalhes", errorMessage);
            
            if (!causeMessage.isEmpty()) {
                response.put("causa", causeMessage);
                if (e.getCause() != null) {
                    response.put("causaTipo", e.getCause().getClass().getSimpleName());
                }
            }
            
            // Verificar se é erro de tabela não existente mesmo em Exception genérica
            if (errorMessage.contains("unification_jobs") || 
                errorMessage.contains("não existe") ||
                errorMessage.contains("does not exist") ||
                causeMessage.contains("unification_jobs") ||
                causeMessage.contains("não existe") ||
                causeMessage.contains("does not exist")) {
                response.put("tipoErro", "MIGRATION_PENDENTE");
                response.put("mensagem", "ERRO: A tabela 'unification_jobs' não existe no banco de dados. " +
                    "Por favor, execute a migration V338__create_unification_jobs_table.sql para criar a tabela. " +
                    "Reinicie a aplicação para que o Flyway execute as migrations pendentes.");
            }
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Consulta o status de um job de unificação
     */
    @GetMapping("/job/{jobId}/status")
    public ResponseEntity<Map<String, Object>> getJobStatus(@PathVariable java.util.UUID jobId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            com.z7design.secured_guard.model.UnificationJob job = unifiedDocumentService.getJobById(jobId);
            com.z7design.secured_guard.dto.UnificationJobDTO jobDTO = 
                com.z7design.secured_guard.dto.UnificationJobDTO.fromEntity(job);
            
            response.put("sucesso", true);
            response.put("job", jobDTO);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("💥 Erro ao consultar status do job {}: {}", jobId, e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Job não encontrado: " + jobId);
            response.put("erro", e.getClass().getSimpleName());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Cancela um job em processamento
     */
    @PostMapping("/job/{jobId}/cancel")
    public ResponseEntity<Map<String, Object>> cancelJob(@PathVariable java.util.UUID jobId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            unifiedDocumentService.cancelJob(jobId);
            response.put("sucesso", true);
            response.put("mensagem", "Job cancelado com sucesso");
            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            response.put("sucesso", false);
            response.put("mensagem", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("💥 Erro ao cancelar job {}: {}", jobId, e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro ao cancelar job: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Organiza documentos unificados por Empresa/Setor/Ano/Mês
     * OTIMIZADO: Com timeout e proteção contra loops
     */
    @GetMapping("/organization")
    public ResponseEntity<?> getUnifiedDocumentsOrganization() {
        long startTime = System.currentTimeMillis();
        try {
            log.info("📋 Organizando documentos unificados por Empresa/Setor/Ano/Mês...");
            
            // Timeout de segurança: máximo 30 segundos
            long timeout = 30000; // 30 segundos
            
            com.z7design.secured_guard.dto.PayslipOrganizationResponse response = 
                unifiedDocumentService.organizeUnifiedDocumentsByCompany();
            
            long elapsed = System.currentTimeMillis() - startTime;
            log.info("✅ Organização concluída em {}ms", elapsed);
            
            if (elapsed > timeout) {
                log.warn("⚠️ Organização demorou mais que o esperado: {}ms", elapsed);
            }
            
            return ResponseEntity.ok(response);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            log.error("💥 Erro ao organizar documentos unificados (entidade não encontrada): {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erro ao organizar documentos: referência a entidade inexistente");
            errorResponse.put("message", "Alguns documentos unificados referenciam payslips que não existem mais no banco de dados");
            return ResponseEntity.status(500).body(errorResponse);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            log.error("💥 Erro ao organizar documentos unificados após {}ms: {}", elapsed, e.getMessage(), e);
            
            // Verificar se foi timeout baseado no tempo decorrido
            if (elapsed > 30000) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Timeout");
                errorResponse.put("message", "A operação demorou muito para responder. Tente novamente.");
                return ResponseEntity.status(504).body(errorResponse);
            }
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erro ao organizar documentos unificados");
            errorResponse.put("message", e.getMessage() != null ? e.getMessage() : "Erro desconhecido");
            return ResponseEntity.status(500).body(errorResponse);
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


    /**
     * Endpoint de debug para verificar empresas disponíveis
     */
    @GetMapping("/debug/companies")
    public ResponseEntity<Map<String, Object>> debugCompanies() {
        Map<String, Object> response = new HashMap<>();
        try {
            log.info("🔍 DEBUG: Listando empresas disponíveis...");
            
            com.z7design.secured_guard.dto.PayslipOrganizationResponse organization = 
                unifiedDocumentService.organizeUnifiedDocumentsByCompany();
            
            List<Map<String, Object>> companies = new ArrayList<>();
            if (organization.getCompanies() != null) {
                for (com.z7design.secured_guard.dto.PayslipOrganizationResponse.CompanyGroup company : organization.getCompanies()) {
                    Map<String, Object> companyInfo = new HashMap<>();
                    companyInfo.put("companyName", company.getCompanyName());
                    companyInfo.put("companyCnpj", company.getCompanyCnpj());
                    companyInfo.put("companySigla", company.getCompanySigla());
                    companyInfo.put("totalPayslips", company.getTotalPayslips());
                    companyInfo.put("totalSectors", company.getSectors() != null ? company.getSectors().size() : 0);
                    companies.add(companyInfo);
                }
            }
            
            response.put("sucesso", true);
            response.put("totalCompanies", companies.size());
            response.put("companies", companies);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("💥 Erro no debug de empresas: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro no debug: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Endpoint de debug para verificar setores disponíveis
     */
    @GetMapping("/debug/sectors")
    public ResponseEntity<Map<String, Object>> debugSectors() {
        Map<String, Object> response = new HashMap<>();
        try {
            log.info("🔍 DEBUG: Listando setores disponíveis...");
            
            com.z7design.secured_guard.dto.PayslipOrganizationResponse organization = 
                unifiedDocumentService.organizeUnifiedDocumentsByCompany();
            
            Set<String> uniqueSectors = new java.util.HashSet<>();
            List<Map<String, Object>> sectorsWithDetails = new ArrayList<>();
            
            if (organization.getCompanies() != null) {
                for (com.z7design.secured_guard.dto.PayslipOrganizationResponse.CompanyGroup company : organization.getCompanies()) {
                    if (company.getSectors() != null) {
                        for (com.z7design.secured_guard.dto.PayslipOrganizationResponse.SectorGroup sector : company.getSectors()) {
                            if (sector.getSectorName() != null) {
                                uniqueSectors.add(sector.getSectorName());
                                
                                Map<String, Object> sectorInfo = new HashMap<>();
                                sectorInfo.put("sectorName", sector.getSectorName());
                                sectorInfo.put("sectorNameNormalized", normalizeNameForMatching(sector.getSectorName()));
                                sectorInfo.put("companyName", company.getCompanyName());
                                sectorInfo.put("totalPayslips", sector.getTotalPayslips());
                                sectorInfo.put("totalPeriods", sector.getPeriods() != null ? sector.getPeriods().size() : 0);
                                sectorsWithDetails.add(sectorInfo);
                            }
                        }
                    }
                }
            }
            
            response.put("sucesso", true);
            response.put("totalUniqueSectors", uniqueSectors.size());
            response.put("uniqueSectors", uniqueSectors.stream().sorted().collect(java.util.stream.Collectors.toList()));
            response.put("sectorsWithDetails", sectorsWithDetails);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("💥 Erro no debug de setores: {}", e.getMessage(), e);
            response.put("sucesso", false);
            response.put("mensagem", "Erro no debug: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
} 