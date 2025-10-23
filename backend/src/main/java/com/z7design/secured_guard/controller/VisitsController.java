package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.Visit;
import com.z7design.secured_guard.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visits")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class VisitsController {

    private final VisitRepository visitRepository;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('VISITS_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Page<Visit>> getAllVisits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "scheduledDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        try {
            log.info("Buscando visitas - página: {}, tamanho: {}", page, size);
            
            Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") 
                    ? Sort.Direction.ASC 
                    : Sort.Direction.DESC;
            
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
            Page<Visit> visits = visitRepository.findAll(pageable);
            
            log.info("Visitas encontradas: {}", visits.getTotalElements());
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            log.error("Erro ao buscar visitas", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('VISITS_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Visit> getVisitById(@PathVariable UUID id) {
        try {
            return visitRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Erro ao buscar visita por ID", e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('VISITS_CREATE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Visit> createVisit(@RequestBody Visit visit) {
        try {
            log.info("Criando nova visita");
            Visit savedVisit = visitRepository.save(visit);
            return ResponseEntity.status(201).body(savedVisit);
        } catch (Exception e) {
            log.error("Erro ao criar visita", e);
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('VISITS_UPDATE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Visit> updateVisit(@PathVariable UUID id, @RequestBody Visit visit) {
        try {
            if (!visitRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            
            visit.setId(id);
            Visit updatedVisit = visitRepository.save(visit);
            return ResponseEntity.ok(updatedVisit);
        } catch (Exception e) {
            log.error("Erro ao atualizar visita", e);
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('VISITS_DELETE', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Void> deleteVisit(@PathVariable UUID id) {
        try {
            if (!visitRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            visitRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao deletar visita", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/supervisor/{supervisorId}")
    @PreAuthorize("hasAnyAuthority('VISITS_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Page<Visit>> getVisitsBySupervisor(
            @PathVariable UUID supervisorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            log.info("Buscando visitas do supervisor: {}", supervisorId);
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "scheduledDate"));
            Page<Visit> visits = visitRepository.findBySupervisorId(supervisorId, pageable);
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            log.error("Erro ao buscar visitas do supervisor", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/date-range")
    @PreAuthorize("hasAnyAuthority('VISITS_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<Page<Visit>> getVisitsByDateRange(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            log.info("Buscando visitas entre {} e {}", startDate, endDate);
            Pageable pageable = PageRequest.of(page, size);
            // TODO: Implementar query com range de datas
            Page<Visit> visits = visitRepository.findAll(pageable);
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            log.error("Erro ao buscar visitas por data", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/today/scheduled")
    @PreAuthorize("hasAnyAuthority('VISITS_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<List<Visit>> getTodayScheduledVisits() {
        try {
            log.info("Buscando visitas agendadas para hoje");
            // TODO: Implementar query para visitas de hoje
            List<Visit> visits = visitRepository.findAll();
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            log.error("Erro ao buscar visitas de hoje", e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/today/supervisor/{supervisorId}")
    @PreAuthorize("hasAnyAuthority('VISITS_READ', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', 'SUPERVISOR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_GESTOR', 'ROLE_SUPERVISOR')")
    public ResponseEntity<List<Visit>> getTodayVisitsBySupervisor(@PathVariable UUID supervisorId) {
        try {
            log.info("Buscando visitas de hoje do supervisor: {}", supervisorId);
            // TODO: Implementar query específica
            List<Visit> visits = visitRepository.findBySupervisorId(supervisorId);
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            log.error("Erro ao buscar visitas de hoje do supervisor", e);
            return ResponseEntity.status(500).build();
        }
    }
}

