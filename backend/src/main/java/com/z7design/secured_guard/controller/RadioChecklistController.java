package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.RadioChecklistDTO;
import com.z7design.secured_guard.model.RadioChecklist.MovementType;
import com.z7design.secured_guard.service.RadioChecklistPdfService;
import com.z7design.secured_guard.service.RadioChecklistService;
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
@RequestMapping("/api/radio-checklists")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class RadioChecklistController {

    private final RadioChecklistService radioChecklistService;
    private final RadioChecklistPdfService radioChecklistPdfService;

    @GetMapping
    public ResponseEntity<List<RadioChecklistDTO>> findAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) MovementType type,
            @RequestParam(required = false) String workPost,
            @RequestParam(required = false) String vigilante) {
        
        List<RadioChecklistDTO> list = radioChecklistService.findAll(startDate, endDate, type, workPost, vigilante);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RadioChecklistDTO> findById(@PathVariable Long id) {
        RadioChecklistDTO dto = radioChecklistService.findById(id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<RadioChecklistDTO> create(@RequestBody RadioChecklistDTO dto) {
        RadioChecklistDTO created = radioChecklistService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RadioChecklistDTO> update(@PathVariable Long id, @RequestBody RadioChecklistDTO dto) {
        RadioChecklistDTO updated = radioChecklistService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        radioChecklistService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> generatePdf(@PathVariable Long id) {
        byte[] pdfBytes = radioChecklistPdfService.generatePdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "checklist-radio-ht-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
