package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "acordos_recolhimento")
public class AcordoRecolhimento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "numero_acordo", nullable = false, unique = true)
    private String numeroAcordo;

    @Column(name = "fornecedor_id", nullable = false)
    private UUID fornecedorId;

    @Column(name = "fornecedor_nome")
    private String fornecedorNome;

    @Column(name = "fornecedor_cnpj")
    private String fornecedorCnpj;

    @Column(name = "data_acordo", nullable = false)
    private LocalDate dataAcordo;

    @Column(name = "motivo", nullable = false)
    private String motivo;

    @Column(name = "status", nullable = false)
    private String status = "PENDENTE";

    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String observacoes;

    @Column(name = "created_by_id")
    private UUID createdById;

    @Column(name = "approved_by_id")
    private UUID approvedById;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @OneToMany(mappedBy = "acordo", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AcordoRecolhimentoItem> itens = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void addItem(AcordoRecolhimentoItem item) {
        itens.add(item);
        item.setAcordo(this);
    }

    public void removeItem(AcordoRecolhimentoItem item) {
        itens.remove(item);
        item.setAcordo(null);
    }
}
