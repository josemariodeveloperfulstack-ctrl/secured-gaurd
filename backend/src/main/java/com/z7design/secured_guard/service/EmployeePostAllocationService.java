package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PostAllocationDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.VacationCoverage;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.WorkPostAssignment;
import com.z7design.secured_guard.model.enums.PostAllocationType;
import com.z7design.secured_guard.repository.VacationCoverageRepository;
import com.z7design.secured_guard.repository.WorkPostAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Determina o vínculo (efetivo, remanejado ou cobertura de férias) de um funcionário
 * com um posto de trabalho numa data específica.
 *
 * <p>Ordem de avaliação:
 * <ol>
 *   <li>Cobertura de férias — funcionário é substituto registrado no posto na data;</li>
 *   <li>Efetivo — o posto é o posto titular do funcionário;</li>
 *   <li>Remanejado — existe atribuição (assignment) do funcionário no posto na data;</li>
 *   <li>Remanejado (informal) — funcionário tem posto titular diferente e nenhuma das anteriores;</li>
 *   <li>Não alocado — nenhum vínculo identificado.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeePostAllocationService {

    private final VacationCoverageRepository vacationCoverageRepository;
    private final WorkPostAssignmentRepository workPostAssignmentRepository;

    @Transactional(readOnly = true)
    public PostAllocationDTO resolve(Employee employee, WorkPost workPost, LocalDate date) {
        if (employee == null || workPost == null) {
            return PostAllocationDTO.builder()
                .type(PostAllocationType.NAO_ALOCADO)
                .typeDescription(PostAllocationType.NAO_ALOCADO.getDescription())
                .message("Não foi possível determinar o vínculo: dados insuficientes.")
                .build();
        }

        LocalDate referenceDate = date != null ? date : LocalDate.now();
        UUID employeeId = employee.getId();
        UUID workPostId = workPost.getId();

        WorkPost effectivePost = safeWorkPost(employee);
        String effectivePostName = effectivePost != null ? effectivePost.getName() : null;

        // 1) Cobertura de férias — substituto registrado para o posto na data.
        VacationCoverage coverage = findCoverage(employeeId, workPostId, referenceDate);
        if (coverage != null) {
            String coveredName = null;
            if (coverage.getVacation() != null && coverage.getVacation().getEmployee() != null) {
                coveredName = coverage.getVacation().getEmployee().getName();
            }
            return PostAllocationDTO.builder()
                .type(PostAllocationType.COBERTURA_FERIAS)
                .typeDescription(PostAllocationType.COBERTURA_FERIAS.getDescription())
                .message(coveredName != null
                    ? "Cobertura de férias de " + coveredName + " neste posto."
                    : "Funcionário em cobertura de férias neste posto.")
                .effectiveWorkPostName(effectivePostName)
                .coveredEmployeeName(coveredName)
                .coverageStartDate(coverage.getCoverageStartDate())
                .coverageEndDate(coverage.getCoverageEndDate())
                .build();
        }

        // 2) Efetivo — posto titular do funcionário.
        if (effectivePost != null && workPostId.equals(effectivePost.getId())) {
            return PostAllocationDTO.builder()
                .type(PostAllocationType.EFETIVO)
                .typeDescription(PostAllocationType.EFETIVO.getDescription())
                .message("Funcionário efetivo deste posto de trabalho.")
                .effectiveWorkPostName(effectivePostName)
                .build();
        }

        // 3) Remanejado — atribuição registrada no posto na data.
        List<WorkPostAssignment> assignments =
            workPostAssignmentRepository.findByEmployeeWorkPostAndDate(employeeId, workPostId, referenceDate);
        if (assignments != null && !assignments.isEmpty()) {
            return PostAllocationDTO.builder()
                .type(PostAllocationType.REMANEJADO)
                .typeDescription(PostAllocationType.REMANEJADO.getDescription())
                .message(effectivePostName != null
                    ? "Funcionário remanejado para este posto (posto efetivo: " + effectivePostName + ")."
                    : "Funcionário remanejado para este posto.")
                .effectiveWorkPostName(effectivePostName)
                .build();
        }

        // 4) Remanejado informal — tem posto titular diferente, sem registro formal.
        if (effectivePost != null && !workPostId.equals(effectivePost.getId())) {
            return PostAllocationDTO.builder()
                .type(PostAllocationType.REMANEJADO)
                .typeDescription(PostAllocationType.REMANEJADO.getDescription())
                .message("Funcionário não é efetivo deste posto (posto efetivo: " + effectivePostName
                    + "). Sem remanejamento/cobertura formal registrado para a data.")
                .effectiveWorkPostName(effectivePostName)
                .build();
        }

        // 5) Nenhum vínculo identificado.
        return PostAllocationDTO.builder()
            .type(PostAllocationType.NAO_ALOCADO)
            .typeDescription(PostAllocationType.NAO_ALOCADO.getDescription())
            .message("Funcionário sem alocação registrada neste posto na data.")
            .effectiveWorkPostName(effectivePostName)
            .build();
    }

    private VacationCoverage findCoverage(UUID employeeId, UUID workPostId, LocalDate date) {
        try {
            List<VacationCoverage> coverages =
                vacationCoverageRepository.findByEmployeeAndDateRange(employeeId, date, date);
            if (coverages == null) {
                return null;
            }
            return coverages.stream()
                .filter(vc -> vc.getLocation() != null && workPostId.equals(vc.getLocation().getId()))
                .filter(vc -> vc.getStatus() != VacationCoverage.CoverageStatus.CANCELLED)
                .findFirst()
                .orElse(null);
        } catch (Exception e) {
            log.warn("Falha ao buscar cobertura de férias (employee={}, post={}): {}",
                employeeId, workPostId, e.getMessage());
            return null;
        }
    }

    private WorkPost safeWorkPost(Employee employee) {
        try {
            return employee.getWorkPost();
        } catch (Exception e) {
            log.debug("Posto efetivo do funcionário {} indisponível: {}", employee.getId(), e.getMessage());
            return null;
        }
    }
}
