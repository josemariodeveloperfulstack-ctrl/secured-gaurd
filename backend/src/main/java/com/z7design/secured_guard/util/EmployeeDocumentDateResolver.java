package com.z7design.secured_guard.util;

import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Resolve a data de admissão do funcionário para documentos gerados (PDF/Excel).
 * A data do cadastro (hireDate) tem prioridade sobre a data de geração ou valores enviados pelo cliente.
 */
@Component
@RequiredArgsConstructor
public class EmployeeDocumentDateResolver {

    private static final DateTimeFormatter FOOTER_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR"));
    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR"));

    private final EmployeeRepository employeeRepository;

    public Optional<LocalDate> findAdmissionDate(UUID employeeId) {
        if (employeeId == null) {
            return Optional.empty();
        }
        return employeeRepository.findById(employeeId)
                .map(Employee::getHireDate)
                .filter(date -> date != null);
    }

    /**
     * Data do documento: admissão do cadastro quando existir; senão {@code fallback}.
     */
    public LocalDate resolveDocumentDate(UUID employeeId, LocalDate fallback) {
        return findAdmissionDate(employeeId).orElse(fallback);
    }

    public LocalDate resolveDocumentDateOrToday(UUID employeeId, LocalDate fallback) {
        LocalDate resolved = resolveDocumentDate(employeeId, fallback);
        return resolved != null ? resolved : LocalDate.now();
    }

    public String formatFooterReportAt(LocalDate date) {
        if (date == null) {
            return null;
        }
        return date.format(FOOTER_DATE);
    }

    public String formatSignatureDate(LocalDate date) {
        if (date == null) {
            return "";
        }
        return date.format(BR_DATE);
    }

    public ReportLayoutConfig.ReportLayoutConfigBuilder applyAdmissionDateFooter(
            ReportLayoutConfig.ReportLayoutConfigBuilder builder,
            UUID employeeId) {
        findAdmissionDate(employeeId).ifPresent(date ->
                builder.footerReportAt(formatFooterReportAt(date)));
        return builder;
    }
}
