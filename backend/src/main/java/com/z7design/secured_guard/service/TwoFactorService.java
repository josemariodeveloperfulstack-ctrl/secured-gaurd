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
    public TwoFactorCode createCode(User user, String destination) {
        log.info("🔐 Criando código 2FA para usuário: {} - Destino: {}", user.getUsername(), destination);

        // Invalidar códigos anteriores do usuário
        twoFactorCodeRepository.expireAllUserCodes(user.getId());

        // Gerar novo código
        String code = generateCode();
        
        TwoFactorCode twoFactorCode = TwoFactorCode.builder()
                .user(user)
                .code(code)
                .destination(destination)
                .deliveryChannel(TwoFactorCode.DeliveryChannel.WHATSAPP)
                .build();

        twoFactorCode = twoFactorCodeRepository.save(twoFactorCode);
        log.info("✅ Código 2FA criado: {} - Expira em: {}", code, twoFactorCode.getExpiresAt());

        return twoFactorCode;
    }

    /**
     * Valida um código 2FA
     */
    @Transactional
    public boolean validateCode(User user, String code) {
        log.info("🔍 Validando código 2FA para usuário: {} - Código: {}", 
                user.getUsername(), code);

        var twoFactorCodeOpt = twoFactorCodeRepository.findValidCode(
                user.getId(), code, LocalDateTime.now());

        if (twoFactorCodeOpt.isPresent()) {
            TwoFactorCode validCode = twoFactorCodeOpt.get();
            validCode.markAsUsed();
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
            // Deleta códigos expirados há mais de 7 dias
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(7);
            twoFactorCodeRepository.deleteExpiredCodes(cutoffDate);
            log.info("✅ Limpeza de códigos 2FA concluída");
        } catch (Exception e) {
            log.error("💥 Erro ao limpar códigos 2FA expirados: {}", e.getMessage(), e);
        }
    }
}

