package com.z7design.secured_guard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Probe centralizado para verificar se o Redis está disponível.
 *
 * Workers agendados (Scheduled) usam {@link #isAvailable()} para decidir se
 * tentam ler streams ou apenas retornam silenciosamente, evitando inundar
 * o log com stack traces de RedisConnectionFailureException quando o Redis
 * não está rodando (cenário comum em desenvolvimento local).
 *
 * Estratégia:
 * - O resultado do PING é cacheado por {@value #CACHE_TTL_MS}ms para evitar
 *   ping em cada execução agendada (que pode rodar a cada 200ms).
 * - Transições UP/DOWN são logadas em INFO/WARN uma única vez.
 * - Falhas repetidas geram apenas DEBUG, sem stack trace.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAvailabilityProbe {

    private static final long CACHE_TTL_MS = 5_000L;

    private final StringRedisTemplate redisTemplate;

    private final AtomicReference<Boolean> lastResult = new AtomicReference<>(null);
    private final AtomicLong lastCheckAt = new AtomicLong(0L);

    /**
     * Retorna {@code true} se o Redis estiver respondendo ao PING.
     * O resultado é cacheado por alguns segundos para reduzir overhead.
     */
    public boolean isAvailable() {
        long now = System.currentTimeMillis();
        Boolean cached = lastResult.get();
        if (cached != null && (now - lastCheckAt.get()) < CACHE_TTL_MS) {
            return cached;
        }

        boolean available = ping();
        Boolean previous = lastResult.getAndSet(available);
        lastCheckAt.set(now);

        if (previous == null || previous != available) {
            if (available) {
                log.info("✅ Redis disponível (PING OK)");
            } else {
                log.warn("⚠️ Redis indisponível - workers agendados ficarão em standby até a conexão voltar");
            }
        }
        return available;
    }

    private boolean ping() {
        RedisConnectionFactory factory = redisTemplate.getConnectionFactory();
        if (factory == null) {
            return false;
        }
        try (RedisConnection connection = factory.getConnection()) {
            String pong = connection.ping();
            return pong != null;
        } catch (Exception e) {
            log.debug("Redis PING falhou: {}", e.getMessage());
            return false;
        }
    }
}
