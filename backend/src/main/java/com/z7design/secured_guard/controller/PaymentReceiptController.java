package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CreatePaymentReceiptDTO;
import com.z7design.secured_guard.dto.PaymentReceiptDTO;
import com.z7design.secured_guard.service.PaymentReceiptService;
import com.z7design.secured_guard.dto.ReceiptProcessingResponse;
import com.z7design.secured_guard.service.ReceiptProcessingService;
import com.z7design.secured_guard.util.AuthenticatedCpfResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "*")
@Slf4j
public class PaymentReceiptController {
    
    @Autowired
    private PaymentReceiptService paymentReceiptService;
    
    @Autowired
    private ReceiptProcessingService receiptProcessingService;
    
    @Autowired
    private AuthenticatedCpfResolver authenticatedCpfResolver;
    
    // Criar novo comprovante
    @PostMapping
    public ResponseEntity<PaymentReceiptDTO> createPaymentReceipt(@Valid @RequestBody CreatePaymentReceiptDTO createDTO) {
        try {
            PaymentReceiptDTO createdReceipt = paymentReceiptService.createPaymentReceipt(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdReceipt);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    // Buscar todos os comprovantes
    @GetMapping
    public ResponseEntity<List<PaymentReceiptDTO>> getAllPaymentReceipts(
            @RequestParam(required = false) String search) {
        try {
            // Se houver termo de busca, usar busca filtrada
            if (search != null && !search.trim().isEmpty() && search.trim().length() >= 4) {
                log.info("🔍 Buscando comprovantes com termo: '{}'", search);
                List<PaymentReceiptDTO> receipts = paymentReceiptService.search(search.trim());
                return ResponseEntity.ok(receipts);
            }
            
            log.info("🔍 Iniciando busca de todos os comprovantes...");
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isColaborador = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));
            
            List<PaymentReceiptDTO> receipts;
            if (isColaborador) {
                var resolvedCpf = authenticatedCpfResolver.resolve(auth);
                if (resolvedCpf.isEmpty()) {
                    log.warn("⚠️ Não foi possível determinar o CPF do colaborador {}", auth.getName());
                    receipts = Collections.emptyList();
                } else {
                    log.info("👤 Usuário colaborador, buscando comprovantes por CPF: {}", resolvedCpf.get());
                    receipts = paymentReceiptService.findByUserCpf(resolvedCpf.get());
                }
            } else {
                log.info("👑 Usuário admin, buscando todos os comprovantes");
                receipts = paymentReceiptService.findAll();
            }
            
            log.info("✅ Comprovantes encontrados: {} registros", receipts.size());
            return ResponseEntity.ok(receipts);
        } catch (Exception e) {
            log.error("❌ Erro ao buscar comprovantes: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Buscar comprovantes por ano e mês
    @GetMapping("/year/{year}/month/{month}")
    public ResponseEntity<List<PaymentReceiptDTO>> getPaymentReceiptsByYearAndMonth(
            @PathVariable Integer year, 
            @PathVariable Integer month) {
        try {
            List<PaymentReceiptDTO> receipts = paymentReceiptService.findByYearAndMonth(year, month);
            return ResponseEntity.ok(receipts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Buscar todos os anos únicos
    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getDistinctYears() {
        try {
            List<Integer> years = paymentReceiptService.findDistinctYears();
            return ResponseEntity.ok(years);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Buscar todos os meses únicos para um ano
    @GetMapping("/years/{year}/months")
    public ResponseEntity<List<Integer>> getDistinctMonthsByYear(@PathVariable Integer year) {
        try {
            List<Integer> months = paymentReceiptService.findDistinctMonthsByYear(year);
            return ResponseEntity.ok(months);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Contar total de comprovantes
    @GetMapping("/count")
    public ResponseEntity<Long> getTotalCount() {
        try {
            long count = paymentReceiptService.count();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Contar comprovantes processados hoje
    @GetMapping("/count/processed-today")
    public ResponseEntity<Long> getProcessedTodayCount() {
        try {
            long count = paymentReceiptService.countProcessedToday();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Download de comprovante
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable String id) {
        try {
            return paymentReceiptService.downloadReceiptFile(id);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Visualizar PDF do comprovante
    @GetMapping("/{id}/view")
    public ResponseEntity<byte[]> viewReceipt(@PathVariable String id) {
        try {
            return paymentReceiptService.viewReceiptFile(id);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Buscar arquivos processados
    @GetMapping("/processed-files")
    public ResponseEntity<List<PaymentReceiptDTO>> getProcessedFiles() {
        try {
            List<PaymentReceiptDTO> receipts = paymentReceiptService.findByStatus(com.z7design.secured_guard.model.PaymentReceiptStatus.PROCESSED);
            return ResponseEntity.ok(receipts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Upload de arquivo
    @PostMapping("/upload")
    public ResponseEntity<PaymentReceiptDTO> uploadPaymentReceipt(
            @RequestParam("file") MultipartFile file,
            @RequestParam("employeeName") String employeeName,
            @RequestParam("month") Integer month,
            @RequestParam("year") Integer year) {
        try {
            PaymentReceiptDTO receipt = paymentReceiptService.processUploadedFile(file, employeeName, month, year);
            return ResponseEntity.status(HttpStatus.CREATED).body(receipt);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
    // Processamento automático de comprovantes (NOVO ENDPOINT)
    @PostMapping("/process-automatic")
    public ResponseEntity<ReceiptProcessingResponse> processReceiptsAutomatic(@RequestParam("file") MultipartFile file) {
        try {
            // Validar arquivo
            if (file.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            
            String contentType = file.getContentType();
            if (contentType == null || !contentType.equals("application/pdf")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            
            // Processar arquivo automaticamente com resumo detalhado
            ReceiptProcessingResponse response = receiptProcessingService.processReceiptFileWithSummary(file);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Erro ao processar comprovantes: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Excluir comprovante individual
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePaymentReceipt(@PathVariable String id) {
        try {
            paymentReceiptService.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Excluir múltiplos comprovantes
    @PostMapping("/delete-multiple")
    public ResponseEntity<Map<String, Object>> deleteMultiplePaymentReceipts(@RequestBody Map<String, List<String>> body) {
        try {
            if (body == null) {
                log.warn("⚠️ Request body é nulo");
                Map<String, Object> result = new HashMap<>();
                result.put("deleted", 0);
                result.put("failed", 0);
                result.put("errors", List.of("Request body não pode ser nulo"));
                return ResponseEntity.badRequest().body(result);
            }
            
            List<String> idStrings = body.get("ids");
            if (idStrings == null || idStrings.isEmpty()) {
                log.info("📋 Lista de IDs vazia ou nula");
                Map<String, Object> result = new HashMap<>();
                result.put("deleted", 0);
                result.put("failed", 0);
                result.put("errors", List.of());
                return ResponseEntity.ok(result);
            }
            
            log.info("🗑️ Iniciando exclusão de {} comprovantes", idStrings.size());
            Map<String, Object> result = paymentReceiptService.deleteMultiplePaymentReceipts(idStrings);
            log.info("✅ Exclusão concluída: {} excluídos, {} falharam", result.get("deleted"), result.get("failed"));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("❌ Erro ao processar exclusão múltipla: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("deleted", 0);
            errorResult.put("failed", 0);
            String errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            errorResult.put("errors", List.of("Erro interno: " + errorMessage));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResult);
        }
    }
}
