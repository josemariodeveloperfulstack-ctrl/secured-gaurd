package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.SafetyEngineerDTO;
import com.z7design.secured_guard.service.SafetyEngineerService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/safety-engineers")
@RequiredArgsConstructor
@Tag(name = "Engenheiros de Segurança", description = "Gerenciamento de engenheiros de segurança do trabalho")
public class SafetyEngineerController {
    private final SafetyEngineerService safetyEngineerService;

    @GetMapping("/company/{companyId}")
    @Operation(summary = "Listar engenheiros por empresa", description = "Retorna todos os engenheiros de segurança de uma empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de engenheiros retornada com sucesso")
    })
    public ResponseEntity<List<SafetyEngineerDTO>> getAllByCompanyId(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        List<SafetyEngineerDTO> engineers = safetyEngineerService.getAllByCompanyId(companyId);
        return ResponseEntity.ok(engineers);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obter engenheiro por ID", description = "Retorna um engenheiro de segurança pelo seu ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Engenheiro encontrado"),
            @ApiResponse(responseCode = "404", description = "Engenheiro não encontrado")
    })
    public ResponseEntity<SafetyEngineerDTO> getById(
            @Parameter(description = "ID do engenheiro de segurança") @PathVariable UUID id) {
        SafetyEngineerDTO engineer = safetyEngineerService.getById(id);
        return ResponseEntity.ok(engineer);
    }

    @PostMapping
    @Operation(summary = "Criar engenheiro", description = "Cria um novo engenheiro de segurança do trabalho")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Engenheiro criado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Empresa não encontrada")
    })
    public ResponseEntity<SafetyEngineerDTO> create(
            @Valid @RequestBody SafetyEngineerDTO dto) {
        SafetyEngineerDTO created = safetyEngineerService.create(dto);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar engenheiro", description = "Atualiza os dados de um engenheiro de segurança")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Engenheiro atualizado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Engenheiro ou empresa não encontrados")
    })
    public ResponseEntity<SafetyEngineerDTO> update(
            @Parameter(description = "ID do engenheiro de segurança") @PathVariable UUID id,
            @Valid @RequestBody SafetyEngineerDTO dto) {
        SafetyEngineerDTO updated = safetyEngineerService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir engenheiro", description = "Exclui um engenheiro de segurança do trabalho")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Engenheiro excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Engenheiro não encontrado")
    })
    public ResponseEntity<Map<String, String>> delete(
            @Parameter(description = "ID do engenheiro de segurança") @PathVariable UUID id) {
        safetyEngineerService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Engenheiro de segurança excluído com sucesso"));
    }

    @PatchMapping("/{id}/stamp-image-url")
    @Operation(summary = "Atualizar URL do carimbo", description = "Atualiza a URL da imagem do carimbo do engenheiro")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "URL do carimbo atualizada com sucesso"),
            @ApiResponse(responseCode = "404", description = "Engenheiro não encontrado")
    })
    public ResponseEntity<SafetyEngineerDTO> updateStampImageUrl(
            @Parameter(description = "ID do engenheiro de segurança") @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        String stampImageUrl = request.get("stampImageUrl");
        SafetyEngineerDTO updated = safetyEngineerService.updateStampImageUrl(id, stampImageUrl);
        return ResponseEntity.ok(updated);
    }
}
