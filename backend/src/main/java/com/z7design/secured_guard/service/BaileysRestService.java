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
    
    @Value("${baileys.enabled:false}")
    private boolean baileysEnabled;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final com.z7design.secured_guard.config.WhatsAppTestConfig testConfig;
    private String lastErrorMessage;
    
    public BaileysRestService(RestTemplate restTemplate, ObjectMapper objectMapper,
                             com.z7design.secured_guard.config.WhatsAppTestConfig testConfig) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.testConfig = testConfig;
        this.lastErrorMessage = null;
    }
    
    /**
     * Retorna a última mensagem de erro registrada
     */
    public String getLastErrorMessage() {
        return lastErrorMessage;
    }
    
    /**
     * Faz logout e limpa a sessão do Baileys REST API
     * Isso força uma nova conexão que gerará um novo QR Code
     */
    public boolean resetInstance() {
        try {
            String url = baileysRestUrl + "/instance/logout?key=" + instanceKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            logger.info("🔄 Fazendo logout e resetando instância Baileys REST: {}", instanceKey);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            // Aguardar um pouco para garantir que a sessão foi limpa
            Thread.sleep(1000);
            
            logger.info("✅ Instância Baileys REST resetada com sucesso");
            return true;
            
        } catch (Exception e) {
            logger.warn("⚠️ Erro ao resetar instância (pode não existir): {}", e.getMessage());
            // Não retornar false, pois a instância pode não existir
            return true;
        }
    }
    
    /**
     * Inicializa uma nova instância do Baileys REST API
     * Se a conexão estiver fechada, deleta a instância antes de criar uma nova
     */
    public boolean initializeInstance() {
        try {
            // Se Baileys não estiver habilitado, retornar false sem tentar inicializar
            if (!baileysEnabled) {
                logger.debug("Baileys não está habilitado. Não é possível inicializar instância.");
                return false;
            }
            
            // Verificar se a conexão está fechada
            String connectionState = checkConnectionState();
            if ("closed".equals(connectionState) || "close".equals(connectionState)) {
                logger.info("🔄 Conexão está fechada. Resetando instância antes de recriar...");
                resetInstance();
                // Aguardar um pouco para garantir que a sessão foi limpa
                try {
                    Thread.sleep(2000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            
            String url = baileysRestUrl + "/instance/init";
            if (!baileysToken.isEmpty()) {
                url += "?key=" + instanceKey + "&token=" + baileysToken;
            } else {
                url += "?key=" + instanceKey;
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            logger.info("🔄 Inicializando instância Baileys REST: {}", instanceKey);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("✅ Instância Baileys REST inicializada com sucesso");
                return true;
            } else {
                logger.error("❌ Erro ao inicializar instância. Status: {}", response.getStatusCode());
                lastErrorMessage = "Erro ao inicializar instância. Status: " + response.getStatusCode();
                return false;
            }
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Serviço não disponível - não é um erro crítico
            logger.warn("⚠️ Serviço Baileys REST não disponível: {}", e.getMessage());
            lastErrorMessage = "Serviço WhatsApp não disponível: " + e.getMessage();
            return false;
        } catch (Exception e) {
            logger.error("❌ Erro ao inicializar instância Baileys REST: {}", e.getMessage());
            lastErrorMessage = "Erro ao inicializar instância: " + e.getMessage();
            return false;
        }
    }
    
    /**
     * Verifica o estado da conexão (open, close, connecting)
     */
    private String checkConnectionState() {
        try {
            // Se Baileys não estiver habilitado, retornar "closed"
            if (!baileysEnabled) {
                return "closed";
            }
            
            String url = baileysRestUrl + "/instance/connectionState?key=" + instanceKey;
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode jsonNode = mapper.readTree(response.getBody());
                    String state = jsonNode.get("state").asText();
                    logger.info("📊 Estado da conexão: {}", state);
                    return state;
                } catch (Exception e) {
                    logger.warn("⚠️ Não foi possível fazer parse do estado da conexão");
                    return "unknown";
                }
            }
            
            return "unknown";
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Serviço não disponível - não é um erro crítico
            logger.debug("Serviço Baileys REST não disponível ao verificar estado: {}", e.getMessage());
            return "closed";
        } catch (Exception e) {
            logger.warn("⚠️ Erro ao verificar estado da conexão: {}", e.getMessage());
            return "unknown";
        }
    }
    
    /**
     * Verifica se a instância está conectada
     */
    public boolean checkConnection() {
        try {
            // Se Baileys não estiver habilitado, retornar false sem tentar conectar
            if (!baileysEnabled) {
                logger.debug("Baileys não está habilitado. Retornando false.");
                return false;
            }
            
            String url = baileysRestUrl + "/instance/connectionState?key=" + instanceKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            // Timeout curto para não travar a aplicação
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                // Verificar se está conectado
                String responseBody = response.getBody();
                return responseBody != null && responseBody.contains("open");
            }
            
            return false;
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Serviço não disponível - não é um erro crítico
            logger.debug("Serviço Baileys REST não disponível: {}", e.getMessage());
            lastErrorMessage = "Serviço WhatsApp não disponível: " + e.getMessage();
            return false;
        } catch (Exception e) {
            // Outros erros - logar mas não crashar
            logger.warn("⚠️ Erro ao verificar conexão Baileys REST: {}", e.getMessage());
            lastErrorMessage = "Erro ao verificar conexão: " + e.getMessage();
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
        lastErrorMessage = null; // Limpar erro anterior
        
        try {
            // Verificar se está conectado
            if (!checkConnection()) {
                lastErrorMessage = "WhatsApp não está conectado. Verifique a conexão e tente novamente.";
                logger.error("❌ Tentativa de envio com WhatsApp desconectado");
                return false;
            }
            
            // Normalizar número com DDI
            String normalizedNumber = normalizePhoneNumber(phoneNumber);
            
            String url = baileysRestUrl + "/message/text?key=" + instanceKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Criar body JSON
            ObjectNode body = objectMapper.createObjectNode();
            body.put("id", normalizedNumber);
            body.put("message", message);
            
            HttpEntity<String> request = new HttpEntity<>(body.toString(), headers);
            
            logger.info("📤 Enviando mensagem via Baileys REST para: {} (normalizado: {})", phoneNumber, normalizedNumber);
            logger.info("📝 Mensagem: {}", message);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("✅ Mensagem enviada com sucesso via Baileys REST para: {}", normalizedNumber);
                lastErrorMessage = null; // Limpar erro em caso de sucesso
                return true;
            } else {
                String errorMsg = String.format("Erro HTTP %s: %s", response.getStatusCode(), response.getBody());
                lastErrorMessage = errorMsg;
                logger.error("❌ Erro ao enviar mensagem. Status: {}, Body: {}", response.getStatusCode(), response.getBody());
                return false;
            }
            
        } catch (org.springframework.web.client.RestClientException e) {
            lastErrorMessage = "Erro ao comunicar com serviço Baileys: " + e.getMessage() + ". Verifique se o serviço está rodando na porta 3333.";
            logger.error("❌ Erro ao enviar mensagem via Baileys REST", e);
            logger.error("💥 Erro detalhe: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            lastErrorMessage = "Erro inesperado: " + e.getMessage();
            logger.error("❌ Erro ao enviar mensagem via Baileys REST", e);
            logger.error("💥 Erro detalhe: {}", e.getMessage());
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
        lastErrorMessage = null; // Limpar erro anterior
        
        // ⚠️ PROTEÇÃO: Verificar limite de envios (modo teste Baileys)
        if (!testConfig.canSendMessage(phoneNumber)) {
            lastErrorMessage = "Limite de testes atingido. Migre para WhatsApp Cloud API oficial.";
            logger.error("🚫 Envio bloqueado - Limite de testes atingido");
            logger.warn("💡 SOLUÇÃO: Migre para WhatsApp Cloud API (oficial)");
            logger.warn("📄 Guia: MIGRACAO_WHATSAPP_BUSINESS_API_OFICIAL.md");
            return false;
        }
        
        try {
            // Verificar se arquivo existe
            File file = new File(filePath);
            if (!file.exists()) {
                lastErrorMessage = "Arquivo não encontrado: " + filePath;
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
                
                // Incrementar contador (proteção)
                testConfig.incrementMessageCount();
                
                // Avisar sobre migração se próximo do limite
                if (testConfig.getRemainingMessages() <= 5) {
                    testConfig.showMigrationWarning();
                }
                
                lastErrorMessage = null; // Limpar erro em caso de sucesso
                return true;
            } else {
                String errorMsg = String.format("Erro HTTP %s: %s", response.getStatusCode(), response.getBody());
                lastErrorMessage = errorMsg;
                logger.error("❌ Erro ao enviar arquivo. Status: {}", response.getStatusCode());
                logger.error("📋 Response body: {}", response.getBody());
                return false;
            }
            
        } catch (org.springframework.web.client.RestClientException e) {
            lastErrorMessage = "Erro ao comunicar com serviço Baileys: " + e.getMessage() + ". Verifique se o serviço está rodando na porta 3333.";
            logger.error("❌ Erro ao enviar arquivo via Baileys REST", e);
            logger.error("💥 Erro detalhe: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            lastErrorMessage = "Erro inesperado: " + e.getMessage();
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