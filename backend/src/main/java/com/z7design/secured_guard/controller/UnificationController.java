package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.worker.UnificationWorker;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller para gerenciar o processo de unificação de holerites e comprovantes
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/unification")
@RequiredArgsConstructor
@Tag(name = "Unification", description = "API para gerenciar unificação de holerites e comprovantes")
public class UnificationController {
    
    private final UnificationWorker unificationWorker;
    
    @PostMapping("/run")
    @Operation(
        summary = "Executar processo de unificação manualmente",
        description = "Inicia o processo de matching e unificação entre holerites e comprovantes já processados"
    )
    public ResponseEntity<Map<String, Object>> runUnification() {
        try {
            log.info("🔄 Iniciando processo de unificação manual...");
            
            // Executar unificação em thread separada para não bloquear
            new Thread(() -> {
                try {
                    unificationWorker.processUnification();
                } catch (Exception e) {
                    log.error("❌ Erro ao executar unificação", e);
                }
            }).start();
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "PROCESSING");
            response.put("message", "Processo de unificação iniciado. Verifique os logs para acompanhar o progresso.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro ao iniciar processo de unificação", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}

