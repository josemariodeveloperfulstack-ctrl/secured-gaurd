package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import java.time.LocalDate;
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
}