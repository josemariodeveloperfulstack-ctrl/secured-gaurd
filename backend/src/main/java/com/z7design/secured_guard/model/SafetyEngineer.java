package com.z7design.secured_guard.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "safety_engineers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SafetyEngineer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 200, message = "Nome deve ter até 200 caracteres")
    @Column(nullable = false, length = 200)
    private String name;

    @NotBlank(message = "CREA é obrigatório")
    @Size(max = 50, message = "CREA deve ter até 50 caracteres")
    @Column(nullable = false, length = 50)
    private String creaNumber;

    @Size(max = 500, message = "URL do carimbo deve ter até 500 caracteres")
    @Column(name = "stamp_image_url", length = 500)
    private String stampImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
