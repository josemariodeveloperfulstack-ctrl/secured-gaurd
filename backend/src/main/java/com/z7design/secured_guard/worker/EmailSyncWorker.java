package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.service.EmailSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailSyncWorker {

    private final EmailSyncService emailSyncService;

    // Executar a cada 5 minutos (300000 ms)
    @Scheduled(fixedDelay = 300000)
    public void syncEmails() {
        log.info("Iniciando rotina de sincronização de e-mails via IMAP...");
        emailSyncService.syncAllActiveAccounts();
        log.info("Sincronização concluída.");
    }
}
