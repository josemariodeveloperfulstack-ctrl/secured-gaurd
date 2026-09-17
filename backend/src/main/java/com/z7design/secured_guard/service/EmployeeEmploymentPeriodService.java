package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EmployeeDTO;
import com.z7design.secured_guard.dto.EmployeeEmploymentPeriodDTO;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.model.enums.EmploymentAdmissionType;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.model.enums.UserStatus;
import com.z7design.secured_guard.repository.EmployeeEmploymentPeriodRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeEmploymentPeriodService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_TERMINATED = "TERMINATED";

    private final EmployeeEmploymentPeriodRepository periodRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmployeeChangeHistoryService employeeChangeHistoryService;

    @Transactional(readOnly = true)
    public List<EmployeeEmploymentPeriodDTO> findByEmployeeId(UUID employeeId) {
        return periodRepository.findByEmployeeIdOrderByHireDateDesc(employeeId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public java.util.Map<UUID, List<EmployeeEmploymentPeriodDTO>> findPeriodsForEmployees(List<UUID> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            return java.util.Map.of();
        }
        List<EmployeeEmploymentPeriod> list = periodRepository.findByEmployeeIdInOrderByHireDateDesc(employeeIds);
        return list.stream()
                .map(this::toDTO)
                .collect(Collectors.groupingBy(EmployeeEmploymentPeriodDTO::getEmployeeId));
    }

    @Transactional(readOnly = true)
    public int countByEmployeeId(UUID employeeId) {
        if (employeeId == null) {
            return 0;
        }
        return (int) periodRepository.countByEmployeeId(employeeId);
    }

    @Transactional(readOnly = true)
    public Optional<Employee> findEligibleForRehireByCpf(String cpf) {
        if (cpf == null || cpf.isBlank()) {
            return Optional.empty();
        }
        String normalized = cpf.replaceAll("[^0-9]", "");
        if (normalized.length() != 11) {
            return Optional.empty();
        }
        Optional<Employee> employeeOpt = employeeRepository.findByCpf(normalized);
        if (employeeOpt.isEmpty()) {
            employeeOpt = employeeRepository.findByDocument(normalized);
        }
        return employeeOpt.filter(e -> e.getStatus() == EmploymentStatus.TERMINATED);
    }

    @Transactional
    public void createInitialPeriod(Employee employee) {
        if (employee == null || employee.getId() == null || employee.getHireDate() == null) {
            return;
        }
        boolean exists = periodRepository.findByEmployeeIdOrderByHireDateDesc(employee.getId()).stream()
                .anyMatch(p -> EmploymentAdmissionType.PRIMEIRA_ADMISSAO.equals(p.getAdmissionType()));
        if (exists) {
            return;
        }
        EmployeeEmploymentPeriod period = buildPeriodFromEmployee(employee);
        period.setAdmissionType(EmploymentAdmissionType.PRIMEIRA_ADMISSAO);
        period.setStatus(employee.getStatus() == EmploymentStatus.TERMINATED ? STATUS_TERMINATED : STATUS_ACTIVE);
        periodRepository.save(period);
    }

    @Transactional
    public void closeActivePeriod(Employee employee) {
        if (employee == null || employee.getId() == null) {
            return;
        }
        periodRepository.findFirstByEmployeeIdAndStatusOrderByHireDateDesc(employee.getId(), STATUS_ACTIVE)
                .ifPresent(period -> {
                    period.setStatus(STATUS_TERMINATED);
                    period.setTerminationDate(employee.getTerminationDate() != null
                            ? employee.getTerminationDate()
                            : employee.getDataRescisao());
                    period.setTerminationReason(employee.getTerminationReason());
                    periodRepository.save(period);
                });
    }

    /**
     * Garante que o vínculo anterior (admissão + demissão) fique registrado no histórico
     * antes de abrir um novo período na readmissão.
     */
    @Transactional
    public void sealEmploymentHistoryBeforeRehire(Employee employee) {
        if (employee == null || employee.getId() == null) {
            return;
        }

        closeActivePeriod(employee);

        List<EmployeeEmploymentPeriod> periods =
                periodRepository.findByEmployeeIdOrderByHireDateDesc(employee.getId());

        LocalDate terminationDate = employee.getTerminationDate() != null
                ? employee.getTerminationDate()
                : employee.getDataRescisao();
        String terminationReason = employee.getTerminationReason();

        if (periods.isEmpty()) {
            EmployeeEmploymentPeriod period = buildPeriodFromEmployee(employee);
            period.setAdmissionType(EmploymentAdmissionType.PRIMEIRA_ADMISSAO);
            period.setStatus(STATUS_TERMINATED);
            period.setTerminationDate(terminationDate);
            period.setTerminationReason(terminationReason);
            periodRepository.save(period);
            return;
        }

        EmployeeEmploymentPeriod latest = periods.get(0);
        boolean needsUpdate = false;

        if (STATUS_TERMINATED.equals(latest.getStatus())) {
            if (latest.getTerminationDate() == null && terminationDate != null) {
                latest.setTerminationDate(terminationDate);
                needsUpdate = true;
            }
            if ((latest.getTerminationReason() == null || latest.getTerminationReason().isBlank())
                    && terminationReason != null && !terminationReason.isBlank()) {
                latest.setTerminationReason(terminationReason);
                needsUpdate = true;
            }
            if (latest.getHireDate() == null && employee.getHireDate() != null) {
                latest.setHireDate(employee.getHireDate());
                needsUpdate = true;
            }
            if (needsUpdate) {
                periodRepository.save(latest);
            }
            return;
        }

        // Período ainda ativo sem encerramento — selar com dados atuais do funcionário
        latest.setStatus(STATUS_TERMINATED);
        latest.setTerminationDate(terminationDate);
        latest.setTerminationReason(terminationReason);
        if (latest.getHireDate() == null && employee.getHireDate() != null) {
            latest.setHireDate(employee.getHireDate());
        }
        periodRepository.save(latest);
    }

    @Transactional
    public EmployeeEmploymentPeriod openRehirePeriod(Employee employee, EmployeeDTO dto,
            EmploymentAdmissionType admissionType, UUID changedByUserId) {
        EmployeeEmploymentPeriod period = EmployeeEmploymentPeriod.builder()
                .employee(employee)
                .company(employee.getCompany())
                .unit(employee.getUnit())
                .position(employee.getPosition())
                .department(employee.getDepartment())
                .workPost(employee.getWorkPost())
                .hireDate(employee.getHireDate())
                .admissionType(admissionType)
                .status(STATUS_ACTIVE)
                .salario(employee.getSalario())
                .registrationNumber(employee.getRegistrationNumber())
                .notes(dto != null ? dto.getNotes() : null)
                .build();
        EmployeeEmploymentPeriod saved = periodRepository.save(period);

        String companyName = employee.getCompany() != null ? employee.getCompany().getName() : "-";
        String typeLabel = admissionType.getLabel();
        employeeChangeHistoryService.recordChange(
                employee.getId(),
                EmployeeChangeCategory.VINCULO_EMPREGATICIO,
                "admissionType",
                "Tipo de admissão",
                "Demitido",
                typeLabel + " na empresa " + companyName,
                changedByUserId);
        return saved;
    }

    private EmployeeEmploymentPeriod buildPeriodFromEmployee(Employee employee) {
        return EmployeeEmploymentPeriod.builder()
                .employee(employee)
                .company(employee.getCompany())
                .unit(employee.getUnit())
                .position(employee.getPosition())
                .department(employee.getDepartment())
                .workPost(employee.getWorkPost())
                .hireDate(employee.getHireDate())
                .terminationDate(employee.getTerminationDate() != null
                        ? employee.getTerminationDate()
                        : employee.getDataRescisao())
                .terminationReason(employee.getTerminationReason())
                .salario(employee.getSalario())
                .registrationNumber(employee.getRegistrationNumber())
                .build();
    }

    private EmployeeEmploymentPeriodDTO toDTO(EmployeeEmploymentPeriod period) {
        EmploymentAdmissionType type = period.getAdmissionType();
        return EmployeeEmploymentPeriodDTO.builder()
                .id(period.getId())
                .employeeId(period.getEmployee() != null ? period.getEmployee().getId() : null)
                .companyId(period.getCompany() != null ? period.getCompany().getId() : null)
                .companyName(period.getCompany() != null ? period.getCompany().getName() : null)
                .unitId(period.getUnit() != null ? period.getUnit().getId() : null)
                .unitName(period.getUnit() != null ? period.getUnit().getName() : null)
                .positionId(period.getPosition() != null ? period.getPosition().getId() : null)
                .positionName(period.getPosition() != null ? period.getPosition().getName() : null)
                .departmentId(period.getDepartment() != null ? period.getDepartment().getId() : null)
                .departmentName(period.getDepartment() != null ? period.getDepartment().getName() : null)
                .workPostId(period.getWorkPost() != null ? period.getWorkPost().getId() : null)
                .workPostName(period.getWorkPost() != null ? period.getWorkPost().getName() : null)
                .hireDate(period.getHireDate())
                .terminationDate(period.getTerminationDate())
                .terminationReason(period.getTerminationReason())
                .admissionType(type != null ? type.name() : null)
                .admissionTypeLabel(type != null ? type.getLabel() : null)
                .status(period.getStatus())
                .salario(period.getSalario())
                .registrationNumber(period.getRegistrationNumber())
                .notes(period.getNotes())
                .createdAt(period.getCreatedAt())
                .build();
    }

    @Transactional
    public void reopenAfterMistakenDismissal(Employee employee, UUID periodId) {
        if (employee == null || employee.getId() == null) {
            return;
        }

        List<EmployeeEmploymentPeriod> periods =
                periodRepository.findByEmployeeIdOrderByHireDateDesc(employee.getId());
        if (periods.isEmpty()) {
            log.info("Cancelamento de demissão do funcionário {} sem vínculos registrados — apenas cadastro será reativado.",
                    employee.getId());
            return;
        }

        EmployeeEmploymentPeriod latest = periods.get(0);
        EmployeeEmploymentPeriod target = latest;

        if (periodId != null) {
            target = periods.stream()
                    .filter(p -> periodId.equals(p.getId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Vínculo empregatício não encontrado para este funcionário."));
            if (!latest.getId().equals(target.getId())) {
                throw new IllegalArgumentException(
                        "Só é possível cancelar a demissão do vínculo mais recente. "
                                + "Vínculos anteriores já fazem parte do histórico e não devem ser revertidos por este fluxo.");
            }
        }

        if (!STATUS_TERMINATED.equals(target.getStatus()) && target.getTerminationDate() == null) {
            throw new IllegalArgumentException("O vínculo selecionado não possui demissão para cancelar.");
        }

        target.setStatus(STATUS_ACTIVE);
        target.setTerminationDate(null);
        target.setTerminationReason(null);
        periodRepository.save(target);
        log.info("Vínculo {} reaberto (demissão cancelada) para funcionário {}", target.getId(), employee.getId());
    }

    @Transactional
    public void reactivateLinkedUser(Employee employee) {
        if (employee == null) {
            return;
        }
        String cpf = employee.getDocument() != null ? employee.getDocument() : employee.getCpf();
        if (cpf == null || cpf.isBlank()) {
            return;
        }
        String normalizedCpf = cpf.replaceAll("[^0-9]", "");
        userRepository.findByUsername(normalizedCpf).ifPresent(user -> {
            user.setStatus(UserStatus.ACTIVE);
            user.setActive(true);
            userRepository.save(user);
        });
    }

    public EmploymentAdmissionType parseAdmissionType(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Tipo de admissão é obrigatório para readmissão");
        }
        try {
            return EmploymentAdmissionType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Tipo de admissão inválido. Use READMISSAO ou PROMOCAO.");
        }
    }

    public void validateRehireAdmissionType(EmploymentAdmissionType type) {
        if (type != EmploymentAdmissionType.READMISSAO && type != EmploymentAdmissionType.PROMOCAO) {
            throw new IllegalArgumentException("Para recontratação, selecione Readmissão ou Promoção.");
        }
    }

    public void validateNewHireDate(LocalDate hireDate) {
        if (hireDate == null) {
            throw new IllegalArgumentException("Data de admissão é obrigatória para readmissão");
        }
    }
}
