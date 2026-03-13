package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.CIPAMember;
import com.z7design.secured_guard.service.CIPAService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sst/cipa")
@RequiredArgsConstructor
@Tag(name = "CIPA", description = "Comissão Interna de Prevenção de Acidentes")
public class CIPAController {

    private final CIPAService cipaService;

    @GetMapping("/members")
    @Operation(summary = "Listar membros da CIPA", description = "Retorna todos os membros ativos da CIPA")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<Map<String, Object>>> getMembers() {
        List<CIPAMember> members = cipaService.findAllMembers();
        List<Map<String, Object>> dtos = members.stream()
                .map(CIPAService::toResponseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @DeleteMapping("/members/{id}")
    @Operation(summary = "Remover membro da CIPA", description = "Remove um membro da CIPA pelo ID")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Void> deleteMember(@PathVariable UUID id) {
        cipaService.deleteMember(id);
        return ResponseEntity.noContent().build();
    }
}
