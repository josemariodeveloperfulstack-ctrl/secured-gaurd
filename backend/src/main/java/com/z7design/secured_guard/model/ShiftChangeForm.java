package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.ShiftChangeStatus;
import com.z7design.secured_guard.model.enums.ShiftTime;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shift_change_forms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftChangeForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate dateOfRequest;

    // Dados do Solicitante
    @Column(nullable = false)
    private String requesterFullName;

    /** ID do funcionário solicitante (para integração com histórico). Anulável p/ compat. */
    @Column(name = "requester_employee_id", nullable = true)
    private UUID requesterEmployeeId;

    @Column(nullable = false)
    private String requesterSector;

    @Column(nullable = true) // Pode ser nulo se não houver folga
    private LocalDate requesterDayOffDate;

    @Column(nullable = false)
    private LocalDate requesterShiftDate;

    // Dados do Colega que Assumirá o Plantão
    @Column(nullable = false)
    private String replacingFullName;

    /** ID do funcionário que assumirá o plantão (para integração com histórico). Anulável p/ compat. */
    @Column(name = "replacing_employee_id", nullable = true)
    private UUID replacingEmployeeId;

    @Column(nullable = false)
    private String replacingSector;

    @Column(nullable = false)
    private LocalDate replacingShiftDate;

    @Column(nullable = true) // Pode ser nulo se não houver folga
    private LocalDate replacingDayOffDate;

    // Horário do Plantão
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShiftTime shiftTime;

    // Status da Solicitação (Pendente, Aprovada, Rejeitada)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShiftChangeStatus status;

    // Aprovado por (nome do aprovador)
    @Column(nullable = true)
    private String approvedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ShiftChangeStatus.PENDING; // Define o status inicial como PENDENTE
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
