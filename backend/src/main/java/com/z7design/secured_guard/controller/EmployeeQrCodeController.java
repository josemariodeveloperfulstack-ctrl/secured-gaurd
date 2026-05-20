package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EmployeeIdentificationDTO;
import com.z7design.secured_guard.service.EmployeeQrCodeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Endpoints relacionados ao QR Code do funcionário.
 *
 * <ul>
 *   <li>RH/Admin: gerar/regenerar/visualizar o crachá com QR.</li>
 *   <li>Supervisor: identificar o funcionário via QR escaneado OU fallback manual (CPF/Matrícula).</li>
 * </ul>
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Employee QR Code", description = "QR Code do funcionário (crachá e identificação na visita)")
public class EmployeeQrCodeController {

    private final EmployeeQrCodeService qrCodeService;

    /**
     * Retorna os dados completos para impressão do crachá (Nome, CPF, Cargo, Posto)
     * + o token do QR Code (gera se ainda não tiver). Acesso: RH/Admin/Gestor.
     */
    @PostMapping("/api/employees/{id}/qr-code")
    @PreAuthorize("hasAnyAuthority('EMPLOYEES_WRITE', 'EMPLOYEES_CREATE', 'SUPER_ADMIN', 'ADMIN', 'HR') "
        + "or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'GESTOR', 'RECURSOS_HUMANOS', 'DEPARTAMENTO_PESSOAL')")
    @Operation(summary = "Gerar/garantir token do QR Code do funcionário (idempotente)")
    public ResponseEntity<Map<String, Object>> ensureQrCode(
            @Parameter(description = "ID do funcionário") @PathVariable UUID id) {
        try {
            String token = qrCodeService.ensureToken(id);
            EmployeeIdentificationDTO card = qrCodeService.getCardData(id);
            return ResponseEntity.ok(Map.of(
                "token", token,
                "employee", card
            ));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Erro ao gerar QR Code para funcionário {}", id, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao gerar QR Code: " + e.getMessage()
            ));
        }
    }

    /**
     * Retorna a IMAGEM PNG do QR Code já com Nome/CPF/Cargo/Posto + token embutidos
     * (no payload JSON do QR). Usado pelo crachá impresso e pré-visualização na tela do RH.
     * Content-Type: image/png.
     */
    @GetMapping(value = "/api/employees/{id}/qr-code/image", produces = MediaType.IMAGE_PNG_VALUE)
    @PreAuthorize("hasAnyAuthority('EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'SUPER_ADMIN', 'ADMIN', 'HR') "
        + "or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'GESTOR', 'RECURSOS_HUMANOS', 'DEPARTAMENTO_PESSOAL')")
    @Operation(summary = "Imagem PNG do QR Code do funcionário (para crachá impresso)")
    public ResponseEntity<byte[]> getQrCodeImage(
            @Parameter(description = "ID do funcionário") @PathVariable UUID id) {
        try {
            byte[] png = qrCodeService.renderQrImage(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentLength(png.length);
            headers.set("Content-Disposition", "inline; filename=\"qr-funcionario-" + id + ".png\"");
            // Cache curto: o token raramente muda, mas se for regenerado precisamos refletir.
            headers.setCacheControl("private, max-age=60");
            return new ResponseEntity<>(png, headers, HttpStatus.OK);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            log.warn("QR Code não pode ser renderizado para funcionário {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            log.error("Erro ao renderizar QR Code para funcionário {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Lê o crachá de um funcionário (token já gerado + dados visíveis). Não cria nada.
     */
    @GetMapping("/api/employees/{id}/qr-code")
    @PreAuthorize("hasAnyAuthority('EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'SUPER_ADMIN', 'ADMIN', 'HR') "
        + "or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'GESTOR', 'RECURSOS_HUMANOS', 'DEPARTAMENTO_PESSOAL')")
    @Operation(summary = "Obter dados do crachá do funcionário (com token se já gerado)")
    public ResponseEntity<Map<String, Object>> getQrCode(
            @Parameter(description = "ID do funcionário") @PathVariable UUID id) {
        try {
            EmployeeIdentificationDTO card = qrCodeService.getCardData(id);
            // Não geramos token aqui — RH faz isso explicitamente via POST.
            return ResponseEntity.ok(Map.of("employee", card));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Invalida o token atual e gera um novo. Operação destrutiva — usar quando o crachá
     * foi perdido/roubado/comprometido. Acesso: RH/Admin apenas.
     */
    @PostMapping("/api/employees/{id}/qr-code/regenerate")
    @PreAuthorize("hasAnyAuthority('EMPLOYEES_WRITE', 'SUPER_ADMIN', 'ADMIN') "
        + "or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RH', 'RECURSOS_HUMANOS', 'DEPARTAMENTO_PESSOAL')")
    @Operation(summary = "Regenerar QR Code do funcionário (invalida o anterior)")
    public ResponseEntity<Map<String, Object>> regenerateQrCode(
            @Parameter(description = "ID do funcionário") @PathVariable UUID id) {
        try {
            String token = qrCodeService.regenerateToken(id);
            EmployeeIdentificationDTO card = qrCodeService.getCardData(id);
            return ResponseEntity.ok(Map.of(
                "token", token,
                "employee", card,
                "warning", "Token anterior foi invalidado. Imprima um novo crachá."
            ));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao regenerar QR Code para funcionário {}", id, e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Erro ao regenerar QR Code: " + e.getMessage()
            ));
        }
    }

    /**
     * Identifica o funcionário a partir de um valor lido pelo Supervisor:
     * token QR (caminho feliz), CPF, ou matrícula (fallbacks manuais).
     *
     * <p>Acesso: SUPERVISOR (e roles operacionais). Endpoint usado durante a visita ao posto.
     */
    @PostMapping("/api/supervisor/identify-employee")
    @PreAuthorize("hasAnyAuthority('VISITS_CREATE', 'VISITS_WRITE', 'EMPLOYEES_READ', 'SUPER_ADMIN', 'ADMIN') "
        + "or hasAnyRole('SUPERVISOR', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'OPERACIONAL')")
    @Operation(summary = "Identificar funcionário durante visita (QR, CPF ou matrícula)")
    public ResponseEntity<Map<String, Object>> identifyEmployee(
            @RequestBody Map<String, String> payload) {

        String value = payload != null ? payload.getOrDefault("value", "") : "";
        if (value == null || value.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Informe o valor lido do QR Code, CPF ou matrícula."
            ));
        }

        Optional<EmployeeIdentificationDTO> identified = qrCodeService.identify(value);
        if (identified.isEmpty()) {
            log.info("Identificação não encontrou funcionário (len={})", value.length());
            return ResponseEntity.status(404).body(Map.of(
                "success", false,
                "error", "Funcionário não encontrado. Verifique o QR Code, CPF ou matrícula."
            ));
        }

        EmployeeIdentificationDTO dto = identified.get();
        log.info("Funcionário identificado via {} → {} ({})", dto.getMatchedBy(), dto.getName(), dto.getId());
        return ResponseEntity.ok(Map.of(
            "success", true,
            "employee", dto
        ));
    }
}
