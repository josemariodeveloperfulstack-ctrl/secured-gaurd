package com.z7design.secured_guard.service.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Utilitários HTTP compartilhados pelos provedores.
 */
public abstract class AbstractWhatsAppProvider implements WhatsAppProvider {

    protected final Logger log = LoggerFactory.getLogger(getClass());
    protected final RestTemplate restTemplate;
    protected final ObjectMapper objectMapper;
    protected String lastErrorMessage;

    protected AbstractWhatsAppProvider(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    protected void clearError() {
        lastErrorMessage = null;
    }

    protected void setError(String message) {
        lastErrorMessage = message;
    }

    protected HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    protected boolean isSuccess(ResponseEntity<String> response) {
        return response != null && response.getStatusCode().is2xxSuccessful();
    }

    protected JsonNode parseBody(String body) {
        try {
            if (body == null || body.isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(body);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }

    protected boolean safeGet(String url, HttpHeaders headers) {
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            return isSuccess(response);
        } catch (RestClientException e) {
            setError(e.getMessage());
            return false;
        }
    }

    protected ResponseEntity<String> safePost(String url, HttpEntity<String> request) {
        try {
            return restTemplate.postForEntity(url, request, String.class);
        } catch (RestClientException e) {
            setError(e.getMessage());
            return null;
        }
    }
}
