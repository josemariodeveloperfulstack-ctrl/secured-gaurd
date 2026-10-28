package com.z7design.secured_guard.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.EPIDeliveryFormRepository;
import com.z7design.secured_guard.repository.SafetyEngineerRepository;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;

/**
 * Valida que o PDF da ficha de entrega de EPI respeita a ordenação dos itens por
 * {@code lineOrder}: itens já cadastrados aparecem primeiro e os últimos cadastrados
 * ficam na linha de baixo.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EPIDeliveryPdfLineOrderTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private EPIDeliveryFormRepository epiDeliveryFormRepository;

    @Mock
    private StockItemRepository stockItemRepository;

    @Mock
    private SafetyEngineerRepository safetyEngineerRepository;

    @Mock
    private EmployeeDocumentDateResolver documentDateResolver;

    @InjectMocks
    private EPIDeliveryStandardPdfService pdfService;

    private Company company;
    private Employee employee;
    private EPIDeliveryForm form;

    @BeforeEach
    void setUp() {
        company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Promover Tercerização e Serviços Ltda");
        company.setCnpj("36698521000101");
        company.setAddress("Rua Marte, 526 - Jardim Riacho das Pedras - Contagem/MG - 32241-250");

        employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setName("SINÉSIO RAMOS DA SILVA");
        employee.setCpf("12345678900");
        employee.setRg("MG-12.345.678");
        employee.setHireDate(java.time.LocalDate.of(2023, 5, 2));
        com.z7design.secured_guard.model.Position pos = new com.z7design.secured_guard.model.Position();
        pos.setName("VIGILANTE PATRIMONIAL LÍDER");
        employee.setPosition(pos);
        com.z7design.secured_guard.model.Department dept = new com.z7design.secured_guard.model.Department();
        dept.setName("OPERACIONAL E SEGURANÇA PATRIMONIAL");
        employee.setDepartment(dept);

        form = EPIDeliveryForm.builder()
                .id(UUID.randomUUID())
                .employee(employee)
                .company(company)
                .deliveryDate(java.time.LocalDate.of(2025, 10, 15))
                .deliveryType(EPIDeliveryType.PRIMEIRA_ENTREGA)
                .status(EPIDeliveryFormStatus.COMPLETED)
                .build();

        lenient().when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        lenient().when(documentDateResolver.applyAdmissionDateFooter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    /**
     * O mock do StandardReportLayoutService é real (instância construída com repositórios mockados)
     * para gerar um PDF válido. A instância é criada via construtor gerado pelo Lombok.
     */
    private StandardReportLayoutService newLayoutService() {
        return new StandardReportLayoutService(companyRepository, safetyEngineerRepository);
    }

    private EPIDeliveryFormItem item(String name, Integer lineOrder) {
        return EPIDeliveryFormItem.builder()
                .id(UUID.randomUUID())
                .epiName(name)
                .quantity(1)
                .lineOrder(lineOrder)
                .build();
    }

    @Test
    void pdfDeveListarUltimoItemCadastradoNaLinhaDeBaixo() throws Exception {
        // Itens gravados fora de ordem no banco (line_order 2, 0, 1)
        // — o Hibernate reordena via @OrderBy(lineOrder ASC) ao carregar a coleção.
        form.setItems(List.of(
                item("ITEM C (TERCEIRO)", 2),
                item("ITEM A (PRIMEIRO)", 0),
                item("ITEM B (SEGUNDO)", 1)));

        StandardReportLayoutService layoutService = newLayoutService();
        pdfService = new EPIDeliveryStandardPdfService(
                employeeRepository, companyRepository, epiDeliveryFormRepository,
                stockItemRepository, layoutService,
                new com.z7design.secured_guard.service.ExcelReportLayoutService(companyRepository),
                documentDateResolver);

        lenient().when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));

        byte[] pdf = pdfService.generateEPIDeliveryPdfFromForm(form);
        String text = extractText(pdf);

        int idxA = text.indexOf("ITEM A (PRIMEIRO)");
        int idxB = text.indexOf("ITEM B (SEGUNDO)");
        int idxC = text.indexOf("ITEM C (TERCEIRO)");

        assertTrue(idxA >= 0, "Item com lineOrder 0 deve aparecer no PDF");
        assertTrue(idxB > idxA, "Item com lineOrder 1 deve vir depois do lineOrder 0");
        assertTrue(idxC > idxB, "Último item cadastrado (lineOrder 2) deve ficar na linha de baixo");
    }

    @Test
    void pdfDeveTratarItensLegadosSemLineOrderDefinido() throws Exception {
        // Itens legados com lineOrder null devem vir antes (fallback 0), estáveis por id
        EPIDeliveryFormItem legacy = item("ITEM LEGADO", null);
        form.setItems(List.of(item("ITEM NOVO", 5), legacy));

        StandardReportLayoutService layoutService = newLayoutService();
        pdfService = new EPIDeliveryStandardPdfService(
                employeeRepository, companyRepository, epiDeliveryFormRepository,
                stockItemRepository, layoutService,
                new com.z7design.secured_guard.service.ExcelReportLayoutService(companyRepository),
                documentDateResolver);

        lenient().when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));

        byte[] pdf = pdfService.generateEPIDeliveryPdfFromForm(form);
        String text = extractText(pdf);

        int idxLegacy = text.indexOf("ITEM LEGADO");
        int idxNovo = text.indexOf("ITEM NOVO");

        assertTrue(idxLegacy >= 0, "Item legado deve aparecer no PDF");
        assertTrue(idxNovo >= 0, "Item novo deve aparecer no PDF");
        assertTrue(idxNovo > idxLegacy, "Item novo (lineOrder 5) deve ficar abaixo do legado");
    }

    @Test
    void pdfNaoDeveConterMensagemVerdeEDeveCaberEmUmaPagina() throws Exception {
        StandardReportLayoutService layoutService = newLayoutService();
        pdfService = new EPIDeliveryStandardPdfService(
                employeeRepository, companyRepository, epiDeliveryFormRepository,
                stockItemRepository, layoutService,
                new com.z7design.secured_guard.service.ExcelReportLayoutService(companyRepository),
                documentDateResolver);

        lenient().when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));

        byte[] pdf = pdfService.generateEPIDeliveryPdfFromForm(form);
        String text = extractText(pdf);

        org.junit.jupiter.api.Assertions.assertFalse(
                text.contains("DOCUMENTO ASSINADO ELETRONICAMENTE COM VALIDADE JURÍDICA NACIONAL"),
                "A mensagem em verde com validade jurídica deve ser removida da ficha de EPI");

        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            assertEquals(1, document.getNumberOfPages(), "A ficha de EPI deve caber em exatamente 1 página");
        }
    }

    @Test
    void pdfCom13ItensDeveCaberEmExatamenteUmaPagina() throws Exception {
        StandardReportLayoutService layoutService = newLayoutService();
        pdfService = new EPIDeliveryStandardPdfService(
                employeeRepository, companyRepository, epiDeliveryFormRepository,
                stockItemRepository, layoutService,
                new com.z7design.secured_guard.service.ExcelReportLayoutService(companyRepository),
                documentDateResolver);

        lenient().when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));

        List<EPIDeliveryFormItem> items = new java.util.ArrayList<>();
        for (int i = 1; i <= 13; i++) {
            EPIDeliveryFormItem it = item("EQUIPAMENTO " + i + " - DESCRICAO DETALHADA OPERACIONAL BOMBEIRO CIVIL", i);
            it.setSizeNumber("TAM " + (38 + i));
            it.setCa("4" + (1000 + i));
            it.setReplacementReason("Devolvido ao Estoque - Tamanho Incorreto e Substituicao");
            items.add(it);
        }
        form.setItems(items);

        byte[] pdf = pdfService.generateEPIDeliveryPdfFromForm(form);
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            assertEquals(1, document.getNumberOfPages(), "A ficha de EPI com 13 itens deve caber em EXATAMENTE 1 página");
        }
    }

    @Test
    void pdfEmBrancoDeveCaberEmExatamenteUmaPagina() throws Exception {
        StandardReportLayoutService layoutService = newLayoutService();
        pdfService = new EPIDeliveryStandardPdfService(
                employeeRepository, companyRepository, epiDeliveryFormRepository,
                stockItemRepository, layoutService,
                new com.z7design.secured_guard.service.ExcelReportLayoutService(companyRepository),
                documentDateResolver);

        lenient().when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));

        byte[] pdf = pdfService.generateBlankEPIDeliveryPdf(company.getId(), employee.getId());
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            assertEquals(1, document.getNumberOfPages(), "A ficha de EPI em branco deve caber em EXATAMENTE 1 página");
        }
    }

    @Test
    void pdfComMaisDe15ItensDeveTerSegundaPagina() throws Exception {
        StandardReportLayoutService layoutService = newLayoutService();
        pdfService = new EPIDeliveryStandardPdfService(
                employeeRepository, companyRepository, epiDeliveryFormRepository,
                stockItemRepository, layoutService,
                new com.z7design.secured_guard.service.ExcelReportLayoutService(companyRepository),
                documentDateResolver);

        lenient().when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));

        List<EPIDeliveryFormItem> items = new java.util.ArrayList<>();
        for (int i = 1; i <= 35; i++) {
            EPIDeliveryFormItem it = item("EQUIPAMENTO " + i + " - DESCRICAO OPERACIONAL", i);
            it.setSizeNumber("M");
            it.setCa("12345");
            items.add(it);
        }
        form.setItems(items);

        byte[] pdf = pdfService.generateEPIDeliveryPdfFromForm(form);
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdf))) {
            assertEquals(2, document.getNumberOfPages(), "A ficha de EPI com 35 itens reais preenchidos deve ter 2 páginas");
        }
    }

    @Test
    void pdfCom27LinhasDevePreencherAteORodapeEmUmaPagina() throws Exception {
        StandardReportLayoutService layoutService = newLayoutService();
        pdfService = new EPIDeliveryStandardPdfService(
                employeeRepository, companyRepository, epiDeliveryFormRepository,
                stockItemRepository, layoutService,
                new com.z7design.secured_guard.service.ExcelReportLayoutService(companyRepository),
                documentDateResolver);

        lenient().when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));

        List<EPIDeliveryFormItem> items = new java.util.ArrayList<>();
        for (int i = 1; i <= 27; i++) {
            items.add(item("EPI " + i, i));
        }
        form.setItems(items);
        byte[] pdf = pdfService.generateEPIDeliveryPdfFromForm(form);
        try (PDDocument doc = PDDocument.load(new ByteArrayInputStream(pdf))) {
            assertEquals(1, doc.getNumberOfPages(), "A ficha preenchendo até o rodapé com 27 linhas deve caber em 1 página");
        }
    }

    private String extractText(byte[] pdfBytes) throws Exception {
        try (PDDocument document = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
            return new PDFTextStripper().getText(document);
        }
    }
}
