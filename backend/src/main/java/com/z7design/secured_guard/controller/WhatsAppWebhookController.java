package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.whatsapp.agent.WhatsAppInboundProcessorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {

    private final WhatsAppInboundProcessorService inboundProcessor;

    @Value("${evolution.api.key:}")
    private String evolutionApiKey;

    @Value("${whatsapp.agent.webhook.require-api-key:true}")
    private boolean requireApiKey;

    @PostMapping("/evolution")
    public ResponseEntity<Map<String, String>> evolutionWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "apikey", required = false) String apiKeyHeader) {

        if (requireApiKey && evolutionApiKey != null && !evolutionApiKey.isBlank()) {
            if (apiKeyHeader == null || !evolutionApiKey.equals(apiKeyHeader)) {
                log.warn("Webhook Evolution rejeitado: apikey inválida");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("status", "unauthorized"));
            }
        }

        inboundProcessor.processEvolutionWebhookAsync(rawBody);
        return ResponseEntity.ok(Map.of("status", "accepted"));
    }
}
