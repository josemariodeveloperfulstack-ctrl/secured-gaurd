package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecuritySettingsDTO {
    
    private String id;
    
    private String companyId;
    
    // Configurações de 2FA
    @NotNull(message = "2FA habilitado é obrigatório")
    private Boolean twoFactorEnabled;
    
    private String twoFactorMethod; // EMAIL, SMS, APP
    
    // Políticas de senha
    @NotNull(message = "Expiração de senha é obrigatória")
    private Boolean passwordExpiryEnabled;
    
    @Min(value = 1, message = "Dias de expiração deve ser maior que 0")
    private Integer passwordExpiryDays;
    
    @Min(value = 6, message = "Tamanho mínimo da senha deve ser pelo menos 6")
    private Integer passwordMinLength;
    
    @NotNull(message = "Requisito de maiúscula é obrigatório")
    private Boolean passwordRequireUppercase;
    
    @NotNull(message = "Requisito de minúscula é obrigatório")
    private Boolean passwordRequireLowercase;
    
    @NotNull(message = "Requisito de números é obrigatório")
    private Boolean passwordRequireNumbers;
    
    @NotNull(message = "Requisito de símbolos é obrigatório")
    private Boolean passwordRequireSymbols;
    
    // Bloqueio de conta
    @NotNull(message = "Bloqueio de conta é obrigatório")
    private Boolean accountLockoutEnabled;
    
    @Min(value = 1, message = "Tentativas máximas deve ser maior que 0")
    private Integer maxFailedAttempts;
    
    @Min(value = 1, message = "Duração do bloqueio deve ser maior que 0")
    private Integer lockoutDurationMinutes;
    
    // Configurações gerais
    @Min(value = 5, message = "Timeout da sessão deve ser pelo menos 5 minutos")
    private Integer sessionTimeoutMinutes;
    
    @NotNull(message = "Whitelist de IP é obrigatória")
    private Boolean ipWhitelistEnabled;
    
    private List<String> ipWhitelist;
    
    @NotNull(message = "Log de auditoria é obrigatório")
    private Boolean auditLogEnabled;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
