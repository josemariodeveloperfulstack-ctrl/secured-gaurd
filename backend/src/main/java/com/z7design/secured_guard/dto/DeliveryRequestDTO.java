package com.z7design.secured_guard.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class DeliveryRequestDTO {
    private UUID employeeId;
    private List<ItemRequestDTO> items;

    @Data
    public static class ItemRequestDTO {
        private UUID productId;
        private BigDecimal quantity;
    }
}
