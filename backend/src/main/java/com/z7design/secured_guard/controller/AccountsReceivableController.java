package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.AccountsReceivableDTO;
import com.z7design.secured_guard.model.enums.ReceivableStatus;
import com.z7design.secured_guard.service.AccountsReceivableService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts-receivable")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Contas a Receber", description = "Endpoints para gestão de contas a receber")
public class AccountsReceivableController {
    
    private final AccountsReceivableService accountsReceivableService;
    
    @GetMapping
    @Operation(summary = "Listar todas as contas a receber", description = "Retorna uma lista paginada de todas as contas a receber")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de contas a receber retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Page<AccountsReceivableDTO>> getAll(
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        log.info("GET /api/accounts-receivable - Buscando todas as contas a receber");
        return ResponseEntity.ok(accountsReceivableService.getAllAccountsReceivable(pageable));
    }
    
    @GetMapping("/all")
    @Operation(summary = "Listar todas as contas a receber (sem paginação)", description = "Retorna uma lista completa de todas as contas a receber")
    public ResponseEntity<List<AccountsReceivableDTO>> getAllWithoutPagination() {
        log.info("GET /api/accounts-receivable/all - Buscando todas as contas a receber sem paginação");
        return ResponseEntity.ok(accountsReceivableService.getAllAccountsReceivable());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar conta a receber por ID", description = "Retorna uma conta a receber específica pelo seu ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Conta a receber encontrada"),
            @ApiResponse(responseCode = "404", description = "Conta a receber não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<AccountsReceivableDTO> getById(@PathVariable String id) {
        log.info("GET /api/accounts-receivable/{} - Buscando conta a receber por ID", id);
        return ResponseEntity.ok(accountsReceivableService.getAccountsReceivableById(UUID.fromString(id)));
    }
    
    @PostMapping
    @Operation(summary = "Criar nova conta a receber", description = "Cria uma nova conta a receber no sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Conta a receber criada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<AccountsReceivableDTO> create(@Valid @RequestBody AccountsReceivableDTO dto) {
        log.info("POST /api/accounts-receivable - Criando nova conta a receber");
        AccountsReceivableDTO saved = accountsReceivableService.createAccountsReceivable(dto);
        return ResponseEntity.status(201).body(saved);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar conta a receber", description = "Atualiza os dados de uma conta a receber existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Conta a receber atualizada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Conta a receber não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<AccountsReceivableDTO> update(@PathVariable String id, @Valid @RequestBody AccountsReceivableDTO dto) {
        log.info("PUT /api/accounts-receivable/{} - Atualizando conta a receber", id);
        AccountsReceivableDTO updated = accountsReceivableService.updateAccountsReceivable(UUID.fromString(id), dto);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir conta a receber", description = "Exclui uma conta a receber do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Conta a receber excluída com sucesso"),
            @ApiResponse(responseCode = "404", description = "Conta a receber não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> delete(@PathVariable String id) {
        log.info("DELETE /api/accounts-receivable/{} - Excluindo conta a receber", id);
        accountsReceivableService.deleteAccountsReceivable(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/client/{clientId}")
    @Operation(summary = "Buscar contas a receber por cliente", description = "Retorna todas as contas a receber de um cliente específico")
    public ResponseEntity<List<AccountsReceivableDTO>> getByClient(@PathVariable String clientId) {
        log.info("GET /api/accounts-receivable/client/{} - Buscando contas a receber por cliente", clientId);
        return ResponseEntity.ok(accountsReceivableService.getAccountsReceivableByClient(UUID.fromString(clientId)));
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar contas a receber por status", description = "Retorna todas as contas a receber com um status específico")
    public ResponseEntity<List<AccountsReceivableDTO>> getByStatus(@PathVariable ReceivableStatus status) {
        log.info("GET /api/accounts-receivable/status/{} - Buscando contas a receber por status", status);
        return ResponseEntity.ok(accountsReceivableService.getAccountsReceivableByStatus(status));
    }
    
    @GetMapping("/overdue")
    @Operation(summary = "Buscar contas a receber vencidas", description = "Retorna todas as contas a receber que estão vencidas")
    public ResponseEntity<List<AccountsReceivableDTO>> getOverdue() {
        log.info("GET /api/accounts-receivable/overdue - Buscando contas a receber vencidas");
        return ResponseEntity.ok(accountsReceivableService.getOverdueAccounts());
    }
    
    @GetMapping("/period")
    @Operation(summary = "Buscar contas a receber por período", description = "Retorna todas as contas a receber emitidas em um período específico")
    public ResponseEntity<List<AccountsReceivableDTO>> getByPeriod(
            @Parameter(description = "Data de início do período") 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Data de fim do período") 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("GET /api/accounts-receivable/period - Buscando contas a receber por período: {} a {}", startDate, endDate);
        return ResponseEntity.ok(accountsReceivableService.getAccountsReceivableByPeriod(startDate, endDate));
    }
    
    @GetMapping("/search/invoice-number")
    @Operation(summary = "Buscar números de fatura", description = "Retorna sugestões de números de fatura para autocomplete")
    public ResponseEntity<List<String>> searchInvoiceNumbers(
            @Parameter(description = "Termo de busca") 
            @RequestParam String term) {
        log.info("GET /api/accounts-receivable/search/invoice-number - Buscando números de fatura para termo: {}", term);
        return ResponseEntity.ok(accountsReceivableService.searchInvoiceNumbers(term));
    }
    
    @GetMapping("/search/measurement-number")
    @Operation(summary = "Buscar números de medição", description = "Retorna sugestões de números de medição para autocomplete")
    public ResponseEntity<List<String>> searchMeasurementNumbers(
            @Parameter(description = "Termo de busca") 
            @RequestParam String term) {
        log.info("GET /api/accounts-receivable/search/measurement-number - Buscando números de medição para termo: {}", term);
        return ResponseEntity.ok(accountsReceivableService.searchMeasurementNumbers(term));
    }
    
    @GetMapping("/search/categories")
    @Operation(summary = "Buscar categorias", description = "Retorna sugestões de categorias para autocomplete")
    public ResponseEntity<List<String>> searchCategories(
            @Parameter(description = "Termo de busca") 
            @RequestParam String term) {
        log.info("GET /api/accounts-receivable/search/categories - Buscando categorias para termo: {}", term);
        return ResponseEntity.ok(accountsReceivableService.searchCategories(term));
    }
    
    @GetMapping("/search/payment-methods")
    @Operation(summary = "Buscar formas de pagamento", description = "Retorna sugestões de formas de pagamento para autocomplete")
    public ResponseEntity<List<String>> searchPaymentMethods(
            @Parameter(description = "Termo de busca") 
            @RequestParam String term) {
        log.info("GET /api/accounts-receivable/search/payment-methods - Buscando formas de pagamento para termo: {}", term);
        return ResponseEntity.ok(accountsReceivableService.searchPaymentMethods(term));
    }
    
    @PutMapping("/{id}/mark-paid")
    @Operation(summary = "Marcar conta como paga", description = "Marca uma conta a receber como paga")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Conta a receber marcada como paga com sucesso"),
            @ApiResponse(responseCode = "404", description = "Conta a receber não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<AccountsReceivableDTO> markAsPaid(
            @PathVariable String id,
            @Parameter(description = "Data do pagamento") 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paymentDate) {
        log.info("PUT /api/accounts-receivable/{}/mark-paid - Marcando conta como paga", id);
        AccountsReceivableDTO updated = accountsReceivableService.markAsPaid(UUID.fromString(id), paymentDate);
        return ResponseEntity.ok(updated);
    }
    
    @PutMapping("/update-overdue-status")
    @Operation(summary = "Atualizar status de contas vencidas", description = "Atualiza o status de todas as contas que estão vencidas")
    public ResponseEntity<Void> updateOverdueStatus() {
        log.info("PUT /api/accounts-receivable/update-overdue-status - Atualizando status de contas vencidas");
        accountsReceivableService.updateOverdueStatus();
        return ResponseEntity.ok().build();
    }
}
