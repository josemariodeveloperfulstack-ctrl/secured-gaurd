package com.z7design.secured_guard.model.prospection;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prospection_contacts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProspectionContact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonBackReference
    private ProspectionCompany company;

    @Column(nullable = false)
    private String nome;

    @Column(name = "cargo_tipo", nullable = false, length = 50)
    private String cargoTipo; // 'SOCIO', 'DECISOR', 'COMPRAS', 'DIRETOR'

    @Column(name = "cargo_descricao")
    private String cargoDescricao;

    private String email;

    @Column(length = 50)
    private String telefone;

    @Column(name = "linkedin_url")
    private String linkedinUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
