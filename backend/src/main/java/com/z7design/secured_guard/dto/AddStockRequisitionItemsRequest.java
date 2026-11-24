package com.z7design.secured_guard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class AddStockRequisitionItemsRequest {

    @NotEmpty(message = "Informe ao menos um item para adicionar à requisição.")
    @Valid
    private List<CreateStockRequisitionRequest.Line> lines;
}
