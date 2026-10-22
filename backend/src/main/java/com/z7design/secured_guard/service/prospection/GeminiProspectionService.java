package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class GeminiProspectionService {

    private WebClient webClient;
    private final ObjectMapper objectMapper;
    private boolean enabled;
    private String apiKey;
    private String googlePlacesApiKey;
    private String model;
    private final String apiUrl;

    public GeminiProspectionService(
            @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}") String apiUrl,
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${gemini.api.enabled:true}") boolean geminiEnabled,
            @Value("${gemini.prospection.model:gemini-1.5-flash}") String model,
            @Value("${google.places.api.key:}") String googlePlacesApiKey) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.googlePlacesApiKey = googlePlacesApiKey != null ? googlePlacesApiKey.trim() : "";
        this.model = model != null && !model.isBlank() ? model : "gemini-1.5-flash";
        this.enabled = !this.apiKey.isBlank() && geminiEnabled;
        this.objectMapper = new ObjectMapper();
        initWebClient();
    }

    private synchronized void initWebClient() {
        if (!this.apiKey.isBlank()) {
            this.webClient = WebClient.builder()
                    .baseUrl(apiUrl)
                    .build();
            this.enabled = true;
        } else {
            this.webClient = null;
            this.enabled = false;
        }
    }

    public synchronized void updateCredentials(String geminiKey, String placesKey, String customModel) {
        if (geminiKey != null) {
            this.apiKey = geminiKey.trim();
        }
        if (placesKey != null) {
            this.googlePlacesApiKey = placesKey.trim();
        }
        if (customModel != null && !customModel.isBlank()) {
            this.model = customModel.trim();
        }
        initWebClient();
        log.info("GeminiProspectionService: Credenciais atualizadas via painel. Gemini ativo={}, Places ativo={}", 
                isConfigured(), hasGooglePlacesKey());
    }

    public Map<String, Object> getCredentialsStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("geminiConfigured", isConfigured());
        status.put("geminiMaskedKey", maskKey(apiKey));
        status.put("model", model);
        status.put("googlePlacesConfigured", hasGooglePlacesKey());
        status.put("googlePlacesMaskedKey", maskKey(googlePlacesApiKey));
        return status;
    }

    public boolean hasGooglePlacesKey() {
        return googlePlacesApiKey != null && !googlePlacesApiKey.isBlank();
    }

    private String maskKey(String key) {
        if (key == null || key.isBlank()) return "";
        if (key.length() <= 8) return "********";
        return key.substring(0, 4) + "..." + key.substring(key.length() - 4);
    }

    public boolean isConfigured() {
        return enabled && webClient != null;
    }

    /**
     * Prospecção assistida por IA: identifica empresas ideais para serviços de facilities, portaria e segurança patrimonial
     */
    public List<Map<String, Object>> searchProspectsWithAi(String cidade, String uf, String segmento, Integer quantidade) {
        int limit = (quantidade != null && quantidade > 0) ? Math.min(quantidade, 15) : 8;

        if (isConfigured()) {
            try {
                String prompt = buildProspectionPrompt(cidade, uf, segmento, limit);
                Map<String, Object> body = new HashMap<>();
                Map<String, Object> content = new HashMap<>();
                content.put("parts", List.of(Map.of("text", prompt)));
                body.put("contents", List.of(content));

                String modelPath = model.startsWith("models/") ? model : "models/" + model;
                JsonNode response = null;
                try {
                    response = webClient.post()
                            .uri("/" + modelPath + ":generateContent?key=" + apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(body)
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .timeout(Duration.ofSeconds(25))
                            .block();
                } catch (Exception modelEx) {
                    log.warn("Tentando modelo alternativo gemini-1.5-flash-latest após erro: {}", modelEx.getMessage());
                    try {
                        response = webClient.post()
                                .uri("/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey)
                                .contentType(MediaType.APPLICATION_JSON)
                                .bodyValue(body)
                                .retrieve()
                                .bodyToMono(JsonNode.class)
                                .timeout(Duration.ofSeconds(25))
                                .block();
                    } catch (Exception altEx) {
                        log.error("Erro ao consultar Gemini para prospecção: {}", altEx.getMessage());
                    }
                }

                if (response != null && response.has("candidates")) {
                    JsonNode textNode = response.path("candidates").get(0)
                            .path("content").path("parts").get(0).path("text");
                    if (!textNode.isMissingNode()) {
                        String rawJson = cleanJsonOutput(textNode.asText());
                        JsonNode parsed = objectMapper.readTree(rawJson);
                        if (parsed.isArray()) {
                            List<Map<String, Object>> list = new ArrayList<>();
                            for (JsonNode item : parsed) {
                                Map<String, Object> map = objectMapper.convertValue(item, Map.class);
                                list.add(map);
                            }
                            return list;
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Erro ao consultar Gemini para prospecção: {}", e.getMessage());
            }
        }

        // Busca dados reais de estabelecimentos via OpenStreetMap Nominatim
        return searchRealBusinessesWithOsm(cidade, uf, segmento, limit);
    }

    private String buildProspectionPrompt(String cidade, String uf, String segmento, int limit) {
        return """
            Você é um agente sênior de inteligência comercial B2B para prospecção de clientes reais para o setor de:
            - Segurança Patrimonial Armada e Desarmada
            - Portaria, Recepção e Controle de Acesso
            - Facilities, Zeladoria e Limpeza Predial / Industrial

            Localização Alvo: Cidade de %s - %s
            Segmento ou Palavra-Chave Alvo: %s

            Objetivo:
            Gere uma lista de até %d ESTABELECIMENTOS, EMPRESAS E CONDOMÍNIOS REAIS E EXISTENTES nesta cidade e estado que possuam demanda contínua desses serviços (ex: condomínios residenciais e empresariais reais, hospitais, concessionárias, indústrias, shopping centers, hipermercados e centros de distribuição).

            REGRAS OBRIGATÓRIAS DE DADOS REAIS:
            1. NÃO INVENTE NENHUM DADO MOCKADO OU CNPJ FICTÍCIO (como '00.000.000/0001-00' ou sequências inventadas). Se o CNPJ oficial não for conhecido com certeza absoluta, deixe o campo "cnpj" vazio ("").
            2. Busque e priorize empresas reais com presença verificável (Google Meu Negócio / Maps / Redes Sociais / Diretórios Empresariais).
            3. Higienização Anti-Contabilidade: NÃO traga e-mails ou telefones de escritórios de contabilidade. Descarte e-mails com domínios contábeis.
            4. Priorize TELEFONE DIRETO real (fixo comercial ou WhatsApp comercial do estabelecimento/portaria/administração).
            5. Priorize E-MAIL REAL da empresa (compras, contato, diretoria, sindico, administracao) ou deixe vazio ("") caso não haja e-mail direto verificado.
            6. Tomadores de Decisão (QSA): se conhecido via registro ou redes sociais/Google Meu Negócio (ex: síndico, diretor geral, gerente de compras), informe nome e cargo. Caso não haja certeza, deixe a lista "qsa" vazia []. NUNCA invente nomes genéricos.
            7. Inclua sempre que disponível o link de busca no Google Maps ("googleMapsUrl") ou website ("website") e redes sociais ("socialMediaUrl").

            IMPORTANTE: Retorne ESTRITAMENTE um array JSON válido sem markdown ou texto explicativo:
            [
              {
                "cnpj": "",
                "razaoSocial": "Razão Social ou Nome do Estabelecimento Real",
                "nomeFantasia": "Nome Comercial Real",
                "municipio": "%s",
                "uf": "%s",
                "bairro": "Bairro real",
                "logradouro": "Endereço real",
                "telefone": "Telefone comercial real ou vazio",
                "email": "E-mail comercial verificado ou vazio",
                "website": "URL do site ou perfil se houver",
                "googleMapsUrl": "https://www.google.com/maps/search/...",
                "socialMediaUrl": "Link Instagram/LinkedIn da empresa se houver",
                "cnaeDescricao": "Ramo real da atividade",
                "clientePotencial": true,
                "scoreConversao": 90,
                "motivoConversao": "Justificativa comercial real para necessidade de segurança/facilities",
                "qsa": []
              }
            ]
            """.formatted(cidade, uf, (segmento != null && !segmento.isBlank() ? segmento : "Condomínios, Indústrias e Centros Comerciais"), limit, cidade, uf);
    }

    private String cleanJsonOutput(String raw) {
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    /**
     * Busca estabelecimentos reais via OpenStreetMap Nominatim (dados geográficos e comerciais reais)
     */
    private List<Map<String, Object>> searchRealBusinessesWithOsm(String cidade, String uf, String segmento, int limit) {
        List<Map<String, Object>> list = new ArrayList<>();
        try {
            String query = (segmento != null && !segmento.isBlank() ? segmento : "empresa centro comercial") 
                    + " " + cidade + " " + (uf != null ? uf : "");

            WebClient osmClient = WebClient.builder()
                    .baseUrl("https://nominatim.openstreetmap.org")
                    .defaultHeader("User-Agent", "SecuredGuard-Commercial/1.0 (contato@securedguard.com.br)")
                    .build();

            JsonNode results = osmClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", query)
                            .queryParam("format", "json")
                            .queryParam("addressdetails", "1")
                            .queryParam("extratags", "1")
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (results != null && results.isArray() && results.size() > 0) {
                for (JsonNode place : results) {
                    Map<String, Object> item = new HashMap<>();
                    String name = place.has("name") && !place.get("name").asText().isBlank()
                            ? place.get("name").asText()
                            : (place.has("display_name") ? place.get("display_name").asText().split(",")[0] : "Estabelecimento Comercial");

                    JsonNode address = place.path("address");
                    String road = address.path("road").asText("");
                    String houseNumber = address.path("house_number").asText("");
                    String logradouro = (road + (houseNumber.isBlank() ? "" : ", " + houseNumber)).trim();
                    if (logradouro.isBlank()) logradouro = address.path("industrial").asText("");
                    if (logradouro.isBlank()) logradouro = address.path("commercial").asText("");

                    String bairro = address.path("suburb").asText("");
                    if (bairro.isBlank()) bairro = address.path("neighbourhood").asText("");
                    if (bairro.isBlank()) bairro = address.path("city_district").asText("");

                    String city = address.path("city").asText(cidade);
                    if (city.isBlank()) city = address.path("town").asText(cidade);
                    if (city.isBlank()) city = address.path("municipality").asText(cidade);

                    String state = address.path("state").asText(uf);
                    String cep = address.path("postcode").asText("");

                    JsonNode extratags = place.path("extratags");
                    String phone = extratags.path("phone").asText("");
                    if (phone.isBlank()) phone = extratags.path("contact:phone").asText("");

                    String email = extratags.path("email").asText("");
                    if (email.isBlank()) email = extratags.path("contact:email").asText("");

                    String website = extratags.path("website").asText("");
                    if (website.isBlank()) website = extratags.path("contact:website").asText("");

                    item.put("cnpj", ""); // Sem CNPJ falso; será enriquecido ou preenchido na consulta
                    item.put("razaoSocial", name);
                    item.put("nomeFantasia", name);
                    item.put("municipio", city);
                    item.put("uf", state);
                    item.put("bairro", bairro.isBlank() ? "Área Comercial / Industrial" : bairro);
                    item.put("logradouro", logradouro.isBlank() ? "Endereço registrado na região" : logradouro);
                    item.put("cep", cep);
                    item.put("telefone", phone);
                    item.put("email", email);
                    item.put("website", website);
                    item.put("cnaeDescricao", segmento != null && !segmento.isBlank() ? segmento : "Atividades Empresariais / Comerciais");
                    item.put("clientePotencial", true);
                    item.put("scoreConversao", 88);
                    item.put("motivoConversao", "Estabelecimento real mapeado no OpenStreetMap/Google Maps com necessidade contínua de controle de acesso, portaria e segurança.");
                    item.put("qsa", Collections.emptyList());
                    list.add(item);
                }
                return list;
            }
        } catch (Exception e) {
            log.warn("Erro ao buscar empresas no OpenStreetMap: {}", e.getMessage());
        }
        return list;
    }
}
