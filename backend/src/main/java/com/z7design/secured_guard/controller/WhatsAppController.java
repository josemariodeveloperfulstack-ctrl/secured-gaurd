package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.BaileysRestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppController {

    private final BaileysRestService baileysRestService;
    
    @Value("${chatbot.whatsapp.company-number:5531999999999}")
    private String companyWhatsAppNumber;

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        boolean connected = baileysRestService.checkConnection();
        return ResponseEntity.ok(java.util.Map.of("connected", connected));
    }

    @PostMapping("/init")
    public ResponseEntity<?> init() {
        boolean ok = baileysRestService.initializeInstance();
        return ResponseEntity.ok(java.util.Map.of("initialized", ok));
    }

    @GetMapping(value = "/qr", produces = "image/svg+xml")
    public ResponseEntity<String> qr() {
        String svg = baileysRestService.getQRCode();
        if (svg == null) {
            return ResponseEntity.status(404).body("QR not available");
        }
        return ResponseEntity.ok(svg);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        boolean ok = baileysRestService.disconnectInstance();
        return ResponseEntity.ok(java.util.Map.of("success", ok));
    }

    /**
     * Obter status da conexão por nome da instância
     */
    @GetMapping("/connection/status/{instanceName}")
    public ResponseEntity<?> getConnectionStatus(@PathVariable String instanceName) {
        try {
            boolean connected = baileysRestService.checkConnection();
            return ResponseEntity.ok(Map.of(
                "connected", connected,
                "instance", instanceName,
                "state", connected ? "open" : "close"
            ));
        } catch (Exception e) {
            log.error("❌ Erro ao verificar status: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                "connected", false,
                "instance", instanceName,
                "state", "close"
            ));
        }
    }

    /**
     * Criar nova instância e gerar QR Code
     */
    @PostMapping("/connection/create")
    public ResponseEntity<?> createConnection(@RequestBody Map<String, Object> request) {
        try {
            String instanceName = (String) request.get("instanceName");
            boolean qrcode = Boolean.TRUE.equals(request.get("qrcode"));
            
            log.info("🔄 Criando conexão WhatsApp. Instance: {}, QRCode solicitado: {}", instanceName, qrcode);
            
            boolean initialized = baileysRestService.initializeInstance();
            log.info("📱 Instância inicializada: {}", initialized);
            
            if (initialized && qrcode) {
                String qrCodeData = baileysRestService.getQRCode();
                log.info("📸 QR Code obtido. Tamanho: {} caracteres", qrCodeData != null ? qrCodeData.length() : 0);
                
                // Se o QR Code já vier em base64, usar diretamente
                // Senão, precisará ser convertido
                String base64QR = qrCodeData;
                
                // Se não começar com data:image, adicionar prefixo
                if (base64QR != null && !base64QR.startsWith("data:image")) {
                    base64QR = "data:image/png;base64," + base64QR;
                }
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "instance", instanceName,
                    "qrcode", Map.of("base64", base64QR != null ? base64QR : "")
                ));
            }
            
            return ResponseEntity.ok(Map.of("success", initialized));
        } catch (Exception e) {
            log.error("❌ Erro ao criar instância: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * Desconectar instância
     */
    @DeleteMapping("/connection/disconnect/{instanceName}")
    public ResponseEntity<?> disconnectConnection(@PathVariable String instanceName) {
        try {
            boolean ok = baileysRestService.disconnectInstance();
            return ResponseEntity.ok(Map.of("success", ok));
        } catch (Exception e) {
            log.error("❌ Erro ao desconectar: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * Envia mensagem simples via WhatsApp (usado pelo chatbot)
     * Envia a mensagem do cliente para o número da empresa configurado
     */
    @PostMapping("/send-message")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, String> request) {
        try {
            String message = request.get("message");
            String customerName = request.get("customerName");
            String customerPhone = request.get("customerPhone");
            String customerEmail = request.get("customerEmail");
            
            if (message == null || message.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Mensagem é obrigatória"));
            }
            
            // Construir mensagem completa com informações do cliente
            StringBuilder fullMessage = new StringBuilder();
            fullMessage.append("📱 *Nova mensagem do Chatbot*\n\n");
            
            if (customerName != null && !customerName.trim().isEmpty()) {
                fullMessage.append("👤 *Nome:* ").append(customerName).append("\n");
            }
            if (customerEmail != null && !customerEmail.trim().isEmpty()) {
                fullMessage.append("📧 *Email:* ").append(customerEmail).append("\n");
            }
            if (customerPhone != null && !customerPhone.trim().isEmpty()) {
                fullMessage.append("📞 *Telefone:* ").append(customerPhone).append("\n");
            }
            
            fullMessage.append("\n💬 *Mensagem:*\n").append(message);
            
            log.info("📤 Enviando mensagem do chatbot para número da empresa: {}", companyWhatsAppNumber);
            boolean sent = baileysRestService.sendTextMessage(companyWhatsAppNumber, fullMessage.toString());
            
            if (sent) {
                log.info("✅ Mensagem do chatbot enviada com sucesso para a empresa");
                return ResponseEntity.ok(Map.of("success", true, "message", "Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve."));
            } else {
                log.error("❌ Falha ao enviar mensagem do chatbot");
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Falha ao enviar mensagem. Tente novamente ou entre em contato diretamente."));
            }
        } catch (Exception e) {
            log.error("❌ Erro ao enviar mensagem do chatbot: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Erro interno: " + e.getMessage()));
        }
    }
}


