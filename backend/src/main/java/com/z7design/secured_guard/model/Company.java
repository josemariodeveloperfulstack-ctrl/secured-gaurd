package com.z7design.secured_guard.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Data
@Entity
@Table(name = "companies")
@NoArgsConstructor
@AllArgsConstructor
public class Company {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @NotBlank(message = "Company name is required")
    @Size(max = 100, message = "Company name must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String name;
    
    @NotBlank(message = "Company sigla is required")
    @Size(min = 2, max = 10, message = "Company sigla must be between 2 and 10 characters")
    @Column(nullable = false, unique = true, length = 10)
    private String sigla;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Size(max = 18, message = "CNPJ must not exceed 18 characters")
    @Column(length = 18, unique = true)
    private String cnpj;
    
    @Size(max = 255, message = "Address must not exceed 255 characters")
    @Column(length = 255)
    private String address;
    
    @Size(max = 20, message = "Phone must not exceed 20 characters")
    @Column(length = 20)
    private String phone;
    
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    @Column(length = 100)
    private String email;
    
    @Size(max = 255, message = "Website must not exceed 255 characters")
    @Column(length = 255)
    private String website;
    
    @NotNull(message = "Company status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CompanyStatus status;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    // Relacionamentos
    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference("company-employees")
    private List<Employee> employees;
    
    public enum CompanyStatus {
        ACTIVE("Ativo"),
        INACTIVE("Inativo"),
        SUSPENDED("Suspenso");
        
        private final String description;
        
        CompanyStatus(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}