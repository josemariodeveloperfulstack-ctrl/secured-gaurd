package com.z7design.secured_guard.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class EPIDeliveryFormItemDTO {
    private UUID id;
    private String epiName;
    private Integer quantity;
    private String ca;
    private String caName;
    private LocalDate validityDate;
    private String uniformType;
    private String uniformPiece;
    private String sizeNumber;
    private String observations;
    private UUID stockItemId;
    private LocalDate substitutedDate;
    private String replacementReason;
    private String confirmationCode;
    private LocalDateTime confirmationExpiresAt;
    private LocalDateTime confirmationSentAt;
    private LocalDateTime confirmedAt;

    public EPIDeliveryFormItemDTO() {
    }

    // Manual Getters and Setters
    public UUID getStockItemId() {
        return stockItemId;
    }

    public void setStockItemId(UUID stockItemId) {
        this.stockItemId = stockItemId;
    }

    public LocalDate getSubstitutedDate() {
        return substitutedDate;
    }

    public void setSubstitutedDate(LocalDate substitutedDate) {
        this.substitutedDate = substitutedDate;
    }

    public String getReplacementReason() {
        return replacementReason;
    }

    public void setReplacementReason(String replacementReason) {
        this.replacementReason = replacementReason;
    }
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEpiName() {
        return epiName;
    }

    public void setEpiName(String epiName) {
        this.epiName = epiName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getCa() {
        return ca;
    }

    public void setCa(String ca) {
        this.ca = ca;
    }

    public String getCaName() {
        return caName;
    }

    public void setCaName(String caName) {
        this.caName = caName;
    }

    public LocalDate getValidityDate() {
        return validityDate;
    }

    public void setValidityDate(LocalDate validityDate) {
        this.validityDate = validityDate;
    }

    public String getUniformType() {
        return uniformType;
    }

    public void setUniformType(String uniformType) {
        this.uniformType = uniformType;
    }

    public String getUniformPiece() {
        return uniformPiece;
    }

    public void setUniformPiece(String uniformPiece) {
        this.uniformPiece = uniformPiece;
    }

    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }

    public String getConfirmationCode() {
        return confirmationCode;
    }

    public void setConfirmationCode(String confirmationCode) {
        this.confirmationCode = confirmationCode;
    }

    public LocalDateTime getConfirmationExpiresAt() {
        return confirmationExpiresAt;
    }

    public void setConfirmationExpiresAt(LocalDateTime confirmationExpiresAt) {
        this.confirmationExpiresAt = confirmationExpiresAt;
    }

    public LocalDateTime getConfirmationSentAt() {
        return confirmationSentAt;
    }

    public void setConfirmationSentAt(LocalDateTime confirmationSentAt) {
        this.confirmationSentAt = confirmationSentAt;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public void setConfirmedAt(LocalDateTime confirmedAt) {
        this.confirmedAt = confirmedAt;
    }

    public String getSizeNumber() {
        return sizeNumber;
    }

    public void setSizeNumber(String sizeNumber) {
        this.sizeNumber = sizeNumber;
    }
}
