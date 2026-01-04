package com.z7design.secured_guard.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
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
public class EmployeeRecordPdfService {

    private final EmployeeService employeeService;
    private final CompanyRepository companyRepository;

    public byte[] generateEmployeeRecordPdf(UUID employeeId) throws Exception {
        log.info("📄 Gerando ficha de registro do funcionário ID: {}", employeeId);
        
        Employee employee = employeeService.findById(employeeId);
        if (employee == null) {
            throw new RuntimeException("Funcionário não encontrado");
        }

        Company company = null;
        if (employee.getCompany() != null) {
            company = companyRepository.findById(employee.getCompany().getId()).orElse(null);
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
        Paragraph title = new Paragraph("FICHA DE REGISTRO DO FUNCIONÁRIO", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        // Tabela de dados do funcionário
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{40f, 60f});
        table.setSpacingBefore(10);
        table.setSpacingAfter(10);

        addTableRow(table, "Nome:", employee.getName() != null ? employee.getName() : "", headerFont, normalFont);
        addTableRow(table, "CPF:", employee.getDocument() != null ? employee.getDocument() : "", headerFont, normalFont);
        addTableRow(table, "Data de Nascimento:", formatDate(employee.getBirthDate()), headerFont, normalFont);
        addTableRow(table, "Nacionalidade:", employee.getNationality() != null ? employee.getNationality() : "Brasileira", headerFont, normalFont);
        addTableRow(table, "Naturalidade:", employee.getLocalNascimento() != null ? employee.getLocalNascimento() : "", headerFont, normalFont);
        addTableRow(table, "Estado Civil:", employee.getMaritalStatus() != null ? employee.getMaritalStatus() : "", headerFont, normalFont);
        addTableRow(table, "Grau de Instrução:", employee.getGrauInstrucao() != null ? employee.getGrauInstrucao() : "", headerFont, normalFont);
        addTableRow(table, "Telefone:", employee.getPhone() != null ? employee.getPhone() : "", headerFont, normalFont);
        addTableRow(table, "Email:", employee.getEmail() != null ? employee.getEmail() : "", headerFont, normalFont);
        
        // Endereço
        String endereco = buildAddress(employee);
        addTableRow(table, "Endereço:", endereco, headerFont, normalFont);
        
        addTableRow(table, "PIS:", employee.getPis() != null ? employee.getPis() : "", headerFont, normalFont);
        addTableRow(table, "CTPS:", employee.getCtps() != null ? employee.getCtps() : "", headerFont, normalFont);
        addTableRow(table, "Data de Admissão:", formatDate(employee.getHireDate()), headerFont, normalFont);
        addTableRow(table, "Cargo:", employee.getPosition() != null ? employee.getPosition().getName() : "", headerFont, normalFont);
        addTableRow(table, "Setor:", employee.getUnit() != null ? employee.getUnit().getName() : "", headerFont, normalFont);

        document.add(table);

        // Dados da Empresa
        if (company != null) {
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
        }

        // Observações
        if (employee.getNotes() != null && !employee.getNotes().trim().isEmpty()) {
            Paragraph notesTitle = new Paragraph("OBSERVAÇÕES", headerFont);
            notesTitle.setSpacingBefore(15);
            notesTitle.setSpacingAfter(10);
            document.add(notesTitle);

            Paragraph notes = new Paragraph(employee.getNotes(), normalFont);
            notes.setSpacingAfter(10);
            document.add(notes);
        }

        // Data atual
        Paragraph date = new Paragraph("Data de Emissão: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), smallFont);
        date.setAlignment(Element.ALIGN_RIGHT);
        date.setSpacingBefore(20);
        document.add(date);

        document.close();

        log.info("✅ Ficha de registro gerada com sucesso. Tamanho: {} bytes", baos.size());
        return baos.toByteArray();
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

    private String buildAddress(Employee employee) {
        StringBuilder address = new StringBuilder();
        if (employee.getEnderecoRua() != null && !employee.getEnderecoRua().trim().isEmpty()) {
            address.append(employee.getEnderecoRua());
        }
        if (employee.getEnderecoNumero() != null && !employee.getEnderecoNumero().trim().isEmpty()) {
            if (address.length() > 0) address.append(", ");
            address.append("nº ").append(employee.getEnderecoNumero());
        }
        if (employee.getEnderecoComplemento() != null && !employee.getEnderecoComplemento().trim().isEmpty()) {
            if (address.length() > 0) address.append(" - ");
            address.append(employee.getEnderecoComplemento());
        }
        if (employee.getEnderecoBairro() != null && !employee.getEnderecoBairro().trim().isEmpty()) {
            if (address.length() > 0) address.append(", ");
            address.append(employee.getEnderecoBairro());
        }
        if (employee.getEnderecoCidade() != null && !employee.getEnderecoCidade().trim().isEmpty()) {
            if (address.length() > 0) address.append(" - ");
            address.append(employee.getEnderecoCidade());
        }
        if (employee.getEnderecoEstado() != null && !employee.getEnderecoEstado().trim().isEmpty()) {
            if (address.length() > 0) address.append("/");
            address.append(employee.getEnderecoEstado());
        }
        if (employee.getEnderecoCep() != null && !employee.getEnderecoCep().trim().isEmpty()) {
            if (address.length() > 0) address.append(" - CEP: ");
            address.append(employee.getEnderecoCep());
        }
        
        // Fallback para campo address antigo
        if (address.length() == 0 && employee.getAddress() != null && !employee.getAddress().trim().isEmpty()) {
            address.append(employee.getAddress());
        }
        
        return address.toString();
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
}

