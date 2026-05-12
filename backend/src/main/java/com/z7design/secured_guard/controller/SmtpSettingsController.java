package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.sendgrid.SmtpSettingsDto;
import com.z7design.secured_guard.dto.sendgrid.SmtpSettingsRequest;
import com.z7design.secured_guard.dto.sendgrid.SmtpTestRequest;
import com.z7design.secured_guard.service.sendgrid.SmtpSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/smtp-settings")
@RequiredArgsConstructor
public class SmtpSettingsController {

    private final SmtpSettingsService service;

    /** Retorna a configuração atual ou {@code 204 No Content} se não houver. */
    @GetMapping
    public ResponseEntity<SmtpSettingsDto> current() {
        return service.getCurrent()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Cria ou atualiza a configuração (singleton lógico). */
    @PutMapping
    public ResponseEntity<SmtpSettingsDto> upsert(@Valid @RequestBody SmtpSettingsRequest request) {
        return ResponseEntity.status(HttpStatus.OK).body(service.upsert(request));
    }

    /** Testa a configuração atual disparando um e-mail de teste. */
    @PostMapping("/test")
    public ResponseEntity<SmtpSettingsDto> test(@Valid @RequestBody SmtpTestRequest request) {
        return ResponseEntity.ok(service.testCurrent(request));
    }

    @DeleteMapping
    public ResponseEntity<Void> delete() {
        service.delete();
        return ResponseEntity.noContent().build();
    }
}
