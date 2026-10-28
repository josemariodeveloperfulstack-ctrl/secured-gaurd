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
    private final ApolloEnrichmentService apolloEnrichmentService;
    private final HttpClient httpClient;

    public CnpjLookupService(
            GeminiProspectionService geminiProspectionService,
            ApolloEnrichmentService apolloEnrichmentService) {
        this.geminiProspectionService = geminiProspectionService;
        this.apolloEnrichmentService = apolloEnrichmentService;
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
                Map<String, Object> mapped = mapBrasilApi(root);
                try {
                    enrichCorporateEmailsAndContacts(mapped);
                } catch (Exception enrichEx) {
                    log.warn("Enriquecimento adicional ignorado para CNPJ {}: {}", cleanCnpj, enrichEx.getMessage());
                }
                return mapped;
            } else {
                log.warn("BrasilAPI retornou status {} para CNPJ {}", resp.statusCode(), cleanCnpj);
            }
        } catch (Exception ex) {
            log.warn("Falha ao consultar BrasilAPI para CNPJ {}: {}", cleanCnpj, ex.getMessage());
        }

        // 2. Fallback: CNPJá (open.cnpja.com)
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://open.cnpja.com/office/" + cleanCnpj))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SecuredGuard/1.0")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200 && resp.body() != null) {
                JsonNode root = objectMapper.readTree(resp.body());
                Map<String, Object> mapped = mapCnpja(root);
                try {
                    enrichCorporateEmailsAndContacts(mapped);
                } catch (Exception enrichEx) {
                    log.warn("Enriquecimento adicional ignorado para CNPJ {}: {}", cleanCnpj, enrichEx.getMessage());
                }
                return mapped;
            } else {
                log.warn("CNPJá retornou status {} para CNPJ {}", resp.statusCode(), cleanCnpj);
            }
        } catch (Exception ex) {
            log.warn("Falha ao consultar CNPJá para CNPJ {}: {}", cleanCnpj, ex.getMessage());
        }

        // 2. Fallback: ReceitaWS
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://receitaws.com.br/v1/cnpj/" + cleanCnpj))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                if (!"ERROR".equalsIgnoreCase(root.path("status").asText())) {
                    Map<String, Object> mapped = mapReceitaWs(root);
                    try {
                        enrichCorporateEmailsAndContacts(mapped);
                    } catch (Exception enrichEx) {
                        log.warn("Enriquecimento adicional ignorado para CNPJ {}: {}", cleanCnpj, enrichEx.getMessage());
                    }
                    return mapped;
                }
            }
        } catch (Exception ex) {
            log.warn("Falha ao consultar ReceitaWS para CNPJ {}: {}", cleanCnpj, ex.getMessage());
        }

        // 3. Fallback: MinhaReceita
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://minhareceita.org/" + cleanCnpj))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                Map<String, Object> mapped = mapBrasilApi(root);
                try {
                    enrichCorporateEmailsAndContacts(mapped);
                } catch (Exception enrichEx) {
                    log.warn("Enriquecimento adicional ignorado para CNPJ {}: {}", cleanCnpj, enrichEx.getMessage());
                }
                return mapped;
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

        // 1. Catálogo Estratégico Curado para Polos Regionais (Hospitais, Shoppings, Complexos Industriais)
        String curatedCnpj = matchCuratedCnpj(cleanName, cleanCity);
        if (curatedCnpj != null) {
            log.info("🎯 CNPJ identificado via catálogo regional estratégico: {} para '{}'", curatedCnpj, cleanName);
            try {
                Map<String, Object> data = lookupByCnpj(curatedCnpj);
                data.put("discoveredAutomatically", true);
                return data;
            } catch (Exception ex) {
                log.warn("Erro ao buscar dados do CNPJ curado {}: {}", curatedCnpj, ex.getMessage());
            }
        }

        // 2. Raspagem e Busca Web Pública em Tempo Real (DuckDuckGo / Registros Públicos)
        String scrapedCnpj = scrapeCnpjFromWeb(cleanName, cleanCity, cleanUf);
        if (scrapedCnpj != null) {
            String digits = scrapedCnpj.replaceAll("\\D", "");
            if (digits.length() == 14 && ValidationUtils.isValidCnpj(digits)) {
                log.info("🎯 CNPJ {} localizado via busca e raspagem pública para '{}'. Consultando dados oficiais...", digits, cleanName);
                try {
                    Map<String, Object> officialData = lookupByCnpj(digits);
                    officialData.put("discoveredAutomatically", true);
                    return officialData;
                } catch (Exception ex) {
                    log.warn("CNPJ {} localizado, mas consulta oficial falhou: {}", digits, ex.getMessage());
                }
            }
        }

        // 3. Tentar descobrir o CNPJ usando IA Gemini especializada em cadastros públicos
        String discoveredCnpj = geminiProspectionService.discoverCnpjWithGemini(cleanName, cleanCity, cleanUf);
        if (discoveredCnpj != null && !discoveredCnpj.isBlank()) {
            String digits = discoveredCnpj.replaceAll("\\D", "");
            if (digits.length() == 14 && ValidationUtils.isValidCnpj(digits)) {
                log.info("🎯 CNPJ {} descoberto via Gemini IA para '{}'. Consultando dados na Receita Federal...", digits, cleanName);
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

    /**
     * Enriquece os contatos da empresa com foco em:
     * 1. E-mails diretos de compras (compras@, suprimentos@, procurement@)
     * 2. Sócios e Administradores (QSA) com inferência de e-mail corporativo
     * 3. Decisores (Diretoria, Gerência, Facilities)
     */
    public void enrichCorporateEmailsAndContacts(Map<String, Object> map) {
        if (map == null) return;

        String website = (String) map.get("website");
        String email = (String) map.get("email");
        String domain = extractDomainFromWebsiteOrEmail(website, email);

        if (domain != null && !domain.isBlank()) {
            map.putIfAbsent("domain", domain);
            if (!map.containsKey("emailCompras") || map.get("emailCompras") == null || ((String) map.get("emailCompras")).isBlank()) {
                map.put("emailCompras", "compras@" + domain);
                map.put("contatoComprasNome", "Setor de Compras / Suprimentos");
            }
        }

        // 1. Processar sócios e enriquecer com e-mails corporativos
        Object qsaObj = map.get("qsa");
        List<Map<String, Object>> decisores = new ArrayList<>();
        if (qsaObj instanceof List<?> qsaList) {
            List<Map<String, Object>> enrichedQsa = new ArrayList<>();
            for (Object item : qsaList) {
                if (item instanceof Map<?, ?> socioMap) {
                    Map<String, Object> socio = new HashMap<>();
                    socioMap.forEach((k, v) -> socio.put(String.valueOf(k), v));
                    String nome = (String) socio.get("nome");
                    String socioEmail = (String) socio.get("email");

                    if ((socioEmail == null || socioEmail.isBlank()) && domain != null && !domain.isBlank() && nome != null) {
                        String cleanName = nome.toLowerCase().trim();
                        String[] parts = cleanName.split("\\s+");
                        if (parts.length >= 2) {
                            socio.put("email", parts[0] + "." + parts[parts.length - 1] + "@" + domain);
                        } else if (parts.length == 1) {
                            socio.put("email", parts[0] + "@" + domain);
                        }
                    }

                    enrichedQsa.add(socio);

                    // Sócios administradores também são decisores principais
                    String qual = (String) socio.getOrDefault("qualificacao", "Sócio / Administrador");
                    Map<String, Object> dec = new HashMap<>(socio);
                    dec.put("cargo", qual);
                    dec.put("cargoTipo", "SOCIO_ADMIN");
                    decisores.add(dec);
                }
            }
            map.put("qsa", enrichedQsa);
        }

        // Se houver decisores inferidos, adiciona na lista
        if (!decisores.isEmpty()) {
            map.putIfAbsent("decisores", decisores);
        }

        // 2. Enriquecimento via Apollo.io (se chave configurada)
        try {
            if (geminiProspectionService.hasApolloKey()) {
                apolloEnrichmentService.enrichProspectsWithApollo(
                        List.of(map), 
                        geminiProspectionService.getCredentialsStatus().getOrDefault("apolloApiKey", "").toString()
                );
            }
        } catch (Exception ex) {
            log.debug("Enriquecimento Apollo ignorado: {}", ex.getMessage());
        }
    }

    private String extractDomainFromWebsiteOrEmail(String website, String email) {
        if (website != null && !website.isBlank()) {
            String clean = website.trim().toLowerCase();
            clean = clean.replace("http://", "").replace("https://", "");
            if (clean.startsWith("www.")) clean = clean.substring(4);
            int slash = clean.indexOf('/');
            if (slash > 0) clean = clean.substring(0, slash);
            if (clean.contains(".")) return clean;
        }

        if (email != null && !email.isBlank()) {
            int at = email.indexOf('@');
            if (at > 0 && at < email.length() - 1) {
                String domain = email.substring(at + 1).toLowerCase().trim();
                List<String> generic = List.of("gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "uol.com.br", "bol.com.br", "terra.com.br");
                if (!generic.contains(domain) && domain.contains(".")) {
                    return domain;
                }
            }
        }
        return null;
    }

    private Map<String, Object> mapCnpja(JsonNode root) {
        Map<String, Object> map = new HashMap<>();
        String rawCnpj = root.path("taxId").asText("");
        map.put("cnpj", ValidationUtils.formatCnpj(rawCnpj));
        
        JsonNode company = root.path("company");
        String razaoSocial = company.path("name").asText(root.path("alias").asText(""));
        String nomeFantasia = root.path("alias").asText(razaoSocial);
        map.put("razaoSocial", razaoSocial);
        map.put("nomeFantasia", nomeFantasia);
        map.put("situacaoCadastral", root.path("status").path("text").asText("ATIVA").toUpperCase());
        map.put("dataInicioAtividade", root.path("founded").asText(""));
        map.put("naturezaJuridica", company.path("nature").path("text").asText(""));
        map.put("porte", company.path("size").path("text").asText(""));

        if (company.hasNonNull("equity")) {
            try {
                map.put("capitalSocial", company.path("equity").asDouble());
            } catch (Exception ignored) {}
        }

        // CNAE Principal
        JsonNode mainAct = root.path("mainActivity");
        if (!mainAct.isMissingNode() && mainAct.hasNonNull("id")) {
            Map<String, Object> cnaeMap = new HashMap<>();
            cnaeMap.put("codigo", String.valueOf(mainAct.path("id").asLong()));
            cnaeMap.put("descricao", mainAct.path("text").asText(""));
            map.put("cnaePrincipal", cnaeMap);
        }

        // Endereço
        JsonNode address = root.path("address");
        map.put("logradouro", address.path("street").asText(""));
        map.put("numero", address.path("number").asText(""));
        map.put("complemento", address.path("details").asText(""));
        map.put("bairro", address.path("district").asText(""));
        map.put("municipio", address.path("city").asText(""));
        map.put("uf", address.path("state").asText(""));
        map.put("cep", address.path("zip").asText(""));

        // Telefones (com DDD)
        String tel = "";
        JsonNode phones = root.path("phones");
        if (phones.isArray() && !phones.isEmpty()) {
            JsonNode p = phones.get(0);
            tel = formatPhone(p.path("area").asText("") + p.path("number").asText(""));
        }
        map.put("telefone", tel);

        // Emails
        String email = "";
        JsonNode emails = root.path("emails");
        if (emails.isArray() && !emails.isEmpty()) {
            for (JsonNode em : emails) {
                String eStr = em.path("address").asText("").toLowerCase().trim();
                if (!isAccountingEmail(eStr)) {
                    email = eStr;
                    break;
                }
            }
        }
        map.put("email", email);

        // QSA (Quadro de Sócios e Administradores)
        List<Map<String, String>> qsaList = new ArrayList<>();
        JsonNode members = company.path("members");
        if (members.isArray()) {
            for (JsonNode m : members) {
                Map<String, String> socio = new HashMap<>();
                socio.put("nome", m.path("person").path("name").asText(""));
                socio.put("qualificacao", m.path("role").path("text").asText("Sócio / Administrador"));
                qsaList.add(socio);
            }
        }
        map.put("qsa", qsaList);
        map.put("clientePotencial", true);
        map.put("origem", "CNPJ");
        return map;
    }

    private String scrapeCnpjFromWeb(String companyName, String city, String uf) {
        try {
            String query = java.net.URLEncoder.encode(companyName + " " + city + " " + uf + " CNPJ", java.nio.charset.StandardCharsets.UTF_8);
            String url = "https://html.duckduckgo.com/html/?q=" + query;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200 && resp.body() != null) {
                java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\b(\\d{2})[.\\s]?(\\d{3})[.\\s]?(\\d{3})[/\\s]?(\\d{4})[-.\\s]?(\\d{2})\\b");
                java.util.regex.Matcher matcher = pattern.matcher(resp.body());
                while (matcher.find()) {
                    String candidate = matcher.group(1) + matcher.group(2) + matcher.group(3) + matcher.group(4) + matcher.group(5);
                    if (candidate.length() == 14 && ValidationUtils.isValidCnpj(candidate)) {
                        return candidate;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Raspagem web de CNPJ para '{}' em {}/{}: {}", companyName, city, uf, e.getMessage());
        }
        return null;
    }

    private String matchCuratedCnpj(String name, String city) {
        if (name == null) return null;
        String lower = name.toLowerCase();

        if (lower.contains("hospital") && (lower.contains("santa genoveva") || lower.contains("complexo hospitalar") || lower.contains("centro m") || lower.contains("regional"))) {
            return "25768170000138"; // Hospital Santa Genoveva / Centro Médico
        }
        if (lower.contains("hospital") && lower.contains("santa clara")) {
            return "25753073000131"; // Hospital Santa Clara
        }
        if (lower.contains("hospital") && (lower.contains("cl") || lower.contains("ufu"))) {
            return "25623032000130"; // Hospital de Clínicas de Uberlândia - UFU
        }
        if (lower.contains("hospital") && lower.contains("umc")) {
            return "23405786000180"; // Hospital UMC
        }
        if (lower.contains("center shopping")) {
            return "02434341000171"; // Center Shopping Uberlândia
        }
        if (lower.contains("uberl") && lower.contains("shopping")) {
            return "14234027000188"; // Uberlândia Shopping
        }
        if (lower.contains("marileusa")) {
            return "17842149000120"; // Granja Marileusa
        }
        if (lower.contains("paradiso")) {
            return "07455803000100"; // Condomínio Paradiso
        }
        if (lower.contains("distrito industrial")) {
            return "18434680000140"; // Distrito Industrial Norte
        }
        return null;
    }

}
