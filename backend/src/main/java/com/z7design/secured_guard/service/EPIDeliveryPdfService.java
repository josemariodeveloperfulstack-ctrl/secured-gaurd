package com.z7design.secured_guard.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EPIDeliveryPdfService {

    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    public byte[] generateEPIDeliveryPdf(UUID employeeId, UUID companyId, LocalDate deliveryDate, 
                                         UUID responsibleEmployeeId, String observations) throws Exception {
        log.info("📄 Gerando ficha de entrega de EPI para funcionário ID: {}", employeeId);
        
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));
        
        Company company = companyRepository.findById(companyId)
            .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        Employee responsible = null;
        if (responsibleEmployeeId != null) {
            responsible = employeeRepository.findById(responsibleEmployeeId).orElse(null);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter.getInstance(document, baos);
        
        document.open();

        // Configurar fonte
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.BLACK);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.BLACK);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

        // Título
        Paragraph title = new Paragraph("FICHA DE ENTREGA DE EPI", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        // Dados do Funcionário
        PdfPTable employeeTable = new PdfPTable(2);
        employeeTable.setWidthPercentage(100);
        employeeTable.setWidths(new float[]{40f, 60f});
        employeeTable.setSpacingBefore(10);
        employeeTable.setSpacingAfter(10);

        addTableRow(employeeTable, "Funcionário:", employee.getName() != null ? employee.getName() : "", headerFont, normalFont);
        addTableRow(employeeTable, "CPF:", employee.getDocument() != null ? employee.getDocument() : "", headerFont, normalFont);
        addTableRow(employeeTable, "Cargo:", employee.getPosition() != null ? employee.getPosition().getName() : "", headerFont, normalFont);
        addTableRow(employeeTable, "Setor:", employee.getUnit() != null ? employee.getUnit().getName() : "", headerFont, normalFont);
        addTableRow(employeeTable, "Data de Entrega:", formatDate(deliveryDate), headerFont, normalFont);
        if (responsible != null) {
            addTableRow(employeeTable, "Responsável pela Entrega:", responsible.getName(), headerFont, normalFont);
        }

        document.add(employeeTable);

        // Dados da Empresa
        Paragraph companyTitle = new Paragraph("DADOS DA EMPRESA", headerFont);
        companyTitle.setSpacingBefore(15);
        companyTitle.setSpacingAfter(10);
        document.add(companyTitle);

        PdfPTable companyTable = new PdfPTable(2);
        companyTable.setWidthPercentage(100);
        companyTable.setWidths(new float[]{40f, 60f});

        addTableRow(companyTable, "Razão Social:", company.getName() != null ? company.getName() : "", headerFont, normalFont);
        addTableRow(companyTable, "CNPJ:", company.getCnpj() != null ? company.getCnpj() : "", headerFont, normalFont);
        addTableRow(companyTable, "Endereço:", company.getAddress() != null ? company.getAddress() : "", headerFont, normalFont);

        document.add(companyTable);

        // Observações
        if (observations != null && !observations.trim().isEmpty()) {
            Paragraph obsTitle = new Paragraph("OBSERVAÇÕES", headerFont);
            obsTitle.setSpacingBefore(15);
            obsTitle.setSpacingAfter(10);
            document.add(obsTitle);

            Paragraph obs = new Paragraph(observations, normalFont);
            obs.setSpacingAfter(10);
            document.add(obs);
        }

        // Data atual
        Paragraph date = new Paragraph("Data de Emissão: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), smallFont);
        date.setAlignment(Element.ALIGN_RIGHT);
        date.setSpacingBefore(20);
        document.add(date);

        document.close();

        log.info("✅ Ficha de entrega de EPI gerada com sucesso. Tamanho: {} bytes", baos.size());
        return baos.toByteArray();
    }

    public byte[] generateEPIDeliveryPdfFromForm(EPIDeliveryForm form) throws Exception {
        log.info("📄 Gerando ficha de entrega de EPI a partir do formulário ID: {}", form.getId());
        
        Employee employee = form.getEmployee();
        Company company = form.getCompany();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 25, 25, 25, 25); // Margens mínimas: esquerda, direita, topo, baixo
        PdfWriter.getInstance(document, baos);
        
        document.open();

        // Configurar fontes (tamanhos reduzidos para caber em uma página)
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.BLACK);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.BLACK);

        // Título principal em caixa preta
        PdfPTable titleTable = new PdfPTable(1);
        titleTable.setWidthPercentage(100);
        PdfPCell titleCell = new PdfPCell(new Phrase("CONTROLE DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)", titleFont));
        titleCell.setBackgroundColor(Color.BLACK);
        titleCell.setPadding(6);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        titleTable.addCell(titleCell);
        titleTable.setSpacingAfter(8);
        document.add(titleTable);

        // Dados da Empresa
        Paragraph companyName = new Paragraph(company.getName() != null ? company.getName().toUpperCase() : "", boldFont);
        companyName.setSpacingAfter(2);
        document.add(companyName);
        
        Paragraph companyCnpj = new Paragraph("CNPJ: " + (company.getCnpj() != null ? company.getCnpj() : ""), normalFont);
        companyCnpj.setSpacingAfter(6);
        document.add(companyCnpj);

        // Dados do Funcionário (em tabela compacta)
        PdfPTable employeeInfoTable = new PdfPTable(2);
        employeeInfoTable.setWidthPercentage(100);
        employeeInfoTable.setWidths(new float[]{50f, 50f});
        employeeInfoTable.setSpacingAfter(6);
        
        String funcao = employee.getPosition() != null ? employee.getPosition().getName() : "";
        String cpf = employee.getDocument() != null ? employee.getDocument() : "";
        String rg = "";
        if (employee.getCinNumero() != null && !employee.getCinNumero().trim().isEmpty()) {
            rg = employee.getCinNumero();
            if (employee.getCinOrgaoEmissor() != null && !employee.getCinOrgaoEmissor().trim().isEmpty()) {
                rg = employee.getCinOrgaoEmissor() + "-" + rg;
            }
        } else if (employee.getCarteiraIdentidadeOrgaoEmissor() != null && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
            rg = employee.getCarteiraIdentidadeOrgaoEmissor();
        }
        String terminationDateStr = formatDate(employee.getTerminationDate());
        
        PdfPCell cell1 = new PdfPCell(new Phrase("NOME: " + (employee.getName() != null ? employee.getName().toUpperCase() : ""), normalFont));
        cell1.setBorder(Rectangle.NO_BORDER);
        cell1.setPadding(2);
        employeeInfoTable.addCell(cell1);
        
        PdfPCell cell2 = new PdfPCell(new Phrase("FUNÇÃO: " + funcao.toUpperCase(), normalFont));
        cell2.setBorder(Rectangle.NO_BORDER);
        cell2.setPadding(2);
        employeeInfoTable.addCell(cell2);
        
        PdfPCell cell3 = new PdfPCell(new Phrase("CPF: " + cpf, normalFont));
        cell3.setBorder(Rectangle.NO_BORDER);
        cell3.setPadding(2);
        employeeInfoTable.addCell(cell3);
        
        PdfPCell cell4 = new PdfPCell(new Phrase("RG: " + rg, normalFont));
        cell4.setBorder(Rectangle.NO_BORDER);
        cell4.setPadding(2);
        employeeInfoTable.addCell(cell4);
        
        PdfPCell cell5 = new PdfPCell(new Phrase("ADMISSÃO: " + formatDate(employee.getHireDate()), normalFont));
        cell5.setBorder(Rectangle.NO_BORDER);
        cell5.setPadding(2);
        employeeInfoTable.addCell(cell5);
        
        PdfPCell cell6 = new PdfPCell(new Phrase("DEMISSÃO: " + (terminationDateStr.isEmpty() ? "" : terminationDateStr), normalFont));
        cell6.setBorder(Rectangle.NO_BORDER);
        cell6.setPadding(2);
        employeeInfoTable.addCell(cell6);
        
        document.add(employeeInfoTable);

        // Título do Recibo
        Paragraph receiptTitle = new Paragraph("RECIBO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)", boldFont);
        receiptTitle.setAlignment(Element.ALIGN_CENTER);
        receiptTitle.setSpacingAfter(5);
        document.add(receiptTitle);

        // Texto de declaração (compacto)
        String companyNameForText = company.getName() != null ? company.getName() : "a Empresa";
        String declarationText = "Recebi da " + companyNameForText + ", Os EPI's abaixo especificados a serem usados no desempenho de minhas tarefas. " +
                "Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação, quando necessário solicitar a substituição ou reposição e devolvê-los à Empresa em caso de demissão. " +
                "Estou ciente também que o uso desses EPI's implicará em insubordinação, sujeito a sansões disciplinares previstas no art. 158 CLT.";
        
        Paragraph declaration = new Paragraph(declarationText, smallFont);
        declaration.setAlignment(Element.ALIGN_JUSTIFIED);
        declaration.setSpacingAfter(6);
        document.add(declaration);

        // Campos de data e assinatura (compacto)
        PdfPTable signatureTable = new PdfPTable(2);
        signatureTable.setWidthPercentage(100);
        signatureTable.setWidths(new float[]{50f, 50f});
        
        PdfPCell dateCell = new PdfPCell(new Phrase("Contagem: ____/____/____", smallFont));
        dateCell.setBorder(Rectangle.NO_BORDER);
        dateCell.setPadding(3);
        signatureTable.addCell(dateCell);
        
        PdfPCell signatureCell = new PdfPCell(new Phrase("Assinatura: ________________________", smallFont));
        signatureCell.setBorder(Rectangle.NO_BORDER);
        signatureCell.setPadding(3);
        signatureTable.addCell(signatureCell);
        signatureTable.setSpacingAfter(5);
        document.add(signatureTable);

        // Tabela de EPIs
        PdfPTable epiTable = new PdfPTable(8);
        epiTable.setWidthPercentage(100);
        epiTable.setWidths(new float[]{25f, 8f, 12f, 10f, 12f, 12f, 10f, 11f});
        // Não permitir quebra de página na tabela - tudo deve caber em uma página
        epiTable.setSplitLate(false);
        epiTable.setSplitRows(false);
        
        // Cabeçalho da tabela
        addTableHeader(epiTable, "EQUIPAMENTO", smallFont);
        addTableHeader(epiTable, "Nº", smallFont);
        addTableHeader(epiTable, "CA", smallFont);
        addTableHeader(epiTable, "QUANTIDADE", smallFont);
        addTableHeader(epiTable, "ENTREGA", smallFont);
        addTableHeader(epiTable, "SUBSTITUIDO", smallFont);
        addTableHeader(epiTable, "MOTIVO DA SUBST.", smallFont);
        addTableHeader(epiTable, "ASSINATURA", smallFont);

        // Adicionar itens de EPI
        if (form.getItems() != null && !form.getItems().isEmpty()) {
            int itemNumber = 1;
            for (EPIDeliveryFormItem item : form.getItems()) {
                epiTable.addCell(createEquipmentCell(item.getEpiName() != null ? item.getEpiName() : "", smallFont));
                epiTable.addCell(createTableCell(String.valueOf(itemNumber++), smallFont));
                epiTable.addCell(createTableCell(item.getCa() != null ? item.getCa() : "", smallFont));
                epiTable.addCell(createTableCell(item.getQuantity() != null ? item.getQuantity().toString() : "1", smallFont));
                epiTable.addCell(createTableCell(formatDate(form.getDeliveryDate()), smallFont));
                epiTable.addCell(createTableCell("", smallFont)); // SUBSTITUIDO
                epiTable.addCell(createTableCell("", smallFont)); // MOTIVO DA SUBST.
                epiTable.addCell(createTableCell("", smallFont)); // ASSINATURA
            }
        }
        
        // Adicionar linhas vazias para preenchimento manual (reduzido para caber em uma página)
        int emptyRows = 20 - (form.getItems() != null ? form.getItems().size() : 0);
        for (int i = 0; i < emptyRows && i < 20; i++) {
            epiTable.addCell(createEquipmentCell("", smallFont)); // Coluna EQUIPAMENTO com altura maior
            epiTable.addCell(createTableCell("", smallFont));
            epiTable.addCell(createTableCell("", smallFont));
            epiTable.addCell(createTableCell("", smallFont));
            epiTable.addCell(createTableCell("", smallFont));
            epiTable.addCell(createTableCell("", smallFont));
            epiTable.addCell(createTableCell("", smallFont));
            epiTable.addCell(createTableCell("", smallFont));
        }

        document.add(epiTable);

        document.close();

        log.info("✅ Ficha de entrega de EPI gerada com sucesso. Tamanho: {} bytes", baos.size());
        return baos.toByteArray();
    }
    
    private PdfPCell createTableCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(3);
        cell.setBorder(Rectangle.BOX);
        cell.setVerticalAlignment(Element.ALIGN_TOP);
        // Altura mínima reduzida mas suficiente para escrita manual
        cell.setMinimumHeight(18f);
        return cell;
    }
    
    private PdfPCell createEquipmentCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(3);
        cell.setBorder(Rectangle.BOX);
        cell.setVerticalAlignment(Element.ALIGN_TOP);
        // Altura maior para a coluna de equipamento mas ainda compacta
        cell.setMinimumHeight(20f);
        return cell;
    }

    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(new Color(240, 240, 240));
        labelCell.setPadding(8);
        labelCell.setBorder(Rectangle.BOX);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value != null ? value : "", valueFont));
        valueCell.setPadding(8);
        valueCell.setBorder(Rectangle.BOX);
        table.addCell(valueCell);
    }

    private void addTableHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(200, 200, 200));
        cell.setPadding(4);
        cell.setBorder(Rectangle.BOX);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        // Altura mínima reduzida para cabeçalho
        cell.setMinimumHeight(15f);
        table.addCell(cell);
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
}

