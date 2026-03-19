package com.z7design.secured_guard.service;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.enums.ReportGroupBy;
import com.z7design.secured_guard.model.enums.ReportOrderBy;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.RemanejamentoRepository;

@ExtendWith(MockitoExtension.class)
public class EmployeeReportPdfServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private RemanejamentoRepository remanejamentoRepository;

    @Mock
    private StandardReportLayoutService standardReportLayoutService;

    @InjectMocks
    private EmployeeReportPdfService employeeReportPdfService;

    private UUID companyId;
    private List<UUID> duplicateIds;

    @BeforeEach
    void setUp() {
        companyId = UUID.randomUUID();
        UUID empId = UUID.randomUUID();
        duplicateIds = List.of(empId, empId);
    }

    @Test
    void shouldFilterDuplicateIdsWhenGeneratingReport() throws IOException {
        // Arrange
        Company mockCompany = new Company();
        mockCompany.setId(companyId);
        
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(mockCompany));
        when(employeeRepository.findAllByIdIn(anyList())).thenReturn(java.util.Set.of());

        // Act
        try {
            employeeReportPdfService.generateEmployeeReportPDF(
                companyId, duplicateIds, List.of("name"), ReportGroupBy.FUNCIONARIO, ReportOrderBy.FUNCIONARIO
            );
        } catch (Exception e) {
            // Ignore PDF generation errors as we only care about the repository call
        }

        // Assert
        verify(employeeRepository).findAllByIdIn(List.of(duplicateIds.get(0)));
    }
}
