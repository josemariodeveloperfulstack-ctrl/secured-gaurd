package com.z7design.secured_guard.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.z7design.secured_guard.dto.DependentDTO;
import com.z7design.secured_guard.dto.EmployeeDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.DependentRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class EmployeeDependentValidationTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DependentRepository dependentRepository;

    @InjectMocks
    private EmployeeService employeeService;

    @InjectMocks
    private DependentService dependentService;

    private static final String VALID_CPF = "529.982.247-25";
    private static final String OTHER_CPF = "390.533.447-05";
    private static final String THIRD_CPF = "111.444.777-35";

    @BeforeEach
    void wireEmployeeServiceRepos() {
        ReflectionTestUtils.setField(employeeService, "employeeRepository", employeeRepository);
        ReflectionTestUtils.setField(employeeService, "dependentRepository", dependentRepository);
    }

    @Test
    void employeeValidation_rejectsMissingHireDate() {
        EmployeeDTO dto = baseEmployeeDto();
        dto.setHireDate(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ReflectionTestUtils.invokeMethod(employeeService, "validateEmployeeForSave", dto, null, null));

        assertEquals("Data de admissão é obrigatória", ex.getMessage());
    }

    @Test
    void employeeValidation_rejectsMissingCpf() {
        EmployeeDTO dto = baseEmployeeDto();
        dto.setCpf("");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ReflectionTestUtils.invokeMethod(employeeService, "validateEmployeeForSave", dto, null, null));

        assertEquals("CPF é obrigatório", ex.getMessage());
    }

    @Test
    void employeeValidation_rejectsDuplicateCpf() {
        EmployeeDTO dto = baseEmployeeDto();
        // Cadastro novo (excludeId null): bloqueia quando existe funcionário ATIVO (não demitido) com o CPF
        when(employeeRepository.existsByNormalizedDocumentAndNotTerminated("52998224725")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ReflectionTestUtils.invokeMethod(employeeService, "validateEmployeeForSave", dto, null, null));

        assertEquals("CPF já cadastrado para funcionário ativo no sistema", ex.getMessage());
    }

    @Test
    void employeeValidation_rejectsCpfAlreadyUsedByDependent() {
        EmployeeDTO dto = baseEmployeeDto();
        // Sem funcionário ativo com o CPF (não stubado => false) e CPF já usado por dependente
        when(dependentRepository.findIdsByCpfDigitsNormalized("52998224725")).thenReturn(List.of(UUID.randomUUID()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ReflectionTestUtils.invokeMethod(employeeService, "validateEmployeeForSave", dto, null, null));

        assertEquals("CPF já cadastrado como dependente no sistema", ex.getMessage());
    }

    @Test
    void dependentValidation_rejectsDuplicateCpfGlobally() {
        UUID employeeId = UUID.randomUUID();
        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setName("Funcionário Teste");
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(employeeRepository.existsByNormalizedDocument("39053344705")).thenReturn(false);
        when(dependentRepository.findIdsByCpfDigitsNormalized("39053344705"))
                .thenReturn(List.of(UUID.randomUUID()));

        DependentDTO.CreateRequest request = baseDependentRequest(employeeId, "FILHO", OTHER_CPF);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> dependentService.create(request));

        assertEquals("CPF já cadastrado no sistema", ex.getMessage());
    }

    @Test
    void dependentValidation_allowsMultipleChildrenForSameEmployee() {
        UUID employeeId = UUID.randomUUID();
        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setName("Funcionário Teste");
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(employeeRepository.existsByNormalizedDocument(any())).thenReturn(false);
        when(dependentRepository.findIdsByCpfDigitsNormalized(any())).thenReturn(List.of());
        when(dependentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> dependentService.create(baseDependentRequest(employeeId, "FILHO", OTHER_CPF)));
        assertDoesNotThrow(() -> dependentService.create(baseDependentRequest(employeeId, "FILHA", THIRD_CPF)));
    }

    @Test
    void dependentValidation_rejectsInvalidRelationship() {
        UUID employeeId = UUID.randomUUID();
        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setName("Funcionário Teste");
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        DependentDTO.CreateRequest request = baseDependentRequest(employeeId, "PAI", OTHER_CPF);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> dependentService.create(request));

        assertEquals("Parentesco inválido. Opções permitidas: Filho, Filha, Cônjuge", ex.getMessage());
    }

    private static EmployeeDTO baseEmployeeDto() {
        return EmployeeDTO.builder()
                .name("João da Silva")
                .cpf(VALID_CPF)
                .hireDate(LocalDate.of(2024, 1, 10))
                .status("ACTIVE")
                .build();
    }

    private static DependentDTO.CreateRequest baseDependentRequest(UUID employeeId, String relationship, String cpf) {
        DependentDTO.CreateRequest request = new DependentDTO.CreateRequest();
        request.setEmployeeId(employeeId);
        request.setName("Dependente Teste");
        request.setRelationship(relationship);
        request.setBirthDate(LocalDate.of(2015, 5, 20));
        request.setCpf(cpf);
        return request;
    }
}
