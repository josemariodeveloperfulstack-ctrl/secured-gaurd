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
public class DamageFinesResponsibilityRequest {

    private UUID companyId;

    /** ID do funcionário. Quando informado, persiste o PDF gerado e usa a data de admissão. */
    private UUID employeeId;

    private String employeeName;
    private String employeeCpf;

    private String city;
    private LocalDate documentDate;
}
