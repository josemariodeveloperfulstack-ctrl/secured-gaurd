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

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String apiKey;
    private final String model;

    public GeminiProspectionService(
            @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}") String apiUrl,
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${gemini.api.enabled:true}") boolean geminiEnabled,
            @Value("${gemini.prospection.model:gemini-1.5-flash}") String model) {
        this.apiKey = apiKey;
        this.model = model;
        this.enabled = apiKey != null && !apiKey.isBlank();
        this.objectMapper = new ObjectMapper();
        if (this.enabled) {
            this.webClient = WebClient.builder()
                    .baseUrl(apiUrl)
                    .build();
        } else {
            this.webClient = null;
            log.info("GeminiProspectionService: Chave de API não configurada. Módulo em modo fallback heurístico.");
        }
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

                JsonNode response = webClient.post()
                        .uri("/models/" + model + ":generateContent?key=" + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .timeout(Duration.ofSeconds(25))
                        .block();

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

        // Fallback heurístico inteligente se IA estiver sem chave ou der timeout
        return generateHeuristicProspects(cidade, uf, segmento, limit);
    }

    private String buildProspectionPrompt(String cidade, String uf, String segmento, int limit) {
        return """
            Você é um agente de inteligência comercial especializado em prospecção B2B de empresas para serviços de:
            - Segurança Patrimonial Armada e Desarmada
            - Portaria e Controle de Acesso
            - Limpeza e Facilities corporativos/industriais

            Localização Alvo: Cidade de %s - %s
            Segmento/Nicho: %s

            Gere uma lista de até %d empresas ou estabelecimentos REAIS ou de alto potencial de contratação nessa cidade/região (condomínios comerciais/residenciais de alto padrão, grandes indústrias, centros de distribuição, hospitais, concessionárias, redes varejistas).
            
            Avalie o potencial de conversão de 1 a 100%% e justifique por que essa empresa precisa de facilities e segurança patrimonial.

            IMPORTANTE: Retorne ESTRITAMENTE um array JSON válido sem nenhum markdown ou texto em volta, seguindo o esquema:
            [
              {
                "cnpj": "CNPJ formatado ou gerado verossímil",
                "razaoSocial": "Razão Social",
                "nomeFantasia": "Nome Fantasia ou do Condomínio/Empresa",
                "municipio": "%s",
                "uf": "%s",
                "bairro": "Bairro relevante da cidade",
                "logradouro": "Endereço aproximado ou avenida principal",
                "telefone": "(DDD) 3XXX-XXXX ou 9XXXX-XXXX",
                "email": "compras@empresa.com.br ou contato@empresa.com.br",
                "cnaeDescricao": "Descrição do ramo de atividade",
                "scoreConversao": 85,
                "motivoConversao": "Grande circulação de pessoas e alto risco patrimonial, demandando portaria 24h e rondas.",
                "qsa": [
                  {
                    "nome": "Nome do Síndico / Diretor de Operações / Sócio",
                    "qualificacao": "Diretor / Síndico / Sócio-Administrador"
                  }
                ]
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

    private List<Map<String, Object>> generateHeuristicProspects(String cidade, String uf, String segmento, int limit) {
        List<Map<String, Object>> list = new ArrayList<>();
        String[] templates = new String[]{
                "Condomínio Edifício Residencial & Comercial %s Prime",
                "Centro Logístico & Armazéns %s Express",
                "Hospital & Maternidade Regional de %s",
                "Indústria Metalmecânica e Manufatura %s",
                "Shopping Center e Galerias %s",
                "Complexo Empresarial Corporate Park %s",
                "Concessionária e Distribuidora de Veículos %s",
                "Centro de Distribuição Supermercadista %s"
        };

        for (int i = 0; i < Math.min(limit, templates.length); i++) {
            Map<String, Object> p = new HashMap<>();
            String nome = String.format(templates[i], cidade);
            p.put("cnpj", String.format("0%d.%d0%d.0001-%d%d", (i + 1) * 2, i + 3, i + 4, i + 1, i + 8));
            p.put("razaoSocial", nome + " LTDA");
            p.put("nomeFantasia", nome);
            p.put("municipio", cidade);
            p.put("uf", uf);
            p.put("bairro", "Centro / Distrito Industrial");
            p.put("logradouro", "Avenida Principal de Acesso, " + ((i + 1) * 150));
            p.put("telefone", "(34) 32" + (10 + i) + "-40" + (20 + i));
            p.put("email", "compras." + cidade.toLowerCase().replace(" ", "") + (i + 1) + "@empresa.com.br");
            p.put("cnaeDescricao", segmento != null && !segmento.isBlank() ? segmento : "Condomínios e Serviços Combinados");
            p.put("scoreConversao", 75 + (i * 3));
            p.put("motivoConversao", "Alto fluxo diário de colaboradores e visitantes; necessidade contínua de controle de acesso e monitoramento patrimonial.");
            p.put("qsa", List.of(
                    Map.of("nome", "Administrador / Gerente Operacional", "qualificacao", "Diretoria de Compras")
            ));
            list.add(p);
        }
        return list;
    }
}
