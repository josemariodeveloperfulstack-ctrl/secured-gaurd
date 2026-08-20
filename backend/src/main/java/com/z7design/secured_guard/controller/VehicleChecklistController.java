package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.VehicleChecklistDTO;
import com.z7design.secured_guard.model.VehicleChecklist.ShiftType;
import com.z7design.secured_guard.service.VehicleChecklistPdfService;
import com.z7design.secured_guard.service.VehicleChecklistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/vehicle-checklists")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class VehicleChecklistController {

    private final VehicleChecklistService vehicleChecklistService;
    private final VehicleChecklistPdfService vehicleChecklistPdfService;

    @GetMapping
    public ResponseEntity<List<VehicleChecklistDTO>> findAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) ShiftType shift,
            @RequestParam(required = false) String search) {

        List<VehicleChecklistDTO> list = vehicleChecklistService.findAll(startDate, endDate, shift, search);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VehicleChecklistDTO> findById(@PathVariable Long id) {
        VehicleChecklistDTO dto = vehicleChecklistService.findById(id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<VehicleChecklistDTO> create(@RequestBody VehicleChecklistDTO dto) {
        VehicleChecklistDTO created = vehicleChecklistService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VehicleChecklistDTO> update(@PathVariable Long id, @RequestBody VehicleChecklistDTO dto) {
        VehicleChecklistDTO updated = vehicleChecklistService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        vehicleChecklistService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> generatePdf(@PathVariable Long id) {
        byte[] pdfBytes = vehicleChecklistPdfService.generatePdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "checklist-viatura-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
