package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.SubcategoriaDTO;
import com.z7design.secured_guard.service.SubcategoriaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/plano-contas/subcategorias", "/api/subcategorias"})
@Tag(name = "Plano de Contas", description = "Gestão de subcategorias do Plano de Contas")
public class SubcategoriaController {

    private final SubcategoriaService service;

    public SubcategoriaController(SubcategoriaService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar todas as subcategorias")
    public ResponseEntity<List<SubcategoriaDTO>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/por-categoria/{categoriaPaiId}")
    @Operation(summary = "Listar subcategorias por categoria pai")
    public ResponseEntity<List<SubcategoriaDTO>> getByCategoriaPai(@PathVariable UUID categoriaPaiId) {
        return ResponseEntity.ok(service.findByCategoriaPaiId(categoriaPaiId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar subcategoria por ID")
    public ResponseEntity<SubcategoriaDTO> getById(@PathVariable UUID id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Criar nova subcategoria")
    public ResponseEntity<SubcategoriaDTO> create(@Valid @RequestBody SubcategoriaDTO dto) {
        try {
            return ResponseEntity.ok(service.create(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar subcategoria")
    public ResponseEntity<SubcategoriaDTO> update(@PathVariable UUID id, @Valid @RequestBody SubcategoriaDTO dto) {
        try {
            return ResponseEntity.ok(service.update(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir subcategoria")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
