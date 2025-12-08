package com.z7design.secured_guard.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.z7design.secured_guard.dto.CreateOccurrenceDTO;
import com.z7design.secured_guard.dto.OccurrenceResponseDTO;
import com.z7design.secured_guard.model.Occurrence;
import com.z7design.secured_guard.model.OperationalOccurrence;
import com.z7design.secured_guard.service.OccurrenceService;
import com.z7design.secured_guard.service.OperationalOccurrenceService;
import com.z7design.secured_guard.dto.ErrorResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/occurrences")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Ocorrências", description = "Endpoints para gestão de ocorrências de segurança.")
@SecurityRequirement(name = "bearerAuth")
public class OccurrenceController {
    
    private final OccurrenceService occurrenceService;
    private final OperationalOccurrenceService operationalOccurrenceService;
    
    @Operation(summary = "Cria uma nova ocorrência",
               description = "Adiciona uma nova ocorrência ao sistema. Requer o papel de ADMIN, GESTOR ou SUPERVISOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Ocorrência criada com sucesso",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Occurrence.class))),
            @ApiResponse(responseCode = "400", description = "Requisição inválida",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Dados da ocorrência para criação",
            content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = Occurrence.class),
                    examples = @ExampleObject(value = "{\"employee\":{\"id\":\"UUID_DO_FUNCIONARIO\"}, \"occurrenceType\":\"INCIDENT\", \"description\":\"Incidente de segurança na portaria.\", \"occurrenceDate\":\"2024-06-20T10:30:00\", \"status\":\"REPORTED\"}")))
    @PostMapping
    public ResponseEntity<OccurrenceResponseDTO> create(@RequestBody CreateOccurrenceDTO dto) {
        log.info("POST /api/occurrences - Criando nova ocorrência");
        try {
            var occurrence = operationalOccurrenceService.createFromDTO(dto);
            var responseDTO = operationalOccurrenceService.convertToResponseDTO(occurrence);
            return ResponseEntity.ok(responseDTO);
        } catch (Exception e) {
            log.error("Erro ao criar ocorrência: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    @Operation(summary = "Atualiza uma ocorrência existente",
               description = "Atualiza as informações de uma ocorrência pelo seu ID. Requer o papel de ADMIN, GESTOR ou SUPERVISOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Ocorrência atualizada com sucesso",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Occurrence.class))),
            @ApiResponse(responseCode = "400", description = "Requisição inválida",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Ocorrência não encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Dados da ocorrência para atualização",
            content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = Occurrence.class),
                    examples = @ExampleObject(value = "{\"id\":\"a1b2c3d4-e5f6-7890-1234-567890abcdef\", \"description\":\"Incidente de segurança resolvido.\", \"status\":\"RESOLVED\"}")))
    @PutMapping("/{id}")
    public ResponseEntity<OccurrenceResponseDTO> update(@PathVariable UUID id, @RequestBody CreateOccurrenceDTO dto) {
        log.info("PUT /api/occurrences/{} - Atualizando ocorrência", id);
        try {
            // Buscar ocorrência existente
            OperationalOccurrence existingOccurrence = operationalOccurrenceService.getOccurrenceById(id);
            
            // Atualizar campos do DTO
            if (dto.getType() != null) {
                try {
                    existingOccurrence.setType(OperationalOccurrence.OccurrenceType.valueOf(dto.getType().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.warn("Tipo inválido: {}", dto.getType());
                }
            }
            if (dto.getTitle() != null) {
                existingOccurrence.setTitle(dto.getTitle());
            }
            if (dto.getDescription() != null) {
                existingOccurrence.setDescription(dto.getDescription());
            }
            if (dto.getLocation() != null) {
                existingOccurrence.setLocation(dto.getLocation());
            }
            if (dto.getStatus() != null) {
                try {
                    existingOccurrence.setStatus(OperationalOccurrence.OccurrenceStatus.valueOf(dto.getStatus().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.warn("Status inválido: {}", dto.getStatus());
                }
            }
            if (dto.getPriority() != null) {
                try {
                    existingOccurrence.setPriority(OperationalOccurrence.OccurrencePriority.valueOf(dto.getPriority().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    log.warn("Prioridade inválida: {}", dto.getPriority());
                }
            }
            if (dto.getDate() != null && !dto.getDate().isEmpty()) {
                existingOccurrence.setDate(dto.getDateAsLocalDateTime());
            }
            if (dto.getResponsible() != null) {
                existingOccurrence.setResponsible(dto.getResponsible());
            }
            if (dto.getWarningNumber() != null) {
                existingOccurrence.setWarningNumber(dto.getWarningNumber());
            }
            
            OperationalOccurrence updatedOccurrence = operationalOccurrenceService.updateOccurrence(id, existingOccurrence);
            OccurrenceResponseDTO responseDTO = operationalOccurrenceService.convertToResponseDTO(updatedOccurrence);
            return ResponseEntity.ok(responseDTO);
        } catch (Exception e) {
            log.error("Erro ao atualizar ocorrência: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    @Operation(summary = "Exclui uma ocorrência",
               description = "Exclui uma ocorrência pelo seu ID. Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Ocorrência excluída com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Ocorrência não encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        log.info("DELETE /api/occurrences/{} - Deletando ocorrência", id);
        try {
            operationalOccurrenceService.deleteOccurrence(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao deletar ocorrência: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    @Operation(summary = "Busca uma ocorrência pelo ID",
               description = "Retorna as informações de uma ocorrência específica. Requer o papel de ADMIN, GESTOR, SUPERVISOR ou VIGILANTE (se for relacionado ao funcionário).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Ocorrência encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Occurrence.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Ocorrência não encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<OccurrenceResponseDTO> findById(@PathVariable UUID id) {
        try {
            // Tentar buscar como OperationalOccurrence primeiro
            var occurrence = operationalOccurrenceService.getOccurrenceById(id);
            var responseDTO = operationalOccurrenceService.convertToResponseDTO(occurrence);
            return ResponseEntity.ok(responseDTO);
        } catch (Exception e) {
            log.error("Erro ao buscar ocorrência: {}", e.getMessage(), e);
            // Se não encontrar como OperationalOccurrence, tentar como Occurrence antiga
            try {
                occurrenceService.findById(id);
                // Converter Occurrence antiga para DTO (implementar se necessário)
                throw new RuntimeException("Ocorrência encontrada mas formato antigo não suportado");
            } catch (Exception e2) {
                throw e;
            }
        }
    }
    
    @Operation(summary = "Busca ocorrências por ID de funcionário",
               description = "Retorna uma lista de ocorrências associadas a um funcionário específico. Requer o papel de ADMIN, GESTOR, SUPERVISOR ou VIGILANTE (se for o próprio funcionário).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de ocorrências do funcionário",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = OccurrenceResponseDTO.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<OccurrenceResponseDTO>> findByEmployeeId(@PathVariable UUID employeeId) {
        var occurrences = operationalOccurrenceService.getOccurrencesByEmployee(employeeId);
        var responseDTOs = occurrences.stream()
            .map(operationalOccurrenceService::convertToResponseDTO)
            .toList();
        return ResponseEntity.ok(responseDTOs);
    }
    
    @Operation(summary = "Busca ocorrências por tipo",
               description = "Retorna uma lista de ocorrências de um tipo específico (ex: INCIDENT, ACCIDENT). Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de ocorrências por tipo",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = OccurrenceResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "Tipo de ocorrência inválido",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/type/{type}")
    public ResponseEntity<List<OccurrenceResponseDTO>> findByType(@PathVariable String type) {
        try {
            var occurrenceType = OperationalOccurrence.OccurrenceType.valueOf(type.toUpperCase());
            var occurrences = operationalOccurrenceService.getOccurrencesByType(occurrenceType);
            var responseDTOs = occurrences.stream()
                .map(operationalOccurrenceService::convertToResponseDTO)
                .toList();
            return ResponseEntity.ok(responseDTOs);
        } catch (IllegalArgumentException e) {
            log.error("Tipo inválido: {}", type);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @Operation(summary = "Busca ocorrências por status",
               description = "Retorna uma lista de ocorrências com um status específico (ex: REPORTED, IN_PROGRESS, RESOLVED). Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de ocorrências por status",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = OccurrenceResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "Status de ocorrência inválido",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/status/{status}")
    public ResponseEntity<List<OccurrenceResponseDTO>> findByStatus(@PathVariable String status) {
        try {
            var occurrenceStatus = OperationalOccurrence.OccurrenceStatus.valueOf(status.toUpperCase());
            var occurrences = operationalOccurrenceService.getOccurrencesByStatus(occurrenceStatus);
            var responseDTOs = occurrences.stream()
                .map(operationalOccurrenceService::convertToResponseDTO)
                .toList();
            return ResponseEntity.ok(responseDTOs);
        } catch (IllegalArgumentException e) {
            log.error("Status inválido: {}", status);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @Operation(summary = "Retorna todas as ocorrências",
               description = "Retorna uma lista de todas as ocorrências cadastradas. Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de todas as ocorrências",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = OccurrenceResponseDTO.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    public ResponseEntity<List<OccurrenceResponseDTO>> findAll() {
        var occurrences = operationalOccurrenceService.getAllOccurrences();
        var responseDTOs = occurrences.stream()
            .map(operationalOccurrenceService::convertToResponseDTO)
            .toList();
        return ResponseEntity.ok(responseDTOs);
    }
} 