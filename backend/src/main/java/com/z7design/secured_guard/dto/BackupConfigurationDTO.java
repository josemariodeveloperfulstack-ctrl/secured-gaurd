package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupConfigurationDTO {
    
    @NotBlank(message = "Nome é obrigatório")
    private String name;
    
    @NotBlank(message = "Tipo é obrigatório (LOCAL ou REMOTE)")
    @Pattern(regexp = "LOCAL|REMOTE", message = "Tipo deve ser LOCAL ou REMOTE")
    private String type;
    
    @NotBlank(message = "Host é obrigatório")
    private String host;
    
    @NotNull(message = "Porta é obrigatória")
    @Min(value = 1, message = "Porta deve ser maior que 0")
    @Max(value = 65535, message = "Porta deve ser menor que 65536")
    private Integer port;
    
    @NotBlank(message = "Nome do banco é obrigatório")
    private String database;
    
    @NotBlank(message = "Usuário é obrigatório")
    private String username;
    
    @NotBlank(message = "Senha é obrigatória")
    private String password;
    
    private Boolean enabled;
    private Boolean autoBackup;
    private String schedule;
    private Integer retentionDays;
    private String backupPath;
    private Boolean compressBackup;
}

