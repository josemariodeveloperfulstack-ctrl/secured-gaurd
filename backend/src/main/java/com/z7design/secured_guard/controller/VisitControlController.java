package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.VisitControlDTO;
import com.z7design.secured_guard.dto.VisitControlStatsDTO;
import com.z7design.secured_guard.model.enums.VisitControlStatus;
import com.z7design.secured_guard.service.VisitControlService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/visit-controls")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class VisitControlController {

    private final VisitControlService visitControlService;

    @GetMapping
    public ResponseEntity<List<VisitControlDTO>> getAllVisitControls() {
        List<VisitControlDTO> visits = visitControlService.getAllVisitControls();
        return ResponseEntity.ok(visits);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VisitControlDTO> getVisitControlById(@PathVariable UUID id) {
        return visitControlService.getVisitControlById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/today")
    public ResponseEntity<List<VisitControlDTO>> getTodayVisits() {
        List<VisitControlDTO> visits = visitControlService.getTodayVisits();
        return ResponseEntity.ok(visits);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<VisitControlDTO>> getRecentVisits() {
        List<VisitControlDTO> visits = visitControlService.getRecentVisits();
        return ResponseEntity.ok(visits);
    }

    @GetMapping("/stats")
    public ResponseEntity<VisitControlStatsDTO> getVisitStats() {
        VisitControlStatsDTO stats = visitControlService.getVisitStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<VisitControlDTO>> getVisitsByStatus(@PathVariable VisitControlStatus status) {
        List<VisitControlDTO> visits = visitControlService.getVisitsByStatus(status);
        return ResponseEntity.ok(visits);
    }

    @GetMapping("/supervisor/{supervisorId}")
    public ResponseEntity<List<VisitControlDTO>> getVisitsBySupervisor(@PathVariable UUID supervisorId) {
        List<VisitControlDTO> visits = visitControlService.getVisitsBySupervisor(supervisorId);
        return ResponseEntity.ok(visits);
    }

    @PostMapping
    public ResponseEntity<VisitControlDTO> createVisitControl(@Valid @RequestBody VisitControlDTO dto) {
        VisitControlDTO created = visitControlService.createVisitControl(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VisitControlDTO> updateVisitControl(
            @PathVariable UUID id,
            @Valid @RequestBody VisitControlDTO dto) {
        VisitControlDTO updated = visitControlService.updateVisitControl(id, dto);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<VisitControlDTO> startVisit(@PathVariable UUID id) {
        VisitControlDTO updated = visitControlService.startVisit(id);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<VisitControlDTO> completeVisit(
            @PathVariable UUID id,
            @RequestParam(required = false) String findings,
            @RequestParam(required = false) Boolean isSuccessful) {
        VisitControlDTO updated = visitControlService.completeVisit(id, findings, isSuccessful);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVisitControl(@PathVariable UUID id) {
        visitControlService.deleteVisitControl(id);
        return ResponseEntity.noContent().build();
    }
}









