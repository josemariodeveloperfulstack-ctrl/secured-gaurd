package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.UserTermsConsent;
import java.time.LocalDateTime;
import java.util.UUID;

public class UserTermsConsentDTO {
    private UUID id;
    private UUID userId;
    private String userType;
    private String userCpf;
    private boolean accepted;
    private String ipAddress;
    private String userAgent;
    private String termsVersion;
    private String privacyPolicyVersion;
    private String termsContentHash;
    private LocalDateTime acceptedAt;
    private boolean revoked;
    private LocalDateTime revokedAt;

    public UserTermsConsentDTO() {
    }

    // Manual Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
        this.userType = userType;
    }

    public String getUserCpf() {
        return userCpf;
    }

    public void setUserCpf(String userCpf) {
        this.userCpf = userCpf;
    }

    public boolean isAccepted() {
        return accepted;
    }

    public void setAccepted(boolean accepted) {
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

    public LocalDateTime getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(LocalDateTime acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }

    public static UserTermsConsentDTO fromEntity(UserTermsConsent entity) {
        if (entity == null)
            return null;
        UserTermsConsentDTO dto = new UserTermsConsentDTO();
        dto.setId(entity.getId());
        dto.setUserId(entity.getUserId());
        dto.setUserType(entity.getUserType() != null ? entity.getUserType().name() : null);
        dto.setUserCpf(entity.getUserCpf());
        dto.setAccepted(Boolean.TRUE.equals(entity.getAccepted()));
        dto.setAcceptedAt(entity.getAcceptedAt());
        dto.setIpAddress(entity.getIpAddress());
        dto.setUserAgent(entity.getUserAgent());
        dto.setTermsVersion(entity.getTermsVersion());
        dto.setPrivacyPolicyVersion(entity.getPrivacyPolicyVersion());
        dto.setTermsContentHash(entity.getTermsContentHash());
        return dto;
    }
}
