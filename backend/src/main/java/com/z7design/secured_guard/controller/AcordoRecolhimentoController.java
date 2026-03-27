package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.AcordoRecolhimento;
import com.z7design.secured_guard.service.AcordoRecolhimentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchases/agreements")
@RequiredArgsConstructor
public class AcordoRecolhimentoController {

    private final AcordoRecolhimentoService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_AGREEMENT_READ', 'PURCHASE_REQUESTS_READ', 'ALL_PERMISSIONS')")
    public ResponseEntity<List<AcordoRecolhimento>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_AGREEMENT_READ', 'PURCHASE_REQUESTS_READ', 'ALL_PERMISSIONS')")
    public ResponseEntity<AcordoRecolhimento> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_AGREEMENT_WRITE', 'PURCHASE_REQUESTS_WRITE', 'ALL_PERMISSIONS')")
    public ResponseEntity<AcordoRecolhimento> create(@RequestBody AcordoRecolhimento acordo) {
        return ResponseEntity.ok(service.create(acordo));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'PURCHASE_AGREEMENT_WRITE', 'PURCHASE_REQUESTS_WRITE', 'ALL_PERMISSIONS')")
    public ResponseEntity<AcordoRecolhimento> update(@PathVariable UUID id, @RequestBody AcordoRecolhimento acordo) {
        return ResponseEntity.ok(service.update(id, acordo));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO', 'ALL_PERMISSIONS')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'PURCHASE_AGREEMENT_WRITE', 'PURCHASE_REQUESTS_WRITE', 'ALL_PERMISSIONS')")
    public ResponseEntity<AcordoRecolhimento> approve(@PathVariable UUID id, @RequestParam UUID approvedBy) {
        return ResponseEntity.ok(service.approve(id, approvedBy));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_COMPRAS', 'ROLE_FINANCEIRO', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'PURCHASE_AGREEMENT_WRITE', 'PURCHASE_REQUESTS_WRITE', 'ALL_PERMISSIONS')")
    public ResponseEntity<AcordoRecolhimento> reject(@PathVariable UUID id, @RequestParam UUID rejectedBy) {
        return ResponseEntity.ok(service.reject(id, rejectedBy));
    }
}
