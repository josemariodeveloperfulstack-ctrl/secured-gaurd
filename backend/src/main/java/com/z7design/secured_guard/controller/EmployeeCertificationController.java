package com.z7design.secured_guard.controller;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
import com.z7design.secured_guard.dto.CertificationStatsResponse;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EmployeeCertification;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.CertificationStatus;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.EmployeeCertificationService;
import com.z7design.secured_guard.service.TrainingListStandardPdfService;
import com.z7design.secured_guard.util.AuthenticatedCpfResolver;
import com.z7design.secured_guard.dto.TrainingListReportRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import jakarta.validation.Valid;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/employee-certifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Certificações de Funcionários", description = "Endpoints para certificações/treinamentos concluídos.")
@SecurityRequirement(name = "bearerAuth")
public class EmployeeCertificationController {

    private static final String READ_ALL_AUTHORITY = "hasAnyAuthority('HR_READ','REPORTS_READ') or hasAnyRole("
            + "'SUPER_ADMIN','ADMIN','GESTOR','RH','DEPARTAMENTO_PESSOAL','AUDITOR',"
            + "'ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_GESTOR','ROLE_RH','ROLE_DEPARTAMENTO_PESSOAL','ROLE_AUDITOR'"
            + ")";

    // Endpoints "/me" são acessíveis a qualquer usuário autenticado: cada um vê apenas
    // o que é seu. A segurança real é feita pela resolução do Employee a partir do JWT.
    private static final String READ_SELF_AUTHORITY = "isAuthenticated()";

    private final EmployeeCertificationService certificationService;
    private final TrainingListStandardPdfService trainingListPdfService;
    private final com.z7design.secured_guard.service.NR06CertificatePdfService nr06CertificatePdfService;
    private final AuthenticatedCpfResolver authenticatedCpfResolver;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    @Operation(summary = "Lista certificações com filtros (RH/DP/Admin ou próprio funcionário)")
    @GetMapping
    public ResponseEntity<List<EmployeeCertificationResponse>> find(
            @RequestParam(value = "employeeId", required = false) UUID employeeId,
            @RequestParam(value = "trainingId", required = false) UUID trainingId,
            @RequestParam(value = "status", required = false) CertificationStatus status,
            @RequestParam(value = "expiringBefore", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiringBefore) {

        if (!canReadCertifications(employeeId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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

    @Operation(summary = "Gera Certificado NR-06 em PDF para a certificação")
    @GetMapping("/{id}/nr06-pdf")
    public ResponseEntity<byte[]> generateNr06PdfByCertification(@PathVariable UUID id) {
        EmployeeCertification cert = certificationService.findById(id);
        if (cert == null || cert.getEmployee() == null) {
            return ResponseEntity.notFound().build();
        }
        byte[] pdf = nr06CertificatePdfService.generateCertificatePdf(cert.getEmployee());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "certificado-nr06-" + cert.getEmployee().getName().replaceAll("[^a-zA-Z0-9]", "_") + ".pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdf);
    }

    @Operation(summary = "Gera Certificado NR-06 em PDF pelo ID do funcionário")
    @GetMapping("/employee/{employeeId}/nr06-pdf")
    public ResponseEntity<byte[]> generateNr06PdfByEmployee(@PathVariable UUID employeeId) {
        byte[] pdf = nr06CertificatePdfService.generateCertificatePdf(employeeId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "certificado-nr06-" + employeeId + ".pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdf);
    }

    @Operation(summary = "Busca estatísticas globais das certificações (RH/DP/Admin)")
    @GetMapping("/stats")
    @PreAuthorize(READ_ALL_AUTHORITY)
    public ResponseEntity<CertificationStatsResponse> getStats() {
        return ResponseEntity.ok(certificationService.getStats());
    }

    @Operation(summary = "Lista certificações do usuário autenticado",
            description = "Retorna apenas as certificações do funcionário associado ao usuário logado.")
    @GetMapping("/me")
    @PreAuthorize(READ_SELF_AUTHORITY)
    public ResponseEntity<List<EmployeeCertificationResponse>> findMine() {
        Optional<UUID> employeeId = resolveAuthenticatedEmployeeId();
        if (employeeId.isEmpty()) {
            log.warn("⚠️ /employee-certifications/me sem Employee associado ao usuário autenticado");
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(certificationService.findByEmployeeId(employeeId.get()));
    }

    @Operation(summary = "Estatísticas de certificações do usuário autenticado",
            description = "Retorna os contadores agregados apenas das certificações do funcionário logado.")
    @GetMapping("/me/stats")
    @PreAuthorize(READ_SELF_AUTHORITY)
    public ResponseEntity<CertificationStatsResponse> getMyStats() {
        Optional<UUID> employeeId = resolveAuthenticatedEmployeeId();
        if (employeeId.isEmpty()) {
            return ResponseEntity.ok(CertificationStatsResponse.builder()
                    .total(0).active(0).expired(0).pending(0).cancelled(0).expiringSoon(0)
                    .totalCost(0.0)
                    .byType(java.util.Map.of())
                    .byOrganization(java.util.Map.of())
                    .build());
        }
        return ResponseEntity.ok(certificationService.getStatsByEmployee(employeeId.get()));
    }

    /**
     * Resolve o {@link Employee} associado ao usuário autenticado a partir do JWT.
     * Estratégia (em ordem):
     * <ol>
     *   <li>Se o principal é {@link User}, busca Employee por userId.</li>
     *   <li>Resolve CPF via {@link AuthenticatedCpfResolver} e busca Employee por documento.</li>
     *   <li>Tenta resolver por username / email do usuário.</li>
     * </ol>
     */
    private boolean canReadCertifications(UUID employeeId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        boolean hasHrRead = auth.getAuthorities().stream().anyMatch(a -> {
            String role = a.getAuthority();
            return role.equals("HR_READ") || role.equals("REPORTS_READ")
                    || role.equals("ROLE_SUPER_ADMIN") || role.equals("ROLE_ADMIN")
                    || role.equals("ROLE_GESTOR") || role.equals("ROLE_RH")
                    || role.equals("ROLE_DEPARTAMENTO_PESSOAL") || role.equals("ROLE_AUDITOR")
                    || role.equals("SUPER_ADMIN") || role.equals("ADMIN")
                    || role.equals("GESTOR") || role.equals("RH")
                    || role.equals("DEPARTAMENTO_PESSOAL") || role.equals("AUDITOR");
        });
        if (hasHrRead) {
            return true;
        }
        if (employeeId == null) {
            return false;
        }
        Optional<UUID> ownEmployeeId = resolveAuthenticatedEmployeeId();
        if (ownEmployeeId.isPresent() && ownEmployeeId.get().equals(employeeId)) {
            return true;
        }
        // Portal legado pode enviar user.id; permitir se o funcionário estiver vinculado ao usuário logado
        return userRepository.findByUsername(auth.getName())
                .or(() -> userRepository.findByEmail(auth.getName()))
                .map(User::getId)
                .flatMap(employeeRepository::findByUserId)
                .map(emp -> emp.getId().equals(employeeId))
                .orElse(false);
    }

    private Optional<UUID> resolveAuthenticatedEmployeeId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }

        return employeeIdFromPrincipal(auth)
                .or(() -> employeeIdFromCpf(auth))
                .or(() -> employeeIdFromAuthName(auth.getName()));
    }

    private Optional<UUID> employeeIdFromPrincipal(Authentication auth) {
        if (auth.getPrincipal() instanceof User principalUser && principalUser.getId() != null) {
            return employeeRepository.findByUserId(principalUser.getId()).map(Employee::getId);
        }
        return Optional.empty();
    }

    private Optional<UUID> employeeIdFromCpf(Authentication auth) {
        return authenticatedCpfResolver.resolve(auth)
                .flatMap(employeeRepository::findByDocument)
                .map(Employee::getId);
    }

    private Optional<UUID> employeeIdFromAuthName(String name) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByUsername(name)
                .or(() -> userRepository.findByEmail(name))
                .map(User::getId)
                .filter(java.util.Objects::nonNull)
                .flatMap(employeeRepository::findByUserId)
                .map(Employee::getId);
    }

    @Operation(summary = "Cancela certificação")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('HR_DELETE') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'DEPARTAMENTO_PESSOAL', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_RH', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        certificationService.cancel(id);
        return ResponseEntity.noContent().build();
    }
}
