package com.z7design.secured_guard.model;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.z7design.secured_guard.model.enums.SstProfessionalType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Profissional de SST (engenheiro/técnico/médico) responsável por assinar
 * ordens de serviço/relatórios e orientar as regras de SST da empresa.
 */
@Entity
@Table(name = "safety_engineers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SafetyEngineer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank(message = "Nome completo é obrigatório")
    @Size(max = 200, message = "Nome deve ter até 200 caracteres")
    @Column(nullable = false, length = 200)
    private String name;

    /** Registro profissional (CREA, MTE, CRM, etc.). */
    @NotBlank(message = "Registro é obrigatório")
    @Size(max = 50, message = "Registro deve ter até 50 caracteres")
    @Column(nullable = false, length = 50)
    private String creaNumber;

    @Size(max = 40, message = "Telefone deve ter até 40 caracteres")
    @Column(length = 40)
    private String phone;

    @Size(max = 180, message = "E-mail deve ter até 180 caracteres")
    @Column(length = 180)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "professional_type", nullable = false, length = 40)
    @Builder.Default
    private SstProfessionalType professionalType = SstProfessionalType.ENGENHEIRO_SEGURANCA;

    @Size(max = 500, message = "URL do carimbo deve ter até 500 caracteres")
    @Column(name = "stamp_image_url", length = 500)
    private String stampImageUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** Empresa principal (compatibilidade / primeiro vínculo). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /** Empresas em que o profissional atua (pode ser as 3). */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "safety_engineer_companies",
            joinColumns = @JoinColumn(name = "safety_engineer_id"),
            inverseJoinColumns = @JoinColumn(name = "company_id")
    )
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Company> companies = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
