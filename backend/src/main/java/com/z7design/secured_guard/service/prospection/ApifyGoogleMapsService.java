package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class ApifyGoogleMapsService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.apify.com/v2")
            .build();

    /**
     * Executa raspagem de empresas no Google Maps utilizando o Actor compass/crawler-google-places do Apify.
     */
    public List<Map<String, Object>> scrapeGoogleMaps(String query, String apifyToken, int limit) {
        List<Map<String, Object>> resultsList = new ArrayList<>();
        if (apifyToken == null || apifyToken.isBlank()) {
            return resultsList;
        }

        try {
            log.info("ApifyGoogleMapsService: Iniciando raspagem no Apify para query='{}' (limite={})", query, limit);

            Map<String, Object> input = new HashMap<>();
            input.put("searchStringsArray", List.of(query));
            input.put("maxCrawledPlacesPerSearch", Math.min(limit, 20));
            input.put("language", "pt-BR");
            input.put("countryCode", "br");
            input.put("skipClosedPlaces", true);

            // Executa sincronicamente e já busca os itens do dataset
            JsonNode response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/acts/compass~crawler-google-places/run-sync-get-dataset-items")
                            .queryParam("token", apifyToken)
                            .queryParam("timeout", 45)
                            .build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(input)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(50))
                    .block();

            if (response != null && response.isArray() && response.size() > 0) {
                log.info("ApifyGoogleMapsService: Retornados {} estabelecimentos via Apify.", response.size());
                for (JsonNode place : response) {
                    Map<String, Object> item = new HashMap<>();
                    String title = place.path("title").asText("");
                    if (title.isBlank()) title = place.path("name").asText("Estabelecimento");

                    String address = place.path("address").asText("");
                    String street = place.path("street").asText("");
                    String neighborhood = place.path("neighborhood").asText("");
                    String city = place.path("city").asText("");
                    String state = place.path("state").asText("");
                    String postalCode = place.path("postalCode").asText("");
                    String phone = place.path("phone").asText("");
                    String website = place.path("website").asText("");
                    String url = place.path("url").asText("");
                    String category = place.path("categoryName").asText("");
                    double rating = place.path("totalScore").asDouble(0.0);
                    int reviewsCount = place.path("reviewsCount").asInt(0);

                    item.put("cnpj", "");
                    item.put("razaoSocial", title);
                    item.put("nomeFantasia", title);
                    item.put("logradouro", !street.isBlank() ? street : address);
                    item.put("bairro", neighborhood);
                    item.put("municipio", city);
                    item.put("uf", state);
                    item.put("cep", postalCode);
                    item.put("telefone", phone);
                    item.put("website", website);
                    item.put("googleMapsUrl", url);
                    item.put("cnaeDescricao", !category.isBlank() ? category : "Comércio / Serviços / Indústria");
                    item.put("rating", rating);
                    item.put("userRatingsTotal", reviewsCount);
                    item.put("clientePotencial", true);
                    item.put("scoreConversao", rating >= 4.0 ? 94 : 88);
                    item.put("motivoConversao", "Capturado via Apify Google Maps com alta presença comercial (" + (reviewsCount > 0 ? reviewsCount + " avaliações" : "perfil ativo") + ").");
                    item.put("origem", "GOOGLE_MAPS");
                    item.put("qsa", Collections.emptyList());

                    resultsList.add(item);
                }
            } else {
                log.warn("ApifyGoogleMapsService: Nenhum resultado retornado pelo dataset do Apify.");
            }
        } catch (Exception e) {
            log.error("ApifyGoogleMapsService: Erro na execução do Apify Scraper: {}", e.getMessage());
        }

        return resultsList;
    }
}
