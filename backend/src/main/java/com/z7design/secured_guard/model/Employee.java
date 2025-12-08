package com.z7design.secured_guard.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.persistence.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.z7design.secured_guard.model.enums.EmploymentStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Data
@Entity
@Table(name = "employees")
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Employee {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @OneToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "position_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Position position;
    
    @Column
    private String registrationNumber;
    
    @Column
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;
    
    @Column(name = "probation_end_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate probationEndDate;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate terminationDate;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmploymentStatus status;
    
    @Column(length = 500)
    private String notes;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @Column
    private String name;
    
    @Column(nullable = true)
    private String document;
    
    @Column(name = "birth_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "unit_id")
    @JsonIgnoreProperties("employees")
    private Unit unit;
    
    @Column
    private String address;
    
    @Column
    private String phone;
    
    @Email(message = "Invalid email format")
    @Column
    private String email;
    
    // CNH - cnh_number já existe (V504), adicionar apenas campos complementares
    @Column(name = "cnh_number", length = 20)
    private String cnhNumber;
    
    @Column(name = "cnh_expiration_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate cnhExpirationDate;
    
    @Column(name = "cnh_category", length = 5)
    private String cnhCategory;
    
    // CTPS - ctps já existe (V256), adicionar apenas campos complementares
    @Column(name = "ctps_series", length = 10)
    private String ctpsSeries;
    
    @Column(name = "ctps_issue_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate ctpsIssueDate;
    
    @Column(name = "ctps_issuing_agency", length = 100)
    private String ctpsIssuingAgency;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "company_id")
    @JsonBackReference("company-employees")
    private Company company;
    
    // Dados Pessoais
    @Column(name = "marital_status")
    private String maritalStatus;
    
    @Column(name = "nationality", length = 50)
    private String nationality;
    
    // @Column(name = "photo_url")
    // private String photoUrl;

    // Dados Profissionais
    // @Column(name = "current_scale")
    // private String currentScale;

    // Documentos
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<Document> documents = new ArrayList<>();

    // Benefícios
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<Benefit> benefits = new ArrayList<>();

    // Histórico de Escalas
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<Schedule> schedules = new ArrayList<>();

    // Ocorrências
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<Occurrence> occurrences = new ArrayList<>();

    // Holerites
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference("employee-payrolls")
    private List<Payroll> payrolls = new ArrayList<>();

    // EPIs
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<EPI> epis = new ArrayList<>();

    // Time Records
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference("employee-time-records")
    private List<TimeRecord> timeRecords = new ArrayList<>();

    // Dependentes
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    @JsonManagedReference("employee-dependents")
    private List<Dependent> dependents = new ArrayList<>();

    // @Column(name = "caminho_pdf")
    // private String caminhoPdf;

    // @Column(name = "mes_referencia")
    // private String mesReferencia;

    // @Column(name = "ano_referencia")
    // private String anoReferencia;

    // @Column(name = "possui_whatsapp")
    // private Boolean possuiWhatsapp;

    // Campos adicionais para admissão completa
    @Column(name = "titulo_eleitor", length = 20)
    private String tituloEleitor;

    // @Column(name = "carteira_identidade")
    // private String carteiraIdentidade;

    // @Column(name = "grau_instrucao")
    // private String grauInstrucao;

    // @Column(name = "pai")
    // private String pai;

    // @Column(name = "mae")
    // private String mae;

    // @Column(name = "naturalidade")
    // private String naturalidade;

    // @Column(name = "cep")
    // private String cep;

    @Column(name = "ctps", length = 30)
    private String ctps;

    @Column(name = "ctps_rural", length = 30)
    private String ctpsRural;

    @Column(name = "titulo_eleitor_zona", length = 10)
    private String tituloEleitorZona;

    @Column(name = "titulo_eleitor_secao", length = 10)
    private String tituloEleitorSecao;

    @Column(name = "carteira_identidade_orgao_emissor", length = 50)
    private String carteiraIdentidadeOrgaoEmissor;

    @Column(name = "carteira_identidade_data_emissao")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate carteiraIdentidadeDataEmissao;

    @Column(name = "certificado_militar", length = 30)
    private String certificadoMilitar;

    @Column(name = "cbo", length = 20)
    private String cbo;

    @Column(name = "pis", length = 20)
    private String pis;

    @Column(name = "salario")
    private java.math.BigDecimal salario;

    @Column(name = "salario_por_extenso", columnDefinition = "TEXT")
    private String salarioPorExtenso;

    @Column(name = "periodo_pagamento", length = 50)
    private String periodoPagamento;

    @Column(name = "horario_trabalho", columnDefinition = "TEXT")
    private String horarioTrabalho;

    @Column(name = "folga_semanal", length = 50)
    private String folgaSemanal;

    // FGTS
    @Column(name = "fgts_optante")
    private Boolean fgtsOptante;

    @Column(name = "fgts_data_opcao")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fgtsDataOpcao;

    @Column(name = "fgts_banco_depositario", length = 100)
    private String fgtsBancoDepositario;

    @Column(name = "fgts_data_retratacao")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fgtsDataRetratacao;

    // Empresa (dados básicos)
    @Column(name = "empresa_nome", length = 100)
    private String empresaNome;

    @Column(name = "empresa_endereco", length = 255)
    private String empresaEndereco;

    @Column(name = "empresa_cnpj", length = 20)
    private String empresaCnpj;

    @Column(name = "visto_fiscalizacao", columnDefinition = "TEXT")
    private String vistoFiscalizacao;

    // Informações pessoais adicionais
    @Column(name = "nome_pai", length = 100)
    private String nomePai;

    @Column(name = "nome_mae", length = 100)
    private String nomeMae;

    @Column(name = "local_nascimento", length = 100)
    private String localNascimento;

    @Column(name = "grau_instrucao", length = 50)
    private String grauInstrucao;

    // PIS
    @Column(name = "pis_data_cadastro")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate pisDataCadastro;

    @Column(name = "pis_banco_depositario", length = 100)
    private String pisBancoDepositario;

    @Column(name = "pis_endereco_banco", length = 255)
    private String pisEnderecoBanco;

    @Column(name = "pis_codigo_banco", length = 10)
    private String pisCodigoBanco;

    @Column(name = "pis_codigo_agencia", length = 10)
    private String pisCodigoAgencia;

    // Dados Bancários
    @Column(name = "banco", length = 100)
    private String banco;

    @Column(name = "agencia", length = 20)
    private String agencia;

    @Column(name = "conta_corrente", length = 20)
    private String contaCorrente;

    // Estrangeiros
    @Column(name = "carteira_modelo_19", length = 30)
    private String carteiraModelo19;

    @Column(name = "registro_geral_estrangeiro", length = 30)
    private String registroGeralEstrangeiro;

    @Column(name = "casado_brasileiro")
    private Boolean casadoBrasileiro;

    @Column(name = "nome_conjuge_estrangeiro", length = 100)
    private String nomeConjugeEstrangeiro;

    // Dados do cônjuge
    @Column(name = "spouse_name", length = 100)
    private String spouseName;

    @Column(name = "spouse_cpf", length = 14)
    private String spouseCpf;

    @Column(name = "spouse_rg", length = 20)
    private String spouseRg;

    @Column(name = "spouse_birth_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate spouseBirthDate;

    @Column(name = "spouse_phone", length = 20)
    private String spousePhone;

    @Column(name = "spouse_email", length = 100)
    @Email
    private String spouseEmail;

    @Column(name = "tem_filhos_brasileiros")
    private Boolean temFilhosBrasileiros;

    @Column(name = "quantidade_filhos_brasileiros")
    private Integer quantidadeFilhosBrasileiros;

    @Column(name = "data_chegada_brasil")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dataChegadaBrasil;

    @Column(name = "naturalizado")
    private Boolean naturalizado;

    @Column(name = "decreto_naturalizacao", length = 50)
    private String decretoNaturalizacao;

    // Assinaturas e controle
    @Column(name = "assinatura_funcionario", columnDefinition = "TEXT")
    private String assinaturaFuncionario;

    @Column(name = "data_rescisao")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dataRescisao;

    // Método para obter o nome completo do funcionário
    public String getFullName() {
        return this.name;
    }
} 