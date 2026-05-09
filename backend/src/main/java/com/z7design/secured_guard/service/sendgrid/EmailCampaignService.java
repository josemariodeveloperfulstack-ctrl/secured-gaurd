package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.dto.sendgrid.CreateEmailCampaignRequest;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignMetricsDto;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignRecipientDto;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignSummaryDto;
import com.z7design.secured_guard.dto.sendgrid.EmailLogRowDto;
import com.z7design.secured_guard.dto.sendgrid.SendEmailCampaignRequest;
import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailCampaignRecipient;
import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.repository.EmailCampaignRecipientRepository;
import com.z7design.secured_guard.repository.EmailCampaignRepository;
import com.z7design.secured_guard.repository.EmailLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
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
    private final SendGridMailSendService sendGridMailSendService;

    @Transactional
    public EmailCampaign create(CreateEmailCampaignRequest request) {
        EmailCampaign campaign = EmailCampaign.builder()
                .title(request.title())
                .templateId(request.templateId())
                .build();
        for (EmailCampaignRecipientDto dto : request.recipients()) {
            EmailCampaignRecipient r = EmailCampaignRecipient.builder()
                    .campaign(campaign)
                    .email(dto.email().trim())
                    .name(dto.name())
                    .metadata(dto.metadata() != null ? new HashMap<>(dto.metadata()) : new HashMap<>())
                    .build();
            campaign.getRecipients().add(r);
        }
        return campaignRepository.save(campaign);
    }

    @Transactional(readOnly = true)
    public EmailCampaign get(UUID id) {
        return campaignRepository.findWithRecipientsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campanha não encontrada"));
    }

    @Transactional
    public void sendCampaign(UUID campaignId, SendEmailCampaignRequest request) {
        EmailCampaign campaign = get(campaignId);
        List<EmailCampaignRecipient> recipients = recipientRepository.findByCampaign_Id(campaignId);
        if (recipients.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campanha sem destinatários");
        }
        for (EmailCampaignRecipient recipient : recipients) {
            EmailLog log = EmailLog.builder()
                    .campaign(campaign)
                    .recipient(recipient)
                    .status(EmailLogStatus.PENDING)
                    .build();
            log = emailLogRepository.save(log);
            try {
                String messageId = sendGridMailSendService.sendHtml(
                        log,
                        recipient.getEmail(),
                        recipient.getName(),
                        request.subject(),
                        request.htmlBody());
                log.setProviderMessageId(messageId);
                log.setStatus(EmailLogStatus.SENT);
                log.setSentAt(Instant.now());
            } catch (IOException e) {
                log.setStatus(EmailLogStatus.DROPPED);
                log.setBounceReason(e.getMessage());
            }
            emailLogRepository.save(log);
        }
    }

    @Transactional(readOnly = true)
    public List<EmailCampaignSummaryDto> listSummaries() {
        List<EmailCampaign> campaigns = campaignRepository.findAllWithRecipientsOrderByCreatedAtDesc();
        List<EmailCampaignSummaryDto> out = new ArrayList<>(campaigns.size());
        for (EmailCampaign c : campaigns) {
            int n = c.getRecipients() != null ? c.getRecipients().size() : 0;
            out.add(new EmailCampaignSummaryDto(c.getId(), c.getTitle(), c.getTemplateId(), c.getCreatedAt(), n));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<EmailLogRowDto> listLogs(UUID campaignId) {
        get(campaignId);
        return emailLogRepository.findByCampaignIdWithRecipient(campaignId).stream()
                .map(this::toLogRow)
                .toList();
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
}
