package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DependentDTO {
    private UUID id;
    
    private UUID employeeId;
    private String employeeName; // Nome do funcionário para exibição
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;
    
    private String gender; // M, F, OUTRO
    
    private String phone;
    private String email;
    
    private String address;
    private String city;
    private String state;
    private String zipCode;
    
    private Boolean isStudent;
    private String schoolName;
    
    private Boolean isBeneficiary;
    
    private String notes;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
    
    // Campos obrigatórios
    private String name;
    private String relationship;
    private String cpf;
    private String rg;
    
    // Para criação/atualização
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        private UUID employeeId;
        private String name;
        private String relationship;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate birthDate;
        private String cpf;
        private String rg;
        private String gender;
        private String phone;
        private String email;
        private String address;
        private String city;
        private String state;
        private String zipCode;
        private Boolean isStudent;
        private String schoolName;
        private Boolean isBeneficiary;
        private String notes;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateRequest {
        private String name;
        private String relationship;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate birthDate;
        private String cpf;
        private String rg;
        private String gender;
        private String phone;
        private String email;
        private String address;
        private String city;
        private String state;
        private String zipCode;
        private Boolean isStudent;
        private String schoolName;
        private Boolean isBeneficiary;
        private String notes;
    }
}
