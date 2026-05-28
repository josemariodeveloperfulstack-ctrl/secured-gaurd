package com.z7design.secured_guard.service.sendgrid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.EmailWebhookEvent;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.repository.EmailLogRepository;
import com.z7design.secured_guard.repository.EmailWebhookEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendGridEmailEventProcessor {

    private final ObjectMapper objectMapper;
    private final EmailLogRepository emailLogRepository;
    private final EmailWebhookEventRepository emailWebhookEventRepository;
    private final RecipientLeadAutoCreationService recipientLeadAutoCreationService;
    private final EmailMarketingRejectionService emailMarketingRejectionService;

    @Transactional
    public void processPayload(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            if (!root.isArray()) {
                log.warn("SendGrid webhook: JSON não é array, ignorando");
                return;
            }
            for (JsonNode event : root) {
                try {
                    applySingleEvent(event);
                } catch (Exception e) {
                    log.warn("SendGrid webhook: erro em evento individual: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("SendGrid webhook: falha ao processar payload", e);
        }
    }

    private void applySingleEvent(JsonNode event) {
        String sgEventId = event.hasNonNull("sg_event_id")
                ? event.get("sg_event_id").asText()
                : DigestUtils.sha256Hex(event.toString()).substring(0, 64);

        if (emailWebhookEventRepository.existsById(sgEventId)) {
            return;
        }

        Optional<EmailLog> logOpt = resolveLog(event);
        if (logOpt.isEmpty()) {
            log.debug(
                    "SendGrid webhook: log não encontrado para evento {} tipo={} email={} sg_message_id={}",
                    sgEventId,
                    event.has("event") ? event.get("event").asText() : "",
                    event.has("email") ? event.get("email").asText() : "",
                    event.has("sg_message_id") ? event.get("sg_message_id").asText() : "");
            emailWebhookEventRepository.save(EmailWebhookEvent.builder()
                    .sgEventId(sgEventId)
                    .processedAt(Instant.now())
                    .payloadSnippet(truncate(event.toString()))
                    .build());
            return;
        }

        EmailLog emailLog = logOpt.get();
        String ev = event.has("event") ? event.get("event").asText() : "";
        Instant ts = extractTimestamp(event);

        switch (ev) {
            case "processed" -> promoteStatus(emailLog, EmailLogStatus.SENT, ts, false);
            case "delivered" -> {
                promoteStatus(emailLog, EmailLogStatus.DELIVERED, ts, false);
                if (emailLog.getDeliveredAt() == null) {
                    emailLog.setDeliveredAt(ts);
                }
            }
            case "open" -> {
                promoteStatus(emailLog, EmailLogStatus.OPENED, ts, false);
                if (emailLog.getReadAt() == null) {
                    emailLog.setReadAt(ts);
                }
                tryAutoCreateLead(emailLog);
            }
            case "click" -> {
                promoteStatus(emailLog, EmailLogStatus.CLICKED, ts, false);
                if (emailLog.getClickedAt() == null) {
                    emailLog.setClickedAt(ts);
                }
                if (emailLog.getReadAt() == null) {
                    emailLog.setReadAt(ts);
                }
                tryAutoCreateLead(emailLog);
            }
            case "bounce", "blocked" -> {
                emailLog.setStatus(EmailLogStatus.BOUNCED);
                String reason = buildBounceReason(event);
                emailLog.setBounceReason(reason);
                emailMarketingRejectionService.registerRejection(emailLog, reason);
            }
            case "dropped" -> {
                if (emailLog.getStatus() != EmailLogStatus.BOUNCED) {
                    emailLog.setStatus(EmailLogStatus.DROPPED);
                    String reason = buildBounceReason(event);
                    emailLog.setBounceReason(reason);
                    emailMarketingRejectionService.registerRejection(emailLog, reason);
                }
            }
            case "deferred" -> promoteStatus(emailLog, EmailLogStatus.DEFERRED, ts, false);
            default -> log.debug("SendGrid webhook: evento '{}' sem mapeamento explícito", ev);
        }

        emailLogRepository.save(emailLog);
        emailWebhookEventRepository.save(EmailWebhookEvent.builder()
                .sgEventId(sgEventId)
                .processedAt(Instant.now())
                .payloadSnippet(truncate(event.toString()))
                .build());
    }

    /** Aciona o serviço de auto-criação de Lead se o destinatário ainda não tiver vínculo. */
    private void tryAutoCreateLead(EmailLog emailLog) {
        try {
            if (emailLog.getRecipient() != null && emailLog.getRecipient().getLead() == null) {
                recipientLeadAutoCreationService.ensureLeadFor(emailLog.getRecipient());
            }
        } catch (Exception e) {
            log.warn("Falha ao auto-criar Lead a partir do recipient {}: {}",
                    emailLog.getRecipient() != null ? emailLog.getRecipient().getId() : null,
                    e.getMessage());
        }
    }

    private static String buildBounceReason(JsonNode event) {
        StringBuilder sb = new StringBuilder();
        if (event.has("reason")) {
            sb.append(event.get("reason").asText());
        }
        if (event.has("status")) {
            if (sb.length() > 0) {
                sb.append(" | ");
            }
            sb.append("status=").append(event.get("status").asText());
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    private Optional<EmailLog> resolveLog(JsonNode event) {
        Optional<EmailLog> byUuid = resolveEmailLogIdFromEvent(event);
        if (byUuid.isPresent()) {
            return byUuid;
        }
        String rawMid = extractSgMessageId(event);
        if (rawMid == null || rawMid.isBlank()) {
            return Optional.empty();
        }
        String mid = normalizeMessageId(rawMid);
        Optional<EmailLog> exact = emailLogRepository.findByProviderMessageId(mid);
        if (exact.isPresent()) {
            return exact;
        }
        List<EmailLog> fuzzy = emailLogRepository.findByProviderMessageIdFuzzy(mid, PageRequest.of(0, 3));
        if (!fuzzy.isEmpty()) {
            return Optional.of(fuzzy.get(0));
        }
        return Optional.empty();
    }

    private Optional<EmailLog> resolveEmailLogIdFromEvent(JsonNode event) {
        Optional<EmailLog> id = tryEmailLogUuid(event, "email_log_id");
        if (id.isPresent()) {
            return id;
        }
        for (String field : List.of("unique_args", "custom_args")) {
            if (!event.has(field) || event.get(field).isNull()) {
                continue;
            }
            JsonNode node = event.get(field);
            if (node.isObject()) {
                id = tryEmailLogUuid(node, "email_log_id");
                if (id.isPresent()) {
                    return id;
                }
            } else if (node.isTextual()) {
                try {
                    JsonNode inner = objectMapper.readTree(node.asText());
                    if (inner.isObject()) {
                        id = tryEmailLogUuid(inner, "email_log_id");
                        if (id.isPresent()) {
                            return id;
                        }
                    }
                } catch (Exception ignored) {
                    // não é JSON
                }
            }
        }
        return Optional.empty();
    }

    private Optional<EmailLog> tryEmailLogUuid(JsonNode node, String key) {
        if (node == null || !node.hasNonNull(key)) {
            return Optional.empty();
        }
        try {
            UUID uuid = UUID.fromString(node.get(key).asText());
            return emailLogRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * {@code sg_message_id} costuma existir em todos os eventos; em alguns casos
     * só há {@code smtp-id} com o identificador interno (prefixo útil para match).
     */
    private static String extractSgMessageId(JsonNode event) {
        if (event.hasNonNull("sg_message_id")) {
            return event.get("sg_message_id").asText();
        }
        if (event.hasNonNull("smtp-id")) {
            String smtpId = event.get("smtp-id").asText();
            if (smtpId == null) {
                return null;
            }
            String t = smtpId.trim();
            if (t.startsWith("<") && t.contains("@")) {
                int at = t.indexOf('@');
                return t.substring(1, at);
            }
        }
        return null;
    }

    private static String normalizeMessageId(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.trim().replace("<", "").replace(">", "");
    }

    private static Instant extractTimestamp(JsonNode event) {
        if (event.has("timestamp")) {
            long sec = event.get("timestamp").asLong(0L);
            return Instant.ofEpochSecond(sec);
        }
        return Instant.now();
    }

    /**
     * Atualiza status se o novo rankear acima do atual (exceto {@code BOUNCED} que permanece).
     */
    private void promoteStatus(EmailLog log, EmailLogStatus proposed, Instant at, boolean force) {
        if (log.getStatus() == EmailLogStatus.BOUNCED && proposed != EmailLogStatus.BOUNCED) {
            return;
        }
        if (force || rank(proposed) >= rank(log.getStatus())) {
            log.setStatus(proposed);
        }
        if (proposed == EmailLogStatus.SENT && log.getSentAt() == null) {
            log.setSentAt(at);
        }
    }

    private static int rank(EmailLogStatus s) {
        if (s == null) {
            return 0;
        }
        return switch (s) {
            case BOUNCED, DROPPED -> 100;
            case REPLIED -> 90;
            case CLICKED -> 70;
            case OPENED -> 60;
            case DELIVERED -> 50;
            case SENT, DEFERRED -> 40;
            case PENDING -> 10;
        };
    }

    private static String truncate(String s) {
        if (s == null) {
            return null;
        }
        byte[] b = s.getBytes(StandardCharsets.UTF_8);
        if (b.length <= 500) {
            return s;
        }
        return new String(b, 0, 500, StandardCharsets.UTF_8);
    }

}
