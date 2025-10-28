package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.BaileysRestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppController {

    private final BaileysRestService baileysRestService;

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        boolean connected = baileysRestService.checkConnection();
        return ResponseEntity.ok(java.util.Map.of("connected", connected));
    }

    @PostMapping("/init")
    public ResponseEntity<?> init() {
        boolean ok = baileysRestService.initializeInstance();
        return ResponseEntity.ok(java.util.Map.of("initialized", ok));
    }

    @GetMapping(value = "/qr", produces = "image/svg+xml")
    public ResponseEntity<String> qr() {
        String svg = baileysRestService.getQRCode();
        if (svg == null) {
            return ResponseEntity.status(404).body("QR not available");
        }
        return ResponseEntity.ok(svg);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        boolean ok = baileysRestService.disconnectInstance();
        return ResponseEntity.ok(java.util.Map.of("success", ok));
    }
}


