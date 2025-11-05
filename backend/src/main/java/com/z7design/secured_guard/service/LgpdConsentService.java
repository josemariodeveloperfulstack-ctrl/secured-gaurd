package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.UserConsent;
import com.z7design.secured_guard.model.UserConsent.ConsentType;
import com.z7design.secured_guard.repository.UserConsentRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LgpdConsentService {

    private final UserConsentRepository consentRepository;
    private final UserRepository userRepository;

    private static final String CURRENT_TERM_VERSION = "1.0";

    /**
     * Registra consentimento do usuário
     */
    public UserConsent registerConsent(
        UUID userId,
        ConsentType consentType,
        String ipAddress,
        String userAgent,
        BigDecimal latitude,
        BigDecimal longitude
    ) {
        log.info("📝 Registrando consentimento {} para usuário {}", consentType, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        UserConsent consent = UserConsent.builder()
                .user(user)
                .consentType(consentType)
                .termVersion(CURRENT_TERM_VERSION)
                .accepted(true)
                .acceptedAt(LocalDateTime.now())
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .latitude(latitude)
                .longitude(longitude)
                .build();

        UserConsent saved = consentRepository.save(consent);
        log.info("✅ Consentimento {} registrado para usuário {}", consentType, userId);

        return saved;
    }

    /**
     * Verifica se usuário aceitou todos os termos obrigatórios
     */
    public boolean hasAcceptedAllRequiredConsents(UUID userId) {
        return consentRepository.hasAcceptedAllRequiredConsents(userId);
    }

    /**
     * Busca todos os consentimentos de um usuário
     */
    public List<UserConsent> getUserConsents(UUID userId) {
        return consentRepository.findByUserId(userId);
    }

    /**
     * Busca consentimentos ativos (não revogados)
     */
    public List<UserConsent> getActiveConsents(UUID userId) {
        return consentRepository.findActiveConsentsByUserId(userId);
    }

    /**
     * Revoga um consentimento
     */
    public void revokeConsent(UUID consentId, String reason) {
        UserConsent consent = consentRepository.findById(consentId)
                .orElseThrow(() -> new RuntimeException("Consentimento não encontrado"));

        consent.setRevoked(true);
        consent.setRevokedAt(LocalDateTime.now());
        consent.setRevokedReason(reason);

        consentRepository.save(consent);
        log.info("🚫 Consentimento {} revogado para usuário {}", consentId, consent.getUser().getId());
    }

    /**
     * Verifica se usuário precisa aceitar novos termos (nova versão)
     */
    public boolean needsToAcceptNewTerms(UUID userId) {
        // Verifica se existe consentimento da versão atual
        for (ConsentType type : ConsentType.values()) {
            var consent = consentRepository.findByUserIdAndConsentTypeAndTermVersion(
                    userId, type, CURRENT_TERM_VERSION);
            if (consent.isEmpty() || !consent.get().getAccepted()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Marca primeiro acesso como completo
     */
    public void markFirstAccessCompleted(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        user.setFirstAccessCompleted(true);
        userRepository.save(user);
        log.info("✅ Primeiro acesso completado para usuário {}", userId);
    }

    /**
     * Verifica se usuário completou primeiro acesso
     */
    public boolean hasCompletedFirstAccess(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return user.getFirstAccessCompleted() != null && user.getFirstAccessCompleted();
    }
}

