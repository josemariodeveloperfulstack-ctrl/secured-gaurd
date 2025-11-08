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

import com.z7design.secured_guard.dto.EmployeeCertificationResponse;
import com.z7design.secured_guard.model.EmployeeCertification;
import com.z7design.secured_guard.model.enums.CertificationStatus;
import com.z7design.secured_guard.service.EmployeeCertificationService;

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

    @Operation(summary = "Lista certificações com filtros")
    @GetMapping
    // @PreAuthorize("hasAuthority('HR_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')") // Temporariamente removido para debug
    public ResponseEntity<List<EmployeeCertificationResponse>> find(
            @RequestParam(value = "employeeId", required = false) UUID employeeId,
            @RequestParam(value = "trainingId", required = false) UUID trainingId,
            @RequestParam(value = "status", required = false) CertificationStatus status,
            @RequestParam(value = "expiringBefore", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiringBefore) {
        List<EmployeeCertification> results;
        if (employeeId != null && status != null) {
            results = certificationService.findByEmployeeIdAndStatus(employeeId, status);
        } else if (employeeId != null) {
            results = certificationService.findByEmployeeId(employeeId);
        } else if (trainingId != null) {
            results = certificationService.findByTrainingId(trainingId);
        } else if (expiringBefore != null) {
            results = certificationService.findExpiringSoon(expiringBefore);
        } else {
            results = certificationService.findAll();
        }

        List<EmployeeCertificationResponse> payload = results.stream()
                .map(EmployeeCertificationResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(payload);
    }

    @Operation(summary = "Cria certificação")
    @PostMapping
    @PreAuthorize("hasAuthority('HR_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<EmployeeCertificationResponse> create(@RequestBody EmployeeCertification certification) {
        EmployeeCertification created = certificationService.create(certification);
        EmployeeCertification loaded = certificationService.findById(created.getId());
        return ResponseEntity.ok(EmployeeCertificationResponse.fromEntity(loaded));
    }

    @Operation(summary = "Atualiza certificação")
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<EmployeeCertificationResponse> update(@PathVariable UUID id, @RequestBody EmployeeCertification certification) {
        EmployeeCertification updated = certificationService.update(id, certification);
        EmployeeCertification loaded = certificationService.findById(updated.getId());
        return ResponseEntity.ok(EmployeeCertificationResponse.fromEntity(loaded));
    }

    @Operation(summary = "Renova certificação")
    @PutMapping("/{id}/renew")
    @PreAuthorize("hasAuthority('HR_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<EmployeeCertificationResponse> renew(@PathVariable UUID id,
            @RequestParam("expirationDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newExpirationDate) {
        EmployeeCertification renewed = certificationService.renew(id, newExpirationDate);
        EmployeeCertification loaded = certificationService.findById(renewed.getId());
        return ResponseEntity.ok(EmployeeCertificationResponse.fromEntity(loaded));
    }

    @Operation(summary = "Cancela certificação")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_DELETE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        certificationService.cancel(id);
        return ResponseEntity.noContent().build();
    }
}


