package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.StockMovement;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DeliverStockRequisitionRequest {

    @NotNull
    private StockMovement.SignatureType signatureType;

    private String digitalSignature;

    /** Texto de conferência quando a assinatura foi coletada em papel. */
    private String physicalAcknowledgment;
}
