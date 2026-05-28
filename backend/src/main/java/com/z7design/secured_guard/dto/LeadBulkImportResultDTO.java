package com.z7design.secured_guard.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class LeadBulkImportResultDTO {

    private int created;
    private int updated;
    private int skipped;
    private List<LeadImportLeadRefDTO> leads = new ArrayList<>();

    public int getCreated() {
        return created;
    }

    public void setCreated(int created) {
        this.created = created;
    }

    public int getUpdated() {
        return updated;
    }

    public void setUpdated(int updated) {
        this.updated = updated;
    }

    public int getSkipped() {
        return skipped;
    }

    public void setSkipped(int skipped) {
        this.skipped = skipped;
    }

    public List<LeadImportLeadRefDTO> getLeads() {
        return leads;
    }

    public void setLeads(List<LeadImportLeadRefDTO> leads) {
        this.leads = leads != null ? leads : new ArrayList<>();
    }

    public static class LeadImportLeadRefDTO {
        private UUID id;
        private String email;

        public LeadImportLeadRefDTO() {}

        public LeadImportLeadRefDTO(UUID id, String email) {
            this.id = id;
            this.email = email;
        }

        public UUID getId() {
            return id;
        }

        public void setId(UUID id) {
            this.id = id;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }
}
