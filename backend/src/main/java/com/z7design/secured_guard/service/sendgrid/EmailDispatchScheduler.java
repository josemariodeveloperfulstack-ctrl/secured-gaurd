package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailTemplate;
import com.z7design.secured_guard.model.enums.EmailCampaignStatus;
import com.z7design.secured_guard.repository.EmailCampaignRepository;
import com.z7design.secured_guard.repository.EmailTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Scheduler global que acorda a cada 30 segundos, lista campanhas em estado
 * "ativo" (SCHEDULED ou RUNNING) e tenta despachar 1 envio por campanha por
 * tick. Quem decide se pode enviar agora é {@link EmailDispatchService}, que
 * respeita os limites e o intervalo mínimo.
 *
 * <p>O contexto de envio (template/subject/HTML/extras) é cacheado por
 * campanha em memória — preenchido por
 * {@link #registerContext(UUID, EmailDispatchService.DispatchContext)} no
 * momento em que a campanha é iniciada. Se a aplicação reinicia, o contexto
 * é reconstruído a partir do {@link EmailCampaign#getDefaultTemplate()}.
 */
@Component
@RequiredArgsConstructor
public class EmailDispatchScheduler {

    private static final Logger LOG = LoggerFactory.getLogger(EmailDispatchScheduler.class);

    /** Máximo de envios processados num único tick (proteção contra long-tx). */
    private static final int MAX_DISPATCHES_PER_TICK = 50;

    private final EmailCampaignRepository campaignRepository;
    private final EmailTemplateRepository emailTemplateRepository;
    private final EmailDispatchService dispatchService;

    @Value("${app.email.dispatch.enabled:true}")
    private boolean enabled;

    /** Contexto de envio por campanha — mantido em memória entre ticks. */
    private final Map<UUID, EmailDispatchService.DispatchContext> contexts = new ConcurrentHashMap<>();

    /** Permite que {@code EmailCampaignService} avise qual subject/HTML usar. */
    public void registerContext(UUID campaignId, EmailDispatchService.DispatchContext ctx) {
        if (campaignId != null && ctx != null) {
            contexts.put(campaignId, ctx);
        }
    }

    public void clearContext(UUID campaignId) {
        if (campaignId != null) {
            contexts.remove(campaignId);
        }
    }

    @Scheduled(fixedDelayString = "${app.email.dispatch.delay-ms:30000}",
               initialDelayString = "${app.email.dispatch.initial-delay-ms:15000}")
    public void tick() {
        if (!enabled) return;
        try {
            List<EmailCampaign> active = campaignRepository.findByStatusIn(
                    List.of(EmailCampaignStatus.RUNNING, EmailCampaignStatus.SCHEDULED));
            if (active.isEmpty()) return;

            int dispatched = 0;
            for (EmailCampaign c : active) {
                EmailDispatchService.DispatchContext ctx = contextFor(c);
                if (ctx == null) {
                    continue; // sem template padrão -> não conseguimos enviar
                }
                // Cada campanha tenta um envio por tick. Se o serviço retorna
                // true, há chance de mais envios; permitimos até MAX por tick.
                while (dispatched < MAX_DISPATCHES_PER_TICK
                        && dispatchService.tickCampaign(c.getId(), ctx)) {
                    dispatched++;
                }
                if (dispatched >= MAX_DISPATCHES_PER_TICK) break;
            }
            if (dispatched > 0) {
                LOG.debug("EmailDispatchScheduler: {} envios neste tick.", dispatched);
            }
        } catch (Exception e) {
            // Nunca deixar a exceção propagar — interromperia o agendamento.
            LOG.error("Erro no EmailDispatchScheduler.tick(): {}", e.getMessage(), e);
        }
    }

    /**
     * Recupera o contexto cacheado, ou reconstrói usando o
     * {@link EmailCampaign#getDefaultTemplate()} (útil após restart da app).
     */
    @Transactional(readOnly = true)
    public EmailDispatchService.DispatchContext contextFor(EmailCampaign campaign) {
        EmailDispatchService.DispatchContext cached = contexts.get(campaign.getId());
        if (cached != null) return cached;

        EmailTemplate template = campaign.getDefaultTemplate();
        if (template == null && campaign.getTemplateId() != null) {
            try {
                template = emailTemplateRepository
                        .findById(UUID.fromString(campaign.getTemplateId()))
                        .orElse(null);
            } catch (IllegalArgumentException ignored) {
                template = null;
            }
        }
        if (template == null || Boolean.FALSE.equals(template.getIsActive())) {
            return null;
        }
        EmailDispatchService.DispatchContext rebuilt = new EmailDispatchService.DispatchContext(
                template.getSubject(), template.getHtmlBody(), new HashMap<>());
        contexts.put(campaign.getId(), rebuilt);
        return rebuilt;
    }
}
