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
public class BodyCamResponsibilityRequest {

    private UUID companyId;

    /** ID do funcionário. Quando informado, persiste o PDF e usa a data de admissão. */
    private UUID employeeId;

    private String employeeName;

    /** Local de prestação de serviços (ex.: Via Shopping Barreiro). */
    private String workLocation;

    private String city;
    private LocalDate documentDate;
}
