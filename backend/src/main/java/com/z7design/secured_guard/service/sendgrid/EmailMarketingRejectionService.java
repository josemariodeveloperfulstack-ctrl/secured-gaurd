package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailCampaignRecipient;
import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.EmailMarketingRejectedAddress;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.repository.EmailCampaignRecipientRepository;
import com.z7design.secured_guard.repository.EmailLogRepository;
import com.z7design.secured_guard.repository.EmailMarketingRejectedAddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmailMarketingRejectionService {

    private final EmailMarketingRejectedAddressRepository rejectedRepository;
    private final EmailCampaignRecipientRepository recipientRepository;
    private final EmailLogRepository emailLogRepository;

    @Transactional(readOnly = true)
    public boolean isRejected(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return rejectedRepository.findByEmailIgnoreCase(email.trim()).isPresent();
    }

    @Transactional(readOnly = true)
    public List<String> findRejectedAmong(List<String> emails) {
        if (emails == null || emails.isEmpty()) {
            return List.of();
        }
        List<String> normalized = emails.stream()
                .filter(Objects::nonNull)
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .filter(e -> !e.isBlank())
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            return List.of();
        }
        return rejectedRepository.findExistingEmailsLower(normalized);
    }

    @Transactional(readOnly = true)
    public List<EmailMarketingRejectedAddress> listByCampaign(UUID campaignId) {
        return rejectedRepository.findByCampaign_IdOrderByRejectedAtDesc(campaignId);
    }

    @Transactional(readOnly = true)
    public Optional<EmailMarketingRejectedAddress> findByCampaignAndRowId(UUID campaignId, UUID rowId) {
        return listByCampaign(campaignId).stream()
                .filter(r -> rowId.equals(r.getId()) || rowId.equals(r.getRecipientId()))
                .findFirst();
    }

    @Transactional
    public EmailMarketingRejectedAddress save(EmailMarketingRejectedAddress rejected) {
        return rejectedRepository.save(rejected);
    }

    /**
     * Registra rejeição, remove o destinatário da fila ativa da campanha e grava na lista de avaliação.
     */
    @Transactional
    public void registerRejection(EmailLog log, String reason) {
        if (log == null || log.getRecipient() == null) {
            return;
        }
        EmailCampaignRecipient recipient = log.getRecipient();
        EmailCampaign campaign = log.getCampaign();
        String normalizedReason = reason != null && !reason.isBlank()
                ? reason
                : log.getBounceReason();

        cancelPendingSendsForRecipient(recipient.getId(), normalizedReason);
        recipient.setEmailMarketingSuppressed(true);
        recipientRepository.save(recipient);

        String email = recipient.getEmail() != null ? recipient.getEmail().trim() : null;
        if (email == null || email.isBlank()) {
            return;
        }

        Instant rejectedAt = log.getUpdatedAt() != null ? log.getUpdatedAt() : Instant.now();
        EmailMarketingRejectedAddress rejected = rejectedRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> EmailMarketingRejectedAddress.builder()
                        .email(email)
                        .build());
        rejected.setEmail(email);
        rejected.setName(recipient.getName());
        rejected.setReason(normalizedReason);
        rejected.setCampaign(campaign);
        rejected.setRecipientId(recipient.getId());
        rejected.setLeadId(recipient.getLead() != null ? recipient.getLead().getId() : null);
        if (rejected.getRejectedAt() == null || rejectedAt.isAfter(rejected.getRejectedAt())) {
            rejected.setRejectedAt(rejectedAt);
        }
        rejectedRepository.save(rejected);
    }

    @Transactional
    public void removeFromRejectedList(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        rejectedRepository.deleteByEmailIgnoreCase(email.trim());
    }

    @Transactional
    public void removeByRecipientId(UUID recipientId) {
        if (recipientId == null) {
            return;
        }
        rejectedRepository.deleteByRecipientId(recipientId);
    }

    private void cancelPendingSendsForRecipient(UUID recipientId, String reason) {
        String dropReason = reason != null && !reason.isBlank() ? reason : "E-mail rejeitado";
        for (EmailLog pending : emailLogRepository.findByRecipient_IdAndStatusInOrderByCreatedAtDesc(
                recipientId, EnumSet.of(EmailLogStatus.PENDING))) {
            pending.setStatus(EmailLogStatus.DROPPED);
            pending.setBounceReason(dropReason);
            emailLogRepository.save(pending);
        }
    }
}
