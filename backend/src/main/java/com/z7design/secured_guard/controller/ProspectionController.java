package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.prospection.GeminiProspectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prospection")
@Slf4j
@Tag(name = "Prospecção Comercial", description = "Endpoints para descoberta e qualificação de leads com IA Gemini")
public class ProspectionController {

    private final GeminiProspectionService geminiProspectionService;
    private final com.z7design.secured_guard.service.prospection.CnpjLookupService cnpjLookupService;
    private final com.z7design.secured_guard.service.prospection.ProspectionHistoryService historyService;
    private final com.z7design.secured_guard.repository.UserRepository userRepository;

    public ProspectionController(
            GeminiProspectionService geminiProspectionService,
            com.z7design.secured_guard.service.prospection.CnpjLookupService cnpjLookupService,
            com.z7design.secured_guard.service.prospection.ProspectionHistoryService historyService,
            com.z7design.secured_guard.repository.UserRepository userRepository) {
        this.geminiProspectionService = geminiProspectionService;
        this.cnpjLookupService = cnpjLookupService;
        this.historyService = historyService;
        this.userRepository = userRepository;
    }

    public static final String PROSPECTION_AUTHORITY = 
            "hasAnyAuthority('LEADS_READ', 'LEADS_WRITE', 'LEADS_CREATE', 'SUPER_ADMIN', 'ADMIN', 'ADMINISTRADOR', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL', " +
            "'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_ADMINISTRADOR', 'ROLE_GESTOR', 'ROLE_COMERCIAL', 'ROLE_GESTOR_COMERCIAL', 'ROLE_ASSISTENTE_COMERCIAL', " +
            "'GRUPO_COMERCIAL', 'GRUPO_GESTOR_COMERCIAL', 'GRUPO_ASSISTENTE_COMERCIAL')";

    @GetMapping("/cnpj/{cnpj}")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Consulta dados oficiais completos de um CNPJ na Receita Federal")
    public ResponseEntity<Map<String, Object>> searchByCnpj(
            @PathVariable String cnpj,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("Recebida requisição de consulta de CNPJ: {}", cnpj);
        Map<String, Object> data = cnpjLookupService.lookupByCnpj(cnpj);

        try {
            com.z7design.secured_guard.model.User user = resolveUser(userDetails);
            historyService.saveSearch("CNPJ", cnpj, (String) data.get("municipio"), (String) data.get("uf"), null, List.of(data), user);
        } catch (Exception ex) {
            log.warn("Falha ao salvar consulta de CNPJ no histórico: {}", ex.getMessage());
        }

        return ResponseEntity.ok(data);
    }

    @GetMapping("/find-cnpj")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Descobre e enriquece o CNPJ de uma empresa/condomínio a partir do nome e cidade")
    public ResponseEntity<Map<String, Object>> findCnpj(
            @RequestParam String nome,
            @RequestParam(required = false, defaultValue = "Uberlândia") String cidade,
            @RequestParam(required = false, defaultValue = "MG") String uf,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("Recebida requisição para localizar CNPJ: nome='{}', cidade='{}', uf='{}'", nome, cidade, uf);
        Map<String, Object> data = cnpjLookupService.findCnpjByNameAndLocation(nome, cidade, uf);

        if (Boolean.TRUE.equals(data.get("discoveredAutomatically"))) {
            try {
                com.z7design.secured_guard.model.User user = resolveUser(userDetails);
                historyService.saveSearch("DISCOVERY_CNPJ", nome, cidade, uf, null, List.of(data), user);
            } catch (Exception ex) {
                log.warn("Falha ao salvar descoberta de CNPJ no histórico: {}", ex.getMessage());
            }
        }

        return ResponseEntity.ok(data);
    }

    @GetMapping("/ai-search")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Busca e qualificação de prospectos por cidade e segmento usando IA Gemini")
    public ResponseEntity<List<Map<String, Object>>> searchWithAi(
            @RequestParam(defaultValue = "Uberlândia") String cidade,
            @RequestParam(defaultValue = "MG") String uf,
            @RequestParam(required = false) String segmento,
            @RequestParam(required = false, defaultValue = "8") Integer quantidade,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("Recebida requisição de prospecção com IA: cidade={}, uf={}, segmento={}", cidade, uf, segmento);
        List<Map<String, Object>> results = geminiProspectionService.searchProspectsWithAi(cidade, uf, segmento, quantidade);

        // Enriquecer automaticamente cada prospecto com CNPJ oficial formatado, E-mail, Telefone/WhatsApp e QSA completo
        for (Map<String, Object> item : results) {
            String cnpj = (String) item.get("cnpj");
            try {
                Map<String, Object> enriched = null;
                if (cnpj != null && !cnpj.isBlank()) {
                    enriched = cnpjLookupService.lookupByCnpj(cnpj);
                } else {
                    String nome = (String) item.get("nomeFantasia");
                    if (nome == null || nome.isBlank()) nome = (String) item.get("razaoSocial");
                    if (nome != null && !nome.isBlank()) {
                        enriched = cnpjLookupService.findCnpjByNameAndLocation(nome, cidade, uf);
                    }
                }

                if (enriched != null && enriched.get("cnpj") != null && !enriched.get("cnpj").toString().isBlank()) {
                    item.put("cnpj", enriched.get("cnpj"));
                    String enrichedRazao = String.valueOf(enriched.getOrDefault("razaoSocial", ""));
                    if (!enrichedRazao.isBlank() && !enrichedRazao.startsWith("Empresa Cadastrada")) {
                        item.put("razaoSocial", enrichedRazao);
                    }
                    if (enriched.get("situacaoCadastral") != null) item.put("situacaoCadastral", enriched.get("situacaoCadastral"));
                    if (enriched.get("porte") != null && !enriched.get("porte").toString().isBlank()) item.put("porte", enriched.get("porte"));
                    if (enriched.get("capitalSocial") != null) item.put("capitalSocial", enriched.get("capitalSocial"));
                    if (enriched.get("cnaePrincipal") != null) item.put("cnaePrincipal", enriched.get("cnaePrincipal"));
                    if (enriched.get("qsa") != null && enriched.get("qsa") instanceof List && !((List<?>) enriched.get("qsa")).isEmpty()) {
                        item.put("qsa", enriched.get("qsa"));
                    }
                    if (enriched.get("decisores") != null && enriched.get("decisores") instanceof List && !((List<?>) enriched.get("decisores")).isEmpty()) {
                        item.put("decisores", enriched.get("decisores"));
                    }
                    if (enriched.get("email") != null && !enriched.get("email").toString().isBlank()) {
                        item.put("email", enriched.get("email"));
                    }
                    if (enriched.get("emailCompras") != null && !enriched.get("emailCompras").toString().isBlank()) {
                        item.put("emailCompras", enriched.get("emailCompras"));
                    }
                    if (enriched.get("contatoComprasNome") != null) {
                        item.put("contatoComprasNome", enriched.get("contatoComprasNome"));
                    }
                    if (enriched.get("telefone") != null && !enriched.get("telefone").toString().isBlank()) {
                        item.put("telefone", enriched.get("telefone"));
                    }
                    if (enriched.get("website") != null && !enriched.get("website").toString().isBlank()) {
                        item.put("website", enriched.get("website"));
                    }
                }
            } catch (Exception ex) {
                log.debug("Auto-enriquecimento externo ignorado para item: {}", ex.getMessage());
            } finally {
                // Garantir 100% que o card tenha CNPJ válido formatado, email, telefone/WhatsApp e QSA com decisores
                try {
                    cnpjLookupService.enrichCorporateEmailsAndContacts(item);
                } catch (Exception ex2) {
                    log.debug("Erro no enriquecimento de garantia: {}", ex2.getMessage());
                }
            }
        }

        // Gravar automaticamente os resultados enriquecidos no banco de dados
        try {
            com.z7design.secured_guard.model.User user = resolveUser(userDetails);
            historyService.saveSearch("SEGMENTO", segmento, cidade, uf, segmento, results, user);
        } catch (Exception ex) {
            log.warn("Falha ao gravar pesquisa com IA no histórico: {}", ex.getMessage());
        }

        return ResponseEntity.ok(results);
    }

    @GetMapping("/history")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Lista o histórico de pesquisas de prospecção gravadas no banco de dados")
    public ResponseEntity<org.springframework.data.domain.Page<Map<String, Object>>> listHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(historyService.listRecentSearches(page, size));
    }

    @GetMapping("/history/{id}")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Recupera os detalhes e prospectos salvos de uma pesquisa específica do histórico")
    public ResponseEntity<Map<String, Object>> getHistoryDetails(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(historyService.getSearchDetails(id));
    }

    @PostMapping("/history")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Salva manualmente uma pesquisa e sua lista de prospectos no banco")
    public ResponseEntity<Map<String, Object>> saveCustomSearch(
            @RequestBody Map<String, Object> payload,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        String tipo = (String) payload.getOrDefault("tipoBusca", "CUSTOM");
        String termo = (String) payload.get("termoPesquisa");
        String cidade = (String) payload.getOrDefault("cidade", "Uberlândia");
        String uf = (String) payload.getOrDefault("uf", "MG");
        String segmento = (String) payload.get("segmento");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> prospects = (List<Map<String, Object>>) payload.get("prospects");

        com.z7design.secured_guard.model.User user = resolveUser(userDetails);
        com.z7design.secured_guard.model.prospection.ProspectionSearch saved = 
                historyService.saveSearch(tipo, termo, cidade, uf, segmento, prospects, user);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("id", saved != null ? saved.getId() : null);
        return ResponseEntity.ok(resp);
    }

    private com.z7design.secured_guard.model.User resolveUser(org.springframework.security.core.userdetails.UserDetails userDetails) {
        if (userDetails != null && userDetails.getUsername() != null) {
            return userRepository.findByUsername(userDetails.getUsername())
                    .or(() -> userRepository.findByEmailIgnoreCase(userDetails.getUsername()))
                    .orElse(null);
        }
        return null;
    }

    @GetMapping("/credentials")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Retorna o status de configuração das chaves de IA e ferramentas de prospecção")
    public ResponseEntity<Map<String, Object>> getCredentialsStatus() {
        return ResponseEntity.ok(geminiProspectionService.getCredentialsStatus());
    }

    @PostMapping("/credentials")
    @PreAuthorize(PROSPECTION_AUTHORITY)
    @Operation(summary = "Atualiza dinamicamente as chaves e modelos de IA e ferramentas de prospecção")
    public ResponseEntity<Map<String, Object>> updateCredentials(@RequestBody Map<String, String> payload) {
        String geminiKey = payload.get("geminiApiKey");
        String placesKey = payload.get("googlePlacesApiKey");
        String apifyToken = payload.get("apifyApiToken");
        String apolloKey = payload.get("apolloApiKey");
        String cnpjaKey = payload.get("cnpjaApiKey");
        String model = payload.get("model");
        geminiProspectionService.updateCredentials(geminiKey, placesKey, apifyToken, apolloKey, cnpjaKey, model);

        Map<String, Object> response = new HashMap<>(geminiProspectionService.getCredentialsStatus());
        response.put("message", "Credenciais de Prospecção atualizadas com sucesso!");
        return ResponseEntity.ok(response);
    }
}
