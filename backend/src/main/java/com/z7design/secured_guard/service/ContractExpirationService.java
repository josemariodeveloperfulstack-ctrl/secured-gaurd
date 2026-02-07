package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ContractExpiringAlertDTO;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.enums.ContractStatus;
import com.z7design.secured_guard.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ContractExpirationService {

    private final ContractRepository contractRepository;
    private final SystemNotificationService notificationService;

    private static final int[] ALERT_DAYS = { 30, 60, 90, 120 };

    /**
     * Retorna contratos ativos que vencem nos próximos 120 dias, com nível de urgência.
     */
    public List<ContractExpiringAlertDTO> getExpiringAlerts() {
        LocalDate today = LocalDate.now();
        LocalDate endRange = today.plusDays(120);

        List<Contract> contracts = contractRepository.findActiveContractsExpiringBetween(today, endRange);

        List<ContractExpiringAlertDTO> alerts = new ArrayList<>();
        for (Contract c : contracts) {
            if (c.getEndDate() == null) continue;

            long daysRemaining = ChronoUnit.DAYS.between(today, c.getEndDate());
            if (daysRemaining < 0) continue;

            String urgency = getUrgencyLevel(daysRemaining);
            String clientName = c.getClient() != null ? c.getClient().getName() : "N/A";

            alerts.add(ContractExpiringAlertDTO.builder()
                    .contractId(c.getId())
                    .contractNumber(c.getContractNumber())
                    .clientName(clientName)
                    .endDate(c.getEndDate())
                    .daysRemaining(daysRemaining)
                    .urgencyLevel(urgency)
                    .value(c.getValue())
                    .build());
        }

        return alerts.stream()
                .sorted((a, b) -> Long.compare(a.getDaysRemaining(), b.getDaysRemaining()))
                .collect(Collectors.toList());
    }

    /**
     * Job agendado: verifica contratos a vencer e envia notificações (executa diariamente às 8h).
     */
    @Scheduled(cron = "${app.contract-expiration.cron:0 0 8 * * ?}")
    @Transactional
    public void checkAndNotifyExpiringContracts() {
        log.info("Verificando contratos a vencer...");
        LocalDate today = LocalDate.now();

        for (int days : ALERT_DAYS) {
            LocalDate startDate = today.plusDays(days - 7);
            LocalDate endDate = today.plusDays(days + 7);

            List<Contract> contracts = contractRepository.findActiveContractsExpiringBetween(startDate, endDate);

            for (Contract c : contracts) {
                if (c.getEndDate() == null) continue;
                try {
                    String clientName = c.getClient() != null ? c.getClient().getName() : "N/A";
                    notificationService.createContractExpiringNotification(
                            clientName,
                            c.getContractNumber(),
                            c.getEndDate().atStartOfDay(),
                            c.getValue()
                    );
                    log.info("Notificação criada para contrato {} vencendo em {} dias", c.getContractNumber(), days);
                } catch (Exception e) {
                    log.error("Erro ao criar notificação para contrato {}", c.getContractNumber(), e);
                }
            }
        }
        log.info("Verificação de contratos a vencer concluída.");
    }

    private String getUrgencyLevel(long daysRemaining) {
        if (daysRemaining <= 30) return "CRITICAL";
        if (daysRemaining <= 60) return "WARNING";
        if (daysRemaining <= 90) return "INFO";
        return "NORMAL";
    }
}
