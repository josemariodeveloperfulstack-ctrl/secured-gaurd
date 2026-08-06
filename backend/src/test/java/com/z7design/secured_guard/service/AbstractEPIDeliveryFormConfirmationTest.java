package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.StockRequisition;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeChangeHistoryRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.PersonalProtectiveEquipmentRepository;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StockMovementRepository;
import com.z7design.secured_guard.repository.StockRequisitionRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.whatsapp.WhatsAppAgentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.when;

/**
 * Base compartilhada dos testes de confirmação de entrega de EPI (por ficha, por item e portal).
 * Centraliza os mocks do EPIDeliveryFormService, o funcionário, os itens e os helpers de estado
 * (códigos por item e vínculo com requisição de almoxarifado NÃO gerada pela ficha).
 */
@ExtendWith(MockitoExtension.class)
abstract class AbstractEPIDeliveryFormConfirmationTest {

    @Mock protected EPIDeliveryFormRepository epiDeliveryFormRepository;
    @Mock protected EmployeeRepository employeeRepository;
    @Mock protected CompanyRepository companyRepository;
    @Mock protected UserRepository userRepository;
    @Mock protected PersonalProtectiveEquipmentRepository epiRepository;
    @Mock protected EmployeeChangeHistoryRepository employeeChangeHistoryRepository;
    @Mock protected StockItemRepository stockItemRepository;
    @Mock protected StockRequisitionRepository stockRequisitionRepository;
    @Mock protected StockMovementRepository stockMovementRepository;
    @Mock protected WhatsAppAgentService whatsAppAgentService;
    @Mock protected StockService stockService;

    @InjectMocks
    protected EPIDeliveryFormService epiDeliveryFormService;

    protected static final String BASE_URL = "https://app.example.com";
    protected static final String PHONE = "31971731747";
    protected static final String NORMALIZED_PHONE = "5531971731747";
    protected static final UUID FORM_ID = UUID.randomUUID();
    protected static final UUID EMPLOYEE_ID = UUID.randomUUID();
    protected static final UUID USER_ID = UUID.randomUUID();

    protected Employee employee;
    protected EPIDeliveryFormItem itemCapacete;
    protected EPIDeliveryFormItem itemLuvas;

    @BeforeEach
    void setUp() {
        employee = new Employee();
        employee.setId(EMPLOYEE_ID);
        employee.setName("JOSE CARLOS ALVES");
        employee.setDocument("12345678900");
        employee.setPhone(PHONE);
        employee.setStatus(EmploymentStatus.ACTIVE);

        itemCapacete = EPIDeliveryFormItem.builder()
                .id(UUID.randomUUID())
                .epiName("CAPACETE")
                .ca("12345")
                .quantity(1)
                .build();
        itemLuvas = EPIDeliveryFormItem.builder()
                .id(UUID.randomUUID())
                .epiName("LUVAS")
                .ca("54321")
                .quantity(2)
                .build();
    }

    /** Substituição com funcionário ativo: modo POR ITEM (isPerItemMode = true). */
    protected EPIDeliveryForm buildPerItemForm() {
        return EPIDeliveryForm.builder()
                .id(FORM_ID)
                .employee(employee)
                .deliveryDate(LocalDate.of(2025, 10, 15))
                .deliveryType(EPIDeliveryType.SUBSTITUICAO)
                .status(EPIDeliveryFormStatus.DRAFT)
                .build();
    }

    /** Primeira entrega com funcionário ativo: modo POR FICHA (isPerItemMode = false). */
    protected EPIDeliveryForm buildPrimeiraEntregaForm() {
        return EPIDeliveryForm.builder()
                .id(FORM_ID)
                .employee(employee)
                .deliveryDate(LocalDate.of(2025, 10, 15))
                .deliveryType(EPIDeliveryType.PRIMEIRA_ENTREGA)
                .status(EPIDeliveryFormStatus.DRAFT)
                .build();
    }

    /** Atribui códigos válidos e expiração futura aos itens (estado pós-envio WhatsApp). */
    protected void armazenarCodigosNosItens() {
        LocalDateTime expires = LocalDateTime.now().plusHours(48);
        itemCapacete.setConfirmationToken(UUID.randomUUID());
        itemCapacete.setConfirmationCode("111111");
        itemCapacete.setConfirmationExpiresAt(expires);
        itemCapacete.setConfirmationSentAt(LocalDateTime.now());
        itemLuvas.setConfirmationToken(UUID.randomUUID());
        itemLuvas.setConfirmationCode("222222");
        itemLuvas.setConfirmationExpiresAt(expires);
        itemLuvas.setConfirmationSentAt(LocalDateTime.now());
    }

    /**
     * Vincula a ficha a uma requisição de almoxarifado NÃO gerada pela ficha (REQ-2025-*):
     * a baixa de estoque já foi tratada fora da ficha, então applyStockDeductionIfNeeded
     * retorna cedo e o teste fica focado na lógica de confirmação.
     */
    protected void vincularRequisicaoNaoEpi(EPIDeliveryForm form) {
        form.setStockRequisitionId(UUID.randomUUID());
        StockRequisition requisition = StockRequisition.builder()
                .requisitionNumber("REQ-2025-001")
                .build();
        when(stockRequisitionRepository.findById(form.getStockRequisitionId()))
                .thenReturn(Optional.of(requisition));
    }
}
