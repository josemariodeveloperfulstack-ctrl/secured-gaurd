package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "operational_occurrences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalOccurrence {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private OccurrenceType type;
    
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;
    
    @Column(name = "location", length = 200)
    private String location;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OccurrenceStatus status;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private OccurrencePriority priority;
    
    @Column(name = "date", nullable = false)
    private LocalDateTime date;
    
    @Column(name = "responsible", length = 200)
    private String responsible;
    
    @Column(name = "warning_number")
    private Integer warningNumber;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "substitute_id")
    private Employee substitute;
    
    @Column(name = "original_start_time")
    private String originalStartTime;
    
    @Column(name = "original_end_time")
    private String originalEndTime;
    
    @Column(name = "substitute_start_time")
    private String substituteStartTime;
    
    @Column(name = "substitute_end_time")
    private String substituteEndTime;
    
    @Column(name = "total_hours")
    private Double totalHours;
    
    @Column(name = "category")
    private String category; // e.g., "OPERATIONAL_MAP", "INCIDENT"

    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum OccurrenceType {
        SEGURANCA, DISCIPLINAR, EQUIPAMENTO, INCIDENTE, MANUTENCAO,
        FALTA, TROCA, HE, FREE_LANCE, PEDIDO_DEMISSAO, FALTA_EFETIVO, SOLICITACAO_CLIENTE, OUTROS
    }

    
    public enum OccurrenceStatus {
        PENDENTE, EM_ANDAMENTO, RESOLVIDO, CONCLUIDO
    }
    
    public enum OccurrencePriority {
        BAIXA, MEDIA, ALTA
    }
}
