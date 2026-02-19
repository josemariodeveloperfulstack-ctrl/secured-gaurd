package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.PatrimonialLocationDTO;
import com.z7design.secured_guard.model.PatrimonialLocation;
import com.z7design.secured_guard.service.PatrimonialLocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/patrimonial/locations")
@RequiredArgsConstructor
@Tag(name = "Gestão Patrimonial - Localizações", description = "Localizações de bens patrimoniais")
public class PatrimonialLocationController {

    private final PatrimonialLocationService service;

    @GetMapping
    @Operation(summary = "Listar localizações")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_READ','PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<List<PatrimonialLocation>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar localização por ID")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_READ','PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialLocation> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id)
                .orElseThrow(() -> new com.z7design.secured_guard.exception.ResourceNotFoundException("Localização não encontrada")));
    }

    @PostMapping
    @Operation(summary = "Criar localização")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialLocation> create(@Valid @RequestBody PatrimonialLocationDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar localização")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialLocation> update(@PathVariable UUID id, @Valid @RequestBody PatrimonialLocationDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir localização")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
