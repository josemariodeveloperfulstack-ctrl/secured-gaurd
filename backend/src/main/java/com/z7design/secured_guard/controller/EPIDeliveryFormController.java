package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ConfirmEpiReceiptRequestDTO;
import com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EpiConfirmationSendResponseDTO;
import com.z7design.secured_guard.dto.SendEpiConfirmationRequestDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.DocumentoGeradoPersistenceService;
import com.z7design.secured_guard.service.EPIDeliveryFormService;
import com.z7design.secured_guard.service.EPIDeliveryStandardPdfService;
import com.z7design.secured_guard.util.AuthenticatedCpfResolver;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/epi-delivery-forms")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fichas de Entrega de EPI", description = "Endpoints para gestão de fichas de entrega de EPI")
@SecurityRequirement(name = "bearerAuth")
public class EPIDeliveryFormController {

    private final EPIDeliveryFormService epiDeliveryFormService;
    private final EPIDeliveryStandardPdfService epiDeliveryPdfService;
    private final com.z7design.secured_guard.repository.UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthenticatedCpfResolver authenticatedCpfResolver;
    private final com.z7design.secured_guard.service.EPIDeliveryReportService epiDeliveryReportService;
    private final DocumentoGeradoPersistenceService persistenceService;

    @Operation(summary = "Exportar relatório analítico de EPIs para Excel")
    @GetMapping("/report/export")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) UUID sectorId,
            @RequestParam(required = false) String reportType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            log.info("📊 Exportando relatório de EPIs, tipo: {}", reportType);
            byte[] report = epiDeliveryReportService.generateAnalyticalReport(employeeId, companyId, sectorId, startDate, endDate, reportType);
            String fileName = "relatorio-epi-" + LocalDate.now() + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(report);
        } catch (Exception e) {
            log.error("❌ Erro ao exportar relatório de EPIs: {}", e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Exportar relatório analítico de EPIs para PDF")
    @GetMapping("/report/export-pdf")
    public ResponseEntity<byte[]> exportReportPdf(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) UUID sectorId,
            @RequestParam(required = false) String reportType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            log.info("📊 Exportando relatório de EPIs em PDF, tipo: {}", reportType);
            byte[] report = epiDeliveryReportService.generateAnalyticalReportPdf(employeeId, companyId, sectorId, startDate, endDate, reportType);
            String fileName = "relatorio-epi-" + LocalDate.now() + ".pdf";

            // Persiste apenas se for relatório de um funcionário específico.
            if (employeeId != null) {
                java.util.Map<String, Object> dados = new java.util.LinkedHashMap<>();
                if (reportType != null) dados.put("reportType", reportType);
                if (startDate != null) dados.put("startDate", startDate.toString());
                if (endDate != null) dados.put("endDate", endDate.toString());
                persistenceService.persistir(
                        employeeId,
                        TipoDocumentoGerado.EPI_DELIVERY,
                        report,
                        fileName,
                        dados);
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .body(report);
        } catch (Exception e) {
            log.error("❌ Erro ao exportar relatório de EPIs em PDF: {}", e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Cria uma nova ficha de entrega de EPI")
    @PostMapping
    public ResponseEntity<EPIDeliveryFormDTO> create(
            @RequestBody CreateEPIDeliveryFormDTO dto,
            Authentication authentication) {
        log.info("📝 Recebendo requisição para criar ficha de entrega de EPI");
        UUID createdByUserId = resolveUserId(authentication);
        EPIDeliveryFormDTO created = epiDeliveryFormService.create(dto, createdByUserId);
        return ResponseEntity.ok(created);
    }

    @Operation(summary = "Atualiza uma ficha de entrega de EPI")
    @PutMapping("/{id}")
    public ResponseEntity<EPIDeliveryFormDTO> update(
            @PathVariable UUID id,
            @RequestBody CreateEPIDeliveryFormDTO dto,
            Authentication authentication) {
        log.info("📝 Recebendo requisição para atualizar ficha de entrega de EPI: {}", id);
        UUID updatedByUserId = resolveUserId(authentication);
        EPIDeliveryFormDTO updated = epiDeliveryFormService.update(id, dto, updatedByUserId);
        return ResponseEntity.ok(updated);
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            return ((User) principal).getId();
        }
        try {
            String username = authentication.getName();
            return userRepository.findByUsername(username).map(User::getId).orElse(null);
        } catch (Exception e) {
            log.warn("Erro ao obter usuário: {}", e.getMessage());
            return null;
        }
    }

    @Operation(summary = "Busca uma ficha de entrega de EPI por ID")
    @GetMapping("/{id}")
    public ResponseEntity<EPIDeliveryFormDTO> findById(@PathVariable UUID id) {
        EPIDeliveryFormDTO form = epiDeliveryFormService.findById(id);
        return ResponseEntity.ok(form);
    }

    @Operation(summary = "Enviar confirmação de recebimento de EPI via WhatsApp (AUTO ou MANUAL)")
    @PostMapping("/{id}/send-whatsapp-confirmation")
    public ResponseEntity<EpiConfirmationSendResponseDTO> sendWhatsAppConfirmation(
            @PathVariable UUID id,
            @RequestBody SendEpiConfirmationRequestDTO request) {
        EpiConfirmationSendResponseDTO response = epiDeliveryFormService.sendWhatsAppConfirmation(
                id,
                request != null ? request.getMode() : "AUTO",
                request != null ? request.getFrontendBaseUrl() : null);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Confirmar recebimento com o código informado pelo funcionário")
    @PostMapping("/{id}/confirm-with-code")
    public ResponseEntity<EPIDeliveryFormDTO> confirmWithCode(
            @PathVariable UUID id,
            @RequestBody ConfirmEpiReceiptRequestDTO request,
            Authentication authentication) {
        UUID actingUserId = resolveUserId(authentication);
        EPIDeliveryFormDTO updated = epiDeliveryFormService.confirmWithCode(
                id,
                request != null ? request.getCode() : null,
                actingUserId);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Lista todas as fichas de entrega de EPI com paginação")
    @GetMapping
    public ResponseEntity<Page<EPIDeliveryFormDTO>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<EPIDeliveryFormDTO> forms = epiDeliveryFormService.findAll(pageable);
        return ResponseEntity.ok(forms);
    }

    @Operation(summary = "Busca fichas de entrega de EPI com filtros")
    @GetMapping("/search")
    public ResponseEntity<Page<EPIDeliveryFormDTO>> search(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("ASC") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<EPIDeliveryFormDTO> forms = epiDeliveryFormService.findByFilters(employeeId, companyId, startDate, endDate,
                pageable);
        return ResponseEntity.ok(forms);
    }

    @Operation(summary = "Lista fichas de EPI do funcionário autenticado",
            description = "Resolve o Employee vinculado ao JWT (userId/CPF) e retorna as fichas dele.")
    @GetMapping("/me")
    public ResponseEntity<List<EPIDeliveryFormDTO>> findMine() {
        Optional<UUID> employeeId = resolveAuthenticatedEmployeeId();
        if (employeeId.isEmpty()) {
            log.warn("⚠️ /epi-delivery-forms/me sem Employee associado ao usuário autenticado");
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(epiDeliveryFormService.findByEmployeeId(employeeId.get()));
    }

    @Operation(summary = "Funcionário autentica confirma o recebimento da própria ficha de EPI")
    @PostMapping("/{id}/confirm-own-receipt")
    public ResponseEntity<EPIDeliveryFormDTO> confirmOwnReceipt(
            @PathVariable UUID id,
            @RequestBody(required = false) ConfirmEpiReceiptRequestDTO request,
            Authentication authentication) {
        UUID employeeId = resolveAuthenticatedEmployeeId()
                .orElseThrow(() -> new com.z7design.secured_guard.exception.BusinessException(
                        "Funcionário não vinculado ao usuário autenticado. Peça ao RH para vincular seu usuário."));
        UUID actingUserId = resolveUserId(authentication);
        EPIDeliveryFormDTO updated = epiDeliveryFormService.confirmOwnReceipt(
                id,
                employeeId,
                request != null ? request.getCode() : null,
                actingUserId);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Busca fichas de entrega de EPI por funcionário")
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EPIDeliveryFormDTO>> findByEmployeeId(@PathVariable UUID employeeId) {
        // Compatibilidade: portal legado às vezes envia User.id; resolve para Employee.id
        UUID resolved = employeeRepository.findById(employeeId)
                .map(Employee::getId)
                .or(() -> employeeRepository.findByUserId(employeeId).map(Employee::getId))
                .orElse(employeeId);
        List<EPIDeliveryFormDTO> forms = epiDeliveryFormService.findByEmployeeId(resolved);
        return ResponseEntity.ok(forms);
    }

    private Optional<UUID> resolveAuthenticatedEmployeeId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        if (auth.getPrincipal() instanceof User principalUser && principalUser.getId() != null) {
            Optional<UUID> byUser = employeeRepository.findByUserId(principalUser.getId()).map(Employee::getId);
            if (byUser.isPresent()) {
                return byUser;
            }
        }
        Optional<UUID> byCpf = authenticatedCpfResolver.resolve(auth)
                .flatMap(employeeRepository::findByDocument)
                .map(Employee::getId);
        if (byCpf.isPresent()) {
            return byCpf;
        }
        String name = auth.getName();
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByUsername(name)
                .or(() -> userRepository.findByEmail(name))
                .map(User::getId)
                .flatMap(employeeRepository::findByUserId)
                .map(Employee::getId);
    }

    @Operation(summary = "Busca fichas de entrega de EPI por empresa")
    @GetMapping("/company/{companyId}")
    public ResponseEntity<List<EPIDeliveryFormDTO>> findByCompanyId(@PathVariable UUID companyId) {
        List<EPIDeliveryFormDTO> forms = epiDeliveryFormService.findByCompanyId(companyId);
        return ResponseEntity.ok(forms);
    }

    @Operation(summary = "Deleta uma ficha de entrega de EPI")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        UUID actingUserId = resolveUserId(authentication);
        epiDeliveryFormService.delete(id, actingUserId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Gerar PDF de uma ficha de entrega de EPI existente")
    @GetMapping("/{id}/generate-pdf")
    public ResponseEntity<byte[]> generatePdf(@PathVariable UUID id) {
        try {
            log.info("📄 Gerando PDF da ficha de entrega de EPI: {}", id);
            com.z7design.secured_guard.model.EPIDeliveryForm form = epiDeliveryFormService.findByIdEntity(id);
            byte[] pdf = epiDeliveryPdfService.generateEPIDeliveryPdfFromForm(form);
            String fileName = "ficha-entrega-epi-" + id + ".pdf";

            UUID employeeId = form.getEmployee() != null ? form.getEmployee().getId() : null;
            if (employeeId != null) {
                java.util.Map<String, Object> dados = new java.util.LinkedHashMap<>();
                dados.put("formId", id.toString());
                persistenceService.persistir(
                        employeeId,
                        TipoDocumentoGerado.EPI_DELIVERY,
                        pdf,
                        fileName,
                        dados);
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .body(pdf);
        } catch (Exception e) {
            log.error("❌ Erro ao gerar PDF da ficha de entrega de EPI {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Gerar PDF da ficha de entrega de EPI e salvar no banco", description = "Gera o PDF da ficha de entrega de EPI, salva o registro no banco e retorna o PDF")
    @PostMapping("/generate-pdf")
    public ResponseEntity<byte[]> generateAndSaveEPIDeliveryPdf(
            @RequestBody CreateEPIDeliveryFormDTO dto,
            Authentication authentication) {
        try {
            log.info("📄 Gerando PDF de ficha de entrega de EPI para funcionário: {}", dto.getEmployeeId());

            UUID createdByUserId = resolveUserId(authentication);
            if (createdByUserId == null) {
                log.warn("Usuário autenticado não resolvido ao gerar ficha EPI — baixa de estoque pode falhar.");
            }

            // Primeiro, salvar a ficha no banco
            EPIDeliveryFormDTO savedForm = epiDeliveryFormService.create(dto, createdByUserId);
            log.info("✅ Ficha de entrega de EPI salva no banco com ID: {}", savedForm.getId());

            // Buscar a ficha completa para gerar o PDF
            com.z7design.secured_guard.model.EPIDeliveryForm form = epiDeliveryFormService
                    .findByIdEntity(savedForm.getId());

            // Gerar PDF
            byte[] pdf = epiDeliveryPdfService.generateEPIDeliveryPdfFromForm(form);

            String fileName = "ficha-entrega-epi-" + savedForm.getId() + ".pdf";

            if (dto.getEmployeeId() != null) {
                java.util.Map<String, Object> dados = new java.util.LinkedHashMap<>();
                dados.put("formId", savedForm.getId().toString());
                persistenceService.persistir(
                        dto.getEmployeeId(),
                        TipoDocumentoGerado.EPI_DELIVERY,
                        pdf,
                        fileName,
                        dados);
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .body(pdf);
        } catch (Exception e) {
            log.error("❌ Erro ao gerar PDF de ficha de entrega de EPI: {}", e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Gerar Excel da ficha de entrega de EPI e salvar no banco", description = "Gera o Excel da ficha de entrega de EPI, salva o registro no banco e retorna o arquivo")
    @PostMapping("/generate-excel")
    public ResponseEntity<byte[]> generateAndSaveEPIDeliveryExcel(
            @RequestBody CreateEPIDeliveryFormDTO dto,
            Authentication authentication) {
        try {
            log.info("📊 Gerando Excel de ficha de entrega de EPI para funcionário: {}", dto.getEmployeeId());

            UUID createdByUserId = resolveUserId(authentication);

            EPIDeliveryFormDTO savedForm = epiDeliveryFormService.create(dto, createdByUserId);
            log.info("✅ Ficha de entrega de EPI salva no banco com ID: {}", savedForm.getId());

            com.z7design.secured_guard.model.EPIDeliveryForm form = epiDeliveryFormService
                    .findByIdEntity(savedForm.getId());

            byte[] excel = epiDeliveryPdfService.generateEPIDeliveryExcelFromForm(form);

            String fileName = "ficha-entrega-epi-" + savedForm.getId() + ".xlsx";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_TYPE,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(excel);
        } catch (Exception e) {
            log.error("❌ Erro ao gerar Excel de ficha de entrega de EPI: {}", e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(summary = "Gerar PDF em branco da ficha de entrega de EPI (Manual)", description = "Se employeeId for informado, os dados do funcionário (nome, função, CPF, RG, admissão, demissão) são preenchidos na ficha.")
    @GetMapping("/generate-blank-pdf")
    public ResponseEntity<byte[]> generateBlankPdf(
            @RequestParam UUID companyId,
            @RequestParam(required = false) UUID employeeId) {
        try {
            log.info("📄 Gerando PDF em branco da ficha de entrega de EPI para empresa: {}, funcionário: {}", companyId, employeeId);
            byte[] pdf = epiDeliveryPdfService.generateBlankEPIDeliveryPdf(companyId, employeeId);
            String fileName = "ficha-entrega-epi-manual.pdf";

            if (employeeId != null) {
                java.util.Map<String, Object> dados = new java.util.LinkedHashMap<>();
                dados.put("blank", true);
                persistenceService.persistir(
                        employeeId,
                        TipoDocumentoGerado.EPI_DELIVERY,
                        pdf,
                        fileName,
                        dados);
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .body(pdf);
        } catch (Exception e) {
            log.error("❌ Erro ao gerar PDF em branco de ficha de entrega de EPI: {}", e.getMessage(), e);
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
