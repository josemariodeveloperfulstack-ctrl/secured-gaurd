package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private String username;
    private String email;
    private String fullName;
    private List<String> roles;
} 