package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes da extração da conta corrente do holerite (PayslipService.extractPayslipInfo).
 *
 * A conta corrente é o critério obrigatório para a unificação com o comprovante:
 * o holerite deve conter a mesma conta corrente creditada no comprovante.
 */
@ExtendWith(MockitoExtension.class)
class PayslipServiceContaCorrenteExtractionTest {

    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private TesseractService tesseractService;
    @Mock
    private ExtractDataHoleritesService extractDataHoleritesService;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UserService userService;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PayslipService payslipService;

    private String holeriteBase;

    @BeforeEach
    void setUp() {
        holeriteBase = String.join("\n",
                "PROMOVER TERCEIRIZACAO LTDA",
                "CNPJ: 36.698.521/0001-01",
                "FOLHA DE PAGAMENTO",
                "123456 JOSE CARLOS ALVES CPF: 123.456.789-00",
                "01/10/2025 a 31/10/2025",
                "SETOR: OPERACIONAL",
                "Total Vencimentos: 1.912,65",
                "Total Descontos: 500,65",
                "Valor Líquido: 1.412,00");
    }

    /** Invoca o método privado extractPayslipInfo via reflexão. */
    @SuppressWarnings("unchecked")
    private Payslip extract(String text) {
        Object result = ReflectionTestUtils.invokeMethod(
                payslipService, "extractPayslipInfo", text, 1, null);
        return (Payslip) result;
    }

    @Test
    void extraiContaCorrente_formatoPadrao() {
        String text = holeriteBase + "\nConta corrente: 12345-6";

        Payslip payslip = extract(text);

        assertNotNull(payslip, "O holerite válido deve ser extraído");
        assertEquals("JOSE CARLOS ALVES", payslip.getEmployeeName());
        assertEquals(10, payslip.getMonth());
        assertEquals(2025, payslip.getYear());
        // Conta corrente extraída e normalizada (apenas dígitos)
        assertEquals("123456", payslip.getContaCorrente());
    }

    @Test
    void extraiContaCorrente_formatoSemCorrente() {
        String text = holeriteBase + "\nConta: 123456";

        Payslip payslip = extract(text);

        assertNotNull(payslip);
        assertEquals("123456", payslip.getContaCorrente());
    }

    @Test
    void extraiContaCorrente_formatoCBarraC() {
        String text = holeriteBase + "\nC/C: 12345-6";

        Payslip payslip = extract(text);

        assertNotNull(payslip);
        assertEquals("123456", payslip.getContaCorrente());
    }

    @Test
    void extraiContaCorrente_prefereCorrenteAoGenerico() {
        // Holerite com a conta de débito da empresa e a conta corrente do funcionário:
        // deve ser extraída a conta corrente (padrão específico tem prioridade)
        String text = holeriteBase + "\nConta de débito: 0001\nAgência: 1234 Conta corrente: 98765-4";

        Payslip payslip = extract(text);

        assertNotNull(payslip);
        assertEquals("987654", payslip.getContaCorrente());
    }

    @Test
    void semContaCorrente_retornaNull() {
        String text = holeriteBase; // sem nenhuma linha de conta

        Payslip payslip = extract(text);

        assertNotNull(payslip, "O holerite válido ainda deve ser extraído");
        assertNull(payslip.getContaCorrente(), "Sem conta no PDF, o campo deve ser null");
    }

    @Test
    void contaComMenosDeQuatroDigitos_eIgnorada() {
        // "Conta: 12" tem menos de 4 dígitos -> inválida, deve ser ignorada
        String text = holeriteBase + "\nConta: 12";

        Payslip payslip = extract(text);

        assertNotNull(payslip);
        assertNull(payslip.getContaCorrente());
    }

    @Test
    void holeriteInvalido_retornaNull() {
        // Sem CPF, nome, empresa, CNPJ, período e setor -> validação rejeita
        String text = "TEXTO SEM CAMPOS OBRIGATORIOS";

        Payslip payslip = extract(text);

        assertNull(payslip, "Holerite sem campos obrigatórios não deve ser extraído");
    }
}
