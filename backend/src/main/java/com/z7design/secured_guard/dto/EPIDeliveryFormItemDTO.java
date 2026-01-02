package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EPIDeliveryFormItemDTO {
    private UUID id;
    private String epiName;
    private Integer quantity;
    private String ca;
    private LocalDate validityDate;
    private String uniformType;
    private String uniformPiece;
    private String observations;
}


