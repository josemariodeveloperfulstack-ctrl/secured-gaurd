package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.PatrimonialAssetDTO;
import com.z7design.secured_guard.dto.PatrimonialDepreciationDTO;
import com.z7design.secured_guard.model.PatrimonialAsset;
import com.z7design.secured_guard.service.PatrimonialAssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/patrimonial/assets")
@RequiredArgsConstructor
@Tag(name = "Gestão Patrimonial - Bens", description = "Bens patrimoniais (CRUD, depreciação)")
public class PatrimonialAssetController {

    private final PatrimonialAssetService service;

    @GetMapping
    @Operation(summary = "Listar bens com filtros e paginação")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_READ','PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<Page<PatrimonialAsset>> getAll(
            @Parameter(description = "Código ou nome (parcial)") @RequestParam(required = false) String codeOrName,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID locationId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate acquisitionDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate acquisitionDateTo,
            Pageable pageable) {
        return ResponseEntity.ok(service.findByFilters(codeOrName, categoryId, locationId, status,
                acquisitionDateFrom, acquisitionDateTo, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar bem por ID")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_READ','PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialAsset> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id)
                .orElseThrow(() -> new com.z7design.secured_guard.exception.ResourceNotFoundException("Bem patrimonial não encontrado")));
    }

    @GetMapping("/{id}/depreciation")
    @Operation(summary = "Calcular depreciação em uma data")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_READ','PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialDepreciationDTO> getDepreciation(
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf) {
        LocalDate date = asOf != null ? asOf : LocalDate.now();
        return ResponseEntity.ok(service.calculateDepreciation(id, date));
    }

    @PostMapping
    @Operation(summary = "Criar bem (código gerado automaticamente)")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialAsset> create(@Valid @RequestBody PatrimonialAssetDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar bem")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialAsset> update(@PathVariable UUID id, @Valid @RequestBody PatrimonialAssetDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir bem")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
