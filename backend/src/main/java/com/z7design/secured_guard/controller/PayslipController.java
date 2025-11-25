package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CompanyTypeOrganizationResponse;
import com.z7design.secured_guard.dto.EnvioRequest;
import com.z7design.secured_guard.dto.PayslipOrganizationResponse;
import com.z7design.secured_guard.dto.PayslipProcessedFileResponse;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.service.PayslipProcessingService;
import com.z7design.secured_guard.service.PayslipService;
import com.z7design.secured_guard.service.ExtractDataHoleritesService;
import com.z7design.secured_guard.util.AuthenticatedCpfResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/payslips")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payslip Management", description = "APIs for managing payslips")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "http://localhost:5173"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class PayslipController {

    private final PayslipService payslipService;
    private final PayslipRepository payslipRepository;
    private final PayslipProcessingService payslipProcessingService;
    private final ExtractDataHoleritesService extractDataHoleritesService;
    private final AuthenticatedCpfResolver authenticatedCpfResolver;

    // ==================== ENDPOINTS UNIFICADOS ====================

    @PostMapping("/upload-and-send")
    @Operation(summary = "Upload, process and send payslips automatically")
    public ResponseEntity<PayslipProcessingService.ProcessingResult> uploadProcessAndSend(
            @RequestParam("file") MultipartFile file,
            @RequestParam("tipo") String tipo,
            @RequestParam(value = "assunto", required = false) String assunto,
            @RequestParam(value = "mensagem", required = false) String mensagem,
            @RequestParam(value = "funcionarioId", required = false) String funcionarioId,
            @RequestParam(value = "funcionarioIds", required = false) List<String> funcionarioIds) {
        
        log.info("🚀 Recebendo upload e envio unificado: {} - Tipo: {}", file.getOriginalFilename(), tipo);
        
        try {
            // Criar request de envio
            EnvioRequest envioRequest = new EnvioRequest();
            envioRequest.setTipo(tipo);
            envioRequest.setAssunto(assunto);
            envioRequest.setMensagem(mensagem);
            envioRequest.setFuncionarioId(funcionarioId);
            envioRequest.setFuncionarioIds(funcionarioIds);
            
            // Processar e enviar
            PayslipProcessingService.ProcessingResult result = payslipProcessingService.uploadProcessAndSend(file, envioRequest);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("❌ Erro no upload e envio unificado: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/upload-and-send-async")
    @Operation(summary = "Upload, process and send payslips asynchronously")
    public ResponseEntity<Map<String, Object>> uploadProcessAndSendAsync(
            @RequestParam("file") MultipartFile file,
            @RequestParam("tipo") String tipo,
            @RequestParam(value = "assunto", required = false) String assunto,
            @RequestParam(value = "mensagem", required = false) String mensagem,
            @RequestParam(value = "funcionarioId", required = false) String funcionarioId,
            @RequestParam(value = "funcionarioIds", required = false) List<String> funcionarioIds) {
        
        log.info("🔄 Recebendo upload e envio assíncrono: {} - Tipo: {}", file.getOriginalFilename(), tipo);
        
        try {
            // Gerar session ID
            String sessionId = UUID.randomUUID().toString();
            
            // Criar request de envio
            EnvioRequest envioRequest = new EnvioRequest();
            envioRequest.setTipo(tipo);
            envioRequest.setAssunto(assunto);
            envioRequest.setMensagem(mensagem);
            envioRequest.setFuncionarioId(funcionarioId);
            envioRequest.setFuncionarioIds(funcionarioIds);
            
            // Iniciar processamento assíncrono
            payslipProcessingService.processAsync(file, envioRequest);
            
            return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "status", "PROCESSING",
                "message", "Processamento iniciado. Use /api/payslips/status/{sessionId} para acompanhar o progresso."
            ));
            
        } catch (Exception e) {
            log.error("❌ Erro no upload e envio assíncrono: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/status/{sessionId}")
    @Operation(summary = "Get processing status by session ID")
    public ResponseEntity<PayslipProcessingService.ProcessingStatus> getStatus(@PathVariable String sessionId) {
        log.info("📊 Verificando status da sessão: {}", sessionId);
        
        PayslipProcessingService.ProcessingStatus status = payslipProcessingService.getStatus(sessionId);
        return ResponseEntity.ok(status);
    }

    // ==================== ENDPOINTS EXISTENTES ====================

    @PostMapping("/upload")
    @Operation(summary = "Upload and process one or more PDFs containing multiple payslips (up to 3 files)")
    public ResponseEntity<?> uploadPayslips(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        try {
            // Log inicial para debug
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("📥 RECEBENDO UPLOAD DE HOLERITES");
            log.info("   Parâmetro 'file': {}", file != null ? file.getOriginalFilename() + " (" + file.getSize() + " bytes)" : "null");
            log.info("   Parâmetro 'files': {}", files != null ? files.size() + " arquivo(s)" : "null");
            if (files != null && !files.isEmpty()) {
                for (int i = 0; i < files.size(); i++) {
                    MultipartFile f = files.get(i);
                    log.info("      [{}/{}] {} ({} bytes)", i + 1, files.size(), 
                        f != null ? f.getOriginalFilename() : "null", 
                        f != null ? f.getSize() : 0);
                }
            }
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            // Determinar quais arquivos processar
            List<MultipartFile> filesToProcess = new ArrayList<>();
            
            // Verificar se há múltiplos arquivos no parâmetro 'files'
            if (files != null && !files.isEmpty()) {
                log.info("📦 Recebidos {} arquivo(s) via parâmetro 'files'", files.size());
                int validCount = 0;
                for (MultipartFile f : files) {
                    if (f != null && !f.isEmpty()) {
                        filesToProcess.add(f);
                        validCount++;
                        log.info("   ✅ Arquivo {} adicionado: {} ({} bytes)", validCount, f.getOriginalFilename(), f.getSize());
                    } else {
                        log.warn("   ⚠️ Arquivo nulo ou vazio ignorado na lista 'files'");
                    }
                }
                log.info("   📊 Total de arquivos válidos em 'files': {}/{}", validCount, files.size());
            }
            
            // Se não encontrou arquivos em 'files', verificar 'file' (compatibilidade)
            if (filesToProcess.isEmpty()) {
                if (file != null && !file.isEmpty()) {
                    log.info("📦 Recebido 1 arquivo via parâmetro 'file': {} ({} bytes)", file.getOriginalFilename(), file.getSize());
                    filesToProcess.add(file);
                } else {
                    log.warn("⚠️ Nenhum arquivo válido encontrado nem em 'files' nem em 'file'");
                }
            }
            
            // Validação crítica: garantir que temos arquivos para processar
            if (filesToProcess.isEmpty()) {
                log.error("❌ CRÍTICO: Nenhum arquivo válido para processar após validação!");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                        "error", "Nenhum arquivo válido fornecido",
                        "message", "É necessário fornecer pelo menos um arquivo válido",
                        "debug", Map.of(
                            "fileParam", file != null ? "presente" : "ausente",
                            "filesParam", files != null ? files.size() + " arquivo(s)" : "ausente"
                        )
                    ));
            }
            
            log.info("✅ Total de arquivos válidos para processar: {}", filesToProcess.size());
            
            // Validar quantidade máxima (até 3 arquivos por usuário para manter performance e precisão)
            if (filesToProcess.size() > 3) {
                log.warn("⚠️ Muitos arquivos recebidos: {} (máximo 3 permitidos)", filesToProcess.size());
                log.warn("   Processando apenas os primeiros 3 arquivos");
                filesToProcess = new ArrayList<>(filesToProcess.subList(0, 3));
            }
            
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("📤 INICIANDO PROCESSAMENTO DE {} ARQUIVO(S)", filesToProcess.size());
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            for (int i = 0; i < filesToProcess.size(); i++) {
                MultipartFile f = filesToProcess.get(i);
                log.info("   [{}/{}] {} ({} bytes)", i + 1, filesToProcess.size(), f.getOriginalFilename(), f.getSize());
            }
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            // Processar arquivos SEQUENCIALMENTE (um por vez) para garantir precisão
            List<Payslip> allPayslips = new ArrayList<>();
            List<String> errors = new ArrayList<>();
            int totalPages = 0;
            int totalFilesProcessed = 0;
            int filesBlocked = 0; // Contador para arquivos bloqueados
            Map<String, Integer> pagesPerFile = new HashMap<>();
            
            // Usar filesToProcess diretamente (já validados acima)
            List<MultipartFile> validFiles = filesToProcess;
            
            // Processar arquivos SEQUENCIALMENTE (um por vez) para garantir precisão e evitar problemas de memória
            log.info("📊 Processando {} arquivo(s) válido(s) SEQUENCIALMENTE (um por vez)", validFiles.size());
            log.info("   ℹ️ Cada arquivo será processado completamente antes de iniciar o próximo");
            log.info("   ℹ️ Processamento sequencial garante precisão e evita problemas de memória");
            
            for (int i = 0; i < validFiles.size(); i++) {
                MultipartFile f = validFiles.get(i);
                String originalFilename = f.getOriginalFilename();
                
                try {
                    log.info("");
                    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    log.info("📤 ARQUIVO [{}/{}]: {}", i + 1, validFiles.size(), originalFilename);
                    log.info("   Tamanho: {} bytes", f.getSize());
                    log.info("   Iniciando processamento...");
                    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    
                    // Carregar arquivo em memória para verificação de hash
                    byte[] fileBytes = f.getBytes();
                    
                    // Garantir que o arquivo ainda está acessível
                    if (fileBytes.length == 0) {
                        throw new IllegalArgumentException("Arquivo está vazio após carregamento");
                    }
                    
                    // Verificar se o arquivo completo já foi processado anteriormente
                    log.info("🔍 Verificando se arquivo já foi processado anteriormente...");
                    boolean alreadyProcessed = payslipService.isFileAlreadyProcessed(fileBytes, originalFilename);
                    log.info("   Resultado da verificação: {}", alreadyProcessed ? "JÁ PROCESSADO - BLOQUEANDO" : "NÃO PROCESSADO - PERMITINDO");
                    
                    if (alreadyProcessed) {
                        log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                        log.warn("⚠️ [{}/{}] ARQUIVO JÁ PROCESSADO - BLOQUEANDO PROCESSAMENTO", 
                            i + 1, validFiles.size());
                        log.warn("   Arquivo: {}", originalFilename);
                        log.warn("   Status: Já foi processado anteriormente e não foi excluído do sistema.");
                        log.warn("   Ação: Arquivo NÃO será processado novamente.");
                        log.warn("   ℹ️ Se o arquivo foi modificado, o sistema detectará automaticamente e criará uma nova versão.");
                        log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                        errors.add("Arquivo " + originalFilename + ": Já foi processado anteriormente. Se houver alterações no conteúdo, uma nova versão será criada automaticamente.");
                        pagesPerFile.put(originalFilename, 0);
                        filesBlocked++; // Incrementar contador de arquivos bloqueados
                        continue; // Pular para o próximo arquivo - NÃO PROCESSAR
                    }
                    
                    log.info("✅ Arquivo não foi processado anteriormente ou foi modificado. Processando...");
                    
                    long startTime = System.currentTimeMillis();
                    
                    log.info("   🔄 Chamando processPayslipPDF para arquivo: {} ({} bytes)", originalFilename, fileBytes.length);
                    List<Payslip> payslips = payslipService.processPayslipPDF(f);
                    long processingTime = System.currentTimeMillis() - startTime;
                    
                    log.info("   📊 Resultado do processamento: {} holerite(s) retornado(s)", 
                        payslips != null ? payslips.size() : 0);
                    
                    if (payslips == null || payslips.isEmpty()) {
                        log.warn("⚠️ [{}/{}] Arquivo {} processado mas nenhum holerite foi extraído", 
                            i + 1, validFiles.size(), originalFilename);
                        errors.add("Arquivo " + originalFilename + ": Nenhum holerite extraído (pode estar vazio ou corrompido)");
                        pagesPerFile.put(originalFilename, 0);
                    } else {
                        allPayslips.addAll(payslips);
                        int pagesInFile = payslips.size();
                        totalPages += pagesInFile;
                        totalFilesProcessed++;
                        pagesPerFile.put(originalFilename, pagesInFile);
                        
                        log.info("✅ [{}/{}] Arquivo {} processado com SUCESSO:", 
                            i + 1, validFiles.size(), originalFilename);
                        log.info("   📄 Holerites extraídos: {}", pagesInFile);
                        log.info("   ⏱️ Tempo de processamento: {}ms ({})", 
                            processingTime, String.format("%.2f", processingTime / 1000.0) + "s");
                        log.info("   ✅ Arquivo concluído - Próximo arquivo será processado agora");
                    }
                } catch (Exception e) {
                    log.error("❌ [{}/{}] ERRO ao processar arquivo {}: {}", 
                        i + 1, validFiles.size(), originalFilename, e.getMessage(), e);
                    errors.add("Erro ao processar " + originalFilename + ": " + e.getMessage());
                    pagesPerFile.put(originalFilename, 0);
                    // CONTINUAR processando próximos arquivos mesmo se este falhar
                    log.info("   ⏭️ Continuando com próximo arquivo...");
                }
            }
            
            log.info("");
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("📊 RESUMO FINAL DO PROCESSAMENTO DE TODOS OS ARQUIVOS:");
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("   📁 Total de arquivos recebidos: {}", filesToProcess.size());
            log.info("   ✅ Arquivos processados com sucesso: {}/{}", totalFilesProcessed, validFiles.size());
            log.info("   🚫 Arquivos bloqueados (já processados): {}", filesBlocked);
            log.info("   📄 Total de holerites extraídos: {}", allPayslips.size());
            log.info("   📑 Total de PÁGINAS processadas em TODOS os arquivos: {}", totalPages);
            log.info("   ⚠️ Erros encontrados: {}", errors.size());
            log.info("");
            log.info("   📋 DETALHAMENTO POR ARQUIVO:");
            for (Map.Entry<String, Integer> entry : pagesPerFile.entrySet()) {
                log.info("      • {}: {} página(s)/holerite(s)", entry.getKey(), entry.getValue());
            }
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            
            if (allPayslips.isEmpty() && !errors.isEmpty()) {
                log.warn("⚠️ Nenhum holerite foi processado dos arquivos enviados, mas erros foram encontrados.");
                Map<String, Object> response = new HashMap<>();
                response.put("message", "Nenhum holerite foi processado. Verifique os erros.");
                response.put("payslips", Collections.emptyList());
                response.put("errors", errors);
                response.put("totalPayslips", 0);
                response.put("totalPages", 0);
                response.put("totalFiles", filesToProcess.size());
                response.put("filesProcessed", totalFilesProcessed);
                response.put("filesBlocked", filesBlocked);
                response.put("pagesPerFile", pagesPerFile);
                return ResponseEntity.ok(response);
            } else if (allPayslips.isEmpty()) {
                log.warn("⚠️ Nenhum holerite foi processado dos arquivos enviados");
                Map<String, Object> response = new HashMap<>();
                response.put("message", "Nenhum holerite foi processado");
                response.put("payslips", Collections.emptyList());
                response.put("warning", "Os arquivos podem estar vazios, corrompidos ou não conter holerites válidos");
                if (!errors.isEmpty()) {
                    response.put("errors", errors);
                }
                response.put("filesBlocked", filesBlocked);
                return ResponseEntity.ok(response);
            }
            
            // Preparar resposta com informações detalhadas
            Map<String, Object> response = new HashMap<>();
            response.put("payslips", allPayslips);
            response.put("totalPayslips", allPayslips.size());
            response.put("totalPages", totalPages); // Total de páginas processadas em TODOS os arquivos
            response.put("totalFiles", filesToProcess.size());
            response.put("filesProcessed", totalFilesProcessed);
            response.put("filesBlocked", filesBlocked);
            response.put("pagesPerFile", pagesPerFile);
            
            // Sempre incluir erros na resposta (mesmo que vazio) para o frontend saber
            if (!errors.isEmpty()) {
                response.put("errors", errors);
                response.put("message", "Processamento concluído com alguns avisos/erros. " + allPayslips.size() + " holerite(s) extraído(s).");
            } else {
                response.put("message", "Processamento concluído com sucesso! " + allPayslips.size() + " holerite(s) extraído(s) de " + totalPages + " página(s) em " + totalFilesProcessed + " arquivo(s)");
            }
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("❌ Erro de validação ao processar upload: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Erro de validação", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Erro inesperado ao processar upload de holerite: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erro interno", "message", "Erro ao processar o arquivo: " + e.getMessage()));
        }
    }

    @PostMapping("/debug")
    public ResponseEntity<Map<String, Object>> debugPayslip(@RequestParam("file") MultipartFile file) throws IOException {
        log.info("Debug: Analisando conteúdo do PDF: {}", file.getOriginalFilename());
        Map<String, Object> debugInfo = payslipService.debugPayslipContent(file);
        return ResponseEntity.ok(debugInfo);
    }

    @GetMapping
    public ResponseEntity<List<Payslip>> getAllPayslips() {
        log.info("🔍 Iniciando busca de todos os payslips...");
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));
        Optional<String> resolvedCpf = authenticatedCpfResolver.resolve(auth);
        List<Payslip> payslips;
        if (isColaborador) {
            if (resolvedCpf.isEmpty()) {
                log.warn("⚠️ Não foi possível determinar o CPF do colaborador {}", auth.getName());
                payslips = Collections.emptyList();
            } else {
                log.info("👤 Usuário colaborador, buscando payslips por CPF: {}", resolvedCpf.get());
                payslips = payslipService.getPayslipsByCpf(resolvedCpf.get());
            }
        } else {
            log.info("👑 Usuário admin, buscando todos os payslips");
            payslips = payslipService.getAllPayslips();
        }
        log.info("✅ Payslips encontrados: {} registros", payslips.size());
        if (payslips.size() > 0) {
            log.info("📋 Primeiro payslip: ID={}, Nome={}, CPF={}, Mês={}, Ano={}", 
                payslips.get(0).getId(), payslips.get(0).getEmployeeName(), 
                payslips.get(0).getCpf(), payslips.get(0).getMonth(), payslips.get(0).getYear());
        }
        return ResponseEntity.ok(payslips);
    }

    @GetMapping("/organization")
    public ResponseEntity<PayslipOrganizationResponse> getPayslipOrganization() {
        try {
            log.info("📊 Iniciando organização de holerites por empresa/setor/período...");
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth == null) {
                log.error("Autenticação é null ao organizar holerites");
                PayslipOrganizationResponse emptyResponse = new PayslipOrganizationResponse();
                emptyResponse.setCompanies(Collections.emptyList());
                emptyResponse.setTotalCompanies(0);
                emptyResponse.setTotalSectors(0);
                emptyResponse.setTotalPayslips(0);
                emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
                return ResponseEntity.ok(emptyResponse);
            }
            
            boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));
            Optional<String> resolvedCpf = authenticatedCpfResolver.resolve(auth);

            List<Payslip> payslips;
            try {
                if (isColaborador) {
                    if (resolvedCpf.isEmpty()) {
                        log.warn("⚠️ Não foi possível determinar o CPF do colaborador {} para organização de holerites", auth.getName());
                        payslips = Collections.emptyList();
                    } else {
                        log.info("👤 Usuário colaborador, organizando holerites por CPF: {}", resolvedCpf.get());
                        payslips = payslipService.getPayslipsByCpf(resolvedCpf.get());
                    }
                } else {
                    log.info("👑 Usuário admin, organizando todos os holerites por empresa");
                    payslips = payslipService.getAllPayslips();
                }
            } catch (org.springframework.dao.DataAccessException e) {
                log.error("Erro de acesso ao banco de dados ao buscar holerites: {}", e.getMessage(), e);
                payslips = Collections.emptyList();
            } catch (Exception e) {
                log.error("Erro ao buscar holerites: {}", e.getMessage(), e);
                payslips = Collections.emptyList();
            }

            try {
                PayslipOrganizationResponse response = payslipService.organizePayslipsByCompany(payslips);
                log.info("✅ Organização concluída: {} empresas, {} setores, {} holerites",
                    response.getTotalCompanies(), response.getTotalSectors(), response.getTotalPayslips());
                return ResponseEntity.ok(response);
            } catch (org.springframework.dao.DataAccessException e) {
                log.error("Erro de acesso ao banco de dados ao organizar holerites: {}", e.getMessage(), e);
                PayslipOrganizationResponse emptyResponse = new PayslipOrganizationResponse();
                emptyResponse.setCompanies(Collections.emptyList());
                emptyResponse.setTotalCompanies(0);
                emptyResponse.setTotalSectors(0);
                emptyResponse.setTotalPayslips(0);
                emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
                return ResponseEntity.ok(emptyResponse);
            } catch (Exception e) {
                log.error("Erro ao organizar holerites: {}", e.getMessage(), e);
                PayslipOrganizationResponse emptyResponse = new PayslipOrganizationResponse();
                emptyResponse.setCompanies(Collections.emptyList());
                emptyResponse.setTotalCompanies(0);
                emptyResponse.setTotalSectors(0);
                emptyResponse.setTotalPayslips(0);
                emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
                return ResponseEntity.ok(emptyResponse);
            }
        } catch (Exception e) {
            log.error("Erro geral ao organizar holerites: {}", e.getMessage(), e);
            // Retornar resposta vazia ao invés de erro 500 para não quebrar o frontend
            PayslipOrganizationResponse emptyResponse = new PayslipOrganizationResponse();
            emptyResponse.setCompanies(Collections.emptyList());
            emptyResponse.setTotalCompanies(0);
            emptyResponse.setTotalSectors(0);
            emptyResponse.setTotalPayslips(0);
            emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
            return ResponseEntity.ok(emptyResponse);
        }
    }

    @GetMapping("/organization-by-type")
    @Operation(summary = "Organizar holerites por tipo de empresa", description = "Organiza holerites por tipo (Terceirização vs Vigilância e ADM), depois por empresa, setor e período")
    public ResponseEntity<CompanyTypeOrganizationResponse> getPayslipOrganizationByType() {
        try {
            log.info("📊 Iniciando organização de holerites por tipo de empresa...");
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth == null) {
                log.error("Autenticação é null ao organizar holerites por tipo");
                CompanyTypeOrganizationResponse emptyResponse = new CompanyTypeOrganizationResponse();
                emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
                emptyResponse.setTotalPayslips(0);
                emptyResponse.setTotalCompanies(0);
                emptyResponse.setTotalSectors(0);
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyTerceirizacao = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyTerceirizacao.setTypeName("Terceirização");
                emptyTerceirizacao.setTypeCode("TERCEIRIZACAO");
                emptyTerceirizacao.setTotalCompanies(0);
                emptyTerceirizacao.setTotalPayslips(0);
                emptyTerceirizacao.setTotalSectors(0);
                emptyTerceirizacao.setCompanies(Collections.emptyList());
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyVigilancia = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyVigilancia.setTypeName("Vigilância");
                emptyVigilancia.setTypeCode("VIGILANCIA");
                emptyVigilancia.setTotalCompanies(0);
                emptyVigilancia.setTotalPayslips(0);
                emptyVigilancia.setTotalSectors(0);
                emptyVigilancia.setCompanies(Collections.emptyList());
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyAdministrativo = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyAdministrativo.setTypeName("Administrativo");
                emptyAdministrativo.setTypeCode("ADMINISTRATIVO");
                emptyAdministrativo.setTotalCompanies(0);
                emptyAdministrativo.setTotalPayslips(0);
                emptyAdministrativo.setTotalSectors(0);
                emptyAdministrativo.setCompanies(Collections.emptyList());
                
                emptyResponse.setTerceirizacao(emptyTerceirizacao);
                emptyResponse.setVigilancia(emptyVigilancia);
                emptyResponse.setAdministrativo(emptyAdministrativo);
                return ResponseEntity.ok(emptyResponse);
            }
            
            boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));
            Optional<String> resolvedCpf = authenticatedCpfResolver.resolve(auth);

            List<Payslip> payslips;
            try {
                if (isColaborador) {
                    if (resolvedCpf.isEmpty()) {
                        log.warn("⚠️ Não foi possível determinar o CPF do colaborador {} para organização por tipo", auth.getName());
                        payslips = Collections.emptyList();
                    } else {
                        log.info("👤 Usuário colaborador, organizando holerites por CPF: {}", resolvedCpf.get());
                        payslips = payslipService.getPayslipsByCpf(resolvedCpf.get());
                    }
                } else {
                    log.info("👑 Usuário admin, organizando todos os holerites por tipo");
                    payslips = payslipService.getAllPayslips();
                }
            } catch (org.springframework.dao.DataAccessException e) {
                log.error("Erro de acesso ao banco de dados ao buscar holerites por tipo: {}", e.getMessage(), e);
                payslips = Collections.emptyList();
            } catch (Exception e) {
                log.error("Erro ao buscar holerites por tipo: {}", e.getMessage(), e);
                payslips = Collections.emptyList();
            }

            try {
                CompanyTypeOrganizationResponse response = payslipService.organizePayslipsByCompanyType(payslips);
                log.info("✅ Organização por tipo concluída: {} holerites, {} empresas, {} setores",
                    response.getTotalPayslips(), response.getTotalCompanies(), response.getTotalSectors());
                return ResponseEntity.ok(response);
            } catch (org.springframework.dao.DataAccessException e) {
                log.error("Erro de acesso ao banco de dados ao organizar holerites por tipo: {}", e.getMessage(), e);
                CompanyTypeOrganizationResponse emptyResponse = new CompanyTypeOrganizationResponse();
                emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
                emptyResponse.setTotalPayslips(0);
                emptyResponse.setTotalCompanies(0);
                emptyResponse.setTotalSectors(0);
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyTerceirizacao = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyTerceirizacao.setTypeName("Terceirização");
                emptyTerceirizacao.setTypeCode("TERCEIRIZACAO");
                emptyTerceirizacao.setTotalCompanies(0);
                emptyTerceirizacao.setTotalPayslips(0);
                emptyTerceirizacao.setTotalSectors(0);
                emptyTerceirizacao.setCompanies(Collections.emptyList());
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyVigilancia = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyVigilancia.setTypeName("Vigilância");
                emptyVigilancia.setTypeCode("VIGILANCIA");
                emptyVigilancia.setTotalCompanies(0);
                emptyVigilancia.setTotalPayslips(0);
                emptyVigilancia.setTotalSectors(0);
                emptyVigilancia.setCompanies(Collections.emptyList());
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyAdministrativo = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyAdministrativo.setTypeName("Administrativo");
                emptyAdministrativo.setTypeCode("ADMINISTRATIVO");
                emptyAdministrativo.setTotalCompanies(0);
                emptyAdministrativo.setTotalPayslips(0);
                emptyAdministrativo.setTotalSectors(0);
                emptyAdministrativo.setCompanies(Collections.emptyList());
                
                emptyResponse.setTerceirizacao(emptyTerceirizacao);
                emptyResponse.setVigilancia(emptyVigilancia);
                emptyResponse.setAdministrativo(emptyAdministrativo);
                return ResponseEntity.ok(emptyResponse);
            } catch (Exception e) {
                log.error("Erro ao organizar holerites por tipo: {}", e.getMessage(), e);
                CompanyTypeOrganizationResponse emptyResponse = new CompanyTypeOrganizationResponse();
                emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
                emptyResponse.setTotalPayslips(0);
                emptyResponse.setTotalCompanies(0);
                emptyResponse.setTotalSectors(0);
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyTerceirizacao = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyTerceirizacao.setTypeName("Terceirização");
                emptyTerceirizacao.setTypeCode("TERCEIRIZACAO");
                emptyTerceirizacao.setTotalCompanies(0);
                emptyTerceirizacao.setTotalPayslips(0);
                emptyTerceirizacao.setTotalSectors(0);
                emptyTerceirizacao.setCompanies(Collections.emptyList());
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyVigilancia = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyVigilancia.setTypeName("Vigilância");
                emptyVigilancia.setTypeCode("VIGILANCIA");
                emptyVigilancia.setTotalCompanies(0);
                emptyVigilancia.setTotalPayslips(0);
                emptyVigilancia.setTotalSectors(0);
                emptyVigilancia.setCompanies(Collections.emptyList());
                
                CompanyTypeOrganizationResponse.CompanyTypeGroup emptyAdministrativo = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
                emptyAdministrativo.setTypeName("Administrativo");
                emptyAdministrativo.setTypeCode("ADMINISTRATIVO");
                emptyAdministrativo.setTotalCompanies(0);
                emptyAdministrativo.setTotalPayslips(0);
                emptyAdministrativo.setTotalSectors(0);
                emptyAdministrativo.setCompanies(Collections.emptyList());
                
                emptyResponse.setTerceirizacao(emptyTerceirizacao);
                emptyResponse.setVigilancia(emptyVigilancia);
                emptyResponse.setAdministrativo(emptyAdministrativo);
                return ResponseEntity.ok(emptyResponse);
            }
        } catch (Exception e) {
            log.error("Erro geral ao organizar holerites por tipo: {}", e.getMessage(), e);
            CompanyTypeOrganizationResponse emptyResponse = new CompanyTypeOrganizationResponse();
            emptyResponse.setGeneratedAt(java.time.LocalDateTime.now());
            emptyResponse.setTotalPayslips(0);
            emptyResponse.setTotalCompanies(0);
            emptyResponse.setTotalSectors(0);
            
            CompanyTypeOrganizationResponse.CompanyTypeGroup emptyTerceirizacao = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            emptyTerceirizacao.setTypeName("Terceirização");
            emptyTerceirizacao.setTypeCode("TERCEIRIZACAO");
            emptyTerceirizacao.setTotalCompanies(0);
            emptyTerceirizacao.setTotalPayslips(0);
            emptyTerceirizacao.setTotalSectors(0);
            emptyTerceirizacao.setCompanies(Collections.emptyList());
            
            CompanyTypeOrganizationResponse.CompanyTypeGroup emptyVigilancia = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            emptyVigilancia.setTypeName("Vigilância");
            emptyVigilancia.setTypeCode("VIGILANCIA");
            emptyVigilancia.setTotalCompanies(0);
            emptyVigilancia.setTotalPayslips(0);
            emptyVigilancia.setTotalSectors(0);
            emptyVigilancia.setCompanies(Collections.emptyList());
            
            CompanyTypeOrganizationResponse.CompanyTypeGroup emptyAdministrativo = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            emptyAdministrativo.setTypeName("Administrativo");
            emptyAdministrativo.setTypeCode("ADMINISTRATIVO");
            emptyAdministrativo.setTotalCompanies(0);
            emptyAdministrativo.setTotalPayslips(0);
            emptyAdministrativo.setTotalSectors(0);
            emptyAdministrativo.setCompanies(Collections.emptyList());
            
            emptyResponse.setTerceirizacao(emptyTerceirizacao);
            emptyResponse.setVigilancia(emptyVigilancia);
            emptyResponse.setAdministrativo(emptyAdministrativo);
            return ResponseEntity.ok(emptyResponse);
        }
    }

    @GetMapping("/processed-files")
    public ResponseEntity<Map<String, Object>> getProcessedPayslipFiles() {
        log.info("📂 Solicitando lista de holerites processados");
        try {
            List<PayslipProcessedFileResponse> files = payslipService.getProcessedPayslipFiles();

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("total", files.size());
            body.put("files", files);

            log.info("📂 Retornando {} holerites processados", files.size());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("❌ Erro ao listar holerites processados: {}", e.getMessage(), e);

            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Erro ao listar holerites processados");
            error.put("details", e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/download/{fileName}")
    @Operation(summary = "Download individual payslip file by fileName (deprecated - use /download-by-id/{id})")
    public ResponseEntity<Resource> downloadPayslip(@PathVariable String fileName) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));
            Optional<String> resolvedCpf = authenticatedCpfResolver.resolve(auth);
            
            log.info("📥 Tentando baixar arquivo: {}", fileName);
            Payslip payslip = payslipService.getPayslipByFileName(fileName);
            
            if (payslip == null) {
                log.error("❌ Payslip não encontrado para o arquivo: {}", fileName);
                return ResponseEntity.notFound().build();
            }
            
            log.info("✅ Payslip encontrado: ID={}, CPF={}, Nome={}, Arquivo={}", 
                payslip.getId(), payslip.getCpf(), payslip.getEmployeeName(), payslip.getFileName());
            
            if (isColaborador) {
                Optional<String> payslipCpf = authenticatedCpfResolver.normalizeCpf(payslip.getCpf());
                if (resolvedCpf.isEmpty() || payslipCpf.isEmpty() || !resolvedCpf.get().equals(payslipCpf.get())) {
                    log.warn("⚠️ Acesso negado: CPF do usuário ({}) não corresponde ao CPF do payslip ({})", 
                        resolvedCpf.orElse("null"), payslipCpf.orElse("null"));
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
            
            Path filePath = resolvePayslipPath(payslip, fileName);
            log.info("📄 Caminho resolvido: {}", filePath.toAbsolutePath());
            
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                log.info("✅ Arquivo encontrado e legível: {}", filePath.toAbsolutePath());
                return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                    .body(resource);
            } else {
                log.error("❌ Arquivo não encontrado ou não legível: {} em {}", fileName, filePath.toAbsolutePath());
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            log.error("❌ Erro ao acessar arquivo: {}", fileName, e);
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            log.error("❌ Erro inesperado ao baixar arquivo: {}", fileName, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/download-by-id/{id}")
    @Operation(summary = "Download individual payslip file by ID (recommended)")
    public ResponseEntity<Resource> downloadPayslipById(@PathVariable String id) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));
            Optional<String> resolvedCpf = authenticatedCpfResolver.resolve(auth);
            
            log.info("📥 Tentando baixar payslip pelo ID: {}", id);
            
            java.util.UUID payslipId;
            try {
                payslipId = java.util.UUID.fromString(id);
            } catch (IllegalArgumentException e) {
                log.error("❌ ID inválido: {}", id);
                return ResponseEntity.badRequest().build();
            }
            
            Payslip payslip = payslipService.getPayslipById(payslipId);
            
            if (payslip == null) {
                log.error("❌ Payslip não encontrado para o ID: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            log.info("✅ Payslip encontrado: ID={}, CPF={}, Nome={}, Arquivo={}", 
                payslip.getId(), payslip.getCpf(), payslip.getEmployeeName(), payslip.getFileName());
            
            if (isColaborador) {
                Optional<String> payslipCpf = authenticatedCpfResolver.normalizeCpf(payslip.getCpf());
                if (resolvedCpf.isEmpty() || payslipCpf.isEmpty() || !resolvedCpf.get().equals(payslipCpf.get())) {
                    log.warn("⚠️ Acesso negado: CPF do usuário ({}) não corresponde ao CPF do payslip ({})", 
                        resolvedCpf.orElse("null"), payslipCpf.orElse("null"));
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
            
            String fileName = payslip.getFileName();
            Path filePath = resolvePayslipPath(payslip, fileName);
            log.info("📄 Caminho resolvido: {}", filePath.toAbsolutePath());
            
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                log.info("✅ Arquivo encontrado e legível: {}", filePath.toAbsolutePath());
                return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                    .body(resource);
            } else {
                log.error("❌ Arquivo não encontrado ou não legível: {} em {}", fileName, filePath.toAbsolutePath());
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            log.error("❌ Erro ao acessar arquivo: {}", id, e);
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            log.error("❌ Erro inesperado ao baixar arquivo: {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }


    @RequestMapping(value = "/test-download/{fileName}", method = RequestMethod.OPTIONS)
    public ResponseEntity<Void> testDownloadOptions(@PathVariable String fileName) {
        return ResponseEntity.ok().build();
    }

    // Endpoint de teste temporário sem autenticação
    @GetMapping("/test-download/{fileName}")
    @Operation(summary = "Test download individual payslip file without authentication")
    public ResponseEntity<Resource> testDownloadPayslip(@PathVariable String fileName) {
        try {
            log.info("Teste de download: {}", fileName);
            
            // Tentar diferentes caminhos possíveis
            Path filePath = findPayslipFile(fileName);
            
            log.info("Tentando acessar arquivo em: {}", filePath);
            
            if (filePath != null && java.nio.file.Files.exists(filePath)) {
                Resource resource = new UrlResource(filePath.toUri());
                if (resource.exists() && resource.isReadable()) {
                    log.info("Arquivo encontrado e legível: {}", fileName);
                    return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_PDF)
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                        .body(resource);
                }
            }
            
            log.warn("Arquivo não encontrado ou não legível: {} em {}", fileName, filePath);
            return ResponseEntity.notFound().build();
            
        } catch (MalformedURLException e) {
            log.error("Erro ao acessar arquivo: {}", fileName, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private Path resolvePayslipPath(Payslip payslip, String fileName) throws MalformedURLException {
        Path filePath = null;

        // PRIORIDADE 1: Usar arquivo_caminho se disponível (mais confiável)
        if (payslip != null && payslip.getArquivoCaminho() != null && !payslip.getArquivoCaminho().isEmpty()) {
            filePath = Paths.get(payslip.getArquivoCaminho());
            if (java.nio.file.Files.exists(filePath)) {
                log.debug("📄 Usando arquivo_caminho do banco: {}", filePath);
                return filePath;
            } else {
                log.warn("⚠️ arquivo_caminho do banco não existe: {}", payslip.getArquivoCaminho());
            }
        }

        // PRIORIDADE 2: Resolver pelo CPF, mês e ano
        if (payslip != null && payslip.getCpf() != null && payslip.getMonth() != null && payslip.getYear() != null) {
            filePath = payslipService.resolvePayslipPathByCpfMonthYear(
                    payslip.getCpf(),
                    payslip.getMonth(),
                    payslip.getYear()
            ).map(Paths::get).orElse(null);
        }

        // PRIORIDADE 3: Fallback - buscar pelo nome do arquivo
        if (filePath == null || !java.nio.file.Files.exists(filePath)) {
            filePath = findPayslipFile(fileName);
        }

        if (filePath == null || !java.nio.file.Files.exists(filePath)) {
            log.error("❌ Arquivo não encontrado: {} - Payslip: {}", fileName, payslip != null ? payslip.getId() : "null");
            throw new MalformedURLException("Arquivo não encontrado nos diretórios configurados: " + fileName);
        }

        return filePath;
    }
    
    private Path findPayslipFile(String fileName) {
        String uploadDir = System.getProperty("payslips.upload.dir", "uploads/payslips");
        Path filePath = Paths.get(uploadDir, fileName);
        
        if (java.nio.file.Files.exists(filePath)) {
            return filePath;
        }
        
        filePath = Paths.get("backend/payslips_output", fileName);
        if (java.nio.file.Files.exists(filePath)) {
            return filePath;
        }
        
        filePath = Paths.get("backend/holerites", fileName);
        if (java.nio.file.Files.exists(filePath)) {
            return filePath;
        }
        
        Path holeritesDir = Paths.get("backend/holerites");
        if (java.nio.file.Files.exists(holeritesDir)) {
            try {
                for (Path subDir : java.nio.file.Files.list(holeritesDir).toList()) {
                    if (java.nio.file.Files.isDirectory(subDir)) {
                        Path potentialFile = subDir.resolve(fileName);
                        if (java.nio.file.Files.exists(potentialFile)) {
                            return potentialFile;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Erro ao buscar em subpastas: {}", e.getMessage());
            }
        }
        
        return null;
    }

    // Exclusão individual de payslip
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayslip(@PathVariable UUID id) {
        try {
            payslipService.deletePayslip(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao excluir payslip: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // Exclusão em massa de payslips
    @PostMapping("/delete-multiple")
    public ResponseEntity<Map<String, Object>> deleteMultiplePayslips(@RequestBody Map<String, List<String>> body) {
        try {
            List<String> idStrings = body.get("ids");
            if (idStrings == null || idStrings.isEmpty()) {
                Map<String, Object> result = new HashMap<>();
                result.put("deleted", 0);
                result.put("failed", 0);
                result.put("errors", List.of());
                return ResponseEntity.ok(result);
            }
            
            log.info("🗑️ Tentando excluir {} payslips", idStrings.size());
            
            // Converter IDs para UUID com validação individual
            List<UUID> validIds = new ArrayList<>();
            List<String> invalidIds = new ArrayList<>();
            
            for (String idString : idStrings) {
                try {
                    UUID uuid = UUID.fromString(idString);
                    validIds.add(uuid);
                } catch (IllegalArgumentException e) {
                    log.warn("ID inválido encontrado: {} - {}", idString, e.getMessage());
                    invalidIds.add(idString);
                }
            }
            
            // Se todos os IDs são inválidos, retornar erro
            if (validIds.isEmpty()) {
                log.error("Todos os IDs fornecidos são inválidos: {}", invalidIds);
                Map<String, Object> errorResult = new HashMap<>();
                errorResult.put("deleted", 0);
                errorResult.put("failed", idStrings.size());
                errorResult.put("errors", List.of("Todos os IDs fornecidos são inválidos. IDs inválidos: " + String.join(", ", invalidIds)));
                return ResponseEntity.badRequest().body(errorResult);
            }
            
            // Se alguns IDs são inválidos, logar mas continuar com os válidos
            if (!invalidIds.isEmpty()) {
                log.warn("Alguns IDs são inválidos e serão ignorados: {}", invalidIds);
            }
            
            Map<String, Object> result = payslipService.deleteMultiplePayslips(validIds);
            
            // Adicionar informações sobre IDs inválidos ao resultado
            if (!invalidIds.isEmpty()) {
                result.put("invalidIds", invalidIds);
                result.put("invalidCount", invalidIds.size());
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Erro inesperado ao excluir múltiplos payslips: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("deleted", 0);
            errorResult.put("failed", 0);
            errorResult.put("errors", List.of("Erro interno: " + e.getMessage()));
            return ResponseEntity.internalServerError().body(errorResult);
        }
    }

    // ==================== ENDPOINTS DE VERIFICAÇÃO ====================

    @GetMapping("/extracted-data")
    @Operation(summary = "Get extracted data from holerites processing")
    public ResponseEntity<Map<String, Object>> getExtractedData() {
        log.info("📊 Verificando dados extraídos dos holerites");
        
        try {
            // Buscar dados da tabela de dados extraídos
            List<com.z7design.secured_guard.model.ExtractDataHolerites> extractedData = 
                extractDataHoleritesService.findAll();
            
            // Buscar dados da tabela de payslips
            List<Payslip> payslips = payslipService.getAllPayslips();
            
            Map<String, Object> result = new java.util.HashMap<>();
            result.put("extractedDataCount", extractedData.size());
            result.put("payslipsCount", payslips.size());
            result.put("extractedData", extractedData);
            result.put("payslips", payslips);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("❌ Erro ao buscar dados extraídos: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/update-missing-data")
    @Operation(summary = "Update payslips missing company and sector data by extracting from PDFs")
    public ResponseEntity<Map<String, Object>> updateMissingData() {
        log.info("🔄 Iniciando atualização de holerites sem empresa/setor");
        
        try {
            Map<String, Object> result = payslipService.updateMissingCompanyAndSectorData();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("❌ Erro ao atualizar holerites: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("success", false);
            errorResult.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResult);
        }
    }
}