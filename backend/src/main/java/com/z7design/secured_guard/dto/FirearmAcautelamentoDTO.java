package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.FirearmAcautelamento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirearmAcautelamentoDTO {

    private Long id;

    // Empresa Emissora
    private String companyName;

    // 1. Dados do Vigilante
    private String vigilanteName;
    private String registration;
    private String cnvNumber;
    private String cpf;
    private String workPostName;
    private LocalDate recyclingExpirationDate;

    // 2. Especificação do Armamento, Munição e Acessórios
    private String weaponType;
    private String brand;
    private String caliber;
    private Integer shotCapacity;
    private String serialNumber;
    private String crafNumber;
    private Integer ammoQuantity;
    private String ammoType;
    private String ammoLot;
    private String accessories;

    // 3. Declaração de Inspeção Visual e Funcional
    private Boolean mecanismoDisparoOk;
    private Boolean canoDesobstruidoOk;
    private String conservationState;

    // Status e Observações
    private String status;
    private String cityUf;
    private LocalDate termDate;
    private String observations;

    // Assinaturas Digitais
    private String vigilanteSignatureBase64;
    private String armeiroName;
    private String armeiroSignatureBase64;

    private Long employeeId;
    private Long equipmentId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FirearmAcautelamentoDTO fromEntity(FirearmAcautelamento entity) {
        if (entity == null) return null;

        return FirearmAcautelamentoDTO.builder()
                .id(entity.getId())
                .companyName(entity.getCompanyName())
                .vigilanteName(entity.getVigilanteName())
                .registration(entity.getRegistration())
                .cnvNumber(entity.getCnvNumber())
                .cpf(entity.getCpf())
                .workPostName(entity.getWorkPostName())
                .recyclingExpirationDate(entity.getRecyclingExpirationDate())
                .weaponType(entity.getWeaponType())
                .brand(entity.getBrand())
                .caliber(entity.getCaliber())
                .shotCapacity(entity.getShotCapacity())
                .serialNumber(entity.getSerialNumber())
                .crafNumber(entity.getCrafNumber())
                .ammoQuantity(entity.getAmmoQuantity())
                .ammoType(entity.getAmmoType())
                .ammoLot(entity.getAmmoLot())
                .accessories(entity.getAccessories())
                .mecanismoDisparoOk(entity.getMecanismoDisparoOk())
                .canoDesobstruidoOk(entity.getCanoDesobstruidoOk())
                .conservationState(entity.getConservationState())
                .status(entity.getStatus())
                .cityUf(entity.getCityUf())
                .termDate(entity.getTermDate())
                .observations(entity.getObservations())
                .vigilanteSignatureBase64(entity.getVigilanteSignatureBase64())
                .armeiroName(entity.getArmeiroName())
                .armeiroSignatureBase64(entity.getArmeiroSignatureBase64())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
