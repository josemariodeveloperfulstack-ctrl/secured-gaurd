package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.TwoFactorCode;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.TwoFactorCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TwoFactorService {

    private final TwoFactorCodeRepository twoFactorCodeRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Gera um código de 6 dígitos
     */
    public String generateCode() {
        int code = secureRandom.nextInt(900000) + 100000; // Gera número entre 100000 e 999999
        return String.valueOf(code);
    }

    /**
     * Cria e salva um código 2FA para o usuário
     */
    @Transactional
    public TwoFactorCode createCode(User user, String purpose) {
        log.info("🔐 Criando código 2FA para usuário: {} - Propósito: {}", user.getUsername(), purpose);

        // Invalidar códigos anteriores do mesmo propósito
        twoFactorCodeRepository.findByUserAndPurpose(user, purpose).forEach(code -> {
            code.setUsed(true);
            twoFactorCodeRepository.save(code);
        });

        // Gerar novo código
        String code = generateCode();
        
        TwoFactorCode twoFactorCode = TwoFactorCode.builder()
                .user(user)
                .code(code)
                .purpose(purpose)
                .expiryDate(LocalDateTime.now().plusMinutes(5)) // Expira em 5 minutos
                .used(false)
                .build();

        twoFactorCode = twoFactorCodeRepository.save(twoFactorCode);
        log.info("✅ Código 2FA criado: {} - Expira em: {}", code, twoFactorCode.getExpiryDate());

        return twoFactorCode;
    }

    /**
     * Valida um código 2FA
     */
    @Transactional
    public boolean validateCode(User user, String code, String purpose) {
        log.info("🔍 Validando código 2FA para usuário: {} - Código: {} - Propósito: {}", 
                user.getUsername(), code, purpose);

        var twoFactorCode = twoFactorCodeRepository.findByUserAndCodeAndPurposeAndUsedFalseAndExpiryDateAfter(
                user, code, purpose, LocalDateTime.now());

        if (twoFactorCode.isPresent()) {
            TwoFactorCode validCode = twoFactorCode.get();
            validCode.setUsed(true);
            twoFactorCodeRepository.save(validCode);
            log.info("✅ Código 2FA válido e marcado como usado");
            return true;
        } else {
            log.warn("❌ Código 2FA inválido, expirado ou já usado");
            return false;
        }
    }

    /**
     * Limpa códigos expirados automaticamente (executa a cada hora)
     */
    @Scheduled(cron = "0 0 * * * ?")
    @Transactional
    public void cleanupExpiredCodes() {
        try {
            log.info("🧹 Limpando códigos 2FA expirados");
            twoFactorCodeRepository.deleteByExpiryDateBefore(LocalDateTime.now());
            log.info("✅ Limpeza de códigos 2FA concluída");
        } catch (Exception e) {
            log.error("💥 Erro ao limpar códigos 2FA expirados: {}", e.getMessage(), e);
        }
    }
}

