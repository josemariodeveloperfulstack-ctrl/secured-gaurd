package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CidSuggestionDTO;
import com.z7design.secured_guard.dto.MedicalDocumentDTO;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.MedicalDocumentType;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.MedicalDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/medical-documents")
@RequiredArgsConstructor
@Tag(name = "Gestão de Atestados", description = "Atestados, declarações, CAT e afastamentos médicos")
public class MedicalDocumentController {

    private final MedicalDocumentService medicalDocumentService;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Listar/pesquisar documentos médicos")
    public ResponseEntity<Page<MedicalDocumentDTO>> search(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) UUID companyId,
            @RequestParam(required = false) MedicalDocumentType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String cid,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(medicalDocumentService.search(
                employeeId, companyId, type, from, to, cid, search, pageable));
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Indicadores do módulo de atestados")
    public ResponseEntity<Map<String, Object>> dashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID companyId) {
        return ResponseEntity.ok(medicalDocumentService.dashboard(from, to, companyId));
    }

    @GetMapping("/cid/search")
    @Operation(summary = "Autocompletar CID (CID-10 local + CID-11 OMS quando configurado)")
    public ResponseEntity<List<CidSuggestionDTO>> searchCid(
            @RequestParam("q") String q,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(medicalDocumentService.searchCid(q, limit));
    }

    @GetMapping("/cid/{code:.+}")
    @Operation(summary = "Buscar descrição do CID")
    public ResponseEntity<Map<String, String>> lookupCid(@PathVariable String code) {
        String normalized = code == null ? "" : code.toUpperCase().replace(" ", "");
        return medicalDocumentService.lookupCidDescription(normalized)
                .map(desc -> ResponseEntity.ok(Map.of("cidCode", normalized, "cidDescription", desc)))
                .orElse(ResponseEntity.ok(Map.of("cidCode", normalized, "cidDescription", "")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalDocumentDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(medicalDocumentService.findById(id));
    }

    @GetMapping("/employee/{employeeId}/history")
    @Operation(summary = "Histórico médico do funcionário")
    public ResponseEntity<List<MedicalDocumentDTO>> history(@PathVariable UUID employeeId) {
        return ResponseEntity.ok(medicalDocumentService.historyByEmployee(employeeId));
    }

    @PostMapping
    public ResponseEntity<MedicalDocumentDTO> create(
            @RequestBody MedicalDocumentDTO dto,
            Authentication authentication) {
        return ResponseEntity.status(201).body(medicalDocumentService.create(dto, resolveUserId(authentication)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicalDocumentDTO> update(
            @PathVariable UUID id,
            @RequestBody MedicalDocumentDTO dto,
            Authentication authentication) {
        return ResponseEntity.ok(medicalDocumentService.update(id, dto, resolveUserId(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        medicalDocumentService.delete(id, resolveUserId(authentication));
        return ResponseEntity.noContent().build();
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
