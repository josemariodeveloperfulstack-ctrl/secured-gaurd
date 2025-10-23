// src/main/java/com/z7design/secured_guard/controller/VisitController.java
package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.VisitControl;
import com.z7design.secured_guard.repository.VisitControlRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/visit-controls")
@CrossOrigin(origins = "*")
public class VisitController {

    @Autowired
    private VisitControlRepository visitControlRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getVisitStats() {
        try {
            List<VisitControl> allVisits = visitControlRepository.findAll();
            LocalDate today = LocalDate.now();
            
            long todayVisits = allVisits.stream()
                .filter(visit -> visit.getScheduledAt() != null && 
                               visit.getScheduledAt().toLocalDate().equals(today))
                .count();
            
            long completedVisits = allVisits.stream()
                .filter(visit -> visit.getStatus() == VisitControl.VisitStatus.COMPLETED)
                .count();
            
            long pendingVisits = allVisits.stream()
                .filter(visit -> visit.getStatus() == VisitControl.VisitStatus.SCHEDULED)
                .count();
            
            long inProgressVisits = allVisits.stream()
                .filter(visit -> visit.getStatus() == VisitControl.VisitStatus.IN_PROGRESS)
                .count();
            
            // Calcular taxa de sucesso
            long successfulVisits = allVisits.stream()
                .filter(visit -> visit.getStatus() == VisitControl.VisitStatus.COMPLETED && 
                               visit.getSuccessRating() != null && 
                               visit.getSuccessRating() >= 4)
                .count();
            
            double successRate = completedVisits > 0 ? 
                (double) successfulVisits / completedVisits * 100 : 0;
            
            Map<String, Object> stats = Map.of(
                "today", todayVisits,
                "completed", completedVisits,
                "pending", pendingVisits,
                "inProgress", inProgressVisits,
                "successRate", Math.round(successRate * 100.0) / 100.0
            );
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<List<VisitControl>> getRecentVisits() {
        try {
            List<VisitControl> recentVisits = visitControlRepository.findAll()
                .stream()
                .sorted((v1, v2) -> {
                    if (v1.getScheduledAt() == null) return 1;
                    if (v2.getScheduledAt() == null) return -1;
                    return v2.getScheduledAt().compareTo(v1.getScheduledAt());
                })
                .limit(3)
                .toList();
            
            return ResponseEntity.ok(recentVisits);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<VisitControl>> getAllVisits() {
        try {
            List<VisitControl> visits = visitControlRepository.findAll();
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<VisitControl> getVisitById(@PathVariable UUID id) {
        return visitControlRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<VisitControl> createVisit(@RequestBody CreateVisitRequest request) {
        try {
            VisitControl visit = VisitControl.builder()
                .title(request.getTitle())
                .location(request.getLocation())
                .client(request.getClient())
                .assignedTo(request.getAssignedTo())
                .supervisor(request.getSupervisor())
                .scheduledAt(request.getScheduledAt() != null ? 
                    LocalDateTime.parse(request.getScheduledAt()) : null)
                .notes(request.getDescription())
                .status(VisitControl.VisitStatus.SCHEDULED)
                .build();

            VisitControl savedVisit = visitControlRepository.save(visit);
            return ResponseEntity.status(201).body(savedVisit);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<VisitControl> updateVisit(@PathVariable UUID id, @RequestBody UpdateVisitRequest request) {
        try {
            VisitControl visit = visitControlRepository.findById(id)
                .orElse(null);
            
            if (visit == null) {
                return ResponseEntity.notFound().build();
            }

            if (request.getTitle() != null) visit.setTitle(request.getTitle());
            if (request.getLocation() != null) visit.setLocation(request.getLocation());
            if (request.getClient() != null) visit.setClient(request.getClient());
            if (request.getAssignedTo() != null) visit.setAssignedTo(request.getAssignedTo());
            if (request.getSupervisor() != null) visit.setSupervisor(request.getSupervisor());
            if (request.getScheduledAt() != null) visit.setScheduledAt(LocalDateTime.parse(request.getScheduledAt()));
            if (request.getDescription() != null) visit.setNotes(request.getDescription());
            if (request.getStatus() != null) visit.setStatus(VisitControl.VisitStatus.valueOf(request.getStatus()));

            VisitControl updatedVisit = visitControlRepository.save(visit);
            return ResponseEntity.ok(updatedVisit);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVisit(@PathVariable UUID id) {
        try {
            if (!visitControlRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            visitControlRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    // Classes internas para requests
    public static class CreateVisitRequest {
        private String title;
        private String location;
        private String client;
        private String assignedTo;
        private String supervisor;
        private String scheduledAt;
        private String description;
        private String priority;

        // Getters e Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getClient() { return client; }
        public void setClient(String client) { this.client = client; }
        public String getAssignedTo() { return assignedTo; }
        public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }
        public String getSupervisor() { return supervisor; }
        public void setSupervisor(String supervisor) { this.supervisor = supervisor; }
        public String getScheduledAt() { return scheduledAt; }
        public void setScheduledAt(String scheduledAt) { this.scheduledAt = scheduledAt; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }
    }

    public static class UpdateVisitRequest {
        private String title;
        private String location;
        private String client;
        private String assignedTo;
        private String supervisor;
        private String scheduledAt;
        private String description;
        private String status;
        private String priority;

        // Getters e Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public String getClient() { return client; }
        public void setClient(String client) { this.client = client; }
        public String getAssignedTo() { return assignedTo; }
        public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }
        public String getSupervisor() { return supervisor; }
        public void setSupervisor(String supervisor) { this.supervisor = supervisor; }
        public String getScheduledAt() { return scheduledAt; }
        public void setScheduledAt(String scheduledAt) { this.scheduledAt = scheduledAt; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }
    }
}