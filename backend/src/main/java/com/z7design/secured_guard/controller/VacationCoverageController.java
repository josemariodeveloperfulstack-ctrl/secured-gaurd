package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.VacationCoverage;
import com.z7design.secured_guard.service.VacationCoverageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vacation-coverages")
@CrossOrigin(origins = "*")
public class VacationCoverageController {

    @Autowired
    private VacationCoverageService vacationCoverageService;

    @GetMapping
    public ResponseEntity<List<VacationCoverage>> getAllVacationCoverages() {
        List<VacationCoverage> coverages = vacationCoverageService.getAllVacationCoverages();
        return ResponseEntity.ok(coverages);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VacationCoverage> getVacationCoverageById(@PathVariable UUID id) {
        return vacationCoverageService.getVacationCoverageById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<VacationCoverage>> getVacationCoveragesByEmployee(@PathVariable UUID employeeId) {
        List<VacationCoverage> coverages = vacationCoverageService.getVacationCoveragesByEmployee(employeeId);
        return ResponseEntity.ok(coverages);
    }

    @GetMapping("/substitute/{substituteEmployeeId}")
    public ResponseEntity<List<VacationCoverage>> getVacationCoveragesBySubstitute(@PathVariable UUID substituteEmployeeId) {
        List<VacationCoverage> coverages = vacationCoverageService.getVacationCoveragesBySubstitute(substituteEmployeeId);
        return ResponseEntity.ok(coverages);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<VacationCoverage>> getVacationCoveragesByStatus(@PathVariable VacationCoverage.CoverageStatus status) {
        List<VacationCoverage> coverages = vacationCoverageService.getVacationCoveragesByStatus(status);
        return ResponseEntity.ok(coverages);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<VacationCoverage>> getVacationCoveragesByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<VacationCoverage> coverages = vacationCoverageService.getVacationCoveragesByDateRange(startDate, endDate);
        return ResponseEntity.ok(coverages);
    }

    @GetMapping("/needing-attention")
    public ResponseEntity<List<VacationCoverage>> getVacationCoveragesNeedingAttention() {
        List<VacationCoverage> coverages = vacationCoverageService.getVacationCoveragesNeedingAttention();
        return ResponseEntity.ok(coverages);
    }

    @PostMapping
    public ResponseEntity<VacationCoverage> createVacationCoverage(@RequestBody VacationCoverage vacationCoverage) {
        try {
            VacationCoverage createdCoverage = vacationCoverageService.createVacationCoverage(vacationCoverage);
            return ResponseEntity.ok(createdCoverage);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<VacationCoverage> updateVacationCoverage(@PathVariable UUID id, @RequestBody VacationCoverage vacationCoverage) {
        try {
            VacationCoverage updatedCoverage = vacationCoverageService.updateVacationCoverage(id, vacationCoverage);
            return ResponseEntity.ok(updatedCoverage);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<VacationCoverage> updateStatus(@PathVariable UUID id, @RequestParam VacationCoverage.CoverageStatus status) {
        try {
            VacationCoverage updatedCoverage = vacationCoverageService.updateStatus(id, status);
            return ResponseEntity.ok(updatedCoverage);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVacationCoverage(@PathVariable UUID id) {
        try {
            vacationCoverageService.deleteVacationCoverage(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
