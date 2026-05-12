package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.dto.sendgrid.SmtpSettingsDto;
import com.z7design.secured_guard.dto.sendgrid.SmtpSettingsRequest;
import com.z7design.secured_guard.dto.sendgrid.SmtpTestRequest;
import com.z7design.secured_guard.model.SmtpSettings;
import com.z7design.secured_guard.repository.SmtpSettingsRepository;
import com.z7design.secured_guard.service.EncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

/**
 * Gerencia o "singleton lógico" de configurações SMTP. Em vez de criar
 * múltiplas linhas, sempre atualiza o registro mais recente (ou cria o
 * primeiro quando ainda não há nada).
 */
@Service
@RequiredArgsConstructor
public class SmtpSettingsService {

    private final SmtpSettingsRepository repository;
    private final EncryptionService encryptionService;
    private final SmtpMailSendService smtpMailSendService;

    @Transactional(readOnly = true)
    public Optional<SmtpSettingsDto> getCurrent() {
        return repository.findFirstByOrderByUpdatedAtDesc().map(this::toDto);
    }

    @Transactional
    public SmtpSettingsDto upsert(SmtpSettingsRequest req) {
        SmtpSettings entity = repository.findFirstByOrderByUpdatedAtDesc()
                .orElseGet(SmtpSettings::new);
        entity.setHost(req.host().trim());
        entity.setPort(req.port());
        entity.setUsername(blankToNull(req.username()));
        entity.setUseTls(req.useTls() != null ? req.useTls() : Boolean.TRUE);
        entity.setFromEmail(req.fromEmail().trim());
        entity.setFromName(blankToNull(req.fromName()));
        entity.setIsActive(req.isActive() != null ? req.isActive() : Boolean.TRUE);

        // Só atualiza a senha se vier preenchida — mantém a antiga caso contrário.
        if (req.password() != null && !req.password().isBlank()) {
            entity.setPasswordEnc(encryptionService.encryptPassword(req.password()));
        }
        SmtpSettings saved = repository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public SmtpSettingsDto testCurrent(SmtpTestRequest req) {
        SmtpSettings cfg = repository.findFirstByOrderByUpdatedAtDesc()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Nenhuma configuração SMTP salva. Salve antes de testar."));
        Optional<String> error = smtpMailSendService.sendTestEmail(
                cfg, req.to(), req.subject(), req.body());
        cfg.setLastTestAt(Instant.now());
        cfg.setLastTestOk(error.isEmpty());
        cfg.setLastTestError(error.orElse(null));
        return toDto(repository.save(cfg));
    }

    /** Apaga a configuração — útil quando o usuário quer desligar o SMTP. */
    @Transactional
    public void delete() {
        repository.findFirstByOrderByUpdatedAtDesc().ifPresent(repository::delete);
    }

    private SmtpSettingsDto toDto(SmtpSettings s) {
        return new SmtpSettingsDto(
                s.getId(),
                s.getHost(),
                s.getPort(),
                s.getUsername(),
                s.getPasswordEnc() != null && !s.getPasswordEnc().isBlank(),
                s.getUseTls(),
                s.getFromEmail(),
                s.getFromName(),
                s.getIsActive(),
                s.getLastTestAt(),
                s.getLastTestOk(),
                s.getLastTestError(),
                s.getCreatedAt(),
                s.getUpdatedAt());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
