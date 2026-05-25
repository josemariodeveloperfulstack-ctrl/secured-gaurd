package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.DocumentoGerado;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Projeção enxuta para listagens — evita serializar entidades JPA com LAZY
 * quando {@code spring.jpa.open-in-view=false} (CI/produção).
 */
public record DocumentoGeradoListDTO(
        UUID id,
        UUID modeloId,
        TipoDocumentoGerado tipo,
        UUID funcionarioId,
        String conteudoFinal,
        String nomeArquivoGerado,
        Long tamanhoArquivoGerado,
        DocumentoGerado.StatusDocumento status,
        LocalDateTime dataCriacao,
        LocalDateTime dataAssinatura,
        LocalDateTime dataVencimento) {

    public static DocumentoGeradoListDTO from(DocumentoGerado documento) {
        return new DocumentoGeradoListDTO(
                documento.getId(),
                documento.getModelo() != null ? documento.getModelo().getId() : null,
                documento.getTipo(),
                documento.getFuncionario() != null ? documento.getFuncionario().getId() : null,
                documento.getConteudoFinal(),
                documento.getNomeArquivoGerado(),
                documento.getTamanhoArquivoGerado(),
                documento.getStatus(),
                documento.getDataCriacao(),
                documento.getDataAssinatura(),
                documento.getDataVencimento());
    }
}
