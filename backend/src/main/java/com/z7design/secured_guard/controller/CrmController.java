package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.ProposalStatus;
import com.z7design.secured_guard.service.LeadService;
import com.z7design.secured_guard.service.ProposalService;
import com.z7design.secured_guard.service.QuoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Collections;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/crm")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "CRM", description = "Endpoints para métricas e dashboard do CRM Comercial")
public class CrmController {

    private final LeadService leadService;
    private final ProposalService proposalService;
    private final QuoteService quoteService;

    @GetMapping("/dashboard/metrics")
    @Operation(summary = "Obter métricas do CRM", description = "Retorna métricas agregadas para o dashboard do CRM")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getCrmMetrics() {
        try {
            log.info("Buscando métricas do CRM");
            
            // Totais via count() para evitar carregar todas entidades (evita 500 por lazy/mapping)
            long totalLeads = leadService.count();
            long qualifiedLeads = leadService.countByStatus(LeadStatus.QUALIFIED);
            long proposalSentLeads = leadService.countByStatus(LeadStatus.PROPOSAL_SENT);
            long negotiationLeads = leadService.countByStatus(LeadStatus.NEGOTIATION);
            long wonLeads = leadService.countByStatus(LeadStatus.WON);
            long activeOpportunities = qualifiedLeads + negotiationLeads + proposalSentLeads;
            long totalProposals = proposalService.count();
            long totalQuotes = quoteService.count();
            
            BigDecimal estimatedRevenue = proposalService.getTotalValueByStatus(ProposalStatus.SENT)
                    .add(proposalService.getTotalValueByStatus(ProposalStatus.UNDER_REVIEW));
            double conversionRate = totalLeads > 0 ? (wonLeads * 100.0 / totalLeads) : 0.0;
            
            // Contagem por mês (últimos 6 meses) - null-safe
            Map<String, Long> monthlyCount = new HashMap<>();
            List<Lead> recentLeadsList;
            try {
                recentLeadsList = leadService.findRecentLeads(30);
            } catch (Exception e) {
                log.warn("findRecentLeads falhou, usando lista vazia: {}", e.getMessage());
                recentLeadsList = Collections.emptyList();
            }
            final List<Lead> leadsForMonth = recentLeadsList != null ? recentLeadsList : Collections.emptyList();
            for (int i = 5; i >= 0; i--) {
                LocalDateTime monthStart = LocalDateTime.now().minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
                long count = leadsForMonth.stream()
                        .filter(lead -> lead.getCreatedAt() != null
                                && lead.getCreatedAt().isAfter(monthStart)
                                && lead.getCreatedAt().isBefore(monthStart.plusMonths(1)))
                        .count();
                String monthKey = monthStart.getMonth().name().substring(0, 3) + "/" + monthStart.getYear();
                monthlyCount.put(monthKey, count);
            }
            
            // Histórico de status (últimos 6 meses) - null-safe
            Map<String, Map<String, Long>> statusHistory = new HashMap<>();
            for (int i = 5; i >= 0; i--) {
                LocalDateTime monthStart = LocalDateTime.now().minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
                String monthKey = monthStart.getMonth().name().substring(0, 3) + "/" + monthStart.getYear();
                Map<String, Long> statusCount = new HashMap<>();
                for (LeadStatus st : new LeadStatus[]{ LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.NEGOTIATION, LeadStatus.WON, LeadStatus.LOST }) {
                    List<Lead> list;
                    try {
                        list = leadService.findByStatus(st);
                    } catch (Exception e) {
                        list = Collections.emptyList();
                    }
                    long c = (list != null ? list : Collections.<Lead>emptyList()).stream()
                            .filter(lead -> lead.getCreatedAt() != null && lead.getCreatedAt().isAfter(monthStart) && lead.getCreatedAt().isBefore(monthStart.plusMonths(1)))
                            .count();
                    statusCount.put(st.name(), c);
                }
                statusHistory.put(monthKey, statusCount);
            }
            
            Map<String, Object> metrics = new HashMap<>();
            metrics.put("totalLeads", totalLeads);
            metrics.put("activeOpportunities", activeOpportunities);
            metrics.put("totalProposals", totalProposals);
            metrics.put("totalQuotes", totalQuotes);
            metrics.put("conversionRate", Math.round(conversionRate * 10.0) / 10.0);
            metrics.put("estimatedRevenue", estimatedRevenue != null ? estimatedRevenue : BigDecimal.ZERO);
            metrics.put("totalValue", estimatedRevenue != null ? estimatedRevenue : BigDecimal.ZERO);
            metrics.put("monthlyCount", monthlyCount);
            metrics.put("statusHistory", statusHistory);
            
            log.info("✅ Métricas do CRM calculadas com sucesso");
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            log.error("❌ Erro ao calcular métricas do CRM", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/dashboard/kanban-summary")
    @Operation(summary = "Obter resumo do Kanban", description = "Retorna resumo de leads por status para o Kanban")
    @PreAuthorize("hasAnyAuthority('CRM_READ', 'LEADS_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getKanbanSummary() {
        try {
            log.info("Buscando resumo do Kanban");
            
            Map<String, Long> summary = new HashMap<>();
            summary.put("NEW", leadService.countByStatus(LeadStatus.NEW));
            summary.put("CONTACTED", leadService.countByStatus(LeadStatus.CONTACTED));
            summary.put("QUALIFIED", leadService.countByStatus(LeadStatus.QUALIFIED));
            summary.put("PROPOSAL_SENT", leadService.countByStatus(LeadStatus.PROPOSAL_SENT));
            summary.put("NEGOTIATION", leadService.countByStatus(LeadStatus.NEGOTIATION));
            summary.put("WON", leadService.countByStatus(LeadStatus.WON));
            summary.put("LOST", leadService.countByStatus(LeadStatus.LOST));
            
            log.info("✅ Resumo do Kanban calculado com sucesso");
            return ResponseEntity.ok(Map.of("summary", summary));
        } catch (Exception e) {
            log.error("❌ Erro ao calcular resumo do Kanban", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}

