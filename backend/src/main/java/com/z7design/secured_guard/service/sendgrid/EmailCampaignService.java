package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.dto.sendgrid.CreateEmailCampaignRequest;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignMetricsDto;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignRecipientDto;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignSummaryDto;
import com.z7design.secured_guard.dto.sendgrid.EmailLogRowDto;
import com.z7design.secured_guard.dto.sendgrid.InactiveEmailRecipientDto;
import com.z7design.secured_guard.dto.sendgrid.SendEmailCampaignRequest;
import com.z7design.secured_guard.dto.sendgrid.UpdateInactiveEmailRecipientRequest;
import com.z7design.secured_guard.dto.sendgrid.UpdateEmailCampaignRequest;
import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailCampaignRecipient;
import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.EmailMarketingRejectedAddress;
import com.z7design.secured_guard.model.EmailTemplate;
import com.z7design.secured_guard.model.enums.EmailCampaignStatus;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.model.enums.EmailProviderType;
import com.z7design.secured_guard.model.enums.RecipientSourceType;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.EmailCampaignRecipientRepository;
import com.z7design.secured_guard.repository.EmailCampaignRepository;
import com.z7design.secured_guard.repository.EmailLogRepository;
import com.z7design.secured_guard.repository.EmailTemplateRepository;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmailCampaignService {

    private final EmailCampaignRepository campaignRepository;
    private final EmailCampaignRecipientRepository recipientRepository;
    private final EmailLogRepository emailLogRepository;
    private final EmailTemplateRepository emailTemplateRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final EmailDispatchService dispatchService;
    private final EmailDispatchScheduler dispatchScheduler;
    private final EmailMarketingRejectionService emailMarketingRejectionService;

    @Transactional
    public EmailCampaign create(CreateEmailCampaignRequest request) {
        EmailCampaign campaign = EmailCampaign.builder()
                .title(request.title())
                .description(request.description())
                .templateId(request.templateId())
                .totalLimit(request.totalLimit())
                .dailyLimit(request.dailyLimit())
                .hourlyLimit(request.hourlyLimit())
                .minIntervalSeconds(request.minIntervalSeconds())
                .scheduledAt(request.scheduledAt())
                .build();
        if (request.providerType() != null && !request.providerType().isBlank()) {
            try {
                campaign.setProviderType(
                        com.z7design.secured_guard.model.enums.EmailProviderType.valueOf(
                                request.providerType().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                // mantém SENDGRID default
            }
        }
        if (request.defaultTemplateId() != null) {
            EmailTemplate t = emailTemplateRepository.findById(request.defaultTemplateId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template padrão não encontrado"));
            campaign.setDefaultTemplate(t);
        }
        // Status: SCHEDULED se há scheduledAt futuro, senão DRAFT
        if (request.scheduledAt() != null && request.scheduledAt().isAfter(Instant.now())) {
            campaign.setStatus(com.z7design.secured_guard.model.enums.EmailCampaignStatus.SCHEDULED);
        }
        // Autor da campanha = usuário autenticado (se houver)
        currentUser().ifPresent(campaign::setCreatedBy);

        for (EmailCampaignRecipientDto dto : request.recipients()) {
            attachRecipientFromDto(campaign, dto);
        }
        return campaignRepository.save(campaign);
    }

    private void attachRecipientFromDto(EmailCampaign campaign, EmailCampaignRecipientDto dto) {
        if (dto == null || dto.email() == null || dto.email().isBlank()) {
            return;
        }
        String email = dto.email().trim();
        if (!looksLikeEmail(email)) {
            return;
        }
        String name = dto.name();
        if (name != null && name.length() > 500) {
            name = name.substring(0, 500);
        }
        EmailCampaignRecipient r = EmailCampaignRecipient.builder()
                .campaign(campaign)
                .email(email)
                .name(name)
                .metadata(dto.metadata() != null ? new HashMap<>(dto.metadata()) : new HashMap<>())
                .build();
        if (dto.sourceType() != null && !dto.sourceType().isBlank()) {
            try {
                r.setSourceType(RecipientSourceType.valueOf(dto.sourceType().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                // mantém MANUAL default
            }
        }
        if (dto.leadId() != null) {
            Lead lead = leadRepository.findById(dto.leadId()).orElse(null);
            if (lead != null) {
                r.setLead(lead);
                r.setSourceType(RecipientSourceType.LEAD);
            }
        }
        campaign.getRecipients().add(r);
    }

    /**
     * Acrescenta destinatários a uma campanha em {@link EmailCampaignStatus#DRAFT},
     * ignorando duplicados pelo e-mail (case-insensitive).
     */
    @Transactional
    public EmailCampaign appendRecipients(UUID campaignId, List<EmailCampaignRecipientDto> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return get(campaignId);
        }
        EmailCampaign campaign = get(campaignId);
        if (campaign.getStatus() != EmailCampaignStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Somente campanhas em rascunho permitem adicionar destinatários.");
        }
        java.util.Set<String> seen = campaign.getRecipients().stream()
                .map(r -> r.getEmail().toLowerCase())
                .collect(Collectors.toSet());
        for (EmailCampaignRecipientDto dto : dtos) {
            if (dto == null || dto.email() == null || dto.email().isBlank()) {
                continue;
            }
            if (!looksLikeEmail(dto.email().trim())) {
                continue;
            }
            String key = dto.email().trim().toLowerCase();
            if (seen.contains(key)) {
                continue;
            }
            if (emailMarketingRejectionService.isRejected(dto.email())) {
                continue;
            }
            seen.add(key);
            attachRecipientFromDto(campaign, dto);
        }
        return campaignRepository.save(campaign);
    }

    /** Usuário autenticado, se houver, resolvido via repositório. */
    private java.util.Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return java.util.Optional.empty();
        }
        String username = auth.getName();
        if (username == null || username.isBlank()) return java.util.Optional.empty();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username));
    }

    @Transactional(readOnly = true)
    public EmailCampaign get(UUID id) {
        return campaignRepository.findWithRecipientsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campanha não encontrada"));
    }

    /**
     * Inicia a campanha (Onda 2): persiste os destinatários como {@code EmailLog}
     * em status {@code PENDING}, marca a campanha como {@code RUNNING} (ou
     * {@code SCHEDULED} se há {@code scheduledAt} futuro) e registra o contexto
     * de envio no scheduler global, que respeitará daily/hourly/intervalo.
     *
     * <p>O método não bloqueia até o término do envio — a campanha vai
     * fluindo via {@link EmailDispatchScheduler}. Em campanhas {@code COMPLETED}
     * ou {@code CANCELED}, os logs são resetados para {@code PENDING} antes do
     * novo disparo (reenvio). Nos demais estados, logs já existentes não são
     * recriados, então é seguro chamar este endpoint mais de uma vez.
     */
    @Transactional
    public void sendCampaign(UUID campaignId, SendEmailCampaignRequest request) {
        EmailCampaign campaign = get(campaignId);
        List<EmailCampaignRecipient> recipients = recipientRepository.findByCampaign_IdAndEmailMarketingSuppressedFalse(campaignId);
        if (recipients.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campanha sem destinatários");
        }
        // Clique manual em "Enviar/Reenviar" sempre prioriza disparo imediato.
        // Se já há histórico, convertemos para nova rodada (todos voltam a PENDING).
        List<EmailLog> existingLogs = emailLogRepository.findByCampaign_IdOrderByCreatedAtDesc(campaignId);
        if (!existingLogs.isEmpty()) {
            resetLogsForResend(campaignId);
        }

        // Resolve template vs envio manual
        String baseSubject;
        String baseHtml;
        if (request.templateId() != null) {
            EmailTemplate template = emailTemplateRepository.findById(request.templateId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template não encontrado"));
            if (Boolean.FALSE.equals(template.getIsActive())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template inativo");
            }
            baseSubject = template.getSubject();
            baseHtml = template.getHtmlBody();
        } else if (campaign.getDefaultTemplate() != null) {
            EmailTemplate template = campaign.getDefaultTemplate();
            if (Boolean.FALSE.equals(template.getIsActive())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template padrão da campanha está inativo");
            }
            baseSubject = template.getSubject();
            baseHtml = template.getHtmlBody();
        } else {
            if (request.subject() == null || request.subject().isBlank()
                    || request.htmlBody() == null || request.htmlBody().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Informe um templateId ou subject + htmlBody (ou configure um template padrão na campanha)");
            }
            baseSubject = request.subject();
            baseHtml = request.htmlBody();
        }

        Map<String, String> extras = request.extraVariables() != null
                ? new HashMap<>(request.extraVariables()) : new HashMap<>();

        // Cria EmailLog PENDING para cada destinatário que ainda não tenha um log.
        java.util.Set<UUID> alreadyWithLog = emailLogRepository
                .findByCampaign_IdOrderByCreatedAtDesc(campaignId).stream()
                .map(l -> l.getRecipient() != null ? l.getRecipient().getId() : null)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        for (EmailCampaignRecipient recipient : recipients) {
            if (alreadyWithLog.contains(recipient.getId())) continue;
            EmailLog log = EmailLog.builder()
                    .campaign(campaign)
                    .recipient(recipient)
                    .status(EmailLogStatus.PENDING)
                    .build();
            emailLogRepository.save(log);
        }

        // Ação manual de envio deve começar na hora, mesmo que a campanha estivesse agendada.
        campaign.setStatus(com.z7design.secured_guard.model.enums.EmailCampaignStatus.RUNNING);
        campaignRepository.save(campaign);

        // Registra contexto no scheduler para evitar relookup de template.
        dispatchScheduler.registerContext(
                campaignId, new EmailDispatchService.DispatchContext(baseSubject, baseHtml, extras));

        // Tick imediato: tenta enviar logo o primeiro lote sem esperar 30s do scheduler.
        if (campaign.getStatus() == com.z7design.secured_guard.model.enums.EmailCampaignStatus.RUNNING) {
            for (int i = 0; i < 10; i++) {
                boolean sent = dispatchService.tickCampaign(campaignId,
                        new EmailDispatchService.DispatchContext(baseSubject, baseHtml, extras));
                if (!sent) break;
            }
        }
    }

    @Transactional(readOnly = true)
    public List<InactiveEmailRecipientDto> listInactiveRecipients(UUID campaignId) {
        get(campaignId);
        return emailMarketingRejectionService.listByCampaign(campaignId).stream()
                .map(this::toInactiveRecipientDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> findRejectedAmong(List<String> emails) {
        return emailMarketingRejectionService.findRejectedAmong(emails);
    }

    private InactiveEmailRecipientDto toInactiveRecipientDto(EmailMarketingRejectedAddress rejected) {
        UUID rowId = rejected.getRecipientId() != null ? rejected.getRecipientId() : rejected.getId();
        return new InactiveEmailRecipientDto(
                rowId,
                rejected.getEmail(),
                rejected.getName(),
                rejected.getReason(),
                rejected.getRejectedAt());
    }

    @Transactional
    public InactiveEmailRecipientDto updateInactiveRecipient(UUID campaignId, UUID recipientId,
            UpdateInactiveEmailRecipientRequest request) {
        EmailMarketingRejectedAddress rejected = emailMarketingRejectionService
                .findByCampaignAndRowId(campaignId, recipientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "E-mail rejeitado não encontrado"));
        String newEmail = request.email().trim();
        String newName = request.name() != null ? request.name().trim() : null;

        if (Boolean.TRUE.equals(request.reactivate())) {
            emailMarketingRejectionService.removeFromRejectedList(rejected.getEmail());
            if (rejected.getRecipientId() != null) {
                recipientRepository.findById(rejected.getRecipientId()).ifPresent(r -> {
                    r.setEmailMarketingSuppressed(false);
                    r.setEmail(newEmail);
                    r.setName(newName);
                    recipientRepository.save(r);
                });
            }
            return new InactiveEmailRecipientDto(
                    rejected.getRecipientId() != null ? rejected.getRecipientId() : rejected.getId(),
                    newEmail,
                    newName,
                    null,
                    Instant.now());
        }

        rejected.setEmail(newEmail);
        rejected.setName(newName);
        rejected = emailMarketingRejectionService.save(rejected);
        if (rejected.getRecipientId() != null) {
            recipientRepository.findById(rejected.getRecipientId()).ifPresent(r -> {
                r.setEmail(newEmail);
                r.setName(newName);
                recipientRepository.save(r);
            });
        }
        return toInactiveRecipientDto(rejected);
    }

    @Transactional
    public void deleteInactiveRecipient(UUID campaignId, UUID recipientId) {
        removeRecipientFromCampaign(campaignId, recipientId, true);
    }

    /**
     * Remove um destinatário da campanha e cancela qualquer envio ainda pendente.
     */
    @Transactional
    public void removeRecipientFromCampaign(UUID campaignId, UUID recipientId) {
        removeRecipientFromCampaign(campaignId, recipientId, false);
    }

    private void removeRecipientFromCampaign(UUID campaignId, UUID recipientId, boolean requireSuppressed) {
        EmailMarketingRejectedAddress rejected = emailMarketingRejectionService
                .findByCampaignAndRowId(campaignId, recipientId)
                .orElse(null);
        if (rejected != null) {
            emailMarketingRejectionService.removeFromRejectedList(rejected.getEmail());
            if (rejected.getRecipientId() != null) {
                recipientId = rejected.getRecipientId();
            }
        }
        EmailCampaignRecipient recipient = recipientRepository.findByIdAndCampaign_Id(recipientId, campaignId)
                .orElse(null);
        if (recipient == null) {
            if (rejected != null) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Destinatário não encontrado");
        }
        if (requireSuppressed && !recipient.isEmailMarketingSuppressed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Somente destinatários rejeitados podem ser removidos por este endpoint.");
        }
        emailMarketingRejectionService.removeFromRejectedList(recipient.getEmail());
        cancelPendingSendsForRecipient(recipient.getId(), "Destinatário removido da campanha");
        emailLogRepository.deleteByRecipient_Id(recipient.getId());
        recipientRepository.delete(recipient);
    }

    /**
     * Prepara nova rodada de envio: zera rastreamento dos logs existentes e volta todos para {@code PENDING}.
     */
    private void resetLogsForResend(UUID campaignId) {
        List<EmailLog> logs = emailLogRepository.findByCampaign_IdOrderByCreatedAtDesc(campaignId);
        for (EmailLog log : logs) {
            if (log.getRecipient() != null && log.getRecipient().isEmailMarketingSuppressed()) {
                continue;
            }
            if (log.getStatus() == EmailLogStatus.BOUNCED || log.getStatus() == EmailLogStatus.DROPPED) {
                continue;
            }
            log.setStatus(EmailLogStatus.PENDING);
            log.setProviderMessageId(null);
            log.setSentAt(null);
            log.setDeliveredAt(null);
            log.setReadAt(null);
            log.setClickedAt(null);
            log.setRepliedAt(null);
            log.setBounceReason(null);
            emailLogRepository.save(log);
        }
        dispatchScheduler.clearContext(campaignId);
    }

    /** Pausa a campanha, interrompe o scheduler e cancela envios ainda pendentes. */
    @Transactional
    public void pauseCampaign(UUID campaignId) {
        EmailCampaign c = get(campaignId);
        if (c.getStatus() == EmailCampaignStatus.RUNNING
                || c.getStatus() == EmailCampaignStatus.SCHEDULED) {
            dispatchScheduler.clearContext(campaignId);
            cancelPendingSends(campaignId, "Campanha pausada");
            c.setStatus(EmailCampaignStatus.PAUSED);
            campaignRepository.save(c);
        }
    }

    /** Retoma uma campanha pausada — não recria logs, só muda status para RUNNING. */
    @Transactional
    public void resumeCampaign(UUID campaignId) {
        EmailCampaign c = get(campaignId);
        if (c.getStatus() == com.z7design.secured_guard.model.enums.EmailCampaignStatus.PAUSED) {
            c.setStatus(com.z7design.secured_guard.model.enums.EmailCampaignStatus.RUNNING);
            campaignRepository.save(c);
        }
    }

    /** Cancela uma campanha — envios pendentes são descartados e o scheduler para. */
    @Transactional
    public void cancelCampaign(UUID campaignId) {
        EmailCampaign c = get(campaignId);
        c.setStatus(EmailCampaignStatus.CANCELED);
        campaignRepository.save(c);
        dispatchScheduler.clearContext(campaignId);
        cancelPendingSends(campaignId, "Campanha cancelada");
    }

    /**
     * Atualiza metadados da campanha.
     * <ul>
     *   <li>{@code COMPLETED} / {@code CANCELED}: apenas título e descrição (registro / relatório).</li>
     *   <li>{@code DRAFT} / {@code SCHEDULED}: todos os campos; status ajustado conforme {@code scheduledAt}.</li>
     *   <li>{@code PAUSED} / {@code RUNNING}: limites, template, provedor, agendamento e texto — sem mudar o status da campanha.</li>
     * </ul>
     */
    @Transactional
    public EmailCampaign updateCampaign(UUID id, UpdateEmailCampaignRequest req) {
        EmailCampaign c = get(id);
        EmailCampaignStatus st = c.getStatus();

        if (st == EmailCampaignStatus.COMPLETED || st == EmailCampaignStatus.CANCELED) {
            c.setTitle(req.title().trim());
            c.setDescription(req.description());
            return campaignRepository.save(c);
        }

        c.setTitle(req.title().trim());
        c.setDescription(req.description());
        if (req.providerType() != null && !req.providerType().isBlank()) {
            try {
                c.setProviderType(EmailProviderType.valueOf(req.providerType().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                // mantém o tipo já configurado
            }
        }
        c.setTotalLimit(req.totalLimit());
        c.setDailyLimit(req.dailyLimit());
        c.setHourlyLimit(req.hourlyLimit());
        c.setMinIntervalSeconds(req.minIntervalSeconds());
        c.setScheduledAt(req.scheduledAt());

        if (req.defaultTemplateId() != null) {
            EmailTemplate t = emailTemplateRepository.findById(req.defaultTemplateId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template não encontrado"));
            c.setDefaultTemplate(t);
        } else {
            c.setDefaultTemplate(null);
        }

        if (st == EmailCampaignStatus.DRAFT || st == EmailCampaignStatus.SCHEDULED) {
            Instant sched = req.scheduledAt();
            if (sched != null && sched.isAfter(Instant.now())) {
                c.setStatus(EmailCampaignStatus.SCHEDULED);
            } else {
                c.setStatus(EmailCampaignStatus.DRAFT);
            }
        }

        return campaignRepository.save(c);
    }

    /**
     * Remove a campanha, todos os logs de envio e destinatários (cascade).
     */
    @Transactional
    public void deleteCampaign(UUID campaignId) {
        EmailCampaign c = get(campaignId);
        c.setStatus(EmailCampaignStatus.CANCELED);
        campaignRepository.save(c);
        dispatchScheduler.clearContext(campaignId);
        cancelPendingSends(campaignId, "Campanha excluída");
        List<EmailLog> logs = emailLogRepository.findByCampaign_IdOrderByCreatedAtDesc(campaignId);
        if (!logs.isEmpty()) {
            emailLogRepository.deleteAll(logs);
        }
        campaignRepository.delete(c);
    }

    @Transactional(readOnly = true)
    public List<EmailCampaignSummaryDto> listSummaries() {
        List<EmailCampaign> campaigns = campaignRepository.findAllWithRecipientsOrderByCreatedAtDesc();
        List<EmailCampaignSummaryDto> out = new ArrayList<>(campaigns.size());
        for (EmailCampaign c : campaigns) {
            out.add(toSummary(c));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public EmailCampaignSummaryDto getSummary(UUID campaignId) {
        return toSummary(get(campaignId));
    }

    /**
     * Lista logs da campanha. Se {@code statuses} é vazio/{@code null}, retorna todos.
     */
    @Transactional(readOnly = true)
    public List<EmailLogRowDto> listLogs(UUID campaignId, java.util.Set<EmailLogStatus> statuses) {
        get(campaignId);
        List<EmailLog> rows = (statuses == null || statuses.isEmpty())
                ? emailLogRepository.findByCampaignIdWithRecipient(campaignId)
                : emailLogRepository.findByCampaignIdAndStatusIn(campaignId, statuses);
        return rows.stream().map(this::toLogRow).toList();
    }

    /** Atalho: lista todos os logs da campanha. */
    @Transactional(readOnly = true)
    public List<EmailLogRowDto> listLogs(UUID campaignId) {
        return listLogs(campaignId, java.util.Collections.emptySet());
    }

    private EmailLogRowDto toLogRow(EmailLog l) {
        var r = l.getRecipient();
        return new EmailLogRowDto(
                l.getId(),
                r != null ? r.getEmail() : null,
                r != null ? r.getName() : null,
                l.getStatus() != null ? l.getStatus().name() : null,
                l.getProviderMessageId(),
                l.getSentAt(),
                l.getDeliveredAt(),
                l.getReadAt(),
                l.getClickedAt(),
                l.getRepliedAt(),
                l.getBounceReason());
    }

    @Transactional(readOnly = true)
    public EmailCampaignMetricsDto metrics(UUID campaignId) {
        get(campaignId);
        Map<String, Long> counts = emailLogRepository.findByCampaign_IdOrderByCreatedAtDesc(campaignId).stream()
                .collect(Collectors.groupingBy(l -> l.getStatus().name(), Collectors.counting()));
        return new EmailCampaignMetricsDto(campaignId, counts);
    }

    private EmailCampaignSummaryDto toSummary(EmailCampaign c) {
        int n = c.getRecipients() != null
                ? (int) c.getRecipients().stream().filter(r -> !r.isEmailMarketingSuppressed()).count()
                : 0;
        String defaultTemplateName = c.getDefaultTemplate() != null ? c.getDefaultTemplate().getName() : null;
        UUID defaultTemplateId = c.getDefaultTemplate() != null ? c.getDefaultTemplate().getId() : null;
        return new EmailCampaignSummaryDto(
                c.getId(),
                c.getTitle(),
                c.getDescription(),
                c.getTemplateId(),
                defaultTemplateId,
                defaultTemplateName,
                c.getProviderType() != null ? c.getProviderType().name() : null,
                c.getStatus() != null ? c.getStatus().name() : null,
                c.getTotalLimit(),
                c.getDailyLimit(),
                c.getHourlyLimit(),
                c.getMinIntervalSeconds(),
                c.getScheduledAt(),
                c.getCreatedAt(),
                n
        );
    }

    private static boolean looksLikeEmail(String value) {
        return value != null && value.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    private void cancelPendingSends(UUID campaignId, String reason) {
        for (EmailLog log : emailLogRepository.findPendingByCampaignOrderedByCreatedAt(campaignId)) {
            log.setStatus(EmailLogStatus.DROPPED);
            log.setBounceReason(reason);
            emailLogRepository.save(log);
        }
    }

    private void cancelPendingSendsForRecipient(UUID recipientId, String reason) {
        for (EmailLog log : emailLogRepository.findByRecipient_IdAndStatusInOrderByCreatedAtDesc(
                recipientId, EnumSet.of(EmailLogStatus.PENDING))) {
            log.setStatus(EmailLogStatus.DROPPED);
            log.setBounceReason(reason);
            emailLogRepository.save(log);
        }
    }
}
