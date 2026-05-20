package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.MeasurementBulletinDTO;
import com.z7design.secured_guard.dto.CalculationMemoryDTO;
import com.z7design.secured_guard.model.enums.MeasurementStatus;
import com.z7design.secured_guard.service.MeasurementService;
import com.z7design.secured_guard.service.MeasurementReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/measurements")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Boletins de Medição", description = "Endpoints para gestão de boletins de medição")
public class MeasurementController {
    
    private final MeasurementService measurementService;
    private final MeasurementReportService measurementReportService;
    
    @GetMapping
    @Operation(summary = "Listar todos os boletins", description = "Retorna uma lista paginada de todos os boletins de medição")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de boletins retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<MeasurementBulletinDTO>> getAll(
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        return ResponseEntity.ok(measurementService.getBulletinsWithFilters(null, null, null, null, null, null, pageable));
    }
    
    @GetMapping("/all")
    @Operation(summary = "Listar todos os boletins (sem paginação)", description = "Retorna uma lista completa de todos os boletins de medição")
    public ResponseEntity<List<MeasurementBulletinDTO>> getAllWithoutPagination() {
        return ResponseEntity.ok(measurementService.getAllBulletins());
    }
    
    @GetMapping("/test")
    @Operation(summary = "Teste de dados", description = "Endpoint para testar se há dados no banco")
    public ResponseEntity<Map<String, Object>> testData() {
        Map<String, Object> result = Map.of(
            "totalCount", measurementService.getBulletinCount(),
            "hasData", measurementService.getBulletinCount() > 0,
            "message", measurementService.getBulletinCount() > 0 ? "Dados encontrados" : "Nenhum dado encontrado"
        );
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}")
    @Operation(summary = "Buscar boletim por ID", description = "Retorna um boletim específico pelo seu ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Boletim encontrado"),
            @ApiResponse(responseCode = "404", description = "Boletim não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<MeasurementBulletinDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(measurementService.getBulletinById(UUID.fromString(id)));
    }
    
    @GetMapping("/contract/{contractId}")
    @Operation(summary = "Buscar boletins por contrato", description = "Retorna boletins de um contrato específico")
    public ResponseEntity<List<MeasurementBulletinDTO>> getByContract(@PathVariable String contractId) {
        return ResponseEntity.ok(measurementService.getBulletinsByContract(contractId));
    }
    
    @GetMapping("/date/{date}")
    @Operation(summary = "Buscar boletins por data", description = "Retorna boletins de uma data específica")
    public ResponseEntity<List<MeasurementBulletinDTO>> getByDate(@PathVariable String date) {
        LocalDate localDate = LocalDate.parse(date);
        // Usar método de filtros com período específico
        return ResponseEntity.ok(measurementService.getBulletinsWithFilters(null, null, null, null, localDate, localDate, Pageable.unpaged()).getContent());
    }
    
    @GetMapping("/period")
    @Operation(summary = "Buscar boletins por período", description = "Retorna boletins em um período específico")
    public ResponseEntity<List<MeasurementBulletinDTO>> getByPeriod(
            @RequestParam @Parameter(description = "Data inicial") LocalDate startDate,
            @RequestParam @Parameter(description = "Data final") LocalDate endDate) {
        return ResponseEntity.ok(measurementService.getBulletinsWithFilters(null, null, null, null, startDate, endDate, Pageable.unpaged()).getContent());
    }
    
    @PostMapping("/test")
    @Operation(summary = "Teste de criação", description = "Endpoint para testar criação de boletim")
    public ResponseEntity<Map<String, Object>> testCreate(@RequestBody Map<String, Object> data) {
        try {
            Map<String, Object> result = Map.of(
                "message", "Dados recebidos com sucesso",
                "receivedData", data,
                "timestamp", java.time.LocalDateTime.now()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = Map.of(
                "error", e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            );
            return ResponseEntity.status(500).body(error);
        }
    }
    
    @PostMapping
    @Operation(summary = "Criar novo boletim", description = "Cria um novo boletim de medição no sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Boletim criado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<MeasurementBulletinDTO> create(@RequestBody MeasurementBulletinDTO measurementDTO) {
        MeasurementBulletinDTO saved = measurementService.createBulletin(measurementDTO);
        return ResponseEntity.status(201).body(saved);
    }
    
    @PutMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}")
    @Operation(summary = "Atualizar boletim", description = "Atualiza os dados de um boletim existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Boletim atualizado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Boletim não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<MeasurementBulletinDTO> update(@PathVariable String id, @Valid @RequestBody MeasurementBulletinDTO measurementDTO) {
        try {
            log.info("Recebendo requisição para atualizar boletim {} com dados: {}", id, measurementDTO);
            MeasurementBulletinDTO updated = measurementService.updateBulletin(UUID.fromString(id), measurementDTO);
            log.info("Boletim {} atualizado com sucesso", id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Erro ao atualizar boletim {}: {}", id, e.getMessage(), e);
            throw e; // Re-throw para ser capturado pelo GlobalExceptionHandler
        }
    }
    
    @GetMapping("/search")
    @Operation(summary = "Buscar boletins com filtros", description = "Busca boletins aplicando filtros específicos")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Busca realizada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<MeasurementBulletinDTO>> searchWithFilters(
            @RequestParam(required = false) @Parameter(description = "Status do boletim") MeasurementStatus status,
            @RequestParam(required = false) @Parameter(description = "Número do contrato") String contractNumber,
            @RequestParam(required = false) @Parameter(description = "ID do cliente") String clientId,
            @RequestParam(required = false) @Parameter(description = "ID da unidade") String unitId,
            @RequestParam(required = false) @Parameter(description = "Data inicial do período") LocalDate periodStart,
            @RequestParam(required = false) @Parameter(description = "Data final do período") LocalDate periodEnd,
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        
        UUID clientUuid = clientId != null ? UUID.fromString(clientId) : null;
        UUID unitUuid = unitId != null ? UUID.fromString(unitId) : null;
        
        Page<MeasurementBulletinDTO> result = measurementService.getBulletinsWithFilters(
                status, contractNumber, clientUuid, unitUuid, periodStart, periodEnd, pageable);
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/search-text")
    @Operation(summary = "Buscar boletins por texto", description = "Busca boletins por termo de pesquisa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Busca realizada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<MeasurementBulletinDTO>> searchByText(
            @RequestParam @Parameter(description = "Termo de pesquisa") String searchTerm) {
        List<MeasurementBulletinDTO> result = measurementService.searchBulletins(searchTerm);
        return ResponseEntity.ok(result);
    }
    
    @PatchMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}/validate")
    @Operation(summary = "Validar boletim", description = "Valida um boletim de medição")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Boletim validado com sucesso"),
            @ApiResponse(responseCode = "404", description = "Boletim não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<MeasurementBulletinDTO> validate(
            @PathVariable String id,
            @RequestParam @Parameter(description = "Usuário que validou") String validatedBy,
            @RequestParam @Parameter(description = "Usuário que verificou") String checkedBy) {
        MeasurementBulletinDTO result = measurementService.validateBulletin(UUID.fromString(id), validatedBy, checkedBy);
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/report")
    @Operation(summary = "Gerar relatório", description = "Gera relatório de estatísticas dos boletins")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Map<String, Object>> getReport() {
        Map<String, Object> report = measurementService.getReport();
        return ResponseEntity.ok(report);
    }
    
    @PostMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}/calculation-memory")
    @Operation(summary = "Salvar memória de cálculo", description = "Salva a memória de cálculo de um boletim")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Memória salva com sucesso"),
            @ApiResponse(responseCode = "404", description = "Boletim não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<CalculationMemoryDTO> saveCalculationMemory(
            @PathVariable String id,
            @Valid @RequestBody CalculationMemoryDTO calculationMemoryDTO) {
        CalculationMemoryDTO result = measurementService.saveCalculationMemory(UUID.fromString(id), calculationMemoryDTO);
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/test-pdf")
    @Operation(summary = "Teste de geração de PDF", description = "Endpoint para testar geração de PDF simples")
    public ResponseEntity<byte[]> testPDF() {
        try {
            byte[] pdfBytes = measurementReportService.generateTestPDF();
            String fileName = "teste_pdf.pdf";
            
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro no teste de PDF: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}/pdf")
    @Operation(summary = "Gerar PDF do boletim", description = "Gera PDF de um boletim específico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "PDF gerado com sucesso"),
            @ApiResponse(responseCode = "404", description = "Boletim não encontrado"),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar PDF"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generatePDF(@PathVariable String id) {
        try {
            byte[] pdfBytes = measurementReportService.generateBulletinPDF(UUID.fromString(id));
            String fileName = "boletim_medicao_" + id + ".pdf";
            
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Erro ao gerar PDF para boletim {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }
    
    @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}/excel")
    @Operation(summary = "Gerar Excel do boletim", description = "Gera arquivo Excel de um boletim específico")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Excel gerado com sucesso"),
            @ApiResponse(responseCode = "404", description = "Boletim não encontrado"),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar Excel"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateExcel(@PathVariable String id) {
        try {
            byte[] excelBytes = measurementReportService.generateBulletinExcel(UUID.fromString(id));
            String fileName = "boletim_medicao_" + id + ".xlsx";
            
            return ResponseEntity.ok()
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .body(excelBytes);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    @PostMapping("/bulk/pdf")
    @Operation(summary = "Gerar PDFs em lote", description = "Gera PDFs de múltiplos boletins selecionados")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "PDFs gerados com sucesso"),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar PDFs"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateBulkPDF(@RequestBody List<String> bulletinIds) {
        try {
            List<UUID> uuids = bulletinIds.stream().map(UUID::fromString).toList();
            byte[] pdfBytes = measurementReportService.generateBulkBulletinsPDF(uuids);
            String fileName = "boletins_medicao_" + java.time.LocalDate.now() + ".pdf";
            
            return ResponseEntity.ok()
                    .header("Content-Type", "application/pdf")
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    @PostMapping("/bulk/excel")
    @Operation(summary = "Gerar Excel em lote", description = "Gera arquivo Excel com múltiplos boletins")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Excel gerado com sucesso"),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar Excel"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<byte[]> generateBulkExcel(@RequestBody List<String> bulletinIds) {
        try {
            List<UUID> uuids = bulletinIds.stream().map(UUID::fromString).toList();
            byte[] excelBytes = measurementReportService.generateBulkBulletinsExcel(uuids);
            String fileName = "boletins_medicao_" + java.time.LocalDate.now() + ".xlsx";
            
            return ResponseEntity.ok()
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .body(excelBytes);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}")
    @Operation(summary = "Excluir boletim", description = "Exclui um boletim do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Boletim excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Boletim não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> delete(@PathVariable String id) {
        measurementService.deleteBulletin(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }
}