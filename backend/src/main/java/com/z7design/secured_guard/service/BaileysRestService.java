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
     * Retorna a URL configurada do serviço Baileys REST
     */
    public String getServiceUrl() {
        return baileysRestUrl;
    }
    
    /**
     * Retorna se o Baileys está habilitado
     */
    public boolean isEnabled() {
        return baileysEnabled;
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
            restTemplate.postForEntity(url, request, String.class);
            
            // Aguardar um pouco para garantir que a sessão foi limpa
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            
            logger.info("✅ Instância Baileys REST resetada com sucesso");
            return true;
            
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            // Se a conexão já está fechada, isso é esperado e não é um erro
            if (e.getStatusCode().value() == 500 && e.getResponseBodyAsString() != null 
                && e.getResponseBodyAsString().contains("Connection Closed")) {
                logger.info("ℹ️ Conexão já estava fechada, continuando com reset");
                return true;
            }
            logger.warn("⚠️ Erro ao resetar instância: {}", e.getMessage());
            return true; // Continuar mesmo com erro, pois a instância pode não existir
        } catch (Exception e) {
            logger.warn("⚠️ Erro ao resetar instância (pode não existir): {}", e.getMessage());
            // Não retornar false, pois a instância pode não existir
            return true;
        }
    }
    
    /**
     * Inicializa uma nova instância do Baileys REST API
     * Apenas faz logout se a conexão estiver fechada para otimizar performance
     */
    public boolean initializeInstance() {
        try {
            // Se Baileys não estiver habilitado, retornar false sem tentar inicializar
            if (!baileysEnabled) {
                logger.debug("Baileys não está habilitado. Não é possível inicializar instância.");
                return false;
            }
            
            // Verificar estado da conexão - só fazer logout se necessário (conexão fechada)
            String connectionState = checkConnectionState();
            if ("closed".equals(connectionState) || "close".equals(connectionState)) {
                logger.info("🔄 Conexão está fechada. Resetando instância...");
                resetInstance();
                // Aguardar apenas o tempo mínimo necessário
                try {
                    Thread.sleep(1000);
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
     * Verifica se o serviço Baileys REST está disponível (health check)
     * Retorna true se o serviço está rodando, independente do estado da conexão WhatsApp
     */
    public boolean isServiceAvailable() {
        try {
            // Se Baileys não estiver habilitado, retornar false
            if (!baileysEnabled) {
                logger.warn("⚠️ Baileys não está habilitado. Verifique a configuração baileys.enabled. URL configurada: {}", baileysRestUrl);
                lastErrorMessage = "Baileys não está habilitado. Verifique a configuração.";
                return false;
            }
            
            logger.info("🔍 Verificando disponibilidade do Baileys REST em: {}", baileysRestUrl);
            logger.info("🔍 Configuração: enabled={}, instanceKey={}", baileysEnabled, instanceKey);
            
            // Tentar primeiro o endpoint /health
            try {
                String healthUrl = baileysRestUrl + "/health";
                logger.info("🔍 Tentando health check em: {}", healthUrl);
                ResponseEntity<String> healthResponse = restTemplate.getForEntity(healthUrl, String.class);
                if (healthResponse.getStatusCode() == HttpStatus.OK) {
                    logger.info("✅ Serviço Baileys REST está disponível (health check OK) - URL: {}", baileysRestUrl);
                    lastErrorMessage = null;
                    return true;
                }
            } catch (org.springframework.web.client.ResourceAccessException e) {
                logger.error("❌ Endpoint /health não acessível - Erro de conexão: {}", e.getMessage());
                logger.error("   Verifique se o container 'whatsapp-service-ci' está rodando e acessível em: {}", baileysRestUrl);
                logger.error("   No ambiente CI, o serviço deve estar na rede Docker 'secured-guard-ci-network' ou 'z7network'");
            } catch (Exception e) {
                logger.warn("⚠️ Endpoint /health não disponível, tentando endpoint alternativo: {}", e.getMessage());
            }
            
            // Se /health falhar, tentar um endpoint básico que sempre existe
            try {
                String url = baileysRestUrl + "/instance/connectionState?key=" + instanceKey;
                logger.debug("🔍 Tentando connectionState em: {}", url);
                ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
                
                if (response.getStatusCode() == HttpStatus.OK) {
                    logger.info("✅ Serviço Baileys REST está disponível (connectionState OK)");
                    lastErrorMessage = null;
                    return true;
                }
            } catch (org.springframework.web.client.ResourceAccessException e) {
                logger.warn("⚠️ Endpoint connectionState não acessível: {}", e.getMessage());
                lastErrorMessage = "Serviço WhatsApp não disponível. Verifique se o container Docker do Baileys REST está rodando em: " + baileysRestUrl;
            } catch (Exception e) {
                logger.warn("⚠️ Erro ao verificar connectionState: {}", e.getMessage());
            }
            
            logger.warn("❌ Serviço Baileys REST não está disponível em: {}", baileysRestUrl);
            lastErrorMessage = "Serviço WhatsApp não disponível. Verifique se o container Docker do Baileys REST está rodando.";
            return false;
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Serviço não disponível - não está rodando ou não é acessível
            logger.error("❌ Erro de conexão com Baileys REST em {}: {}", baileysRestUrl, e.getMessage());
            lastErrorMessage = "Serviço WhatsApp não disponível. Erro de conexão: " + e.getMessage();
            return false;
        } catch (Exception e) {
            // Outros erros - logar mas não crashar
            logger.error("❌ Erro ao verificar disponibilidade do serviço Baileys REST: {}", e.getMessage(), e);
            lastErrorMessage = "Erro ao verificar disponibilidade: " + e.getMessage();
            return false;
        }
    }
    
    /**
     * Verifica o estado da conexão e retorna o estado como string
     * Retorna: "open", "close", "connecting", "closed", ou null se não disponível
     */
    public String getConnectionState() {
        try {
            // Se Baileys não estiver habilitado, retornar "closed"
            if (!baileysEnabled) {
                logger.debug("Baileys não está habilitado. Retornando closed.");
                return "closed";
            }
            
            String url = baileysRestUrl + "/instance/connectionState?key=" + instanceKey;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> request = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                String responseBody = response.getBody();
                if (responseBody != null) {
                    // Extrair o estado da conexão do JSON
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        JsonNode jsonNode = mapper.readTree(responseBody);
                        String state = jsonNode.get("state").asText();
                        logger.debug("📱 Estado da conexão WhatsApp: {}", state);
                        return state;
                    } catch (Exception e) {
                        // Se não conseguir fazer parse, verificar se contém "open"
                        if (responseBody.contains("\"open\"") || responseBody.contains("open")) {
                            return "open";
                        } else if (responseBody.contains("\"close\"") || responseBody.contains("close")) {
                            return "close";
                        } else if (responseBody.contains("\"connecting\"") || responseBody.contains("connecting")) {
                            return "connecting";
                        }
                    }
                }
            }
            
            return "closed";
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            logger.debug("Serviço Baileys REST não disponível: {}", e.getMessage());
            lastErrorMessage = "Serviço WhatsApp não disponível: " + e.getMessage();
            return null;
        } catch (Exception e) {
            logger.warn("⚠️ Erro ao verificar conexão Baileys REST: {}", e.getMessage());
            lastErrorMessage = "Erro ao verificar conexão: " + e.getMessage();
            return null;
        }
    }
    
    /**
     * Verifica se a instância está conectada (método legado para compatibilidade)
     */
    public boolean checkConnection() {
        String state = getConnectionState();
        return "open".equals(state);
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
     * Exemplo: /app/backend/holerites/... -> /app/holerites/...
     */
    private String convertToDockerPath(String localPath) {
        // Substituir backslashes por forward slashes
        String normalizedPath = localPath.replace("\\", "/");
        
        // Se já estiver no formato Docker com /app/backend/holerites, remover /backend
        if (normalizedPath.startsWith("/app/backend/holerites")) {
            String dockerPath = normalizedPath.replace("/app/backend/holerites", "/app/holerites");
            logger.info("🔄 Convertendo caminho Docker: {} -> {}", localPath, dockerPath);
            return dockerPath;
        }
        
        // Encontrar "backend/holerites" e substituir pelo caminho do Docker
        int index = normalizedPath.indexOf("backend/holerites");
        if (index != -1) {
            // Pegar a parte após "backend/"
            String relativePath = normalizedPath.substring(index + "backend/".length());
            String dockerPath = "/app/" + relativePath;
            logger.info("🔄 Convertendo caminho: {} -> {}", localPath, dockerPath);
            return dockerPath;
        }
        
        // Se já começar com /app/holerites, retornar como está
        if (normalizedPath.startsWith("/app/holerites")) {
            logger.info("✅ Caminho já está no formato Docker: {}", normalizedPath);
            return normalizedPath;
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
            // Verificar se arquivo existe no caminho original
            File file = new File(filePath);
            if (!file.exists()) {
                lastErrorMessage = "Arquivo não encontrado no backend: " + filePath;
                logger.error("❌ Arquivo não existe no backend: {}", filePath);
                logger.info("💡 O arquivo precisa existir no backend antes de ser enviado ao WhatsApp");
                return false;
            }
            
            logger.info("📤 Preparando envio do arquivo: {}", file.getName());
            logger.info("📊 Tamanho: {} bytes", file.length());
            logger.info("📂 Caminho original (backend): {}", filePath);
            
            // CORREÇÃO: Normalizar número com DDI 55
            String normalizedNumber = normalizePhoneNumber(phoneNumber);
            
            // Converter caminho local para caminho Docker (que o serviço WhatsApp pode acessar)
            String dockerFilePath = convertToDockerPath(filePath);
            logger.info("📂 Caminho Docker (WhatsApp): {}", dockerFilePath);
            
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
            
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            // QR Code ainda não está disponível - isso é esperado após inicialização
            // Não logar como ERROR, apenas como DEBUG/WARNING
            String errorBody = e.getResponseBodyAsString();
            if (errorBody != null && errorBody.contains("QR not available")) {
                logger.debug("⏳ QR Code ainda não disponível (esperado após inicialização) - URL: {}", baileysRestUrl);
            } else {
                logger.warn("⚠️ QR Code não encontrado: {} - URL: {}", e.getMessage(), baileysRestUrl);
            }
            // Re-lançar a exceção para que o controller possa tratar adequadamente
            throw e;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // Outros erros HTTP 4xx
            String errorBody = e.getResponseBodyAsString();
            if (errorBody != null && errorBody.contains("QR not available")) {
                logger.debug("⏳ QR Code ainda não disponível (esperado após inicialização) - URL: {}", baileysRestUrl);
            } else {
                logger.warn("⚠️ Erro HTTP ao obter QR Code: {} - URL: {}", e.getMessage(), baileysRestUrl);
            }
            throw e;
        } catch (Exception e) {
            // Apenas logar como ERROR se não for um erro esperado de QR não disponível
            String errorMessage = e.getMessage();
            if (errorMessage != null && errorMessage.contains("QR not available")) {
                logger.debug("⏳ QR Code ainda não disponível (esperado após inicialização) - URL: {}", baileysRestUrl);
            } else {
                logger.error("❌ Erro ao obter QR Code de {}", baileysRestUrl, e);
                logger.error("💥 Detalhes do erro: {}", e.getMessage());
            }
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
            
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            // Se a conexão já está fechada, isso é esperado e não é um erro
            if (e.getStatusCode().value() == 500 && e.getResponseBodyAsString() != null 
                && e.getResponseBodyAsString().contains("Connection Closed")) {
                logger.info("ℹ️ Conexão já estava fechada, logout concluído");
                return true;
            }
            logger.error("Erro ao desconectar instância", e);
            return false;
        } catch (Exception e) {
            logger.error("Erro ao desconectar instância", e);
            return false;
        }
    }
} 