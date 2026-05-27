package com.z7design.secured_guard.service.whatsapp;

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
 * Z-API — {@link https://developer.z-api.io}.
 */
@Component
public class ZapiWhatsAppProvider extends AbstractWhatsAppProvider {

    @Value("${zapi.enabled:false}")
    private boolean enabled;

    @Value("${zapi.base-url:https://api.z-api.io}")
    private String baseUrl;

    @Value("${zapi.instance-id:}")
    private String instanceId;

    @Value("${zapi.instance-token:}")
    private String instanceToken;

    @Value("${zapi.client-token:}")
    private String clientToken;

    public ZapiWhatsAppProvider(RestTemplate restTemplate, ObjectMapper objectMapper) {
        super(restTemplate, objectMapper);
    }

    @Override
    public WhatsAppProviderType getType() {
        return WhatsAppProviderType.ZAPI;
    }

    @Override
    public boolean isEnabled() {
        return enabled && instanceId != null && !instanceId.isBlank()
                && instanceToken != null && !instanceToken.isBlank();
    }

    @Override
    public String getServiceUrl() {
        return baseUrl;
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = jsonHeaders();
        if (clientToken != null && !clientToken.isBlank()) {
            headers.set("Client-Token", clientToken);
        }
        return headers;
    }

    private String instancePath(String suffix) {
        String root = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return root + "/instances/" + instanceId + "/token/" + instanceToken + suffix;
    }

    @Override
    public boolean isServiceAvailable() {
        if (!isEnabled()) {
            return false;
        }
        return safeGet(instancePath("/status"), authHeaders())
                || safeGet(instancePath("/me"), authHeaders());
    }

    @Override
    public String getConnectionState() {
        if (!isEnabled()) {
            return "disabled";
        }
        try {
            String url = instancePath("/status");
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            if (!isSuccess(response)) {
                return "disconnected";
            }
            var root = parseBody(response.getBody());
            if (root.has("connected")) {
                return root.get("connected").asBoolean(false) ? "connected" : "disconnected";
            }
            if (root.has("status")) {
                return root.get("status").asText("disconnected");
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
            setError("Z-API desabilitada");
            return false;
        }
        String url = instancePath("/send-text");
        ObjectNode body = objectMapper.createObjectNode();
        body.put("phone", WhatsAppPhoneUtil.normalize(phoneNumber));
        body.put("message", message);

        ResponseEntity<String> response = safePost(url, new HttpEntity<>(body.toString(), authHeaders()));
        if (response != null && isSuccess(response)) {
            return true;
        }
        setError("Z-API: falha ao enviar texto");
        return false;
    }

    @Override
    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        clearError();
        if (!isEnabled()) {
            setError("Z-API desabilitada");
            return false;
        }
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                setError("Arquivo não encontrado: " + filePath);
                return false;
            }
            String url = instancePath("/send-document/pdf");
            byte[] bytes = Files.readAllBytes(file.toPath());

            ObjectNode body = objectMapper.createObjectNode();
            body.put("phone", WhatsAppPhoneUtil.normalize(phoneNumber));
            body.put("document", Base64.getEncoder().encodeToString(bytes));
            body.put("fileName", file.getName());
            if (message != null && !message.isBlank()) {
                body.put("message", message);
            }

            ResponseEntity<String> response = safePost(url, new HttpEntity<>(body.toString(), authHeaders()));
            if (response != null && isSuccess(response)) {
                return true;
            }
            setError("Z-API: falha ao enviar documento");
            return false;
        } catch (Exception e) {
            setError("Z-API: " + e.getMessage());
            return false;
        }
    }

    @Override
    public boolean initializeInstance() {
        clearError();
        if (!isEnabled()) {
            return false;
        }
        return safeGet(instancePath("/qr-code/image"), authHeaders());
    }

    @Override
    public String getQRCode() {
        clearError();
        if (!isEnabled()) {
            return null;
        }
        try {
            String url = instancePath("/qr-code/image");
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            if (!isSuccess(response)) {
                return null;
            }
            var root = parseBody(response.getBody());
            if (root.has("value")) {
                return root.get("value").asText();
            }
            if (root.isTextual()) {
                return root.asText();
            }
            return response.getBody();
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
            String url = instancePath("/disconnect");
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
            return isSuccess(response);
        } catch (Exception e) {
            setError(e.getMessage());
            return false;
        }
    }
}
