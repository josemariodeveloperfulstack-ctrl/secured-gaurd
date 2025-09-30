package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.DashboardSummaryDTO;
import com.z7design.secured_guard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Dashboard", description = "Endpoints para dados do dashboard principal")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(
        summary = "Obter resumo do dashboard", 
        description = "Retorna estatísticas gerais do sistema para o dashboard principal"
    )
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','FINANCEIRO','OPERACIONAL','CLIENTE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH','ROLE_FINANCEIRO','ROLE_OPERACIONAL','ROLE_CLIENTE')")
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary() {
        try {
            log.info("Solicitando resumo do dashboard");
            
            DashboardSummaryDTO summary = dashboardService.getDashboardSummary();
            
            log.info("Dashboard summary gerado com sucesso - {} usuários, {} contratos ativos", 
                summary.getTotalUsers(), summary.getActiveContracts());
            
            return ResponseEntity.ok(summary);
            
        } catch (Exception e) {
            log.error("Erro ao gerar resumo do dashboard", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/stats/quick")
    @Operation(
        summary = "Obter estatísticas rápidas", 
        description = "Retorna estatísticas básicas para widgets do dashboard"
    )
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','FINANCEIRO','OPERACIONAL','CLIENTE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH','ROLE_FINANCEIRO','ROLE_OPERACIONAL','ROLE_CLIENTE')")
    public ResponseEntity<Object> getQuickStats() {
        try {
            log.info("Solicitando estatísticas rápidas do dashboard");
            
            DashboardSummaryDTO summary = dashboardService.getDashboardSummary();
            
            // Retorna apenas os dados principais para widgets
            return ResponseEntity.ok(Map.of(
                "totalUsers", summary.getTotalUsers(),
                "activeUsers", summary.getActiveUsers(),
                "activeContracts", summary.getActiveContracts(),
                "monthlyRevenue", summary.getMonthlyRevenue(),
                "totalEquipment", summary.getTotalEquipment(),
                "pendingTasks", summary.getPendingTasks(),
                "totalAlerts", summary.getTotalAlerts(),
                "unreadAlerts", summary.getUnreadAlerts(),
                "lastUpdate", summary.getLastUpdate()
            ));
            
        } catch (Exception e) {
            log.error("Erro ao gerar estatísticas rápidas", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/health")
    @Operation(
        summary = "Verificar saúde do dashboard", 
        description = "Endpoint para verificar se o dashboard está funcionando corretamente"
    )
    public ResponseEntity<Object> getDashboardHealth() {
        try {
            log.debug("Verificando saúde do dashboard");
            
            return ResponseEntity.ok(Map.of(
                "status", "UP",
                "timestamp", java.time.LocalDateTime.now(),
                "service", "dashboard"
            ));
            
        } catch (Exception e) {
            log.error("Erro ao verificar saúde do dashboard", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "DOWN",
                "timestamp", java.time.LocalDateTime.now(),
                "service", "dashboard",
                "error", e.getMessage()
            ));
        }
    }
}
