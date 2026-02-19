package com.z7design.secured_guard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
@Schema(description = "DTO para localização patrimonial")
public class PatrimonialLocationDTO {

    private UUID id;

    @Size(max = 50)
    @Schema(description = "Código da localização")
    private String code;

    @Size(max = 255)
    @Schema(description = "Nome")
    private String name;

    @Size(max = 500)
    @Schema(description = "Endereço ou sala")
    private String addressOrRoom;

    @Schema(description = "Observações")
    private String notes;
}
