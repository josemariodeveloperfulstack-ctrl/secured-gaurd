package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EquipmentCautelaDTO;
import com.z7design.secured_guard.service.EquipmentCautelaPdfService;
import com.z7design.secured_guard.service.EquipmentCautelaService;
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
@RequestMapping("/api/equipment-cautelas")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class EquipmentCautelaController {

    private final EquipmentCautelaService service;
    private final EquipmentCautelaPdfService pdfService;

    @GetMapping
    public ResponseEntity<List<EquipmentCautelaDTO>> findAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {

        List<EquipmentCautelaDTO> list = service.findAll(startDate, endDate, status, search);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipmentCautelaDTO> findById(@PathVariable Long id) {
        EquipmentCautelaDTO dto = service.findById(id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<EquipmentCautelaDTO> create(@RequestBody EquipmentCautelaDTO dto) {
        EquipmentCautelaDTO created = service.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EquipmentCautelaDTO> update(@PathVariable Long id, @RequestBody EquipmentCautelaDTO dto) {
        EquipmentCautelaDTO updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> generatePdf(@PathVariable Long id) {
        byte[] pdfBytes = pdfService.generatePdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "termo-cautela-equipamentos-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
