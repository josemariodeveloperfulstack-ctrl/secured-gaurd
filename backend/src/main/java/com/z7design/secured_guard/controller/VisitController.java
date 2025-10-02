package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CreateVisitDTO;
import com.z7design.secured_guard.dto.VisitDTO;
import com.z7design.secured_guard.model.enums.VisitStatus;
import com.z7design.secured_guard.service.VisitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Controle de Visitas", description = "Endpoints para gestão de visitas de supervisão")
public class VisitController {

    private final VisitService visitService;

    @GetMapping
    @Operation(summary = "Listar visitas", description = "Retorna uma lista paginada de visitas")
    public ResponseEntity<Page<VisitDTO>> getAllVisits(
            @Parameter(description = "Parâmetros de paginação") Pageable pageable) {
        log.info("GET /api/visits - Listando visitas");
        try {
            Page<VisitDTO> visits = visitService.findAll(pageable);
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            log.error("Erro ao buscar visitas, retornando página vazia: {}", e.getMessage(), e);
            // Retornar página vazia em caso de erro
            return ResponseEntity.ok(Page.empty(pageable));
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar visita por ID", description = "Retorna uma visita específica pelo ID")
    public ResponseEntity<VisitDTO> getVisitById(@PathVariable UUID id) {
        log.info("GET /api/visits/{} - Buscando visita", id);
        VisitDTO visit = visitService.findById(id);
        return ResponseEntity.ok(visit);
    }

    @GetMapping("/supervisor/{supervisorId}")
    @Operation(summary = "Buscar visitas por supervisor", description = "Retorna visitas de um supervisor específico")
    public ResponseEntity<Page<VisitDTO>> getVisitsBySupervisor(
            @PathVariable UUID supervisorId,
            Pageable pageable) {
        log.info("GET /api/visits/supervisor/{} - Buscando visitas do supervisor", supervisorId);
        Page<VisitDTO> visits = visitService.findBySupervisorId(supervisorId, pageable);
        return ResponseEntity.ok(visits);
    }

    @GetMapping("/date-range")
    @Operation(summary = "Buscar visitas por período", description = "Retorna visitas em um período específico")
    public ResponseEntity<Page<VisitDTO>> getVisitsByDateRange(
            @Parameter(description = "Data de início (YYYY-MM-DD)") 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Data de fim (YYYY-MM-DD)") 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        log.info("GET /api/visits/date-range - Buscando visitas entre {} e {}", startDate, endDate);
        Page<VisitDTO> visits = visitService.findByVisitDateBetween(startDate, endDate, pageable);
        return ResponseEntity.ok(visits);
    }

    @GetMapping("/today/scheduled")
    @Operation(summary = "Visitas agendadas para hoje", description = "Retorna visitas agendadas para o dia atual")
    public ResponseEntity<List<VisitDTO>> getScheduledVisitsForToday() {
        log.info("GET /api/visits/today/scheduled - Buscando visitas agendadas para hoje");
        List<VisitDTO> visits = visitService.findScheduledVisitsForToday();
        return ResponseEntity.ok(visits);
    }

    @GetMapping("/today/supervisor/{supervisorId}")
    @Operation(summary = "Visitas do supervisor para hoje", description = "Retorna visitas de um supervisor para o dia atual")
    public ResponseEntity<List<VisitDTO>> getSupervisorVisitsForToday(@PathVariable UUID supervisorId) {
        log.info("GET /api/visits/today/supervisor/{} - Buscando visitas do supervisor para hoje", supervisorId);
        List<VisitDTO> visits = visitService.findSupervisorVisitsForToday(supervisorId);
        return ResponseEntity.ok(visits);
    }

    @PostMapping
    @Operation(summary = "Criar nova visita", description = "Cria uma nova visita de supervisão")
    public ResponseEntity<VisitDTO> createVisit(
            @Valid @RequestBody CreateVisitDTO createVisitDTO,
            Authentication authentication) {
        log.info("POST /api/visits - Criando nova visita");
        String userEmail = authentication.getName();
        VisitDTO visit = visitService.create(createVisitDTO, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(visit);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar visita", description = "Atualiza uma visita existente")
    public ResponseEntity<VisitDTO> updateVisit(
            @PathVariable UUID id,
            @Valid @RequestBody CreateVisitDTO updateDTO,
            Authentication authentication) {
        log.info("PUT /api/visits/{} - Atualizando visita", id);
        String userEmail = authentication.getName();
        VisitDTO visit = visitService.update(id, updateDTO, userEmail);
        return ResponseEntity.ok(visit);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir visita", description = "Exclui uma visita")
    public ResponseEntity<Void> deleteVisit(@PathVariable UUID id) {
        log.info("DELETE /api/visits/{} - Excluindo visita", id);
        visitService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/upload-file")
    @Operation(summary = "Upload de arquivo", description = "Faz upload de um arquivo para a visita")
    public ResponseEntity<String> uploadFile(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        log.info("POST /api/visits/{}/upload-file - Upload de arquivo", id);
        String fileName = visitService.uploadFile(id, file);
        return ResponseEntity.ok(fileName);
    }

    @PostMapping("/{id}/upload-photo")
    @Operation(summary = "Upload de foto", description = "Faz upload de uma foto para a visita")
    public ResponseEntity<String> uploadPhoto(
            @PathVariable UUID id,
            @RequestParam("photo") MultipartFile photo) {
        log.info("POST /api/visits/{}/upload-photo - Upload de foto", id);
        String fileName = visitService.uploadPhoto(id, photo);
        return ResponseEntity.ok(fileName);
    }

    @GetMapping("/status")
    @Operation(summary = "Status de visitas", description = "Retorna todos os status disponíveis para visitas")
    public ResponseEntity<VisitStatus[]> getVisitStatuses() {
        log.info("GET /api/visits/status - Retornando status de visitas");
        return ResponseEntity.ok(VisitStatus.values());
    }
}