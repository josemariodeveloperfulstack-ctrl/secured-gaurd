package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.remanejamento.RemanejamentoApprovalDtos.RejectDTO;
import com.z7design.secured_guard.dto.remanejamento.RemanejamentoApprovalDtos.RemanejamentoSummaryDTO;
import com.z7design.secured_guard.dto.remanejamento.RemanejamentoApprovalDtos.RequestDTO;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.RemanejamentoStatus;
import com.z7design.secured_guard.service.RemanejamentoApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Onda 3 — Endpoints do fluxo de aprovação de remanejamento.
 *
 * Caminho base: {@code /api/remanejamentos/approval} para não colidir com o
 * {@link RemanejamentoController} (CRUD legado em {@code /api/remanejamentos}).
 */
@RestController
@RequestMapping("/api/remanejamentos/approval")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class RemanejamentoApprovalController {

    private static final String SUPERVISOR_AUTH =
        "hasAnyAuthority('SUPERVISOR', 'ROLE_SUPERVISOR', " +
        "'GESTOR_OPERACIONAL', 'ROLE_GESTOR_OPERACIONAL', " +
        "'GESTAO_SUPERVISAO', 'ROLE_GESTAO_SUPERVISAO', " +
        "'ADMIN', 'ROLE_ADMIN', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN')";

    private static final String MANAGER_AUTH =
        "hasAnyAuthority('GESTOR_OPERACIONAL', 'ROLE_GESTOR_OPERACIONAL', " +
        "'GESTAO_SUPERVISAO', 'ROLE_GESTAO_SUPERVISAO', " +
        "'ADMIN', 'ROLE_ADMIN', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN')";

    private final RemanejamentoApprovalService approvalService;

    /* =============== Supervisor solicita =============== */

    @PostMapping("/request")
    @PreAuthorize(SUPERVISOR_AUTH)
    public ResponseEntity<RemanejamentoSummaryDTO> request(@Valid @RequestBody RequestDTO dto) {
        User current = currentUser();
        RemanejamentoSummaryDTO created = approvalService.request(dto, current);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/my-requests")
    @PreAuthorize(SUPERVISOR_AUTH)
    public ResponseEntity<List<RemanejamentoSummaryDTO>> myRequests() {
        return ResponseEntity.ok(approvalService.listMyRequests(currentUser()));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize(SUPERVISOR_AUTH)
    public ResponseEntity<RemanejamentoSummaryDTO> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(approvalService.cancel(id, currentUser()));
    }

    /* =============== Gestor Operacional aprova/rejeita =============== */

    @GetMapping("/pending")
    @PreAuthorize(MANAGER_AUTH)
    public ResponseEntity<List<RemanejamentoSummaryDTO>> listPending() {
        return ResponseEntity.ok(approvalService.listByStatus(RemanejamentoStatus.PENDING));
    }

    @GetMapping
    @PreAuthorize(MANAGER_AUTH)
    public ResponseEntity<List<RemanejamentoSummaryDTO>> listByStatus(
            @RequestParam(value = "status", required = false) RemanejamentoStatus status) {
        return ResponseEntity.ok(approvalService.listByStatus(status));
    }

    @GetMapping("/pending/count")
    @PreAuthorize(MANAGER_AUTH)
    public ResponseEntity<Map<String, Long>> countPending() {
        return ResponseEntity.ok(Map.of("pending", approvalService.countPending()));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize(MANAGER_AUTH)
    public ResponseEntity<RemanejamentoSummaryDTO> approve(@PathVariable UUID id) {
        return ResponseEntity.ok(approvalService.approve(id, currentUser()));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize(MANAGER_AUTH)
    public ResponseEntity<RemanejamentoSummaryDTO> reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectDTO dto) {
        return ResponseEntity.ok(approvalService.reject(id, dto.getReason(), currentUser()));
    }

    /* =============== Detalhe =============== */

    @GetMapping("/{id}")
    @PreAuthorize(SUPERVISOR_AUTH)
    public ResponseEntity<RemanejamentoSummaryDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(approvalService.getById(id));
    }

    /* =============== Helpers =============== */

    private User currentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User u) {
                return u;
            }
        } catch (Exception e) {
            log.warn("Falha ao recuperar usuário autenticado: {}", e.getMessage());
        }
        return null;
    }
}
