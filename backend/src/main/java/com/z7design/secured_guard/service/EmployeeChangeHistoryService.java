package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EmployeeChangeHistoryDTO;
import com.z7design.secured_guard.model.EmployeeChangeHistory;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.repository.EmployeeChangeHistoryRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeChangeHistoryService {

    private final EmployeeChangeHistoryRepository repository;
    private final UserRepository userRepository;

    /**
     * Registra uma alteração no histórico do funcionário (append-only).
     */
    @Transactional
    public void recordChange(UUID employeeId, EmployeeChangeCategory category, String fieldName, String fieldLabel,
                       String oldValue, String newValue, UUID changedByUserId) {
        if (Objects.equals(oldValue, newValue)) {
            return;
        }
        User changedByUser = changedByUserId != null ? userRepository.findById(changedByUserId).orElse(null) : null;
        EmployeeChangeHistory entity = EmployeeChangeHistory.builder()
            .employeeId(employeeId)
            .changedAt(Instant.now())
            .changedByUser(changedByUser)
            .category(category)
            .fieldName(fieldName)
            .fieldLabel(fieldLabel != null ? fieldLabel : fieldName)
            .oldValue(truncate(oldValue, 2000))
            .newValue(truncate(newValue, 2000))
            .build();
        repository.save(entity);
    }

    @Transactional(readOnly = true)
    public Page<EmployeeChangeHistoryDTO> findByEmployeeId(UUID employeeId, Instant dateFrom, Instant dateTo,
                                                           EmployeeChangeCategory category, UUID changedByUserId,
                                                           Pageable pageable) {
        boolean hasFilters = dateFrom != null || dateTo != null || category != null || changedByUserId != null;
        Page<EmployeeChangeHistory> page;
        if (!hasFilters) {
            page = repository.findByEmployeeIdOrderByChangedAtDesc(employeeId, pageable);
        } else {
            page = repository.findByEmployeeIdWithFilters(
                employeeId, dateFrom, dateTo, category, changedByUserId, pageable);
        }
        return page.map(this::toDTO);
    }

    private EmployeeChangeHistoryDTO toDTO(EmployeeChangeHistory e) {
        String changedByName = e.getChangedByUser() != null ? e.getChangedByUser().getName() : null;
        UUID changedById = e.getChangedByUser() != null ? e.getChangedByUser().getId() : null;
        return EmployeeChangeHistoryDTO.builder()
            .id(e.getId())
            .employeeId(e.getEmployeeId())
            .changedAt(e.getChangedAt())
            .changedByUserId(changedById)
            .changedByUserName(changedByName)
            .category(e.getCategory().name())
            .categoryLabel(e.getCategory().getLabel())
            .fieldName(e.getFieldName())
            .fieldLabel(e.getFieldLabel())
            .oldValue(e.getOldValue())
            .newValue(e.getNewValue())
            .reason(e.getReason())
            .build();
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
