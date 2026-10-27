package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.util.ValidationUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class CnpjLookupService {

    private final ObjectMapper objectMapper;
    private final GeminiProspectionService geminiProspectionService;
    private final HttpClient httpClient;

    public CnpjLookupService(GeminiProspectionService geminiProspectionService) {
        this.geminiProspectionService = geminiProspectionService;
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(6))
                .build();
    }

    /**
     * Consulta dados oficiais de um CNPJ com fallback entre BrasilAPI e ReceitaWS.
     */
    public Map<String, Object> lookupByCnpj(String rawCnpj) {
        if (rawCnpj == null || rawCnpj.isBlank()) {
            throw new IllegalArgumentException("CNPJ não informado.");
        }
        String cleanCnpj = rawCnpj.replaceAll("\\D", "");
        if (cleanCnpj.length() != 14) {
            throw new IllegalArgumentException("CNPJ deve conter 14 dígitos numéricos.");
        }
        if (!ValidationUtils.isValidCnpj(cleanCnpj)) {
            throw new IllegalArgumentException("CNPJ " + cleanCnpj + " possui dígitos verificadores inválidos.");
        }

        // 1. Tentar BrasilAPI
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://brasilapi.com.br/api/cnpj/v1/" + cleanCnpj))
                    .header("User-Agent", "SecuredGuard-Prospection/1.0")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                return mapBrasilApi(root);
            } else {
                log.warn("BrasilAPI retornou status {} para CNPJ {}", resp.statusCode(), cleanCnpj);
            }
        } catch (Exception ex) {
            log.warn("Falha ao consultar BrasilAPI para CNPJ {}: {}", cleanCnpj, ex.getMessage());
        }

        // 2. Fallback: ReceitaWS
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://receitaws.com.br/v1/cnpj/" + cleanCnpj))
                    .header("User-Agent", "SecuredGuard-Prospection/1.0")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                if (!"ERROR".equalsIgnoreCase(root.path("status").asText())) {
                    return mapReceitaWs(root);
                }
            }
        } catch (Exception ex) {
            log.warn("Falha ao consultar ReceitaWS para CNPJ {}: {}", cleanCnpj, ex.getMessage());
        }

        // 3. Fallback: MinhaReceita
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://minhareceita.org/" + cleanCnpj))
                    .header("User-Agent", "SecuredGuard-Prospection/1.0")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                return mapBrasilApi(root);
            }
        } catch (Exception ex) {
            log.warn("Falha ao consultar MinhaReceita para CNPJ {}: {}", cleanCnpj, ex.getMessage());
        }

        throw new RuntimeException("Não foi possível consultar os dados do CNPJ " + ValidationUtils.formatCnpj(cleanCnpj) + 
                " nas bases públicas oficiais. Tente novamente em instantes.");
    }

    /**
     * Localiza o CNPJ oficial de uma empresa ou condomínio a partir de seu nome/fantasia e localidade.
     */
    public Map<String, Object> findCnpjByNameAndLocation(String companyName, String city, String uf) {
        if (companyName == null || companyName.trim().isBlank()) {
            throw new IllegalArgumentException("Nome da empresa é obrigatório para localização de CNPJ.");
        }
        String cleanName = companyName.trim();
        String cleanCity = city != null ? city.trim() : "Uberlândia";
        String cleanUf = uf != null ? uf.trim() : "MG";

        log.info("🔍 Localizando CNPJ oficial para: '{}' em {}/{}", cleanName, cleanCity, cleanUf);

        // 1. Tentar descobrir o CNPJ usando IA Gemini especializada em cadastros públicos
        String discoveredCnpj = geminiProspectionService.discoverCnpjWithGemini(cleanName, cleanCity, cleanUf);

        if (discoveredCnpj != null && !discoveredCnpj.isBlank()) {
            String digits = discoveredCnpj.replaceAll("\\D", "");
            if (digits.length() == 14 && ValidationUtils.isValidCnpj(digits)) {
                log.info("🎯 CNPJ {} descoberto com sucesso para '{}'. Consultando dados na Receita Federal...", digits, cleanName);
                try {
                    Map<String, Object> officialData = lookupByCnpj(digits);
                    officialData.put("discoveredAutomatically", true);
                    return officialData;
                } catch (Exception ex) {
                    log.warn("CNPJ {} descoberto, mas consulta oficial falhou: {}", digits, ex.getMessage());
                }
            }
        }

        // Se não encontrou CNPJ exato com validação matemática, retorna estrutura informando que não foi localizado automaticamente
        Map<String, Object> result = new HashMap<>();
        result.put("found", false);
        result.put("razaoSocial", cleanName);
        result.put("municipio", cleanCity);
        result.put("uf", cleanUf);
        result.put("message", "CNPJ não localizado automaticamente. Informe o número ou consulte na Receita Federal.");
        return result;
    }

    private Map<String, Object> mapBrasilApi(JsonNode root) {
        Map<String, Object> map = new HashMap<>();
        String rawCnpj = root.path("cnpj").asText("");
        map.put("cnpj", ValidationUtils.formatCnpj(rawCnpj));
        map.put("razaoSocial", root.path("razao_social").asText(""));
        map.put("nomeFantasia", root.path("nome_fantasia").asText(root.path("razao_social").asText("")));
        map.put("situacaoCadastral", root.path("descricao_situacao_cadastral").asText("ATIVA"));
        map.put("dataInicioAtividade", root.path("data_inicio_atividade").asText(""));
        map.put("naturezaJuridica", root.path("natureza_juridica").asText(""));
        map.put("porte", root.path("porte").asText(root.path("descricao_porte").asText("")));

        if (root.hasNonNull("capital_social")) {
            try {
                map.put("capitalSocial", root.path("capital_social").asDouble());
            } catch (Exception ignored) {}
        }

        // CNAE Principal
        if (root.hasNonNull("cnae_fiscal")) {
            Map<String, Object> cnaeMap = new HashMap<>();
            cnaeMap.put("codigo", root.path("cnae_fiscal").asText(""));
            cnaeMap.put("descricao", root.path("cnae_fiscal_descricao").asText(""));
            map.put("cnaePrincipal", cnaeMap);
        }

        // Endereço
        map.put("logradouro", root.path("logradouro").asText(""));
        map.put("numero", root.path("numero").asText(""));
        map.put("complemento", root.path("complemento").asText(""));
        map.put("bairro", root.path("bairro").asText(""));
        map.put("municipio", root.path("municipio").asText(""));
        map.put("uf", root.path("uf").asText(""));
        map.put("cep", root.path("cep").asText(""));

        // Telefones
        String ddd1 = root.path("ddd_telefone_1").asText("");
        String ddd2 = root.path("ddd_telefone_2").asText("");
        map.put("telefone", formatPhone(ddd1));
        map.put("telefoneSecundario", formatPhone(ddd2));

        // E-mail higienizado
        String email = root.path("email").asText("").toLowerCase().trim();
        boolean isContabil = isAccountingEmail(email);
        map.put("email", isContabil ? "" : email);
        map.put("emailContabilidadeDescartado", isContabil);

        // QSA (Sócios e Administradores)
        List<Map<String, String>> qsaList = new ArrayList<>();
        if (root.has("qsa") && root.path("qsa").isArray()) {
            for (JsonNode s : root.path("qsa")) {
                Map<String, String> socio = new HashMap<>();
                socio.put("nome", s.path("nome_socio").asText(s.path("nome_socio_razao_social").asText("")));
                socio.put("qualificacao", s.path("qualificacao_socio").asText(s.path("qualificacao_representante_legal").asText("Sócio / Administrador")));
                socio.put("faixaEtaria", s.path("faixa_etaria").asText(""));
                qsaList.add(socio);
            }
        }
        map.put("qsa", qsaList);
        map.put("clientePotencial", true);
        map.put("origem", "CNPJ");
        return map;
    }

    private Map<String, Object> mapReceitaWs(JsonNode root) {
        Map<String, Object> map = new HashMap<>();
        String rawCnpj = root.path("cnpj").asText("");
        map.put("cnpj", ValidationUtils.formatCnpj(rawCnpj));
        map.put("razaoSocial", root.path("nome").asText(""));
        map.put("nomeFantasia", root.path("fantasia").asText(root.path("nome").asText("")));
        map.put("situacaoCadastral", root.path("situacao").asText("ATIVA"));
        map.put("dataInicioAtividade", root.path("abertura").asText(""));
        map.put("porte", root.path("porte").asText(""));
        map.put("naturezaJuridica", root.path("natureza_juridica").asText(""));

        // CNAE Principal
        if (root.has("atividade_principal") && root.path("atividade_principal").isArray() && !root.path("atividade_principal").isEmpty()) {
            JsonNode cnaeNode = root.path("atividade_principal").get(0);
            Map<String, Object> cnaeMap = new HashMap<>();
            cnaeMap.put("codigo", cnaeNode.path("code").asText(""));
            cnaeMap.put("descricao", cnaeNode.path("text").asText(""));
            map.put("cnaePrincipal", cnaeMap);
        }

        // Endereço
        map.put("logradouro", root.path("logradouro").asText(""));
        map.put("numero", root.path("numero").asText(""));
        map.put("complemento", root.path("complemento").asText(""));
        map.put("bairro", root.path("bairro").asText(""));
        map.put("municipio", root.path("municipio").asText(""));
        map.put("uf", root.path("uf").asText(""));
        map.put("cep", root.path("cep").asText(""));

        map.put("telefone", root.path("telefone").asText(""));
        String email = root.path("email").asText("").toLowerCase().trim();
        boolean isContabil = isAccountingEmail(email);
        map.put("email", isContabil ? "" : email);
        map.put("emailContabilidadeDescartado", isContabil);

        // QSA
        List<Map<String, String>> qsaList = new ArrayList<>();
        if (root.has("qsa") && root.path("qsa").isArray()) {
            for (JsonNode s : root.path("qsa")) {
                Map<String, String> socio = new HashMap<>();
                socio.put("nome", s.path("nome").asText(""));
                socio.put("qualificacao", s.path("qual").asText("Sócio / Administrador"));
                qsaList.add(socio);
            }
        }
        map.put("qsa", qsaList);
        map.put("clientePotencial", true);
        map.put("origem", "CNPJ");
        return map;
    }

    private String formatPhone(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() == 10) {
            return String.format("(%s) %s-%s", digits.substring(0, 2), digits.substring(2, 6), digits.substring(6, 10));
        } else if (digits.length() == 11) {
            return String.format("(%s) %s-%s", digits.substring(0, 2), digits.substring(2, 7), digits.substring(7, 11));
        }
        return raw;
    }

    private boolean isAccountingEmail(String email) {
        if (email == null || email.isBlank()) return false;
        String[] terms = {"contab", "contabil", "contabilidade", "fiscal", "assessoria", "escritorio", "audit", "contador"};
        for (String t : terms) {
            if (email.contains(t)) return true;
        }
        return false;
    }
}
