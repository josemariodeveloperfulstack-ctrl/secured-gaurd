package com.z7design.secured_guard.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class FeriasReportDTO {
    private UUID employeeId;
    private String status;
    private String tipo;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private String periodoAquisitivo;
    /** Sigla da empresa: VIG, ADM ou TERC */
    private String empresa;
    private Boolean incluirDetalhes;
    private Boolean incluirEstatisticas;
    private String formato; // EXCEL, PDF
    private List<String> selectedColumns;
    private String groupBy; // NONE, EMPRESA, SETOR, STATUS
    private String reportType; // FERIAS, AFASTAMENTOS, EXPERIENCIA, CONSOLIDADO

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID employeeId;
        private String status;
        private String tipo;
        private LocalDate dataInicio;
        private LocalDate dataFim;
        private String periodoAquisitivo;
        private String empresa;
        private Boolean incluirDetalhes;
        private Boolean incluirEstatisticas;
        private String formato;
        private List<String> selectedColumns;
        private String groupBy;
        private String reportType;

        public Builder employeeId(UUID employeeId) { this.employeeId = employeeId; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder tipo(String tipo) { this.tipo = tipo; return this; }
        public Builder dataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; return this; }
        public Builder dataFim(LocalDate dataFim) { this.dataFim = dataFim; return this; }
        public Builder periodoAquisitivo(String periodoAquisitivo) { this.periodoAquisitivo = periodoAquisitivo; return this; }
        public Builder empresa(String empresa) { this.empresa = empresa; return this; }
        public Builder incluirDetalhes(Boolean incluirDetalhes) { this.incluirDetalhes = incluirDetalhes; return this; }
        public Builder incluirEstatisticas(Boolean incluirEstatisticas) { this.incluirEstatisticas = incluirEstatisticas; return this; }
        public Builder formato(String formato) { this.formato = formato; return this; }
        public Builder selectedColumns(List<String> selectedColumns) { this.selectedColumns = selectedColumns; return this; }
        public Builder groupBy(String groupBy) { this.groupBy = groupBy; return this; }
        public Builder reportType(String reportType) { this.reportType = reportType; return this; }

        public FeriasReportDTO build() {
            return new FeriasReportDTO(employeeId, status, tipo, dataInicio, dataFim, periodoAquisitivo,
                    empresa, incluirDetalhes, incluirEstatisticas, formato, selectedColumns, groupBy, reportType);
        }
    }

    public FeriasReportDTO() {
    }

    public FeriasReportDTO(UUID employeeId, String status, String tipo, LocalDate dataInicio, LocalDate dataFim,
                           String periodoAquisitivo, String empresa, Boolean incluirDetalhes, Boolean incluirEstatisticas,
                           String formato, List<String> selectedColumns, String groupBy, String reportType) {
        this.employeeId = employeeId;
        this.status = status;
        this.tipo = tipo;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.periodoAquisitivo = periodoAquisitivo;
        this.empresa = empresa;
        this.incluirDetalhes = incluirDetalhes;
        this.incluirEstatisticas = incluirEstatisticas;
        this.formato = formato;
        this.selectedColumns = selectedColumns;
        this.groupBy = groupBy;
        this.reportType = reportType;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public void setDataInicio(LocalDate dataInicio) {
        this.dataInicio = dataInicio;
    }

    public LocalDate getDataFim() {
        return dataFim;
    }

    public void setDataFim(LocalDate dataFim) {
        this.dataFim = dataFim;
    }

    public String getPeriodoAquisitivo() {
        return periodoAquisitivo;
    }

    public void setPeriodoAquisitivo(String periodoAquisitivo) {
        this.periodoAquisitivo = periodoAquisitivo;
    }

    public String getEmpresa() {
        return empresa;
    }

    public void setEmpresa(String empresa) {
        this.empresa = empresa;
    }

    public Boolean getIncluirDetalhes() {
        return incluirDetalhes;
    }

    public void setIncluirDetalhes(Boolean incluirDetalhes) {
        this.incluirDetalhes = incluirDetalhes;
    }

    public Boolean getIncluirEstatisticas() {
        return incluirEstatisticas;
    }

    public void setIncluirEstatisticas(Boolean incluirEstatisticas) {
        this.incluirEstatisticas = incluirEstatisticas;
    }

    public String getFormato() {
        return formato;
    }

    public void setFormato(String formato) {
        this.formato = formato;
    }

    public String getFormat() {
        return formato;
    }

    public void setFormat(String format) {
        this.formato = format;
    }

    public List<String> getSelectedColumns() {
        return selectedColumns;
    }

    public void setSelectedColumns(List<String> selectedColumns) {
        this.selectedColumns = selectedColumns;
    }

    public String getGroupBy() {
        return groupBy;
    }

    public void setGroupBy(String groupBy) {
        this.groupBy = groupBy;
    }

    public String getReportType() {
        return reportType;
    }

    public void setReportType(String reportType) {
        this.reportType = reportType;
    }
}
