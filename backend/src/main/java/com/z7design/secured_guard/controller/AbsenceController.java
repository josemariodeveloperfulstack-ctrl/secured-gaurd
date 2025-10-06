package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.service.AbsenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/absences")
@CrossOrigin(origins = "*")
public class AbsenceController {

    @Autowired
    private AbsenceService absenceService;

    @GetMapping
    public ResponseEntity<List<Absence>> getAllAbsences() {
        List<Absence> absences = absenceService.getAllAbsences();
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Absence> getAbsenceById(@PathVariable UUID id) {
        return absenceService.getAbsenceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<Absence>> getAbsencesByEmployee(@PathVariable UUID employeeId) {
        List<Absence> absences = absenceService.getAbsencesByEmployee(employeeId);
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<Absence>> getAbsencesByDate(@PathVariable LocalDate date) {
        List<Absence> absences = absenceService.getAbsencesByDate(date);
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Absence>> getAbsencesByStatus(@PathVariable Absence.AbsenceStatus status) {
        List<Absence> absences = absenceService.getAbsencesByStatus(status);
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/absence-type/{absenceType}")
    public ResponseEntity<List<Absence>> getAbsencesByType(@PathVariable Absence.AbsenceType absenceType) {
        List<Absence> absences = absenceService.getAbsencesByType(absenceType);
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<Absence>> getAbsencesByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<Absence> absences = absenceService.getAbsencesByDateRange(startDate, endDate);
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/employee/{employeeId}/date-range")
    public ResponseEntity<List<Absence>> getAbsencesByEmployeeAndDateRange(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<Absence> absences = absenceService.getAbsencesByEmployeeAndDateRange(employeeId, startDate, endDate);
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Absence>> getPendingAbsences() {
        List<Absence> absences = absenceService.getPendingAbsences();
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/today")
    public ResponseEntity<List<Absence>> getTodayAbsences() {
        List<Absence> absences = absenceService.getTodayAbsences();
        return ResponseEntity.ok(absences);
    }

    @GetMapping("/employee/{employeeId}/count")
    public ResponseEntity<Long> getEmployeeAbsenceCount(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        Long count = absenceService.getEmployeeAbsenceCount(employeeId, startDate, endDate);
        return ResponseEntity.ok(count);
    }

    @PostMapping
    public ResponseEntity<Absence> createAbsence(@RequestBody Absence absence) {
        try {
            Absence createdAbsence = absenceService.createAbsence(absence);
            return ResponseEntity.ok(createdAbsence);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Absence> updateAbsence(@PathVariable UUID id, @RequestBody Absence absence) {
        try {
            Absence updatedAbsence = absenceService.updateAbsence(id, absence);
            return ResponseEntity.ok(updatedAbsence);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Absence> updateStatus(@PathVariable UUID id, @RequestParam Absence.AbsenceStatus status) {
        try {
            Absence updatedAbsence = absenceService.updateStatus(id, status);
            return ResponseEntity.ok(updatedAbsence);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Absence> approveAbsence(@PathVariable UUID id, @RequestParam UUID approvedByEmployeeId) {
        try {
            Absence approvedAbsence = absenceService.approveAbsence(id, approvedByEmployeeId);
            return ResponseEntity.ok(approvedAbsence);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Absence> rejectAbsence(@PathVariable UUID id, @RequestParam String reason) {
        try {
            Absence rejectedAbsence = absenceService.rejectAbsence(id, reason);
            return ResponseEntity.ok(rejectedAbsence);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAbsence(@PathVariable UUID id) {
        try {
            absenceService.deleteAbsence(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
