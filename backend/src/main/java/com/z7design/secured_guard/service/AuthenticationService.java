package com.z7design.secured_guard.service;

import java.util.UUID;

import org.springframework.security.core.Authentication;

import com.z7design.secured_guard.dto.AuthenticationRequest;
import com.z7design.secured_guard.dto.AuthenticationResponse;
import com.z7design.secured_guard.dto.RegisterRequest;
import com.z7design.secured_guard.dto.RefreshTokenRequest;
import com.z7design.secured_guard.model.User;

public interface AuthenticationService {
    AuthenticationResponse register(RegisterRequest request);
    AuthenticationResponse authenticate(AuthenticationRequest request);
    AuthenticationResponse refreshToken(RefreshTokenRequest request);
    User getCurrentUser(UUID userId);
    User getCurrentUser(Authentication authentication);
} 