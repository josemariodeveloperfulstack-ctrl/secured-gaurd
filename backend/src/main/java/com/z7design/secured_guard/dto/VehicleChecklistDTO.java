package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.VehicleChecklist;
import com.z7design.secured_guard.model.VehicleChecklist.ShiftType;
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
public class VehicleChecklistDTO {

    private Long id;

    // Dados da Viatura
    private String plate;
    private String model;
    private Integer currentKm;
    private LocalDate checklistDate;
    private LocalTime checklistTime;
    private ShiftType shift;
    private String supervisorName;
    private String employeeName;
    private String employeeRegistration;

    // 1. Inspeção Externa e Lataria
    private Boolean dianteira;
    private Boolean laterais;
    private Boolean vidrosRetrovisores;
    private Boolean identificacaoVisual;

    // 2. Iluminação e Sinalização Sonora
    private Boolean faroisLanternas;
    private Boolean giroflexSirene;
    private Boolean buzina;

    // 3. Mecânica Básica e Fluídos
    private Boolean pneus;
    private Boolean niveis;
    private Boolean painel;

    // 4. Kit de Bordo e Equipamentos Operacionais
    private Boolean documentacao;
    private Boolean ferramentasEmergencia;
    private Boolean extintorIncendio;
    private Boolean kitPrancheta;

    // Status e Observações
    private String conformityStatus;
    private String observations;

    // Assinatura Digital Touch
    private String signatureBase64;

    private Long employeeId;
    private Long vehicleId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VehicleChecklistDTO fromEntity(VehicleChecklist entity) {
        if (entity == null) return null;

        return VehicleChecklistDTO.builder()
                .id(entity.getId())
                .plate(entity.getPlate())
                .model(entity.getModel())
                .currentKm(entity.getCurrentKm())
                .checklistDate(entity.getChecklistDate())
                .checklistTime(entity.getChecklistTime())
                .shift(entity.getShift())
                .supervisorName(entity.getSupervisorName())
                .employeeName(entity.getEmployeeName())
                .employeeRegistration(entity.getEmployeeRegistration())
                .dianteira(entity.getDianteira())
                .laterais(entity.getLaterais())
                .vidrosRetrovisores(entity.getVidrosRetrovisores())
                .identificacaoVisual(entity.getIdentificacaoVisual())
                .faroisLanternas(entity.getFaroisLanternas())
                .giroflexSirene(entity.getGiroflexSirene())
                .buzina(entity.getBuzina())
                .pneus(entity.getPneus())
                .niveis(entity.getNiveis())
                .painel(entity.getPainel())
                .documentacao(entity.getDocumentacao())
                .ferramentasEmergencia(entity.getFerramentasEmergencia())
                .extintorIncendio(entity.getExtintorIncendio())
                .kitPrancheta(entity.getKitPrancheta())
                .conformityStatus(entity.getConformityStatus())
                .observations(entity.getObservations())
                .signatureBase64(entity.getSignatureBase64())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
