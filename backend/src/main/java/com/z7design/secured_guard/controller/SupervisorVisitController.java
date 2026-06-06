package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EmployeePresenceHistoryRow;
import com.z7design.secured_guard.dto.SupervisorVisitCheckinRequest;
import com.z7design.secured_guard.dto.SupervisorVisitReportRow;
import com.z7design.secured_guard.dto.SupervisorVisitResponse;
import com.z7design.secured_guard.service.SupervisorVisitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Visita do supervisor ao posto de trabalho.
 *
 * <ul>
 *   <li>{@code /preview} — confirma posto + funcionário + vínculo (sem gravar).</li>
 *   <li>{@code /checkin} — grava a visita com geolocalização e endereço.</li>
 *   <li>{@code /report} — relatório para a Gestão Operacional (com confirmação por escala).</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/supervisor-visits")
@RequiredArgsConstructor
@Tag(name = "Visitas do Supervisor", description = "Check-in em posto via QR Code e relatório de visitas")
public class SupervisorVisitController {

    private static final String VISIT_AUTHORITY =
        "hasAnyAuthority('VISITS_CREATE','VISITS_WRITE','VISITS_READ','SUPER_ADMIN','ADMIN') "
        + "or hasAnyRole('SUPERVISOR','SUPER_ADMIN','ADMIN','GESTOR','GESTOR_OPERACIONAL',"
        + "'GESTAO_SUPERVISAO','OPERACIONAL')";

    private final SupervisorVisitService supervisorVisitService;

    @PostMapping("/preview")
    @PreAuthorize(VISIT_AUTHORITY)
    @Operation(summary = "Confirmar posto + funcionário + vínculo (sem gravar)")
    public ResponseEntity<?> preview(@RequestBody SupervisorVisitCheckinRequest request) {
        try {
            SupervisorVisitResponse response = supervisorVisitService.preview(request);
            return ResponseEntity.ok(Map.of("success", true, "data", response));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro no preview da visita", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("success", false, "error", "Erro ao processar a visita."));
        }
    }

    @PostMapping("/checkin")
    @PreAuthorize(VISIT_AUTHORITY)
    @Operation(summary = "Gravar check-in da visita (geolocalização + endereço + vínculo)")
    public ResponseEntity<?> checkin(@RequestBody SupervisorVisitCheckinRequest request,
                                     Authentication authentication) {
        try {
            SupervisorVisitResponse response = supervisorVisitService.checkin(request, authentication);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Check-in registrado com sucesso.",
                "data", response));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao gravar check-in da visita", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("success", false, "error", "Erro ao registrar o check-in."));
        }
    }

    @GetMapping("/employee/{employeeId}/history")
    @PreAuthorize(VISIT_AUTHORITY + " or hasAnyAuthority('EMPLOYEES_READ','EMPLOYEES_WRITE')")
    @Operation(summary = "Histórico de confirmações de presença do funcionário")
    public ResponseEntity<?> employeeHistory(@PathVariable UUID employeeId) {
        try {
            List<EmployeePresenceHistoryRow> rows =
                supervisorVisitService.employeePresenceHistory(employeeId);
            return ResponseEntity.ok(Map.of("success", true, "data", rows, "total", rows.size()));
        } catch (Exception e) {
            log.error("Erro ao buscar histórico de presença do funcionário {}", employeeId, e);
            return ResponseEntity.internalServerError()
                .body(Map.of("success", false, "error", "Erro ao buscar o histórico de presença."));
        }
    }

    @GetMapping("/report")
    @PreAuthorize(VISIT_AUTHORITY)
    @Operation(summary = "Relatório de visitas do supervisor (Gestão Operacional)")
    public ResponseEntity<?> report(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) UUID supervisorId,
            @RequestParam(required = false) UUID workPostId) {
        try {
            List<SupervisorVisitReportRow> rows =
                supervisorVisitService.report(startDate, endDate, supervisorId, workPostId);
            return ResponseEntity.ok(Map.of("success", true, "data", rows, "total", rows.size()));
        } catch (Exception e) {
            log.error("Erro ao gerar relatório de visitas", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("success", false, "error", "Erro ao gerar o relatório."));
        }
    }
}
