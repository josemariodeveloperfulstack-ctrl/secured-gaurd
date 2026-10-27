package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.prospection.GeminiProspectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
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

    public ProspectionController(GeminiProspectionService geminiProspectionService) {
        this.geminiProspectionService = geminiProspectionService;
    }

    @GetMapping("/ai-search")
    @PreAuthorize("hasAnyAuthority('LEADS_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR')")
    @Operation(summary = "Busca e qualificação de prospectos por cidade e segmento usando IA Gemini")
    public ResponseEntity<List<Map<String, Object>>> searchWithAi(
            @RequestParam(defaultValue = "Uberlândia") String cidade,
            @RequestParam(defaultValue = "MG") String uf,
            @RequestParam(required = false) String segmento,
            @RequestParam(required = false, defaultValue = "8") Integer quantidade) {
        log.info("Recebida requisição de prospecção com IA: cidade={}, uf={}, segmento={}", cidade, uf, segmento);
        List<Map<String, Object>> results = geminiProspectionService.searchProspectsWithAi(cidade, uf, segmento, quantidade);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/credentials")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR')")
    @Operation(summary = "Retorna o status de configuração das chaves de IA e ferramentas de prospecção")
    public ResponseEntity<Map<String, Object>> getCredentialsStatus() {
        return ResponseEntity.ok(geminiProspectionService.getCredentialsStatus());
    }

    @PostMapping("/credentials")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR')")
    @Operation(summary = "Atualiza dinamicamente as chaves e modelos de IA e ferramentas de prospecção")
    public ResponseEntity<Map<String, Object>> updateCredentials(@RequestBody Map<String, String> payload) {
        String geminiKey = payload.get("geminiApiKey");
        String placesKey = payload.get("googlePlacesApiKey");
        String apifyToken = payload.get("apifyApiToken");
        String apolloKey = payload.get("apolloApiKey");
        String model = payload.get("model");
        geminiProspectionService.updateCredentials(geminiKey, placesKey, apifyToken, apolloKey, model);

        Map<String, Object> response = new HashMap<>(geminiProspectionService.getCredentialsStatus());
        response.put("message", "Credenciais de Prospecção atualizadas com sucesso!");
        return ResponseEntity.ok(response);
    }
}
