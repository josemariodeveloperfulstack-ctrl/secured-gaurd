package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.EquipmentCautela;
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
public class EquipmentCautelaDTO {

    private Long id;

    // Empresa Emissora
    private String companyName;

    // 1. Dados do Colaborador
    private String employeeName;
    private String registration;
    private String cpf;
    private String jobTitle;
    private String workPostName;

    // 2. Especificação dos Materiais / Equipamentos (Os 5 Itens Físicos da Ficha)
    private Boolean item1HtEntregue;
    private String item1HtMarcaModelo;

    private Boolean item2CarregadorEntregue;
    private String item2CarregadorMarcaModelo;

    private Boolean item3LanternaEntregue;
    private String item3LanternaMarcaModelo;

    private Boolean item4BastaoEntregue;
    private String item4BastaoMarcaModelo;

    private String item5OutrosDescricao;
    private String item5OutrosMarcaModelo;

    // Metadados do Termo
    private String status;
    private String cityUf;
    private LocalDate termDate;
    private String observations;

    // Assinaturas Digitais
    private String employeeSignatureBase64;
    private String almoxarifeName;
    private String almoxarifeSignatureBase64;

    private Long employeeId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EquipmentCautelaDTO fromEntity(EquipmentCautela entity) {
        if (entity == null) return null;

        return EquipmentCautelaDTO.builder()
                .id(entity.getId())
                .companyName(entity.getCompanyName())
                .employeeName(entity.getEmployeeName())
                .registration(entity.getRegistration())
                .cpf(entity.getCpf())
                .jobTitle(entity.getJobTitle())
                .workPostName(entity.getWorkPostName())
                .item1HtEntregue(entity.getItem1HtEntregue())
                .item1HtMarcaModelo(entity.getItem1HtMarcaModelo())
                .item2CarregadorEntregue(entity.getItem2CarregadorEntregue())
                .item2CarregadorMarcaModelo(entity.getItem2CarregadorMarcaModelo())
                .item3LanternaEntregue(entity.getItem3LanternaEntregue())
                .item3LanternaMarcaModelo(entity.getItem3LanternaMarcaModelo())
                .item4BastaoEntregue(entity.getItem4BastaoEntregue())
                .item4BastaoMarcaModelo(entity.getItem4BastaoMarcaModelo())
                .item5OutrosDescricao(entity.getItem5OutrosDescricao())
                .item5OutrosMarcaModelo(entity.getItem5OutrosMarcaModelo())
                .status(entity.getStatus())
                .cityUf(entity.getCityUf())
                .termDate(entity.getTermDate())
                .observations(entity.getObservations())
                .employeeSignatureBase64(entity.getEmployeeSignatureBase64())
                .almoxarifeName(entity.getAlmoxarifeName())
                .almoxarifeSignatureBase64(entity.getAlmoxarifeSignatureBase64())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
