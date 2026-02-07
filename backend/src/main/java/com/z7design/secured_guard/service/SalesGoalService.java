package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.SalesGoalDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.SalesGoal;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.GoalPeriod;
import com.z7design.secured_guard.model.enums.GoalType;
import com.z7design.secured_guard.model.enums.ProposalStatus;
import com.z7design.secured_guard.model.enums.ContractStatus;
import com.z7design.secured_guard.repository.ContractRepository;
import com.z7design.secured_guard.repository.ProposalRepository;
import com.z7design.secured_guard.repository.SalesGoalRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesGoalService {

    private final SalesGoalRepository salesGoalRepository;
    private final UserRepository userRepository;
    private final ProposalRepository proposalRepository;
    private final ContractRepository contractRepository;

    @Transactional(readOnly = true)
    public List<SalesGoalDTO> findAll() {
        return salesGoalRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalesGoalDTO> findByYear(int year) {
        return salesGoalRepository.findByReferenceYear(year).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalesGoalDTO> findByPeriod(int month, int year) {
        return salesGoalRepository.findByPeriod(month, year).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SalesGoalDTO> findByUserId(UUID userId) {
        return salesGoalRepository.findByUser_Id(userId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SalesGoalDTO findById(UUID id) {
        SalesGoal goal = salesGoalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meta não encontrada com ID: " + id));
        return toDTO(goal);
    }

    @Transactional
    public SalesGoalDTO create(SalesGoalDTO dto, UUID createdById) {
        SalesGoal goal = new SalesGoal();
        goal.setType(dto.getType());
        goal.setTargetValue(dto.getTargetValue());
        goal.setPeriod(dto.getPeriod());
        goal.setReferenceMonth(dto.getReferenceMonth());
        goal.setReferenceYear(dto.getReferenceYear());
        goal.setDescription(dto.getDescription());

        if (dto.getUserId() != null) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + dto.getUserId()));
            goal.setUser(user);
        }

        User creator = userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário criador não encontrado: " + createdById));
        goal.setCreatedBy(creator);

        goal = salesGoalRepository.save(goal);
        log.info("Meta comercial criada: id={}, tipo={}, userId={}", goal.getId(), goal.getType(), dto.getUserId());
        return toDTO(goal);
    }

    @Transactional
    public SalesGoalDTO update(UUID id, SalesGoalDTO dto) {
        SalesGoal goal = salesGoalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meta não encontrada com ID: " + id));

        goal.setType(dto.getType());
        goal.setTargetValue(dto.getTargetValue());
        goal.setPeriod(dto.getPeriod());
        goal.setReferenceMonth(dto.getReferenceMonth());
        goal.setReferenceYear(dto.getReferenceYear());
        goal.setDescription(dto.getDescription());

        if (dto.getUserId() != null) {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + dto.getUserId()));
            goal.setUser(user);
        } else {
            goal.setUser(null);
        }

        goal = salesGoalRepository.save(goal);
        log.info("Meta comercial atualizada: id={}", id);
        return toDTO(goal);
    }

    @Transactional
    public void delete(UUID id) {
        SalesGoal goal = salesGoalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Meta não encontrada com ID: " + id));
        salesGoalRepository.delete(goal);
        log.info("Meta comercial excluída: id={}", id);
    }

    // --- Progresso ---

    @Transactional(readOnly = true)
    public List<SalesGoalDTO> getProgress(int month, int year) {
        return salesGoalRepository.findByPeriod(month, year).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // --- Mapeamento ---

    private SalesGoalDTO toDTO(SalesGoal goal) {
        BigDecimal currentValue = calcularValorAtual(goal);
        double progress = goal.getTargetValue().compareTo(BigDecimal.ZERO) > 0
                ? currentValue.divide(goal.getTargetValue(), 4, RoundingMode.HALF_UP).doubleValue() * 100.0
                : 0.0;
        progress = Math.round(progress * 10.0) / 10.0;

        String userName = null;
        UUID userId = null;
        if (goal.getUser() != null) {
            try {
                userId = goal.getUser().getId();
                userName = goal.getUser().getName();
            } catch (Exception e) {
                log.warn("Erro ao acessar user da meta {}: {}", goal.getId(), e.getMessage());
            }
        }

        String createdByName = null;
        UUID createdById = null;
        if (goal.getCreatedBy() != null) {
            try {
                createdById = goal.getCreatedBy().getId();
                createdByName = goal.getCreatedBy().getName();
            } catch (Exception e) {
                log.warn("Erro ao acessar createdBy da meta {}: {}", goal.getId(), e.getMessage());
            }
        }

        return SalesGoalDTO.builder()
                .id(goal.getId())
                .userId(userId)
                .userName(userName)
                .type(goal.getType())
                .targetValue(goal.getTargetValue())
                .currentValue(currentValue)
                .progressPercent(progress)
                .period(goal.getPeriod())
                .referenceMonth(goal.getReferenceMonth())
                .referenceYear(goal.getReferenceYear())
                .description(goal.getDescription())
                .createdById(createdById)
                .createdByName(createdByName)
                .createdAt(goal.getCreatedAt())
                .updatedAt(goal.getUpdatedAt())
                .build();
    }

    private BigDecimal calcularValorAtual(SalesGoal goal) {
        LocalDate[] range = calcularRangeData(goal);
        LocalDateTime start = range[0].atStartOfDay();
        LocalDateTime end = range[1].atTime(LocalTime.MAX);

        if (goal.getType() == GoalType.REVENUE) {
            BigDecimal approved;
            if (goal.getUser() != null) {
                approved = proposalRepository.sumTotalValueByAssignedToIdAndStatusAndPeriod(
                        goal.getUser().getId(), ProposalStatus.APPROVED, start, end);
                BigDecimal converted = proposalRepository.sumTotalValueByAssignedToIdAndStatusAndPeriod(
                        goal.getUser().getId(), ProposalStatus.CONVERTED, start, end);
                approved = (approved != null ? approved : BigDecimal.ZERO).add(converted != null ? converted : BigDecimal.ZERO);
            } else {
                approved = proposalRepository.sumTotalValueByStatusAndPeriod(ProposalStatus.APPROVED, start, end);
                BigDecimal converted = proposalRepository.sumTotalValueByStatusAndPeriod(ProposalStatus.CONVERTED, start, end);
                approved = (approved != null ? approved : BigDecimal.ZERO).add(converted != null ? converted : BigDecimal.ZERO);
            }
            return approved;
        } else {
            // CONTRACTS - contar contratos ativos criados no período
            long count = contractRepository.findContractsExpiringBetween(range[0], range[1]).size();
            // Simplificação: usar contratos ativos em geral
            count = contractRepository.countByStatus(ContractStatus.ACTIVE);
            return BigDecimal.valueOf(count);
        }
    }

    private LocalDate[] calcularRangeData(SalesGoal goal) {
        int month = goal.getReferenceMonth();
        int year = goal.getReferenceYear();

        LocalDate start;
        LocalDate end;

        switch (goal.getPeriod()) {
            case MONTHLY:
                start = LocalDate.of(year, month, 1);
                end = start.plusMonths(1).minusDays(1);
                break;
            case QUARTERLY:
                int quarterStart = ((month - 1) / 3) * 3 + 1;
                start = LocalDate.of(year, quarterStart, 1);
                end = start.plusMonths(3).minusDays(1);
                break;
            case YEARLY:
                start = LocalDate.of(year, 1, 1);
                end = LocalDate.of(year, 12, 31);
                break;
            default:
                start = LocalDate.of(year, month, 1);
                end = start.plusMonths(1).minusDays(1);
        }
        return new LocalDate[]{start, end};
    }
}
