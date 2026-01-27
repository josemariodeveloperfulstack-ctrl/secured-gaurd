package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.UserTermsConsent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class CreateUserTermsConsentDTO {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "User type is required")
    private UserTermsConsent.UserType userType;

    private String userCpf;
    private Boolean accepted;
    private String ipAddress;
    private String userAgent;
    private String termsVersion;
    private String privacyPolicyVersion;
    private String termsContentHash;

    public CreateUserTermsConsentDTO() {
    }

    // Manual Getters and Setters
    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UserTermsConsent.UserType getUserType() {
        return userType;
    }

    public void setUserType(UserTermsConsent.UserType userType) {
        this.userType = userType;
    }

    public String getUserCpf() {
        return userCpf;
    }

    public void setUserCpf(String userCpf) {
        this.userCpf = userCpf;
    }

    public Boolean getAccepted() {
        return accepted;
    }

    public void setAccepted(Boolean accepted) {
        this.accepted = accepted;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getTermsVersion() {
        return termsVersion;
    }

    public void setTermsVersion(String termsVersion) {
        this.termsVersion = termsVersion;
    }

    public String getPrivacyPolicyVersion() {
        return privacyPolicyVersion;
    }

    public void setPrivacyPolicyVersion(String privacyPolicyVersion) {
        this.privacyPolicyVersion = privacyPolicyVersion;
    }

    public String getTermsContentHash() {
        return termsContentHash;
    }

    public void setTermsContentHash(String termsContentHash) {
        this.termsContentHash = termsContentHash;
    }
}
