package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.sendgrid.EmailTrackingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Endpoints públicos de rastreamento (pixel e redirect de cliques).
 * Devem ser acessíveis sem autenticação — clientes de e-mail não enviam JWT.
 */
@RestController
@RequestMapping("/email-marketing/track")
@RequiredArgsConstructor
public class EmailTrackingController {

    /** GIF 1×1 transparente (43 bytes). */
    private static final byte[] TRANSPARENT_GIF = Base64.getDecoder().decode(
            "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

    private final EmailTrackingService emailTrackingService;

    @GetMapping(value = "/open/{emailLogId}.gif", produces = "image/gif")
    public ResponseEntity<byte[]> trackOpen(@PathVariable UUID emailLogId) {
        emailTrackingService.recordOpen(emailLogId);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_GIF)
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(TRANSPARENT_GIF);
    }

    @GetMapping("/click/{emailLogId}")
    public ResponseEntity<Void> trackClick(
            @PathVariable UUID emailLogId,
            @RequestParam(name = "u", required = false) String encodedUrl) {
        Optional<String> target = emailTrackingService.recordClick(emailLogId, encodedUrl);
        if (target.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target.get()))
                .build();
    }
}
