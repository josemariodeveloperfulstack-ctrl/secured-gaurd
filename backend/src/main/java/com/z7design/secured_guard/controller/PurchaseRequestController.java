package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.PurchaseRequestDTO;
import com.z7design.secured_guard.service.PurchaseRequestService;
import com.z7design.secured_guard.service.PurchaseRequestReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchase-requests")
@RequiredArgsConstructor
@Slf4j
public class PurchaseRequestController {

    private final PurchaseRequestService purchaseRequestService;
    private final PurchaseRequestReportService purchaseRequestReportService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getAllPurchaseRequests() {
        log.info("Buscando todas as requisições de compra");
        List<PurchaseRequestDTO> requests = purchaseRequestService.getAllPurchaseRequests();
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<PurchaseRequestDTO> getPurchaseRequestById(@PathVariable UUID id) {
        log.info("Buscando requisição de compra com ID: {}", id);
        return purchaseRequestService.getPurchaseRequestById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_WRITE', 'PURCHASE_REQUESTS_CREATE')")
    public ResponseEntity<PurchaseRequestDTO> createPurchaseRequest(@RequestBody PurchaseRequestDTO requestDTO) {
        log.info("Criando nova requisição de compra: {}", requestDTO.getTitle());
        PurchaseRequestDTO createdRequest = purchaseRequestService.createPurchaseRequest(requestDTO);
        return ResponseEntity.ok(createdRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_WRITE')")
    public ResponseEntity<PurchaseRequestDTO> updatePurchaseRequest(@PathVariable UUID id,
            @RequestBody PurchaseRequestDTO requestDTO) {
        log.info("Atualizando requisição de compra com ID: {}", id);
        try {
            PurchaseRequestDTO updatedRequest = purchaseRequestService.updatePurchaseRequest(id, requestDTO);
            return ResponseEntity.ok(updatedRequest);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_DELETE')")
    public ResponseEntity<Void> deletePurchaseRequest(@PathVariable UUID id) {
        log.info("Deletando requisição de compra com ID: {}", id);
        purchaseRequestService.deletePurchaseRequest(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_FINANCEIRO', 'ROLE_COMPRAS')")
    public ResponseEntity<PurchaseRequestDTO> approveRequest(
            @PathVariable UUID id,
            @RequestParam("approverName") String approverName,
            @RequestParam(value = "approvalNotes", required = false) String approvalNotes) {
        log.info("Aprovando requisição de compra com ID: {}", id);
        try {
            PurchaseRequestDTO approvedRequest = purchaseRequestService.approveRequest(id, approverName, approvalNotes);
            return ResponseEntity.ok(approvedRequest);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_FINANCEIRO', 'ROLE_COMPRAS')")
    public ResponseEntity<PurchaseRequestDTO> rejectRequest(
            @PathVariable UUID id,
            @RequestParam("rejectorName") String rejectorName,
            @RequestParam("rejectionReason") String rejectionReason) {
        log.info("Rejeitando requisição de compra com ID: {}", id);
        try {
            PurchaseRequestDTO rejectedRequest = purchaseRequestService.rejectRequest(id, rejectorName,
                    rejectionReason);
            return ResponseEntity.ok(rejectedRequest);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_WRITE')")
    public ResponseEntity<PurchaseRequestDTO> completeRequest(@PathVariable UUID id) {
        log.info("Completando requisição de compra com ID: {}", id);
        try {
            PurchaseRequestDTO completedRequest = purchaseRequestService.completeRequest(id);
            return ResponseEntity.ok(completedRequest);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getRequestsByStatus(@PathVariable String status) {
        log.info("Buscando requisições de compra com status: {}", status);
        List<PurchaseRequestDTO> requests = purchaseRequestService.getRequestsByStatus(status);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/priority/{priority}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getRequestsByPriority(@PathVariable String priority) {
        log.info("Buscando requisições de compra com prioridade: {}", priority);
        List<PurchaseRequestDTO> requests = purchaseRequestService.getRequestsByPriority(priority);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/requester/{requesterId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getRequestsByRequester(@PathVariable UUID requesterId) {
        log.info("Buscando requisições de compra do solicitante: {}", requesterId);
        List<PurchaseRequestDTO> requests = purchaseRequestService.getRequestsByRequester(requesterId);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/approver/{approverId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getRequestsByApprover(@PathVariable UUID approverId) {
        log.info("Buscando requisições de compra do aprovador: {}", approverId);
        List<PurchaseRequestDTO> requests = purchaseRequestService.getRequestsByApprover(approverId);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/unit/{unitId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getRequestsByUnit(@PathVariable UUID unitId) {
        log.info("Buscando requisições de compra da unidade: {}", unitId);
        List<PurchaseRequestDTO> requests = purchaseRequestService.getRequestsByUnit(unitId);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getOverdueRequests() {
        log.info("Buscando requisições de compra em atraso");
        List<PurchaseRequestDTO> requests = purchaseRequestService.getOverdueRequests();
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/urgent")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getUrgentRequests() {
        log.info("Buscando requisições de compra urgentes");
        List<PurchaseRequestDTO> requests = purchaseRequestService.getUrgentRequests();
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/pending-approval")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> getPendingApprovalRequests() {
        log.info("Buscando requisições de compra pendentes de aprovação");
        List<PurchaseRequestDTO> requests = purchaseRequestService.getPendingApprovalRequests();
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<List<PurchaseRequestDTO>> searchRequests(@RequestParam("searchTerm") String searchTerm) {
        log.info("Buscando requisições de compra com termo: {}", searchTerm);
        List<PurchaseRequestDTO> requests = purchaseRequestService.searchRequests(searchTerm);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/stats/count/{status}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<Long> getRequestsCountByStatus(@PathVariable String status) {
        log.info("Buscando contagem de requisições com status: {}", status);
        long count = purchaseRequestService.getRequestsCountByStatus(status);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/stats/urgent-count")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<Long> getUrgentRequestsCount() {
        log.info("Buscando contagem de requisições urgentes");
        long count = purchaseRequestService.getUrgentRequestsCount();
        return ResponseEntity.ok(count);
    }

    @GetMapping("/stats/overdue-count")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<Long> getOverdueRequestsCount() {
        log.info("Buscando contagem de requisições em atraso");
        long count = purchaseRequestService.getOverdueRequestsCount();
        return ResponseEntity.ok(count);
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<byte[]> generatePurchaseRequestPdf(@PathVariable UUID id) throws IOException {
        log.info("Gerando PDF individual da solicitação de compra {}", id);
        byte[] pdf = purchaseRequestReportService.generateSinglePurchaseRequestPdf(id);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=solicitacao-compra.pdf")
                .body(pdf);
    }

    /**
     * Gera relatório PDF de solicitações de compra com layout corporativo padrão,
     * utilizando os mesmos filtros de data, status e valor do frontend.
     */
    @GetMapping("/reports/pdf")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_REQUESTS_READ')")
    public ResponseEntity<byte[]> generatePurchaseRequestsReportPdf(
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "minValue", required = false) BigDecimal minValue,
            @RequestParam(value = "maxValue", required = false) BigDecimal maxValue) throws IOException {

        log.info("Gerando relatório PDF de solicitações de compra");
        byte[] pdf = purchaseRequestReportService.generatePurchaseRequestsReport(
                startDate, endDate, status, minValue, maxValue);

        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=relatorio-solicitacoes-compra.pdf")
                .body(pdf);
    }
}