package com.z7design.secured_guard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Base64;

/**
 * Service para integração com Meta WhatsApp Cloud API (API Oficial)
 * 
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
@Service
public class MetaWhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(MetaWhatsAppService.class);

    @Value("${whatsapp.meta.phone-number-id}")
    private String phoneNumberId;

    @Value("${whatsapp.meta.access-token}")
    private String accessToken;

    @Value("${whatsapp.meta.api-version:v21.0}")
    private String apiVersion;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String META_API_BASE_URL = "https://graph.facebook.com";

    public MetaWhatsAppService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Verifica se o serviço está configurado corretamente
     */
    public boolean isConfigured() {
        boolean configured = phoneNumberId != null && !phoneNumberId.isEmpty() 
                          && accessToken != null && !accessToken.isEmpty();
        
        if (!configured) {
            logger.warn("⚠️ Meta WhatsApp Cloud API não está configurada!");
            logger.warn("Configure: whatsapp.meta.phone-number-id e whatsapp.meta.access-token");
        }
        
        return configured;
    }

    /**
     * Normaliza número de telefone para formato internacional
     * Remove caracteres especiais e garante código do país
     */
    private String normalizePhoneNumber(String phoneNumber) {
        // Remove todos os caracteres não numéricos
        String cleaned = phoneNumber.replaceAll("[^0-9]", "");
        
        // Se não começar com 55 (Brasil), adiciona
        if (!cleaned.startsWith("55")) {
            cleaned = "55" + cleaned;
        }
        
        logger.debug("📱 Número normalizado: {} -> {}", phoneNumber, cleaned);
        return cleaned;
    }

    /**
     * Cria headers HTTP padrão para requisições à API
     */
    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        return headers;
    }

    /**
     * Envia mensagem de texto via Meta WhatsApp Cloud API
     * 
     * @param phoneNumber Número do destinatário (com ou sem código do país)
     * @param message Texto da mensagem
     * @return true se enviado com sucesso, false caso contrário
     */
    public boolean sendTextMessage(String phoneNumber, String message) {
        if (!isConfigured()) {
            logger.error("❌ Serviço não configurado!");
            return false;
        }

        try {
            String normalizedNumber = normalizePhoneNumber(phoneNumber);
            String url = String.format("%s/%s/%s/messages", META_API_BASE_URL, apiVersion, phoneNumberId);

            // Criar JSON body
            ObjectNode body = objectMapper.createObjectNode();
            body.put("messaging_product", "whatsapp");
            body.put("to", normalizedNumber);
            body.put("type", "text");
            
            ObjectNode textNode = objectMapper.createObjectNode();
            textNode.put("body", message);
            body.set("text", textNode);

            HttpHeaders headers = createHeaders();
            HttpEntity<String> request = new HttpEntity<>(body.toString(), headers);

            logger.info("📤 Enviando mensagem de texto via Meta Cloud API");
            logger.info("📱 Destinatário: {}", normalizedNumber);
            logger.info("💬 Mensagem: {}", message.substring(0, Math.min(message.length(), 50)) + "...");

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("✅ Mensagem enviada com sucesso via Meta Cloud API");
                logger.debug("📋 Response: {}", response.getBody());
                return true;
            } else {
                logger.error("❌ Erro ao enviar mensagem. Status: {}", response.getStatusCode());
                logger.error("📋 Response body: {}", response.getBody());
                return false;
            }

        } catch (Exception e) {
            logger.error("❌ Erro ao enviar mensagem via Meta Cloud API", e);
            logger.error("💥 Detalhes: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Faz upload de um arquivo para a Meta Cloud API e retorna o media_id
     * 
     * @param filePath Caminho completo do arquivo
     * @return media_id se sucesso, null se falhar
     */
    private String uploadMedia(String filePath) {
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                logger.error("❌ Arquivo não encontrado: {}", filePath);
                return null;
            }

            String url = String.format("%s/%s/%s/media", META_API_BASE_URL, apiVersion, phoneNumberId);

            // Criar form data multipart
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBearerAuth(accessToken);

            // Para upload de arquivo, precisamos usar MultiValueMap
            org.springframework.util.LinkedMultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            body.add("file", new org.springframework.core.io.FileSystemResource(file));
            body.add("messaging_product", "whatsapp");
            body.add("type", "application/pdf");

            HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            logger.info("📤 Fazendo upload do arquivo: {}", file.getName());
            logger.info("📊 Tamanho: {} bytes", file.length());

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                // Parse response para obter media_id
                ObjectNode responseNode = (ObjectNode) objectMapper.readTree(response.getBody());
                String mediaId = responseNode.get("id").asText();
                
                logger.info("✅ Upload concluído! Media ID: {}", mediaId);
                return mediaId;
            } else {
                logger.error("❌ Erro no upload. Status: {}", response.getStatusCode());
                logger.error("📋 Response: {}", response.getBody());
                return null;
            }

        } catch (Exception e) {
            logger.error("❌ Erro ao fazer upload do arquivo", e);
            return null;
        }
    }

    /**
     * Envia arquivo/documento via Meta WhatsApp Cloud API
     * 
     * @param phoneNumber Número do destinatário
     * @param message Texto da mensagem (caption)
     * @param filePath Caminho completo do arquivo
     * @return true se enviado com sucesso, false caso contrário
     */
    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        if (!isConfigured()) {
            logger.error("❌ Serviço não configurado!");
            return false;
        }

        try {
            File file = new File(filePath);
            if (!file.exists()) {
                logger.error("❌ Arquivo não existe: {}", filePath);
                return false;
            }

            logger.info("📤 Preparando envio do arquivo: {}", file.getName());
            logger.info("📊 Tamanho: {} bytes", file.length());

            // Passo 1: Upload do arquivo e obtenção do media_id
            String mediaId = uploadMedia(filePath);
            if (mediaId == null) {
                logger.error("❌ Falha no upload do arquivo");
                return false;
            }

            // Passo 2: Enviar mensagem com o media_id
            String normalizedNumber = normalizePhoneNumber(phoneNumber);
            String url = String.format("%s/%s/%s/messages", META_API_BASE_URL, apiVersion, phoneNumberId);

            ObjectNode body = objectMapper.createObjectNode();
            body.put("messaging_product", "whatsapp");
            body.put("to", normalizedNumber);
            body.put("type", "document");
            
            ObjectNode documentNode = objectMapper.createObjectNode();
            documentNode.put("id", mediaId);
            documentNode.put("filename", file.getName());
            
            if (message != null && !message.isEmpty()) {
                documentNode.put("caption", message);
            }
            
            body.set("document", documentNode);

            HttpHeaders headers = createHeaders();
            HttpEntity<String> request = new HttpEntity<>(body.toString(), headers);

            logger.info("📤 Enviando arquivo via Meta Cloud API");
            logger.info("📱 Destinatário: {}", normalizedNumber);
            logger.info("📄 Arquivo: {}", file.getName());

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("✅ Arquivo enviado com sucesso via Meta Cloud API");
                logger.debug("📋 Response: {}", response.getBody());
                return true;
            } else {
                logger.error("❌ Erro ao enviar arquivo. Status: {}", response.getStatusCode());
                logger.error("📋 Response body: {}", response.getBody());
                return false;
            }

        } catch (Exception e) {
            logger.error("❌ Erro ao enviar arquivo via Meta Cloud API", e);
            logger.error("💥 Detalhes: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verifica o status da conexão com a API (health check)
     */
    public boolean checkConnection() {
        if (!isConfigured()) {
            return false;
        }

        try {
            String url = String.format("%s/%s/%s", META_API_BASE_URL, apiVersion, phoneNumberId);
            HttpHeaders headers = createHeaders();
            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            
            boolean connected = response.getStatusCode() == HttpStatus.OK;
            if (connected) {
                logger.info("✅ Conexão com Meta Cloud API verificada com sucesso");
            } else {
                logger.warn("⚠️ Problema na verificação da conexão: {}", response.getStatusCode());
            }
            
            return connected;

        } catch (Exception e) {
            logger.error("❌ Erro ao verificar conexão com Meta Cloud API", e);
            return false;
        }
    }
}

