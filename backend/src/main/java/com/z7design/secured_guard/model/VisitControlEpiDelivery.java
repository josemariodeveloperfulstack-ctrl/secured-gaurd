package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entrega de EPI registrada durante a visita do supervisor.
 *
 * Diferente do {@code EPIDeliveryForm} formal (ficha completa, assinada, com vários itens),
 * este é um registro RÁPIDO feito pelo supervisor em campo. Pode posteriormente ser
 * consolidado em uma ficha oficial pelo RH/SST.
 */
@Entity
@Table(name = "visit_control_epi_deliveries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitControlEpiDelivery {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_control_id", nullable = false)
    @JsonIgnore
    private VisitControl visitControl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "documents", "benefits", "dependents"})
    private Employee employee;

    @Column(name = "epi_item_description", nullable = false, length = 255)
    private String epiItemDescription;

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "employee_confirmed", nullable = false)
    private Boolean employeeConfirmed = false;

    @Column(name = "delivered_at", nullable = false)
    private LocalDateTime deliveredAt = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
