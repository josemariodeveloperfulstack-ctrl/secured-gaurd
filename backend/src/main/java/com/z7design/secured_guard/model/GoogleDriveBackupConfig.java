package com.z7design.secured_guard.model;

import lombok.Data;

/**
 * Configuração simples para envio de backups para o Google Drive.
 *
 * Esta classe é usada apenas como DTO na API por enquanto.
 * A integração real com o Google Drive poderá ser implementada em um serviço dedicado.
 */
@Data
public class GoogleDriveBackupConfig {

    /**
     * Se o envio automático para o Google Drive está habilitado.
     */
    private Boolean enabled = Boolean.FALSE;

    /**
     * ID da pasta de destino no Google Drive.
     * Exemplo: 1QJrZ9Xk0wtJhOVZN_HEo61lKa9cfvwiS
     */
    private String folderId;

    /**
     * Descrição ou observações adicionais sobre esta configuração.
     */
    private String description;
}


