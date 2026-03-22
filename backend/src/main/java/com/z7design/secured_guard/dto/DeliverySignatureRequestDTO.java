package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.DeliverySignatureOrigin;
import lombok.Data;

@Data
public class DeliverySignatureRequestDTO {
    private String signatureBase64;
    private DeliverySignatureOrigin origin;
}
