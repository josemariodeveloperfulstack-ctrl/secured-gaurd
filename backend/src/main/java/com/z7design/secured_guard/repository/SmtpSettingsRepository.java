package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.SmtpSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SmtpSettingsRepository extends JpaRepository<SmtpSettings, UUID> {

    /** A configuração ativa mais recente — é a usada pelo {@code SmtpMailSendService}. */
    Optional<SmtpSettings> findFirstByIsActiveTrueOrderByUpdatedAtDesc();

    /** A configuração mais recente (ativa ou não), usada na tela de configuração. */
    Optional<SmtpSettings> findFirstByOrderByUpdatedAtDesc();
}
