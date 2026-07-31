package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CidSuggestionDTO {
    private String code;
    private String description;
    /** CID10 | CID11 | LOCAL */
    private String source;
}
