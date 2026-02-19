package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.PatrimonialCategoryDTO;
import com.z7design.secured_guard.model.PatrimonialCategory;
import com.z7design.secured_guard.service.PatrimonialCategoryService;
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
@RequestMapping("/api/patrimonial/categories")
@RequiredArgsConstructor
@Tag(name = "Gestão Patrimonial - Categorias", description = "Categorias de bens patrimoniais")
public class PatrimonialCategoryController {

    private final PatrimonialCategoryService service;

    @GetMapping
    @Operation(summary = "Listar categorias")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_READ','PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<List<PatrimonialCategory>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar categoria por ID")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_READ','PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialCategory> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id)
                .orElseThrow(() -> new com.z7design.secured_guard.exception.ResourceNotFoundException("Categoria não encontrada")));
    }

    @PostMapping
    @Operation(summary = "Criar categoria")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialCategory> create(@Valid @RequestBody PatrimonialCategoryDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar categoria")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<PatrimonialCategory> update(@PathVariable UUID id, @Valid @RequestBody PatrimonialCategoryDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir categoria")
    @PreAuthorize("hasAnyAuthority('PATRIMONIAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
