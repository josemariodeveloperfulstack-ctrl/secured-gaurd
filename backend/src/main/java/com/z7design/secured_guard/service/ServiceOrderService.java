package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ServiceOrderRequest;
import com.z7design.secured_guard.enums.DocumentType;
import com.z7design.secured_guard.strategy.ServiceOrderStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceOrderService {

    private final List<ServiceOrderStrategy> strategies;

    private ServiceOrderStrategy getStrategy(DocumentType type) {
        return strategies.stream()
                .filter(strategy -> strategy.supports(type))
                .findFirst()
                .orElseThrow(
                        () -> new IllegalArgumentException("Nenhuma estratégia encontrada para o tipo de OS: " + type));
    }

    public byte[] generatePdf(DocumentType type, ServiceOrderRequest request) {
        return getStrategy(type).generatePdf(request);
    }

    public byte[] generateExcel(DocumentType type, ServiceOrderRequest request) {
        return getStrategy(type).generateExcel(request);
    }
}
