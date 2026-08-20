package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.FirearmAcautelamentoDTO;
import com.z7design.secured_guard.service.FirearmAcautelamentoPdfService;
import com.z7design.secured_guard.service.FirearmAcautelamentoService;
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
@RequestMapping("/api/firearm-acautelamentos")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class FirearmAcautelamentoController {

    private final FirearmAcautelamentoService service;
    private final FirearmAcautelamentoPdfService pdfService;

    @GetMapping
    public ResponseEntity<List<FirearmAcautelamentoDTO>> findAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {

        List<FirearmAcautelamentoDTO> list = service.findAll(startDate, endDate, status, search);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FirearmAcautelamentoDTO> findById(@PathVariable Long id) {
        FirearmAcautelamentoDTO dto = service.findById(id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<FirearmAcautelamentoDTO> create(@RequestBody FirearmAcautelamentoDTO dto) {
        FirearmAcautelamentoDTO created = service.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FirearmAcautelamentoDTO> update(@PathVariable Long id, @RequestBody FirearmAcautelamentoDTO dto) {
        FirearmAcautelamentoDTO updated = service.update(id, dto);
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
        headers.setContentDispositionFormData("attachment", "termo-acautelamento-arma-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
