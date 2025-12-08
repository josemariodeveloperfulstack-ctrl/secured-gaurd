package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.VisitStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVisitDTO {
    
    @NotNull(message = "ID do supervisor é obrigatório")
    private UUID supervisorId;
    
    @NotNull(message = "ID do posto de trabalho é obrigatório")
    private UUID workPostId;
    
    @NotNull(message = "ID do cliente é obrigatório")
    private UUID clientId;
    
    @NotNull(message = "Data da visita é obrigatória")
    private LocalDate visitDate;
    
    @NotNull(message = "Horário da visita é obrigatório")
    private LocalTime visitTime;
    
    private String description;
    
    private String observations;
    
    @Builder.Default
    private VisitStatus status = VisitStatus.SCHEDULED;
    
    private List<UUID> presentEmployees;
    
    private List<String> attachedFiles;
    
    private List<String> photos;
    
    // Geolocalização
    private Double latitude;
    private Double longitude;
    private String locationAddress;
    
    // QR Code
    private String qrCodeScanned;
    private Boolean qrCodeVerified;
    
    // Cancelamento
    private String cancellationReason;
}
