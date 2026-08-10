package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.repository.UnifiedDocumentRepository;
import com.z7design.secured_guard.service.UnifiedDocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Testes da regra de negócio de conta corrente obrigatória na unificação
 * holerite + comprovante (UnificationWorker.findMatchingReceipt).
 *
 * Regra: a conta corrente do holerite (ou do cadastro do funcionário, como
 * fallback) DEVE ser igual à conta creditada no comprovante para que o match
 * aconteça. Se as contas são conhecidas e diferentes, o match é bloqueado.
 */
@ExtendWith(MockitoExtension.class)
class UnificationWorkerContaCorrenteRuleTest {

    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private PaymentReceiptRepository paymentReceiptRepository;
    @Mock
    private UnifiedDocumentRepository unifiedDocumentRepository;
    @Mock
    private UnifiedDocumentService unifiedDocumentService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ApplicationContext applicationContext;

    @InjectMocks
    private UnificationWorker unificationWorker;

    private Payslip payslip;
    private PaymentReceipt receipt;

    @BeforeEach
    void setUp() {
        payslip = Payslip.builder()
                .id(UUID.randomUUID())
                .employeeName("JOSE CARLOS ALVES")
                .cpf("12345678900")
                .month(10)
                .year(2025)
                .netValue(new BigDecimal("1412.00"))
                .build();

        receipt = PaymentReceipt.builder()
                .id(UUID.randomUUID())
                .employeeName("JOSE CARLOS ALVES")
                .creditedName("JOSE CARLOS ALVES")
                .month(10)
                .year(2025)
                .netSalary(new BigDecimal("1412.00"))
                .build();
    }

    @SuppressWarnings("unchecked")
    private Optional<PaymentReceipt> findMatch(Payslip p) {
        Object result = ReflectionTestUtils.invokeMethod(
                unificationWorker, "findMatchingReceipt", p);
        return (Optional<PaymentReceipt>) result;
    }

    private void stubCandidates() {
        when(paymentReceiptRepository.findByYearAndMonth(2025, 11))
                .thenReturn(java.util.Collections.emptyList());
        when(paymentReceiptRepository.findByYearAndMonth(2025, 10))
                .thenReturn(List.of(receipt));
        when(unifiedDocumentRepository.findAllByReceiptId(receipt.getId()))
                .thenReturn(java.util.Collections.emptyList());
    }

    @Test
    void contaIgual_doHolerite_permiteMatch() {
        payslip.setContaCorrente("123456");
        receipt.setCreditedAccount("12345-6"); // formatos diferentes, mesmos dígitos
        stubCandidates();

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isPresent(), "Conta igual (holerite vs comprovante) deve permitir o match");
        assertEquals(receipt.getId(), match.get().getId());
    }

    @Test
    void contaDiferente_bloqueiaMatch() {
        payslip.setContaCorrente("123456");
        receipt.setCreditedAccount("99999-0"); // conta diferente
        stubCandidates();

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isEmpty(), "Conta diferente deve BLOQUEAR o match (regra obrigatória)");
    }

    @Test
    void holeriteSemConta_fallbackCadastroFuncionario() {
        // Holerite sem conta no PDF, mas funcionário cadastrado com a conta
        payslip.setContaCorrente(null);
        receipt.setCreditedAccount("12345-6");
        stubCandidates();

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setName("JOSE CARLOS ALVES");
        employee.setDocument("12345678900");
        employee.setContaCorrente("123456");
        when(employeeRepository.findByCpf("12345678900"))
                .thenReturn(Optional.of(employee));

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isPresent(), "Fallback para conta do cadastro (employees) deve permitir o match");
        assertEquals(receipt.getId(), match.get().getId());
    }

    @Test
    void semContaNoHoleriteNemCadastro_bloqueiaQuandoComprovanteTemConta() {
        // Sem conta no holerite e sem funcionário cadastrado: conta não verificável,
        // e o comprovante TEM conta creditada -> bloqueia (conta obrigatória)
        payslip.setContaCorrente(null);
        receipt.setCreditedAccount("12345-6");
        stubCandidates();
        when(employeeRepository.findByCpf("12345678900"))
                .thenReturn(Optional.empty());
        when(employeeRepository.findByNameExact(anyString()))
                .thenReturn(Optional.empty());
        when(employeeRepository.findByNameContainingIgnoreCase(anyString()))
                .thenReturn(java.util.Collections.emptyList());

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isEmpty(), "Sem conta verificável e comprovante com conta -> deve bloquear");
    }

    @Test
    void comprovanteSemContaCreditada_permitePorNomeEValor() {
        // Comprovante não expõe conta creditada (não verificável): match segue por Nome + Valor
        payslip.setContaCorrente("123456");
        receipt.setCreditedAccount(null);
        stubCandidates();

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isPresent(), "Comprovante sem conta creditada -> match por Nome + Valor permitido");
    }

    @Test
    void contaIgual_comMatchPorCPF_tambemPermitida() {
        // Nome do comprovante sem qualquer similaridade com o holerite, mas CPF no nome
        // + valor + conta batem -> match por CPF deve ser permitido
        payslip.setContaCorrente("123456");
        receipt.setEmployeeName("MARCOS PEREIRA LIMA 12345678900"); // CPF embutido no nome
        receipt.setCreditedName("MARCOS PEREIRA LIMA");
        receipt.setCreditedAccount("12345-6");
        stubCandidates();

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isPresent(), "Match por CPF + Valor + Conta deve ser permitido");
    }

    @Test
    void contaDiferente_bloqueiaTambemNoMatchPorCPF() {
        payslip.setContaCorrente("123456");
        receipt.setEmployeeName("MARCOS PEREIRA LIMA 12345678900");
        receipt.setCreditedName("MARCOS PEREIRA LIMA");
        receipt.setCreditedAccount("99999-0"); // conta diferente
        stubCandidates();

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isEmpty(), "Conta diferente deve bloquear mesmo com CPF + Valor iguais");
    }

    @Test
    void employeeEncontradoSemContaCadastrada_bloqueiaMatchPorCPFQuandoComprovanteTemConta() {
        // Employee encontrado (CPF bate) mas SEM conta corrente cadastrada, e o
        // comprovante TEM conta creditada -> a conta não é verificável, bloqueia
        // (mudança intencional: regra de conta obrigatória também no caminho CPF)
        payslip.setContaCorrente(null);
        receipt.setEmployeeName("MARCOS PEREIRA LIMA"); // sem CPF no nome -> via employees
        receipt.setCreditedName("MARCOS PEREIRA LIMA");
        receipt.setCreditedAccount("12345-6");
        stubCandidates();

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setName("JOSE CARLOS ALVES");
        employee.setDocument("12345678900");
        employee.setContaCorrente(null); // sem conta cadastrada
        when(employeeRepository.findByCpf("12345678900"))
                .thenReturn(Optional.of(employee));

        Optional<PaymentReceipt> match = findMatch(payslip);

        assertTrue(match.isEmpty(),
                "Employee sem conta cadastrada + comprovante com conta -> deve bloquear (conta obrigatória)");
    }
}
