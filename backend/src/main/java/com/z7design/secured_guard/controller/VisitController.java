// src/main/java/com/z7design/secured_guard/controller/VisitController.java
package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.VisitControl;
import com.z7design.secured_guard.repository.VisitControlRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/visit-controls") // Apenas visit-controls (visits é usado pelo VisitsController)
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
    public ResponseEntity<?> getAllVisits(
        @RequestParam(required = false, defaultValue = "0") Integer page,
        @RequestParam(required = false, defaultValue = "20") Integer size,
        @RequestParam(required = false) String supervisorId,
        @RequestParam(required = false) String workPostId,
        @RequestParam(required = false) String clientId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String startDate,
        @RequestParam(required = false) String endDate
    ) {
        try {
            System.out.println("🔍 GET /api/visits chamado - page: " + page + ", size: " + size);
            
            List<VisitControl> visits;
            try {
                visits = visitControlRepository.findAll();
                System.out.println("📊 Total de visitas no banco: " + visits.size());
            } catch (Exception repoError) {
                System.err.println("⚠️ Erro ao acessar repository, retornando lista vazia: " + repoError.getMessage());
                visits = new ArrayList<>();
            }
            
            // Calcular paginação
            int start = page * size;
            int end = Math.min(start + size, visits.size());
            
            List<VisitControl> paginatedVisits = start < visits.size() ? 
                visits.subList(start, end) : new ArrayList<>();
            
            System.out.println("📄 Retornando " + paginatedVisits.size() + " visitas (página " + page + ")");
            
            // Criar resposta paginada
            Map<String, Object> response = new HashMap<>();
            response.put("content", paginatedVisits);
            response.put("totalElements", (long) visits.size());
            response.put("totalPages", size > 0 ? (int) Math.ceil((double) visits.size() / size) : 0);
            response.put("number", page);
            response.put("size", size);
            response.put("empty", paginatedVisits.isEmpty());
            response.put("first", page == 0);
            response.put("last", end >= visits.size());
            
            System.out.println("✅ Resposta criada com sucesso");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("❌ ERRO CRÍTICO ao buscar visitas:");
            System.err.println("  Tipo: " + e.getClass().getName());
            System.err.println("  Mensagem: " + e.getMessage());
            System.err.println("  Stack trace:");
            e.printStackTrace();
            
            // Retornar resposta vazia ao invés de erro
            Map<String, Object> emptyResponse = new HashMap<>();
            emptyResponse.put("content", new ArrayList<>());
            emptyResponse.put("totalElements", 0L);
            emptyResponse.put("totalPages", 0);
            emptyResponse.put("number", page);
            emptyResponse.put("size", size);
            emptyResponse.put("empty", true);
            emptyResponse.put("first", true);
            emptyResponse.put("last", true);
            
            return ResponseEntity.ok(emptyResponse); // Retornar 200 com lista vazia
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