package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class ApolloEnrichmentService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.apollo.io/v1")
            .build();

    /**
     * Enriquece uma lista de prospectos com tomadores de decisão (sócios, diretores, e-mails diretos) usando a API do Apollo.io.
     */
    public void enrichProspectsWithApollo(List<Map<String, Object>> prospects, String apolloApiKey) {
        if (apolloApiKey == null || apolloApiKey.isBlank() || prospects == null || prospects.isEmpty()) {
            return;
        }

        log.info("ApolloEnrichmentService: Iniciando enriquecimento de {} prospectos via Apollo.io", prospects.size());

        for (Map<String, Object> prospect : prospects) {
            try {
                String website = (String) prospect.get("website");
                String domain = extractDomain(website);

                if (domain.isBlank()) {
                    // Tenta busca por nome da empresa se não houver domínio
                    String name = (String) prospect.get("nomeFantasia");
                    if (name == null || name.isBlank()) {
                        name = (String) prospect.get("razaoSocial");
                    }
                    if (name != null && !name.isBlank()) {
                        enrichByName(prospect, name, apolloApiKey);
                    }
                } else {
                    enrichByDomain(prospect, domain, apolloApiKey);
                }
            } catch (Exception e) {
                log.warn("ApolloEnrichmentService: Erro ao enriquecer prospecto '{}': {}", prospect.get("nomeFantasia"), e.getMessage());
            }
        }
    }

    private void enrichByDomain(Map<String, Object> prospect, String domain, String apolloApiKey) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("api_key", apolloApiKey);
            body.put("q_organization_domains", domain);
            body.put("person_titles", List.of("CEO", "Diretor", "Gerente", "Proprietário", "Sócio", "Director", "Owner", "Facilities", "Operações"));
            body.put("page", 1);
            body.put("per_page", 4);

            JsonNode response = webClient.post()
                    .uri("/mixed_people/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(8))
                    .block();

            processApolloPeopleResponse(prospect, response);
        } catch (Exception e) {
            log.warn("ApolloEnrichmentService: Falha na busca por domínio {}: {}", domain, e.getMessage());
        }
    }

    private void enrichByName(Map<String, Object> prospect, String companyName, String apolloApiKey) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("api_key", apolloApiKey);
            body.put("q_organization_name", companyName);
            body.put("page", 1);
            body.put("per_page", 3);

            JsonNode response = webClient.post()
                    .uri("/mixed_people/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(8))
                    .block();

            processApolloPeopleResponse(prospect, response);
        } catch (Exception e) {
            log.warn("ApolloEnrichmentService: Falha na busca por nome {}: {}", companyName, e.getMessage());
        }
    }

    private void processApolloPeopleResponse(Map<String, Object> prospect, JsonNode response) {
        if (response == null || !response.has("people")) {
            return;
        }

        JsonNode people = response.path("people");
        if (people.isArray() && people.size() > 0) {
            List<Map<String, Object>> qsaList = new ArrayList<>();
            String directEmail = null;
            String socialUrl = null;

            for (JsonNode person : people) {
                String name = person.path("name").asText("");
                String title = person.path("title").asText("Tomador de Decisão");
                String email = person.path("email").asText("");
                String linkedin = person.path("linkedin_url").asText("");

                if (!name.isBlank()) {
                    Map<String, Object> socio = new HashMap<>();
                    socio.put("nome", name);
                    socio.put("qualificacao", title + (!linkedin.isBlank() ? " (LinkedIn: " + linkedin + ")" : ""));
                    qsaList.add(socio);
                }

                if (directEmail == null && !email.isBlank() && !email.contains("noreply")) {
                    directEmail = email;
                }
                if (socialUrl == null && !linkedin.isBlank()) {
                    socialUrl = linkedin;
                }
            }

            if (!qsaList.isEmpty()) {
                prospect.put("qsa", qsaList);
            }
            if (directEmail != null && ((String) prospect.getOrDefault("email", "")).isBlank()) {
                prospect.put("email", directEmail);
            }
            if (socialUrl != null && ((String) prospect.getOrDefault("socialMediaUrl", "")).isBlank()) {
                prospect.put("socialMediaUrl", socialUrl);
            }
        }
    }

    private String extractDomain(String website) {
        if (website == null || website.isBlank()) return "";
        try {
            String url = website.trim();
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }
            URI uri = new URI(url);
            String host = uri.getHost();
            if (host == null) return "";
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (Exception e) {
            return "";
        }
    }
}
