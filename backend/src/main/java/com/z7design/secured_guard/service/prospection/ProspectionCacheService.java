package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cache L1 de Prospecção (Redis + Fallback Gracioso em Memória).
 * Guarda as consultas de enriquecimento de CNPJ com TTL de 15 dias,
 * conforme o System Design Document (SDD), reduzindo drasticamente
 * a latência (P95 < 20ms) e o consumo de cotas de APIs externas.
 */
@Service
@Slf4j
public class ProspectionCacheService {

    private static final String KEY_PREFIX = "prospection:company:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(15);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // Fallback resiliente em memória para ambientes locais onde o Redis não estiver rodando
    private final Map<String, CacheEntry> memoryFallbackCache = new ConcurrentHashMap<>();

    private record CacheEntry(Map<String, Object> data, long expiresAt) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    public ProspectionCacheService(
            @Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper();
        if (redisTemplate != null) {
            log.info("⚡ ProspectionCacheService iniciado com Redis L1 Cache (TTL = 15 dias)");
        } else {
            log.warn("⚠️ ProspectionCacheService: Redis não disponível, utilizando cache em memória.");
        }
    }

    /**
     * Recupera os dados da empresa em cache a partir do CNPJ higienizado.
     */
    public Optional<Map<String, Object>> getCachedCompany(String cleanCnpj) {
        if (cleanCnpj == null || cleanCnpj.isBlank()) {
            return Optional.empty();
        }

        String key = KEY_PREFIX + cleanCnpj.replaceAll("\\D", "");

        // 1. Tentar Redis
        if (redisTemplate != null) {
            try {
                String json = redisTemplate.opsForValue().get(key);
                if (json != null && !json.isBlank()) {
                    Map<String, Object> data = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
                    log.debug("⚡ Cache HIT no Redis para CNPJ {}", cleanCnpj);
                    return Optional.of(data);
                }
            } catch (Exception ex) {
                log.warn("Falha de leitura no Redis para chave {}: {}. Usando fallback em memória.", key, ex.getMessage());
            }
        }

        // 2. Fallback Memória
        CacheEntry entry = memoryFallbackCache.get(key);
        if (entry != null) {
            if (entry.isExpired()) {
                memoryFallbackCache.remove(key);
            } else {
                log.debug("⚡ Cache HIT em Memória para CNPJ {}", cleanCnpj);
                return Optional.of(entry.data());
            }
        }

        return Optional.empty();
    }

    /**
     * Salva ou atualiza os dados da empresa no cache L1 por 15 dias.
     */
    public void putCompany(String cleanCnpj, Map<String, Object> data) {
        if (cleanCnpj == null || cleanCnpj.isBlank() || data == null || data.isEmpty()) {
            return;
        }

        String key = KEY_PREFIX + cleanCnpj.replaceAll("\\D", "");

        // 1. Gravar no Redis
        if (redisTemplate != null) {
            try {
                String json = objectMapper.writeValueAsString(data);
                redisTemplate.opsForValue().set(key, json, DEFAULT_TTL);
                log.debug("💾 Empresa salva no Redis com TTL de 15 dias: {}", key);
            } catch (Exception ex) {
                log.warn("Falha ao salvar empresa no Redis {}: {}", key, ex.getMessage());
            }
        }

        // 2. Gravar no fallback em memória
        long expiresAt = System.currentTimeMillis() + DEFAULT_TTL.toMillis();
        memoryFallbackCache.put(key, new CacheEntry(data, expiresAt));
    }

    /**
     * Remove uma empresa do cache caso precise forçar re-enriquecimento.
     */
    public void evict(String cleanCnpj) {
        if (cleanCnpj == null) return;
        String key = KEY_PREFIX + cleanCnpj.replaceAll("\\D", "");
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(key);
            } catch (Exception ignored) {}
        }
        memoryFallbackCache.remove(key);
    }
}

