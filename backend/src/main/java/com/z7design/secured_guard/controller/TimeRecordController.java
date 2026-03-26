package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.TimeRecord;
import com.z7design.secured_guard.service.TimeRecordReportService;
import com.z7design.secured_guard.service.TimeRecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/time-records")
@RequiredArgsConstructor
@Slf4j
public class TimeRecordController {

        private final TimeRecordService timeRecordService;
        private final TimeRecordReportService timeRecordReportService;

        @GetMapping("/report/{employeeId}")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'CLIENT_ADMIN', 'RH', 'DEPARTAMENTO_PESSOAL', 'ESTOQUE', 'ALMOXARIFADO')")
        public ResponseEntity<byte[]> generateMonthlyReport(
                        @PathVariable UUID employeeId,
                        @RequestParam int month,
                        @RequestParam int year) {
                try {
                        byte[] pdfBytes = timeRecordReportService.generateMonthlyReport(employeeId, month, year);

                        String filename = "espelho_ponto_" + employeeId + "_" + month + "_" + year + ".pdf";

                        return ResponseEntity.ok()
                                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                                        "attachment; filename=\"" + filename + "\"")
                                        .contentType(MediaType.APPLICATION_PDF)
                                        .body(pdfBytes);
                } catch (Exception e) {
                        log.error("Erro ao gerar relatório de ponto PDF: {}", e.getMessage(), e);
                        return ResponseEntity.internalServerError().build();
                }
        }

        @PostMapping("/register")
        @PreAuthorize("""
                        hasAnyAuthority('TIME_RECORD_CREATE', 'SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN',
                                        'ASSISTENTE_ADMINISTRATIVO', 'ANALISTA_SUPRIMENTOS', 'ROLE_ASSISTENTE_ADMINISTRATIVO', 'ROLE_ANALISTA_SUPRIMENTOS')
                        or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'COLABORADOR','VIGILANTE','SUPERVISOR','GESTOR','RH','DEPARTAMENTO_PESSOAL','ASSISTENTE_ADMINISTRATIVO','ANALISTA_SUPRIMENTOS', 'ESTOQUE', 'ALMOXARIFADO')
                        """)
        public ResponseEntity<?> registerTimeRecord(@RequestBody Map<String, Object> request) {
                try {
                        UUID employeeId = UUID.fromString((String) request.get("employeeId"));
                        TimeRecord.RecordType recordType = TimeRecord.RecordType.valueOf(
                                        (String) request.get("recordType"));
                        String qrCode = (String) request.get("qrCode");
                        String location = (String) request.get("location");
                        Double latitude = request.get("latitude") != null
                                        ? Double.valueOf(request.get("latitude").toString())
                                        : null;
                        Double longitude = request.get("longitude") != null
                                        ? Double.valueOf(request.get("longitude").toString())
                                        : null;
                        String ipAddress = (String) request.get("ipAddress");
                        String userAgent = (String) request.get("userAgent");

                        TimeRecord record = timeRecordService.registerTimeRecord(
                                        employeeId, recordType, qrCode, location, latitude, longitude,
                                        ipAddress, userAgent);

                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "message", "Ponto registrado com sucesso",
                                        "data", record));

                } catch (Exception e) {
                        log.error("Erro ao registrar ponto: {}", e.getMessage(), e);
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @GetMapping("/today/{employeeId}")
        @PreAuthorize("""
                        hasAnyAuthority('TIME_RECORD_READ', 'SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN',
                                        'ASSISTENTE_ADMINISTRATIVO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')
                        or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'COLABORADOR','VIGILANTE','SUPERVISOR','GESTOR','RH','DEPARTAMENTO_PESSOAL','ASSISTENTE_ADMINISTRATIVO', 'ESTOQUE', 'ALMOXARIFADO')
                        """)
        public ResponseEntity<?> getTodayRecords(@PathVariable UUID employeeId) {
                try {
                        List<TimeRecord> records = timeRecordService.getTodayRecords(employeeId);
                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "data", records));
                } catch (Exception e) {
                        log.error("Erro ao buscar registros do dia: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @GetMapping("/employee/{employeeId}")
        @PreAuthorize("isAuthenticated()")
        public ResponseEntity<?> getEmployeeRecords(
                        @PathVariable UUID employeeId,
                        @RequestParam(value = "page", defaultValue = "0") int page,
                        @RequestParam(value = "size", defaultValue = "20") int size) {
                try {
                        Pageable pageable = PageRequest.of(page, size);
                        Page<TimeRecord> records = timeRecordService.getRecordsByEmployee(employeeId, pageable);
                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "data", records.getContent(),
                                        "totalPages", records.getTotalPages(),
                                        "totalElements", records.getTotalElements(),
                                        "currentPage", records.getNumber()));
                } catch (Exception e) {
                        log.error("Erro ao buscar registros do funcionário: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @GetMapping("/period/{employeeId}")
        @PreAuthorize("""
                        hasAnyAuthority('TIME_RECORD_READ', 'SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN',
                                        'ASSISTENTE_ADMINISTRATIVO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')
                        or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'COLABORADOR','VIGILANTE','SUPERVISOR','GESTOR','RH','DEPARTAMENTO_PESSOAL','ASSISTENTE_ADMINISTRATIVO', 'ESTOQUE', 'ALMOXARIFADO')
                        """)
        public ResponseEntity<?> getRecordsByPeriod(
                        @PathVariable UUID employeeId,
                        @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
                try {
                        List<TimeRecord> records = timeRecordService.getRecordsByPeriod(
                                        employeeId, startDate, endDate);
                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "data", records));
                } catch (Exception e) {
                        log.error("Erro ao buscar registros por período: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @GetMapping("/next-record-type/{employeeId}")
        @PreAuthorize("""
                        hasAnyAuthority('TIME_RECORD_READ', 'SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN',
                                        'ASSISTENTE_ADMINISTRATIVO', 'ROLE_ASSISTENTE_ADMINISTRATIVO')
                        or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'COLABORADOR','VIGILANTE','SUPERVISOR','GESTOR','RH','DEPARTAMENTO_PESSOAL','ASSISTENTE_ADMINISTRATIVO', 'ESTOQUE', 'ALMOXARIFADO')
                        """)
        public ResponseEntity<?> getNextRecordType(@PathVariable UUID employeeId) {
                try {
                        TimeRecord.RecordType nextType = timeRecordService.getNextRecordType(employeeId);
                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "nextRecordType", nextType.name()));
                } catch (Exception e) {
                        log.error("Erro ao buscar próximo tipo de registro: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @GetMapping("/pending")
        @PreAuthorize("hasAnyAuthority('TIME_RECORD_MANAGE', 'SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
        public ResponseEntity<?> getPendingRecords(
                        @RequestParam(value = "page", defaultValue = "0") int page,
                        @RequestParam(value = "size", defaultValue = "20") int size) {
                try {
                        Pageable pageable = PageRequest.of(page, size);
                        Page<TimeRecord> records = timeRecordService.getPendingRecords(pageable);
                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "data", records.getContent(),
                                        "totalPages", records.getTotalPages(),
                                        "totalElements", records.getTotalElements()));
                } catch (Exception e) {
                        log.error("Erro ao buscar registros pendentes: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @PutMapping("/{recordId}/approve")
        @PreAuthorize("hasAnyAuthority('TIME_RECORD_MANAGE', 'SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
        public ResponseEntity<?> approveRecord(
                        @PathVariable UUID recordId,
                        @RequestBody Map<String, String> request,
                        @AuthenticationPrincipal UserDetails userDetails) {
                try {
                        UUID approverId = UUID.fromString(request.get("approverId"));
                        TimeRecord record = timeRecordService.approveRecord(recordId, approverId);
                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "message", "Registro aprovado com sucesso",
                                        "data", record));
                } catch (Exception e) {
                        log.error("Erro ao aprovar registro: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @PutMapping("/{recordId}/reject")
        @PreAuthorize("hasAnyAuthority('TIME_RECORD_MANAGE', 'SUPER_ADMIN', 'ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
        public ResponseEntity<?> rejectRecord(
                        @PathVariable UUID recordId,
                        @RequestBody Map<String, String> request) {
                try {
                        UUID approverId = UUID.fromString(request.get("approverId"));
                        String reason = request.get("reason");
                        TimeRecord record = timeRecordService.rejectRecord(recordId, approverId, reason);
                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "message", "Registro rejeitado com sucesso",
                                        "data", record));
                } catch (Exception e) {
                        log.error("Erro ao rejeitar registro: {}", e.getMessage());
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }

        @PostMapping("/manual/day")
        @PreAuthorize("""
                        hasAnyAuthority('TIME_RECORD_READ', 'TIME_RECORD_CREATE', 'TIME_RECORD_MANAGE', 'SUPER_ADMIN', 'ADMIN', 'RH', 'DEPARTAMENTO_PESSOAL',
                        'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_DEPARTAMENTO_PESSOAL')
                        """)
        public ResponseEntity<?> saveManualDay(@RequestBody Map<String, Object> request) {
                try {
                        UUID employeeId = UUID.fromString((String) request.get("employeeId"));
                        LocalDate date = LocalDate.parse((String) request.get("date"));
                        String entrada = (String) request.get("entrada");
                        String saidaAlmoco = (String) request.get("saidaAlmoco");
                        String retornoAlmoco = (String) request.get("retornoAlmoco");
                        String saida = (String) request.get("saida");

                        List<TimeRecord> saved = timeRecordService.saveManualDay(
                                        employeeId, date, entrada, saidaAlmoco, retornoAlmoco, saida);

                        return ResponseEntity.ok(Map.of(
                                        "success", true,
                                        "message", "Horários do dia salvos no banco de dados",
                                        "data", saved));
                } catch (Exception e) {
                        log.error("Erro ao salvar lançamento manual do dia: {}", e.getMessage(), e);
                        return ResponseEntity.badRequest().body(Map.of(
                                        "success", false,
                                        "error", e.getMessage()));
                }
        }
}
