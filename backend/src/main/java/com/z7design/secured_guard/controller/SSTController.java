package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.SSTAlert;
import com.z7design.secured_guard.model.enums.SSTAlertType;
import com.z7design.secured_guard.service.SSTAlertService;
import com.z7design.secured_guard.service.AuthenticationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller principal para o módulo SST (Saúde e Segurança do Trabalho)
 */
@RestController
@RequestMapping("/api/sst")
@RequiredArgsConstructor
@Tag(name = "SST - Saúde e Segurança do Trabalho", description = "API para gerenciamento de SST")
public class SSTController {

    private final SSTAlertService alertService;
    private final AuthenticationService authenticationService;

    // ========== ALERTAS SST ==========

    @GetMapping("/alerts")
    @Operation(summary = "Listar alertas SST", description = "Retorna todos os alertas do sistema SST")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTAlert>> getAllAlerts() {
        List<SSTAlert> alerts = alertService.getAllAlerts();
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/alerts/employee/{employeeId}")
    @Operation(summary = "Listar alertas por funcionário", description = "Retorna alertas de um funcionário específico")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTAlert>> getAlertsByEmployee(@PathVariable UUID employeeId) {
        List<SSTAlert> alerts = alertService.getAlertsByEmployee(employeeId);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/alerts/unread/employee/{employeeId}")
    @Operation(summary = "Listar alertas não lidos por funcionário", description = "Retorna alertas não lidos de um funcionário")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTAlert>> getUnreadAlertsByEmployee(@PathVariable UUID employeeId) {
        List<SSTAlert> alerts = alertService.getUnreadAlertsByEmployee(employeeId);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/alerts/overdue")
    @Operation(summary = "Listar alertas vencidos", description = "Retorna alertas que estão vencidos")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTAlert>> getOverdueAlerts() {
        List<SSTAlert> alerts = alertService.getOverdueAlerts();
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/alerts/due-soon")
    @Operation(summary = "Listar alertas próximos do vencimento", description = "Retorna alertas que vencem nos próximos dias")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTAlert>> getAlertsDueSoon(@RequestParam(defaultValue = "7") int daysAhead) {
        List<SSTAlert> alerts = alertService.getAlertsDueSoon(daysAhead);
        return ResponseEntity.ok(alerts);
    }

    @PostMapping("/alerts/{alertId}/read")
    @Operation(summary = "Marcar alerta como lido", description = "Marca um alerta como lido")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Void> markAlertAsRead(@PathVariable UUID alertId) {
        alertService.markAsRead(alertId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/alerts/{alertId}/resolve")
    @Operation(summary = "Marcar alerta como resolvido", description = "Marca um alerta como resolvido")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Void> markAlertAsResolved(@PathVariable UUID alertId, Authentication authentication) {
        // Obter o usuário atual do contexto de autenticação
        UUID resolvedByUserId = authenticationService.getCurrentUser(authentication).getId();
        alertService.markAsResolved(alertId, resolvedByUserId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/alerts/count/unread/employee/{employeeId}")
    @Operation(summary = "Contar alertas não lidos por funcionário", description = "Retorna a quantidade de alertas não lidos de um funcionário")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Long> countUnreadAlertsByEmployee(@PathVariable UUID employeeId) {
        Long count = alertService.countUnreadAlertsByEmployee(employeeId);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/alerts/type/{alertType}")
    @Operation(summary = "Listar alertas por tipo", description = "Retorna alertas de um tipo específico")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTAlert>> getAlertsByType(@PathVariable SSTAlertType alertType) {
        List<SSTAlert> alerts = alertService.getAlertsByType(alertType);
        return ResponseEntity.ok(alerts);
    }

    // ========== DASHBOARD SST ==========

    @GetMapping("/dashboard/summary")
    @Operation(summary = "Resumo do dashboard SST", description = "Retorna resumo dos indicadores de SST")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<SSTDashboardSummary> getDashboardSummary() {
        SSTDashboardSummary summary = new SSTDashboardSummary();
        
        // Buscar dados dos alertas
        List<SSTAlert> allAlerts = alertService.getAllAlerts();
        List<SSTAlert> unreadAlerts = alertService.getUnreadAlerts();
        List<SSTAlert> overdueAlerts = alertService.getOverdueAlerts();
        
        summary.setTotalAlerts((long) allAlerts.size());
        summary.setUnreadAlerts((long) unreadAlerts.size());
        summary.setOverdueAlerts((long) overdueAlerts.size());
        
        // TODO: Implementar contadores para funcionários, exames, treinamentos e acidentes
        summary.setTotalEmployees(0L);
        summary.setEmployeesWithPendingExams(0L);
        summary.setEmployeesWithPendingTrainings(0L);
        summary.setTotalAccidents(0L);
        summary.setAccidentsThisMonth(0L);
        
        return ResponseEntity.ok(summary);
    }

    // ========== RELATÓRIOS SST ==========
    
    @GetMapping("/reports")
    @Operation(summary = "Listar relatórios SST", description = "Retorna todos os relatórios SST disponíveis")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<Map<String, Object>>> getReports() {
        // TODO: Implementar quando a funcionalidade de relatórios SST for desenvolvida
        // Por enquanto, retorna lista vazia para evitar erros 500
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/reports/executions")
    @Operation(summary = "Listar execuções de relatórios SST", description = "Retorna todas as execuções de relatórios SST")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<Map<String, Object>>> getReportExecutions() {
        // TODO: Implementar quando a funcionalidade de execuções de relatórios SST for desenvolvida
        // Por enquanto, retorna lista vazia para evitar erros 500
        return ResponseEntity.ok(List.of());
    }

    // ========== CLASSE AUXILIAR PARA DASHBOARD ==========
    
    public static class SSTDashboardSummary {
        private Long totalAlerts;
        private Long unreadAlerts;
        private Long overdueAlerts;
        private Long totalEmployees;
        private Long employeesWithPendingExams;
        private Long employeesWithPendingTrainings;
        private Long totalAccidents;
        private Long accidentsThisMonth;

        // Getters e Setters
        public Long getTotalAlerts() { return totalAlerts; }
        public void setTotalAlerts(Long totalAlerts) { this.totalAlerts = totalAlerts; }
        
        public Long getUnreadAlerts() { return unreadAlerts; }
        public void setUnreadAlerts(Long unreadAlerts) { this.unreadAlerts = unreadAlerts; }
        
        public Long getOverdueAlerts() { return overdueAlerts; }
        public void setOverdueAlerts(Long overdueAlerts) { this.overdueAlerts = overdueAlerts; }
        
        public Long getTotalEmployees() { return totalEmployees; }
        public void setTotalEmployees(Long totalEmployees) { this.totalEmployees = totalEmployees; }
        
        public Long getEmployeesWithPendingExams() { return employeesWithPendingExams; }
        public void setEmployeesWithPendingExams(Long employeesWithPendingExams) { this.employeesWithPendingExams = employeesWithPendingExams; }
        
        public Long getEmployeesWithPendingTrainings() { return employeesWithPendingTrainings; }
        public void setEmployeesWithPendingTrainings(Long employeesWithPendingTrainings) { this.employeesWithPendingTrainings = employeesWithPendingTrainings; }
        
        public Long getTotalAccidents() { return totalAccidents; }
        public void setTotalAccidents(Long totalAccidents) { this.totalAccidents = totalAccidents; }
        
        public Long getAccidentsThisMonth() { return accidentsThisMonth; }
        public void setAccidentsThisMonth(Long accidentsThisMonth) { this.accidentsThisMonth = accidentsThisMonth; }
    }
}
