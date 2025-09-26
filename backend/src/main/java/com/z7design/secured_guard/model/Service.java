package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "services")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Service {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @NotBlank(message = "Nome do serviço é obrigatório")
    @Size(max = 255, message = "Nome deve ter no máximo 255 caracteres")
    @Column(nullable = false, length = 255)
    private String name;
    
    @Size(max = 1000, message = "Descrição deve ter no máximo 1000 caracteres")
    @Column(length = 1000)
    private String description;
    
    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    @Column(length = 100)
    private String category;
    
    @Size(max = 50, message = "Código deve ter no máximo 50 caracteres")
    @Column(length = 50, unique = true)
    private String code;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;
    
    @Column(length = 20)
    private String unit; // Unidade de medida (hora, dia, mês, etc.)
    
    @NotNull(message = "Status é obrigatório")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ServiceStatus status = ServiceStatus.ACTIVE;
    
    @Column(name = "is_billable")
    @Builder.Default
    private Boolean isBillable = true;
    
    @Column(name = "requires_equipment")
    @Builder.Default
    private Boolean requiresEquipment = false;
    
    @Column(name = "requires_certification")
    @Builder.Default
    private Boolean requiresCertification = false;
    
    @Column(name = "estimated_duration_hours")
    private Integer estimatedDurationHours;
    
    @Column(name = "min_employees_required")
    @Builder.Default
    private Integer minEmployeesRequired = 1;
    
    @Column(name = "max_employees_allowed")
    private Integer maxEmployeesAllowed;
    
    @Size(max = 500, message = "Observações devem ter no máximo 500 caracteres")
    @Column(length = 500)
    private String notes;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "created_by")
    private UUID createdBy;
    
    @Column(name = "updated_by")
    private UUID updatedBy;
    
    public enum ServiceStatus {
        ACTIVE("Ativo"),
        INACTIVE("Inativo"),
        SUSPENDED("Suspenso"),
        DISCONTINUED("Descontinuado");
        
        private final String description;
        
        ServiceStatus(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    // Métodos auxiliares
    public boolean isActive() {
        return status == ServiceStatus.ACTIVE;
    }
    
    public boolean canBeBilled() {
        return isActive() && isBillable;
    }
    
    public String getDisplayName() {
        return code != null ? code + " - " + name : name;
    }
}
