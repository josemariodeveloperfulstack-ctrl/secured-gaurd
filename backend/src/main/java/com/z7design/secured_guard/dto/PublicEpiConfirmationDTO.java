package com.z7design.secured_guard.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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
    /** true quando o link corresponde à confirmação individual de um item (modo por item). */
    private boolean perItem;
    /** ID do item quando perItem=true. */
    private UUID itemId;

    @Data
    @Builder
    public static class Item {
        private UUID id;
        private String epiName;
        private Integer quantity;
        private String ca;
        private String caName;
        private boolean confirmed;
    }
}
