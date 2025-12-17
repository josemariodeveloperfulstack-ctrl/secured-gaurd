package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "calculation_memories")
@Data
@EqualsAndHashCode(callSuper = false)
public class CalculationMemory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "details", nullable = false, columnDefinition = "TEXT")
    private String details;

    @Column(name = "evidence_path", columnDefinition = "TEXT")
    private String evidencePath;

    @Column(name = "month_reference")
    private String monthReference;

    @Column(name = "calculation_items", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> calculationItems; // Lista de strings armazenada como JSONB

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bulletin_id", nullable = false)
    private MeasurementBulletin bulletin;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Método para obter mês de referência formatado
    public String getFormattedMonthReference() {
        if (monthReference != null && !monthReference.trim().isEmpty()) {
            return monthReference;
        }
        return "Não definido";
    }

    // Método para obter detalhes resumidos
    public String getShortDetails() {
        if (details != null && details.length() > 100) {
            return details.substring(0, 100) + "...";
        }
        return details;
    }

    // Método para verificar se tem evidências
    public boolean hasEvidence() {
        return evidencePath != null && !evidencePath.trim().isEmpty();
    }

    // Método para obter nome do arquivo de evidência
    public String getEvidenceFileName() {
        if (evidencePath != null && !evidencePath.trim().isEmpty()) {
            String[] parts = evidencePath.split("/");
            return parts[parts.length - 1];
        }
        return "";
    }

    // Método para obter itens de cálculo como array (mantido para compatibilidade)
    public String[] getCalculationItemsList() {
        if (calculationItems != null && !calculationItems.isEmpty()) {
            return calculationItems.toArray(new String[0]);
        }
        return new String[0];
    }

    // Método para definir itens de cálculo a partir de array (mantido para compatibilidade)
    public void setCalculationItemsList(String[] items) {
        if (items != null && items.length > 0) {
            this.calculationItems = List.of(items);
        } else {
            this.calculationItems = List.of();
        }
    }
}