package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsDTO {
    
    private String id;
    private String companyId;
    private String userId;
    
    // Configurações de Email
    @NotNull(message = "Email habilitado é obrigatório")
    private Boolean emailEnabled;
    
    @NotNull(message = "Notificação de contratos é obrigatória")
    private Boolean emailContractUpdates;
    
    @NotNull(message = "Notificação de pagamentos é obrigatória")
    private Boolean emailPaymentReceived;
    
    @NotNull(message = "Notificação de escalas é obrigatória")
    private Boolean emailScheduleChanges;
    
    @NotNull(message = "Resumo diário é obrigatório")
    private Boolean emailDailySummary;
    
    @NotNull(message = "Relatório semanal é obrigatório")
    private Boolean emailWeeklyReport;
    
    @NotNull(message = "Alertas do sistema são obrigatórios")
    private Boolean emailSystemAlerts;
    
    // Configurações de SMTP
    @NotNull(message = "SMTP habilitado é obrigatório")
    private Boolean smtpEnabled;
    
    private String smtpHost;
    
    @Min(value = 1, message = "Porta SMTP deve ser maior que 0")
    @Max(value = 65535, message = "Porta SMTP deve ser menor que 65536")
    private Integer smtpPort;
    
    private String smtpUsername;
    
    private String smtpPassword;
    
    @Email(message = "Email de origem inválido")
    private String smtpFromEmail;
    
    private String smtpFromName;
    
    @NotNull(message = "TLS é obrigatório")
    private Boolean smtpUseTls;
    
    @NotNull(message = "SSL é obrigatório")
    private Boolean smtpUseSsl;
    
    // Configurações de Notificações Push
    @NotNull(message = "Push habilitado é obrigatório")
    private Boolean pushEnabled;
    
    @NotNull(message = "Push de contratos é obrigatório")
    private Boolean pushContractUpdates;
    
    @NotNull(message = "Push de pagamentos é obrigatório")
    private Boolean pushPaymentReceived;
    
    @NotNull(message = "Push de escalas é obrigatório")
    private Boolean pushScheduleChanges;
    
    @NotNull(message = "Push de alertas é obrigatório")
    private Boolean pushSystemAlerts;
    
    // Configurações de SMS
    @NotNull(message = "SMS habilitado é obrigatório")
    private Boolean smsEnabled;
    
    @NotNull(message = "SMS urgente é obrigatório")
    private Boolean smsUrgentOnly;
    
    private String smsProvider;
    private String smsApiKey;
    
    // Configurações de WhatsApp
    @NotNull(message = "WhatsApp habilitado é obrigatório")
    private Boolean whatsappEnabled;
    
    @NotNull(message = "WhatsApp contratos é obrigatório")
    private Boolean whatsappContractUpdates;
    
    @NotNull(message = "WhatsApp pagamentos é obrigatório")
    private Boolean whatsappPaymentReceived;
    
    @NotNull(message = "WhatsApp escalas é obrigatório")
    private Boolean whatsappScheduleChanges;
    
    // Configurações de horários
    @NotNull(message = "Horário silencioso é obrigatório")
    private Boolean quietHoursEnabled;
    
    private String quietHoursStart;
    private String quietHoursEnd;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
