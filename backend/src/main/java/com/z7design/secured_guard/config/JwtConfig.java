package com.z7design.secured_guard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;

@Slf4j
@ConfigurationProperties(prefix = "jwt")
public class JwtConfig {
    private String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"; // Valor padrão como fallback
    private Long expiration = 604800000L; // 7 dias
    private Long refreshTokenExpiration = 604800000L; // 7 dias
    private String header = "Authorization";
    private String prefix = "Bearer";
    
    @PostConstruct
    public void init() {
        log.info("🔐 JwtConfig inicializado - Secret presente: {}, Expiration: {}, RefreshExpiration: {}", 
            secret != null && !secret.trim().isEmpty(), expiration, refreshTokenExpiration);
        if (secret == null || secret.trim().isEmpty()) {
            log.error("❌ JWT secret está null ou vazio!");
        } else {
            log.info("✅ JWT secret configurado (tamanho: {} caracteres)", secret.length());
        }
    }

    public String getSecret() {
        return secret;
    }
    public void setSecret(String secret) {
        // Só substitui se o valor fornecido não for null ou vazio
        if (secret != null && !secret.trim().isEmpty()) {
            this.secret = secret;
        }
        // Caso contrário, mantém o valor padrão
    }
    public Long getExpiration() {
        return expiration;
    }
    public void setExpiration(Long expiration) {
        this.expiration = expiration;
    }
    public Long getRefreshTokenExpiration() {
        return refreshTokenExpiration;
    }
    public void setRefreshTokenExpiration(Long refreshTokenExpiration) {
        this.refreshTokenExpiration = refreshTokenExpiration;
    }
    public String getHeader() {
        return header;
    }
    public void setHeader(String header) {
        this.header = header;
    }
    public String getPrefix() {
        return prefix;
    }
    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }
} 