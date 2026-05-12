package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailCampaignRecipient;
import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.enums.EmailCampaignStatus;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.repository.EmailCampaignRepository;
import com.z7design.secured_guard.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Onda 2 — Fila e throttling de envio de campanhas.
 *
 * <p>Quando uma campanha é "iniciada", {@code EmailCampaignService.sendCampaign}
 * persiste todos os destinatários como {@link EmailLog} em status
 * {@link EmailLogStatus#PENDING} e marca a campanha como
 * {@link EmailCampaignStatus#RUNNING}. Este serviço é responsável por dar
 * <em>tick</em> nessa fila respeitando os limites configurados:
 *
 * <ul>
 *   <li>{@code dailyLimit} — máximo de envios em 24h corridas.</li>
 *   <li>{@code hourlyLimit} — máximo de envios em 1h corrida.</li>
 *   <li>{@code minIntervalSeconds} — espaçamento mínimo entre dois envios.</li>
 *   <li>{@code totalLimit} — corte global (também respeita
 *       {@code recipients.size()}).</li>
 *   <li>{@code scheduledAt} — só dispara após esse instante.</li>
 * </ul>
 *
 * Também bloqueia envios para endereços já descadastrados e injeta o link
 * de unsubscribe no HTML rendarizado antes de bater no provedor.
 */
@Service
@RequiredArgsConstructor
public class EmailDispatchService {

    private static final Logger LOG = LoggerFactory.getLogger(EmailDispatchService.class);

    private final EmailCampaignRepository campaignRepository;
    private final EmailLogRepository emailLogRepository;
    private final SendGridMailSendService sendGridMailSendService;
    private final SmtpMailSendService smtpMailSendService;
    private final EmailTemplateRenderer renderer;
    private final EmailUnsubscribeService unsubscribeService;

    /**
     * Processa um único envio elegível para a campanha respeitando todos os
     * limites configurados. Retorna {@code true} se algo foi enviado neste
     * tick (sinal para o scheduler tentar novamente em seguida).
     */
    @Transactional
    public boolean tickCampaign(UUID campaignId, DispatchContext ctx) {
        EmailCampaign campaign = campaignRepository.findById(campaignId).orElse(null);
        if (campaign == null) return false;

        EmailCampaignStatus status = campaign.getStatus();
        if (status == EmailCampaignStatus.PAUSED
                || status == EmailCampaignStatus.COMPLETED
                || status == EmailCampaignStatus.CANCELED) {
            return false;
        }

        // Respeita scheduledAt: se ainda no futuro, não dispara.
        Instant now = Instant.now();
        if (campaign.getScheduledAt() != null && now.isBefore(campaign.getScheduledAt())) {
            return false;
        }

        // Promove SCHEDULED -> RUNNING quando chega a hora.
        if (status == EmailCampaignStatus.SCHEDULED) {
            campaign.setStatus(EmailCampaignStatus.RUNNING);
            campaignRepository.save(campaign);
        }

        // Limite global (totalLimit)
        long alreadySent = emailLogRepository.countByCampaign_IdAndSentAtIsNotNull(campaignId);
        if (campaign.getTotalLimit() != null && alreadySent >= campaign.getTotalLimit()) {
            markCompletedIfDrained(campaign);
            return false;
        }

        // Limite diário (últimas 24h)
        if (campaign.getDailyLimit() != null) {
            long inLast24h = emailLogRepository.countSentSinceForCampaign(
                    campaignId, now.minus(Duration.ofHours(24)));
            if (inLast24h >= campaign.getDailyLimit()) {
                return false;
            }
        }

        // Limite horário (últimos 60min)
        if (campaign.getHourlyLimit() != null) {
            long inLastHour = emailLogRepository.countSentSinceForCampaign(
                    campaignId, now.minus(Duration.ofMinutes(60)));
            if (inLastHour >= campaign.getHourlyLimit()) {
                return false;
            }
        }

        // Intervalo mínimo desde o último envio
        if (campaign.getMinIntervalSeconds() != null && campaign.getMinIntervalSeconds() > 0) {
            Optional<EmailLog> last = emailLogRepository
                    .findFirstByCampaign_IdAndSentAtIsNotNullOrderBySentAtDesc(campaignId);
            if (last.isPresent() && last.get().getSentAt() != null) {
                Instant earliestNext = last.get().getSentAt()
                        .plus(Duration.ofSeconds(campaign.getMinIntervalSeconds()));
                if (now.isBefore(earliestNext)) {
                    return false;
                }
            }
        }

        // Pega o próximo PENDING
        List<EmailLog> pending = emailLogRepository.findPendingByCampaignOrderedByCreatedAt(campaignId);
        if (pending.isEmpty()) {
            markCompletedIfDrained(campaign);
            return false;
        }
        EmailLog log = pending.get(0);
        EmailCampaignRecipient recipient = log.getRecipient();
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            log.setStatus(EmailLogStatus.DROPPED);
            log.setBounceReason("Destinatário inválido");
            emailLogRepository.save(log);
            return true;
        }

        // Bloqueia se já descadastrado
        if (unsubscribeService.isUnsubscribed(recipient.getEmail())) {
            log.setStatus(EmailLogStatus.DROPPED);
            log.setBounceReason("Destinatário descadastrado");
            emailLogRepository.save(log);
            return true;
        }

        // Renderiza com unsubscribeUrl real
        Map<String, String> context = buildContext(recipient, ctx, campaign);
        String subject = renderer.renderText(ctx.baseSubject, context);
        String html = renderer.renderHtml(ctx.baseHtml, context);
        html = injectUnsubscribeFooter(html, context.get("unsubscribeUrl"));

        try {
            String messageId = dispatchByProvider(campaign, log, recipient, subject, html);
            log.setProviderMessageId(messageId);
            log.setStatus(EmailLogStatus.SENT);
            log.setSentAt(Instant.now());
        } catch (IOException | jakarta.mail.MessagingException | RuntimeException e) {
            log.setStatus(EmailLogStatus.DROPPED);
            log.setBounceReason(truncate(e.getMessage(), 1000));
            LOG.error("Falha ao enviar e-mail da campanha {} para {}: {}",
                    campaignId, recipient.getEmail(), e.getMessage());
        }
        emailLogRepository.save(log);
        return true;
    }

    /**
     * Roteia o envio entre os provedores suportados. SendGrid é o padrão;
     * campanhas com {@code providerType = SMTP} usam a configuração global
     * gerenciada em {@code SmtpSettings}.
     */
    private String dispatchByProvider(EmailCampaign campaign,
                                      EmailLog log,
                                      EmailCampaignRecipient recipient,
                                      String subject,
                                      String html) throws IOException, jakarta.mail.MessagingException {
        com.z7design.secured_guard.model.enums.EmailProviderType provider = campaign.getProviderType();
        if (provider == com.z7design.secured_guard.model.enums.EmailProviderType.SMTP) {
            return smtpMailSendService.sendHtml(
                    log, recipient.getEmail(), recipient.getName(), subject, html);
        }
        // SENDGRID (default)
        return sendGridMailSendService.sendHtml(
                log, recipient.getEmail(), recipient.getName(), subject, html);
    }

    private void markCompletedIfDrained(EmailCampaign campaign) {
        long pendingLeft = emailLogRepository
                .countByCampaign_IdAndStatus(campaign.getId(), EmailLogStatus.PENDING);
        if (pendingLeft == 0 && campaign.getStatus() == EmailCampaignStatus.RUNNING) {
            campaign.setStatus(EmailCampaignStatus.COMPLETED);
            campaignRepository.save(campaign);
            LOG.info("Campanha {} marcada como COMPLETED (fila zerada).", campaign.getId());
        }
    }

    private Map<String, String> buildContext(EmailCampaignRecipient r, DispatchContext ctx, EmailCampaign campaign) {
        Map<String, String> map = new HashMap<>();
        map.put("nomeContato", r.getName() != null ? r.getName() : "");
        map.put("email", r.getEmail() != null ? r.getEmail() : "");
        if (r.getMetadata() != null) {
            for (Map.Entry<String, Object> e : r.getMetadata().entrySet()) {
                if (e.getValue() != null) map.put(e.getKey(), e.getValue().toString());
            }
            putAlias(map, "nomeEmpresa", r.getMetadata().get("company"));
            putAlias(map, "cargo", r.getMetadata().get("position"));
            putAlias(map, "telefone", r.getMetadata().get("phone"));
            putAlias(map, "celular", r.getMetadata().get("mobile"));
        }
        if (ctx.extras != null) map.putAll(ctx.extras);
        // unsubscribe — sempre presente, mesmo quando base-url não está configurada
        String unsubUrl = unsubscribeService.buildUnsubscribeUrl(r.getEmail(), campaign);
        map.put("unsubscribeUrl", unsubUrl);
        return map;
    }

    private static void putAlias(Map<String, String> ctx, String alias, Object value) {
        if (value != null && !ctx.containsKey(alias)) {
            ctx.put(alias, value.toString());
        }
    }

    /**
     * Garante que o HTML contenha um link de descadastro. Se o template já
     * referenciou {@code {{unsubscribeUrl}}}, ele foi substituído pelo render
     * e este método é no-op (procuramos a URL no HTML). Caso contrário,
     * acrescentamos um rodapé padrão.
     */
    private static String injectUnsubscribeFooter(String html, String unsubscribeUrl) {
        if (html == null) return null;
        if (unsubscribeUrl == null || unsubscribeUrl.isBlank() || "#".equals(unsubscribeUrl)) {
            return html;
        }
        if (html.contains(unsubscribeUrl)) {
            return html;
        }
        String footer = "<div style=\"margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;"
                + "color:#6b7280;font-size:12px;font-family:Arial,sans-serif;text-align:center\">"
                + "Caso não deseje mais receber estas mensagens, "
                + "<a href=\"" + unsubscribeUrl + "\" style=\"color:#2563eb\">cancele sua inscrição</a>."
                + "</div>";
        int idx = html.toLowerCase().lastIndexOf("</body>");
        if (idx >= 0) {
            return html.substring(0, idx) + footer + html.substring(idx);
        }
        return html + footer;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    /** Indica se é "horário decente" para envios — usado pelo scheduler global. */
    public static boolean isWithinSendWindow(ZoneId tz) {
        int hour = ZonedDateTime.now(tz).getHour();
        // Janela conservadora 7h–22h local; ajustar via configuração futura.
        return hour >= 7 && hour < 22;
    }

    /** Contexto carregado antes de iterar a fila — evita re-resolver o template a cada tick. */
    public record DispatchContext(String baseSubject, String baseHtml, Map<String, String> extras) {}
}
