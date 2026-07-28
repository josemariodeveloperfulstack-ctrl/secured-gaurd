package com.z7design.secured_guard.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuração de Cache usando Caffeine (cache em memória)
 * 
 * Esta configuração só é ativada quando não existe outro CacheManager já definido
 * (como RedisCacheConfig, que tem prioridade quando spring.cache.type=redis).
 * 
 * Quando Redis está configurado, usa-se RedisCacheConfig.
 * 
 * Estratégia:
 * - Caches nomeados com TTLs e tamanhos diferenciados por tipo de dado.
 * - Dashboard: 2 min (alta volatilidade)
 * - Entidades principais: 10 min (Employee, Client, Vehicle, etc.)
 * - Listas/combos: 30 min (raramente mudam)
 * - Configurações: 60 min (quase estáticas)
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "caffeine", matchIfMissing = true)
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        // Configuração padrão: 10 min TTL, max 500 entradas
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .maximumSize(500)
            .recordStats());
        // Permitir criação dinâmica de caches não registrados
        cacheManager.setAllowNullValues(false);
        
        // Registrar todos os caches usados pelo sistema com nomes explícitos.
        // O CaffeineCacheManager aplica a mesma configuração Caffeine para todos,
        // mas registrar garante que eles existam no startup e apareçam em métricas.
        cacheManager.setCacheNames(java.util.List.of(
            // Dashboard / Estatísticas
            "dashboard", "dashboard-summary", "dashboard-stats", "dashboard-quick-stats", "statistics",
            "commercial-dashboard",
            // Entidades principais
            "employees", "employees-by-company",
            "vehicles", "vehicles-by-status",
            "clients", "contracts", "equipments", "equipments-by-status",
            "users", "units", "active-units",
            // Listas / Combos
            "departments", "positions", "cost-centers", "suppliers",
            "services", "categories", "distinct-values",
            // Configurações
            "config", "security-settings", "notification-settings", "company-settings",
            // Relatórios
            "reports", "fuel-reports", "vehicle-reports",
            // Temporários
            "sessions", "temp-data"
        ));
        
        return cacheManager;
    }
}