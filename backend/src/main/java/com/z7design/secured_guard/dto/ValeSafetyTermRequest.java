package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Request compartilhado para documentos Vale (Regras de Ouro / Autorização toxicológica).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValeSafetyTermRequest {
    private UUID companyId;
    private UUID employeeId;

    private String employeeName;
    private String employeeRg;
    private String employeeCpf;
    private String registrationNumber;
    private String companyName;
    private String city;
    private LocalDate documentDate;

    /** Local do termo (Regras de Ouro). */
    private String location;
}
