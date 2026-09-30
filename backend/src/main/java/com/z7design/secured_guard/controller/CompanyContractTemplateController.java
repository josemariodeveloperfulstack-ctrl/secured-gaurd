package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CompanyContractTemplateDTO;
import com.z7design.secured_guard.service.CompanyContractTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Endpoints dos templates (minutas) de contrato por empresa, com as 14 cláusulas.
 */
@RestController
@RequestMapping("/api/company-contract-templates")
@RequiredArgsConstructor
@Slf4j
public class CompanyContractTemplateController {

    private final CompanyContractTemplateService templateService;

    /**
     * Lista os 3 modelos (ARMADA, DESARMADA, PORTARIA) para a empresa.
     * Devolve a versão da empresa quando ela já personalizou o modelo;
     * senão devolve o texto oficial global.
     */
    @GetMapping
    public ResponseEntity<List<CompanyContractTemplateDTO>> listForCompany(
            @RequestParam(required = false) UUID companyId) {
        log.info("GET /api/company-contract-templates - Listando templates (companyId={})", companyId);
        return ResponseEntity.ok(templateService.listForCompany(companyId));
    }

    /**
     * Busca um modelo específico (templateKey) resolvido para a empresa.
     */
    @GetMapping("/by-key/{templateKey}")
    public ResponseEntity<CompanyContractTemplateDTO> getForCompany(
            @RequestParam(required = false) UUID companyId,
            @PathVariable String templateKey) {
        log.info("GET /api/company-contract-templates/by-key/{} (companyId={})", templateKey, companyId);
        return templateService.getForCompany(companyId, templateKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Salva as 14 cláusulas do modelo para a empresa (cria cópia própria).
     */
    @PostMapping
    public ResponseEntity<CompanyContractTemplateDTO> saveForCompany(
            @RequestParam UUID companyId,
            @RequestBody CompanyContractTemplateDTO dto) {
        log.info("POST /api/company-contract-templates - Salvando template {} (companyId={})",
                dto.getTemplateKey(), companyId);
        try {
            return ResponseEntity.ok(templateService.saveForCompany(companyId, dto));
        } catch (IllegalArgumentException e) {
            log.warn("Erro de validação ao salvar template: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Restaura o texto oficial global do modelo para a empresa.
     */
    @PostMapping("/{templateKey}/reset")
    public ResponseEntity<CompanyContractTemplateDTO> resetForCompany(
            @RequestParam UUID companyId,
            @PathVariable String templateKey) {
        log.info("POST /api/company-contract-templates/{}/reset (companyId={})", templateKey, companyId);
        try {
            return ResponseEntity.ok(templateService.resetForCompany(companyId, templateKey));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
