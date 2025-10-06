package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.WorkPostAssignment;
import com.z7design.secured_guard.service.WorkPostAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/work-post-assignments")
@CrossOrigin(origins = "*")
public class WorkPostAssignmentController {

    @Autowired
    private WorkPostAssignmentService workPostAssignmentService;

    @GetMapping
    public ResponseEntity<List<WorkPostAssignment>> getAllWorkPostAssignments() {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getAllWorkPostAssignments();
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkPostAssignment> getWorkPostAssignmentById(@PathVariable UUID id) {
        return workPostAssignmentService.getWorkPostAssignmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<WorkPostAssignment>> getWorkPostAssignmentsByEmployee(@PathVariable UUID employeeId) {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getWorkPostAssignmentsByEmployee(employeeId);
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/work-post/{workPostId}")
    public ResponseEntity<List<WorkPostAssignment>> getWorkPostAssignmentsByWorkPost(@PathVariable UUID workPostId) {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getWorkPostAssignmentsByWorkPost(workPostId);
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<WorkPostAssignment>> getWorkPostAssignmentsByDate(@PathVariable LocalDate date) {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getWorkPostAssignmentsByDate(date);
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<WorkPostAssignment>> getWorkPostAssignmentsByStatus(@PathVariable WorkPostAssignment.AssignmentStatus status) {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getWorkPostAssignmentsByStatus(status);
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<WorkPostAssignment>> getWorkPostAssignmentsByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getWorkPostAssignmentsByDateRange(startDate, endDate);
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/employee/{employeeId}/date-range")
    public ResponseEntity<List<WorkPostAssignment>> getWorkPostAssignmentsByEmployeeAndDateRange(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getWorkPostAssignmentsByEmployeeAndDateRange(employeeId, startDate, endDate);
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/work-post/{workPostId}/date-range")
    public ResponseEntity<List<WorkPostAssignment>> getWorkPostAssignmentsByWorkPostAndDateRange(
            @PathVariable UUID workPostId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getWorkPostAssignmentsByWorkPostAndDateRange(workPostId, startDate, endDate);
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/today")
    public ResponseEntity<List<WorkPostAssignment>> getTodayAssignments() {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getTodayAssignments();
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<WorkPostAssignment>> getPendingAssignments() {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getPendingAssignments();
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/active")
    public ResponseEntity<List<WorkPostAssignment>> getActiveAssignments() {
        List<WorkPostAssignment> assignments = workPostAssignmentService.getActiveAssignments();
        return ResponseEntity.ok(assignments);
    }

    @PostMapping
    public ResponseEntity<WorkPostAssignment> createWorkPostAssignment(@RequestBody WorkPostAssignment assignment) {
        try {
            WorkPostAssignment createdAssignment = workPostAssignmentService.createWorkPostAssignment(assignment);
            return ResponseEntity.ok(createdAssignment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkPostAssignment> updateWorkPostAssignment(@PathVariable UUID id, @RequestBody WorkPostAssignment assignment) {
        try {
            WorkPostAssignment updatedAssignment = workPostAssignmentService.updateWorkPostAssignment(id, assignment);
            return ResponseEntity.ok(updatedAssignment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<WorkPostAssignment> updateStatus(@PathVariable UUID id, @RequestParam WorkPostAssignment.AssignmentStatus status) {
        try {
            WorkPostAssignment updatedAssignment = workPostAssignmentService.updateStatus(id, status);
            return ResponseEntity.ok(updatedAssignment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<WorkPostAssignment> confirmAssignment(@PathVariable UUID id) {
        try {
            WorkPostAssignment confirmedAssignment = workPostAssignmentService.confirmAssignment(id);
            return ResponseEntity.ok(confirmedAssignment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<WorkPostAssignment> completeAssignment(@PathVariable UUID id) {
        try {
            WorkPostAssignment completedAssignment = workPostAssignmentService.completeAssignment(id);
            return ResponseEntity.ok(completedAssignment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkPostAssignment(@PathVariable UUID id) {
        try {
            workPostAssignmentService.deleteWorkPostAssignment(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
