package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;

@Service
@Slf4j
public class GooglePlacesService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://maps.googleapis.com/maps/api/place")
            .build();

    /**
     * Busca estabelecimentos reais usando a Google Places API (Text Search + Details).
     */
    public List<Map<String, Object>> searchPlaces(String query, String apiKey, int limit) {
        List<Map<String, Object>> resultsList = new ArrayList<>();
        if (apiKey == null || apiKey.isBlank()) {
            return resultsList;
        }

        try {
            log.info("GooglePlacesService: Executando Text Search para query='{}' (limite={})", query, limit);
            JsonNode searchResponse = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/textsearch/json")
                            .queryParam("query", query)
                            .queryParam("language", "pt-BR")
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();

            if (searchResponse == null || !searchResponse.has("results")) {
                log.warn("GooglePlacesService: Nenhuma resposta válida da API.");
                return resultsList;
            }

            String status = searchResponse.path("status").asText("");
            if (!"OK".equals(status) && !"ZERO_RESULTS".equals(status)) {
                log.warn("GooglePlacesService: Status retornado pela API: {}", status);
                return resultsList;
            }

            JsonNode results = searchResponse.path("results");
            int count = 0;
            for (JsonNode place : results) {
                if (count >= limit) break;

                String placeId = place.path("place_id").asText("");
                String name = place.path("name").asText("");
                String formattedAddress = place.path("formatted_address").asText("");
                double rating = place.path("rating").asDouble(0.0);
                int userRatingsTotal = place.path("user_ratings_total").asInt(0);

                Map<String, Object> item = new HashMap<>();
                item.put("cnpj", "");
                item.put("razaoSocial", name);
                item.put("nomeFantasia", name);
                item.put("logradouro", formattedAddress);
                item.put("rating", rating);
                item.put("userRatingsTotal", userRatingsTotal);
                item.put("clientePotencial", true);
                item.put("scoreConversao", rating > 4.0 ? 92 : 85);
                item.put("motivoConversao", "Estabelecimento real com presença ativa no Google Maps (" + (userRatingsTotal > 0 ? userRatingsTotal + " avaliações" : "perfil comercial verificado") + ").");
                item.put("origem", "GOOGLE_MAPS");
                item.put("qsa", Collections.emptyList());

                // Detalhes adicionais via Place Details (telefone, site, url do Maps)
                if (!placeId.isBlank()) {
                    enrichPlaceDetails(placeId, apiKey, item);
                }

                resultsList.add(item);
                count++;
            }
        } catch (Exception e) {
            log.error("GooglePlacesService: Erro ao buscar locais na Google Places API: {}", e.getMessage());
        }

        return resultsList;
    }

    private void enrichPlaceDetails(String placeId, String apiKey, Map<String, Object> item) {
        try {
            JsonNode detailsResponse = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/details/json")
                            .queryParam("place_id", placeId)
                            .queryParam("fields", "formatted_phone_number,international_phone_number,website,url,address_components")
                            .queryParam("language", "pt-BR")
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (detailsResponse != null && detailsResponse.has("result")) {
                JsonNode res = detailsResponse.path("result");
                String phone = res.path("formatted_phone_number").asText("");
                if (phone.isBlank()) {
                    phone = res.path("international_phone_number").asText("");
                }
                String website = res.path("website").asText("");
                String mapsUrl = res.path("url").asText("");

                if (!phone.isBlank()) item.put("telefone", phone);
                if (!website.isBlank()) item.put("website", website);
                if (!mapsUrl.isBlank()) item.put("googleMapsUrl", mapsUrl);

                // Componentes de endereço (bairro, cidade, estado, CEP)
                JsonNode components = res.path("address_components");
                if (components.isArray()) {
                    for (JsonNode c : components) {
                        JsonNode types = c.path("types");
                        for (JsonNode t : types) {
                            String typeStr = t.asText("");
                            if ("sublocality_level_1".equals(typeStr) || "neighborhood".equals(typeStr)) {
                                item.put("bairro", c.path("long_name").asText(""));
                            } else if ("administrative_area_level_2".equals(typeStr)) {
                                item.put("municipio", c.path("long_name").asText(""));
                            } else if ("administrative_area_level_1".equals(typeStr)) {
                                item.put("uf", c.path("short_name").asText(""));
                            } else if ("postal_code".equals(typeStr)) {
                                item.put("cep", c.path("long_name").asText(""));
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("GooglePlacesService: Falha ao enriquecer detalhes para placeId {}: {}", placeId, e.getMessage());
        }
    }
}
