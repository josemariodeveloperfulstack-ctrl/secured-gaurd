package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.z7design.secured_guard.model.enums.RemanejamentoMotivo;
import com.z7design.secured_guard.model.enums.RemanejamentoStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "remanejamentos")
public class Remanejamento {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "employee_id", nullable = false)
    @Fetch(FetchMode.SELECT)
    @JsonIgnoreProperties({ "timeRecords", "payrolls", "documents", "benefits", "schedules", "occurrences", "epis",
            "dependents" })
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RemanejamentoTipo tipo;

    @Column(name = "origem")
    private String origem;

    @Column(name = "destino")
    private String destino;

    @Column(name = "data_remanejamento", nullable = false)
    private LocalDate dataRemanejamento;

    @Column(length = 500)
    private String observacao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "origin_workstation_id")
    @Fetch(FetchMode.SELECT)
    private WorkPost originWorkstation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_workstation_id")
    @Fetch(FetchMode.SELECT)
    private WorkPost destinationWorkstation;

    /* ===================================================================== */
    /* Fluxo de aprovação (Onda 3) — nulos para registros legados             */
    /* ===================================================================== */

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16)
    private RemanejamentoStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "motivo", length = 32)
    private RemanejamentoMotivo motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_user_id")
    @Fetch(FetchMode.SELECT)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private User requestedBy;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_user_id")
    @Fetch(FetchMode.SELECT)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private User approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coverage_employee_id")
    @Fetch(FetchMode.SELECT)
    @JsonIgnoreProperties({ "timeRecords", "payrolls", "documents", "benefits",
            "schedules", "occurrences", "epis", "dependents" })
    private Employee coverageEmployee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_control_id")
    @Fetch(FetchMode.SELECT)
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private VisitControl visitControl;

    // Getters e setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Employee getEmployee() {
        return employee;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public RemanejamentoTipo getTipo() {
        return tipo;
    }

    public void setTipo(RemanejamentoTipo tipo) {
        this.tipo = tipo;
    }

    public String getOrigem() {
        return origem;
    }

    public void setOrigem(String origem) {
        this.origem = origem;
    }

    public String getDestino() {
        return destino;
    }

    public void setDestino(String destino) {
        this.destino = destino;
    }

    public LocalDate getDataRemanejamento() {
        return dataRemanejamento;
    }

    public void setDataRemanejamento(LocalDate dataRemanejamento) {
        this.dataRemanejamento = dataRemanejamento;
    }

    public String getObservacao() {
        return observacao;
    }

    public void setObservacao(String observacao) {
        this.observacao = observacao;
    }

    public WorkPost getOriginWorkstation() {
        return originWorkstation;
    }

    public void setOriginWorkstation(WorkPost originWorkstation) {
        this.originWorkstation = originWorkstation;
    }

    public WorkPost getDestinationWorkstation() {
        return destinationWorkstation;
    }

    public void setDestinationWorkstation(WorkPost destinationWorkstation) {
        this.destinationWorkstation = destinationWorkstation;
    }

    /* ===================================================================== */
    /* Getters/Setters do fluxo de aprovação (Onda 3)                          */
    /* ===================================================================== */

    public RemanejamentoStatus getStatus() {
        return status;
    }

    public void setStatus(RemanejamentoStatus status) {
        this.status = status;
    }

    public RemanejamentoMotivo getMotivo() {
        return motivo;
    }

    public void setMotivo(RemanejamentoMotivo motivo) {
        this.motivo = motivo;
    }

    public User getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(User requestedBy) {
        this.requestedBy = requestedBy;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public void setRequestedAt(LocalDateTime requestedAt) {
        this.requestedAt = requestedAt;
    }

    public User getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(User approvedBy) {
        this.approvedBy = approvedBy;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }

    public LocalDateTime getRejectedAt() {
        return rejectedAt;
    }

    public void setRejectedAt(LocalDateTime rejectedAt) {
        this.rejectedAt = rejectedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Employee getCoverageEmployee() {
        return coverageEmployee;
    }

    public void setCoverageEmployee(Employee coverageEmployee) {
        this.coverageEmployee = coverageEmployee;
    }

    public VisitControl getVisitControl() {
        return visitControl;
    }

    public void setVisitControl(VisitControl visitControl) {
        this.visitControl = visitControl;
    }
}