package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CompanyTypeOrganizationResponse;
import com.z7design.secured_guard.dto.EnvioRequest;
import com.z7design.secured_guard.dto.PayslipOrganizationResponse;
import com.z7design.secured_guard.dto.PayslipProcessedFileResponse;
import com.z7design.secured_guard.model.Payslip;
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
    @Operation(summary = "Upload and process a PDF containing multiple payslips")
    public ResponseEntity<List<Payslip>> uploadPayslips(@RequestParam("file") MultipartFile file) {
        try {
            log.info("Recebendo upload de holerite: {}", file.getOriginalFilename());
            // Validação de nome de arquivo
            String originalFilename = file.getOriginalFilename();
            if (originalFilename != null && originalFilename.matches(".*[\\r\\n/\\\\<>:\"|?*].*")) {
                log.warn("Nome de arquivo inválido recebido: {}", originalFilename);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.emptyList());
            }
            List<Payslip> payslips = payslipService.processPayslipPDF(file);
            return ResponseEntity.ok(payslips);
        } catch (Exception e) {
            log.error("Erro ao processar upload de holerite: {}", e.getMessage(), e);
            // Retornar lista vazia ao invés de erro 500 para não quebrar o frontend
            return ResponseEntity.ok(Collections.emptyList());
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
}