package com.z7design.secured_guard.config;

import com.z7design.secured_guard.service.whatsapp.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.*;

@Configuration
public class WhatsAppAgentConfig {

    @Bean
    public List<WhatsAppProvider> orderedWhatsAppProviders(
            @Value("${whatsapp.agent.provider-order:uazapi,zapi,evolution,baileys}") String providerOrder,
            UazapiWhatsAppProvider uazapi,
            ZapiWhatsAppProvider zapi,
            EvolutionWhatsAppProvider evolution,
            BaileysWhatsAppProvider baileys) {

        Map<WhatsAppProviderType, WhatsAppProvider> byType = Map.of(
                WhatsAppProviderType.UAZAPI, uazapi,
                WhatsAppProviderType.ZAPI, zapi,
                WhatsAppProviderType.EVOLUTION, evolution,
                WhatsAppProviderType.BAILEYS, baileys
        );

        List<WhatsAppProvider> ordered = new ArrayList<>();
        Set<WhatsAppProviderType> seen = new HashSet<>();

        for (String raw : providerOrder.split(",")) {
            String key = raw.trim().toUpperCase(Locale.ROOT);
            if (key.isEmpty()) {
                continue;
            }
            try {
                WhatsAppProviderType type = WhatsAppProviderType.valueOf(key);
                if (seen.add(type)) {
                    ordered.add(byType.get(type));
                }
            } catch (IllegalArgumentException ignored) {
                // ignora tokens inválidos
            }
        }

        for (WhatsAppProviderType type : WhatsAppProviderType.values()) {
            if (seen.add(type)) {
                ordered.add(byType.get(type));
            }
        }

        return ordered;
    }
}
