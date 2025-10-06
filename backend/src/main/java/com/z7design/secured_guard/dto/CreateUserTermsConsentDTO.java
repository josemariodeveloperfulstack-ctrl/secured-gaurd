package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.UserTermsConsent;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateUserTermsConsentDTO {
    
    @NotNull(message = "User ID é obrigatório")
    private UUID userId;
    
    @NotNull(message = "Tipo de usuário é obrigatório")
    private UserTermsConsent.UserType userType;
    
    @NotNull(message = "CPF do usuário é obrigatório")
    private String userCpf;
    
    @NotNull(message = "Aceitação é obrigatória")
    private Boolean accepted;
    
    private String ipAddress;
    
    private String userAgent;
    
    private String termsVersion;
    
    private String privacyPolicyVersion;
    
    private String termsContentHash;
}
