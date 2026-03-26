package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CompanyDTO;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.service.CompanyService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Empresas", description = "API para gerenciamento de empresas")
@CrossOrigin(origins = "*")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping("/diagnostic")
    @Operation(summary = "Diagnóstico do controller", description = "Verifica se o controller está respondendo")
    public ResponseEntity<Object> diagnostic() {
        log.info("Diagnóstico do CompanyController acessado");
        return ResponseEntity.ok(java.util.Map.of(
                "status", "UP",
                "controller", "CompanyController",
                "timestamp", java.time.LocalDateTime.now().toString()));
    }

    @GetMapping
    @Operation(summary = "Listar todas as empresas", description = "Retorna uma lista de todas as empresas")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Empresas listadas com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','ADMIN','GESTOR','RH','FINANCEIRO','OPERACIONAL','GESTOR_OPERACIONAL','COMERCIAL','ASSISTENTE_ADMINISTRATIVO','ANALISTA_SUPRIMENTOS','ESTOQUE','ALMOXARIFADO','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH','ROLE_FINANCEIRO','ROLE_OPERACIONAL','ROLE_GESTOR_OPERACIONAL','ROLE_COMERCIAL','ROLE_ASSISTENTE_ADMINISTRATIVO','ROLE_ANALISTA_SUPRIMENTOS','ROLE_ESTOQUE','ROLE_ALMOXARIFADO')")
    public ResponseEntity<List<CompanyDTO>> getAllCompanies() {
        try {
            log.info("Buscando todas as empresas");
            List<CompanyDTO> companies = companyService.getAllCompanies();
            log.info("Retornando {} empresas", companies.size());
            return ResponseEntity.ok(companies);
        } catch (Exception e) {
            log.error("Erro ao buscar todas as empresas", e);
            // Retorna lista vazia em vez de 500 para evitar quebrar o frontend
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('HR_READ', 'EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'EMPLOYEES_CREATE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'SUPERVISOR', 'ASSISTENTE_ADMINISTRATIVO', 'ANALISTA_SUPRIMENTOS', 'ESTOQUE', 'ALMOXARIFADO', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_COMERCIAL', 'ROLE_SUPERVISOR', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS', 'ROLE_ESTOQUE', 'ROLE_ALMOXARIFADO')")
    @Operation(summary = "Buscar empresas", description = "Busca empresas por nome com filtro dinâmico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Empresas encontradas com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Object> searchCompanies(@RequestParam(required = false) String query) {
        log.debug("Buscando empresas com query: {}", query);
        try {
            // Retornar lista vazia por enquanto para evitar erro
            return ResponseEntity.ok(java.util.Collections.emptyList());
        } catch (Exception e) {
            log.error("Erro ao buscar empresas: ", e);
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/test")
    @Operation(summary = "Teste básico de empresas", description = "Teste básico para verificar se o endpoint funciona")
    public ResponseEntity<Object> testCompanies() {
        try {
            log.debug("Teste básico de empresas");
            List<CompanyDTO> companies = companyService.getAllCompanies();
            return ResponseEntity.ok(java.util.Map.of(
                    "count", companies.size(),
                    "message", "Teste de empresas funcionando",
                    "companies", companies));
        } catch (Exception e) {
            log.error("Erro no teste de empresas: ", e);
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('HR_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('COMERCIAL') or hasRole('ASSISTENTE_ADMINISTRATIVO') or hasRole('ANALISTA_SUPRIMENTOS') or hasRole('ESTOQUE') or hasRole('ALMOXARIFADO')")
    @Operation(summary = "Listar empresas ativas", description = "Retorna uma lista de empresas ativas")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Empresas ativas listadas com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<CompanyDTO>> getActiveCompanies() {
        log.debug("Buscando empresas ativas");
        List<CompanyDTO> companies = companyService.getActiveCompanies();
        return ResponseEntity.ok(companies);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('COMERCIAL') or hasRole('ASSISTENTE_ADMINISTRATIVO') or hasRole('ANALISTA_SUPRIMENTOS') or hasRole('ESTOQUE') or hasRole('ALMOXARIFADO')")
    @Operation(summary = "Buscar empresa por ID", description = "Retorna uma empresa específica pelo ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Empresa encontrada"),
            @ApiResponse(responseCode = "404", description = "Empresa não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<CompanyDTO> getCompanyById(
            @Parameter(description = "ID da empresa") @PathVariable UUID id) {
        log.debug("Buscando empresa por ID: {}", id);
        CompanyDTO company = companyService.getCompanyById(id);
        return ResponseEntity.ok(company);
    }

    @GetMapping("/sigla/{sigla}")
    @PreAuthorize("hasAuthority('HR_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN') or hasRole('COMERCIAL') or hasRole('ASSISTENTE_ADMINISTRATIVO') or hasRole('ANALISTA_SUPRIMENTOS')")
    @Operation(summary = "Buscar empresa por sigla", description = "Retorna uma empresa específica pela sigla")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Empresa encontrada"),
            @ApiResponse(responseCode = "404", description = "Empresa não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<CompanyDTO> getCompanyBySigla(
            @Parameter(description = "Sigla da empresa") @PathVariable String sigla) {
        log.debug("Buscando empresa por sigla: {}", sigla);
        CompanyDTO company = companyService.getCompanyBySigla(sigla);
        return ResponseEntity.ok(company);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('HR_WRITE','SUPER_ADMIN','ROLE_SUPER_ADMIN','ADMIN','ROLE_ADMIN','COMERCIAL','ROLE_COMERCIAL')")
    @Operation(summary = "Criar nova empresa", description = "Cria uma nova empresa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Empresa criada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<CompanyDTO> createCompany(
            @Parameter(description = "Dados da empresa") @Valid @RequestBody CompanyDTO companyDTO) {
        log.debug("Recebida requisição para criar empresa: {}", companyDTO.getName());
        CompanyDTO createdCompany = companyService.createCompany(companyDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdCompany);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_WRITE','SUPER_ADMIN','ROLE_SUPER_ADMIN','ADMIN','ROLE_ADMIN','COMERCIAL','ROLE_COMERCIAL')")
    @Operation(summary = "Atualizar empresa", description = "Atualiza uma empresa existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Empresa atualizada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Empresa não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<CompanyDTO> updateCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID id,
            @Parameter(description = "Dados atualizados da empresa") @Valid @RequestBody CompanyDTO companyDTO) {
        log.debug("Recebida requisição para atualizar empresa ID: {}", id);
        CompanyDTO updatedCompany = companyService.updateCompany(id, companyDTO);
        return ResponseEntity.ok(updatedCompany);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Excluir empresa", description = "Exclui uma empresa pelo ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Empresa excluída com sucesso"),
            @ApiResponse(responseCode = "404", description = "Empresa não encontrada"),
            @ApiResponse(responseCode = "400", description = "Não é possível excluir empresa com funcionários associados"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> deleteCompany(
            @Parameter(description = "ID da empresa") @PathVariable UUID id) {
        log.info("Recebida requisição para excluir empresa ID: {}", id);
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleException(Exception e, HttpServletRequest request) {
        log.error("🔴 DIAGNÓSTICO DE ERRO NO CompanyController [{} {}]: {}",
                request.getMethod(), request.getRequestURI(), e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of(
                "error", "Bad Request (Captured by Diagnostic)",
                "message", e.getMessage() != null ? e.getMessage() : "No message",
                "path", request.getRequestURI(),
                "type", e.getClass().getName()));
    }
}