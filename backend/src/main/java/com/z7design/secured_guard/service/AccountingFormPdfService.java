package com.z7design.secured_guard.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Company;
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
public class AccountingFormPdfService {

    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    public byte[] generateAccountingFormPdf(UUID employeeId) throws Exception {
        log.info("📄 Gerando ficha de contabilidade em PDF para funcionário ID: {}", employeeId);
        
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        Company company = null;
        if (employee.getCompany() != null) {
            company = companyRepository.findById(employee.getCompany().getId()).orElse(null);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4);
        PdfWriter.getInstance(document, baos);
        
        document.open();

        // Configurar fontes
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.BLACK);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.BLACK);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

        // Título
        Paragraph title = new Paragraph("FICHA DE CADASTRO DE FUNCIONÁRIO", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(5);
        document.add(title);

        Paragraph subtitle = new Paragraph("Para Departamento de Contabilidade", headerFont);
        subtitle.setAlignment(Element.ALIGN_CENTER);
        subtitle.setSpacingAfter(15);
        document.add(subtitle);

        // Data de geração
        Paragraph date = new Paragraph("Data de Geração: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), smallFont);
        date.setAlignment(Element.ALIGN_RIGHT);
        date.setSpacingAfter(20);
        document.add(date);

        // Dados Pessoais
        Paragraph section1 = new Paragraph("1. DADOS PESSOAIS", headerFont);
        section1.setSpacingBefore(10);
        section1.setSpacingAfter(10);
        document.add(section1);

        PdfPTable personalTable = new PdfPTable(2);
        personalTable.setWidthPercentage(100);
        personalTable.setWidths(new float[]{40f, 60f});
        personalTable.setSpacingAfter(15);

        addTableRow(personalTable, "Nome Completo:", employee.getName() != null ? employee.getName() : "", headerFont, normalFont);
        addTableRow(personalTable, "CPF:", employee.getDocument() != null ? employee.getDocument() : "", headerFont, normalFont);
        
        String rg = "";
        if (employee.getCinNumero() != null && !employee.getCinNumero().trim().isEmpty()) {
            rg = employee.getCinNumero();
            if (employee.getCinOrgaoEmissor() != null && !employee.getCinOrgaoEmissor().trim().isEmpty()) {
                rg = employee.getCinOrgaoEmissor() + "-" + rg;
            }
        } else if (employee.getCarteiraIdentidadeOrgaoEmissor() != null && !employee.getCarteiraIdentidadeOrgaoEmissor().trim().isEmpty()) {
            rg = employee.getCarteiraIdentidadeOrgaoEmissor();
        }
        addTableRow(personalTable, "RG:", rg, headerFont, normalFont);
        addTableRow(personalTable, "Data de Nascimento:", formatDate(employee.getBirthDate()), headerFont, normalFont);
        addTableRow(personalTable, "Estado Civil:", employee.getMaritalStatus() != null ? employee.getMaritalStatus() : "", headerFont, normalFont);
        addTableRow(personalTable, "Nacionalidade:", employee.getNationality() != null ? employee.getNationality() : "", headerFont, normalFont);

        document.add(personalTable);

        // Documentos
        Paragraph section2 = new Paragraph("2. DOCUMENTOS", headerFont);
        section2.setSpacingBefore(10);
        section2.setSpacingAfter(10);
        document.add(section2);

        PdfPTable documentsTable = new PdfPTable(2);
        documentsTable.setWidthPercentage(100);
        documentsTable.setWidths(new float[]{40f, 60f});
        documentsTable.setSpacingAfter(15);

        addTableRow(documentsTable, "PIS/PASEP:", employee.getPis() != null ? employee.getPis() : "", headerFont, normalFont);
        addTableRow(documentsTable, "Título de Eleitor:", employee.getTituloEleitor() != null ? employee.getTituloEleitor() : "", headerFont, normalFont);
        String zonaSecao = "";
        if (employee.getTituloEleitorZona() != null || employee.getTituloEleitorSecao() != null) {
            zonaSecao = (employee.getTituloEleitorZona() != null ? employee.getTituloEleitorZona() : "") + 
                        " / " + (employee.getTituloEleitorSecao() != null ? employee.getTituloEleitorSecao() : "");
        }
        addTableRow(documentsTable, "Zona/Seção Eleitoral:", zonaSecao, headerFont, normalFont);
        addTableRow(documentsTable, "CTPS:", employee.getCtps() != null ? employee.getCtps() : "", headerFont, normalFont);
        addTableRow(documentsTable, "Série CTPS:", employee.getCtpsSeries() != null ? employee.getCtpsSeries() : "", headerFont, normalFont);
        addTableRow(documentsTable, "CNH:", employee.getCnhNumber() != null ? employee.getCnhNumber() : "", headerFont, normalFont);
        addTableRow(documentsTable, "Categoria CNH:", employee.getCnhCategory() != null ? employee.getCnhCategory() : "", headerFont, normalFont);
        addTableRow(documentsTable, "Validade CNH:", formatDate(employee.getCnhExpirationDate()), headerFont, normalFont);
        addTableRow(documentsTable, "Certificado Militar:", employee.getCertificadoMilitar() != null ? employee.getCertificadoMilitar() : "", headerFont, normalFont);

        document.add(documentsTable);

        // Endereço e Contato
        Paragraph section3 = new Paragraph("3. ENDEREÇO E CONTATO", headerFont);
        section3.setSpacingBefore(10);
        section3.setSpacingAfter(10);
        document.add(section3);

        PdfPTable contactTable = new PdfPTable(2);
        contactTable.setWidthPercentage(100);
        contactTable.setWidths(new float[]{40f, 60f});
        contactTable.setSpacingAfter(15);

        String endereco = buildAddress(employee);
        addTableRow(contactTable, "Endereço:", endereco, headerFont, normalFont);
        addTableRow(contactTable, "Telefone:", employee.getPhone() != null ? employee.getPhone() : "", headerFont, normalFont);
        addTableRow(contactTable, "E-mail:", employee.getEmail() != null ? employee.getEmail() : "", headerFont, normalFont);

        document.add(contactTable);

        // Dados Profissionais
        Paragraph section4 = new Paragraph("4. DADOS PROFISSIONAIS", headerFont);
        section4.setSpacingBefore(10);
        section4.setSpacingAfter(10);
        document.add(section4);

        PdfPTable professionalTable = new PdfPTable(2);
        professionalTable.setWidthPercentage(100);
        professionalTable.setWidths(new float[]{40f, 60f});
        professionalTable.setSpacingAfter(15);

        addTableRow(professionalTable, "Número de Registro:", employee.getRegistrationNumber() != null ? employee.getRegistrationNumber() : "", headerFont, normalFont);
        addTableRow(professionalTable, "Data de Admissão:", formatDate(employee.getHireDate()), headerFont, normalFont);
        addTableRow(professionalTable, "Cargo:", employee.getPosition() != null ? employee.getPosition().getName() : "", headerFont, normalFont);
        addTableRow(professionalTable, "CBO:", employee.getCbo() != null ? employee.getCbo() : "", headerFont, normalFont);
        addTableRow(professionalTable, "Salário Base:", employee.getSalario() != null ? "R$ " + String.format("%.2f", employee.getSalario()) : "", headerFont, normalFont);
        addTableRow(professionalTable, "Status:", formatStatus(employee.getStatus()), headerFont, normalFont);
        addTableRow(professionalTable, "Setor:", employee.getUnit() != null ? employee.getUnit().getName() : "", headerFont, normalFont);
        if (company != null) {
            addTableRow(professionalTable, "Empresa:", company.getName() != null ? company.getName() : "", headerFont, normalFont);
            addTableRow(professionalTable, "CNPJ:", company.getCnpj() != null ? company.getCnpj() : "", headerFont, normalFont);
        }

        document.add(professionalTable);

        // Dados Bancários
        if (employee.getBanco() != null || employee.getAgencia() != null || employee.getContaCorrente() != null) {
            Paragraph section5 = new Paragraph("5. DADOS BANCÁRIOS", headerFont);
            section5.setSpacingBefore(10);
            section5.setSpacingAfter(10);
            document.add(section5);

            PdfPTable bankTable = new PdfPTable(2);
            bankTable.setWidthPercentage(100);
            bankTable.setWidths(new float[]{40f, 60f});
            bankTable.setSpacingAfter(15);

            addTableRow(bankTable, "Banco:", employee.getBanco() != null ? employee.getBanco() : "", headerFont, normalFont);
            addTableRow(bankTable, "Agência:", employee.getAgencia() != null ? employee.getAgencia() : "", headerFont, normalFont);
            addTableRow(bankTable, "Conta Corrente:", employee.getContaCorrente() != null ? employee.getContaCorrente() : "", headerFont, normalFont);

            document.add(bankTable);
        }

        document.close();

        log.info("✅ Ficha de contabilidade gerada com sucesso. Tamanho: {} bytes", baos.size());
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

    private String formatStatus(com.z7design.secured_guard.model.enums.EmploymentStatus status) {
        if (status == null) return "";
        switch (status) {
            case ACTIVE: return "Ativo";
            case INACTIVE: return "Inativo";
            case TERMINATED: return "Demitido";
            default: return status.toString();
        }
    }
}

