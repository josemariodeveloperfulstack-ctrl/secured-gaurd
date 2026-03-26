package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.StorageShelfDTO;
import com.z7design.secured_guard.service.StorageShelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stock/shelves")
@RequiredArgsConstructor
@Tag(name = "Storage Shelves", description = "Endpoints para gestão de prateleiras e localizações de estoque")
public class StorageShelfController {

    private final StorageShelfService storageShelfService;

    @GetMapping
    @Operation(summary = "Listar todas as prateleiras ativas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'COMPRAS', 'ALMOXARIFADO', 'GESTOR', 'SUPERVISOR', 'SUPRIMENTOS')")
    public ResponseEntity<List<StorageShelfDTO>> getAllShelves() {
        return ResponseEntity.ok(storageShelfService.getAllActiveShelves());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar prateleira por ID")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'COMPRAS', 'ALMOXARIFADO', 'GESTOR', 'SUPERVISOR', 'SUPRIMENTOS')")
    public ResponseEntity<StorageShelfDTO> getShelfById(@PathVariable UUID id) {
        return ResponseEntity.ok(storageShelfService.getShelfById(id));
    }

    @PostMapping
    @Operation(summary = "Criar nova prateleira")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO')")
    public ResponseEntity<StorageShelfDTO> createShelf(@RequestBody StorageShelfDTO dto) {
        return ResponseEntity.ok(storageShelfService.createShelf(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar prateleira")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO')")
    public ResponseEntity<StorageShelfDTO> updateShelf(@PathVariable UUID id, @RequestBody StorageShelfDTO dto) {
        return ResponseEntity.ok(storageShelfService.updateShelf(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Desativar prateleira")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO')")
    public ResponseEntity<Void> deleteShelf(@PathVariable UUID id) {
        storageShelfService.deleteShelf(id);
        return ResponseEntity.noContent().build();
    }
}
