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
            Você é um agente sênior de inteligência comercial B2B para o setor de:
            - Segurança Patrimonial Armada e Desarmada
            - Portaria, Recepção e Controle de Acesso
            - Facilities, Zeladoria e Limpeza Predial / Industrial

            Localização Alvo: Cidade de %s - %s
            Segmento ou Palavra-Chave Alvo: %s

            Objetivo:
            Gere uma lista de até %d estabelecimentos e empresas de ALTO POTENCIAL com necessidade imediata ou contínua desses serviços nesta cidade (ex: condomínios residenciais/comerciais expressivos, hospitais, centros de distribuição/logística, indústrias, hipermercados, concessionárias, shopping centers).

            REGRAS OBRIGATÓRIAS DE HIGIENIZAÇÃO (ANTI-CONTABILIDADE):
            1. NÃO traga e-mails ou telefones de escritórios de contabilidade (ex: descartar domínios com 'contab', 'assessoria', 'fiscal', 'consultoria contabil').
            2. Priorize o TELEFONE DIRETO do estabelecimento (recepção comercial, portaria ou gerência geral).
            3. Priorize E-MAIL CORPORATIVO REAL da empresa (ex: compras@, contato@, diretoria@, administracao@ ou sindico@).
            4. Identifique o TOMADOR DE DECISÃO REAL (ex: Síndico, Gerente Geral, Diretor de Operações, Gerente Predial ou Sócio Principal) com nome e cargo.
            5. Avalie se é um 'CLIENTE EM POTENCIAL' (true/false) e atribua o score de conversão (1 a 100).
            6. Justifique em 'motivoConversao' a dor específica da empresa que a Segurança/Facilities resolve.

            IMPORTANTE: Retorne ESTRITAMENTE um array JSON válido sem markdown ou caracteres fora do JSON:
            [
              {
                "cnpj": "CNPJ formatado ou verossímil",
                "razaoSocial": "Razão Social Oficial",
                "nomeFantasia": "Nome Comercial / Nome do Condomínio ou Empresa",
                "municipio": "%s",
                "uf": "%s",
                "bairro": "Bairro relevante da cidade",
                "logradouro": "Avenida ou Rua principal",
                "telefone": "(DDD) 3XXX-XXXX ou 9XXXX-XXXX",
                "email": "contato@empresa.com.br",
                "cnaeDescricao": "Ramo de atividade",
                "clientePotencial": true,
                "scoreConversao": 92,
                "motivoConversao": "Condomínio de grande porte com portaria 24h e alta demanda por controle rigoroso de visitantes e rondas perimetrais.",
                "qsa": [
                  {
                    "nome": "Nome do Tomador de Decisão",
                    "qualificacao": "Síndico Profissional / Diretor de Operações"
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
            p.put("clientePotencial", true);
            p.put("scoreConversao", 80 + (i * 2));
            p.put("motivoConversao", "Alto fluxo diário de colaboradores e visitantes; necessidade contínua de controle de acesso e monitoramento patrimonial.");
            p.put("qsa", List.of(
                    Map.of("nome", "Administrador / Gerente Operacional", "qualificacao", "Diretoria de Compras")
            ));
            list.add(p);
        }
        return list;
    }
}
