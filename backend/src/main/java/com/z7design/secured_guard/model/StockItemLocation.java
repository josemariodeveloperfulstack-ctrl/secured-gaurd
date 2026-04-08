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
 * Entidade que vincula um item de estoque a uma prateleira e andar específico.
 */
@Entity
@Table(name = "stock_item_locations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockItemLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_item_id", nullable = false)
    private StockItem stockItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shelf_id", nullable = false)
    private StorageShelf shelf;

    @Column(name = "floor")
    private String floor; // Andar/Compartimento da Prateleira

    @Column(name = "quantity", nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Atualiza a quantidade nesta localização.
     */
    public void updateQuantity(Integer change) {
        this.quantity = (this.quantity != null ? this.quantity : 0) + change;
        if (this.quantity < 0) {
            this.quantity = 0;
        }
    }
}
