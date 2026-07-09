package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.WorkPostDTO;
import com.z7design.secured_guard.dto.WorkPostReportFilterDTO;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.service.WorkPostReportService;
import com.z7design.secured_guard.model.enums.WorkPostStatus;
import com.z7design.secured_guard.model.enums.WorkPostType;
import com.z7design.secured_guard.service.WorkPostService;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@RestController
@RequestMapping("/api/work-posts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Postos de Trabalho", description = "API para gerenciamento de postos de trabalho")
public class WorkPostController {
    
    private final WorkPostService workPostService;
    private final WorkPostRepository workPostRepository;
    private final WorkPostReportService workPostReportService;
    
    @GetMapping
    @Operation(summary = "Listar postos de trabalho", description = "Retorna uma lista paginada de postos de trabalho")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<WorkPostDTO>> getAllWorkPosts(
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        log.debug("Buscando postos de trabalho com paginação");
        Page<WorkPost> workPosts = workPostService.findAll(pageable);
        Page<WorkPostDTO> workPostDTOs = workPostService.convertToDTOPage(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }
    
    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('HR_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'ROLE_RH', 'RH', 'OPERACIONAL', 'ROLE_OPERACIONAL', 'GESTOR_OPERACIONAL', 'ROLE_GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'ROLE_GESTAO_SUPERVISAO', 'DEPARTAMENTO_PESSOAL', 'ROLE_DEPARTAMENTO_PESSOAL', 'COMERCIAL', 'ROLE_COMERCIAL', 'ASSISTENTE_COMERCIAL', 'ROLE_ASSISTENTE_COMERCIAL', 'GESTOR_COMERCIAL', 'ROLE_GESTOR_COMERCIAL')")
    @Operation(summary = "Listar todos os postos de trabalho (sem paginação)", description = "Retorna uma lista completa de todos os postos de trabalho")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado"),
        @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<?> getAllWorkPostsNoPagination() {
        log.info("🔍 GET /api/work-posts/all - INÍCIO");
        java.util.ArrayList<WorkPostDTO> emptyList = new java.util.ArrayList<>();
        
        try {
            log.info("🔍 Tentando buscar postos via findAllAsDTO");
            List<WorkPostDTO> workPostDTOs = workPostService.findAllAsDTO();
            log.info("✅ findAllAsDTO retornou: {} (null={})", workPostDTOs != null ? workPostDTOs.size() : "null", workPostDTOs == null);
            
            if (workPostDTOs == null) {
                log.warn("⚠️ findAllAsDTO retornou null");
                return ResponseEntity.ok(emptyList);
            }
            
            log.info("✅ Retornando {} postos", workPostDTOs.size());
            return ResponseEntity.ok(workPostDTOs);
            
        } catch (org.springframework.security.access.AccessDeniedException e) {
            log.error("❌ AccessDeniedException: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(emptyList);
        } catch (Throwable e) {
            log.error("❌ ERRO CRÍTICO em /work-posts/all - Tipo: {} - Mensagem: {}", 
                    e.getClass().getName(), e.getMessage());
            log.error("❌ Stack trace completo: ", e);
            if (e.getCause() != null) {
                log.error("❌ Causa: {}", e.getCause().getMessage());
                if (e.getCause().getCause() != null) {
                    log.error("❌ Causa da causa: {}", e.getCause().getCause().getMessage());
                }
            }
            // Retornar lista vazia em qualquer caso
            return ResponseEntity.ok(emptyList);
        }
    }
    
    @GetMapping("/by-company/{companyId}")
    @PreAuthorize("hasAnyAuthority('HR_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'OPERACIONAL', 'ROLE_OPERACIONAL', 'GESTOR_OPERACIONAL', 'ROLE_GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'ROLE_GESTAO_SUPERVISAO', 'RH', 'ROLE_RH', 'DEPARTAMENTO_PESSOAL', 'ROLE_DEPARTAMENTO_PESSOAL', 'COMERCIAL', 'ROLE_COMERCIAL', 'ASSISTENTE_COMERCIAL', 'ROLE_ASSISTENTE_COMERCIAL', 'GESTOR_COMERCIAL', 'ROLE_GESTOR_COMERCIAL')")
    @Operation(summary = "Listar postos por empresa", description = "Retorna postos de trabalho que possuem funcionários da empresa informada")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<WorkPostDTO>> getWorkPostsByCompany(
            @Parameter(description = "ID da empresa") @PathVariable String companyId) {
        try {
            UUID uuid = UUID.fromString(companyId.trim());
            List<WorkPostDTO> workPostDTOs = workPostService.findByCompanyId(uuid);
            return ResponseEntity.ok(workPostDTOs != null ? workPostDTOs : List.of());
        } catch (IllegalArgumentException e) {
            log.warn("ID de empresa inválido em /by-company: {}", companyId);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Erro ao listar postos por empresa {}: {}", companyId, e.getMessage(), e);
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar posto por ID", description = "Retorna um posto específico pelo ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Posto encontrado"),
        @ApiResponse(responseCode = "404", description = "Posto não encontrado"),
        @ApiResponse(responseCode = "400", description = "ID inválido"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<WorkPostDTO> getWorkPostById(
            @Parameter(description = "ID do posto") @PathVariable String id) {
        // Limpar espaços da URL (caso venha com espaço no final, ex: "all ")
        String cleanId = id != null ? id.trim() : "";
        
        // Se for "all" (com ou sem espaços), deve ter sido mapeado incorretamente
        // Retornar 404 em vez de tentar converter para UUID
        if ("all".equalsIgnoreCase(cleanId)) {
            log.warn("⚠️ Endpoint /all foi incorretamente mapeado para /{id}. Use /api/work-posts/all");
            throw new ResourceNotFoundException("Use o endpoint /api/work-posts/all para listar todos os postos");
        }
        
        // Validar se é um UUID válido antes de processar
        UUID uuid;
        try {
            uuid = UUID.fromString(cleanId);
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Tentativa de buscar posto com ID inválido (não é UUID): '{}'", cleanId);
            throw new IllegalArgumentException("ID deve ser um UUID válido. Recebido: '" + cleanId + "'");
        }
        
        WorkPost workPost = workPostService.getById(uuid);
        WorkPostDTO workPostDTO = workPostService.convertToDTO(workPost);
        return ResponseEntity.ok(workPostDTO);
    }
    
    @GetMapping("/code/{postCode}")
    @Operation(summary = "Buscar posto por código", description = "Retorna um posto específico pelo código")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Posto encontrado"),
        @ApiResponse(responseCode = "404", description = "Posto não encontrado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<WorkPostDTO> getWorkPostByCode(
            @Parameter(description = "Código do posto") @PathVariable String postCode) {
        WorkPost workPost = workPostService.findByPostCode(postCode)
                .orElseThrow(() -> new ResourceNotFoundException("Posto não encontrado com código: " + postCode));
        WorkPostDTO workPostDTO = workPostService.convertToDTO(workPost);
        return ResponseEntity.ok(workPostDTO);
    }
    
    @PostMapping
    @Operation(summary = "Criar posto de trabalho", description = "Cria um novo posto de trabalho")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Posto criado com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<WorkPostDTO> createWorkPost(
            @Parameter(description = "Dados do posto") @Valid @RequestBody WorkPostDTO workPostDTO) {
        WorkPost workPost = workPostService.createWorkPost(workPostDTO);
        WorkPostDTO createdWorkPostDTO = workPostService.convertToDTO(workPost);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdWorkPostDTO);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar posto de trabalho", description = "Atualiza um posto existente")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Posto atualizado com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos"),
        @ApiResponse(responseCode = "404", description = "Posto não encontrado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<WorkPostDTO> updateWorkPost(
            @Parameter(description = "ID do posto") @PathVariable String id,
            @Parameter(description = "Dados atualizados do posto") @Valid @RequestBody WorkPostDTO workPostDTO) {
        WorkPostDTO updatedWorkPostDTO = workPostService.updateWorkPost(UUID.fromString(id), workPostDTO);
        return ResponseEntity.ok(updatedWorkPostDTO);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir posto de trabalho", description = "Exclui um posto")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Posto excluído com sucesso"),
        @ApiResponse(responseCode = "404", description = "Posto não encontrado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> deleteWorkPost(
            @Parameter(description = "ID do posto") @PathVariable String id) {
        workPostService.deleteWorkPost(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Listar postos por status", description = "Retorna postos filtrados por status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<WorkPostDTO>> getWorkPostsByStatus(
            @Parameter(description = "Status do posto") @PathVariable WorkPostStatus status,
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        Page<WorkPost> workPosts = workPostService.findByStatus(status, pageable);
        Page<WorkPostDTO> workPostDTOs = workPostService.convertToDTOPage(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }
    
    @GetMapping("/type/{type}")
    @Operation(summary = "Listar postos por tipo", description = "Retorna postos filtrados por tipo")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<WorkPostDTO>> getWorkPostsByType(
            @Parameter(description = "Tipo do posto") @PathVariable WorkPostType type,
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        Page<WorkPost> workPosts = workPostService.findByType(type, pageable);
        Page<WorkPostDTO> workPostDTOs = workPostService.convertToDTOPage(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }
    
    @GetMapping("/client/{clientId}")
    @PreAuthorize("hasAnyAuthority('HR_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'COMERCIAL', 'ROLE_COMERCIAL', 'ASSISTENTE_COMERCIAL', 'ROLE_ASSISTENTE_COMERCIAL', 'GESTOR_COMERCIAL', 'ROLE_GESTOR_COMERCIAL')")
    @Operation(summary = "Listar postos por cliente", description = "Retorna postos de um cliente específico")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<WorkPostDTO>> getWorkPostsByClient(
            @Parameter(description = "ID do cliente") @PathVariable String clientId,
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        Page<WorkPost> workPosts = workPostService.findByClient(UUID.fromString(clientId), pageable);
        Page<WorkPostDTO> workPostDTOs = workPostService.convertToDTOPage(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }

    @GetMapping("/client/{clientId}/all")
    @PreAuthorize("hasAnyAuthority('HR_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR', 'OPERACIONAL', 'ROLE_OPERACIONAL', 'COMERCIAL', 'ROLE_COMERCIAL', 'ASSISTENTE_COMERCIAL', 'ROLE_ASSISTENTE_COMERCIAL', 'GESTOR_COMERCIAL', 'ROLE_GESTOR_COMERCIAL')")
    @Operation(summary = "Listar todos os postos por cliente (sem paginação)", description = "Retorna todos os postos de um cliente específico")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<WorkPostDTO>> getAllWorkPostsByClient(
            @Parameter(description = "ID do cliente") @PathVariable String clientId) {
        List<WorkPost> workPosts = workPostService.findByClient(UUID.fromString(clientId));
        List<WorkPostDTO> workPostDTOs = workPostService.convertToDTOList(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }
    
    @GetMapping("/contract/{contractId}")
    @Operation(summary = "Listar postos por contrato", description = "Retorna postos de um contrato específico")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<WorkPostDTO>> getWorkPostsByContract(
            @Parameter(description = "ID do contrato") @PathVariable String contractId,
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        Page<WorkPost> workPosts = workPostService.findByContract(UUID.fromString(contractId), pageable);
        Page<WorkPostDTO> workPostDTOs = workPostService.convertToDTOPage(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }
    
    @GetMapping("/search")
    @Operation(summary = "Buscar postos com filtros", description = "Retorna postos com filtros combinados")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos encontrados"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<WorkPostDTO>> searchWorkPosts(
            @Parameter(description = "ID do cliente") @RequestParam(required = false) String clientId,
            @Parameter(description = "Status do posto") @RequestParam(required = false) WorkPostStatus status,
            @Parameter(description = "Tipo do posto") @RequestParam(required = false) WorkPostType type,
            @Parameter(description = "Termo de busca") @RequestParam(required = false) String searchTerm,
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        Page<WorkPost> workPosts = workPostService.findByFilters(UUID.fromString(clientId), status, type, searchTerm, pageable);
        Page<WorkPostDTO> workPostDTOs = workPostService.convertToDTOPage(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }
    
    @GetMapping("/implementation/period")
    @Operation(summary = "Listar postos para implantação", description = "Retorna postos que serão implantados em um período")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Postos listados com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<WorkPostDTO>> getWorkPostsToBeImplemented(
            @Parameter(description = "Data inicial") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Data final") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<WorkPost> workPosts = workPostService.findPostsToBeImplementedBetween(startDate, endDate);
        List<WorkPostDTO> workPostDTOs = workPostService.convertToDTOList(workPosts);
        return ResponseEntity.ok(workPostDTOs);
    }
    
    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status do posto", description = "Atualiza apenas o status de um posto")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status atualizado com sucesso"),
        @ApiResponse(responseCode = "404", description = "Posto não encontrado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<WorkPostDTO> updateWorkPostStatus(
            @Parameter(description = "ID do posto") @PathVariable String id,
            @Parameter(description = "Novo status") @RequestParam WorkPostStatus status) {
        WorkPost workPost = workPostService.updateStatus(UUID.fromString(id), status);
        WorkPostDTO workPostDTO = workPostService.convertToDTO(workPost);
        return ResponseEntity.ok(workPostDTO);
    }

    @PatchMapping("/{id}/contract")
    @Operation(summary = "Vincular ou desvincular contrato do posto", description = "Atualiza apenas o contrato vinculado ao posto. Envie contractId para vincular ou omita para desvincular.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Contrato atualizado com sucesso"),
        @ApiResponse(responseCode = "404", description = "Posto ou contrato não encontrado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<WorkPostDTO> setWorkPostContract(
            @Parameter(description = "ID do posto") @PathVariable String id,
            @Parameter(description = "ID do contrato (omitir para desvincular)") @RequestParam(required = false) UUID contractId) {
        WorkPost workPost = workPostService.setContract(UUID.fromString(id), contractId);
        WorkPostDTO workPostDTO = workPostService.convertToDTO(workPost);
        return ResponseEntity.ok(workPostDTO);
    }
    
    @GetMapping("/stats/count")
    @Operation(summary = "Estatísticas de postos", description = "Retorna contadores de postos por status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Estatísticas retornadas com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<WorkPostStats> getWorkPostStats() {
        long emImplantacaoCount = workPostService.countByStatus(WorkPostStatus.EM_IMPLANTACAO);
        long ativoCount = workPostService.countByStatus(WorkPostStatus.ATIVO);
        long inativoCount = workPostService.countByStatus(WorkPostStatus.INATIVO);
        long suspensoCount = workPostService.countByStatus(WorkPostStatus.SUSPENSO);
        long canceladoCount = workPostService.countByStatus(WorkPostStatus.CANCELADO);
        long emAnaliseCount = workPostService.countByStatus(WorkPostStatus.EM_ANALISE);
        long pendenteCount = workPostService.countByStatus(WorkPostStatus.PENDENTE);
        
        WorkPostStats stats = new WorkPostStats(emImplantacaoCount, ativoCount, inativoCount, 
                                              suspensoCount, canceladoCount, emAnaliseCount, pendenteCount);
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/report/pdf")
    @Operation(summary = "Gerar relatório PDF de postos de trabalho", description = "Gera PDF com layout padrão do sistema (cabeçalho, gradiente, tabela, numeração de páginas)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "PDF gerado com sucesso"),
        @ApiResponse(responseCode = "403", description = "Acesso negado"),
        @ApiResponse(responseCode = "500", description = "Erro ao gerar relatório")
    })
    public ResponseEntity<byte[]> generateReportPdf(@RequestBody(required = false) WorkPostReportFilterDTO filters) {
        byte[] pdf = workPostReportService.generatePdf(filters);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "postos-de-trabalho.pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
    
    @GetMapping("/test")
    @Operation(summary = "Teste simples", description = "Endpoint de teste para debug")
    public ResponseEntity<String> test() {
        log.info("🔍 TESTE - Endpoint /test chamado");
        try {
            // Teste simples sem acessar o repositório
            log.info("✅ TESTE - Endpoint funcionando");
            return ResponseEntity.ok("OK - Endpoint funcionando");
        } catch (Exception e) {
            log.error("❌ TESTE - Erro: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
    
    @PostMapping("/test-create")
    @Operation(summary = "Teste criação sem autenticação", description = "Endpoint de teste para criação de posto")
    @PreAuthorize("permitAll()")
    public ResponseEntity<String> testCreate(@RequestBody String rawData) {
        log.info("🔍 TESTE CREATE - Dados recebidos (raw): {}", rawData);
        try {
            // Tentar deserializar manualmente
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
            
            WorkPostDTO workPostDTO = mapper.readValue(rawData, WorkPostDTO.class);
            log.info("✅ TESTE CREATE - Deserialização bem-sucedida: {}", workPostDTO.getPostCode());
            log.info("🔍 TESTE CREATE - shiftStart: {} (tipo: {})", workPostDTO.getShiftStart(), workPostDTO.getShiftStart() != null ? workPostDTO.getShiftStart().getClass().getSimpleName() : "null");
            log.info("🔍 TESTE CREATE - shiftEnd: {} (tipo: {})", workPostDTO.getShiftEnd(), workPostDTO.getShiftEnd() != null ? workPostDTO.getShiftEnd().getClass().getSimpleName() : "null");
            
            // Tentar criar o posto
            WorkPost workPost = workPostService.createWorkPost(workPostDTO);
            log.info("✅ TESTE CREATE - Posto criado com sucesso: {}", workPost.getId());
            return ResponseEntity.ok("Posto criado com sucesso: " + workPost.getId());
        } catch (Exception e) {
            log.error("❌ TESTE CREATE - Erro: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage() + " - " + e.getClass().getSimpleName());
        }
    }
    
    /*
    @GetMapping("/test-clients")
    @Operation(summary = "Listar clientes para teste", description = "Endpoint para listar clientes disponíveis")
    @PreAuthorize("permitAll()")
    public ResponseEntity<String> testClients() {
        try {
            var pageable = Pageable.unpaged();
            var clientsPage = clientService.getAllClients(pageable);
            StringBuilder result = new StringBuilder("Clientes disponíveis:\n");
            for (var client : clientsPage.getContent()) {
                result.append("- ID: ").append(client.getId()).append(", Nome: ").append(client.getName()).append("\n");
            }
            return ResponseEntity.ok(result.toString());
        } catch (Exception e) {
            log.error("❌ TESTE CLIENTS - Erro: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Erro: " + e.getMessage());
        }
    }
    */
    
    @GetMapping("/debug")
    @Operation(summary = "Debug detalhado", description = "Endpoint de debug para identificar problemas")
    public ResponseEntity<String> debug() {
        log.info("🔍 DEBUG - Endpoint /debug chamado");
        try {
            // Teste 1: Verificar se o service está funcionando
            log.info("🔍 DEBUG - Teste 1: Verificando service");
            
            // Teste 2: Verificar se o repository está funcionando
            log.info("🔍 DEBUG - Teste 2: Verificando repository");
            long count = workPostRepository.count();
            log.info("✅ DEBUG - Total de postos no banco: {}", count);
            
            // Teste 3: Verificar se consegue buscar um registro
            log.info("🔍 DEBUG - Teste 3: Verificando busca de registros");
            List<WorkPost> workPosts = workPostRepository.findAll();
            log.info("✅ DEBUG - Encontrados {} postos", workPosts.size());
            
            // Teste 4: Verificar se consegue converter para DTO
            log.info("🔍 DEBUG - Teste 4: Verificando conversão para DTO");
            List<WorkPostDTO> workPostDTOs = workPostService.convertToDTOList(workPosts);
            log.info("✅ DEBUG - Convertidos {} DTOs", workPostDTOs.size());
            
            return ResponseEntity.ok(String.format("DEBUG OK - Total: %d, Encontrados: %d, DTOs: %d", count, workPosts.size(), workPostDTOs.size()));
            
        } catch (Exception e) {
            log.error("❌ DEBUG - Erro: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("DEBUG ERRO: " + e.getMessage() + " - " + e.getClass().getSimpleName());
        }
    }
    
    // Classe interna para estatísticas
    public static class WorkPostStats {
        private final long emImplantacao;
        private final long ativo;
        private final long inativo;
        private final long suspenso;
        private final long cancelado;
        private final long emAnalise;
        private final long pendente;
        
        public WorkPostStats(long emImplantacao, long ativo, long inativo, 
                           long suspenso, long cancelado, long emAnalise, long pendente) {
            this.emImplantacao = emImplantacao;
            this.ativo = ativo;
            this.inativo = inativo;
            this.suspenso = suspenso;
            this.cancelado = cancelado;
            this.emAnalise = emAnalise;
            this.pendente = pendente;
        }
        
        // Getters
        public long getEmImplantacao() { return emImplantacao; }
        public long getAtivo() { return ativo; }
        public long getInativo() { return inativo; }
        public long getSuspenso() { return suspenso; }
        public long getCancelado() { return cancelado; }
        public long getEmAnalise() { return emAnalise; }
        public long getPendente() { return pendente; }
    }
}