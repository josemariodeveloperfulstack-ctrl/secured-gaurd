package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ConfirmEpiReceiptRequestDTO;
import com.z7design.secured_guard.dto.PublicEpiConfirmationDTO;
import com.z7design.secured_guard.service.EPIDeliveryFormService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/public/epi-delivery-forms")
@RequiredArgsConstructor
@Tag(name = "Confirmação EPI Pública", description = "Confirmação de recebimento de EPI via link WhatsApp")
public class PublicEpiDeliveryController {

    private final EPIDeliveryFormService epiDeliveryFormService;

    @GetMapping("/token/{token}")
    @Operation(summary = "Obter ficha EPI pelo token de confirmação")
    public ResponseEntity<PublicEpiConfirmationDTO> getByToken(@PathVariable UUID token) {
        return ResponseEntity.ok(epiDeliveryFormService.getPublicConfirmation(token));
    }

    @PostMapping("/token/{token}/confirm")
    @Operation(summary = "Confirmar recebimento de EPI com código")
    public ResponseEntity<PublicEpiConfirmationDTO> confirm(
            @PathVariable UUID token,
            @RequestBody ConfirmEpiReceiptRequestDTO request,
            @RequestHeader(value = "X-Forwarded-For", required = false) String ip,
            @RequestHeader(value = "User-Agent", required = false) String userAgent) {
        String clientIp = ip != null && ip.contains(",") ? ip.split(",")[0].trim() : ip;
        return ResponseEntity.ok(epiDeliveryFormService.confirmPublicReceipt(
                token,
                request.getCode(),
                request.getSignatureBase64(),
                clientIp,
                userAgent));
    }
}
