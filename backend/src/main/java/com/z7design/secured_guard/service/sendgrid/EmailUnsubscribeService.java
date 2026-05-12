package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailUnsubscribe;
import com.z7design.secured_guard.repository.EmailUnsubscribeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * Serviço responsável por gerar tokens de unsubscribe, registrar opt-outs e
 * verificar se um e-mail está descadastrado antes de qualquer envio.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailUnsubscribeService {

    private static final SecureRandom RNG = new SecureRandom();

    private final EmailUnsubscribeRepository repository;

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
        if (found.isEmpty()) return false;
        EmailUnsubscribe entry = found.get();
        entry.setSource("USER_CLICK");
        entry.setIsUnsubscribed(true);
        if (reason != null && !reason.isBlank()) entry.setReason(reason);
        repository.save(entry);
        return true;
    }

    @Transactional
    public void unsubscribeManually(String email, String reason, String source) {
        if (email == null || email.isBlank()) return;
        Optional<EmailUnsubscribe> existing = repository.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            EmailUnsubscribe entry = existing.get();
            entry.setReason(reason);
            entry.setSource(source != null ? source : "MANUAL");
            entry.setIsUnsubscribed(true);
            repository.save(entry);
            return;
        }
        EmailUnsubscribe entry = EmailUnsubscribe.builder()
                .email(email.trim())
                .token(generateToken())
                .source(source != null ? source : "MANUAL")
                .reason(reason)
                .isUnsubscribed(true)
                .build();
        repository.save(entry);
    }

    public boolean isUnsubscribed(String email) {
        return email != null && repository.existsByEmailIgnoreCaseAndIsUnsubscribedTrue(email);
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
