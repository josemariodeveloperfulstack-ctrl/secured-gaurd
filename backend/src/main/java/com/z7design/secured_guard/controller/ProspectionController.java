package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.prospection.GeminiProspectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prospection")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Prospecção Comercial", description = "Endpoints para descoberta e qualificação de leads com IA Gemini")
public class ProspectionController {

    private final GeminiProspectionService geminiProspectionService;

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
}
