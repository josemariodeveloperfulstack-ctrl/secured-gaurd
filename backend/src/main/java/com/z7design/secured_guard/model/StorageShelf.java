package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que representa uma prateleira física no estoque.
 */
@Entity
@Table(name = "storage_shelves")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageShelf {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "identification", unique = true, nullable = false)
    private String identification; // Ex: PR-001

    @Column(name = "block")
    private String block; // Bloco

    @Column(name = "section")
    private String section; // Seção

    @Column(name = "aisle")
    private String aisle; // Corredor

    @Column(name = "room")
    private String room; // Sala

    @Column(name = "compartment_info")
    private String compartmentInfo; // Cômado ou informações adicionais

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Retorna a localização completa formatada para exibição.
     */
    public String getFullLocationDisplay() {
        StringBuilder sb = new StringBuilder(identification);
        if (block != null && !block.isEmpty()) sb.append(" | Bloco: ").append(block);
        if (section != null && !section.isEmpty()) sb.append(" | Seção: ").append(section);
        if (aisle != null && !aisle.isEmpty()) sb.append(" | Corredor: ").append(aisle);
        return sb.toString();
    }
}
