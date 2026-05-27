package com.z7design.secured_guard.service.whatsapp;

/**
 * Contrato unificado para envio e gestão de conexão WhatsApp.
 */
public interface WhatsAppProvider {

    WhatsAppProviderType getType();

    /** Provedor configurado e com credenciais mínimas. */
    boolean isEnabled();

    /** API acessível (health / ping). */
    boolean isServiceAvailable();

    /** Sessão WhatsApp autenticada e pronta para enviar. */
    boolean checkConnection();

    String getConnectionState();

    boolean sendTextMessage(String phoneNumber, String message);

    boolean sendFileMessage(String phoneNumber, String message, String filePath);

    boolean initializeInstance();

    String getQRCode();

    boolean disconnectInstance();

    String getLastErrorMessage();

    String getServiceUrl();
}
