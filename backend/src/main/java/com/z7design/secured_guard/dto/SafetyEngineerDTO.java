package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.SafetyEngineer;
import com.z7design.secured_guard.model.enums.SstProfessionalType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SafetyEngineerDTO {
    private UUID id;

    @NotBlank(message = "Nome completo é obrigatório")
    @Size(max = 200, message = "Nome deve ter até 200 caracteres")
    private String name;

    @NotBlank(message = "Registro é obrigatório")
    @Size(max = 50, message = "Registro deve ter até 50 caracteres")
    private String creaNumber;

    @Size(max = 40, message = "Telefone deve ter até 40 caracteres")
    private String phone;

    @Size(max = 180, message = "E-mail deve ter até 180 caracteres")
    private String email;

    private SstProfessionalType professionalType;

    @Size(max = 500, message = "URL do carimbo deve ter até 500 caracteres")
    private String stampImageUrl;

    private Boolean active;
    private String notes;

    /** Empresa principal (primeiro vínculo / compatibilidade). */
    private UUID companyId;
    private String companyName;

    /** Todas as empresas vinculadas. */
    @Builder.Default
    private List<UUID> companyIds = new ArrayList<>();

    /** Nomes das empresas vinculadas (somente leitura). */
    @Builder.Default
    private List<String> companyNames = new ArrayList<>();

    /** True se este profissional é o padrão da empresa principal. */
    private Boolean companyDefault;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SafetyEngineerDTO fromEntity(SafetyEngineer entity) {
        return fromEntity(entity, null);
    }

    public static SafetyEngineerDTO fromEntity(SafetyEngineer entity, UUID companyDefaultEngineerId) {
        if (entity == null) {
            return null;
        }

        boolean isDefault = companyDefaultEngineerId != null
                && entity.getId() != null
                && companyDefaultEngineerId.equals(entity.getId());

        List<Company> linked = new ArrayList<>();
        if (entity.getCompanies() != null && !entity.getCompanies().isEmpty()) {
            linked.addAll(entity.getCompanies());
        } else if (entity.getCompany() != null) {
            linked.add(entity.getCompany());
        }
        linked.sort(Comparator.comparing(c -> c.getName() != null ? c.getName() : "", String.CASE_INSENSITIVE_ORDER));

        List<UUID> ids = linked.stream().map(Company::getId).collect(Collectors.toList());
        List<String> names = linked.stream()
                .map(c -> c.getName() != null ? c.getName() : "")
                .collect(Collectors.toList());

        Company primary = entity.getCompany();
        if (primary == null && !linked.isEmpty()) {
            primary = linked.get(0);
        }

        return SafetyEngineerDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .creaNumber(entity.getCreaNumber())
                .phone(entity.getPhone())
                .email(entity.getEmail())
                .professionalType(entity.getProfessionalType() != null
                        ? entity.getProfessionalType()
                        : SstProfessionalType.ENGENHEIRO_SEGURANCA)
                .stampImageUrl(entity.getStampImageUrl())
                .active(entity.getActive() == null || Boolean.TRUE.equals(entity.getActive()))
                .notes(entity.getNotes())
                .companyId(primary != null ? primary.getId() : null)
                .companyName(primary != null ? primary.getName() : null)
                .companyIds(ids)
                .companyNames(names)
                .companyDefault(isDefault)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public SafetyEngineer toEntity(Company company) {
        SafetyEngineer entity = new SafetyEngineer();
        entity.setId(this.id);
        entity.setName(this.name);
        entity.setCreaNumber(this.creaNumber);
        entity.setPhone(this.phone);
        entity.setEmail(this.email);
        entity.setProfessionalType(this.professionalType != null
                ? this.professionalType
                : SstProfessionalType.ENGENHEIRO_SEGURANCA);
        entity.setStampImageUrl(this.stampImageUrl);
        entity.setActive(this.active == null || Boolean.TRUE.equals(this.active));
        entity.setNotes(this.notes);
        entity.setCompany(company);
        return entity;
    }
}
