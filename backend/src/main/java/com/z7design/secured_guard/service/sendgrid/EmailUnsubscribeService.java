package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.dto.sendgrid.EmailMarketingUnsubscribeRowDto;
import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailUnsubscribe;
import com.z7design.secured_guard.repository.EmailCampaignRecipientRepository;
import com.z7design.secured_guard.repository.EmailUnsubscribeRepository;
import com.z7design.secured_guard.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Serviço responsável por gerar tokens de unsubscribe, registrar opt-outs e
 * verificar se um e-mail está descadastrado antes de qualquer envio.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailUnsubscribeService {

    private static final SecureRandom RNG = new SecureRandom();
    private static final String LEAD_NOTE_MARKER = "Descadastro de e-mails de marketing confirmado";

    private final EmailUnsubscribeRepository repository;
    private final EmailCampaignRecipientRepository recipientRepository;
    private final LeadRepository leadRepository;

    @Value("${app.email.unsubscribe.base-url:}")
    private String publicBaseUrl;

    /**
     * Gera (ou recupera) um token único associado ao e-mail e devolve a URL
     * pública que o destinatário deve abrir para descadastrar-se.
     */
    @Transactional
    public String buildUnsubscribeUrl(String email, EmailCampaign campaign) {
        if (email == null || email.isBlank() || publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return "#";
        }
        Optional<EmailUnsubscribe> existing = repository.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            return composeUrl(existing.get().getToken());
        }
        // Cria um registro pendente apenas para vincular o token; é marcado como ativo
        // somente quando o usuário acessa o link.
        EmailUnsubscribe pending = EmailUnsubscribe.builder()
                .email(email.trim())
                .token(generateToken())
                .source("PENDING")
                .isUnsubscribed(false)
                .campaign(campaign)
                .build();
        EmailUnsubscribe saved = repository.save(pending);
        return composeUrl(saved.getToken());
    }

    @Transactional
    public boolean confirmByToken(String token, String reason) {
        Optional<EmailUnsubscribe> found = repository.findByToken(token);
        if (found.isEmpty()) {
            return false;
        }
        EmailUnsubscribe entry = found.get();
        entry.setSource("USER_CLICK");
        entry.setIsUnsubscribed(true);
        entry.setUnsubscribeConfirmedAt(Instant.now());
        if (reason != null && !reason.isBlank()) {
            entry.setReason(reason);
        }
        repository.save(entry);
        propagateMarketingOptOut(entry.getEmail().trim());
        return true;
    }

    @Transactional
    public void unsubscribeManually(String email, String reason, String source) {
        if (email == null || email.isBlank()) {
            return;
        }
        String trimmed = email.trim();
        Instant now = Instant.now();
        Optional<EmailUnsubscribe> existing = repository.findByEmailIgnoreCase(trimmed);
        if (existing.isPresent()) {
            EmailUnsubscribe entry = existing.get();
            entry.setReason(reason);
            entry.setSource(source != null ? source : "MANUAL");
            entry.setIsUnsubscribed(true);
            entry.setUnsubscribeConfirmedAt(now);
            repository.save(entry);
        } else {
            EmailUnsubscribe entry = EmailUnsubscribe.builder()
                    .email(trimmed)
                    .token(generateToken())
                    .source(source != null ? source : "MANUAL")
                    .reason(reason)
                    .isUnsubscribed(true)
                    .unsubscribeConfirmedAt(now)
                    .build();
            repository.save(entry);
        }
        propagateMarketingOptOut(trimmed);
    }

    public boolean isUnsubscribed(String email) {
        return email != null && repository.existsByEmailIgnoreCaseAndIsUnsubscribedTrue(email);
    }

    /**
     * Lista paginada de e-mails que cancelaram o marketing (opt-out confirmado).
     */
    @Transactional(readOnly = true)
    public Page<EmailMarketingUnsubscribeRowDto> listConfirmedUnsubscribes(Pageable pageable) {
        return repository.findAllUnsubscribedConfirmed(pageable)
                .map(u -> new EmailMarketingUnsubscribeRowDto(
                        u.getEmail(),
                        u.getSource(),
                        u.getReason(),
                        u.getUnsubscribeConfirmedAt() != null ? u.getUnsubscribeConfirmedAt() : u.getUnsubscribedAt()));
    }

    /**
     * Devolve os e-mails (em minúsculas) que estão na lista de entrada e constam como descadastrados.
     */
    @Transactional(readOnly = true)
    public List<String> findUnsubscribedAmong(Collection<String> emails) {
        if (emails == null || emails.isEmpty()) {
            return List.of();
        }
        List<String> lowered = emails.stream()
                .filter(e -> e != null && !e.isBlank())
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toList());
        if (lowered.isEmpty()) {
            return List.of();
        }
        return repository.findUnsubscribedEmailsAmong(lowered);
    }

    private void propagateMarketingOptOut(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        int updated = recipientRepository.suppressMarketingByEmailIgnoreCase(email);
        if (updated > 0) {
            log.info("Marketing opt-out: {} destinatário(s) de campanha marcados como suprimidos para {}", updated, email);
        }
        appendLeadUnsubscribeNote(email);
    }

    private void appendLeadUnsubscribeNote(String email) {
        leadRepository.findFirstByEmailIgnoreCaseOrderByCreatedAtDesc(email).ifPresent(lead -> {
            String old = lead.getNotes();
            if (old != null && old.contains(LEAD_NOTE_MARKER)) {
                return;
            }
            String line = LEAD_NOTE_MARKER + " em " + LocalDateTime.now() + ".";
            lead.setNotes(old == null || old.isBlank() ? line : old + "\n\n" + line);
            leadRepository.save(lead);
        });
    }

    private String composeUrl(String token) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
        return base + "api/v1/public/email/unsubscribe?token=" + token;
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
