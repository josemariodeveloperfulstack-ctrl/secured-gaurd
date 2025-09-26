package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDTO {
    
    private UUID id;
    
    @NotBlank(message = "Company name is required")
    @Size(max = 100, message = "Company name must not exceed 100 characters")
    private String name;
    
    @NotBlank(message = "Company sigla is required")
    @Size(min = 2, max = 10, message = "Company sigla must be between 2 and 10 characters")
    private String sigla;
    
    private String description;
    
    @Size(max = 18, message = "CNPJ must not exceed 18 characters")
    private String cnpj;
    
    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;
    
    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;
    
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;
    
    @Size(max = 255, message = "Website must not exceed 255 characters")
    private String website;
    
    @NotNull(message = "Company status is required")
    private CompanyStatus status;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Métodos de conversão
    public static CompanyDTO fromEntity(Company company) {
        if (company == null) {
            return null;
        }
        
        return CompanyDTO.builder()
                .id(company.getId())
                .name(company.getName())
                .sigla(company.getSigla())
                .description(company.getDescription())
                .cnpj(company.getCnpj())
                .address(company.getAddress())
                .phone(company.getPhone())
                .email(company.getEmail())
                .website(company.getWebsite())
                .status(company.getStatus())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .build();
    }
    
    public Company toEntity() {
        Company company = new Company();
        company.setId(this.id);
        company.setName(this.name);
        company.setSigla(this.sigla);
        company.setDescription(this.description);
        company.setCnpj(this.cnpj);
        company.setAddress(this.address);
        company.setPhone(this.phone);
        company.setEmail(this.email);
        company.setWebsite(this.website);
        company.setStatus(this.status);
        return company;
    }
}