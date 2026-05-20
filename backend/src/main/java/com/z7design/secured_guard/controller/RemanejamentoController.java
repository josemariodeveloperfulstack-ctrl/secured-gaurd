package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.RemanejamentoDTO;
import com.z7design.secured_guard.model.Remanejamento;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.RemanejamentoService;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/remanejamentos")
@Tag(name = "Remanejamentos", description = "Endpoints para gestão de remanejamentos de funcionários")
@Slf4j
public class RemanejamentoController {
    @Autowired
    private RemanejamentoService remanejamentoService;

    @Operation(summary = "Cria um novo remanejamento",
               description = "Cria um novo registro de remanejamento e registra no histórico de auditoria.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Remanejamento criado com sucesso",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Remanejamento.class))),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PostMapping
    public ResponseEntity<RemanejamentoDTO> create(@RequestBody RemanejamentoDTO dto, 
                                              HttpServletRequest request) {
        try {
            User usuarioAtual = getUsuarioAtual();
            String ipUsuario = getClientIpAddress(request);
            
            RemanejamentoDTO created = remanejamentoService.createFromDTO(dto, usuarioAtual, 
                "Criação via API - IP: " + ipUsuario);
            return ResponseEntity.ok(created);
        } catch (RuntimeException e) {
            log.error("Erro ao criar remanejamento: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Erro inesperado ao criar remanejamento: {}", e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Atualiza um remanejamento existente",
               description = "Atualiza um registro de remanejamento existente e registra no histórico de auditoria.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Remanejamento atualizado com sucesso",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Remanejamento.class))),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Remanejamento não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PutMapping("/{id}")
    public ResponseEntity<RemanejamentoDTO> update(@PathVariable UUID id, 
                                              @RequestBody RemanejamentoDTO dto,
                                              HttpServletRequest request) {
        User usuarioAtual = getUsuarioAtual();
        String ipUsuario = getClientIpAddress(request);
        
        RemanejamentoDTO updated = remanejamentoService.updateFromDTO(id, dto, usuarioAtual, 
            "Edição via API - IP: " + ipUsuario);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Exclui um remanejamento",
               description = "Exclui um registro de remanejamento e registra no histórico de auditoria.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Remanejamento excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Remanejamento não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest request) {
        try {
            User usuarioAtual = getUsuarioAtual();
            String ipUsuario = getClientIpAddress(request);

            remanejamentoService.delete(id, usuarioAtual, "Exclusão via API - IP: " + ipUsuario);
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            log.warn("Remanejamento não encontrado para exclusão: {}", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Erro ao excluir remanejamento {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Busca todos os remanejamentos",
               description = "Retorna uma lista de todos os remanejamentos cadastrados.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de remanejamentos",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = Remanejamento.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @GetMapping
    public ResponseEntity<List<RemanejamentoDTO>> findAll() {
        return ResponseEntity.ok(remanejamentoService.findAllAsDTO());
    }

    @Operation(summary = "Busca um remanejamento por ID",
               description = "Retorna um remanejamento específico pelo seu ID.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Remanejamento encontrado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Remanejamento.class))),
            @ApiResponse(responseCode = "404", description = "Remanejamento não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @GetMapping("/{id}")
    public ResponseEntity<RemanejamentoDTO> findById(@PathVariable UUID id) {
        Optional<RemanejamentoDTO> remanejamento = remanejamentoService.findByIdAsDTO(id);
        return remanejamento.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Busca remanejamentos por funcionário",
               description = "Retorna todos os remanejamentos de um funcionário específico.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de remanejamentos do funcionário",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = Remanejamento.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<RemanejamentoDTO>> findByEmployeeId(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(remanejamentoService.findByEmployeeIdAsDTO(employeeId));
    }
    
    @Operation(summary = "Gerar relatório PDF de remanejamentos",
               description = "Gera relatório PDF filtrado por funcionário, tipo, setor (posto), empresa, período ou últimos dias")
    @GetMapping("/report/pdf")
    public ResponseEntity<byte[]> generatePDFReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String origem,
            @RequestParam(required = false) String destino,
            @RequestParam(required = false) UUID workPostId,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) Integer lastDays,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        try {
            com.z7design.secured_guard.model.RemanejamentoTipo tipoEnum = null;
            if (tipo != null && !tipo.isEmpty() && !"all".equals(tipo)) {
                try {
                    tipoEnum = com.z7design.secured_guard.model.RemanejamentoTipo.valueOf(tipo);
                } catch (IllegalArgumentException e) {
                    // Tipo inválido, ignorar
                }
            }

            byte[] pdfBytes = remanejamentoService.generatePDFReport(employeeId, tipoEnum, origem, destino, workPostId, companyId, lastDays, startDate, endDate);
            String fileName = "relatorio-remanejamentos-" + java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd")) + ".pdf";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Obtém o usuário atualmente autenticado
     */
    private User getUsuarioAtual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return (User) authentication.getPrincipal();
        }
        return null; // Retorna null se não houver usuário autenticado
    }
    
    /**
     * Obtém o endereço IP do cliente
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0];
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
} 