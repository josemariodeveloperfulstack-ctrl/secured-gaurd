package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPageResponse {
    private List<UserListResponseDTO> content;
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;
    private long onlineCount;
}
