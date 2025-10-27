package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountingFormService {

    private final EmployeeRepository employeeRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Gera HTML da ficha de contabilidade para um funcionário
     */
    public String generateAccountingFormHtml(UUID employeeId) {
        log.info("📄 Gerando ficha de contabilidade para funcionário: {}", employeeId);
        
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html lang='pt-BR'>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<title>Ficha de Cadastro - ").append(employee.getName()).append("</title>");
        html.append("<style>");
        html.append(getStyles());
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        
        // Cabeçalho
        html.append("<div class='header'>");
        html.append("<h1>FICHA DE CADASTRO DE FUNCIONÁRIO</h1>");
        html.append("<p class='subtitle'>Para Departamento de Contabilidade</p>");
        html.append("<p class='date'>Data de Geração: ").append(LocalDate.now().format(DATE_FORMATTER)).append("</p>");
        html.append("</div>");

        // Dados Pessoais
        html.append("<div class='section'>");
        html.append("<h2>1. DADOS PESSOAIS</h2>");
        html.append("<div class='grid'>");
        addField(html, "Nome Completo", employee.getName(), true);
        addField(html, "CPF", employee.getDocument(), true);
        addField(html, "RG", employee.getCarteiraIdentidadeOrgaoEmissor(), false);
        addField(html, "Data de Nascimento", formatDate(employee.getBirthDate()), false);
        addField(html, "Estado Civil", employee.getMaritalStatus(), false);
        addField(html, "Nacionalidade", employee.getNationality(), false);
        html.append("</div>");
        html.append("</div>");

        // Documentos
        html.append("<div class='section'>");
        html.append("<h2>2. DOCUMENTOS</h2>");
        html.append("<div class='grid'>");
        addField(html, "PIS/PASEP", employee.getPis(), false);
        addField(html, "Título de Eleitor", employee.getTituloEleitor(), false);
        addField(html, "Zona/Seção Eleitoral", 
            (employee.getTituloEleitorZona() != null ? employee.getTituloEleitorZona() : "") + " / " + 
            (employee.getTituloEleitorSecao() != null ? employee.getTituloEleitorSecao() : ""), false);
        addField(html, "CTPS", employee.getCtps(), false);
        addField(html, "Série CTPS", employee.getCtpsSeries(), false);
        addField(html, "CNH", employee.getCnhNumber(), false);
        addField(html, "Categoria CNH", employee.getCnhCategory(), false);
        addField(html, "Validade CNH", formatDate(employee.getCnhExpirationDate()), false);
        addField(html, "Certificado Militar", employee.getCertificadoMilitar(), false);
        html.append("</div>");
        html.append("</div>");

        // Endereço e Contato
        html.append("<div class='section'>");
        html.append("<h2>3. ENDEREÇO E CONTATO</h2>");
        html.append("<div class='grid'>");
        addField(html, "Endereço", employee.getAddress(), false);
        addField(html, "Telefone", employee.getPhone(), false);
        addField(html, "E-mail", employee.getEmail(), false);
        html.append("</div>");
        html.append("</div>");

        // Dados Profissionais
        html.append("<div class='section'>");
        html.append("<h2>4. DADOS PROFISSIONAIS</h2>");
        html.append("<div class='grid'>");
        addField(html, "Número de Registro", employee.getRegistrationNumber(), false);
        addField(html, "Data de Admissão", formatDate(employee.getHireDate()), true);
        addField(html, "Cargo", employee.getPosition() != null ? employee.getPosition().getName() : "", false);
        addField(html, "CBO", employee.getCbo(), false);
        addField(html, "Salário Base", employee.getSalario() != null ? "R$ " + String.format("%.2f", employee.getSalario()) : "", false);
        addField(html, "Status", formatStatus(employee.getStatus()), true);
        html.append("</div>");
        html.append("</div>");

        // Dados Familiares
        html.append("<div class='section'>");
        html.append("<h2>5. DADOS FAMILIARES</h2>");
        html.append("<div class='grid'>");
        addField(html, "Nome do Cônjuge", employee.getSpouseName(), false);
        addField(html, "CPF do Cônjuge", employee.getSpouseCpf(), false);
        addField(html, "RG do Cônjuge", employee.getSpouseRg(), false);
        addField(html, "Telefone do Cônjuge", employee.getSpousePhone(), false);
        html.append("</div>");
        html.append("</div>");

        // FGTS e PIS
        html.append("<div class='section'>");
        html.append("<h2>6. FGTS E PIS/PASEP</h2>");
        html.append("<div class='grid'>");
        addField(html, "Optante FGTS", employee.getFgtsOptante() != null && employee.getFgtsOptante() ? "Sim" : "Não", false);
        addField(html, "Data Opção FGTS", formatDate(employee.getFgtsDataOpcao()), false);
        addField(html, "Banco Depositário FGTS", employee.getFgtsBancoDepositario(), false);
        addField(html, "Data Cadastro PIS", formatDate(employee.getPisDataCadastro()), false);
        addField(html, "Banco Depositário PIS", employee.getPisBancoDepositario(), false);
        html.append("</div>");
        html.append("</div>");

        // Observações
        if (employee.getNotes() != null && !employee.getNotes().isEmpty()) {
            html.append("<div class='section'>");
            html.append("<h2>7. OBSERVAÇÕES</h2>");
            html.append("<p class='notes'>").append(employee.getNotes()).append("</p>");
            html.append("</div>");
        }

        // Rodapé
        html.append("<div class='footer'>");
        html.append("<p>Este documento foi gerado automaticamente pelo sistema Secured Guard</p>");
        html.append("<p>Data: ").append(LocalDate.now().format(DATE_FORMATTER)).append("</p>");
        html.append("<div class='signatures'>");
        html.append("<div class='signature-box'>");
        html.append("<p>_________________________________</p>");
        html.append("<p>Assinatura do RH</p>");
        html.append("</div>");
        html.append("<div class='signature-box'>");
        html.append("<p>_________________________________</p>");
        html.append("<p>Assinatura da Contabilidade</p>");
        html.append("</div>");
        html.append("</div>");
        html.append("</div>");

        html.append("</body>");
        html.append("</html>");

        return html.toString();
    }

    /**
     * Adiciona um campo ao HTML
     */
    private void addField(StringBuilder html, String label, String value, boolean required) {
        html.append("<div class='field'>");
        html.append("<label>").append(label);
        if (required) {
            html.append("<span class='required'>*</span>");
        }
        html.append("</label>");
        html.append("<span class='value'>").append(value != null && !value.isEmpty() ? value : "___________________________").append("</span>");
        html.append("</div>");
    }

    /**
     * Formata data
     */
    private String formatDate(Object date) {
        if (date == null) return "";
        if (date instanceof LocalDate) {
            return ((LocalDate) date).format(DATE_FORMATTER);
        }
        return date.toString();
    }


    /**
     * Formata status do funcionário
     */
    private String formatStatus(com.z7design.secured_guard.model.enums.EmploymentStatus status) {
        if (status == null) return "";
        switch (status) {
            case ACTIVE: return "Ativo";
            case INACTIVE: return "Inativo";
            case SUSPENDED: return "Suspenso";
            case TERMINATED: return "Demitido";
            case VACATION: return "Férias";
            case MATERNITY_LEAVE: return "Licença Maternidade";
            case MEDICAL_CERTIFICATE: return "Atestado Médico";
            default: return status.toString();
        }
    }

    /**
     * Estilos CSS para o documento
     */
    private String getStyles() {
        return """
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                font-size: 11pt;
                line-height: 1.4;
                color: #333;
                padding: 20mm;
                background: white;
            }
            
            .header {
                text-align: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 15px;
                margin-bottom: 25px;
            }
            
            .header h1 {
                font-size: 18pt;
                color: #2563eb;
                margin-bottom: 5px;
            }
            
            .subtitle {
                font-size: 12pt;
                color: #666;
                margin-bottom: 5px;
            }
            
            .date {
                font-size: 10pt;
                color: #999;
            }
            
            .section {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            
            .section h2 {
                background: #2563eb;
                color: white;
                padding: 8px 12px;
                font-size: 12pt;
                margin-bottom: 12px;
                border-radius: 4px;
            }
            
            .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px 15px;
            }
            
            .field {
                border-bottom: 1px solid #ddd;
                padding: 5px 0;
            }
            
            .field label {
                display: block;
                font-size: 9pt;
                color: #666;
                font-weight: bold;
                margin-bottom: 2px;
            }
            
            .field .required {
                color: #dc2626;
                margin-left: 2px;
            }
            
            .field .value {
                display: block;
                font-size: 11pt;
                color: #333;
                min-height: 20px;
            }
            
            .notes {
                background: #f8f9fa;
                padding: 12px;
                border-left: 4px solid #2563eb;
                border-radius: 4px;
                font-size: 10pt;
                line-height: 1.6;
            }
            
            .footer {
                margin-top: 40px;
                border-top: 2px solid #ddd;
                padding-top: 20px;
                text-align: center;
                color: #666;
                font-size: 9pt;
            }
            
            .signatures {
                display: flex;
                justify-content: space-around;
                margin-top: 40px;
            }
            
            .signature-box {
                text-align: center;
            }
            
            .signature-box p:first-child {
                margin-top: 50px;
                margin-bottom: 5px;
                font-size: 10pt;
            }
            
            .signature-box p:last-child {
                font-size: 9pt;
                color: #666;
            }
            
            @media print {
                body {
                    padding: 10mm;
                }
                
                .section {
                    page-break-inside: avoid;
                }
            }
        """;
    }
}

