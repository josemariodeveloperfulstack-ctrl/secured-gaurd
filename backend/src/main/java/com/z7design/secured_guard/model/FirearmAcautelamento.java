package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "firearm_acautelamentos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirearmAcautelamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Empresa Emissora
    @Column(name = "company_name", length = 150)
    private String companyName;

    // 1. Dados do Vigilante
    @Column(name = "vigilante_name", length = 150, nullable = false)
    private String vigilanteName;

    @Column(name = "registration", length = 50)
    private String registration; // Matrícula

    @Column(name = "cnv_number", length = 50)
    private String cnvNumber; // Carteira Nacional de Vigilante

    @Column(name = "cpf", length = 20)
    private String cpf;

    @Column(name = "work_post_name", length = 150)
    private String workPostName; // Posto de Trabalho (Cliente)

    @Column(name = "recycling_expiration_date")
    private LocalDate recyclingExpirationDate; // Data de Vencimento da Última Reciclagem

    // 2. Especificação do Armamento, Munição e Acessórios
    @Column(name = "weapon_type", length = 50)
    private String weaponType; // Revólver, Pistola, Espingarda, Outra

    @Column(name = "brand", length = 80)
    private String brand; // Marca

    @Column(name = "caliber", length = 30)
    private String caliber; // Calibre

    @Column(name = "shot_capacity")
    private Integer shotCapacity; // Capacidade de Tiros

    @Column(name = "serial_number", length = 80, nullable = false)
    private String serialNumber; // Número de Série

    @Column(name = "craf_number", length = 80)
    private String crafNumber; // Número do CRAF (PF)

    @Column(name = "ammo_quantity")
    private Integer ammoQuantity; // Quantidade de Munições

    @Column(name = "ammo_type", length = 50)
    private String ammoType; // Intactas / Novas ou De manejo/treino

    @Column(name = "ammo_lot", length = 80)
    private String ammoLot; // Lote da Munição

    @Column(name = "accessories", length = 250)
    private String accessories; // Coldre tático, Porta-carregador, etc.

    // 3. Declaração de Inspeção Visual e Funcional
    @Column(name = "mecanismo_disparo_ok")
    private Boolean mecanismoDisparoOk; // Mecanismo de disparo e travas operando perfeitamente: Sim / Não

    @Column(name = "cano_desobstruido_ok")
    private Boolean canoDesobstruidoOk; // Cano desobstruído e limpo: Sim / Não

    @Column(name = "conservation_state", length = 30)
    private String conservationState; // Excelente, Bom, Regular

    // Status e Observações
    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "ATIVO"; // ATIVO, DEVOLVIDO, CANCELADO

    @Column(name = "city_uf", length = 100)
    private String cityUf; // Cidade - UF

    @Column(name = "term_date")
    private LocalDate termDate; // Data do Termo

    // Foto Opcional
    @Column(name = "photo_base64", columnDefinition = "TEXT")
    private String photoBase64;

    // Assinaturas Digitais
    @Column(name = "vigilante_signature_base64", columnDefinition = "TEXT")
    private String vigilanteSignatureBase64;

    @Column(name = "armeiro_name", length = 150)
    private String armeiroName;

    @Column(name = "armeiro_signature_base64", columnDefinition = "TEXT")
    private String armeiroSignatureBase64;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
