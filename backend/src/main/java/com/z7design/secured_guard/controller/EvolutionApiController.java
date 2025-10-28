package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.EvolutionApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller para gerenciar Evolution API
 * Endpoints para QR Code, status de conexão, etc.
 */
@RestController
@RequestMapping("/api/evolution")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class EvolutionApiController {

    private final EvolutionApiService evolutionApiService;

    /**
     * Criar instância Evolution API
     */
    @PostMapping("/instance/create")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> createInstance() {
        log.info("🔧 Requisição para criar instância Evolution API");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean created = evolutionApiService.createInstance();
            
            if (created) {
                response.put("success", true);
                response.put("message", "Instância criada com sucesso");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Erro ao criar instância");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao criar instância", e);
            response.put("success", false);
            response.put("message", "Erro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Conectar e obter QR Code
     */
    @GetMapping("/instance/connect")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> connectInstance() {
        log.info("📱 Requisição para conectar instância (obter QR Code)");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String qrCodeData = evolutionApiService.connectInstance();
            
            if (qrCodeData != null) {
                response.put("success", true);
                response.put("qrCode", qrCodeData);
                response.put("message", "QR Code gerado. Escaneie com WhatsApp.");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Erro ao gerar QR Code");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao conectar instância", e);
            response.put("success", false);
            response.put("message", "Erro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Verificar status da conexão
     */
    @GetMapping("/instance/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> checkConnectionStatus() {
        log.info("🔍 Verificando status da conexão Evolution API");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean connected = evolutionApiService.checkConnection();
            
            response.put("success", true);
            response.put("connected", connected);
            response.put("status", connected ? "open" : "close");
            response.put("message", connected ? "WhatsApp conectado" : "WhatsApp desconectado");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ Erro ao verificar status", e);
            response.put("success", false);
            response.put("connected", false);
            response.put("message", "Erro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Enviar mensagem de teste
     */
    @PostMapping("/test/text")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> sendTestMessage(
            @RequestParam String phoneNumber,
            @RequestParam String message) {
        
        log.info("🧪 Enviando mensagem de teste para: {}", phoneNumber);
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean sent = evolutionApiService.sendTextMessage(phoneNumber, message);
            
            if (sent) {
                response.put("success", true);
                response.put("message", "Mensagem enviada com sucesso");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Erro ao enviar mensagem");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao enviar mensagem de teste", e);
            response.put("success", false);
            response.put("message", "Erro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Desconectar instância
     */
    @DeleteMapping("/instance/disconnect")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> disconnectInstance() {
        log.info("🔌 Desconectando instância Evolution API");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean disconnected = evolutionApiService.disconnectInstance();
            
            if (disconnected) {
                response.put("success", true);
                response.put("message", "Instância desconectada com sucesso");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Erro ao desconectar instância");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao desconectar instância", e);
            response.put("success", false);
            response.put("message", "Erro: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

