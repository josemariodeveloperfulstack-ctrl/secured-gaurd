package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.sendgrid.EmailTemplateDto;
import com.z7design.secured_guard.dto.sendgrid.EmailTemplateRequest;
import com.z7design.secured_guard.service.sendgrid.EmailTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/email-templates")
@RequiredArgsConstructor
public class EmailTemplateController {

    private final EmailTemplateService service;

    @GetMapping
    public ResponseEntity<List<EmailTemplateDto>> list(
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(service.list(activeOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmailTemplateDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    public ResponseEntity<EmailTemplateDto> create(@Valid @RequestBody EmailTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmailTemplateDto> update(@PathVariable UUID id,
                                                   @Valid @RequestBody EmailTemplateRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
