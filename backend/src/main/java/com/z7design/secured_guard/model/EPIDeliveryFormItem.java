package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade que representa um item de EPI dentro de uma Ficha de Entrega
 */
@Entity
@Table(name = "epi_delivery_form_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EPIDeliveryFormItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull(message = "Ficha de entrega é obrigatória")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_form_id", nullable = false)
    @JsonBackReference
    private EPIDeliveryForm deliveryForm;

    @NotNull(message = "Nome do EPI é obrigatório")
    @Column(name = "epi_name", nullable = false, length = 255)
    private String epiName;

    @Column(name = "quantity", nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "ca", length = 100)
    private String ca; // Número do Certificado de Aprovação

    @Column(name = "ca_name", length = 255)
    private String caName; // Nome/Descrição do CA

    @Column(name = "validity_date")
    private LocalDate validityDate;

    @Column(name = "uniform_type", length = 50)
    private String uniformType; // COMPLETO ou INDIVIDUAL

    @Column(name = "uniform_piece", length = 50)
    private String uniformPiece; // CALCA, CAMISA, etc.

    @Column(columnDefinition = "TEXT")
    private String observations;

    @Column(name = "stock_item_id")
    private UUID stockItemId;

    /** Data em que o EPI foi substituído (coluna SUBSTITUÍDO no PDF). */
    @Column(name = "substituted_date")
    private LocalDate substitutedDate;

    /** Motivo da substituição (coluna MOTIVO DA SUBST. no PDF). */
    @Column(name = "replacement_reason", length = 255)
    private String replacementReason;
}





