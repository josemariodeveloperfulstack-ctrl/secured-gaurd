package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.PurchaseQuotationDTO;
import com.z7design.secured_guard.model.enums.PurchaseQuotationStatus;
import com.z7design.secured_guard.service.PurchaseQuotationReportService;
import com.z7design.secured_guard.service.PurchaseQuotationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import com.z7design.secured_guard.model.User;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
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
    private final PurchaseQuotationReportService purchaseQuotationReportService;

    @GetMapping
    @Operation(summary = "Listar todas as cotações", description = "Retorna uma lista de todas as cotações de compras")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getAllQuotations() {
        log.info("Buscando todas as cotações de compras");
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.getAllQuotations();
        return ResponseEntity.ok(quotations);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar cotação por ID", description = "Retorna uma cotação específica pelo ID")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<PurchaseQuotationDTO> getQuotationById(@PathVariable UUID id) {
        log.info("Buscando cotação com ID: {}", id);
        return purchaseQuotationService.getQuotationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar nova cotação", description = "Cria uma nova cotação de compra no sistema")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<PurchaseQuotationDTO> createQuotation(@RequestBody PurchaseQuotationDTO quotationDTO) {
        log.info("Criando nova cotação: {}", quotationDTO.getTitle());
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                log.error("Usuário não autenticado ao criar cotação");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            User currentUser = (User) authentication.getPrincipal();
            UUID currentUserId = currentUser.getId();
            log.info("Usuário atual criando cotação: {} (ID: {})", currentUser.getUsername(), currentUserId);

            PurchaseQuotationDTO createdQuotation = purchaseQuotationService.createQuotation(quotationDTO,
                    currentUserId);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdQuotation);
        } catch (Exception e) {
            log.error("Erro ao criar cotação: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar cotação", description = "Atualiza uma cotação existente")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsBySupplier(@PathVariable UUID supplierId) {
        log.info("Buscando cotações do fornecedor: {}", supplierId);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findBySupplier(supplierId);
        return ResponseEntity.ok(quotations);
    }

    @GetMapping("/unit/{unitId}")
    @Operation(summary = "Buscar cotações por unidade", description = "Retorna cotações de uma unidade específica")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsByUnit(@PathVariable UUID unitId) {
        log.info("Buscando cotações da unidade: {}", unitId);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findByUnit(unitId);
        return ResponseEntity.ok(quotations);
    }

    @GetMapping("/assigned/{userId}")
    @Operation(summary = "Buscar cotações por responsável", description = "Retorna cotações atribuídas a um usuário específico")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsByAssignedTo(@PathVariable UUID userId) {
        log.info("Buscando cotações atribuídas ao usuário: {}", userId);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findByAssignedTo(userId);
        return ResponseEntity.ok(quotations);
    }

    @GetMapping("/expired")
    @Operation(summary = "Buscar cotações expiradas", description = "Retorna cotações que já expiraram")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getExpiredQuotations() {
        log.info("Buscando cotações expiradas");
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findExpiredQuotations();
        return ResponseEntity.ok(quotations);
    }

    @GetMapping("/expiring-soon/{days}")
    @Operation(summary = "Buscar cotações expirando em breve", description = "Retorna cotações que expiram nos próximos X dias")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> getQuotationsExpiringSoon(@PathVariable int days) {
        log.info("Buscando cotações expirando nos próximos {} dias", days);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.findQuotationsExpiringSoon(days);
        return ResponseEntity.ok(quotations);
    }

    @GetMapping("/search")
    @Operation(summary = "Buscar cotações", description = "Busca cotações por termo de pesquisa")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<List<PurchaseQuotationDTO>> searchQuotations(@RequestParam("term") String term) {
        log.info("Buscando cotações com termo: {}", term);
        List<PurchaseQuotationDTO> quotations = purchaseQuotationService.searchQuotations(term);
        return ResponseEntity.ok(quotations);
    }

    @GetMapping("/stats/count-by-status")
    @Operation(summary = "Estatísticas por status", description = "Retorna contagem de cotações por status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<Map<String, Long>> getCountByStatus() {
        log.info("Buscando estatísticas de cotações por status");
        Map<String, Long> stats = Map.of(
                "DRAFT", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.DRAFT),
                "SENT", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.SENT),
                "APPROVED", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.APPROVED),
                "REJECTED", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.REJECTED),
                "EXPIRED", purchaseQuotationService.countByStatus(PurchaseQuotationStatus.EXPIRED));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/reports/pdf")
    @Operation(summary = "Gerar relatório PDF de cotações", description = "Gera relatório com layout corporativo em formato retrato")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')")
    public ResponseEntity<byte[]> generateQuotationsReportPdf(
            @RequestParam(value = "quoteNumber", required = false) String quoteNumber,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "supplierId", required = false) UUID supplierId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "startValidUntil", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startValidUntil,
            @RequestParam(value = "endValidUntil", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endValidUntil,
            @RequestParam(value = "assignedToId", required = false) UUID assignedToId,
            @RequestParam(value = "minValue", required = false) BigDecimal minValue,
            @RequestParam(value = "maxValue", required = false) BigDecimal maxValue) throws IOException {
        log.info("Gerando relatório PDF de cotações de compra");
        byte[] pdf = purchaseQuotationReportService.generateQuotationsReport(
                quoteNumber, title, supplierId, status, startValidUntil, endValidUntil,
                assignedToId, minValue, maxValue);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=relatorio-cotacoes-compra.pdf")
                .body(pdf);
    }
}
