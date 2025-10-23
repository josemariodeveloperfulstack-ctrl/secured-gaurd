package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ClientStatus;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClientReportFilterDTO {
    private String name;
    private String cnpj;
    private LocalDate startDate;
    private LocalDate endDate;
    private ClientStatus status;
}
