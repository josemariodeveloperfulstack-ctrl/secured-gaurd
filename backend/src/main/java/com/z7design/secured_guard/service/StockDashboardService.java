package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.StockDashboardDTO;
import com.z7design.secured_guard.dto.StockMovementChartDTO;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.StockCategory;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StockMovementRepository;
import com.z7design.secured_guard.repository.StockRequisitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StockDashboardService {

    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockRequisitionRepository stockRequisitionRepository;
    private final StockService stockService;

    public StockDashboardDTO getDashboardData(UUID companyId, LocalDateTime start, LocalDateTime end) {
        log.info("Buscando dados do dashboard de estoque para empresa: {}", companyId);

        // 1. Métricas Básicas
        Map<String, Object> stats = stockService.getStockReport();
        
        // 2. Gráfico de Movimentações (últimos 30 dias ou período selecionado)
        List<StockMovementChartDTO> movementsChart = getMovementsChartData(start, end);

        // 3. Distribuição por Categoria
        Map<StockCategory, Long> categoryDist = (Map<StockCategory, Long>) stats.get("itemsByCategory");
        Map<String, Long> categoryDistStr = new HashMap<>();
        if (categoryDist != null) {
            categoryDist.forEach((k, v) -> categoryDistStr.put(k.toString(), v));
        }

        // 4. Status do Estoque
        Map<String, Long> statusDist = new HashMap<>();
        statusDist.put("NORMAL", (Long) stats.get("totalItems") - (Long) stats.get("lowStockCount") - (Long) stats.get("outOfStockCount"));
        statusDist.put("BAIXO", (Long) stats.get("lowStockCount"));
        statusDist.put("SEM_ESTOQUE", (Long) stats.get("outOfStockCount"));

        // 5. Requisições
        Long generated = stockRequisitionRepository.count();
        Long consolidated = stockRequisitionRepository.countByStatus(StockRequisitionStatus.DELIVERED);

        return StockDashboardDTO.builder()
                .totalItems((Long) stats.get("totalItems"))
                .lowStockCount((Long) stats.get("lowStockCount"))
                .outOfStockCount((Long) stats.get("outOfStockCount"))
                .normalStockCount(statusDist.get("NORMAL"))
                .totalValue(BigDecimal.valueOf((Double) stats.get("totalValue")))
                .movementsChart(movementsChart)
                .categoryDistribution(categoryDistStr)
                .stockStatusDistribution(statusDist)
                .recentRequisitions(stockRequisitionRepository.findAllListItems().stream().limit(5).collect(Collectors.toList()))
                .generatedRequisitionsCount(generated)
                .consolidatedRequisitionsCount(consolidated)
                .build();
    }

    private List<StockMovementChartDTO> getMovementsChartData(LocalDateTime start, LocalDateTime end) {
        if (start == null) start = LocalDateTime.now().minusDays(30);
        if (end == null) end = LocalDateTime.now();

        List<Object[]> results = stockMovementRepository.countMovementsByDay(start, end);
        
        Map<String, StockMovementChartDTO> chartMap = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");

        // Inicializar mapa com zeros para todos os dias no período
        LocalDateTime current = start;
        while (current.isBefore(end) || current.isEqual(end)) {
            String label = current.format(formatter);
            chartMap.put(label, new StockMovementChartDTO(label, 0L, 0L));
            current = current.plusDays(1);
        }

        // Preencher com dados reais
        for (Object[] row : results) {
            LocalDate date = ((java.sql.Date) row[0]).toLocalDate();
            String label = date.format(formatter);
            
            // Converter string para enum MovementType com segurança
            String typeStr = row[1] != null ? row[1].toString() : "";
            MovementType type;
            try {
                type = MovementType.valueOf(typeStr);
            } catch (IllegalArgumentException e) {
                log.warn("Tipo de movimentação desconhecido na query nativa: {}", typeStr);
                continue;
            }
            
            Long count = row[2] instanceof Number ? ((Number) row[2]).longValue() : 0L;

            StockMovementChartDTO dto = chartMap.getOrDefault(label, new StockMovementChartDTO(label, 0L, 0L));
            if (type == MovementType.ENTRADA) {
                dto.setEntries(count);
            } else {
                dto.setExits(count);
            }
        }

        return new ArrayList<>(chartMap.values());
    }
}
