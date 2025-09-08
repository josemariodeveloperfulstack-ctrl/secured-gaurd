package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.PaymentReceiptDTO;
import com.z7design.secured_guard.model.PaymentReceipt;
import com.z7design.secured_guard.service.PaymentReceiptService;
import com.z7design.secured_guard.service.DocumentService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Recibos", description = "Endpoints para gestão de recibos")
public class ReceiptController {
    
    private final PaymentReceiptService receiptService;
    private final DocumentService documentService;
    
    @GetMapping
    @Operation(summary = "Listar todos os recibos", description = "Retorna uma lista paginada de todos os recibos")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de recibos retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<PaymentReceiptDTO>> getAll(
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        return ResponseEntity.ok(receiptService.findAll(pageable));
    }
    
    @GetMapping("/all")
    @Operation(summary = "Listar todos os recibos (sem paginação)", description = "Retorna uma lista completa de todos os recibos")
    public ResponseEntity<List<PaymentReceiptDTO>> getAllWithoutPagination() {
        return ResponseEntity.ok(receiptService.findAll());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar recibo por ID", description = "Retorna um recibo específico pelo seu ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Recibo encontrado"),
            @ApiResponse(responseCode = "404", description = "Recibo não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<PaymentReceiptDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(receiptService.findById(UUID.fromString(id)));
    }
    
    @GetMapping("/client/{clientId}")
    @Operation(summary = "Buscar recibos por cliente", description = "Retorna recibos de um cliente específico")
    public ResponseEntity<List<PaymentReceiptDTO>> getByClient(@PathVariable String clientId) {
        return ResponseEntity.ok(receiptService.findByClientId(UUID.fromString(clientId)));
    }
    
    @GetMapping("/date/{date}")
    @Operation(summary = "Buscar recibos por data", description = "Retorna recibos de uma data específica")
    public ResponseEntity<List<PaymentReceiptDTO>> getByDate(@PathVariable String date) {
        LocalDate localDate = LocalDate.parse(date);
        return ResponseEntity.ok(receiptService.findByDate(localDate));
    }
    
    @GetMapping("/period")
    @Operation(summary = "Buscar recibos por período", description = "Retorna recibos em um período específico")
    public ResponseEntity<List<PaymentReceiptDTO>> getByPeriod(
            @RequestParam @Parameter(description = "Data inicial") LocalDate startDate,
            @RequestParam @Parameter(description = "Data final") LocalDate endDate) {
        return ResponseEntity.ok(receiptService.findByDateBetween(startDate, endDate));
    }
    
    @PostMapping
    @Operation(summary = "Criar novo recibo", description = "Cria um novo recibo no sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Recibo criado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<PaymentReceiptDTO> create(@Valid @RequestBody PaymentReceiptDTO receiptDTO) {
        PaymentReceipt receipt = receiptDTO.toEntity();
        PaymentReceiptDTO saved = receiptService.save(receipt);
        return ResponseEntity.status(201).body(saved);
    }
    
    @PostMapping("/upload")
    @Operation(summary = "Upload de recibos", description = "Faz upload de um arquivo PDF contendo recibos")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Recibos processados com sucesso"),
            @ApiResponse(responseCode = "400", description = "Arquivo inválido"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Map<String, Object>> uploadReceipts(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Arquivo vazio");
                error.put("message", "Por favor, selecione um arquivo válido");
                return ResponseEntity.badRequest().body(error);
            }
            
            if (!file.getContentType().equals("application/pdf")) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Tipo de arquivo inválido");
                error.put("message", "Apenas arquivos PDF são aceitos");
                return ResponseEntity.badRequest().body(error);
            }
            
            // Processar o arquivo PDF e extrair recibos
            List<PaymentReceiptDTO> processedReceipts = receiptService.processPdfReceipts(file);
            
            // Limpar arquivos temporários após processamento
            try {
                cleanupTempFiles();
            } catch (Exception e) {
                log.warn("Não foi possível limpar arquivos temporários: {}", e.getMessage());
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Recibos processados com sucesso");
            response.put("receipts", processedReceipts);
            response.put("count", processedReceipts.size());
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro ao processar arquivo");
            error.put("message", "Não foi possível ler o arquivo: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro interno");
            error.put("message", "Erro ao processar recibos: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    private void cleanupTempFiles() {
        try {
            // Limpar arquivos temporários de recibos
            java.nio.file.Path tempDir = java.nio.file.Paths.get("uploads", "receipts");
            if (java.nio.file.Files.exists(tempDir)) {
                java.nio.file.Files.list(tempDir)
                    .filter(path -> path.toString().endsWith(".pdf"))
                    .forEach(path -> {
                        try {
                            java.nio.file.Files.deleteIfExists(path);
                            log.info("Arquivo temporário deletado: {}", path);
                        } catch (Exception e) {
                            log.warn("Não foi possível deletar arquivo temporário {}: {}", path, e.getMessage());
                        }
                    });
            }
            
            // Limpar arquivos temporários de uploads
            java.nio.file.Path uploadsDir = java.nio.file.Paths.get("uploads");
            if (java.nio.file.Files.exists(uploadsDir)) {
                java.nio.file.Files.list(uploadsDir)
                    .filter(path -> path.toString().endsWith(".pdf") && path.getFileName().toString().contains("temp"))
                    .forEach(path -> {
                        try {
                            java.nio.file.Files.deleteIfExists(path);
                            log.info("Arquivo de upload temporário deletado: {}", path);
                        } catch (Exception e) {
                            log.warn("Não foi possível deletar arquivo de upload {}: {}", path, e.getMessage());
                        }
                    });
            }
        } catch (Exception e) {
            log.error("Erro ao limpar arquivos temporários: {}", e.getMessage());
        }
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar recibo", description = "Atualiza os dados de um recibo existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Recibo atualizado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Recibo não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<PaymentReceiptDTO> update(@PathVariable String id, @Valid @RequestBody PaymentReceiptDTO receiptDTO) {
        PaymentReceipt receipt = receiptDTO.toEntity();
        receipt.setId(UUID.fromString(id));
        PaymentReceiptDTO updated = receiptService.update(receipt);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir recibo", description = "Exclui um recibo do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Recibo excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Recibo não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> delete(@PathVariable String id) {
        receiptService.deleteById(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }
    
    @DeleteMapping("/batch")
    @Operation(summary = "Excluir múltiplos recibos", description = "Exclui múltiplos recibos do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Recibos excluídos com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Map<String, Object>> deleteBatch(@RequestBody List<String> receiptIds) {
        try {
            List<UUID> uuids = receiptIds.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());
            
            int deletedCount = receiptService.deleteByIds(uuids);
            
            Map<String, Object> response = new HashMap<>();
            response.put("deletedCount", deletedCount);
            response.put("message", deletedCount + " recibos excluídos com sucesso");
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "IDs inválidos fornecidos");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/employee/{employeeId}/month/{month}/year/{year}")
    @Operation(summary = "Buscar recibo por funcionário, mês e ano", description = "Retorna recibo de um funcionário específico em um período")
    public ResponseEntity<List<PaymentReceiptDTO>> getByEmployeeAndMonthYear(
            @PathVariable UUID employeeId,
            @PathVariable Integer month,
            @PathVariable Integer year) {
        return ResponseEntity.ok(receiptService.findByEmployeeAndMonthYear(employeeId, month, year));
    }
    
    @GetMapping("/month/{month}/year/{year}")
    @Operation(summary = "Buscar recibos por mês e ano", description = "Retorna todos os recibos de um período específico")
    public ResponseEntity<List<PaymentReceiptDTO>> getByMonthAndYear(
            @PathVariable Integer month,
            @PathVariable Integer year) {
        return ResponseEntity.ok(receiptService.findByMonthAndYear(month, year));
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar recibos por status", description = "Retorna recibos com um status específico")
    public ResponseEntity<List<PaymentReceiptDTO>> getByStatus(@PathVariable PaymentReceipt.ReceiptStatus status) {
        return ResponseEntity.ok(receiptService.findByStatus(status));
    }
    
    @GetMapping("/employee/search")
    @Operation(summary = "Buscar recibos por nome do funcionário", description = "Retorna recibos de funcionários com nome contendo o termo")
    public ResponseEntity<List<PaymentReceiptDTO>> getByEmployeeName(@RequestParam String employeeName) {
        return ResponseEntity.ok(receiptService.findByEmployeeNameContaining(employeeName));
    }
    
    @GetMapping("/{id}/view")
    @Operation(summary = "Visualizar arquivo do recibo", description = "Retorna o arquivo PDF do recibo para visualização")
    public ResponseEntity<Resource> viewReceipt(@PathVariable String id) {
        try {
            PaymentReceiptDTO receiptDTO = receiptService.findById(UUID.fromString(id));
            if (receiptDTO == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Buscar o arquivo do recibo
            String fileName = receiptDTO.getFileName();
            if (fileName == null || fileName.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            // Tentar diferentes caminhos possíveis
            Path filePath = findReceiptFile(fileName);
            
            if (filePath != null && java.nio.file.Files.exists(filePath)) {
                Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
                if (resource.exists() && resource.isReadable()) {
                    return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, 
                                "inline; filename=\"" + fileName + "\"")
                        .body(resource);
                }
            }
            
            return ResponseEntity.notFound().build();
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}/generate-pdf")
    @Operation(summary = "Gerar PDF do recibo com template", description = "Gera um PDF do recibo usando o template de comprovante de pagamento")
    public ResponseEntity<byte[]> generateReceiptPdf(@PathVariable String id) {
        try {
            PaymentReceiptDTO receiptDTO = receiptService.findById(UUID.fromString(id));
            if (receiptDTO == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Gerar dados do template
            Map<String, Object> templateData = generateTemplateData(receiptDTO);
            
            // Gerar PDF usando o DocumentService
            byte[] pdfBytes = documentService.generatePdf("payment-receipt.html", templateData);
            
            String fileName = String.format("comprovante_pagamento_%s_%s_%s.pdf", 
                receiptDTO.getEmployeeName().replaceAll("[^a-zA-Z0-9]", "_"),
                receiptDTO.getMonth(),
                receiptDTO.getYear());
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .body(pdfBytes);
                
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private Map<String, Object> generateTemplateData(PaymentReceiptDTO receipt) {
        Map<String, Object> data = new HashMap<>();
        
        // Dados extraídos do PDF - conta debitada (empresa)
        data.put("debitedAgency", receipt.getDebitedAgency() != null ? receipt.getDebitedAgency() : "0925");
        data.put("debitedAccount", receipt.getDebitedAccount() != null ? receipt.getDebitedAccount() : "98240 - 7");
        data.put("debitedName", receipt.getDebitedName() != null ? receipt.getDebitedName().toUpperCase() : "PROMOVER VIGILANCIA PATRIMONIA");
        
        // Dados extraídos do PDF - conta creditada (funcionário)
        data.put("creditedAgency", receipt.getCreditedAgency() != null ? receipt.getCreditedAgency() : "3804");
        data.put("creditedAccount", receipt.getCreditedAccount() != null ? receipt.getCreditedAccount() : "68007 - 6");
        data.put("creditedName", receipt.getCreditedName() != null ? receipt.getCreditedName().toUpperCase() : 
            (receipt.getEmployeeName() != null ? receipt.getEmployeeName().toUpperCase() : "FUNCIONARIO"));
        
        // Valor extraído do PDF
        data.put("amount", receipt.getNetSalary() != null ? 
            String.format("R$ %.2f", receipt.getNetSalary()).replace(".", ",") : "R$ 0,00");
        
        // Data e hora extraídas do PDF
        data.put("paymentDate", receipt.getTransferDate() != null ? receipt.getTransferDate() : 
            (receipt.getPaymentDate() != null ? 
                receipt.getPaymentDate().toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy")) : 
                java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy"))));
        
        data.put("paymentTime", receipt.getTransferTime() != null ? receipt.getTransferTime() : 
            (receipt.getPaymentDate() != null ? 
                receipt.getPaymentDate().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss")) : 
                java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"))));
        
        // Número de controle extraído do PDF
        data.put("controlNumber", receipt.getControlNumber() != null ? receipt.getControlNumber() : 
            String.valueOf(System.currentTimeMillis()).substring(0, 15));
        
        // Código de autenticação extraído do PDF
        data.put("authenticationCode", receipt.getAuthenticationCode() != null ? receipt.getAuthenticationCode() : 
            java.util.UUID.randomUUID().toString().replace("-", "").toUpperCase());
        
        // Informações do pagador baseadas nos dados extraídos
        data.put("payerInfo", String.format("Salário referente ao mês de %d/%d", receipt.getMonth(), receipt.getYear()));
        
        // Mês/Ano formatado
        data.put("monthYear", String.format("%d/%d", receipt.getMonth(), receipt.getYear()));
        
        // Banco extraído do PDF
        data.put("bankName", receipt.getBankName() != null ? receipt.getBankName() : "Itaú");
        
        // Identificação no extrato - usar dados reais extraídos
        String statementId = receipt.getStatementIdentification() != null ? receipt.getStatementIdentification() : 
            String.format("SISPAG SALARIOS %d/%d", receipt.getMonth(), receipt.getYear());
        data.put("statementIdentification", statementId);
        
        return data;
    }
    
    private Path findReceiptFile(String fileName) {
        // 1. Tentar no diretório de recibos
        Path filePath = java.nio.file.Paths.get("uploads/receipts", fileName);
        
        // 2. Se não existir, tentar no diretório de uploads
        if (!java.nio.file.Files.exists(filePath)) {
            filePath = java.nio.file.Paths.get("uploads", fileName);
        }
        
        // 3. Se não existir, tentar no diretório de holerites
        if (!java.nio.file.Files.exists(filePath)) {
            filePath = java.nio.file.Paths.get("backend/holerites", fileName);
        }
        
        // 4. Se não existir, tentar buscar nas subpastas de holerites
        if (!java.nio.file.Files.exists(filePath)) {
            Path holeritesDir = java.nio.file.Paths.get("backend/holerites");
            if (java.nio.file.Files.exists(holeritesDir)) {
                try {
                    for (Path subDir : java.nio.file.Files.list(holeritesDir).toList()) {
                        if (java.nio.file.Files.isDirectory(subDir)) {
                            Path potentialFile = subDir.resolve(fileName);
                            if (java.nio.file.Files.exists(potentialFile)) {
                                filePath = potentialFile;
                                break;
                            }
                        }
                    }
                } catch (Exception e) {
                    // Log do erro se necessário
                }
            }
        }
        
        return filePath;
    }
} 