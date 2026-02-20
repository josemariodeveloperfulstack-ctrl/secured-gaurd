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
    // @PreAuthorize - TEMPORARIAMENTE REMOVIDO PARA DEBUG (endpoint já protegido no
    // SecurityConfig)
    public ResponseEntity<Map<String, Object>> processAllDocuments(
            @RequestParam(value = "filterMonth", required = false) Integer filterMonth,
            @RequestParam(value = "filterYear", required = false) Integer filterYear) {
        try {
            log.info("🚀 Iniciando processamento de documentos por setor (Mês: {}, Ano: {})",
                    filterMonth, filterYear);

            SectorOrganizationService.BatchOrganizationResult result = sectorOrganizationService
                    .organizeAllDocuments(filterMonth, filterYear);

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
    // @PreAuthorize - TEMPORARIAMENTE REMOVIDO PARA DEBUG (endpoint já protegido no
    // SecurityConfig)
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
     * Endpoint público para listar documentos (sem autenticação - TEMPORÁRIO PARA
     * DEBUG)
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
     * Download individual de PDF
     * GET /api/sector-organization/download/{sector}/{period}/{fileName}
     */
    @GetMapping("/download/{sector}/{period}/{fileName}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadDocument(
            @PathVariable String sector,
            @PathVariable String period,
            @PathVariable String fileName) {
        try {
            log.info("📥 Download solicitado: Setor={}, Período={}, Arquivo={}", sector, period, fileName);

            org.springframework.core.io.Resource resource = sectorOrganizationService.downloadDocument(sector, period,
                    fileName);

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileName + "\"")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/pdf")
                    .body(resource);

        } catch (Exception e) {
            log.error("❌ Erro ao baixar documento: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Download em massa (ZIP) por setor e período
     * GET /api/sector-organization/download-zip/{sector}/{period}
     */
    @GetMapping("/download-zip/{sector}/{period}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadSectorZip(
            @PathVariable String sector,
            @PathVariable String period) {
        try {
            log.info("📦 Download ZIP solicitado: Setor={}, Período={}", sector, period);

            org.springframework.core.io.Resource resource = sectorOrganizationService.createZipForSector(sector,
                    period);

            String zipFileName = String.format("%s_%s.zip", sector.replaceAll("[^a-zA-Z0-9]", "_"), period);

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + zipFileName + "\"")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/zip")
                    .body(resource);

        } catch (Exception e) {
            log.error("❌ Erro ao criar ZIP: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Enviar documento individual por email
     * POST /api/sector-organization/send-email
     */
    @PostMapping("/send-email")
    public ResponseEntity<Map<String, Object>> sendEmail(@RequestBody Map<String, Object> request) {
        try {
            String filePath = (String) request.get("filePath");
            String cpf = (String) request.get("cpf");
            String employeeName = (String) request.get("employeeName");

            log.info("📧 Solicitação de envio por email: CPF={}, Arquivo={}", cpf, filePath);

            Map<String, Object> result = sectorOrganizationService.sendDocumentByEmail(filePath, cpf, employeeName);

            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

        } catch (Exception e) {
            log.error("❌ Erro ao enviar email: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao enviar email: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Enviar documento individual por WhatsApp
     * POST /api/sector-organization/send-whatsapp
     */
    @PostMapping("/send-whatsapp")
    public ResponseEntity<Map<String, Object>> sendWhatsApp(@RequestBody Map<String, Object> request) {
        try {
            String filePath = (String) request.get("filePath");
            String cpf = (String) request.get("cpf");

            log.info("📱 Solicitação de envio por WhatsApp: CPF={}, Arquivo={}", cpf, filePath);

            Map<String, Object> result = sectorOrganizationService.sendDocumentByWhatsApp(filePath, cpf);

            if ((Boolean) result.get("success")) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

        } catch (Exception e) {
            log.error("❌ Erro ao enviar WhatsApp: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao enviar WhatsApp: " + e.getMessage());
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
