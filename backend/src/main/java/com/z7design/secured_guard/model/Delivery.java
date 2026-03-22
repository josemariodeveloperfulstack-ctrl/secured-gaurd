package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.z7design.secured_guard.model.enums.DeliveryStatus;
import com.z7design.secured_guard.model.enums.DeliverySignatureOrigin;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "deliveries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "almoxarife_id", nullable = false)
    private User almoxarife;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryStatus status;

    @Column(name = "token_signature", unique = true)
    private UUID tokenSignature;

    @Column(name = "token_expiration")
    private LocalDateTime tokenExpiration;

    @Column(name = "signature_base64", columnDefinition = "TEXT")
    private String signatureBase64;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_origin")
    private DeliverySignatureOrigin signatureOrigin;

    @Column(name = "audit_ip")
    private String auditIp;

    @Column(name = "audit_user_agent", length = 500)
    private String auditUserAgent;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DeliveryItem> items = new ArrayList<>();
}
