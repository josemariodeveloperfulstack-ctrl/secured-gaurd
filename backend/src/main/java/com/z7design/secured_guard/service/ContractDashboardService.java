package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ContractDashboardStatsDTO;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.enums.ContractStatus;
import com.z7design.secured_guard.repository.ContractAmendmentRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContractDashboardService {

    private final ContractRepository contractRepository;
    private final ContractAmendmentRepository amendmentRepository;

    public ContractDashboardStatsDTO getStats() {
        LocalDate today = LocalDate.now();
        LocalDate in120Days = today.plusDays(120);

        List<Contract> activeContracts = contractRepository.findByStatus(ContractStatus.ACTIVE);
        List<Contract> expiringContracts = contractRepository.findActiveContractsExpiringBetween(today, in120Days);
        long suspendedCount = contractRepository.findByStatus(ContractStatus.SUSPENDED).size();

        BigDecimal mrr = activeContracts.stream()
                .map(c -> {
                    if (c.getMonthlyValue() != null) return c.getMonthlyValue();
                    if (c.getValue() != null) return c.getValue().divide(BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP);
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        var byType = activeContracts.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getContractType() != null ? c.getContractType().name() : "OUTROS",
                        Collectors.counting()
                ));

        var byClient = activeContracts.stream()
                .filter(c -> c.getClient() != null)
                .collect(Collectors.groupingBy(
                        c -> c.getClient().getName(),
                        Collectors.counting()
                ));

        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        long amendmentsThisMonth = amendmentRepository.countCreatedSince(startOfMonth);

        return ContractDashboardStatsDTO.builder()
                .activeCount(activeContracts.size())
                .expiringCount(expiringContracts.size())
                .suspendedCount(suspendedCount)
                .mrr(mrr)
                .byType(byType)
                .byClient(byClient)
                .amendmentsThisMonth(amendmentsThisMonth)
                .build();
    }
}
