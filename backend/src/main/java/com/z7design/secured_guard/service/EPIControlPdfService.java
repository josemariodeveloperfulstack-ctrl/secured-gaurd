package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EPIDelivery;
import com.z7design.secured_guard.model.PersonalProtectiveEquipment;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EPIDeliveryRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Serviço para gerar PDFs de Controle/Recibo de EPI usando o layout padrão
 * (mesmo padrão da Ficha de Entrega de EPI).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EPIControlPdfService {

    private final EPIDeliveryRepository epiDeliveryRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final EmployeeDocumentDateResolver documentDateResolver;

    /**
     * Gera PDF de controle/recibo de EPI para um registro (grupo de entregas).
     * Usa o mesmo layout padrão da Ficha de Entrega de EPI.
     */
    public byte[] generateEPIControlPdf(UUID firstDeliveryId) throws Exception {
        log.info("📄 Gerando recibo/controle de EPI para registro (deliveryId): {}", firstDeliveryId);

        EPIDelivery firstDelivery = epiDeliveryRepository.findById(firstDeliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Entrega de EPI não encontrada: " + firstDeliveryId));

        Employee employee = firstDelivery.getEmployee();
        Hibernate.initialize(employee);
        if (employee == null) {
            throw new ResourceNotFoundException("Funcionário não encontrado na entrega");
        }

        Company company = employee.getCompany();
        Hibernate.initialize(company);
        if (company == null) {
            company = companyRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Nenhuma empresa cadastrada no sistema"));
        }

        // Buscar todas as entregas do mesmo funcionário na mesma data
        LocalDate deliveryDate = firstDelivery.getDeliveryDate();
        List<EPIDelivery> allDeliveries = epiDeliveryRepository
                .findByEmployeeAndDeliveryDateBetween(employee, deliveryDate, deliveryDate);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos)) {
            var layoutBuilder = ReportLayoutConfig.builder()
                    .companyId(company.getId())
                    .reportTitle("RECIBO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)")
                    .includeEmailInFooter(true);
            documentDateResolver.applyAdmissionDateFooter(layoutBuilder, employee.getId());
            ReportLayoutConfig layoutConfig = layoutBuilder.build();

            DocumentWithPdf docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Seção: Dados da Empresa (layout padrão)
            document.add(createSectionHeader("DADOS DA EMPRESA"));
            Table companyTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                    .useAllAvailableWidth();
            companyTable.addCell(createLabelValueCell("RAZÃO SOCIAL:", company.getName()));
            companyTable.addCell(createLabelValueCell("CNPJ:", company.getCnpj()));
            companyTable.addCell(createLabelValueCell("ENDEREÇO:", company.getAddress() != null ? company.getAddress() : "-"));
            document.add(companyTable);

            // Seção: Identificação do Funcionário (layout padrão)
            document.add(createSectionHeader("IDENTIFICAÇÃO DO FUNCIONÁRIO"));
            Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                    .useAllAvailableWidth();
            String funcao = employee.getPosition() != null ? employee.getPosition().getName() : "";
            String setor = employee.getUnit() != null ? employee.getUnit().getName() : "";

            employeeTable.addCell(createLabelValueCell("NOME:", employee.getName()));
            employeeTable.addCell(createLabelValueCell("CPF:", employee.getDocument()));
            employeeTable.addCell(createLabelValueCell("FUNÇÃO:", funcao));
            employeeTable.addCell(createLabelValueCell("SETOR:", setor));
            employeeTable.addCell(createLabelValueCell("DATA DE ADMISSÃO:", formatDate(employee.getHireDate())));
            employeeTable.addCell(createLabelValueCell("DATA DE ENTREGA:", formatDate(deliveryDate)));
            document.add(employeeTable);

            // Seção: Termo de Responsabilidade (layout padrão)
            document.add(createSectionHeader("TERMO DE RESPONSABILIDADE"));
            String declarationText = "Recebi da empresa acima identificada, os EPI's abaixo relacionados, para uso exclusivo no desempenho de minhas funções. Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação e devolvê-los à empresa em caso de rescisão contratual. Estou ciente de que o não uso desses equipamentos constitui ato de insubordinação, sujeito a sanções disciplinares conforme o art. 158 da CLT.";
            document.add(new Paragraph(declarationText)
                    .setFontSize(10f)
                    .setTextAlignment(TextAlignment.JUSTIFIED)
                    .setMarginBottom(10f));

            // Seção: Equipamentos de Proteção Individual (layout padrão)
            document.add(createSectionHeader("EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)"));
            Table epiTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 15f, 15f, 30f }))
                    .useAllAvailableWidth();

            epiTable.addHeaderCell(new Cell().add(new Paragraph("DESCRIÇÃO DO EPI").setBold().setFontSize(9f)));
            epiTable.addHeaderCell(new Cell().add(new Paragraph("CA").setBold().setFontSize(9f)));
            epiTable.addHeaderCell(new Cell().add(new Paragraph("QUANT.").setBold().setFontSize(9f)));
            epiTable.addHeaderCell(new Cell().add(new Paragraph("ASSINATURA").setBold().setFontSize(9f)));

            for (EPIDelivery d : allDeliveries) {
                PersonalProtectiveEquipment epi = d.getEpi();
                Hibernate.initialize(epi);
                String epiName = epi != null && epi.getName() != null ? epi.getName() : "";
                String ca = epi != null && epi.getCaNumber() != null ? epi.getCaNumber() : "";
                Integer qty = d.getQuantity() != null ? d.getQuantity() : 1;

                epiTable.addCell(new Cell().add(new Paragraph(epiName).setFontSize(9f)));
                epiTable.addCell(new Cell().add(new Paragraph(ca).setFontSize(9f)));
                epiTable.addCell(new Cell().add(new Paragraph(String.valueOf(qty)).setFontSize(9f)));
                epiTable.addCell(new Cell().add(new Paragraph("")));
            }

            // Linhas vazias para manter padrão visual
            int itemsToAdd = Math.max(0, 10 - allDeliveries.size());
            for (int i = 0; i < itemsToAdd; i++) {
                epiTable.addCell(new Cell().setHeight(15f));
                epiTable.addCell(new Cell().setHeight(15f));
                epiTable.addCell(new Cell().setHeight(15f));
                epiTable.addCell(new Cell().setHeight(15f));
            }
            document.add(epiTable);

            // Assinaturas (layout padrão)
            addSignatures(document, employee, company);

            document.close();
        }

        log.info("✅ Recibo/controle de EPI gerado com sucesso. Tamanho: {} bytes", baos.size());
        return baos.toByteArray();
    }

    private Cell createLabelValueCell(String label, String value) {
        Paragraph p = new Paragraph();
        p.add(new Text(label).setBold().setFontSize(9f));
        p.add(new Text(" " + (value != null && !value.isEmpty() ? value : "-")).setFontSize(10f));
        return new Cell().add(p).setPadding(5f);
    }

    private Paragraph createSectionHeader(String title) {
        return new Paragraph(title)
                .setBold()
                .setFontSize(11f)
                .setFontColor(new DeviceRgb(255, 0, 0))
                .setMarginTop(15f)
                .setMarginBottom(5f)
                .setBorderLeft(new SolidBorder(new DeviceRgb(255, 0, 0), 3f))
                .setPaddingLeft(5f);
    }

    private void addSignatures(Document document, Employee employee, Company company) {
        String city = company.getCity() != null ? company.getCity() : "_______________";
        LocalDate docDate = documentDateResolver.resolveDocumentDateOrToday(employee.getId(), null);
        String date = docDate
                .format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));

        Paragraph dateLoc = new Paragraph(city + ", " + date)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginTop(30f)
                .setMarginBottom(40f)
                .setFontSize(10f);
        document.add(dateLoc);

        Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 45, 10, 45 }))
                .useAllAvailableWidth();

        Cell cell1 = new Cell()
                .add(new Paragraph("_________________________________").setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph(company.getName().toUpperCase()).setTextAlignment(TextAlignment.CENTER).setFontSize(8f).setBold())
                .add(new Paragraph("Empregador").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                .setBorder(Border.NO_BORDER);

        Cell spacer = new Cell().setBorder(Border.NO_BORDER);

        Cell cell2 = new Cell()
                .add(new Paragraph("_________________________________").setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph(employee.getName().toUpperCase()).setTextAlignment(TextAlignment.CENTER).setFontSize(8f).setBold())
                .add(new Paragraph("Empregado").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                .setBorder(Border.NO_BORDER);

        sigTable.addCell(cell1);
        sigTable.addCell(spacer);
        sigTable.addCell(cell2);

        document.add(sigTable);
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
}
