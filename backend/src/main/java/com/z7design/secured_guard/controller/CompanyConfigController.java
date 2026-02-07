package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CompanyConfigDTO;
import com.z7design.secured_guard.dto.ContractTemplatePreviewRequest;
import com.z7design.secured_guard.service.ClientContractStandardPdfService;
import com.z7design.secured_guard.service.CompanyConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/company-config")
@RequiredArgsConstructor
@Slf4j
public class CompanyConfigController {

    private final CompanyConfigService companyConfigService;
    private final ClientContractStandardPdfService contractPdfService;

    /**
     * Busca a configuração ativa da empresa
     */
    @GetMapping("/active")
    public ResponseEntity<CompanyConfigDTO> getActiveConfig() {
        log.info("GET /api/company-config/active - Buscando configuração ativa");
        
        Optional<CompanyConfigDTO> config = companyConfigService.getActiveConfig();
        
        if (config.isPresent()) {
            return ResponseEntity.ok(config.get());
        } else {
            return ResponseEntity.noContent().build();
        }
    }

    /**
     * Lista todas as configurações de empresa (para seleção)
     */
    @GetMapping("/all")
    public ResponseEntity<java.util.List<CompanyConfigDTO>> getAllConfigs() {
        log.info("GET /api/company-config/all - Listando todas as configurações");
        java.util.List<CompanyConfigDTO> configs = companyConfigService.getAllConfigs();
        return ResponseEntity.ok(configs);
    }

    /**
     * Verifica se existe configuração ativa
     */
    @GetMapping("/exists")
    public ResponseEntity<Boolean> hasActiveConfig() {
        log.info("GET /api/company-config/exists - Verificando se existe configuração");
        boolean exists = companyConfigService.hasActiveConfig();
        return ResponseEntity.ok(exists);
    }

    /**
     * Salva ou atualiza configuração da empresa
     */
    @PostMapping
    public ResponseEntity<CompanyConfigDTO> saveConfig(@Valid @RequestBody CompanyConfigDTO configDTO) {
        log.info("POST /api/company-config - Salvando configuração da empresa");
        
        try {
            CompanyConfigDTO savedConfig = companyConfigService.saveConfig(configDTO);
            return ResponseEntity.ok(savedConfig);
        } catch (RuntimeException e) {
            log.error("Erro ao salvar configuração: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Busca configuração por ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<CompanyConfigDTO> getConfigById(@PathVariable UUID id) {
        log.info("GET /api/company-config/{} - Buscando configuração por ID", id);
        
        Optional<CompanyConfigDTO> config = companyConfigService.getConfigById(id);
        
        if (config.isPresent()) {
            return ResponseEntity.ok(config.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Desativa uma configuração
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateConfig(@PathVariable UUID id) {
        log.info("DELETE /api/company-config/{} - Desativando configuração", id);
        
        companyConfigService.deactivateConfig(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Gera PDF de preview do template de contrato com placeholders.
     * Usa os dados atuais do formulário (incluindo alterações não salvas).
     */
    @PostMapping("/preview-pdf")
    public ResponseEntity<ByteArrayResource> generatePreviewPdf(@Valid @RequestBody ContractTemplatePreviewRequest request) {
        log.info("POST /api/company-config/preview-pdf - Gerando preview do template");
        try {
            byte[] pdfBytes = contractPdfService.generatePreviewPdf(request);
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=preview_template.pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao gerar preview PDF: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Upload de logo da empresa
     * TODO: Implementar upload de arquivo para storage (AWS S3, etc.)
     */
    @PostMapping("/{id}/logo")
    public ResponseEntity<String> uploadLogo(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        
        log.info("POST /api/company-config/{}/logo - Upload de logo", id);
        
        // TODO: Implementar upload real
        // Por enquanto, retornar uma URL de exemplo
        String logoUrl = "https://example.com/logos/" + file.getOriginalFilename();
        
        return ResponseEntity.ok(logoUrl);
    }
}
