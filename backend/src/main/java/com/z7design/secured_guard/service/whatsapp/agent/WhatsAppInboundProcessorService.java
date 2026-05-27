package com.z7design.secured_guard.service.whatsapp.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.WhatsAppConversation;
import com.z7design.secured_guard.model.WhatsAppMessage;
import com.z7design.secured_guard.model.enums.WhatsAppConversationMode;
import com.z7design.secured_guard.model.enums.WhatsAppMessageDirection;
import com.z7design.secured_guard.model.enums.WhatsAppMessageSenderType;
import com.z7design.secured_guard.service.whatsapp.WhatsAppAgentService;
import com.z7design.secured_guard.service.whatsapp.WhatsAppPhoneUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppInboundProcessorService {

    private final WhatsAppAgentConversationService conversationService;
    private final WhatsAppGeminiChatService geminiChatService;
    private final WhatsAppAgentService whatsAppAgentService;
    private final WhatsAppSystemOutboundTracker outboundTracker;
    private final ObjectMapper objectMapper;

    @Value("${whatsapp.agent.ai.enabled:true}")
    private boolean aiEnabled;

    @Async
    public void processEvolutionWebhookAsync(String rawBody) {
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            processEvolutionPayload(root, rawBody);
        } catch (Exception e) {
            log.error("Falha ao processar webhook Evolution WhatsApp", e);
        }
    }

    public void processEvolutionPayload(JsonNode root, String rawBody) {
        String event = textOrEmpty(root, "event");
        if (event.isBlank()) {
            event = textOrEmpty(root.path("data"), "event");
        }
        String eventLower = event.toLowerCase();
        if (!eventLower.contains("message")) {
            log.debug("Webhook Evolution ignorado (evento={})", event);
            return;
        }

        JsonNode data = root.has("data") ? root.get("data") : root;
        if (data.isArray()) {
            for (JsonNode item : data) {
                handleMessageNode(item, rawBody, "evolution");
            }
            return;
        }
        handleMessageNode(data, rawBody, "evolution");
    }

    private void handleMessageNode(JsonNode data, String rawBody, String providerType) {
        JsonNode key = data.path("key");
        boolean fromMe = key.path("fromMe").asBoolean(false);
        String remoteJid = textOrEmpty(key, "remoteJid");
        if (remoteJid.isBlank()) {
            remoteJid = textOrEmpty(data, "remoteJid");
        }
        String phone = jidToPhone(remoteJid);
        if (phone.isBlank()) {
            log.warn("Webhook WhatsApp sem telefone válido: {}", remoteJid);
            return;
        }

        String externalId = textOrEmpty(key, "id");
        String contactName = textOrEmpty(data, "pushName");
        ParsedContent content = extractContent(data.path("message"));
        if (content.body == null || content.body.isBlank()) {
            if (!content.hasMedia) {
                return;
            }
            content.body = content.mediaLabel != null ? content.mediaLabel : "[mídia]";
        }

        WhatsAppConversation conversation = conversationService.getOrCreateConversation(
                phone, contactName, providerType);

        if (fromMe) {
            handleOutboundFromDevice(conversation, content, externalId, providerType, rawBody);
            return;
        }

        conversationService.appendMessage(
                conversation,
                WhatsAppMessageDirection.INBOUND,
                WhatsAppMessageSenderType.LEAD,
                content.body,
                null,
                externalId,
                providerType,
                rawBody,
                content.mediaUrl,
                content.mediaType);

        if (conversation.getMode() == WhatsAppConversationMode.HUMAN_HANDOFF) {
            log.debug("IA em pausa para {} — mensagem do lead gravada", phone);
            return;
        }

        if (!aiEnabled || !geminiChatService.isEnabled()) {
            log.debug("IA desabilitada — apenas persistência para {}", phone);
            return;
        }

        replyWithAi(conversation, providerType);
    }

    private void handleOutboundFromDevice(
            WhatsAppConversation conversation,
            ParsedContent content,
            String externalId,
            String providerType,
            String rawBody) {

        String phone = conversation.getPhoneNumber();
        if (outboundTracker.wasRecentSystemSend(phone)) {
            conversationService.appendMessage(
                    conversation,
                    WhatsAppMessageDirection.OUTBOUND,
                    detectRecentSenderType(conversation),
                    content.body,
                    null,
                    externalId,
                    providerType,
                    rawBody,
                    content.mediaUrl,
                    content.mediaType);
            return;
        }

        if (conversation.getMode() != WhatsAppConversationMode.HUMAN_HANDOFF) {
            conversationService.switchToHumanHandoff(conversation, null);
            conversation = conversationService.findById(conversation.getId()).orElse(conversation);
        }

        conversationService.appendMessage(
                conversation,
                WhatsAppMessageDirection.OUTBOUND,
                WhatsAppMessageSenderType.HUMAN,
                content.body,
                null,
                externalId,
                providerType,
                rawBody,
                content.mediaUrl,
                content.mediaType);
        log.info("Atendimento humano detectado no app WhatsApp para {}", phone);
    }

    private WhatsAppMessageSenderType detectRecentSenderType(WhatsAppConversation conversation) {
        List<WhatsAppMessage> history = conversationService.loadContextHistory(conversation.getId());
        for (int i = history.size() - 1; i >= 0; i--) {
            WhatsAppMessageSenderType t = history.get(i).getSenderType();
            if (t == WhatsAppMessageSenderType.AI || t == WhatsAppMessageSenderType.HUMAN) {
                return t;
            }
        }
        return WhatsAppMessageSenderType.AI;
    }

    private void replyWithAi(WhatsAppConversation conversation, String providerType) {
        String leadName = conversation.getLead() != null
                ? conversation.getLead().getName()
                : conversation.getContactName();

        List<WhatsAppMessage> history = conversationService.loadContextHistory(conversation.getId());
        String reply = geminiChatService.generateReply(
                conversation.getContextSummary(), history, leadName);

        boolean sent = whatsAppAgentService.sendTextMessage(conversation.getPhoneNumber(), reply);
        if (!sent) {
            log.warn("Falha ao enviar resposta IA para {}", conversation.getPhoneNumber());
            return;
        }

        outboundTracker.markSystemSend(conversation.getPhoneNumber());
        conversationService.appendMessage(
                conversation,
                WhatsAppMessageDirection.OUTBOUND,
                WhatsAppMessageSenderType.AI,
                reply,
                null,
                null,
                providerType,
                null,
                null,
                null);
    }

    public boolean sendHumanMessage(WhatsAppConversation conversation, User human, String body) {
        if (conversation.getMode() != WhatsAppConversationMode.HUMAN_HANDOFF) {
            conversationService.switchToHumanHandoff(conversation, human);
        } else if (human != null && conversation.getAssignedUser() == null) {
            conversationService.assignUser(conversation, human);
        }

        boolean sent = whatsAppAgentService.sendTextMessage(conversation.getPhoneNumber(), body);
        if (!sent) {
            return false;
        }
        outboundTracker.markSystemSend(conversation.getPhoneNumber());
        conversationService.appendMessage(
                conversation,
                WhatsAppMessageDirection.OUTBOUND,
                WhatsAppMessageSenderType.HUMAN,
                body,
                human,
                null,
                conversation.getProviderType(),
                null,
                null,
                null);
        return true;
    }

    public boolean sendAiMessageTracked(WhatsAppConversation conversation, String body, String providerType) {
        boolean sent = whatsAppAgentService.sendTextMessage(conversation.getPhoneNumber(), body);
        if (!sent) {
            return false;
        }
        outboundTracker.markSystemSend(conversation.getPhoneNumber());
        conversationService.appendMessage(
                conversation,
                WhatsAppMessageDirection.OUTBOUND,
                WhatsAppMessageSenderType.AI,
                body,
                null,
                null,
                providerType,
                null,
                null,
                null);
        return true;
    }

    private String jidToPhone(String jid) {
        if (jid == null || jid.isBlank()) {
            return "";
        }
        String digits = jid.split("@")[0].replaceAll("[^0-9]", "");
        return WhatsAppPhoneUtil.normalize(digits);
    }

    private ParsedContent extractContent(JsonNode message) {
        ParsedContent p = new ParsedContent();
        if (message == null || message.isMissingNode()) {
            return p;
        }
        if (message.has("conversation")) {
            p.body = message.get("conversation").asText();
            return p;
        }
        if (message.has("extendedTextMessage")) {
            p.body = message.path("extendedTextMessage").path("text").asText(null);
            return p;
        }
        if (message.has("imageMessage")) {
            p.hasMedia = true;
            p.mediaType = "image";
            p.mediaLabel = "[imagem]";
            p.body = message.path("imageMessage").path("caption").asText(null);
            return p;
        }
        if (message.has("documentMessage")) {
            p.hasMedia = true;
            p.mediaType = "document";
            p.mediaLabel = "[documento]";
            p.body = message.path("documentMessage").path("caption").asText(null);
            return p;
        }
        if (message.has("audioMessage")) {
            p.hasMedia = true;
            p.mediaType = "audio";
            p.mediaLabel = "[áudio]";
            return p;
        }
        if (message.has("videoMessage")) {
            p.hasMedia = true;
            p.mediaType = "video";
            p.mediaLabel = "[vídeo]";
            p.body = message.path("videoMessage").path("caption").asText(null);
            return p;
        }
        return p;
    }

    private String textOrEmpty(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) {
            return "";
        }
        JsonNode v = node.get(field);
        return v != null && !v.isNull() ? v.asText("").trim() : "";
    }

    private static class ParsedContent {
        String body;
        String mediaUrl;
        String mediaType;
        String mediaLabel;
        boolean hasMedia;
    }
}
