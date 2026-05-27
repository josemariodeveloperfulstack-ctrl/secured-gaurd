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
 * UAZAPI (uazapiGO v2) — {@link https://docs.uazapi.com}.
 */
@Component
public class UazapiWhatsAppProvider extends AbstractWhatsAppProvider {

    @Value("${uazapi.enabled:false}")
    private boolean enabled;

    @Value("${uazapi.base-url:}")
    private String baseUrl;

    @Value("${uazapi.instance-token:}")
    private String instanceToken;

    @Value("${uazapi.admin-token:}")
    private String adminToken;

    public UazapiWhatsAppProvider(RestTemplate restTemplate, ObjectMapper objectMapper) {
        super(restTemplate, objectMapper);
    }

    @Override
    public WhatsAppProviderType getType() {
        return WhatsAppProviderType.UAZAPI;
    }

    @Override
    public boolean isEnabled() {
        return enabled && baseUrl != null && !baseUrl.isBlank()
                && instanceToken != null && !instanceToken.isBlank();
    }

    @Override
    public String getServiceUrl() {
        return baseUrl;
    }

    private HttpHeaders instanceHeaders() {
        HttpHeaders headers = jsonHeaders();
        headers.set("token", instanceToken);
        return headers;
    }

    private HttpHeaders adminHeaders() {
        HttpHeaders headers = jsonHeaders();
        if (adminToken != null && !adminToken.isBlank()) {
            headers.set("admintoken", adminToken);
        }
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
        return safeGet(trimUrl("/instance/status"), instanceHeaders())
                || safeGet(trimUrl("/status"), instanceHeaders());
    }

    @Override
    public String getConnectionState() {
        if (!isEnabled()) {
            return "disabled";
        }
        try {
            String url = trimUrl("/instance/status");
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(instanceHeaders()), String.class);
            if (!isSuccess(response)) {
                return "disconnected";
            }
            JsonNode root = parseBody(response.getBody());
            if (root.has("status")) {
                return root.get("status").asText("disconnected");
            }
            if (root.has("instance") && root.get("instance").has("status")) {
                return root.get("instance").get("status").asText("disconnected");
            }
            if (root.has("state")) {
                return root.get("state").asText("disconnected");
            }
            return "disconnected";
        } catch (Exception e) {
            setError(e.getMessage());
            return "disconnected";
        }
    }

    @Override
    public boolean checkConnection() {
        String state = getConnectionState();
        return "connected".equalsIgnoreCase(state) || "open".equalsIgnoreCase(state);
    }

    @Override
    public boolean sendTextMessage(String phoneNumber, String message) {
        clearError();
        if (!isEnabled()) {
            setError("UAZAPI desabilitada");
            return false;
        }
        String number = WhatsAppPhoneUtil.normalize(phoneNumber);
        String url = trimUrl("/send/text");

        ObjectNode body = objectMapper.createObjectNode();
        body.put("number", number);
        body.put("text", message);

        ResponseEntity<String> response = safePost(url, new HttpEntity<>(body.toString(), instanceHeaders()));
        if (response != null && isSuccess(response)) {
            return true;
        }
        setError("UAZAPI: falha ao enviar texto");
        return false;
    }

    @Override
    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        clearError();
        if (!isEnabled()) {
            setError("UAZAPI desabilitada");
            return false;
        }
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                setError("Arquivo não encontrado: " + filePath);
                return false;
            }
            String number = WhatsAppPhoneUtil.normalize(phoneNumber);
            String url = trimUrl("/send/media");

            byte[] bytes = Files.readAllBytes(file.toPath());
            ObjectNode body = objectMapper.createObjectNode();
            body.put("number", number);
            body.put("type", "document");
            body.put("file", Base64.getEncoder().encodeToString(bytes));
            body.put("fileName", file.getName());
            if (message != null && !message.isBlank()) {
                body.put("caption", message);
            }

            ResponseEntity<String> response = safePost(url, new HttpEntity<>(body.toString(), instanceHeaders()));
            if (response != null && isSuccess(response)) {
                return true;
            }
            setError("UAZAPI: falha ao enviar mídia");
            return false;
        } catch (Exception e) {
            setError("UAZAPI: " + e.getMessage());
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
            String url = trimUrl("/instance/connect");
            ResponseEntity<String> response = safePost(url, new HttpEntity<>("{}", instanceHeaders()));
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
            String url = trimUrl("/instance/qrcode");
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(instanceHeaders()), String.class);
            if (!isSuccess(response)) {
                url = trimUrl("/instance/connect");
                response = restTemplate.exchange(
                        url, HttpMethod.GET, new HttpEntity<>(instanceHeaders()), String.class);
            }
            if (!isSuccess(response)) {
                return null;
            }
            JsonNode root = parseBody(response.getBody());
            if (root.has("qrcode")) {
                return root.get("qrcode").asText();
            }
            if (root.has("base64")) {
                return root.get("base64").asText();
            }
            if (root.has("qr")) {
                return root.get("qr").asText();
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
            String url = trimUrl("/instance/disconnect");
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>("{}", instanceHeaders()), String.class);
            return isSuccess(response);
        } catch (Exception e) {
            setError(e.getMessage());
            return false;
        }
    }
}
