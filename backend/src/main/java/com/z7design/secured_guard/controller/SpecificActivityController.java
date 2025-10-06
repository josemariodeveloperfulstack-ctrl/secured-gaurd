package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.SpecificActivity;
import com.z7design.secured_guard.service.SpecificActivityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/specific-activities")
@CrossOrigin(origins = "*")
public class SpecificActivityController {

    @Autowired
    private SpecificActivityService specificActivityService;

    @GetMapping
    public ResponseEntity<List<SpecificActivity>> getAllSpecificActivities() {
        List<SpecificActivity> activities = specificActivityService.getAllSpecificActivities();
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SpecificActivity> getSpecificActivityById(@PathVariable UUID id) {
        return specificActivityService.getSpecificActivityById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByEmployee(@PathVariable UUID employeeId) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByEmployee(employeeId);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/location/{locationId}")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByLocation(@PathVariable UUID locationId) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByLocation(locationId);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByDate(@PathVariable LocalDate date) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByDate(date);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByStatus(@PathVariable SpecificActivity.ActivityStatus status) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByStatus(status);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByType(@PathVariable SpecificActivity.ActivityType type) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByType(type);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByDateRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByDateRange(startDate, endDate);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/employee/{employeeId}/date-range")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByEmployeeAndDateRange(
            @PathVariable UUID employeeId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByEmployeeAndDateRange(employeeId, startDate, endDate);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/location/{locationId}/date-range")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByLocationAndDateRange(
            @PathVariable UUID locationId,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByLocationAndDateRange(locationId, startDate, endDate);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/type/{type}/date-range")
    public ResponseEntity<List<SpecificActivity>> getSpecificActivitiesByTypeAndDateRange(
            @PathVariable SpecificActivity.ActivityType type,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {
        List<SpecificActivity> activities = specificActivityService.getSpecificActivitiesByTypeAndDateRange(type, startDate, endDate);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/today")
    public ResponseEntity<List<SpecificActivity>> getTodayActivities() {
        List<SpecificActivity> activities = specificActivityService.getTodayActivities();
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<SpecificActivity>> getPendingActivities() {
        List<SpecificActivity> activities = specificActivityService.getPendingActivities();
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/pending/date/{date}")
    public ResponseEntity<List<SpecificActivity>> getPendingActivitiesByDate(@PathVariable LocalDate date) {
        List<SpecificActivity> activities = specificActivityService.getPendingActivitiesByDate(date);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<SpecificActivity>> getOverdueActivities() {
        List<SpecificActivity> activities = specificActivityService.getOverdueActivities();
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/in-progress")
    public ResponseEntity<List<SpecificActivity>> getInProgressActivities() {
        List<SpecificActivity> activities = specificActivityService.getInProgressActivities();
        return ResponseEntity.ok(activities);
    }

    @PostMapping
    public ResponseEntity<SpecificActivity> createSpecificActivity(@RequestBody SpecificActivity activity) {
        try {
            SpecificActivity createdActivity = specificActivityService.createSpecificActivity(activity);
            return ResponseEntity.ok(createdActivity);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<SpecificActivity> updateSpecificActivity(@PathVariable UUID id, @RequestBody SpecificActivity activity) {
        try {
            SpecificActivity updatedActivity = specificActivityService.updateSpecificActivity(id, activity);
            return ResponseEntity.ok(updatedActivity);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<SpecificActivity> updateStatus(@PathVariable UUID id, @RequestParam SpecificActivity.ActivityStatus status) {
        try {
            SpecificActivity updatedActivity = specificActivityService.updateStatus(id, status);
            return ResponseEntity.ok(updatedActivity);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<SpecificActivity> startActivity(@PathVariable UUID id) {
        try {
            SpecificActivity startedActivity = specificActivityService.startActivity(id);
            return ResponseEntity.ok(startedActivity);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<SpecificActivity> completeActivity(@PathVariable UUID id, @RequestParam(required = false) String observations) {
        try {
            SpecificActivity completedActivity = specificActivityService.completeActivity(id, observations);
            return ResponseEntity.ok(completedActivity);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSpecificActivity(@PathVariable UUID id) {
        try {
            specificActivityService.deleteSpecificActivity(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
