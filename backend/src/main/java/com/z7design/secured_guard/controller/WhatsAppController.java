package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.whatsapp.WhatsAppAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/whatsapp")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "http://localhost:5173"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
@RequiredArgsConstructor
@Slf4j
public class WhatsAppController {

    private final WhatsAppAgentService whatsAppAgent;

    @Value("${chatbot.whatsapp.company-number:5531999999999}")
    private String companyWhatsAppNumber;

    @GetMapping("/agent/status")
    public ResponseEntity<?> agentStatus() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("providers", whatsAppAgent.getProvidersStatus());
        body.put("anyAvailable", whatsAppAgent.isAnyServiceAvailable());
        body.put("anyConnected", whatsAppAgent.isAnyConnected());
        body.put("connectionState", whatsAppAgent.getActiveConnectionState());
        whatsAppAgent.getLastSuccessfulProvider()
                .ifPresent(p -> body.put("lastSuccessfulProvider", p.name()));
        body.put("lastError", whatsAppAgent.getLastErrorMessage());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        boolean connected = whatsAppAgent.checkConnection();
        return ResponseEntity.ok(Map.of(
                "connected", connected,
                "connectionState", whatsAppAgent.getActiveConnectionState()
        ));
    }

    @PostMapping("/init")
    public ResponseEntity<?> init() {
        boolean ok = whatsAppAgent.initializeConnection();
        return ResponseEntity.ok(Map.of("initialized", ok));
    }

    @GetMapping(value = "/qr", produces = "image/svg+xml")
    public ResponseEntity<String> qr() {
        String svg = whatsAppAgent.getQRCode();
        if (svg == null) {
            return ResponseEntity.status(404).body("QR not available");
        }
        return ResponseEntity.ok(svg);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        boolean ok = whatsAppAgent.disconnect();
        return ResponseEntity.ok(Map.of("success", ok));
    }

    @GetMapping("/connection/status/{instanceName}")
    public ResponseEntity<?> getConnectionStatus(@PathVariable String instanceName) {
        try {
            boolean connected = whatsAppAgent.checkConnection();
            String state = whatsAppAgent.getActiveConnectionState();
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("connected", connected);
            response.put("instance", instanceName);
            response.put("state", connected ? "open" : state);
            whatsAppAgent.getLastSuccessfulProvider()
                    .ifPresent(p -> response.put("activeProvider", p.name()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro ao verificar status: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                    "connected", false,
                    "instance", instanceName,
                    "state", "close",
                    "error", e.getMessage() != null ? e.getMessage() : "Serviço WhatsApp indisponível"
            ));
        }
    }

    @PostMapping("/connection/create")
    public ResponseEntity<?> createConnection(@RequestBody Map<String, Object> request) {
        try {
            String instanceName = request != null ? (String) request.get("instanceName") : "securedguard";
            boolean qrcode = Boolean.TRUE.equals(request != null ? request.get("qrcode") : false);

            log.info("🔄 Criando conexão WhatsApp (agente). Instance: {}, QR: {}", instanceName, qrcode);

            if (!whatsAppAgent.isAnyServiceAvailable()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "error", "Nenhum provedor WhatsApp disponível. Configure UAZAPI, Z-API, Evolution ou Baileys.",
                        "instance", instanceName != null ? instanceName : "unknown",
                        "serviceAvailable", false,
                        "providers", whatsAppAgent.getProvidersStatus(),
                        "hint", "Defina whatsapp.agent.provider-order e credenciais em application.properties / variáveis de ambiente."
                ));
            }

            if (!whatsAppAgent.initializeConnection()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "error", whatsAppAgent.getLastErrorMessage(),
                        "instance", instanceName != null ? instanceName : "unknown",
                        "providers", whatsAppAgent.getProvidersStatus()
                ));
            }

            if (qrcode) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }

                String qrCodeData = null;
                int maxAttempts = 5;
                for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                    qrCodeData = whatsAppAgent.getQRCode();
                    if (qrCodeData != null && !qrCodeData.isEmpty()) {
                        log.info("✅ QR Code obtido na tentativa {}/{}", attempt, maxAttempts);
                        break;
                    }
                    if (attempt < maxAttempts) {
                        try {
                            Thread.sleep(500L * attempt);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                }

                if (qrCodeData == null || qrCodeData.isEmpty()) {
                    return ResponseEntity.ok(Map.of(
                            "success", false,
                            "error", whatsAppAgent.getLastErrorMessage() != null
                                    ? whatsAppAgent.getLastErrorMessage()
                                    : "Não foi possível gerar o QR Code.",
                            "instance", instanceName != null ? instanceName : "unknown",
                            "connectionState", whatsAppAgent.getActiveConnectionState(),
                            "providers", whatsAppAgent.getProvidersStatus()
                    ));
                }

                String base64QR = qrCodeData;
                if (!base64QR.startsWith("data:image")) {
                    base64QR = "data:image/png;base64," + base64QR;
                }

                Map<String, Object> ok = new LinkedHashMap<>();
                ok.put("success", true);
                ok.put("instance", instanceName != null ? instanceName : "unknown");
                ok.put("qrcode", Map.of("base64", base64QR));
                whatsAppAgent.getLastSuccessfulProvider()
                        .ifPresent(p -> ok.put("activeProvider", p.name()));
                return ResponseEntity.ok(ok);
            }

            Map<String, Object> ok = new LinkedHashMap<>();
            ok.put("success", true);
            ok.put("instance", instanceName != null ? instanceName : "unknown");
            whatsAppAgent.getLastSuccessfulProvider()
                    .ifPresent(p -> ok.put("activeProvider", p.name()));
            return ResponseEntity.ok(ok);
        } catch (Exception e) {
            log.error("❌ Erro ao criar instância: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage() != null ? e.getMessage() : "Erro ao criar conexão WhatsApp.",
                    "instance", request != null && request.get("instanceName") != null
                            ? (String) request.get("instanceName") : "unknown"
            ));
        }
    }

    @DeleteMapping("/connection/disconnect/{instanceName}")
    public ResponseEntity<?> disconnectConnection(@PathVariable String instanceName) {
        try {
            boolean ok = whatsAppAgent.disconnect();
            return ResponseEntity.ok(Map.of("success", ok));
        } catch (Exception e) {
            log.error("❌ Erro ao desconectar: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

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

            log.info("📤 Enviando mensagem do chatbot para: {}", companyWhatsAppNumber);
            boolean sent = whatsAppAgent.sendTextMessage(companyWhatsAppNumber, fullMessage.toString());

            if (sent) {
                Map<String, Object> ok = new LinkedHashMap<>();
                ok.put("success", true);
                ok.put("message", "Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.");
                whatsAppAgent.getLastSuccessfulProvider()
                        .ifPresent(p -> ok.put("provider", p.name()));
                return ResponseEntity.ok(ok);
            }

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", whatsAppAgent.getLastErrorMessage() != null
                            ? whatsAppAgent.getLastErrorMessage()
                            : "Falha ao enviar mensagem."
            ));
        } catch (Exception e) {
            log.error("❌ Erro ao enviar mensagem do chatbot: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Erro interno: " + e.getMessage()));
        }
    }
}
