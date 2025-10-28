package com.z7design.secured_guard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

@Service
public class EvolutionApiService {
    
    private static final Logger logger = LoggerFactory.getLogger(EvolutionApiService.class);
    
    @Value("${evolution.api.url:http://localhost:8080}")
    private String evolutionApiUrl;
    
    @Value("${evolution.api.key:B6D711FCDE4D4FD5936544120E713976}")
    private String apiKey;
    
    @Value("${evolution.api.instance:securedguard}")
    private String instanceName;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public EvolutionApiService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }
    
    /**
     * Criar uma nova instância
     */
    public boolean createInstance() {
        try {
            String url = evolutionApiUrl + "/instance/create";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", apiKey);
            
            ObjectNode body = objectMapper.createObjectNode();
            body.put("instanceName", instanceName);
            body.put("qrcode", true);
            
            HttpEntity<String> request = new HttpEntity<>(body.toString(), headers);
            
            logger.info("🔧 Criando instância Evolution API: {}", instanceName);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.CREATED || response.getStatusCode() == HttpStatus.OK) {
                logger.info("✅ Instância criada com sucesso");
                logger.info("📋 Response: {}", response.getBody());
                return true;
            } else {
                logger.error("❌ Erro ao criar instância. Status: {}", response.getStatusCode());
                return false;
            }
            
        } catch (Exception e) {
            logger.error("❌ Erro ao criar instância Evolution API", e);
            return true; // Retornar true se a instância já existir
        }
    }
    
    /**
     * Conectar instância (obter QR Code)
     */
    public String connectInstance() {
        try {
            String url = evolutionApiUrl + "/instance/connect/" + instanceName;
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", apiKey);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            logger.info("📱 Conectando instância: {}", instanceName);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("✅ QR Code obtido com sucesso");
                return response.getBody();
            }
            
            return null;
            
        } catch (Exception e) {
            logger.error("❌ Erro ao conectar instância", e);
            return null;
        }
    }
    
    /**
     * Verificar status da conexão
     */
    public boolean checkConnection() {
        try {
            String url = evolutionApiUrl + "/instance/connectionState/" + instanceName;
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", apiKey);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                String responseBody = response.getBody();
                return responseBody != null && responseBody.contains("open");
            }
            
            return false;
            
        } catch (Exception e) {
            logger.error("❌ Erro ao verificar conexão", e);
            return false;
        }
    }
    
    /**
     * Enviar mensagem de texto
     */
    public boolean sendTextMessage(String phoneNumber, String message) {
        try {
            String url = evolutionApiUrl + "/message/sendText/" + instanceName;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", apiKey);
            
            // Formatar número (remover caracteres especiais e adicionar @s.whatsapp.net)
            String formattedNumber = phoneNumber.replaceAll("[^0-9]", "");
            String remoteJid = formattedNumber + "@s.whatsapp.net";
            
            ObjectNode body = objectMapper.createObjectNode();
            body.put("number", remoteJid);
            ObjectNode textMessage = objectMapper.createObjectNode();
            textMessage.put("text", message);
            body.set("textMessage", textMessage);
            
            HttpEntity<String> request = new HttpEntity<>(body.toString(), headers);
            
            logger.info("📱 Enviando mensagem via Evolution API para: {}", remoteJid);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.CREATED) {
                logger.info("✅ Mensagem enviada com sucesso");
                logger.info("📋 Response: {}", response.getBody());
                return true;
            } else {
                logger.error("❌ Erro ao enviar mensagem. Status: {}", response.getStatusCode());
                logger.error("📋 Response body: {}", response.getBody());
                return false;
            }
            
        } catch (Exception e) {
            logger.error("❌ Erro ao enviar mensagem via Evolution API", e);
            logger.error("💥 Detalhe: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Enviar documento/arquivo (PDF)
     */
    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                logger.error("❌ Arquivo não existe: {}", filePath);
                return false;
            }
            
            logger.info("📤 Preparando envio do arquivo: {}", file.getName());
            logger.info("📊 Tamanho: {} bytes", file.length());
            
            String url = evolutionApiUrl + "/message/sendMedia/" + instanceName;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", apiKey);
            
            // Formatar número
            String formattedNumber = phoneNumber.replaceAll("[^0-9]", "");
            String remoteJid = formattedNumber + "@s.whatsapp.net";
            
            // Ler arquivo e converter para Base64
            byte[] fileContent = Files.readAllBytes(Path.of(filePath));
            String base64File = Base64.getEncoder().encodeToString(fileContent);
            
            ObjectNode body = objectMapper.createObjectNode();
            body.put("number", remoteJid);
            
            ObjectNode mediaMessage = objectMapper.createObjectNode();
            mediaMessage.put("mediatype", "document");
            mediaMessage.put("fileName", file.getName());
            mediaMessage.put("media", base64File);
            if (message != null && !message.isEmpty()) {
                mediaMessage.put("caption", message);
            }
            
            body.set("mediaMessage", mediaMessage);
            
            HttpEntity<String> request = new HttpEntity<>(body.toString(), headers);
            
            logger.info("📤 Enviando arquivo via Evolution API para: {}", remoteJid);
            logger.info("🔗 URL: {}", url);
            logger.info("📄 Arquivo: {}", file.getName());
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK || response.getStatusCode() == HttpStatus.CREATED) {
                logger.info("✅ Arquivo enviado com sucesso via Evolution API");
                logger.info("📋 Response: {}", response.getBody());
                return true;
            } else {
                logger.error("❌ Erro ao enviar arquivo. Status: {}", response.getStatusCode());
                logger.error("📋 Response body: {}", response.getBody());
                return false;
            }
            
        } catch (Exception e) {
            logger.error("❌ Erro ao enviar arquivo via Evolution API", e);
            logger.error("💥 Detalhe: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Desconectar instância
     */
    public boolean disconnectInstance() {
        try {
            String url = evolutionApiUrl + "/instance/logout/" + instanceName;
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", apiKey);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, request, String.class);
            
            return response.getStatusCode() == HttpStatus.OK;
            
        } catch (Exception e) {
            logger.error("❌ Erro ao desconectar instância", e);
            return false;
        }
    }
}

