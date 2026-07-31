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
@Tag(name = "Profissionais de SST", description = "Cadastro do profissional responsável por SST (assinatura/carimbo em OS e relatórios)")
public class SafetyEngineerController {
    private final SafetyEngineerService safetyEngineerService;

    @GetMapping
    @Operation(summary = "Listar todos os profissionais de SST")
    public ResponseEntity<List<SafetyEngineerDTO>> getAll() {
        return ResponseEntity.ok(safetyEngineerService.getAll());
    }

    @GetMapping("/company/{companyId}")
    @Operation(summary = "Listar profissionais por empresa")
    public ResponseEntity<List<SafetyEngineerDTO>> getAllByCompanyId(
            @Parameter(description = "ID da empresa") @PathVariable UUID companyId) {
        return ResponseEntity.ok(safetyEngineerService.getAllByCompanyId(companyId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obter profissional por ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Encontrado"),
            @ApiResponse(responseCode = "404", description = "Não encontrado")
    })
    public ResponseEntity<SafetyEngineerDTO> getById(
            @Parameter(description = "ID do profissional") @PathVariable UUID id) {
        return ResponseEntity.ok(safetyEngineerService.getById(id));
    }

    @PostMapping
    @Operation(summary = "Cadastrar profissional de SST")
    public ResponseEntity<SafetyEngineerDTO> create(@Valid @RequestBody SafetyEngineerDTO dto) {
        return ResponseEntity.ok(safetyEngineerService.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar profissional de SST")
    public ResponseEntity<SafetyEngineerDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody SafetyEngineerDTO dto) {
        return ResponseEntity.ok(safetyEngineerService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir profissional de SST")
    public ResponseEntity<Map<String, String>> delete(@PathVariable UUID id) {
        safetyEngineerService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Profissional de SST excluído com sucesso"));
    }

    @PatchMapping("/{id}/stamp-image-url")
    @Operation(summary = "Atualizar URL do carimbo de assinatura")
    public ResponseEntity<SafetyEngineerDTO> updateStampImageUrl(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(safetyEngineerService.updateStampImageUrl(id, request.get("stampImageUrl")));
    }

    @PostMapping("/{id}/set-default")
    @Operation(summary = "Definir como profissional padrão da empresa (usado em OS/relatórios)")
    public ResponseEntity<SafetyEngineerDTO> setAsCompanyDefault(@PathVariable UUID id) {
        return ResponseEntity.ok(safetyEngineerService.setAsCompanyDefault(id));
    }
}
