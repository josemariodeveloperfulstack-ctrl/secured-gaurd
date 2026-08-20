package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.RadioChecklist;
import com.z7design.secured_guard.model.RadioChecklist.MovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RadioChecklistDTO {

    private Long id;

    // Cabeçalho da Ficha de Inspeção
    private String documentCode;
    private String documentVersion;
    private LocalDate documentDate;
    private MovementType movementType;

    // Dados do Posto e Vigilante
    private LocalDate checklistDate;
    private LocalTime checklistTime;
    private String vigilanteName;
    private String vigilanteRegistration;
    private String workPostName;
    private String radioAssetId;
    private String radioSerialNumber;

    // 1. Inspeção Física Externa (Conservação)
    private Boolean carcacaExterna;
    private Boolean antena;
    private Boolean clipCinto;
    private Boolean conectorAcessorios;

    // 2. Alimentação e Bateria
    private Boolean encaixeBateria;
    private Boolean nivelCarga;
    private Boolean contatosCarga;

    // 3. Teste Operacional e Funcionalidades (Obrigatório)
    private Boolean botaoVolume;
    private Boolean seletorCanais;
    private Boolean botaoPtt;
    private Boolean testeComunicacaoPratica;

    // 4. Acessórios Adicionais
    private Boolean foneOuvidoLapela;
    private Boolean carregadorMesaFonte;

    // Declaração de Conformidade & Status
    private String conformityStatus;
    private String observations;

    // Assinaturas e Nomes
    private String vigilanteSignatureBase64;
    private String almoxarifeName;
    private String almoxarifeSignatureBase64;

    private Long employeeId;
    private Long workPostId;
    private Long equipmentId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RadioChecklistDTO fromEntity(RadioChecklist entity) {
        if (entity == null) return null;

        return RadioChecklistDTO.builder()
                .id(entity.getId())
                .documentCode(entity.getDocumentCode())
                .documentVersion(entity.getDocumentVersion())
                .documentDate(entity.getDocumentDate())
                .movementType(entity.getMovementType())
                .checklistDate(entity.getChecklistDate())
                .checklistTime(entity.getChecklistTime())
                .vigilanteName(entity.getVigilanteName())
                .vigilanteRegistration(entity.getVigilanteRegistration())
                .workPostName(entity.getWorkPostName())
                .radioAssetId(entity.getRadioAssetId())
                .radioSerialNumber(entity.getRadioSerialNumber())
                .carcacaExterna(entity.getCarcacaExterna())
                .antena(entity.getAntena())
                .clipCinto(entity.getClipCinto())
                .conectorAcessorios(entity.getConectorAcessorios())
                .encaixeBateria(entity.getEncaixeBateria())
                .nivelCarga(entity.getNivelCarga())
                .contatosCarga(entity.getContatosCarga())
                .botaoVolume(entity.getBotaoVolume())
                .seletorCanais(entity.getSeletorCanais())
                .botaoPtt(entity.getBotaoPtt())
                .testeComunicacaoPratica(entity.getTesteComunicacaoPratica())
                .foneOuvidoLapela(entity.getFoneOuvidoLapela())
                .carregadorMesaFonte(entity.getCarregadorMesaFonte())
                .conformityStatus(entity.getConformityStatus())
                .observations(entity.getObservations())
                .vigilanteSignatureBase64(entity.getVigilanteSignatureBase64())
                .almoxarifeName(entity.getAlmoxarifeName())
                .almoxarifeSignatureBase64(entity.getAlmoxarifeSignatureBase64())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
