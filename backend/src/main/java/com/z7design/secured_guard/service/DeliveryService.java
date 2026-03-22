package com.z7design.secured_guard.service;

import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.DeliverySignatureOrigin;
import com.z7design.secured_guard.model.enums.DeliveryStatus;
import com.z7design.secured_guard.repository.DeliveryItemRepository;
import com.z7design.secured_guard.repository.DeliveryRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryItemRepository deliveryItemRepository;
    private final EmployeeRepository employeeRepository;
    private final ProductRepository productRepository;

    @Transactional
    public Delivery createDelivery(UUID employeeId, UUID almoxarifeId, List<DeliveryItemRecord> items) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new BusinessException("Funcionário não encontrado"));

        // Almoxarife is the logged user, handled in controller/dto
        User almoxarife = User.builder().id(almoxarifeId).build(); // Placeholder, usually loaded from repo

        Delivery delivery = Delivery.builder()
                .employee(employee)
                .almoxarife(almoxarife)
                .status(DeliveryStatus.PENDING)
                .tokenSignature(UUID.randomUUID())
                .tokenExpiration(LocalDateTime.now().plusHours(2))
                .build();

        Delivery savedDelivery = deliveryRepository.save(delivery);

        for (DeliveryItemRecord itemRecord : items) {
            Product product = productRepository.findById(itemRecord.productId())
                    .orElseThrow(() -> new BusinessException("Produto não encontrado: " + itemRecord.productId()));

            DeliveryItem item = DeliveryItem.builder()
                    .delivery(savedDelivery)
                    .product(product)
                    .quantity(itemRecord.quantity())
                    .build();
            deliveryItemRepository.save(item);
            savedDelivery.getItems().add(item);
        }

        return savedDelivery;
    }

    public Delivery getDeliveryByToken(UUID token) {
        Delivery delivery = deliveryRepository.findByTokenSignature(token)
                .orElseThrow(() -> new BusinessException("Link de assinatura inválido ou expirado"));

        if (delivery.getStatus() != DeliveryStatus.PENDING) {
            throw new BusinessException("Esta entrega já foi processada (Status: " + delivery.getStatus() + ")");
        }

        if (delivery.getTokenExpiration().isBefore(LocalDateTime.now())) {
            delivery.setStatus(DeliveryStatus.EXPIRED);
            deliveryRepository.save(delivery);
            throw new BusinessException("Este link de assinatura expirou");
        }

        return delivery;
    }

    @Transactional
    public Delivery signDelivery(UUID deliveryId, String signatureBase64, DeliverySignatureOrigin origin, String ip, String userAgent) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BusinessException("Entrega não encontrada"));

        if (delivery.getStatus() != DeliveryStatus.PENDING) {
            throw new BusinessException("Esta entrega já foi processada");
        }

        delivery.setSignatureBase64(signatureBase64);
        delivery.setSignatureOrigin(origin);
        delivery.setAuditIp(ip);
        delivery.setAuditUserAgent(userAgent);
        delivery.setSignedAt(LocalDateTime.now());
        delivery.setStatus(DeliveryStatus.SIGNED);
        delivery.setTokenSignature(null); // Invalidate token after first successful use

        return deliveryRepository.save(delivery);
    }

    public Delivery getDelivery(UUID id) {
        return deliveryRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Entrega não encontrada"));
    }

    public List<Delivery> getAllDeliveries() {
        return deliveryRepository.findAll();
    }

    public record DeliveryItemRecord(UUID productId, java.math.BigDecimal quantity) {}
}
