package com.z7design.secured_guard.service.whatsapp;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Agente WhatsApp com fallback: tenta UAZAPI → Z-API → Evolution → Baileys
 * (ordem configurável). Se um provedor falhar, o próximo é usado automaticamente.
 */
@Service
@Slf4j
public class WhatsAppAgentService {

    private final List<WhatsAppProvider> providers;
    private volatile WhatsAppProviderType lastSuccessfulProvider;
    private volatile String lastErrorMessage;

    public WhatsAppAgentService(List<WhatsAppProvider> orderedWhatsAppProviders) {
        this.providers = List.copyOf(orderedWhatsAppProviders);
        log.info("🤖 Agente WhatsApp iniciado. Ordem de fallback: {}",
                providers.stream().map(p -> p.getType().name()).toList());
    }

    public List<Map<String, Object>> getProvidersStatus() {
        List<Map<String, Object>> status = new ArrayList<>();
        for (WhatsAppProvider provider : providers) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", provider.getType().name());
            item.put("enabled", provider.isEnabled());
            item.put("available", provider.isEnabled() && provider.isServiceAvailable());
            item.put("connected", provider.isEnabled() && provider.checkConnection());
            item.put("connectionState", provider.getConnectionState());
            item.put("serviceUrl", provider.getServiceUrl());
            item.put("lastError", provider.getLastErrorMessage());
            status.add(item);
        }
        return status;
    }

    public Optional<WhatsAppProviderType> getLastSuccessfulProvider() {
        return Optional.ofNullable(lastSuccessfulProvider);
    }

    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    public boolean isAnyServiceAvailable() {
        return providers.stream().anyMatch(p -> p.isEnabled() && p.isServiceAvailable());
    }

    public boolean isAnyConnected() {
        return providers.stream().anyMatch(p -> p.isEnabled() && p.checkConnection());
    }

    public String getActiveConnectionState() {
        for (WhatsAppProvider provider : providers) {
            if (provider.isEnabled() && provider.checkConnection()) {
                return provider.getConnectionState();
            }
        }
        for (WhatsAppProvider provider : providers) {
            if (provider.isEnabled()) {
                return provider.getConnectionState();
            }
        }
        return "close";
    }

    public boolean sendTextMessage(String phoneNumber, String message) {
        return executeWithFallback("envio de texto", provider -> {
            if (!canAttemptSend(provider)) {
                setError(provider, "não conectado");
                return false;
            }
            return provider.sendTextMessage(phoneNumber, message);
        });
    }

    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        return executeWithFallback("envio de arquivo", provider -> {
            if (!canAttemptSend(provider)) {
                setError(provider, "não conectado");
                return false;
            }
            return provider.sendFileMessage(phoneNumber, message, filePath);
        });
    }

    /** Z-API e UAZAPI são SaaS — o envio pode funcionar mesmo sem estado local "open". */
    private boolean canAttemptSend(WhatsAppProvider provider) {
        WhatsAppProviderType type = provider.getType();
        if (type == WhatsAppProviderType.UAZAPI || type == WhatsAppProviderType.ZAPI) {
            return true;
        }
        return provider.checkConnection();
    }

    public boolean initializeConnection() {
        for (WhatsAppProvider provider : enabledProviders()) {
            if (!provider.isServiceAvailable()) {
                log.warn("⏭️ {} indisponível para inicializar: {}", provider.getType(),
                        provider.getLastErrorMessage());
                continue;
            }
            log.info("🔄 Inicializando via {}", provider.getType());
            if (provider.initializeInstance()) {
                lastSuccessfulProvider = provider.getType();
                lastErrorMessage = null;
                return true;
            }
            setError(provider, "falha ao inicializar");
        }
        lastErrorMessage = "Nenhum provedor conseguiu inicializar a instância";
        return false;
    }

    public String getQRCode() {
        for (WhatsAppProvider provider : enabledProviders()) {
            if (!provider.isServiceAvailable()) {
                continue;
            }
            provider.initializeInstance();
            String qr = provider.getQRCode();
            if (qr != null && !qr.isBlank()) {
                lastSuccessfulProvider = provider.getType();
                lastErrorMessage = null;
                log.info("📸 QR Code obtido via {}", provider.getType());
                return qr;
            }
            setError(provider, "QR Code indisponível");
        }
        lastErrorMessage = "Nenhum provedor retornou QR Code";
        return null;
    }

    public boolean disconnect() {
        boolean any = false;
        for (WhatsAppProvider provider : enabledProviders()) {
            if (provider.disconnectInstance()) {
                any = true;
            }
        }
        return any;
    }

    public boolean checkConnection() {
        return isAnyConnected();
    }

    @FunctionalInterface
    private interface ProviderOperation {
        boolean run(WhatsAppProvider provider);
    }

    private boolean executeWithFallback(String operation, ProviderOperation op) {
        List<String> errors = new ArrayList<>();

        for (WhatsAppProvider provider : enabledProviders()) {
            if (!provider.isServiceAvailable()) {
                String msg = provider.getType() + " indisponível";
                errors.add(msg);
                log.warn("⏭️ {} — {}", operation, msg);
                continue;
            }

            log.info("📡 Tentando {} via {}", operation, provider.getType());
            try {
                if (op.run(provider)) {
                    lastSuccessfulProvider = provider.getType();
                    lastErrorMessage = null;
                    log.info("✅ {} concluído via {}", operation, provider.getType());
                    return true;
                }
                String err = provider.getLastErrorMessage();
                errors.add(provider.getType() + ": " + (err != null ? err : "falha"));
                log.warn("⚠️ {} falhou em {}: {}", operation, provider.getType(), err);
            } catch (Exception e) {
                errors.add(provider.getType() + ": " + e.getMessage());
                log.error("❌ Erro em {} via {}", operation, provider.getType(), e);
            }
        }

        lastErrorMessage = String.join(" | ", errors);
        if (lastErrorMessage.isBlank()) {
            lastErrorMessage = "Nenhum provedor WhatsApp habilitado ou disponível";
        }
        return false;
    }

    private List<WhatsAppProvider> enabledProviders() {
        return providers.stream().filter(WhatsAppProvider::isEnabled).toList();
    }

    private void setError(WhatsAppProvider provider, String context) {
        String detail = provider.getLastErrorMessage();
        lastErrorMessage = provider.getType() + " " + context
                + (detail != null ? ": " + detail : "");
    }
}
