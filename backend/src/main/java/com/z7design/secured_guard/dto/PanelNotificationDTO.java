package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PanelNotificationDTO {
    private String id;
    private String tipo;
    private String titulo;
    private String descricao;
    private String prioridade;
    private String timestamp;
    private boolean lida;
    private String destinatario;
    private String funcionario;
    private Integer numeroAdvertencia;
    private String cliente;
    private String contrato;
    private Double valor;
    private String departamento;
}
