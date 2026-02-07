package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.SalesGoalDTO;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.AuthenticationService;
import com.z7design.secured_guard.service.SalesGoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sales-goals")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Metas Comerciais", description = "CRUD de metas de vendas")
public class SalesGoalController {

    private final SalesGoalService salesGoalService;
    private final AuthenticationService authenticationService;

    @GetMapping
    @Operation(summary = "Listar metas comerciais", description = "Retorna metas com filtros opcionais de ano e mês")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL')")
    public ResponseEntity<List<SalesGoalDTO>> getGoals(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        if (year != null && month != null) {
            return ResponseEntity.ok(salesGoalService.findByPeriod(month, year));
        } else if (year != null) {
            return ResponseEntity.ok(salesGoalService.findByYear(year));
        }
        return ResponseEntity.ok(salesGoalService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar meta por ID")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL')")
    public ResponseEntity<SalesGoalDTO> getGoalById(@PathVariable UUID id) {
        return ResponseEntity.ok(salesGoalService.findById(id));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Buscar metas de um usuário")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL')")
    public ResponseEntity<List<SalesGoalDTO>> getGoalsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(salesGoalService.findByUserId(userId));
    }

    @GetMapping("/progress")
    @Operation(summary = "Obter progresso de metas", description = "Retorna metas com valor atual calculado e percentual de progresso")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL')")
    public ResponseEntity<List<SalesGoalDTO>> getProgress(
            @RequestParam int month,
            @RequestParam int year) {
        return ResponseEntity.ok(salesGoalService.getProgress(month, year));
    }

    @PostMapping
    @Operation(summary = "Criar meta comercial", description = "Apenas Gestor ou Admin pode criar metas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<SalesGoalDTO> createGoal(@RequestBody SalesGoalDTO dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = authenticationService.getCurrentUser(auth);
        SalesGoalDTO created = salesGoalService.create(dto, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar meta comercial", description = "Apenas Gestor ou Admin pode editar metas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<SalesGoalDTO> updateGoal(@PathVariable UUID id, @RequestBody SalesGoalDTO dto) {
        return ResponseEntity.ok(salesGoalService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir meta comercial", description = "Apenas Gestor ou Admin pode excluir metas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR')")
    public ResponseEntity<Void> deleteGoal(@PathVariable UUID id) {
        salesGoalService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
