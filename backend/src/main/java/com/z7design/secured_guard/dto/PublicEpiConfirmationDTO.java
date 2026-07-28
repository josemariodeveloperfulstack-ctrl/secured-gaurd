package com.z7design.secured_guard.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class PublicEpiConfirmationDTO {
    private String employeeName;
    private String companyName;
    private LocalDate deliveryDate;
    private String deliveryType;
    private List<Item> items;
    private boolean alreadyConfirmed;
    private boolean expired;
    private boolean awaitingConfirmation;

    @Data
    @Builder
    public static class Item {
        private String epiName;
        private Integer quantity;
        private String ca;
        private String caName;
    }
}
