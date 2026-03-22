package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.DeliverySignatureRequestDTO;
import com.z7design.secured_guard.model.Delivery;
import com.z7design.secured_guard.service.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/public/deliveries")
@RequiredArgsConstructor
@Tag(name = "Entregas Públicas", description = "Endpoints públicos para assinatura remota")
public class PublicDeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping("/token/{token}")
    @Operation(summary = "Obter entrega pelo token", description = "Busca os dados da entrega para exibição na página de assinatura remota")
    public ResponseEntity<Delivery> getByToken(@PathVariable UUID token) {
        return ResponseEntity.ok(deliveryService.getDeliveryByToken(token));
    }

    @PostMapping("/token/{token}/sign")
    @Operation(summary = "Assinar entrega remotamente", description = "Registra a assinatura capturada via link remoto")
    public ResponseEntity<Delivery> signRemote(@PathVariable UUID token, @RequestBody DeliverySignatureRequestDTO request, @RequestHeader(value = "X-Forwarded-For", required = false) String ip, @RequestHeader(value = "User-Agent") String userAgent) {
        Delivery delivery = deliveryService.getDeliveryByToken(token);
        Delivery signed = deliveryService.signDelivery(delivery.getId(), request.getSignatureBase64(), request.getOrigin(), ip, userAgent);
        return ResponseEntity.ok(signed);
    }
}
