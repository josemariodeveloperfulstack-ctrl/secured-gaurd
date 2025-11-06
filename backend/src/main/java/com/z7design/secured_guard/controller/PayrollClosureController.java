package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.PayrollClosure;
import com.z7design.secured_guard.service.PayrollClosureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payroll-closures")
@RequiredArgsConstructor
@Slf4j
public class PayrollClosureController {

    private final PayrollClosureService payrollClosureService;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyAuthority('PAYROLL_MANAGE', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> generateClosure(@RequestBody Map<String, Object> request) {
        try {
            UUID employeeId = UUID.fromString((String) request.get("employeeId"));
            int month = (Integer) request.get("month");
            int year = (Integer) request.get("year");
            UUID closedById = UUID.fromString((String) request.get("closedById"));

            PayrollClosure closure = payrollClosureService.generateClosure(
                    employeeId, month, year, closedById);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Fechamento gerado com sucesso",
                    "data", closure
            ));

        } catch (Exception e) {
            log.error("Erro ao gerar fechamento: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/generate-batch")
    @PreAuthorize("hasAnyAuthority('PAYROLL_MANAGE', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> generateBatchClosures(@RequestBody Map<String, Object> request) {
        try {
            int month = (Integer) request.get("month");
            int year = (Integer) request.get("year");
            UUID closedById = UUID.fromString((String) request.get("closedById"));

            List<PayrollClosure> closures = payrollClosureService.generateBatchClosures(
                    month, year, closedById);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", String.format("%d fechamentos gerados com sucesso", closures.size()),
                    "data", closures,
                    "total", closures.size()
            ));

        } catch (Exception e) {
            log.error("Erro ao gerar fechamentos em lote: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyAuthority('PAYROLL_READ', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getClosuresByEmployee(
            @PathVariable UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<PayrollClosure> closures = payrollClosureService.getClosuresByEmployee(
                    employeeId, pageable);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", closures.getContent(),
                    "totalPages", closures.getTotalPages(),
                    "totalElements", closures.getTotalElements(),
                    "currentPage", closures.getNumber()
            ));
        } catch (Exception e) {
            log.error("Erro ao buscar fechamentos do funcionário: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/period")
    @PreAuthorize("hasAnyAuthority('PAYROLL_READ', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getClosuresByPeriod(
            @RequestParam int month,
            @RequestParam int year) {
        try {
            List<PayrollClosure> closures = payrollClosureService.getClosuresByPeriod(month, year);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", closures,
                    "total", closures.size()
            ));
        } catch (Exception e) {
            log.error("Erro ao buscar fechamentos por período: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PutMapping("/{closureId}/close")
    @PreAuthorize("hasAnyAuthority('PAYROLL_MANAGE', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> closeClosure(
            @PathVariable UUID closureId,
            @RequestBody Map<String, String> request) {
        try {
            UUID closedById = UUID.fromString(request.get("closedById"));
            PayrollClosure closure = payrollClosureService.closeClosure(closureId, closedById);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Fechamento finalizado com sucesso",
                    "data", closure
            ));
        } catch (Exception e) {
            log.error("Erro ao finalizar fechamento: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/{closureId}")
    @PreAuthorize("hasAnyAuthority('PAYROLL_READ', 'SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getClosureById(@PathVariable UUID closureId) {
        try {
            // Implementar quando necessário
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Endpoint em desenvolvimento"
            ));
        } catch (Exception e) {
            log.error("Erro ao buscar fechamento: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}

