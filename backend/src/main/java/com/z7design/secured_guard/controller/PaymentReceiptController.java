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
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import jakarta.validation.Valid;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
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
    public ResponseEntity<PaymentReceiptDTO> createPaymentReceipt(
            @Valid @RequestBody CreatePaymentReceiptDTO createDTO) {
        try {
            PaymentReceiptDTO createdReceipt = paymentReceiptService.createPaymentReceipt(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdReceipt);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Buscar todos os comprovantes
    /**
     * Retorna apenas os comprovantes do usuário autenticado, resolvendo o CPF a
     * partir do token.
     * Útil para telas de "Meus Documentos" onde cada colaborador só pode ver seus
     * próprios comprovantes.
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PaymentReceiptDTO>> getMyPaymentReceipts() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                log.warn("⚠️ Tentativa de acesso a /api/receipts/me sem autenticação válida");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            var resolvedCpf = authenticatedCpfResolver.resolve(auth);
            if (resolvedCpf.isEmpty()) {
                log.warn("⚠️ Não foi possível determinar o CPF do usuário autenticado {}", auth.getName());
                return ResponseEntity.ok(Collections.emptyList());
            }

            String cpf = resolvedCpf.get();
            log.info("👤 Usuário autenticado, buscando comprovantes por CPF: {}", cpf);
            List<PaymentReceiptDTO> receipts = paymentReceiptService.findByUserCpf(cpf);
            log.info("✅ Comprovantes encontrados para CPF {}: {} registros", cpf, receipts.size());
            return ResponseEntity.ok(receipts);
        } catch (Exception e) {
            log.error("❌ Erro ao buscar comprovantes do usuário autenticado: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'RH', 'FINANCEIRO', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_FINANCEIRO', 'ROLE_COLABORADOR')")
    public ResponseEntity<List<PaymentReceiptDTO>> getAllPaymentReceipts(
            @RequestParam(value = "search", required = false) String search) {
        try {
            // Se houver termo de busca, usar busca filtrada
            if (search != null && !search.trim().isEmpty() && search.trim().length() >= 4) {
                log.info("🔍 Buscando comprovantes com termo: '{}'", search);
                List<PaymentReceiptDTO> receipts = paymentReceiptService.search(search.trim());
                return ResponseEntity.ok(receipts);
            }

            log.info("🔍 Iniciando busca de todos os comprovantes...");
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isColaborador = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_COLABORADOR"));

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

    // Download de comprovante individual
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable String id) {
        try {
            log.info("📥 Download individual de comprovante: {}", id);
            return paymentReceiptService.downloadReceiptFile(id);
        } catch (Exception e) {
            log.error("❌ Erro ao fazer download individual: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Download em lote de comprovantes (ZIP) - ALTA PERFORMANCE
    @PostMapping("/download-batch")
    public ResponseEntity<StreamingResponseBody> downloadBatch(
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            log.info("📦 Recebida requisição para download em lote");

            if (body == null) {
                log.warn("⚠️ Request body é nulo");
                return ResponseEntity.badRequest().build();
            }

            Object idsObj = body.get("ids");
            if (idsObj == null) {
                log.warn("⚠️ Campo 'ids' não encontrado no body");
                return ResponseEntity.badRequest().build();
            }

            // Converter para List<String>
            List<String> idStrings;
            try {
                if (idsObj instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Object> idsList = (List<Object>) idsObj;
                    idStrings = idsList.stream()
                            .map(id -> id != null ? id.toString() : null)
                            .filter(id -> id != null && !id.trim().isEmpty())
                            .collect(java.util.stream.Collectors.toList());
                } else {
                    log.warn("⚠️ Campo 'ids' não é uma lista: {}", idsObj.getClass().getSimpleName());
                    return ResponseEntity.badRequest().build();
                }
            } catch (Exception e) {
                log.error("❌ Erro ao converter lista de IDs: {}", e.getMessage(), e);
                return ResponseEntity.badRequest().build();
            }

            if (idStrings.isEmpty()) {
                log.info("📋 Lista de IDs vazia");
                return ResponseEntity.badRequest().build();
            }

            log.info("📦 Iniciando download em lote de {} comprovante(s)", idStrings.size());
            return paymentReceiptService.downloadBatch(idStrings);

        } catch (Exception e) {
            log.error("❌ Erro ao processar download em lote: {}", e.getMessage(), e);
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
            List<PaymentReceiptDTO> receipts = paymentReceiptService
                    .findByStatus(com.z7design.secured_guard.model.PaymentReceiptStatus.PROCESSED);
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
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'ADMIN', 'RH', 'FINANCEIRO', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_FINANCEIRO')")
    public ResponseEntity<ReceiptProcessingResponse> processReceiptsAutomatic(
            @RequestParam("file") MultipartFile file) {
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
    public ResponseEntity<Map<String, Object>> deletePaymentReceipt(@PathVariable String id) {
        try {
            log.info("🗑️ Excluindo comprovante individual: {}", id);

            if (id == null || id.trim().isEmpty()) {
                log.warn("⚠️ ID nulo ou vazio fornecido");
                Map<String, Object> error = new HashMap<>();
                error.put("error", "ID não pode ser nulo ou vazio");
                return ResponseEntity.badRequest().body(error);
            }

            paymentReceiptService.deleteById(id.trim());

            Map<String, Object> result = new HashMap<>();
            result.put("message", "Comprovante excluído com sucesso");
            result.put("id", id);

            log.info("✅ Comprovante excluído com sucesso: {}", id);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.error("❌ ID inválido: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", "ID inválido: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("❌ Erro ao excluir comprovante {}: {}", id, e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro ao excluir comprovante: "
                    + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // Excluir múltiplos comprovantes
    @PostMapping("/delete-multiple")
    public ResponseEntity<Map<String, Object>> deleteMultiplePaymentReceipts(
            @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();

        try {
            log.info("📥 Recebida requisição para excluir múltiplos comprovantes");

            if (body == null) {
                log.warn("⚠️ Request body é nulo");
                result.put("deleted", 0);
                result.put("failed", 0);
                result.put("errors", List.of("Request body não pode ser nulo"));
                return ResponseEntity.badRequest().body(result);
            }

            Object idsObj = body.get("ids");
            if (idsObj == null) {
                log.warn("⚠️ Campo 'ids' não encontrado no body");
                result.put("deleted", 0);
                result.put("failed", 0);
                result.put("errors", List.of("Campo 'ids' não encontrado no request body"));
                return ResponseEntity.badRequest().body(result);
            }

            // Converter para List<String>
            List<String> idStrings;
            try {
                if (idsObj instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Object> idsList = (List<Object>) idsObj;
                    idStrings = idsList.stream()
                            .map(id -> id != null ? id.toString() : null)
                            .filter(id -> id != null && !id.trim().isEmpty())
                            .collect(java.util.stream.Collectors.toList());
                } else {
                    log.warn("⚠️ Campo 'ids' não é uma lista: {}", idsObj.getClass().getSimpleName());
                    result.put("deleted", 0);
                    result.put("failed", 0);
                    result.put("errors", List.of("Campo 'ids' deve ser uma lista"));
                    return ResponseEntity.badRequest().body(result);
                }
            } catch (Exception e) {
                log.error("❌ Erro ao converter lista de IDs: {}", e.getMessage(), e);
                result.put("deleted", 0);
                result.put("failed", 0);
                result.put("errors", List.of("Erro ao processar lista de IDs: " + e.getMessage()));
                return ResponseEntity.badRequest().body(result);
            }

            if (idStrings.isEmpty()) {
                log.info("📋 Lista de IDs vazia após processamento");
                result.put("deleted", 0);
                result.put("failed", 0);
                result.put("errors", new ArrayList<>());
                return ResponseEntity.ok(result);
            }

            log.info("🗑️ Iniciando exclusão de {} comprovantes", idStrings.size());

            try {
                result = paymentReceiptService.deleteMultiplePaymentReceipts(idStrings);

                // Garantir que o resultado sempre tenha os campos necessários
                if (!result.containsKey("deleted")) {
                    result.put("deleted", 0);
                }
                if (!result.containsKey("failed")) {
                    result.put("failed", 0);
                }
                if (!result.containsKey("errors")) {
                    result.put("errors", new ArrayList<>());
                }

                log.info("✅ Exclusão concluída: {} excluídos, {} falharam", result.get("deleted"),
                        result.get("failed"));
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                log.error("❌ Erro ao executar exclusão múltipla: {}", e.getMessage(), e);
                result = new HashMap<>();
                result.put("deleted", 0);
                result.put("failed", idStrings.size());
                String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                result.put("errors", List.of("Erro ao excluir comprovantes: " + errorMsg));
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
            }

        } catch (org.springframework.http.converter.HttpMessageNotReadableException e) {
            log.error("❌ Erro ao ler request body: {}", e.getMessage(), e);
            result = new HashMap<>();
            result.put("deleted", 0);
            result.put("failed", 0);
            result.put("errors", List.of("Erro ao processar request body: " + e.getMessage()));
            return ResponseEntity.badRequest().body(result);
        } catch (Exception e) {
            log.error("❌ Erro inesperado ao processar exclusão múltipla: {}", e.getMessage(), e);
            result = new HashMap<>();
            result.put("deleted", 0);
            result.put("failed", 0);
            String errorMessage = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            result.put("errors", List.of("Erro interno: " + errorMessage));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }
}
