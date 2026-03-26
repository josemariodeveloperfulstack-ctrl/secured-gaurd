package com.z7design.secured_guard.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.Map;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/public/diagnostic")
@Tag(name = "Diagnóstico", description = "Endpoints para depuração de infraestrutura")
@CrossOrigin(origins = "*")
public class DiagnosticController {

    @GetMapping("/shallow")
    @Operation(summary = "Diagnóstico raso", description = "Teste com 3 segmentos (/api/public/diagnostic/shallow)")
    public ResponseEntity<Object> shallow() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "path", "/api/public/diagnostic/shallow",
            "segments", 3,
            "timestamp", LocalDateTime.now().toString()
        ));
    }

    @GetMapping("/deep/path/test")
    @Operation(summary = "Diagnóstico profundo", description = "Teste com 5 segmentos (/api/public/diagnostic/deep/path/test)")
    public ResponseEntity<Object> deep() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "path", "/api/public/diagnostic/deep/path/test",
            "segments", 5,
            "timestamp", LocalDateTime.now().toString()
        ));
    }
    
    @GetMapping("/root")
    @Operation(summary = "Diagnóstico raiz", description = "Teste com 2 segmentos (/api/public/diagnostic/root)")
    public ResponseEntity<Object> root() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "path", "/api/public/diagnostic/root",
            "segments", 2,
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}
