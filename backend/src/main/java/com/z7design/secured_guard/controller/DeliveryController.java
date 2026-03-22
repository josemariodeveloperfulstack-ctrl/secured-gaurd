package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.DeliveryRequestDTO;
import com.z7design.secured_guard.dto.DeliverySignatureRequestDTO;
import com.z7design.secured_guard.model.Delivery;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/deliveries")
@RequiredArgsConstructor
@Tag(name = "Entregas", description = "Endpoints para gestão de entregas e assinaturas")
public class DeliveryController {

    private final DeliveryService deliveryService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPRIMENTOS', 'ROLE_ESTOQUE', 'SUPER_ADMIN', 'ADMIN', 'SUPRIMENTOS', 'ESTOQUE')")
    @Operation(summary = "Criar nova entrega", description = "Cria uma entrega e gera o token de assinatura")
    public ResponseEntity<Delivery> createDelivery(@RequestBody DeliveryRequestDTO request, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        
        List<DeliveryService.DeliveryItemRecord> items = request.getItems().stream()
                .map(i -> new DeliveryService.DeliveryItemRecord(i.getProductId(), i.getQuantity()))
                .collect(Collectors.toList());

        Delivery delivery = deliveryService.createDelivery(request.getEmployeeId(), user.getId(), items);
        return ResponseEntity.ok(delivery);
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_SUPRIMENTOS', 'ROLE_ESTOQUE', 'SUPER_ADMIN', 'ADMIN', 'SUPRIMENTOS', 'ESTOQUE')")
    @Operation(summary = "Assinar entrega via Tablet", description = "Registra a assinatura capturada localmente no tablet")
    public ResponseEntity<Delivery> signTablet(@PathVariable UUID id, @RequestBody DeliverySignatureRequestDTO request, @RequestHeader(value = "X-Forwarded-For", required = false) String ip, @RequestHeader(value = "User-Agent") String userAgent) {
        Delivery delivery = deliveryService.signDelivery(id, request.getSignatureBase64(), request.getOrigin(), ip, userAgent);
        return ResponseEntity.ok(delivery);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obter detalhes da entrega")
    @PreAuthorize("hasAnyRole('ADMIN', 'GESTOR', 'ALMOXARIFE')")
    public ResponseEntity<Delivery> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(deliveryService.getDeliveryById(id));
    }

    @GetMapping
    @Operation(summary = "Listar todas as entregas")
    @PreAuthorize("hasAnyRole('ADMIN', 'GESTOR', 'ALMOXARIFE')")
    public ResponseEntity<List<Delivery>> listAll() {
        return ResponseEntity.ok(deliveryService.getAllDeliveries());
    }
}
