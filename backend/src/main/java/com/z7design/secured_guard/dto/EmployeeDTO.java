package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeDTO {
    private java.util.UUID id;
    private String name;
    private String cpf;
    private String rg;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;
    private String gender;
    private String maritalStatus;
    private String nationality;

    // Lista de dependentes (usado apenas para visualização, não para
    // criação/atualização)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private java.util.List<com.z7design.secured_guard.dto.DependentDTO> dependents;

    private String photoUrl;
    // private String currentScale;
    private String email;
    private String phone;
    private String telefoneContato;
    private String cnhNumber;
    @JsonDeserialize(using = AddressDeserializer.class)
    private AddressDTO address;

    // Campos de endereço separados
    private String enderecoRua;
    private String enderecoNumero;
    private String enderecoComplemento;
    private String enderecoBairro;
    private String enderecoCidade;
    private String enderecoEstado;
    private String enderecoCep;

    // CIN (Carteira de Identidade Nacional)
    private String cinNumero;
    private String cinOrgaoEmissor;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate cinDataEmissao;

    // CTPS Digital PDF
    private byte[] ctpsDigitalPdf;
    private String ctpsDigitalPdfNome;
    private Long ctpsDigitalPdfTamanho;
    @com.fasterxml.jackson.annotation.JsonProperty("bankData")
    @JsonAlias("bankInfo")
    private BankInfoDTO bankInfo;
    private JobInfoDTO jobInfo;
    private List<DocumentDTO> documents;
    private EmergencyContactDTO emergencyContact;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // private String tituloEleitor;
    // private String carteiraIdentidade;
    // private String grauInstrucao;
    // private String pai;
    // private String mae;
    // private String naturalidade;
    // private String nationality;
    private String registrationNumber;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate terminationDate;
    private String terminationReason;
    // Campos já implementados abaixo (linhas 87-141) - mantidos comentados para
    // evitar duplicação
    // private String cep;
    // private String ctps;
    // private String cbo;
    // private String pis;
    // private BigDecimal salario;
    // private Boolean fgtsOptante;
    // @JsonFormat(pattern = "yyyy-MM-dd")
    // private LocalDate fgtsDataOpcao;
    // private String fgtsBancoDepositario;
    // private String empresaNome;
    // private String empresaEndereco;
    // private String empresaCnpj;
    // private Boolean possuiWhatsapp;
    // private String caminhoPdf;
    // private String mesReferencia;
    // private String anoReferencia;
    private String notes;
    private String status;

    // Dados do cônjuge
    private String spouseName;
    private String spouseCpf;
    private String spouseRg;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate spouseBirthDate;
    private String spousePhone;
    private String spouseEmail;

    // Campos da ficha de registro
    private String empresaNome;
    private String empresaEndereco;
    private String empresaCnpj;
    private String tituloEleitor;
    private String tituloEleitorZona;
    private String tituloEleitorSecao;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate tituloEleitorDataExpedicao;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate tituloEleitorValidade;
    private String nomeConselhoRegional;
    private String carteiraIdentidadeOrgaoEmissor;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate carteiraIdentidadeDataEmissao;
    private String rgUf; // UF de emissão do RG (planilha: U.F RG)
    private String certificadoMilitar;
    private String nomePai;
    private String nomeMae;
    private String localNascimento;
    private String municipioNascimento;
    private String estadoNascimento;
    private String sexo; // MASCULINO, FEMININO, OUTRO
    private String grauInstrucao;
    private String matriculaEsocial;
    private String racaCor; // Raça/Cor (classificação IBGE/eSocial)
    private String tipoSalarioContratual; // MENSAL, HORISTA, etc.
    private String cbo;
    private String pis;
    private BigDecimal salario;
    private String salarioPorExtenso;
    private String periodoPagamento;
    private String horarioTrabalho; // Período de Trabalho (ex: "18:00 ÀS 06:00 H")
    private String horarioTrabalhoIntervalo; // Intervalo (ex: "23:00 ÀS 00:00 H")
    private String diasTrabalho; // Dias de Trabalho (ex: "12X36")
    private String prazoExperienciaTexto; // Prazo de Experiência em texto (ex: "45 DIAS")
    private String prorrogacaoExperiencia; // Prorrogação do prazo de experiência
    private String folgaSemanal; // Dias de Folga (ex: "1ª Escola")
    private String escalaTrabalho; // Escala de Trabalho
    private Boolean fgtsOptante;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fgtsDataOpcao;
    private String fgtsBancoDepositario;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fgtsDataRetratacao;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate pisDataCadastro;
    private String pisBancoDepositario;
    private String pisEnderecoBanco;
    private String pisCodigoBanco;
    private String pisCodigoAgencia;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate cnhExpirationDate;

    // Campo para Posto de Trabalho
    private String workPostId;
    /** Objeto workPost para preenchimento no frontend (id + name) */
    private IdOnlyDTO workPost;
    /** Data de início no novo setor (obrigatória quando workPost é alterado - para remanejamento) */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private LocalDate remanejamentoDataInicio;

    // Campo para Departamento
    private String departmentId;
    private IdOnlyDTO department;
    private String cnhCategory;
    private String ctps;
    private String ctpsRural;
    private String ctpsSeries;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate ctpsIssueDate;
    private String ctpsIssuingAgency;
    private String carteiraModelo19;
    private String registroGeralEstrangeiro;
    private Boolean casadoBrasileiro;
    private String nomeConjugeEstrangeiro;
    private Boolean temFilhosBrasileiros;
    private Integer quantidadeFilhosBrasileiros;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dataChegadaBrasil;
    private Boolean naturalizado;
    private String decretoNaturalizacao;
    private String vistoFiscalizacao;

    // Campos para Estrangeiro
    private String rneNumero; // RNE nº
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate rneValidade; // Validade do RNE
    private String ricNumero; // Nº RIC (para naturalizados)
    private String ricOrgaoEmissor; // Órgão Emissor do RIC
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate ricDataEmissao; // Data de Emissão do RIC
    private String tipoVisto; // Tipo de Visto

    private String assinaturaFuncionario;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dataRescisao;

    // Dados do Exame Médico (ASO)
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate exameMedicoData;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate exameMedicoVencimento;
    private String exameMedicoTipo; // ADMISSIONAL, DEMISSIONAL, PERIODICO, MUDANCA_FUNCAO, RETORNO_TRABALHO
    private IdOnlyDTO exameMedicoDoctor; // Referência ao médico
    private String exameMedicoHorario; // Ex: "18:00 ÀS 06:00 H"
    private Boolean exameMedicoIntervalosRefeicao; // true = Sim, false = Não
    private String exameMedicoHorarioIntervalo; // Ex: "12:00 ÀS 13:00 H"
    private String exameMedicoObservacoes;
    private Boolean exameMedicoPrimeiroEmprego; // true = Sim, false = Não
    private Boolean exameMedicoContribuicaoSindicalPaga; // true = Sim, false = Não

    // Dados do Laudo Psicológico
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate laudoPsicologicoData;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate laudoPsicologicoVencimento;
    private String laudoPsicologicoResultado;
    private IdOnlyDTO laudoPsicologicoDoctor;
    private String laudoPsicologicoObservacoes;

    /** Tipo de admissão para recontratação: READMISSAO ou PROMOCAO */
    private String admissionType;

    /**
     * Número total de vínculos empregatícios registrados para este funcionário.
     * Valor > 1 indica que o funcionário foi demitido e readmitido ao menos uma vez.
     * Populado no toDTO() via contagem da tabela employee_employment_periods.
     */
    private Integer periodCount;

    /** Indica se o funcionário possui histórico de readmissão */
    private Boolean isReadmitido;

    /** Data da última promoção / alteração de cargo */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate lastPromotionDate;

    /** Resumo da última promoção / alteração de cargo (ex: "Promovido para Supervisor") */
    private String lastPromotionInfo;

    /** Informações do vínculo / contrato anterior (para readmitidos ou demitidos do posto anterior) */
    private String previousStatus;
    private String previousWorkPostName;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate previousTerminationDate;
    private String previousTerminationReason;

    /**
     * Usuário do sistema vinculado ao funcionário (opcional).
     * Só deve ser preenchido se o funcionário também for usuário do sistema.
     */
    private IdOnlyDTO user;
    private PositionDTO position;
    private UnitDTO unit;
    private IdOnlyDTO company;

    public java.util.UUID getCompanyId() {
        return company != null ? company.getId() : null;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AddressDTO {
        private String street;
        private String number;
        private String complement;
        private String neighborhood;
        private String city;
        private String state;
        private String zipCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BankInfoDTO {
        private String bank;
        private String agency;
        private String account;
        private String accountDigit;
        @com.fasterxml.jackson.annotation.JsonProperty("type")
        private String accountType;
        @com.fasterxml.jackson.annotation.JsonProperty("chavePix")
        private String pixKey;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class JobInfoDTO {
        private String position;
        private String function;
        private String unit;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate admissionDate;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate probationEndDate;
        private String contractType;
        private BigDecimal salary;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DocumentDTO {
        private java.util.UUID id;
        private String type;
        private String number;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate issueDate;
        private String issuingAuthority;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EmergencyContactDTO {
        private String name;
        private String relationship;
        private String phone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IdOnlyDTO {
        private java.util.UUID id;
        private String name;
        private String username;
        private String email;
        private String sigla;
        private String cnpj;
        private java.util.UUID clientId;
        private String clientName;
        private List<String> epis;
        /** Descrição do posto (ex.: Portaria 24h dia) — usado quando type=OUTROS */
        private String description;
        /** Tipo do posto (enum name, ex.: POSTO_24H) */
        private String type;
        /** Escala do posto (ex.: 12x36) */
        private String workSchedule;
        private String primaryPositionName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PositionDTO {
        private java.util.UUID id;
        private String name;
        private String description;
        private Double baseSalary;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UnitDTO {
        private java.util.UUID id;
        private String name;
        private String description;
        private String address;
        private String phone;
        private String email;
        private String code;
        private String manager;
        private boolean active;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    // Deserializador customizado para o campo address
    public static class AddressDeserializer extends StdDeserializer<AddressDTO> {

        public AddressDeserializer() {
            super(AddressDTO.class);
        }

        @Override
        public AddressDTO deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            JsonNode node = p.getCodec().readTree(p);

            AddressDTO address = new AddressDTO();

            if (node.isTextual()) {
                // Se for string, usar como street
                address.setStreet(node.asText());
            } else if (node.isObject()) {
                // Se for objeto, mapear os campos
                if (node.has("street")) {
                    address.setStreet(node.get("street").asText());
                }
                if (node.has("number")) {
                    address.setNumber(node.get("number").asText());
                }
                if (node.has("complement")) {
                    address.setComplement(node.get("complement").asText());
                }
                if (node.has("neighborhood")) {
                    address.setNeighborhood(node.get("neighborhood").asText());
                }
                if (node.has("city")) {
                    address.setCity(node.get("city").asText());
                }
                if (node.has("state")) {
                    address.setState(node.get("state").asText());
                }
                if (node.has("zipCode")) {
                    address.setZipCode(node.get("zipCode").asText());
                }
            }

            return address;
        }
    }
}