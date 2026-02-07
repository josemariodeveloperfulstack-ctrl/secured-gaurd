package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CommercialKpisDTO;
import com.z7design.secured_guard.dto.TeamKpisDTO;
import com.z7design.secured_guard.dto.VendedorRankingDTO;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.AuthenticationService;
import com.z7design.secured_guard.service.CommercialDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/commercial-dashboard")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Dashboard Comercial", description = "Endpoints para KPIs e métricas de desempenho comercial")
public class CommercialDashboardController {

    private final CommercialDashboardService commercialDashboardService;
    private final AuthenticationService authenticationService;

    @GetMapping("/kpis")
    @Operation(summary = "Obter KPIs comerciais", description = "Retorna KPIs de desempenho comercial. Se userId for informado, filtra por usuário. Caso contrário, retorna dados globais.")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ', 'PROPOSALS_READ', 'DASHBOARD_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL')")
    public ResponseEntity<CommercialKpisDTO> getKpis(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        // Defaults: últimos 12 meses se não informado
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        if (startDate == null) {
            startDate = endDate.minusMonths(12).withDayOfMonth(1);
        }

        // Permissão: COMERCIAL vê apenas seus dados (userId fixo no request)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean hasGestorRole = auth != null && auth.getAuthorities() != null
                && auth.getAuthorities().stream().anyMatch(a -> {
                    String role = a.getAuthority().replace("ROLE_", "");
                    return "SUPER_ADMIN".equals(role) || "ADMIN".equals(role) || "GESTOR".equals(role);
                });
        if (!hasGestorRole) {
            User currentUser = authenticationService.getCurrentUser(auth);
            userId = currentUser.getId();
        }

        log.info("GET /api/commercial-dashboard/kpis - userId={}, startDate={}, endDate={}", userId, startDate, endDate);

        CommercialKpisDTO kpis = commercialDashboardService.getKpis(userId, startDate, endDate);
        return ResponseEntity.ok(kpis);
    }

    @GetMapping("/team-kpis")
    @Operation(summary = "KPIs consolidados da equipe", description = "Retorna KPIs agregados de toda a equipe comercial")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<TeamKpisDTO> getTeamKpis(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (endDate == null) endDate = LocalDate.now();
        if (startDate == null) startDate = endDate.minusMonths(12).withDayOfMonth(1);
        return ResponseEntity.ok(commercialDashboardService.getTeamKpis(startDate, endDate));
    }

    @GetMapping("/ranking")
    @Operation(summary = "Ranking de vendedores", description = "Retorna ranking ordenado por receita, conversão ou contratos")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<List<VendedorRankingDTO>> getRanking(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "revenue") String orderBy) {
        if (endDate == null) endDate = LocalDate.now();
        if (startDate == null) startDate = endDate.minusMonths(12).withDayOfMonth(1);
        return ResponseEntity.ok(commercialDashboardService.getRanking(startDate, endDate, orderBy));
    }

    @GetMapping("/pipeline")
    @Operation(summary = "Pipeline geral", description = "Distribuição de leads/oportunidades por etapa")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<Map<String, Long>> getPipeline() {
        return ResponseEntity.ok(commercialDashboardService.getPipeline());
    }

    @GetMapping("/revenue-by-segment")
    @Operation(summary = "Receita por segmento de cliente", description = "Agrupa receita das propostas aprovadas por nome de cliente")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<Map<String, Object>> getRevenueBySegment(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (endDate == null) endDate = LocalDate.now();
        if (startDate == null) startDate = endDate.minusMonths(12).withDayOfMonth(1);
        return ResponseEntity.ok(commercialDashboardService.getRevenueBySegment(startDate, endDate));
    }

    @GetMapping("/expiring-contracts")
    @Operation(summary = "Contratos a vencer", description = "Lista contratos que vencem nos próximos X dias")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<List<Map<String, Object>>> getExpiringContracts(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(commercialDashboardService.getExpiringContracts(days));
    }
}
