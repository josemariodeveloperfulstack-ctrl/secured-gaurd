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
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "http://localhost:5173"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
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
            log.error("❌ Erro ao verificar status: {}", e.getMessage(), e);
            // Retornar sempre OK com estado desconectado, mesmo em caso de erro
            // Isso evita que o frontend quebre se o serviço não estiver disponível
            return ResponseEntity.ok(Map.of(
                "connected", false,
                "instance", instanceName,
                "state", "close",
                "error", e.getMessage() != null ? e.getMessage() : "Serviço WhatsApp indisponível"
            ));
        }
    }

    /**
     * Criar nova instância e gerar QR Code
     */
    @PostMapping("/connection/create")
    public ResponseEntity<?> createConnection(@RequestBody Map<String, Object> request) {
        try {
            String instanceName = request != null ? (String) request.get("instanceName") : "securedguard";
            boolean qrcode = Boolean.TRUE.equals(request != null ? request.get("qrcode") : false);
            
            log.info("🔄 Criando conexão WhatsApp. Instance: {}, QRCode solicitado: {}", instanceName, qrcode);
            
            // Verificar se o serviço está disponível antes de tentar inicializar
            boolean serviceAvailable = false;
            try {
                serviceAvailable = baileysRestService.isServiceAvailable();
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível verificar disponibilidade do Baileys REST: {}", e.getMessage());
            }
            
            if (!serviceAvailable) {
                log.error("❌ Baileys REST não disponível - serviço não está rodando");
                // Retornar 200 OK com erro na resposta para não quebrar o frontend
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Serviço WhatsApp não disponível. Verifique se o container Docker do Baileys REST está rodando.",
                    "instance", instanceName != null ? instanceName : "unknown",
                    "serviceAvailable", false
                ));
            }
            
            boolean initialized = false;
            try {
                initialized = baileysRestService.initializeInstance();
                log.info("📱 Instância inicializada: {}", initialized);
            } catch (Exception e) {
                log.error("❌ Erro ao inicializar instância: {}", e.getMessage(), e);
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Erro ao inicializar instância: " + (e.getMessage() != null ? e.getMessage() : "Serviço indisponível"),
                    "instance", instanceName != null ? instanceName : "unknown"
                ));
            }
            
            if (!initialized) {
                log.error("❌ Baileys REST não disponível ou falhou ao inicializar");
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", "Serviço WhatsApp não disponível. Verifique se o Baileys REST está rodando em http://localhost:3333",
                    "instance", instanceName != null ? instanceName : "unknown"
                ));
            }
            
            if (qrcode) {
                // Aguardar um pouco para o QR Code ser gerado após inicialização
                try {
                    Thread.sleep(2000); // 2 segundos
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                
                // Tentar obter QR Code até 5 vezes com intervalo de 1 segundo
                String qrCodeData = null;
                int maxAttempts = 5;
                for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        qrCodeData = baileysRestService.getQRCode();
                        if (qrCodeData != null && !qrCodeData.isEmpty()) {
                            log.info("✅ QR Code obtido na tentativa {}/{}", attempt, maxAttempts);
                            break;
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao obter QR Code na tentativa {}: {}", attempt, e.getMessage());
                    }
                    log.info("⏳ Aguardando QR Code... Tentativa {}/{}", attempt, maxAttempts);
                    if (attempt < maxAttempts) {
                        try {
                            Thread.sleep(1000); // 1 segundo entre tentativas
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                }
                
                log.info("📸 QR Code obtido. Tamanho: {} caracteres", qrCodeData != null ? qrCodeData.length() : 0);
                
                if (qrCodeData == null || qrCodeData.isEmpty()) {
                    log.error("❌ QR Code não foi gerado pelo Baileys REST após {} tentativas", maxAttempts);
                    return ResponseEntity.ok(Map.of(
                        "success", false,
                        "error", "Não foi possível gerar o QR Code. Aguarde alguns segundos e tente novamente. Se o problema persistir, verifique se o serviço Baileys REST está rodando corretamente.",
                        "instance", instanceName != null ? instanceName : "unknown"
                    ));
                }
                
                // Se o QR Code já vier em base64, usar diretamente
                // Senão, precisará ser convertido
                String base64QR = qrCodeData;
                
                // Se não começar com data:image, adicionar prefixo
                if (!base64QR.startsWith("data:image")) {
                    base64QR = "data:image/png;base64," + base64QR;
                }
                
                log.info("✅ QR Code preparado para envio ao frontend");
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "instance", instanceName != null ? instanceName : "unknown",
                    "qrcode", Map.of("base64", base64QR)
                ));
            }
            
            return ResponseEntity.ok(Map.of("success", true, "instance", instanceName != null ? instanceName : "unknown"));
        } catch (Exception e) {
            log.error("❌ Erro ao criar instância: {}", e.getMessage(), e);
            // Retornar 200 OK com erro na resposta para não quebrar o frontend
            return ResponseEntity.ok(Map.of(
                "success", false,
                "error", e.getMessage() != null ? e.getMessage() : "Erro ao criar conexão WhatsApp. Verifique se o serviço está disponível.",
                "instance", request != null && request.get("instanceName") != null ? (String) request.get("instanceName") : "unknown"
            ));
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


