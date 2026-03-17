package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Filtros para o relatório PDF de postos de trabalho.
 * Todos os campos são opcionais; quando omitidos, não aplica o filtro.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkPostReportFilterDTO {

    private String searchTerm;
    private String status;   // ATIVO, EM_IMPLANTACAO, INATIVO, etc.
    private String type;     // POSTO_24H, POSTO_SDF, etc.
    private String clientId;
    private String city;
    private String state;
}
