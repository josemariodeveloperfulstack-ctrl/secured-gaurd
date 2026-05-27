package com.z7design.secured_guard.service.whatsapp.agent;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Evita confundir mensagens enviadas pelo sistema (IA/humano via API) com envio manual no app WhatsApp.
 */
@Component
public class WhatsAppSystemOutboundTracker {

    private static final long TTL_SECONDS = 90;

    private final Map<String, Long> recentSystemSends = new ConcurrentHashMap<>();

    public void markSystemSend(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            return;
        }
        purgeExpired();
        recentSystemSends.put(normalizedPhone, Instant.now().getEpochSecond());
    }

    public boolean wasRecentSystemSend(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isBlank()) {
            return false;
        }
        Long ts = recentSystemSends.get(normalizedPhone);
        if (ts == null) {
            return false;
        }
        long age = Instant.now().getEpochSecond() - ts;
        if (age > TTL_SECONDS) {
            recentSystemSends.remove(normalizedPhone);
            return false;
        }
        return true;
    }

    private void purgeExpired() {
        long now = Instant.now().getEpochSecond();
        Iterator<Map.Entry<String, Long>> it = recentSystemSends.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Long> e = it.next();
            if (now - e.getValue() > TTL_SECONDS) {
                it.remove();
            }
        }
    }
}
