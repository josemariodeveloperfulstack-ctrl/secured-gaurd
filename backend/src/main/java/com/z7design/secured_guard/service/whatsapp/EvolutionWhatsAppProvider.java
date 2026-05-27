package com.z7design.secured_guard.service.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.nio.file.Files;
import java.util.Base64;

/**
 * Evolution API v2 — {@link https://doc.evolution-api.com}.
 */
@Component
public class EvolutionWhatsAppProvider extends AbstractWhatsAppProvider {

    @Value("${evolution.api.enabled:true}")
    private boolean enabled;

    @Value("${evolution.api.url:}")
    private String baseUrl;

    @Value("${evolution.api.key:}")
    private String apiKey;

    @Value("${evolution.api.instance:securedguard}")
    private String instance;

    public EvolutionWhatsAppProvider(RestTemplate restTemplate, ObjectMapper objectMapper) {
        super(restTemplate, objectMapper);
    }

    @Override
    public WhatsAppProviderType getType() {
        return WhatsAppProviderType.EVOLUTION;
    }

    @Override
    public boolean isEnabled() {
        return enabled && baseUrl != null && !baseUrl.isBlank() && apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String getServiceUrl() {
        return baseUrl;
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = jsonHeaders();
        headers.set("apikey", apiKey);
        return headers;
    }

    private String trimUrl(String path) {
        String root = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return root + path;
    }

    @Override
    public boolean isServiceAvailable() {
        if (!isEnabled()) {
            return false;
        }
        return safeGet(trimUrl("/instance/connectionState/" + instance), authHeaders())
                || safeGet(trimUrl("/"), authHeaders());
    }

    @Override
    public String getConnectionState() {
        if (!isEnabled()) {
            return "disabled";
        }
        try {
            String url = trimUrl("/instance/connectionState/" + instance);
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            if (!isSuccess(response)) {
                return "close";
            }
            JsonNode root = parseBody(response.getBody());
            if (root.has("instance") && root.get("instance").has("state")) {
                return root.get("instance").get("state").asText("close");
            }
            if (root.has("state")) {
                return root.get("state").asText("close");
            }
            return "close";
        } catch (Exception e) {
            setError(e.getMessage());
            return "close";
        }
    }

    @Override
    public boolean checkConnection() {
        String state = getConnectionState();
        return "open".equalsIgnoreCase(state) || "connected".equalsIgnoreCase(state);
    }

    @Override
    public boolean sendTextMessage(String phoneNumber, String message) {
        clearError();
        if (!isEnabled()) {
            setError("Evolution API desabilitada");
            return false;
        }
        if (!checkConnection()) {
            setError("Evolution: WhatsApp não conectado");
            return false;
        }
        String number = WhatsAppPhoneUtil.toEvolutionJid(WhatsAppPhoneUtil.normalize(phoneNumber));
        String url = trimUrl("/message/sendText/" + instance);

        ObjectNode body = objectMapper.createObjectNode();
        body.put("number", number);
        ObjectNode textMessage = objectMapper.createObjectNode();
        textMessage.put("text", message);
        body.set("textMessage", textMessage);

        ResponseEntity<String> response = safePost(url, new HttpEntity<>(body.toString(), authHeaders()));
        if (response != null && isSuccess(response)) {
            return true;
        }
        setError("Evolution: falha ao enviar texto");
        return false;
    }

    @Override
    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        clearError();
        if (!isEnabled()) {
            setError("Evolution API desabilitada");
            return false;
        }
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                setError("Arquivo não encontrado: " + filePath);
                return false;
            }
            String number = WhatsAppPhoneUtil.toEvolutionJid(WhatsAppPhoneUtil.normalize(phoneNumber));
            String url = trimUrl("/message/sendMedia/" + instance);

            byte[] bytes = Files.readAllBytes(file.toPath());
            ObjectNode body = objectMapper.createObjectNode();
            body.put("number", number);
            body.put("mediatype", "document");
            body.put("mimetype", "application/pdf");
            body.put("caption", message != null ? message : "");
            body.put("fileName", file.getName());
            body.put("media", Base64.getEncoder().encodeToString(bytes));

            ResponseEntity<String> response = safePost(url, new HttpEntity<>(body.toString(), authHeaders()));
            if (response != null && isSuccess(response)) {
                return true;
            }
            setError("Evolution: falha ao enviar mídia");
            return false;
        } catch (Exception e) {
            setError("Evolution: " + e.getMessage());
            return false;
        }
    }

    @Override
    public boolean initializeInstance() {
        clearError();
        if (!isEnabled()) {
            return false;
        }
        try {
            String url = trimUrl("/instance/create");
            ObjectNode body = objectMapper.createObjectNode();
            body.put("instanceName", instance);
            body.put("qrcode", true);
            body.put("integration", "WHATSAPP-BAILEYS");
            ResponseEntity<String> response = safePost(url, new HttpEntity<>(body.toString(), authHeaders()));
            return response != null && isSuccess(response);
        } catch (Exception e) {
            setError(e.getMessage());
            return false;
        }
    }

    @Override
    public String getQRCode() {
        clearError();
        if (!isEnabled()) {
            return null;
        }
        try {
            String url = trimUrl("/instance/connect/" + instance);
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            if (!isSuccess(response)) {
                return null;
            }
            JsonNode root = parseBody(response.getBody());
            if (root.has("base64")) {
                return root.get("base64").asText();
            }
            if (root.has("qrcode") && root.get("qrcode").has("base64")) {
                return root.get("qrcode").get("base64").asText();
            }
            if (root.has("code")) {
                return root.get("code").asText();
            }
            return null;
        } catch (Exception e) {
            setError(e.getMessage());
            return null;
        }
    }

    @Override
    public boolean disconnectInstance() {
        clearError();
        if (!isEnabled()) {
            return false;
        }
        try {
            String url = trimUrl("/instance/logout/" + instance);
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.DELETE, new HttpEntity<>(authHeaders()), String.class);
            return isSuccess(response);
        } catch (Exception e) {
            setError(e.getMessage());
            return false;
        }
    }
}
