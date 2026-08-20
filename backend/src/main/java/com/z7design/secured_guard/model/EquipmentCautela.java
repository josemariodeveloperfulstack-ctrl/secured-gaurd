package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "equipment_cautelas")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentCautela {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Empresa Emissora
    @Column(name = "company_name", length = 150)
    private String companyName;

    // 1. Dados do Colaborador
    @Column(name = "employee_name", length = 150, nullable = false)
    private String employeeName;

    @Column(name = "registration", length = 50)
    private String registration; // Matrícula

    @Column(name = "cpf", length = 20)
    private String cpf;

    @Column(name = "job_title", length = 100)
    private String jobTitle; // Cargo / Função

    @Column(name = "work_post_name", length = 150)
    private String workPostName; // Posto de Trabalho

    // 2. Especificação dos Materiais / Equipamentos (Os 5 Itens Físicos da Ficha)
    // Item 01: Rádio Transceptor (HT) com bateria
    @Column(name = "item1_ht_entregue")
    private Boolean item1HtEntregue;

    @Column(name = "item1_ht_marca_modelo", length = 150)
    private String item1HtMarcaModelo;

    // Item 02: Carregador de Bateria HT
    @Column(name = "item2_carregador_entregue")
    private Boolean item2CarregadorEntregue;

    @Column(name = "item2_carregador_marca_modelo", length = 150)
    private String item2CarregadorMarcaModelo;

    // Item 03: Lanterna Tática com Bateria
    @Column(name = "item3_lanterna_entregue")
    private Boolean item3LanternaEntregue;

    @Column(name = "item3_lanterna_marca_modelo", length = 150)
    private String item3LanternaMarcaModelo;

    // Item 04: Bastão de Ronda Eletrônico
    @Column(name = "item4_bastao_entregue")
    private Boolean item4BastaoEntregue;

    @Column(name = "item4_bastao_marca_modelo", length = 150)
    private String item4BastaoMarcaModelo;

    // Item 05 / 06: Outros
    @Column(name = "item5_outros_descricao", length = 200)
    private String item5OutrosDescricao;

    @Column(name = "item5_outros_marca_modelo", length = 150)
    private String item5OutrosMarcaModelo;

    // Metadados do Termo
    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "ATIVO"; // ATIVO, DEVOLVIDO, BAIXADO

    @Column(name = "city_uf", length = 100)
    private String cityUf; // Cidade - UF

    @Column(name = "term_date")
    private LocalDate termDate; // Data do Termo

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    // Assinaturas Digitais
    @Column(name = "employee_signature_base64", columnDefinition = "TEXT")
    private String employeeSignatureBase64;

    @Column(name = "almoxarife_name", length = 150)
    private String almoxarifeName;

    @Column(name = "almoxarife_signature_base64", columnDefinition = "TEXT")
    private String almoxarifeSignatureBase64;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
