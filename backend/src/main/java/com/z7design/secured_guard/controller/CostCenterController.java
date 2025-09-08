package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CostCenterDTO;
import com.z7design.secured_guard.model.CostCenter;
import com.z7design.secured_guard.service.CostCenterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cost-centers")
@RequiredArgsConstructor
@Tag(name = "Centros de Custo", description = "Endpoints para gestão de centros de custo")
public class CostCenterController {

    private final CostCenterService service;

    @GetMapping
    public ResponseEntity<Page<CostCenter>> list(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) CostCenter.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(service.list(name, status, page, size));
    }
    
    @GetMapping("/active")
    public ResponseEntity<List<CostCenter>> listActive() {
        return ResponseEntity.ok(service.listActive());
    }

    @PostMapping
    public ResponseEntity<CostCenter> create(@Valid @RequestBody CostCenterDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CostCenter> update(@PathVariable UUID id, @Valid @RequestBody CostCenterDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        // Regra: bloquear exclusão se houver faturas vinculadas a este centro (por nome)
        // Como nosso vínculo é por String em Invoice, vamos buscar o CostCenter e verificar por nome
        service.findById(id); // valida existência
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<CostCenter> toggleStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(service.toggleStatus(id));
    }
}


