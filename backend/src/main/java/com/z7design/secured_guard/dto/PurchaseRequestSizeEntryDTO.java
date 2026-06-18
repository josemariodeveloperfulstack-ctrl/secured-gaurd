package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRequestSizeEntryDTO {
    private String size;
    private BigDecimal quantity;
}
