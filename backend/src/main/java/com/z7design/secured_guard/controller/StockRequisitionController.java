package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CreateStockRequisitionRequest;
import com.z7design.secured_guard.dto.DeliverStockRequisitionRequest;
import com.z7design.secured_guard.dto.StockRequisitionDTO;
import com.z7design.secured_guard.dto.StockRequisitionListItemDTO;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.StockRequisitionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/stock/requisitions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Requisições de estoque", description = "Requisições multi-item com aprovação, PDF e entrega")
public class StockRequisitionController {

    private final StockRequisitionService stockRequisitionService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'RH', 'DEPARTAMENTO_PESSOAL', 'OPERACIONAL', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'GERENTE', 'COMPRAS', 'RECURSOS_HUMANOS')")
    @Operation(summary = "Listar requisições de estoque", description = "Todas as requisições (almoxarifado, RH, operacional)")
    public ResponseEntity<List<StockRequisitionListItemDTO>> list() {
        return ResponseEntity.ok(stockRequisitionService.listAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'RH', 'DEPARTAMENTO_PESSOAL', 'OPERACIONAL', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'RECURSOS_HUMANOS')")
    @Operation(summary = "Criar requisição", description = "Registra requisição pendente. A baixa no estoque ocorre na aprovação.")
    public ResponseEntity<?> create(@Valid @RequestBody CreateStockRequisitionRequest body, Authentication auth) {
        try {
            UUID userId = resolveUserId(auth);
            StockRequisitionDTO dto = stockRequisitionService.create(body, userId);
            return ResponseEntity.status(201).body(dto);
        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao criar requisição: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'RH', 'DEPARTAMENTO_PESSOAL', 'OPERACIONAL', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'GERENTE', 'COMPRAS', 'RECURSOS_HUMANOS')")
    @Operation(summary = "Obter requisição por ID")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(stockRequisitionService.get(id));
        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'RH', 'DEPARTAMENTO_PESSOAL', 'OPERACIONAL', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'RECURSOS_HUMANOS')")
    @Operation(summary = "Atualizar requisição pendente", description = "Somente enquanto status for PENDENTE.")
    public ResponseEntity<?> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateStockRequisitionRequest body,
            Authentication auth) {
        try {
            StockRequisitionDTO dto = stockRequisitionService.update(id, body);
            return ResponseEntity.ok(dto);
        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao atualizar requisição: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/bulk-delete")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'RH', 'DEPARTAMENTO_PESSOAL', 'OPERACIONAL', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'GERENTE', 'RECURSOS_HUMANOS')")
    @Operation(summary = "Excluir várias requisições pendentes", description = "Corpo: lista de UUID em string. Requisições não pendentes geram erro.")
    public ResponseEntity<?> bulkDelete(@RequestBody List<String> ids) {
        try {
            List<UUID> uuids = ids.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(UUID::fromString)
                    .toList();
            stockRequisitionService.deleteMultiple(uuids);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao excluir requisições em massa: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'RH', 'DEPARTAMENTO_PESSOAL', 'OPERACIONAL', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'GERENTE', 'RECURSOS_HUMANOS')")
    @Operation(summary = "Excluir requisição pendente")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        try {
            stockRequisitionService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao excluir requisição: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'GERENTE', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'RH', 'DEPARTAMENTO_PESSOAL', 'FINANCEIRO', 'ESTOQUE', 'ALMOXARIFADO', 'RECURSOS_HUMANOS')")
    @Operation(summary = "Aprovar requisição", description = "Aprova e baixa o estoque (saídas). A assinatura do funcionário é registrada depois em /deliver.")
    public ResponseEntity<?> approve(@PathVariable UUID id, Authentication auth) {
        try {
            UUID userId = resolveUserId(auth);
            return ResponseEntity.ok(stockRequisitionService.approve(id, userId));
        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/deliver")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'GESTOR', 'GERENTE', 'RH', 'DEPARTAMENTO_PESSOAL', 'FINANCEIRO')")
    @Operation(summary = "Confirmar recebimento", description = "Registra assinatura do funcionário nas movimentações já criadas na aprovação (digital ou física).")
    public ResponseEntity<?> deliver(
            @PathVariable UUID id,
            @Valid @RequestBody DeliverStockRequisitionRequest body,
            Authentication auth) {
        try {
            UUID userId = resolveUserId(auth);
            return ResponseEntity.ok(stockRequisitionService.deliver(id, body, userId));
        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'ESTOQUE', 'ALMOXARIFADO', 'COMPRAS', 'RH', 'DEPARTAMENTO_PESSOAL', 'RECURSOS_HUMANOS', 'FINANCEIRO', 'GESTOR', 'GERENTE')")
    @Operation(summary = "PDF da requisição", description = "Disponível após aprovação")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id) {
        try {
            byte[] bytes = stockRequisitionService.generatePdf(id);
            String filename = "requisicao-estoque-" + id + ".pdf";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(bytes);
        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof com.z7design.secured_guard.model.User) {
                return ((com.z7design.secured_guard.model.User) principal).getId();
            }
            try {
                String username = authentication.getName();
                return userRepository.findByUsername(username)
                        .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + username))
                        .getId();
            } catch (Exception e) {
                log.warn("Erro ao obter usuário: {}", e.getMessage());
            }
        }
        return UUID.fromString("11111111-1111-1111-1111-111111111111");
    }
}
