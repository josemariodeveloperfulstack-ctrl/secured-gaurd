package com.z7design.secured_guard.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller para health check simples
 * Endpoint público sem autenticação
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final DataSource dataSource;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Verificar conexão com banco de dados (com timeout curto para não travar)
            boolean dbConnected = false;
            String dbError = null;
            try (Connection connection = dataSource.getConnection()) {
                dbConnected = connection.isValid(2); // 2 segundos timeout (reduzido)
            } catch (Exception e) {
                dbError = e.getMessage();
                log.warn("⚠️ Erro ao verificar conexão com banco de dados: {}", e.getMessage());
            }
            
            response.put("status", dbConnected ? "UP" : "DOWN");
            response.put("application", "secured-guard");
            response.put("timestamp", LocalDateTime.now().toString());
            response.put("version", "1.0.0");
            response.put("database", dbConnected ? "CONNECTED" : "DISCONNECTED");
            if (dbError != null) {
                response.put("databaseError", dbError);
            }
            
            // Sempre retornar 200 para o healthcheck do Docker funcionar
            // O status "DOWN" indica problema mas não impede o container de funcionar
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro crítico no health check: {}", e.getMessage(), e);
            response.put("status", "DOWN");
            response.put("error", e.getMessage());
            response.put("timestamp", LocalDateTime.now().toString());
            // Retornar 200 mesmo com erro para não quebrar o healthcheck do Docker
            return ResponseEntity.ok(response);
        }
    }
}
