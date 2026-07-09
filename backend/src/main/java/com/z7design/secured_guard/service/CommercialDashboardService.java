package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CommercialKpisDTO;
import com.z7design.secured_guard.dto.TeamKpisDTO;
import com.z7design.secured_guard.dto.VendedorRankingDTO;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.ContractStatus;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.ProposalStatus;
import com.z7design.secured_guard.model.Proposal;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.ProposalRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommercialDashboardService {

    private final LeadRepository leadRepository;
    private final ProposalRepository proposalRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final WorkPostRepository workPostRepository;

    /**
     * Calcula KPIs para um usuário específico ou para toda a equipe.
     * Se userId == null, retorna dados globais.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "commercial-dashboard", key = "'kpis-' + (#userId != null ? #userId : 'all') + '-' + #startDate + '-' + #endDate")
    public CommercialKpisDTO getKpis(UUID userId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        log.info("Calculando KPIs comerciais. userId={}, período={} a {}", userId, startDate, endDate);

        long leadsRecebidos = countLeads(userId, start, end);
        long leadsQualificados = countLeadsByStatus(userId, LeadStatus.QUALIFIED, start, end)
                + countLeadsByStatus(userId, LeadStatus.PROPOSAL_SENT, start, end)
                + countLeadsByStatus(userId, LeadStatus.NEGOTIATION, start, end)
                + countLeadsByStatus(userId, LeadStatus.WON, start, end);

        long propostasEnviadas = countProposalsByStatus(userId, ProposalStatus.SENT, start, end)
                + countProposalsByStatus(userId, ProposalStatus.UNDER_REVIEW, start, end)
                + countProposalsByStatus(userId, ProposalStatus.APPROVED, start, end)
                + countProposalsByStatus(userId, ProposalStatus.REJECTED, start, end)
                + countProposalsByStatus(userId, ProposalStatus.CONVERTED, start, end);

        long propostasAprovadas = countProposalsByStatus(userId, ProposalStatus.APPROVED, start, end)
                + countProposalsByStatus(userId, ProposalStatus.CONVERTED, start, end);

        long leadsWon = countLeadsByStatus(userId, LeadStatus.WON, start, end);
        double taxaConversao = leadsRecebidos > 0 ? Math.round(leadsWon * 1000.0 / leadsRecebidos) / 10.0 : 0.0;

        BigDecimal receitaAprovada = sumProposalValue(userId, ProposalStatus.APPROVED, start, end)
                .add(sumProposalValue(userId, ProposalStatus.CONVERTED, start, end));

        BigDecimal ticketMedio = propostasAprovadas > 0
                ? receitaAprovada.divide(BigDecimal.valueOf(propostasAprovadas), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long contratosAtivos = userId != null
                ? contractRepository.countByResponsibleCommercialIdAndStatus(userId, ContractStatus.ACTIVE)
                : contractRepository.countByStatus(ContractStatus.ACTIVE);

        double tempoMedio = calcularTempoMedioFechamento(userId, start, end);

        // Dados para gráficos mensais
        Map<String, Long> leadsPorMes = calcularLeadsPorMes(userId, startDate, endDate);
        Map<String, BigDecimal> receitaPorMes = calcularReceitaPorMes(userId, startDate, endDate);
        Map<String, Double> conversaoPorMes = calcularConversaoPorMes(userId, startDate, endDate);

        // Funil de vendas
        Map<String, Long> funilVendas = new LinkedHashMap<>();
        funilVendas.put("Leads", leadsRecebidos);
        funilVendas.put("Qualificados", leadsQualificados);
        funilVendas.put("Propostas", propostasEnviadas);
        funilVendas.put("Aprovadas", propostasAprovadas);
        funilVendas.put("Contratos", leadsWon);

        String userName = null;
        if (userId != null) {
            userName = userRepository.findById(userId)
                    .map(u -> u.getName() != null ? u.getName() : u.getUsername())
                    .orElse(null);
        }

        // Consultar últimos registros e vencimentos
        String ultimoCliente = clientRepository.findFirstByOrderByCreatedAtDesc()
                .map(Client::getName)
                .orElse("Nenhum cliente cadastrado");

        String ultimoPosto = workPostRepository.findFirstByOrderByCreatedAtDesc()
                .map(WorkPost::getName)
                .orElse("Nenhum posto cadastrado");

        long contratosVencendoCount = contractRepository.countActiveContractsExpiringBetween(LocalDate.now(), LocalDate.now().plusDays(30), userId);

        long propostasEnviadasReal = countProposalsByStatus(userId, ProposalStatus.SENT, start, end);
        long propostasRetornadas = countProposalsByStatus(userId, ProposalStatus.APPROVED, start, end)
                + countProposalsByStatus(userId, ProposalStatus.REJECTED, start, end)
                + countProposalsByStatus(userId, ProposalStatus.CONVERTED, start, end);

        return CommercialKpisDTO.builder()
                .leadsRecebidos(leadsRecebidos)
                .leadsQualificados(leadsQualificados)
                .propostasEnviadas(propostasEnviadas)
                .propostasAprovadas(propostasAprovadas)
                .taxaConversao(taxaConversao)
                .ticketMedio(ticketMedio)
                .receitaContratada(receitaAprovada)
                .tempoMedioFechamentoDias(tempoMedio)
                .contratosAtivos(contratosAtivos)
                .leadsPorMes(leadsPorMes)
                .receitaPorMes(receitaPorMes)
                .conversaoPorMes(conversaoPorMes)
                .funilVendas(funilVendas)
                .userId(userId != null ? userId.toString() : null)
                .userName(userName)
                .periodo(startDate + " a " + endDate)
                .ultimoClienteCadastrado(ultimoCliente)
                .ultimoPostoTrabalhoCadastrado(ultimoPosto)
                .contratosVencendo(contratosVencendoCount)
                .propostasEnviadasReal(propostasEnviadasReal)
                .propostasRetornadas(propostasRetornadas)
                .build();
    }

    // --- Helpers de contagem ---

    private long countLeads(UUID userId, LocalDateTime start, LocalDateTime end) {
        if (userId != null) {
            return leadRepository.countByAssignedToIdAndPeriod(userId, start, end);
        }
        return leadRepository.countByPeriod(start, end);
    }

    private long countLeadsByStatus(UUID userId, LeadStatus status, LocalDateTime start, LocalDateTime end) {
        if (userId != null) {
            return leadRepository.countByAssignedToIdAndStatusAndPeriod(userId, status, start, end);
        }
        return leadRepository.countByStatusAndPeriod(status, start, end);
    }

    private long countProposalsByStatus(UUID userId, ProposalStatus status, LocalDateTime start, LocalDateTime end) {
        if (userId != null) {
            return proposalRepository.countByAssignedToIdAndStatusAndPeriod(userId, status, start, end);
        }
        return proposalRepository.countByStatusAndPeriod(status, start, end);
    }

    private BigDecimal sumProposalValue(UUID userId, ProposalStatus status, LocalDateTime start, LocalDateTime end) {
        BigDecimal val;
        if (userId != null) {
            val = proposalRepository.sumTotalValueByAssignedToIdAndStatusAndPeriod(userId, status, start, end);
        } else {
            val = proposalRepository.sumTotalValueByStatusAndPeriod(status, start, end);
        }
        return val != null ? val : BigDecimal.ZERO;
    }

    private double calcularTempoMedioFechamento(UUID userId, LocalDateTime start, LocalDateTime end) {
        List<Proposal> aprovadas;
        if (userId != null) {
            aprovadas = proposalRepository.findByAssignedToIdAndStatusAndPeriod(userId, ProposalStatus.APPROVED, start, end);
        } else {
            aprovadas = proposalRepository.findByStatusAndPeriod(ProposalStatus.APPROVED, start, end);
        }

        if (aprovadas.isEmpty()) return 0.0;

        double totalDias = 0;
        int count = 0;
        for (Proposal p : aprovadas) {
            if (p.getCreatedAt() != null && p.getUpdatedAt() != null) {
                long dias = ChronoUnit.DAYS.between(p.getCreatedAt(), p.getUpdatedAt());
                if (dias >= 0) {
                    totalDias += dias;
                    count++;
                }
            }
        }
        return count > 0 ? Math.round(totalDias / count * 10.0) / 10.0 : 0.0;
    }

    // --- Gráficos mensais ---

    private Map<String, Long> calcularLeadsPorMes(UUID userId, LocalDate startDate, LocalDate endDate) {
        Map<String, Long> resultado = new LinkedHashMap<>();
        LocalDate current = startDate.withDayOfMonth(1);
        while (!current.isAfter(endDate)) {
            LocalDateTime mesStart = current.atStartOfDay();
            LocalDateTime mesEnd = current.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusNanos(1);
            if (mesEnd.toLocalDate().isAfter(endDate)) {
                mesEnd = endDate.atTime(LocalTime.MAX);
            }
            String label = String.format("%02d/%d", current.getMonthValue(), current.getYear());
            long count = countLeads(userId, mesStart, mesEnd);
            resultado.put(label, count);
            current = current.plusMonths(1);
        }
        return resultado;
    }

    private Map<String, BigDecimal> calcularReceitaPorMes(UUID userId, LocalDate startDate, LocalDate endDate) {
        Map<String, BigDecimal> resultado = new LinkedHashMap<>();
        LocalDate current = startDate.withDayOfMonth(1);
        while (!current.isAfter(endDate)) {
            LocalDateTime mesStart = current.atStartOfDay();
            LocalDateTime mesEnd = current.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusNanos(1);
            if (mesEnd.toLocalDate().isAfter(endDate)) {
                mesEnd = endDate.atTime(LocalTime.MAX);
            }
            String label = String.format("%02d/%d", current.getMonthValue(), current.getYear());
            BigDecimal receita = sumProposalValue(userId, ProposalStatus.APPROVED, mesStart, mesEnd)
                    .add(sumProposalValue(userId, ProposalStatus.CONVERTED, mesStart, mesEnd));
            resultado.put(label, receita);
            current = current.plusMonths(1);
        }
        return resultado;
    }

    private Map<String, Double> calcularConversaoPorMes(UUID userId, LocalDate startDate, LocalDate endDate) {
        Map<String, Double> resultado = new LinkedHashMap<>();
        LocalDate current = startDate.withDayOfMonth(1);
        while (!current.isAfter(endDate)) {
            LocalDateTime mesStart = current.atStartOfDay();
            LocalDateTime mesEnd = current.plusMonths(1).withDayOfMonth(1).atStartOfDay().minusNanos(1);
            if (mesEnd.toLocalDate().isAfter(endDate)) {
                mesEnd = endDate.atTime(LocalTime.MAX);
            }
            String label = String.format("%02d/%d", current.getMonthValue(), current.getYear());
            long leadsTotal = countLeads(userId, mesStart, mesEnd);
            long won = countLeadsByStatus(userId, LeadStatus.WON, mesStart, mesEnd);
            double conv = leadsTotal > 0 ? Math.round(won * 1000.0 / leadsTotal) / 10.0 : 0.0;
            resultado.put(label, conv);
            current = current.plusMonths(1);
        }
        return resultado;
    }

    // ========== FASE 3: Endpoints de Equipe ==========

    /**
     * KPIs consolidados da equipe.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "commercial-dashboard", key = "'team-' + #startDate + '-' + #endDate")
    public TeamKpisDTO getTeamKpis(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        // Dados globais (userId=null)
        CommercialKpisDTO global = getKpis(null, startDate, endDate);

        // Buscar usuários com leads ou propostas atribuídas
        List<User> users = userRepository.findAll();
        Map<String, Long> leadsPorVendedor = new LinkedHashMap<>();
        Map<String, Double> conversaoPorVendedor = new LinkedHashMap<>();
        Map<String, BigDecimal> receitaPorVendedor = new LinkedHashMap<>();

        for (User user : users) {
            long leads = countLeads(user.getId(), start, end);
            if (leads == 0) continue; // ignorar usuários sem atividade

            String nome = user.getName() != null ? user.getName() : user.getUsername();
            leadsPorVendedor.put(nome, leads);

            long won = countLeadsByStatus(user.getId(), LeadStatus.WON, start, end);
            double conv = leads > 0 ? Math.round(won * 1000.0 / leads) / 10.0 : 0.0;
            conversaoPorVendedor.put(nome, conv);

            BigDecimal receita = sumProposalValue(user.getId(), ProposalStatus.APPROVED, start, end)
                    .add(sumProposalValue(user.getId(), ProposalStatus.CONVERTED, start, end));
            receitaPorVendedor.put(nome, receita);
        }

        return TeamKpisDTO.builder()
                .receitaTotal(global.getReceitaContratada())
                .totalLeads(global.getLeadsRecebidos())
                .totalPropostas(global.getPropostasEnviadas())
                .propostasAprovadas(global.getPropostasAprovadas())
                .contratosGanhos(countLeadsByStatus(null, LeadStatus.WON, start, end))
                .contratosAtivos(global.getContratosAtivos())
                .taxaConversaoGeral(global.getTaxaConversao())
                .ticketMedioGeral(global.getTicketMedio())
                .leadsPorVendedor(leadsPorVendedor)
                .conversaoPorVendedor(conversaoPorVendedor)
                .receitaPorVendedor(receitaPorVendedor)
                .pipelinePorEtapa(global.getFunilVendas())
                .receitaPorMes(global.getReceitaPorMes())
                .periodo(startDate + " a " + endDate)
                .build();
    }

    /**
     * Ranking de vendedores, ordenado por receita, conversão ou contratos.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "commercial-dashboard", key = "'ranking-' + #startDate + '-' + #endDate + '-' + #orderBy")
    public List<VendedorRankingDTO> getRanking(LocalDate startDate, LocalDate endDate, String orderBy) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        List<User> users = userRepository.findAll();
        List<VendedorRankingDTO> ranking = new ArrayList<>();

        for (User user : users) {
            long leads = countLeads(user.getId(), start, end);
            if (leads == 0) continue;

            long qualificados = countLeadsByStatus(user.getId(), LeadStatus.QUALIFIED, start, end)
                    + countLeadsByStatus(user.getId(), LeadStatus.PROPOSAL_SENT, start, end)
                    + countLeadsByStatus(user.getId(), LeadStatus.NEGOTIATION, start, end)
                    + countLeadsByStatus(user.getId(), LeadStatus.WON, start, end);

            long propostasEnv = countProposalsByStatus(user.getId(), ProposalStatus.SENT, start, end)
                    + countProposalsByStatus(user.getId(), ProposalStatus.UNDER_REVIEW, start, end)
                    + countProposalsByStatus(user.getId(), ProposalStatus.APPROVED, start, end)
                    + countProposalsByStatus(user.getId(), ProposalStatus.REJECTED, start, end)
                    + countProposalsByStatus(user.getId(), ProposalStatus.CONVERTED, start, end);

            long propostasAprov = countProposalsByStatus(user.getId(), ProposalStatus.APPROVED, start, end)
                    + countProposalsByStatus(user.getId(), ProposalStatus.CONVERTED, start, end);

            long won = countLeadsByStatus(user.getId(), LeadStatus.WON, start, end);
            double conv = leads > 0 ? Math.round(won * 1000.0 / leads) / 10.0 : 0.0;

            BigDecimal receita = sumProposalValue(user.getId(), ProposalStatus.APPROVED, start, end)
                    .add(sumProposalValue(user.getId(), ProposalStatus.CONVERTED, start, end));

            BigDecimal ticket = propostasAprov > 0
                    ? receita.divide(BigDecimal.valueOf(propostasAprov), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            ranking.add(VendedorRankingDTO.builder()
                    .userId(user.getId())
                    .userName(user.getName() != null ? user.getName() : user.getUsername())
                    .leadsRecebidos(leads)
                    .leadsQualificados(qualificados)
                    .propostasEnviadas(propostasEnv)
                    .propostasAprovadas(propostasAprov)
                    .taxaConversao(conv)
                    .receita(receita)
                    .ticketMedio(ticket)
                    .build());
        }

        // Ordenar
        Comparator<VendedorRankingDTO> comparator;
        switch (orderBy != null ? orderBy.toLowerCase() : "revenue") {
            case "conversion":
                comparator = Comparator.comparingDouble(VendedorRankingDTO::getTaxaConversao).reversed();
                break;
            case "contracts":
                comparator = Comparator.comparingLong(VendedorRankingDTO::getPropostasAprovadas).reversed();
                break;
            default: // revenue
                comparator = Comparator.comparing(VendedorRankingDTO::getReceita).reversed();
        }
        ranking.sort(comparator);

        // Atribuir posições
        for (int i = 0; i < ranking.size(); i++) {
            ranking.get(i).setPosicao(i + 1);
        }

        return ranking;
    }

    /**
     * Pipeline: distribuição de leads por status.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "commercial-dashboard", key = "'pipeline'")
    public Map<String, Long> getPipeline() {
        Map<String, Long> pipeline = new LinkedHashMap<>();
        pipeline.put("Novos", leadRepository.countByStatus(LeadStatus.NEW));
        pipeline.put("Contatados", leadRepository.countByStatus(LeadStatus.CONTACTED));
        pipeline.put("Qualificados", leadRepository.countByStatus(LeadStatus.QUALIFIED));
        pipeline.put("Proposta Enviada", leadRepository.countByStatus(LeadStatus.PROPOSAL_SENT));
        pipeline.put("Em Negociação", leadRepository.countByStatus(LeadStatus.NEGOTIATION));
        pipeline.put("Ganhos", leadRepository.countByStatus(LeadStatus.WON));
        pipeline.put("Perdidos", leadRepository.countByStatus(LeadStatus.LOST));
        return pipeline;
    }

    /**
     * Receita por segmento (agrupada por cliente).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getRevenueBySegment(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        List<Proposal> aprovadas = proposalRepository.findByStatusAndPeriod(ProposalStatus.APPROVED, start, end);
        List<Proposal> convertidas = proposalRepository.findByStatusAndPeriod(ProposalStatus.CONVERTED, start, end);

        Map<String, BigDecimal> receitaPorCliente = new LinkedHashMap<>();

        List<Proposal> todas = new ArrayList<>(aprovadas);
        todas.addAll(convertidas);

        for (Proposal p : todas) {
            String clientName = "Sem Cliente";
            try {
                if (p.getClient() != null && p.getClient().getName() != null) {
                    clientName = p.getClient().getName();
                }
            } catch (Exception e) {
                // proxy issue
            }
            receitaPorCliente.merge(clientName, p.getTotalValue() != null ? p.getTotalValue() : BigDecimal.ZERO, BigDecimal::add);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("segmentos", receitaPorCliente);
        result.put("total", receitaPorCliente.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add));
        return result;
    }

    /**
     * Contratos a vencer nos próximos X dias.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getExpiringContracts(int days) {
        LocalDate today = LocalDate.now();
        LocalDate limit = today.plusDays(days);

        List<Contract> expiring = contractRepository.findContractsExpiringBetween(today, limit);

        return expiring.stream().map(c -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", c.getId());
            map.put("contractNumber", c.getContractNumber());
            map.put("description", c.getDescription());
            map.put("endDate", c.getEndDate());
            map.put("value", c.getValue());
            map.put("status", c.getStatus());
            try {
                map.put("clientName", c.getClient() != null ? c.getClient().getName() : "N/A");
            } catch (Exception e) {
                map.put("clientName", "N/A");
            }
            long diasRestantes = ChronoUnit.DAYS.between(today, c.getEndDate());
            map.put("diasRestantes", diasRestantes);
            String urgencia = diasRestantes <= 30 ? "URGENTE" : diasRestantes <= 60 ? "ATENÇÃO" : "NORMAL";
            map.put("urgencia", urgencia);
            return map;
        }).collect(Collectors.toList());
    }
}
