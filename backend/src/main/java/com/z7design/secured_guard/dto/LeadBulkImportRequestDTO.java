package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class LeadBulkImportRequestDTO {

    @NotEmpty
    @Size(max = 2000)
    private List<LeadImportItemDTO> items = new ArrayList<>();

    public List<LeadImportItemDTO> getItems() {
        return items;
    }

    public void setItems(List<LeadImportItemDTO> items) {
        this.items = items != null ? items : new ArrayList<>();
    }
}
