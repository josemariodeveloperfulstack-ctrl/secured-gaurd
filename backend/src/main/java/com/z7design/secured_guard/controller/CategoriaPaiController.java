package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CategoriaPaiDTO;
import com.z7design.secured_guard.service.CategoriaPaiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/plano-contas/categorias")
@RequiredArgsConstructor
@Tag(name = "Plano de Contas", description = "Gestão de categorias do Plano de Contas")
public class CategoriaPaiController {

    private final CategoriaPaiService service;

    @GetMapping
    @Operation(summary = "Listar todas as categorias pai")
    public ResponseEntity<List<CategoriaPaiDTO>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar categoria pai por ID")
    public ResponseEntity<CategoriaPaiDTO> getById(@PathVariable UUID id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar nova categoria pai")
    public ResponseEntity<CategoriaPaiDTO> create(@Valid @RequestBody CategoriaPaiDTO dto) {
        try {
            return ResponseEntity.ok(service.create(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar categoria pai")
    public ResponseEntity<CategoriaPaiDTO> update(@PathVariable UUID id, @Valid @RequestBody CategoriaPaiDTO dto) {
        try {
            return ResponseEntity.ok(service.update(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir categoria pai")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
