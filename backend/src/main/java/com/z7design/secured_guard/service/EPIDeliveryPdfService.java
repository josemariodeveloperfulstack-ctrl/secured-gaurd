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
        // Margens reduzidas: esquerda, direita, topo, baixo
        Document document = new Document(PageSize.A4, 20, 20, 15, 15);
        PdfWriter.getInstance(document, baos);
        
        document.open();

        // Configurar fontes (tamanhos ainda mais reduzidos para caber em uma página)
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 6, Color.BLACK);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Color.BLACK);

        // Título principal em caixa preta (mais compacto)
        PdfPTable titleTable = new PdfPTable(1);
        titleTable.setWidthPercentage(100);
        PdfPCell titleCell = new PdfPCell(new Phrase("CONTROLE DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPI)", titleFont));
        titleCell.setBackgroundColor(Color.BLACK);
        titleCell.setPadding(4);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        titleTable.addCell(titleCell);
        titleTable.setSpacingAfter(4);
        document.add(titleTable);

        // Dados da Empresa (mais compacto)
        Paragraph companyName = new Paragraph(company.getName() != null ? company.getName().toUpperCase() : "", boldFont);
        companyName.setSpacingAfter(1);
        document.add(companyName);
        
        Paragraph companyCnpj = new Paragraph("CNPJ: " + (company.getCnpj() != null ? company.getCnpj() : ""), normalFont);
        companyCnpj.setSpacingAfter(3);
        document.add(companyCnpj);

        // Dados do Funcionário (em tabela mais compacta)
        PdfPTable employeeInfoTable = new PdfPTable(2);
        employeeInfoTable.setWidthPercentage(100);
        employeeInfoTable.setWidths(new float[]{50f, 50f});
        employeeInfoTable.setSpacingAfter(3);
        
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
        cell1.setPadding(1);
        employeeInfoTable.addCell(cell1);
        
        PdfPCell cell2 = new PdfPCell(new Phrase("FUNÇÃO: " + funcao.toUpperCase(), normalFont));
        cell2.setBorder(Rectangle.NO_BORDER);
        cell2.setPadding(1);
        employeeInfoTable.addCell(cell2);
        
        PdfPCell cell3 = new PdfPCell(new Phrase("CPF: " + cpf, normalFont));
        cell3.setBorder(Rectangle.NO_BORDER);
        cell3.setPadding(1);
        employeeInfoTable.addCell(cell3);
        
        PdfPCell cell4 = new PdfPCell(new Phrase("RG: " + rg, normalFont));
        cell4.setBorder(Rectangle.NO_BORDER);
        cell4.setPadding(1);
        employeeInfoTable.addCell(cell4);
        
        PdfPCell cell5 = new PdfPCell(new Phrase("ADMISSÃO: " + formatDate(employee.getHireDate()), normalFont));
        cell5.setBorder(Rectangle.NO_BORDER);
        cell5.setPadding(1);
        employeeInfoTable.addCell(cell5);
        
        PdfPCell cell6 = new PdfPCell(new Phrase("DEMISSÃO: " + (terminationDateStr.isEmpty() ? "" : terminationDateStr), normalFont));
        cell6.setBorder(Rectangle.NO_BORDER);
        cell6.setPadding(1);
        employeeInfoTable.addCell(cell6);
        
        document.add(employeeInfoTable);

        // Título do Recibo (mais compacto)
        Paragraph receiptTitle = new Paragraph("RECIBO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)", boldFont);
        receiptTitle.setAlignment(Element.ALIGN_CENTER);
        receiptTitle.setSpacingAfter(3);
        document.add(receiptTitle);

        // Texto de declaração (mais compacto)
        String companyNameForText = company.getName() != null ? company.getName() : "a Empresa";
        String declarationText = "Recebi da " + companyNameForText + ", Os EPI's abaixo especificados a serem usados no desempenho de minhas tarefas. " +
                "Assumo o compromisso de usá-los durante a jornada de trabalho, zelar pela sua conservação, quando necessário solicitar a substituição ou reposição e devolvê-los à Empresa em caso de demissão. " +
                "Estou ciente também que o uso desses EPI's implicará em insubordinação, sujeito a sansões disciplinares previstas no art. 158 CLT.";
        
        Paragraph declaration = new Paragraph(declarationText, smallFont);
        declaration.setAlignment(Element.ALIGN_JUSTIFIED);
        declaration.setSpacingAfter(3);
        document.add(declaration);

        // Campos de data e assinatura (mais compacto)
        PdfPTable signatureTable = new PdfPTable(2);
        signatureTable.setWidthPercentage(100);
        signatureTable.setWidths(new float[]{50f, 50f});
        
        PdfPCell dateCell = new PdfPCell(new Phrase("Contagem: ____/____/____", smallFont));
        dateCell.setBorder(Rectangle.NO_BORDER);
        dateCell.setPadding(2);
        signatureTable.addCell(dateCell);
        
        PdfPCell signatureCell = new PdfPCell(new Phrase("Assinatura: ________________________", smallFont));
        signatureCell.setBorder(Rectangle.NO_BORDER);
        signatureCell.setPadding(2);
        signatureTable.addCell(signatureCell);
        signatureTable.setSpacingAfter(3);
        document.add(signatureTable);

        // Tabela de EPIs (ajustada para caber em uma página)
        PdfPTable epiTable = new PdfPTable(7);
        epiTable.setWidthPercentage(100);
        // Colunas: ITEM, DESCRIÇÃO DO EPI, CA, QUANTIDADE, DATA DE ENTREGA, DATA DE DEVOLUÇÃO, AS
        epiTable.setWidths(new float[]{6f, 35f, 15f, 10f, 12f, 12f, 10f});
        // Não permitir quebra de página na tabela - tudo deve caber em uma página
        epiTable.setSplitLate(false);
        epiTable.setSplitRows(false);
        epiTable.setSpacingBefore(2);
        
        // Cabeçalho da tabela (ajustado para 7 colunas conforme imagem)
        addTableHeader(epiTable, "ITEM", smallFont);
        addTableHeader(epiTable, "DESCRIÇÃO DO EPI", smallFont);
        addTableHeader(epiTable, "CA", smallFont);
        addTableHeader(epiTable, "QUANTIDADE", smallFont);
        addTableHeader(epiTable, "DATA DE ENTREGA", smallFont);
        addTableHeader(epiTable, "DATA DE DEVOLUÇÃO", smallFont);
        addTableHeader(epiTable, "AS", smallFont);

        // Adicionar itens de EPI
        if (form.getItems() != null && !form.getItems().isEmpty()) {
            int itemNumber = 1;
            for (EPIDeliveryFormItem item : form.getItems()) {
                epiTable.addCell(createTableCell(String.valueOf(itemNumber++), smallFont)); // ITEM
                epiTable.addCell(createEquipmentCell(item.getEpiName() != null ? item.getEpiName() : "", smallFont)); // DESCRIÇÃO DO EPI
                epiTable.addCell(createTableCell(item.getCa() != null ? item.getCa() : "", smallFont)); // CA
                epiTable.addCell(createTableCell(item.getQuantity() != null ? item.getQuantity().toString() : "1", smallFont)); // QUANTIDADE
                epiTable.addCell(createTableCell(formatDate(form.getDeliveryDate()), smallFont)); // DATA DE ENTREGA
                epiTable.addCell(createTableCell("", smallFont)); // DATA DE DEVOLUÇÃO
                epiTable.addCell(createTableCell("", smallFont)); // AS (Assinatura)
            }
        }
        
        // Adicionar linhas vazias para preenchimento manual (reduzido para caber em uma página - máximo 10 linhas)
        int itemsCount = form.getItems() != null ? form.getItems().size() : 0;
        int emptyRows = Math.max(0, Math.min(10 - itemsCount, 10)); // Máximo 10 linhas totais
        for (int i = 0; i < emptyRows; i++) {
            epiTable.addCell(createTableCell("", smallFont)); // ITEM
            epiTable.addCell(createEquipmentCell("", smallFont)); // DESCRIÇÃO DO EPI
            epiTable.addCell(createTableCell("", smallFont)); // CA
            epiTable.addCell(createTableCell("", smallFont)); // QUANTIDADE
            epiTable.addCell(createTableCell("", smallFont)); // DATA DE ENTREGA
            epiTable.addCell(createTableCell("", smallFont)); // DATA DE DEVOLUÇÃO
            epiTable.addCell(createTableCell("", smallFont)); // AS
        }

        document.add(epiTable);

        document.close();

        log.info("✅ Ficha de entrega de EPI gerada com sucesso. Tamanho: {} bytes", baos.size());
        return baos.toByteArray();
    }
    
    private PdfPCell createTableCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(2);
        cell.setBorder(Rectangle.BOX);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        // Altura mínima reduzida para caber em uma página
        cell.setMinimumHeight(12f);
        return cell;
    }
    
    private PdfPCell createEquipmentCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(2);
        cell.setBorder(Rectangle.BOX);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        // Altura reduzida mas ainda suficiente
        cell.setMinimumHeight(12f);
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
        cell.setPadding(3);
        cell.setBorder(Rectangle.BOX);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        // Altura mínima ainda mais reduzida para cabeçalho
        cell.setMinimumHeight(12f);
        table.addCell(cell);
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
}

