package com.z7design.secured_guard.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleEmployeeDTO {
    private UUID id;
    private String name;
    private String document;
    private String cpf;
    private String email;
    private String phone;
    private String address;
    private String cnhNumber;
    private String registrationNumber;
    private java.time.LocalDate hireDate;
    private String positionName;
    private String unitName;
    private UUID companyId;
    private String companySigla;
}