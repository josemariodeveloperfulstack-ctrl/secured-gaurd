package com.z7design.secured_guard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;

@Service
public class BaileysRestService {
    
    private static final Logger logger = LoggerFactory.getLogger(BaileysRestService.class);
    
    @Value("${baileys.rest.url:http://localhost:3333}")
    private String baileysRestUrl;
    
    @Value("${baileys.rest.token:}")
    private String baileysToken;
    
    @Value("${baileys.rest.instance.key:securedguard}")
    private String instanceKey;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public BaileysRestService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }
    
    /**
     * Inicializa uma nova instância do Baileys REST API
     */
    public boolean initializeInstance() {
        try {
            String url = baileysRestUrl + "/instance/init";
            if (!baileysToken.isEmpty()) {
                url += "?key=" + instanceKey + "&token=" + baileysToken;
            } else {
                url += "?key=" + instanceKey;
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            logger.info("Inicializando instância Baileys REST: {}", instanceKey);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("Instância Baileys REST inicializada com sucesso");
                return true;
            } else {
                logger.error("Erro ao inicializar instância. Status: {}", response.getStatusCode());
                return false;
            }
            
        } catch (Exception e) {
            logger.error("Erro ao inicializar instância Baileys REST", e);
            return false;
        }
    }
    
    /**
     * Verifica se a instância está conectada
     */
    public boolean checkConnection() {
        try {
            String url = baileysRestUrl + "/instance/connectionState?key=" + instanceKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                // Verificar se está conectado
                String responseBody = response.getBody();
                return responseBody != null && responseBody.contains("open");
            }
            
            return false;
            
        } catch (Exception e) {
            logger.error("Erro ao verificar conexão Baileys REST", e);
            return false;
        }
    }
    
    /**
     * Normaliza número de telefone para formato WhatsApp com DDI
     * Exemplo: 31971731747 -> 5531971731747
     */
    private String normalizePhoneNumber(String phoneNumber) {
        // Remover caracteres especiais
        String cleanNumber = phoneNumber.replaceAll("[^0-9]", "");
        
        // Se já começar com 55 (DDI Brasil), tratar e retornar
        if (cleanNumber.startsWith("55")) {
            // Regra BR: se for 55 + DDD + 9 + 8 dígitos (13 no total), remover o 9 extra
            if (cleanNumber.length() == 13 && cleanNumber.charAt(4) == '9') {
                String adjusted = cleanNumber.substring(0, 4) + cleanNumber.substring(5);
                logger.info("📞 BR ajuste (removendo 9 extra): {} -> {}", cleanNumber, adjusted);
                return adjusted;
            }
            logger.info("📞 Número já tem DDI: {}", cleanNumber);
            return cleanNumber;
        }
        
        // Se tiver 10/11/12 dígitos (formatos nacionais), adicionar DDI 55
        if (cleanNumber.length() == 10 || cleanNumber.length() == 11 || cleanNumber.length() == 12) {
            String normalized = "55" + cleanNumber;
            // Após adicionar 55, aplicar regra do 9 extra se aplicável
            if (normalized.length() == 13 && normalized.charAt(4) == '9') {
                String adjusted = normalized.substring(0, 4) + normalized.substring(5);
                logger.info("📞 BR ajuste (removendo 9 extra): {} -> {}", normalized, adjusted);
                return adjusted;
            }
            logger.info("📞 Número normalizado: {} -> {}", cleanNumber, normalized);
            return normalized;
        }
        
        // Se tiver outro tamanho, assumir que já é internacional
        logger.warn("⚠️ Número com formato não padrão: {} (tamanho: {})", cleanNumber, cleanNumber.length());
        return cleanNumber;
    }
    
    /**
     * Envia mensagem de texto via Baileys REST API
     */
    public boolean sendTextMessage(String phoneNumber, String message) {
        try {
            // Normalizar número com DDI
            String normalizedNumber = normalizePhoneNumber(phoneNumber);
            
            String url = baileysRestUrl + "/message/text?key=" + instanceKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            
            String body = "id=" + normalizedNumber + "&message=" + message;
            
            HttpEntity<String> request = new HttpEntity<>(body, headers);
            
            logger.info("📤 Enviando mensagem via Baileys REST para: {}", normalizedNumber);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("Mensagem enviada com sucesso via Baileys REST");
                return true;
            } else {
                logger.error("Erro ao enviar mensagem. Status: {}", response.getStatusCode());
                return false;
            }
            
        } catch (Exception e) {
            logger.error("Erro ao enviar mensagem via Baileys REST", e);
            return false;
        }
    }
    
    /**
     * Converte caminho do sistema de arquivos local para caminho do Docker
     * Exemplo: C:\dev\secured-guard\backend\holerites\9-2025\arquivo.pdf -> /app/holerites/9-2025/arquivo.pdf
     */
    private String convertToDockerPath(String localPath) {
        // Substituir backslashes por forward slashes
        String normalizedPath = localPath.replace("\\", "/");
        
        // Encontrar "backend/holerites" e substituir pelo caminho do Docker
        int index = normalizedPath.indexOf("backend/holerites");
        if (index != -1) {
            // Pegar a parte após "backend/"
            String relativePath = normalizedPath.substring(index + "backend/".length());
            String dockerPath = "/app/" + relativePath;
            logger.info("🔄 Convertendo caminho: {} -> {}", localPath, dockerPath);
            return dockerPath;
        }
        
        // Se não encontrar, retornar o caminho original
        logger.warn("⚠️ Não foi possível converter o caminho para Docker: {}", localPath);
        return normalizedPath;
    }
    
    /**
     * Envia arquivo via Baileys REST API
     * MODIFICADO: Converte caminho local para caminho Docker antes de enviar
     * CORRIGIDO: Adiciona DDI 55 para evitar redirecionamento
     */
    public boolean sendFileMessage(String phoneNumber, String message, String filePath) {
        try {
            // Verificar se arquivo existe
            File file = new File(filePath);
            if (!file.exists()) {
                logger.error("❌ Arquivo não existe: {}", filePath);
                return false;
            }
            
            logger.info("📤 Preparando envio do arquivo: {}", file.getName());
            logger.info("📊 Tamanho: {} bytes", file.length());
            
            // CORREÇÃO: Normalizar número com DDI 55
            String normalizedNumber = normalizePhoneNumber(phoneNumber);
            
            // Converter caminho local para caminho Docker
            String dockerFilePath = convertToDockerPath(filePath);
            
            String url = baileysRestUrl + "/message/document?key=" + instanceKey;
            
            // Criar headers para JSON
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Criar JSON body com os parâmetros esperados pela API Baileys
            ObjectNode body = objectMapper.createObjectNode();
            body.put("id", normalizedNumber);  // ← NÚMERO NORMALIZADO COM DDI
            body.put("filepath", dockerFilePath);
            if (message != null && !message.isEmpty()) {
                body.put("message", message);
            }
            
            HttpEntity<String> request = new HttpEntity<>(body.toString(), headers);
            
            logger.info("📤 Enviando arquivo via Baileys REST para: {}", normalizedNumber);
            logger.info("🔗 URL: {}", url);
            logger.info("📄 Filepath Docker: {}", dockerFilePath);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("✅ Arquivo enviado com sucesso via Baileys REST");
                logger.info("📋 Response: {}", response.getBody());
                return true;
            } else {
                logger.error("❌ Erro ao enviar arquivo. Status: {}", response.getStatusCode());
                logger.error("📋 Response body: {}", response.getBody());
                return false;
            }
            
        } catch (Exception e) {
            logger.error("❌ Erro ao enviar arquivo via Baileys REST", e);
            logger.error("💥 Erro detalhe: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Obtém QR Code para conexão
     */
    public String getQRCode() {
        try {
            // Solicita QR Code em formato base64
            String url = baileysRestUrl + "/instance/qr?key=" + instanceKey + "&format=base64";
            
            logger.info("📸 Solicitando QR Code de: {}", url);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            logger.info("📊 Status da resposta QR Code: {}", response.getStatusCode());
            
            if (response.getStatusCode() == HttpStatus.OK) {
                String body = response.getBody();
                logger.info("✅ QR Code recebido. Tamanho: {} caracteres", body != null ? body.length() : 0);
                
                if (body != null) {
                    try {
                        // Parse do JSON para extrair o campo base64
                        ObjectMapper mapper = new ObjectMapper();
                        JsonNode jsonNode = mapper.readTree(body);
                        String base64 = jsonNode.get("base64").asText();
                        
                        logger.info("📸 QR Code base64 extraído. Tamanho: {} caracteres", base64.length());
                        return base64;
                    } catch (Exception parseEx) {
                        logger.warn("⚠️ Não foi possível fazer parse do JSON, retornando corpo direto", parseEx);
                        return body;
                    }
                }
            } else {
                logger.warn("⚠️ Status inesperado ao obter QR Code: {}", response.getStatusCode());
            }
            
            return null;
            
        } catch (Exception e) {
            logger.error("❌ Erro ao obter QR Code de {}", baileysRestUrl, e);
            logger.error("💥 Detalhes do erro: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Desconecta a instância
     */
    public boolean disconnectInstance() {
        try {
            String url = baileysRestUrl + "/instance/logout?key=" + instanceKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            return response.getStatusCode() == HttpStatus.OK;
            
        } catch (Exception e) {
            logger.error("Erro ao desconectar instância", e);
            return false;
        }
    }
} 