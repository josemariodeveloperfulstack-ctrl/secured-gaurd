package com.z7design.secured_guard.security;

import java.io.IOException;

import org.springframework.context.annotation.Lazy;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.z7design.secured_guard.config.JwtConfig;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    @Lazy
    private final UserDetailsService userDetailsService;
    private final JwtConfig jwtConfig;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();

        // Pular filtro para recursos estáticos públicos (logos, uploads, etc)
        if (path.startsWith("/api/uploads/companies/logos/") ||
                path.startsWith("/api/uploads/safety-engineers/stamps/") ||
                path.startsWith("/uploads/") ||
                path.startsWith("/holerites/") ||
                path.startsWith("/api/auth/") ||
                path.startsWith("/swagger-ui") ||
                path.startsWith("/v3/api-docs") ||
                path.startsWith("/api/public/") ||
                path.startsWith("/api/health") ||
                path.startsWith("/error")) {
            return true;
        }

        return false;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            final String authHeader = request.getHeader(jwtConfig.getHeader());
            log.debug("Processing request: {} {}", request.getMethod(), request.getRequestURI());
            log.debug("Authorization header: {}", authHeader);

            if (authHeader == null) {
                log.debug("No Authorization header found for request: {} {}", request.getMethod(),
                        request.getRequestURI());
                filterChain.doFilter(request, response);
                return;
            }

            if (!authHeader.startsWith(jwtConfig.getPrefix() + " ")) {
                log.warn("Invalid Authorization header format. Expected: {} <token>, got: {}",
                        jwtConfig.getPrefix(), authHeader);
                filterChain.doFilter(request, response);
                return;
            }

            final String jwt = authHeader.substring(jwtConfig.getPrefix().length() + 1);
            log.debug("JWT token length: {}", jwt != null ? jwt.length() : 0);

            if (jwt == null || jwt.trim().isEmpty()) {
                log.warn("Empty JWT token received");
                filterChain.doFilter(request, response);
                return;
            }

            if (!jwt.contains(".")) {
                log.error("Invalid JWT format: token does not contain required periods. Token: {}", jwt);
                filterChain.doFilter(request, response);
                return;
            }

            final String username = jwtService.extractUsername(jwt);
            log.debug("Extracted username from token: {}", username);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.debug("Found valid username '{}', loading user details", username);
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                log.debug("User authorities for '{}': {}", username, userDetails.getAuthorities());

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.info("Authentication successful for user: {} with authorities: {}", username,
                            userDetails.getAuthorities());
                } else {
                    log.warn("JWT token validation FAILED for user: {}", username);
                }
            } else if (username == null) {
                log.warn("Username extraction failed from token: {}", jwt.substring(0, Math.min(jwt.length(), 10)) + "...");
            } else {
                log.debug("Request already authenticated for user: {}", username);
            }
        } catch (Exception e) {
            log.error("CRITICAL: Error processing JWT token for {} {}: {}",
                    request.getMethod(), request.getRequestURI(), e.getMessage());
            log.debug("Full error stack trace: ", e);
        }

        filterChain.doFilter(request, response);
    }
}