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
public class ImageVoiceNameAuthRequest {
    private UUID companyId;
    private UUID employeeId;
    private String employeeName;
    private String city;
    private LocalDate documentDate;
}
