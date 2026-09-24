package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entidade que representa uma Ficha de Entrega de EPI completa
 * Contém múltiplos itens de EPI entregues a um funcionário
 */
@Entity
@Table(name = "epi_delivery_forms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EPIDeliveryForm {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull(message = "Funcionário é obrigatório")
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "unit", "position", "user"})
    private Employee employee;

    @NotNull(message = "Empresa é obrigatória")
    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Company company;

    @NotNull(message = "Data de entrega é obrigatória")
    @Column(name = "delivery_date", nullable = false)
    private LocalDate deliveryDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "responsible_employee_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "unit", "position", "user"})
    private Employee responsibleEmployee;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", length = 30)
    @Builder.Default
    private EPIDeliveryType deliveryType = EPIDeliveryType.PRIMEIRA_ENTREGA;

    @Column(name = "employee_work_sector")
    private String employeeWorkSector;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @Column(name = "pdf_url")
    private String pdfUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "created_by_user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User createdBy;

    @Column(name = "signature_base64", columnDefinition = "TEXT")
    private String signatureBase64;

    @Column(name = "signature_type", length = 50)
    private String signatureType = "ON_SCREEN";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    @Builder.Default
    private com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus status = com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus.DRAFT;

    @Column(name = "stock_requisition_id")
    private UUID stockRequisitionId;

    /** Token do link público /epi-confirm/{token} */
    @Column(name = "confirmation_token")
    private UUID confirmationToken;

    /** Código de 6 dígitos enviado no WhatsApp */
    @Column(name = "confirmation_code", length = 6)
    private String confirmationCode;

    @Column(name = "confirmation_expires_at")
    private LocalDateTime confirmationExpiresAt;

    @Column(name = "confirmation_sent_at")
    private LocalDateTime confirmationSentAt;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(name = "signature_origin", length = 40)
    private String signatureOrigin;

    @Column(name = "audit_ip", length = 80)
    private String auditIp;

    @Column(name = "audit_user_agent", length = 500)
    private String auditUserAgent;

    @Column(name = "refused_at")
    private LocalDateTime refusedAt;

    @Column(name = "refusal_reason", columnDefinition = "TEXT")
    private String refusalReason;

    @OneToMany(mappedBy = "deliveryForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("lineOrder ASC, id ASC")
    @JsonManagedReference
    @Builder.Default
    private List<EPIDeliveryFormItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}









