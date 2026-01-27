package com.z7design.secured_guard.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.z7design.secured_guard.dto.CreateEmployeeCertificationRequest;
import com.z7design.secured_guard.dto.UpdateEmployeeCertificationRequest;
import com.z7design.secured_guard.dto.EmployeeCertificationResponse;
import com.z7design.secured_guard.model.EmployeeCertification;
import com.z7design.secured_guard.model.enums.CertificationStatus;
import com.z7design.secured_guard.service.EmployeeCertificationService;
import com.z7design.secured_guard.service.TrainingListStandardPdfService;
import com.z7design.secured_guard.dto.TrainingListReportRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import jakarta.validation.Valid;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employee-certifications")
@RequiredArgsConstructor
@Tag(name = "Certificações de Funcionários", description = "Endpoints para certificações/treinamentos concluídos.")
@SecurityRequirement(name = "bearerAuth")
public class EmployeeCertificationController {

    private final EmployeeCertificationService certificationService;
    private final TrainingListStandardPdfService trainingListPdfService;

    @Operation(summary = "Lista certificações com filtros")
    @GetMapping
    // @PreAuthorize("hasAuthority('HR_READ') or hasRole('SUPER_ADMIN') or
    // hasRole('ADMIN')") // Temporariamente removido para debug
    public ResponseEntity<List<EmployeeCertificationResponse>> find(
            @RequestParam(value = "employeeId", required = false) UUID employeeId,
            @RequestParam(value = "trainingId", required = false) UUID trainingId,
            @RequestParam(value = "status", required = false) CertificationStatus status,
            @RequestParam(value = "expiringBefore", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiringBefore) {

        if (employeeId == null && trainingId == null && status == null && expiringBefore == null) {
            return ResponseEntity.ok(certificationService.findAll());
        }

        List<EmployeeCertificationResponse> payload;
        if (employeeId != null && status != null) {
            payload = certificationService.findByEmployeeIdAndStatus(employeeId, status);
        } else if (employeeId != null) {
            payload = certificationService.findByEmployeeId(employeeId);
        } else if (trainingId != null) {
            payload = certificationService.findByTrainingId(trainingId);
        } else if (expiringBefore != null) {
            payload = certificationService.findExpiringSoon(expiringBefore);
        } else if (status != null) {
            payload = certificationService.findByStatus(status);
        } else {
            payload = certificationService.findAll();
        }

        return ResponseEntity.ok(payload);
    }

    @Operation(summary = "Cria certificação")
    @PostMapping
    @PreAuthorize("hasAuthority('HR_WRITE') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'DEPARTAMENTO_PESSOAL', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<EmployeeCertificationResponse> create(
            @Valid @RequestBody CreateEmployeeCertificationRequest request) {
        EmployeeCertification created = certificationService.create(request);
        EmployeeCertification loaded = certificationService.findById(created.getId());
        return ResponseEntity.ok(EmployeeCertificationResponse.fromEntity(loaded));
    }

    @Operation(summary = "Atualiza certificação")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_WRITE') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'DEPARTAMENTO_PESSOAL', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<EmployeeCertificationResponse> update(@PathVariable UUID id,
            @Valid @RequestBody UpdateEmployeeCertificationRequest request) {
        EmployeeCertification updated = certificationService.update(id, request);
        EmployeeCertification loaded = certificationService.findById(updated.getId());
        return ResponseEntity.ok(EmployeeCertificationResponse.fromEntity(loaded));
    }

    @Operation(summary = "Renova certificação")
    @PutMapping("/{id}/renew")
    @PreAuthorize("hasAuthority('HR_WRITE') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'DEPARTAMENTO_PESSOAL', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<EmployeeCertificationResponse> renew(@PathVariable UUID id,
            @RequestParam("expirationDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newExpirationDate) {
        EmployeeCertification renewed = certificationService.renew(id, newExpirationDate);
        EmployeeCertification loaded = certificationService.findById(renewed.getId());
        return ResponseEntity.ok(EmployeeCertificationResponse.fromEntity(loaded));
    }

    @Operation(summary = "Gera PDF da lista de treinamentos")
    @PostMapping("/list/pdf")
    public ResponseEntity<byte[]> generateListPdf(@RequestBody TrainingListReportRequest request) {
        byte[] pdf = trainingListPdfService.generatePdf(request);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "lista-treinamentos.pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdf);
    }

    @Operation(summary = "Cancela certificação")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_DELETE') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'DEPARTAMENTO_PESSOAL', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        certificationService.cancel(id);
        return ResponseEntity.noContent().build();
    }
}
