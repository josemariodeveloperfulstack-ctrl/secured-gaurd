package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.MovementReason;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class CreateStockRequisitionRequest {

    @NotNull
    private UUID employeeId;

    @NotNull
    private MovementReason movementReason;

    private String notes;

    @NotEmpty
    @Valid
    private List<Line> lines;

    @Data
    public static class Line {
        @NotNull
        private UUID stockItemId;

        @NotNull
        @Min(1)
        private Integer quantity;
    }
}
