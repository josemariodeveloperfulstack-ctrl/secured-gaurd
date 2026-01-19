package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.DashboardSummaryDTO;
import com.z7design.secured_guard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DashboardService {

    // Repositories
    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final ServiceRepository serviceRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleMaintenanceRepository vehicleMaintenanceRepository;
    private final MeasurementBulletinRepository measurementBulletinRepository;
    private final InvoiceRepository invoiceRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserActivityLogRepository userActivityLogRepository;
    private final NotificationRepository notificationRepository;

    public DashboardSummaryDTO getDashboardSummary() {
        log.info("Gerando resumo do dashboard (não encontrado no cache)");
        
        DashboardSummaryDTO summary = new DashboardSummaryDTO();
        
        try {
            // Estatísticas de usuários
            summary.setTotalUsers(userRepository.count());
            summary.setActiveUsers(userRepository.count()); // Usar count total como ativos por enquanto
            
            // Estatísticas de clientes e contratos
            summary.setTotalClients(clientRepository.count());
            summary.setActiveContracts(clientRepository.count()); // Usar count total como ativos por enquanto
            
            // Estatísticas de serviços
            summary.setTotalServices(serviceRepository.count());
            
            // Estatísticas de veículos
            summary.setTotalVehicles(vehicleRepository.count());
            
            // Estatísticas de manutenções
            try {
                summary.setTotalMaintenances(vehicleMaintenanceRepository.count());
            } catch (Exception e) {
                log.warn("Tabela vehicle_maintenances não existe, usando valor padrão", e);
                summary.setTotalMaintenances(0L);
            }
            
            // Estatísticas de medições
            summary.setTotalMeasurements(measurementBulletinRepository.count());
            summary.setPendingMeasurements(0L); // Implementar quando tiver o enum correto
            
            // Estatísticas de faturas
            summary.setTotalInvoices(invoiceRepository.count());
            summary.setPendingInvoices(0L); // Implementar quando tiver o enum correto
            
            // Estatísticas de equipamentos
            Map<String, Object> equipmentStats = getEquipmentStatistics();
            summary.setTotalEquipment(((Number) equipmentStats.get("total")).longValue());
            summary.setEquipmentInUse(((Number) equipmentStats.get("inUse")).longValue());
            summary.setEquipmentInMaintenance(((Number) equipmentStats.get("inMaintenance")).longValue());
            summary.setEquipmentExpiring(((Number) equipmentStats.get("expiringSoon")).longValue());
            
            // Estatísticas de receita
            Map<String, BigDecimal> revenueStats = getRevenueStatistics();
            summary.setMonthlyRevenue(revenueStats.get("monthly"));
            summary.setTotalRevenue(revenueStats.get("total"));
            
            // Estatísticas de tarefas e alertas
            summary.setPendingTasks(getPendingTasksCount());
            summary.setCompletedTasks(getCompletedTasksCount());
            summary.setTotalAlerts(notificationRepository.count());
            summary.setUnreadAlerts(notificationRepository.count()); // Usar count total por enquanto
            
            // Estatísticas de funcionários (se disponível)
            summary.setTotalEmployees(getEmployeesCount());
            
            // Dados de tendência
            summary.setDailyStats(getDailyStats());
            summary.setRecentActivities(getRecentActivities());
            summary.setSystemAlerts(getSystemAlerts());
            
            // Informações do sistema
            summary.setLastUpdate(LocalDateTime.now());
            summary.setSystemVersion("1.0.0");
            summary.setEnvironment(getEnvironment());
            
            log.info("Dashboard summary gerado com sucesso");
            
        } catch (Exception e) {
            log.error("Erro ao gerar resumo do dashboard", e);
            // Retorna dados básicos em caso de erro
            setBasicData(summary);
        }
        
        return summary;
    }

    @Cacheable(value = "statistics", key = "'equipment-stats'")
    private Map<String, Object> getEquipmentStatistics() {
        try {
            log.debug("Buscando estatísticas de equipamentos (não encontrado no cache)");
            // Buscar estatísticas de equipamentos
            long total = equipmentRepository.count();
            long inUse = 0L; // Implementar quando tiver o enum correto
            long inMaintenance = 0L; // Implementar quando tiver o enum correto
            
            // Equipamentos vencendo em 30 dias
            long expiringSoon = 0L; // Implementar quando tiver o método correto
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", total);
            stats.put("inUse", inUse);
            stats.put("inMaintenance", inMaintenance);
            stats.put("expiringSoon", expiringSoon);
            
            return stats;
        } catch (Exception e) {
            log.warn("Erro ao buscar estatísticas de equipamentos", e);
            return createEmptyEquipmentStats();
        }
    }

    private Map<String, Object> createEmptyEquipmentStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", 0L);
        stats.put("inUse", 0L);
        stats.put("inMaintenance", 0L);
        stats.put("expiringSoon", 0L);
        return stats;
    }

    @Cacheable(value = "statistics", key = "'revenue-stats'")
    private Map<String, BigDecimal> getRevenueStatistics() {
        try {
            log.debug("Buscando estatísticas de receita (não encontrado no cache)");
            // Por enquanto retornar valores zerados até implementar os métodos corretos
            Map<String, BigDecimal> revenue = new HashMap<>();
            revenue.put("monthly", BigDecimal.ZERO);
            revenue.put("total", BigDecimal.ZERO);
            
            return revenue;
        } catch (Exception e) {
            log.warn("Erro ao buscar estatísticas de receita", e);
            Map<String, BigDecimal> revenue = new HashMap<>();
            revenue.put("monthly", BigDecimal.ZERO);
            revenue.put("total", BigDecimal.ZERO);
            return revenue;
        }
    }

    private Long getPendingTasksCount() {
        try {
            // Contar tarefas pendentes (pode ser baseado em diferentes entidades)
            return 0L; // Implementar conforme necessidade específica
        } catch (Exception e) {
            log.warn("Erro ao contar tarefas pendentes", e);
            return 0L;
        }
    }

    private Long getCompletedTasksCount() {
        try {
            // Contar tarefas concluídas
            return 0L; // Implementar conforme necessidade específica
        } catch (Exception e) {
            log.warn("Erro ao contar tarefas concluídas", e);
            return 0L;
        }
    }

    private Long getEmployeesCount() {
        try {
            // Contar funcionários (se houver entidade específica)
            return 0L; // Implementar conforme necessidade específica
        } catch (Exception e) {
            log.warn("Erro ao contar funcionários", e);
            return 0L;
        }
    }

    private Map<String, Long> getDailyStats() {
        try {
            // Estatísticas dos últimos 7 dias
            Map<String, Long> dailyStats = new LinkedHashMap<>();
            LocalDate today = LocalDate.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
            
            for (int i = 6; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                String dateKey = date.format(formatter);
                
                // Por enquanto retornar valores zerados
                dailyStats.put(dateKey, 0L);
            }
            
            return dailyStats;
        } catch (Exception e) {
            log.warn("Erro ao buscar estatísticas diárias", e);
            return new HashMap<>();
        }
    }

    private List<Map<String, Object>> getRecentActivities() {
        try {
            // Por enquanto retornar lista vazia até implementar os métodos corretos
            return new ArrayList<>();
        } catch (Exception e) {
            log.warn("Erro ao buscar atividades recentes", e);
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> getSystemAlerts() {
        try {
            // Por enquanto retornar lista vazia até implementar os métodos corretos
            return new ArrayList<>();
        } catch (Exception e) {
            log.warn("Erro ao buscar alertas do sistema", e);
            return new ArrayList<>();
        }
    }

    private String getEnvironment() {
        try {
            // Detectar ambiente (desenvolvimento, produção, etc.)
            String env = System.getProperty("spring.profiles.active");
            return env != null ? env : "development";
        } catch (Exception e) {
            return "unknown";
        }
    }

    private void setBasicData(DashboardSummaryDTO summary) {
        summary.setTotalUsers(0L);
        summary.setActiveUsers(0L);
        summary.setActiveContracts(0L);
        summary.setMonthlyRevenue(BigDecimal.ZERO);
        summary.setTotalRevenue(BigDecimal.ZERO);
        summary.setTotalEquipment(0L);
        summary.setEquipmentInUse(0L);
        summary.setEquipmentInMaintenance(0L);
        summary.setEquipmentExpiring(0L);
        summary.setPendingTasks(0L);
        summary.setCompletedTasks(0L);
        summary.setTotalAlerts(0L);
        summary.setUnreadAlerts(0L);
        summary.setTotalEmployees(0L);
        summary.setTotalClients(0L);
        summary.setTotalServices(0L);
        summary.setTotalVehicles(0L);
        summary.setTotalMaintenances(0L);
        summary.setTotalMeasurements(0L);
        summary.setPendingMeasurements(0L);
        summary.setTotalInvoices(0L);
        summary.setPendingInvoices(0L);
        summary.setLastUpdate(LocalDateTime.now());
        summary.setSystemVersion("1.0.0");
        summary.setEnvironment("unknown");
    }
}
