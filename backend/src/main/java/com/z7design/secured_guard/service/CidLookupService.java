package com.z7design.secured_guard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.dto.CidSuggestionDTO;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.InputStream;
import java.net.URI;
import java.text.Normalizer;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Busca de CID para atestados médicos.
 * <ul>
 *   <li>Catálogo local CID-10 (DATASUS / uso habitual em atestados no Brasil)</li>
 *   <li>API oficial CID-11 da OMS (quando {@code icd.api.client-id/secret} estiverem configurados)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CidLookupService {

    private static final int DEFAULT_LIMIT = 20;
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");
    private static final String TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token";
    private static final String SEARCH_URL_TEMPLATE =
            "https://id.who.int/icd/release/11/{releaseId}/mms/search";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${icd.api.enabled:true}")
    private boolean icdApiEnabled;

    @Value("${icd.api.client-id:}")
    private String clientId;

    @Value("${icd.api.client-secret:}")
    private String clientSecret;

    @Value("${icd.api.release-id:2024-01}")
    private String releaseId;

    @Value("${icd.api.language:pt}")
    private String language;

    private List<CidSuggestionDTO> cid10Catalog = List.of();

    private final ReentrantLock tokenLock = new ReentrantLock();
    private String cachedToken;
    private Instant tokenExpiresAt = Instant.EPOCH;

    @PostConstruct
    void loadCatalog() {
        try (InputStream in = new ClassPathResource("data/cid10-catalog.json").getInputStream()) {
            List<Map<String, String>> raw = objectMapper.readValue(in, new TypeReference<>() {});
            cid10Catalog = raw.stream()
                    .filter(m -> StringUtils.hasText(m.get("code")))
                    .map(m -> CidSuggestionDTO.builder()
                            .code(m.get("code").trim().toUpperCase(Locale.ROOT))
                            .description(Optional.ofNullable(m.get("description")).orElse("").trim())
                            .source("CID10")
                            .build())
                    .toList();
            log.info("Catálogo CID-10 carregado: {} códigos", cid10Catalog.size());
        } catch (Exception e) {
            log.warn("Não foi possível carregar data/cid10-catalog.json: {}", e.getMessage());
            cid10Catalog = List.of();
        }
    }

    public List<CidSuggestionDTO> search(String query, Integer limit) {
        String q = query == null ? "" : query.trim();
        if (q.length() < 3) {
            return List.of();
        }
        int max = limit == null || limit < 1 ? DEFAULT_LIMIT : Math.min(limit, 50);

        LinkedHashMap<String, CidSuggestionDTO> byCode = new LinkedHashMap<>();
        for (CidSuggestionDTO local : searchLocal(q, max)) {
            byCode.putIfAbsent(normalizeKey(local.getCode()), local);
        }
        if (isWhoConfigured()) {
            try {
                for (CidSuggestionDTO who : searchWhoCid11(q, max)) {
                    byCode.putIfAbsent(normalizeKey(who.getCode()), who);
                }
            } catch (Exception e) {
                log.warn("Falha na busca CID-11 (OMS): {}", e.getMessage());
            }
        }

        return byCode.values().stream().limit(max).collect(Collectors.toList());
    }

    public Optional<String> findDescription(String code) {
        String normalized = normalizeCode(code);
        if (normalized == null) {
            return Optional.empty();
        }
        Optional<String> local = cid10Catalog.stream()
                .filter(c -> normalized.equals(normalizeCode(c.getCode())))
                .map(CidSuggestionDTO::getDescription)
                .filter(StringUtils::hasText)
                .findFirst();
        if (local.isPresent()) {
            return local;
        }
        if (!isWhoConfigured()) {
            return Optional.empty();
        }
        try {
            return searchWhoCid11(normalized, 5).stream()
                    .filter(s -> normalized.equalsIgnoreCase(normalizeCode(s.getCode())))
                    .map(CidSuggestionDTO::getDescription)
                    .filter(StringUtils::hasText)
                    .findFirst();
        } catch (Exception e) {
            log.debug("Lookup CID-11 falhou para {}: {}", normalized, e.getMessage());
            return Optional.empty();
        }
    }

    private List<CidSuggestionDTO> searchLocal(String query, int limit) {
        String qNorm = normalizeForSearch(query);
        String qCode = query.trim().toUpperCase(Locale.ROOT).replace(" ", "");

        List<CidSuggestionDTO> codePrefix = new ArrayList<>();
        List<CidSuggestionDTO> descMatch = new ArrayList<>();

        for (CidSuggestionDTO item : cid10Catalog) {
            String code = item.getCode() == null ? "" : item.getCode();
            String descNorm = normalizeForSearch(item.getDescription());
            if (code.startsWith(qCode) || code.replace(".", "").startsWith(qCode.replace(".", ""))) {
                codePrefix.add(item);
            } else if (descNorm.contains(qNorm)) {
                descMatch.add(item);
            }
            if (codePrefix.size() >= limit) {
                break;
            }
        }

        LinkedHashMap<String, CidSuggestionDTO> out = new LinkedHashMap<>();
        for (CidSuggestionDTO s : codePrefix) {
            out.putIfAbsent(normalizeKey(s.getCode()), s);
            if (out.size() >= limit) {
                return new ArrayList<>(out.values());
            }
        }
        for (CidSuggestionDTO s : descMatch) {
            out.putIfAbsent(normalizeKey(s.getCode()), s);
            if (out.size() >= limit) {
                break;
            }
        }
        return new ArrayList<>(out.values());
    }

    private List<CidSuggestionDTO> searchWhoCid11(String query, int limit) {
        String token = getAccessToken();
        URI uri = UriComponentsBuilder
                .fromUriString(SEARCH_URL_TEMPLATE)
                .buildAndExpand(releaseId)
                .toUri();
        uri = UriComponentsBuilder.fromUri(uri)
                .queryParam("q", query)
                .queryParam("flatResults", "true")
                .queryParam("useFlexisearch", "false")
                .queryParam("highlightingEnabled", "false")
                .build()
                .encode()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.set("API-Version", "v2");
        headers.set("Accept-Language", language);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                uri, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

        JsonNode body = response.getBody();
        if (body == null || !body.has("destinationEntities")) {
            return List.of();
        }

        List<CidSuggestionDTO> results = new ArrayList<>();
        for (JsonNode entity : body.get("destinationEntities")) {
            String code = textOrEmpty(entity.get("theCode"));
            String title = stripHtml(textOrEmpty(entity.get("title")));
            if (!StringUtils.hasText(code)) {
                continue;
            }
            results.add(CidSuggestionDTO.builder()
                    .code(code.trim())
                    .description(title)
                    .source("CID11")
                    .build());
            if (results.size() >= limit) {
                break;
            }
        }
        return results;
    }

    private boolean isWhoConfigured() {
        return icdApiEnabled
                && StringUtils.hasText(clientId)
                && StringUtils.hasText(clientSecret);
    }

    private String getAccessToken() {
        tokenLock.lock();
        try {
            if (cachedToken != null && Instant.now().isBefore(tokenExpiresAt)) {
                return cachedToken;
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "client_credentials");
            form.add("scope", "icdapi_access");
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    TOKEN_URL,
                    HttpMethod.POST,
                    new HttpEntity<>(form, headers),
                    JsonNode.class);

            JsonNode body = response.getBody();
            if (body == null || !body.has("access_token")) {
                throw new IllegalStateException("Token CID-11 sem access_token");
            }
            cachedToken = body.get("access_token").asText();
            long expiresIn = body.has("expires_in") ? body.get("expires_in").asLong(3600) : 3600L;
            tokenExpiresAt = Instant.now().plusSeconds(Math.max(60, expiresIn - 120));
            return cachedToken;
        } finally {
            tokenLock.unlock();
        }
    }

    private static String stripHtml(String value) {
        if (value == null) {
            return "";
        }
        return HTML_TAG.matcher(value).replaceAll("").replace("&nbsp;", " ").trim();
    }

    private static String textOrEmpty(JsonNode node) {
        return node == null || node.isNull() ? "" : node.asText("");
    }

    private static String normalizeCode(String code) {
        if (!StringUtils.hasText(code)) {
            return null;
        }
        return code.trim().toUpperCase(Locale.ROOT).replace(" ", "");
    }

    private static String normalizeKey(String code) {
        String n = normalizeCode(code);
        return n == null ? "" : n;
    }

    private static String normalizeForSearch(String value) {
        if (value == null) {
            return "";
        }
        String n = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        return n.trim();
    }
}
