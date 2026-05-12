package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Configuração SMTP global usada como alternativa ao SendGrid quando a
 * campanha tem {@code providerType = SMTP}. Tratada como singleton lógico —
 * mantém o registro mais recente com {@code is_active = true}.
 *
 * <p>A senha é armazenada em {@code password_enc} cifrada via
 * {@link com.z7design.secured_guard.service.EncryptionService}.</p>
 */
@Entity
@Table(name = "smtp_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmtpSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String host;

    @Column(nullable = false)
    @Builder.Default
    private Integer port = 587;

    @Column(length = 255)
    private String username;

    /** Senha cifrada via {@code EncryptionService.encryptPassword}. */
    @Column(name = "password_enc", columnDefinition = "TEXT")
    private String passwordEnc;

    @Column(name = "use_tls", nullable = false)
    @Builder.Default
    private Boolean useTls = Boolean.TRUE;

    @Column(name = "from_email", nullable = false, length = 320)
    private String fromEmail;

    @Column(name = "from_name", length = 255)
    private String fromName;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = Boolean.TRUE;

    @Column(name = "last_test_at")
    private Instant lastTestAt;

    @Column(name = "last_test_ok")
    private Boolean lastTestOk;

    @Column(name = "last_test_error", columnDefinition = "TEXT")
    private String lastTestError;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
