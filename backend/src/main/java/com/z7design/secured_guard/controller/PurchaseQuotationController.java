package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.PurchaseQuotationDTO;
import com.z7design.secured_guard.model.enums.PurchaseQuotationStatus;
import com.z7design.secured_guard.service.PurchaseQuotationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchase-quotations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Purchase Quotations", description = "Endpoints para gerenciamento de Cotações de Compras")
public class PurchaseQuotationController {
    
    private final PurchaseQuotationService purchaseQuotationService;
    
    @GetMapping
    @Operation(summary = "Listar todas as cotações", description = "Retorna uma lista de todas as cotações de compras")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getAllQuotations() {
        log.info("Buscando todas as cotações de compras");
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.getAllQuotations();
        return ResponseEntity.ok(quotations);
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar cotação por ID", description = "Retorna uma cotação específica pelo ID")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<PurchaseQuotationDTO> getQuotationById(@PathVariable UUID id) {
        log.info("Buscando cotação com ID: {}", id);
        return purchaseQuotationService.getQuotationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    @Operation(summary = "Criar nova cotação", description = "Cria uma nova cotação de compra no sistema")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS')")
    public ResponseEntity<PurchaseQuotationDTO> createQuotation(@RequestBody PurchaseQuotationDTO quotationDTO) {
        log.info("Criando nova cotação: {}", quotationDTO.getTitle());
        // TODO: Obter ID do usuário logado do contexto de segurança
        UUID currentUserId = UUID.randomUUID(); // Temporário - deve ser obtido do contexto de segurança
        PurchaseQuotationDTO createdQuotation = purchaseQuotationService.createQuotation(quotationDTO, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdQuotation);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar cotação", description = "Atualiza uma cotação existente")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS')")
    public ResponseEntity<PurchaseQuotationDTO> updateQuotation(@PathVariable UUID id, 
                                                                 @RequestBody PurchaseQuotationDTO quotationDTO) {
        log.info("Atualizando cotação com ID: {}", id);
        try {
            PurchaseQuotationDTO updatedQuotation = purchaseQuotationService.updateQuotation(id, quotationDTO);
            return ResponseEntity.ok(updatedQuotation);
        } catch (RuntimeException e) {
            log.error("Erro ao atualizar cotação: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir cotação", description = "Exclui uma cotação do sistema")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> deleteQuotation(@PathVariable UUID id) {
        log.info("Deletando cotação com ID: {}", id);
        try {
            purchaseQuotationService.deleteQuotation(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("Erro ao deletar cotação: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status da cotação", description = "Atualiza apenas o status de uma cotação")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<PurchaseQuotationDTO> updateQuotationStatus(@PathVariable UUID id, 
                                                                       @RequestBody Map<String, String> statusUpdate) {
        log.info("Atualizando status da cotação com ID: {}", id);
        String status = statusUpdate.get("status");
        try {
            PurchaseQuotationDTO updatedQuotation = purchaseQuotationService.updateStatus(id, status);
            return ResponseEntity.ok(updatedQuotation);
        } catch (RuntimeException e) {
            log.error("Erro ao atualizar status da cotação: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar cotações por status", description = "Retorna cotações filtradas por status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsByStatus(@PathVariable String status) {
        log.info("Buscando cotações com status: {}", status);
        try {
            List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findByStatus(status);
            return ResponseEntity.ok(quotations);
        } catch (RuntimeException e) {
            log.error("Erro ao buscar cotações por status: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/supplier/{supplierId}")
    @Operation(summary = "Buscar cotações por fornecedor", description = "Retorna cotações de um fornecedor específico")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsBySupplier(@PathVariable UUID supplierId) {
        log.info("Buscando cotações do fornecedor: {}", supplierId);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findBySupplier(supplierId);
        return ResponseEntity.ok(quotations);
    }
    
    @GetMapping("/unit/{unitId}")
    @Operation(summary = "Buscar cotações por unidade", description = "Retorna cotações de uma unidade específica")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsByUnit(@PathVariable UUID unitId) {
        log.info("Buscando cotações da unidade: {}", unitId);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findByUnit(unitId);
        return ResponseEntity.ok(quotations);
    }
    
    @GetMapping("/assigned/{userId}")
    @Operation(summary = "Buscar cotações por responsável", description = "Retorna cotações atribuídas a um usuário específico")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsByAssignedTo(@PathVariable UUID userId) {
        log.info("Buscando cotações atribuídas ao usuário: {}", userId);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findByAssignedTo(userId);
        return ResponseEntity.ok(quotations);
    }
    
    @GetMapping("/expired")
    @Operation(summary = "Buscar cotações expiradas", description = "Retorna cotações que já expiraram")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getExpiredQuotations() {
        log.info("Buscando cotações expiradas");
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findExpiredQuotations();
        return ResponseEntity.ok(quotations);
    }
    
    @GetMapping("/expiring-soon/{days}")
    @Operation(summary = "Buscar cotações expirando em breve", description = "Retorna cotações que expiram nos próximos X dias")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsExpiringSoon(@PathVariable int days) {
        log.info("Buscando cotações expirando nos próximos {} dias", days);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findQuotationsExpiringSoon(days);
        return ResponseEntity.ok(quotations);
    }
    
    @GetMapping("/search")
    @Operation(summary = "Buscar cotações", description = "Busca cotações por termo de pesquisa")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> searchQuotations(@RequestParam String term) {
        log.info("Buscando cotações com termo: {}", term);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.searchQuotations(term);
        return ResponseEntity.ok(quotations);
    }
    
    @GetMapping("/stats/count-by-status")
    @Operation(summary = "Estatísticas por status", description = "Retorna contagem de cotações por status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO')")
    public ResponseEntity<Map<String, Long>> getCountByStatus() {
        log.info("Buscando estatísticas de cotações por status");
        Map<String, Long> stats = Map.of(
            "DRAFT", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.DRAFT),
            "SENT", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.SENT),
            "APPROVED", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.APPROVED),
            "REJECTED", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.REJECTED),
            "EXPIRED", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.EXPIRED)
        );
        return ResponseEntity.ok(stats);
    }
}
