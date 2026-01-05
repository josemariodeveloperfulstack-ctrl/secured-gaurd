package com.z7design.secured_guard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.dto.CAEPIResponseDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;

/**
 * Serviço para consultar informações de CA (Certificado de Aprovação) de EPIs
 * Utiliza a API pública do Ministério do Trabalho ou API alternativa
 */
@Service
@Slf4j
public class CAEPIService {

    @Value("${app.caepi.api.url:https://api.caepi.mte.gov.br}")
    private String caepiApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public CAEPIService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Busca informações do CA pelo número
     * @param caNumber Número do CA (ex: "12345" ou "CA-12345")
     * @return DTO com informações do CA ou null se não encontrado
     */
    public CAEPIResponseDTO buscarCA(String caNumber) {
        if (caNumber == null || caNumber.trim().isEmpty()) {
            return null;
        }

        try {
            // Remove prefixos e formata o número do CA
            String numeroLimpo = caNumber.replaceAll("[^0-9]", "");
            
            if (numeroLimpo.isEmpty()) {
                log.warn("Número de CA inválido: {}", caNumber);
                return null;
            }

            log.info("🔍 Consultando CA: {}", numeroLimpo);

            // Tenta consultar na API do MTE (se disponível)
            // Por enquanto, vamos usar uma abordagem que busca em múltiplas fontes
            CAEPIResponseDTO resultado = consultarMTEAPI(numeroLimpo);
            
            if (resultado == null) {
                // Fallback: tenta API alternativa (API_BaseCAEPI se estiver disponível)
                resultado = consultarAPIAlternativa(numeroLimpo);
            }

            if (resultado != null) {
                log.info("✅ CA encontrado: {} - {}", resultado.getNumero(), resultado.getNome());
            } else {
                log.warn("⚠️ CA não encontrado: {}", numeroLimpo);
            }

            return resultado;

        } catch (Exception e) {
            log.error("❌ Erro ao consultar CA {}: {}", caNumber, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Busca múltiplos CAs por termo de busca (nome ou número)
     * @param searchTerm Termo de busca
     * @return Lista de CAs encontrados
     */
    public List<CAEPIResponseDTO> buscarCAs(String searchTerm) {
        List<CAEPIResponseDTO> resultados = new ArrayList<>();
        
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return resultados;
        }

        try {
            log.info("🔍 Buscando CAs com termo: {}", searchTerm);
            
            // Tenta buscar na API do MTE
            List<CAEPIResponseDTO> resultadosMTE = consultarMTEAPIBusca(searchTerm);
            if (resultadosMTE != null && !resultadosMTE.isEmpty()) {
                resultados.addAll(resultadosMTE);
            }

            // Se não encontrou, tenta API alternativa
            if (resultados.isEmpty()) {
                List<CAEPIResponseDTO> resultadosAlt = consultarAPIAlternativaBusca(searchTerm);
                if (resultadosAlt != null && !resultadosAlt.isEmpty()) {
                    resultados.addAll(resultadosAlt);
                }
            }

            log.info("✅ Encontrados {} CAs para o termo: {}", resultados.size(), searchTerm);
            return resultados;

        } catch (Exception e) {
            log.error("❌ Erro ao buscar CAs com termo {}: {}", searchTerm, e.getMessage(), e);
            return resultados;
        }
    }

    /**
     * Consulta a API oficial do MTE
     */
    private CAEPIResponseDTO consultarMTEAPI(String numeroCA) {
        try {
            // URL da API do MTE (ajustar conforme documentação oficial)
            String url = String.format("%s/api/ca/%s", caepiApiUrl, numeroCA);
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode jsonNode = objectMapper.readTree(response.getBody());
                
                return CAEPIResponseDTO.builder()
                    .numero(jsonNode.path("numero").asText())
                    .nome(jsonNode.path("nome").asText())
                    .descricao(jsonNode.path("descricao").asText())
                    .situacao(jsonNode.path("situacao").asText())
                    .validade(jsonNode.path("validade").asText())
                    .fabricante(jsonNode.path("fabricante").asText())
                    .equipamento(jsonNode.path("equipamento").asText())
                    .build();
            }
        } catch (RestClientException e) {
            log.debug("API MTE não disponível ou CA não encontrado: {}", e.getMessage());
        } catch (Exception e) {
            log.debug("Erro ao consultar API MTE: {}", e.getMessage());
        }
        
        return null;
    }

    /**
     * Consulta API alternativa (API_BaseCAEPI)
     */
    private CAEPIResponseDTO consultarAPIAlternativa(String numeroCA) {
        try {
            // URL da API alternativa (ajustar conforme necessário)
            String url = String.format("https://api-caepi.example.com/api/ca/%s", numeroCA);
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode jsonNode = objectMapper.readTree(response.getBody());
                
                return CAEPIResponseDTO.builder()
                    .numero(jsonNode.path("numero").asText())
                    .nome(jsonNode.path("nome").asText())
                    .descricao(jsonNode.path("descricao").asText())
                    .situacao(jsonNode.path("situacao").asText())
                    .validade(jsonNode.path("validade").asText())
                    .fabricante(jsonNode.path("fabricante").asText())
                    .equipamento(jsonNode.path("equipamento").asText())
                    .build();
            }
        } catch (RestClientException e) {
            log.debug("API alternativa não disponível: {}", e.getMessage());
        } catch (Exception e) {
            log.debug("Erro ao consultar API alternativa: {}", e.getMessage());
        }
        
        return null;
    }

    /**
     * Busca múltiplos CAs na API do MTE
     */
    private List<CAEPIResponseDTO> consultarMTEAPIBusca(String searchTerm) {
        List<CAEPIResponseDTO> resultados = new ArrayList<>();
        
        try {
            String url = String.format("%s/api/ca/search?q=%s", caepiApiUrl, searchTerm);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode jsonArray = objectMapper.readTree(response.getBody());
                
                if (jsonArray.isArray()) {
                    for (JsonNode item : jsonArray) {
                        CAEPIResponseDTO dto = CAEPIResponseDTO.builder()
                            .numero(item.path("numero").asText())
                            .nome(item.path("nome").asText())
                            .descricao(item.path("descricao").asText())
                            .situacao(item.path("situacao").asText())
                            .validade(item.path("validade").asText())
                            .fabricante(item.path("fabricante").asText())
                            .equipamento(item.path("equipamento").asText())
                            .build();
                        resultados.add(dto);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Erro ao buscar CAs na API MTE: {}", e.getMessage());
        }
        
        return resultados;
    }

    /**
     * Busca múltiplos CAs na API alternativa
     */
    private List<CAEPIResponseDTO> consultarAPIAlternativaBusca(String searchTerm) {
        List<CAEPIResponseDTO> resultados = new ArrayList<>();
        
        try {
            String url = String.format("https://api-caepi.example.com/api/ca/search?q=%s", searchTerm);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode jsonArray = objectMapper.readTree(response.getBody());
                
                if (jsonArray.isArray()) {
                    for (JsonNode item : jsonArray) {
                        CAEPIResponseDTO dto = CAEPIResponseDTO.builder()
                            .numero(item.path("numero").asText())
                            .nome(item.path("nome").asText())
                            .descricao(item.path("descricao").asText())
                            .situacao(item.path("situacao").asText())
                            .validade(item.path("validade").asText())
                            .fabricante(item.path("fabricante").asText())
                            .equipamento(item.path("equipamento").asText())
                            .build();
                        resultados.add(dto);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Erro ao buscar CAs na API alternativa: {}", e.getMessage());
        }
        
        return resultados;
    }
}

