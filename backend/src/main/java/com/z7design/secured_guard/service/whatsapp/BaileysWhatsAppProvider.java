package com.z7design.secured_guard.service.whatsapp;

import com.z7design.secured_guard.service.BaileysRestService;
import org.springframework.stereotype.Component;

/**
 * Adaptador do serviço Baileys REST existente para o contrato unificado.
 */
@Component
public class BaileysWhatsAppProvider implements WhatsAppProvider {

    private final BaileysRestService baileysRestService;

    public BaileysWhatsAppProvider(BaileysRestService baileysRestService) {
        this.baileysRestService = baileysRestService;
    }

    @Override
    public WhatsAppProviderType getType() {
        return WhatsAppProviderType.BAILEYS;
    }

    @Override
    public boolean isEnabled() {
        return baileysRestService.isEnabled();
    }

    @Override
    public boolean isServiceAvailable() {
        return baileysRestService.isServiceAvailable();
    }

    @Override
    public boolean checkConnection() {
        return baileysRestService.checkConnection();
    }

    @Override
    public String getConnectionState() {
        return baileysRestService.getConnectionState();
    }

    @Override
    public boolean sendTextMessage(String phoneNumber, String message) {
        return baileysRestService.sendTextMessage(phoneNumber, message);
    }

    @Override
    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        return baileysRestService.sendFileMessage(phoneNumber, message, filePath);
    }

    @Override
    public boolean initializeInstance() {
        return baileysRestService.initializeInstance();
    }

    @Override
    public String getQRCode() {
        return baileysRestService.getQRCode();
    }

    @Override
    public boolean disconnectInstance() {
        return baileysRestService.disconnectInstance();
    }

    @Override
    public String getLastErrorMessage() {
        return baileysRestService.getLastErrorMessage();
    }

    @Override
    public String getServiceUrl() {
        return baileysRestService.getServiceUrl();
    }
}
