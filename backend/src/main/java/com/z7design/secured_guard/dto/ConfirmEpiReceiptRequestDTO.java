package com.z7design.secured_guard.dto;

import lombok.Data;

@Data
public class ConfirmEpiReceiptRequestDTO {
    private String code;
    private String signatureBase64;
}
