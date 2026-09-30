package com.z7design.secured_guard.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Template (minuta) de contrato de uma empresa, com as 14 cláusulas do contrato
 * de prestação de serviços editáveis separadamente.
 *
 * Modelos oficiais (template_key): ARMADA, DESARMADA e PORTARIA.
 * Registros com company_id NULL são templates globais compartilhados;
 * quando a empresa salva suas próprias cláusulas, é criada uma cópia vinculada.
 */
@Entity
@Table(name = "company_contract_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyContractTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** ID da empresa na tabela companies (NULL = template global oficial). */
    @Column(name = "company_id")
    private UUID companyId;

    /** Chave do modelo: ARMADA, DESARMADA ou PORTARIA. */
    @Column(name = "template_key", nullable = false, length = 30)
    private String templateKey;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "clause_1", columnDefinition = "TEXT")
    private String clause1;

    @Column(name = "clause_2", columnDefinition = "TEXT")
    private String clause2;

    @Column(name = "clause_3", columnDefinition = "TEXT")
    private String clause3;

    @Column(name = "clause_4", columnDefinition = "TEXT")
    private String clause4;

    @Column(name = "clause_5", columnDefinition = "TEXT")
    private String clause5;

    @Column(name = "clause_6", columnDefinition = "TEXT")
    private String clause6;

    @Column(name = "clause_7", columnDefinition = "TEXT")
    private String clause7;

    @Column(name = "clause_8", columnDefinition = "TEXT")
    private String clause8;

    @Column(name = "clause_9", columnDefinition = "TEXT")
    private String clause9;

    @Column(name = "clause_10", columnDefinition = "TEXT")
    private String clause10;

    @Column(name = "clause_11", columnDefinition = "TEXT")
    private String clause11;

    @Column(name = "clause_12", columnDefinition = "TEXT")
    private String clause12;

    @Column(name = "clause_13", columnDefinition = "TEXT")
    private String clause13;

    @Column(name = "clause_14", columnDefinition = "TEXT")
    private String clause14;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
