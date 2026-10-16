package com.z7design.secured_guard.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.z7design.secured_guard.model.Vacation;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.enums.VacationStatus;
import com.z7design.secured_guard.service.VacationService;
import com.z7design.secured_guard.service.EmployeeService;
import com.z7design.secured_guard.dto.ErrorResponse;
import com.z7design.secured_guard.dto.VacationDTO;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.Parameter;

@RestController
@RequestMapping("/api/vacations")
@Tag(name = "Férias", description = "Endpoints para gestão de solicitações de férias de funcionários.")
@SecurityRequirement(name = "bearerAuth")
public class VacationController {
    
    private final VacationService vacationService;
    private final EmployeeService employeeService;

    public VacationController(VacationService vacationService, EmployeeService employeeService) {
        this.vacationService = vacationService;
        this.employeeService = employeeService;
    }
    
    @Operation(summary = "Cria uma nova solicitação de férias",
               description = "Adiciona uma nova solicitação de férias ao sistema. Requer o papel de ADMIN, GESTOR ou o próprio funcionário.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Solicitação de férias criada com sucesso",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Vacation.class))),
            @ApiResponse(responseCode = "400", description = "Requisição inválida",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Dados da solicitação de férias para criação",
            content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = Vacation.class),
                    examples = @ExampleObject(value = "{\"employee\":{\"id\":\"UUID_DO_FUNCIONARIO\"}, \"startDate\":\"2024-08-01\", \"endDate\":\"2024-08-30\", \"status\":\"PENDING\"}")))
    @PostMapping
    public ResponseEntity<VacationDTO> create(@RequestBody VacationDTO vacationDTO) {
        // Quando o colaborador abre "Minhas Férias" o frontend envia user.id como employeeId.
        // Aqui garantimos que sempre vamos resolver o FUNCIONÁRIO correto pelo CPF/usuário autenticado.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;

        Employee employee;
        try {
            if (vacationDTO.getEmployeeId() != null) {
                employee = employeeService.findById(vacationDTO.getEmployeeId());
            } else {
                throw new RuntimeException("ID do funcionário não informado");
            }
        } catch (RuntimeException ex) {
            // Fallback: tentar resolver pelo CPF/usuário autenticado
            if (username == null) {
                throw ex;
            }
            employee = employeeService.findByCpfExact(username)
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado para o usuário autenticado"));
            // alinhar DTO com o funcionário resolvido
            vacationDTO.setEmployeeId(employee.getId());
        }

        Vacation vacation = vacationDTO.toEntity();
        vacation.setEmployee(employee);
        vacation = vacationService.create(vacation);
        return ResponseEntity.ok(VacationDTO.fromEntity(vacation));
    }
    
    @Operation(summary = "Atualiza uma solicitação de férias existente",
               description = "Atualiza as informações de uma solicitação de férias pelo seu ID. Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Solicitação de férias atualizada com sucesso",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Vacation.class))),
            @ApiResponse(responseCode = "400", description = "Requisição inválida",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Solicitação de férias não encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "Dados da solicitação de férias para atualização",
            content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = Vacation.class),
                    examples = @ExampleObject(value = "{\"id\":\"a1b2c3d4-e5f6-7890-1234-567890abcdef\", \"startDate\":\"2024-09-01\", \"endDate\":\"2024-09-20\"}")))
    @PutMapping("/{id}")
    public ResponseEntity<Vacation> update(@PathVariable UUID id, @RequestBody Vacation vacation) {
        return ResponseEntity.ok(vacationService.update(id, vacation));
    }
    
    
    
    @Operation(summary = "Cancela uma solicitação de férias",
               description = "Altera o status de uma solicitação de férias para CANCELADA. Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Solicitação de férias cancelada com sucesso",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Vacation.class))),
            @ApiResponse(responseCode = "400", description = "Requisição inválida ou transição de status não permitida",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Solicitação de férias não encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Vacation> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(vacationService.cancel(id));
    }
    
    @Operation(summary = "Exclui uma solicitação de férias",
               description = "Exclui uma solicitação de férias pelo seu ID. Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Solicitação de férias excluída com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Solicitação de férias não encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        vacationService.delete(id);
        return ResponseEntity.noContent().build();
    }
    
    @Operation(summary = "Busca uma solicitação de férias pelo ID",
               description = "Retorna as informações de uma solicitação de férias específica. Requer o papel de ADMIN, GESTOR, SUPERVISOR ou VIGILANTE (se for sua própria solicitação).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Solicitação de férias encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = Vacation.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Solicitação de férias não encontrada",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<VacationDTO> findById(@PathVariable UUID id) {
        Vacation vacation = vacationService.findById(id);
        return ResponseEntity.ok(VacationDTO.fromEntity(vacation));
    }
    
    @Operation(summary = "Busca solicitações de férias por ID de funcionário",
               description = "Retorna uma lista de solicitações de férias associadas a um funcionário específico. Requer o papel de ADMIN, GESTOR, SUPERVISOR ou VIGILANTE (se for o próprio funcionário).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de solicitações de férias do funcionário",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = Vacation.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<VacationDTO>> findByEmployeeId(@PathVariable UUID employeeId) {
        List<Vacation> vacations = vacationService.findByEmployeeId(employeeId);
        List<VacationDTO> vacationDTOs = vacations.stream()
            .map(VacationDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(vacationDTOs);
    }
    
    @Operation(summary = "Busca solicitações de férias por ID de funcionário e status",
               description = "Retorna uma lista de solicitações de férias de um funcionário com um status específico. Requer o papel de ADMIN, GESTOR ou SUPERVISOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de solicitações de férias por funcionário e status",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = Vacation.class))),
            @ApiResponse(responseCode = "400", description = "Status de férias inválido",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @Parameter(description = "Status da solicitação de férias (PENDING, APPROVED, REJECTED, CANCELLED)", required = true)
    @GetMapping("/employee/{employeeId}/status/{status}")
    public ResponseEntity<List<VacationDTO>> findByEmployeeIdAndStatus(
            @PathVariable UUID employeeId,
            @PathVariable VacationStatus status) {
        List<Vacation> vacations = vacationService.findByEmployeeIdAndStatus(employeeId, status);
        List<VacationDTO> vacationDTOs = vacations.stream()
            .map(VacationDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(vacationDTOs);
    }
    
    @Operation(summary = "Busca solicitações de férias por intervalo de datas de início",
               description = "Retorna uma lista de solicitações de férias cujo período de início cai dentro de um intervalo de datas especificado. Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de solicitações de férias por intervalo de datas",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = Vacation.class))),
            @ApiResponse(responseCode = "400", description = "Requisição inválida (formato de data)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @Parameter(description = "Data de início do período (formato YYYY-MM-DD)", example = "2023-01-01", required = true)
    @Parameter(description = "Data de fim do período (formato YYYY-MM-DD)", example = "2023-12-31", required = true)
    @GetMapping("/date-range")
    public ResponseEntity<List<VacationDTO>> findByStartDateBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<Vacation> vacations = vacationService.findByStartDateBetween(startDate, endDate);
        List<VacationDTO> vacationDTOs = vacations.stream()
            .map(VacationDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(vacationDTOs);
    }
    
    @Operation(summary = "Retorna todas as solicitações de férias",
               description = "Retorna uma lista de todas as solicitações de férias cadastradas. Requer o papel de ADMIN ou GESTOR.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de todas as solicitações de férias",
                    content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = Vacation.class))),
            @ApiResponse(responseCode = "403", description = "Acesso negado (papel insuficiente)",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    public ResponseEntity<List<VacationDTO>> findAll() {
        List<Vacation> vacations = vacationService.findAll();
        List<VacationDTO> vacationDTOs = vacations.stream()
            .map(VacationDTO::fromEntity)
            .toList();
        return ResponseEntity.ok(vacationDTOs);
    }

    @Operation(summary = "Aprova uma solicitação de férias",
               description = "Aprova uma solicitação de férias pendente. Apenas usuários com roles de RH podem aprovar.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Férias aprovada com sucesso",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = VacationDTO.class))),
        @ApiResponse(responseCode = "403", description = "Acesso negado - permissões insuficientes",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = ErrorResponse.class),
                                      examples = @ExampleObject(value = "{\"error\": \"Acesso negado\", \"message\": \"Você não tem permissão para aprovar férias\"}"))),
        @ApiResponse(responseCode = "404", description = "Solicitação de férias não encontrada",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "400", description = "Solicitação já foi processada ou dados inválidos",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('HR_APPROVE', 'HR_READ', 'HR_WRITE', 'HR_DELETE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'RECURSOS_HUMANOS', 'RH', 'DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<VacationDTO> approveVacation(
            @Parameter(description = "ID da solicitação de férias a ser aprovada") @PathVariable UUID id,
            @RequestBody(required = false) ApprovalRequest request) {
        try {
            Vacation vacation = vacationService.approveVacation(id, request != null ? request.getObservacoes() : null);
            return ResponseEntity.ok(VacationDTO.fromEntity(vacation));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @Operation(summary = "Rejeita uma solicitação de férias",
               description = "Rejeita uma solicitação de férias pendente. Apenas usuários com roles de RH podem rejeitar.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Férias rejeitada com sucesso",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = VacationDTO.class))),
        @ApiResponse(responseCode = "403", description = "Acesso negado - permissões insuficientes",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = ErrorResponse.class),
                                      examples = @ExampleObject(value = "{\"error\": \"Acesso negado\", \"message\": \"Você não tem permissão para rejeitar férias\"}"))),
        @ApiResponse(responseCode = "404", description = "Solicitação de férias não encontrada",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = ErrorResponse.class))),
        @ApiResponse(responseCode = "400", description = "Solicitação já foi processada ou dados inválidos",
                     content = @Content(mediaType = "application/json",
                                      schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('HR_APPROVE', 'HR_READ', 'HR_WRITE', 'HR_DELETE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'RECURSOS_HUMANOS', 'RH', 'DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<VacationDTO> rejectVacation(
            @Parameter(description = "ID da solicitação de férias a ser rejeitada") @PathVariable UUID id,
            @RequestBody(required = false) ApprovalRequest request) {
        try {
            String motivo = (request != null && request.getObservacoes() != null) ? request.getObservacoes() : "Motivo não especificado";
            Vacation vacation = vacationService.rejectVacation(id, motivo);
            return ResponseEntity.ok(VacationDTO.fromEntity(vacation));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Classe interna para requests de aprovação
    public static class ApprovalRequest {
        private String observacoes;

        public String getObservacoes() {
            return observacoes;
        }

        public void setObservacoes(String observacoes) {
            this.observacoes = observacoes;
        }
    }
} 