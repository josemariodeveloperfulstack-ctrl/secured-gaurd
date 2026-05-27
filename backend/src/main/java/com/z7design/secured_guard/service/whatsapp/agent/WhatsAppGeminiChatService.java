package com.z7design.secured_guard.service.whatsapp.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.model.WhatsAppMessage;
import com.z7design.secured_guard.model.enums.WhatsAppMessageSenderType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gera respostas da IA usando Gemini com histórico da conversa gravado no banco.
 */
@Service
@Slf4j
public class WhatsAppGeminiChatService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String apiKey;
    private final String model;

    @Value("${whatsapp.agent.ai.system-prompt:}")
    private String systemPrompt;

    public WhatsAppGeminiChatService(
            @Value("${gemini.api.url}") String apiUrl,
            @Value("${gemini.api.key}") String apiKey,
            @Value("${whatsapp.agent.ai.enabled:true}") boolean agentAiEnabled,
            @Value("${gemini.api.enabled:false}") boolean geminiEnabled,
            @Value("${whatsapp.agent.ai.model:gemini-1.5-flash}") String model) {
        this.enabled = agentAiEnabled && geminiEnabled && apiKey != null && !apiKey.isBlank();
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = new ObjectMapper();
        if (this.enabled) {
            this.webClient = WebClient.builder()
                    .baseUrl(apiUrl)
                    .build();
        } else {
            this.webClient = null;
            log.warn("Agente WhatsApp IA desabilitado (gemini.api.enabled ou whatsapp.agent.ai.enabled)");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String generateReply(String contextSummary, List<WhatsAppMessage> history, String leadName) {
        if (!enabled || webClient == null) {
            return fallbackReply();
        }
        try {
            String prompt = buildPrompt(contextSummary, history, leadName);
            Map<String, Object> body = new HashMap<>();
            Map<String, Object> content = new HashMap<>();
            content.put("parts", List.of(Map.of("text", prompt)));
            body.put("contents", List.of(content));

            JsonNode response = webClient.post()
                    .uri("/models/" + model + ":generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(45))
                    .block();

            String text = extractText(response);
            if (text == null || text.isBlank()) {
                return fallbackReply();
            }
            return text.trim();
        } catch (Exception e) {
            log.error("Erro ao gerar resposta Gemini para WhatsApp", e);
            return fallbackReply();
        }
    }

    private String buildPrompt(String contextSummary, List<WhatsAppMessage> history, String leadName) {
        StringBuilder sb = new StringBuilder();
        String basePrompt = systemPrompt != null && !systemPrompt.isBlank()
                ? systemPrompt
                : """
                Você é a assistente virtual comercial da Promover Vigilância Patrimonial.
                Responda em português do Brasil, de forma cordial, objetiva e profissional.
                Ofereça ajuda sobre serviços de vigilância, portaria, ronda e segurança patrimonial.
                Se não souber algo específico de preço ou contrato, diga que um consultor humano pode ajudar.
                Não invente valores. Mensagens curtas (adequadas ao WhatsApp).
                """;
        sb.append(basePrompt.trim()).append("\n\n");
        if (leadName != null && !leadName.isBlank()) {
            sb.append("Nome do contato: ").append(leadName).append("\n");
        }
        if (contextSummary != null && !contextSummary.isBlank()) {
            sb.append("Resumo do atendimento até agora:\n").append(contextSummary).append("\n\n");
        }
        sb.append("Histórico recente da conversa:\n");
        for (WhatsAppMessage msg : history) {
            String role = msg.getSenderType() == WhatsAppMessageSenderType.LEAD ? "Cliente" : "Atendimento";
            sb.append(role).append(": ").append(msg.getBody() != null ? msg.getBody() : "[mídia]").append("\n");
        }
        sb.append("\nResponda apenas com o texto da próxima mensagem para o cliente (sem prefixos como 'Assistente:').");
        return sb.toString();
    }

    private String extractText(JsonNode root) {
        if (root == null) {
            return null;
        }
        JsonNode candidates = root.get("candidates");
        if (candidates != null && candidates.isArray() && !candidates.isEmpty()) {
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (parts.isArray() && !parts.isEmpty()) {
                return parts.get(0).path("text").asText(null);
            }
        }
        return null;
    }

    private String fallbackReply() {
        return "Olá! Obrigado por entrar em contato com a Promover Vigilância. "
                + "Em instantes um de nossos consultores pode te atender. Como posso ajudar?";
    }
}
