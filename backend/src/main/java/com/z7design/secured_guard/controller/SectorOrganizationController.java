package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.SectorOrganizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sector-organization")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class SectorOrganizationController {

    private final SectorOrganizationService sectorOrganizationService;

    /**
     * Processa todos os documentos unificados e organiza por setor
     * POST /api/sector-organization/process
     */
    @PostMapping("/process")
    // @PreAuthorize - TEMPORARIAMENTE REMOVIDO PARA DEBUG (endpoint já protegido no SecurityConfig)
    public ResponseEntity<Map<String, Object>> processAllDocuments(
        @RequestParam(required = false) Integer filterMonth,
        @RequestParam(required = false) Integer filterYear
    ) {
        try {
            log.info("🚀 Iniciando processamento de documentos por setor (Mês: {}, Ano: {})", 
                filterMonth, filterYear);
            
            SectorOrganizationService.BatchOrganizationResult result = 
                sectorOrganizationService.organizeAllDocuments(filterMonth, filterYear);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", result.isSuccess());
            response.put("message", result.getMessage());
            response.put("totalDocuments", result.getTotalDocuments());
            response.put("successCount", result.getSuccessCount());
            response.put("failedCount", result.getFailedCount());
            response.put("results", result.getResults());
            
            if (result.isSuccess()) {
                log.info("✅ Processamento concluído: {} documentos organizados com sucesso", 
                    result.getSuccessCount());
                return ResponseEntity.ok(response);
            } else {
                log.warn("⚠️ Processamento concluído com falhas: {}", result.getMessage());
                return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).body(response);
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar documentos: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao processar documentos: " + e.getMessage());
            errorResponse.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Lista documentos organizados por setor
     * GET /api/sector-organization/list
     */
    @GetMapping("/list")
    // @PreAuthorize - TEMPORARIAMENTE REMOVIDO PARA DEBUG (endpoint já protegido no SecurityConfig)
    public ResponseEntity<Map<String, Object>> listOrganizedDocuments() {
        try {
            log.info("📋 Listando documentos organizados por setor");
            
            Map<String, Object> result = sectorOrganizationService.listOrganizedDocuments();
            
            log.info("✅ Listagem concluída: {} setores, {} documentos", 
                result.get("totalSectors"), result.get("totalDocuments"));
            
            return ResponseEntity.ok(result);
            
        } catch (IOException e) {
            log.error("❌ Erro ao listar documentos: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao listar documentos: " + e.getMessage());
            errorResponse.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Endpoint público para listar documentos (sem autenticação - TEMPORÁRIO PARA DEBUG)
     * GET /api/sector-organization/public/list
     */
    @GetMapping("/public/list")
    public ResponseEntity<Map<String, Object>> listOrganizedDocumentsPublic() {
        try {
            log.info("📋 [PUBLIC] Listando documentos organizados por setor");
            
            Map<String, Object> result = sectorOrganizationService.listOrganizedDocuments();
            
            log.info("✅ [PUBLIC] Listagem concluída: {} setores, {} documentos", 
                result.get("totalSectors"), result.get("totalDocuments"));
            
            return ResponseEntity.ok(result);
            
        } catch (IOException e) {
            log.error("❌ [PUBLIC] Erro ao listar documentos: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao listar documentos: " + e.getMessage());
            errorResponse.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Deleta documentos organizados por setor
     * DELETE /api/sector-organization/delete
     */
    @DeleteMapping("/delete")
    // @PreAuthorize - TEMPORARIAMENTE REMOVIDO PARA DEBUG
    public ResponseEntity<Map<String, Object>> deleteDocuments(@RequestBody Map<String, Object> request) {
        try {
            log.info("🗑️ Solicitação de exclusão recebida");
            
            @SuppressWarnings("unchecked")
            List<String> filePaths = (List<String>) request.get("filePaths");
            
            if (filePaths == null || filePaths.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Nenhum arquivo especificado para exclusão");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            int deletedCount = 0;
            int failedCount = 0;
            List<String> errors = new ArrayList<>();
            
            for (String filePath : filePaths) {
                try {
                    java.nio.file.Path path = java.nio.file.Paths.get(filePath);
                    if (java.nio.file.Files.exists(path)) {
                        java.nio.file.Files.delete(path);
                        deletedCount++;
                        log.info("✅ Arquivo deletado: {}", filePath);
                    } else {
                        log.warn("⚠️ Arquivo não encontrado: {}", filePath);
                        failedCount++;
                        errors.add("Arquivo não encontrado: " + filePath);
                    }
                } catch (Exception e) {
                    log.error("❌ Erro ao deletar arquivo {}: {}", filePath, e.getMessage());
                    failedCount++;
                    errors.add("Erro ao deletar " + filePath + ": " + e.getMessage());
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", deletedCount > 0);
            response.put("deletedCount", deletedCount);
            response.put("failedCount", failedCount);
            response.put("errors", errors);
            response.put("message", String.format("%d arquivo(s) deletado(s), %d falha(s)", deletedCount, failedCount));
            
            log.info("✅ Exclusão concluída: {} deletados, {} falhas", deletedCount, failedCount);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ Erro ao processar exclusão: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao processar exclusão: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Endpoint de health check para verificar se o serviço está ativo
     * GET /api/sector-organization/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "SectorOrganization");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }
}

