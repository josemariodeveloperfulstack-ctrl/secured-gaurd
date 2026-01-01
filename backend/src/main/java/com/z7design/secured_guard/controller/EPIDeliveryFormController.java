package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormDTO;
import com.z7design.secured_guard.service.EPIDeliveryFormService;
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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/epi-delivery-forms")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fichas de Entrega de EPI", description = "Endpoints para gestão de fichas de entrega de EPI")
@SecurityRequirement(name = "bearerAuth")
public class EPIDeliveryFormController {

    private final EPIDeliveryFormService epiDeliveryFormService;

    @Operation(summary = "Cria uma nova ficha de entrega de EPI")
    @PostMapping
    public ResponseEntity<EPIDeliveryFormDTO> create(
            @RequestBody CreateEPIDeliveryFormDTO dto,
            Authentication authentication) {
        log.info("📝 Recebendo requisição para criar ficha de entrega de EPI");
        
        UUID createdByUserId = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            // Aqui você precisaria buscar o UUID do usuário pelo username
            // Por enquanto, vamos deixar null
        }
        
        EPIDeliveryFormDTO created = epiDeliveryFormService.create(dto, createdByUserId);
        return ResponseEntity.ok(created);
    }

    @Operation(summary = "Busca uma ficha de entrega de EPI por ID")
    @GetMapping("/{id}")
    public ResponseEntity<EPIDeliveryFormDTO> findById(@PathVariable UUID id) {
        EPIDeliveryFormDTO form = epiDeliveryFormService.findById(id);
        return ResponseEntity.ok(form);
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
        
        Page<EPIDeliveryFormDTO> forms = epiDeliveryFormService.findByFilters(employeeId, companyId, startDate, endDate, pageable);
        return ResponseEntity.ok(forms);
    }

    @Operation(summary = "Busca fichas de entrega de EPI por funcionário")
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EPIDeliveryFormDTO>> findByEmployeeId(@PathVariable UUID employeeId) {
        List<EPIDeliveryFormDTO> forms = epiDeliveryFormService.findByEmployeeId(employeeId);
        return ResponseEntity.ok(forms);
    }

    @Operation(summary = "Busca fichas de entrega de EPI por empresa")
    @GetMapping("/company/{companyId}")
    public ResponseEntity<List<EPIDeliveryFormDTO>> findByCompanyId(@PathVariable UUID companyId) {
        List<EPIDeliveryFormDTO> forms = epiDeliveryFormService.findByCompanyId(companyId);
        return ResponseEntity.ok(forms);
    }

    @Operation(summary = "Deleta uma ficha de entrega de EPI")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        epiDeliveryFormService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

