package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import org.springframework.stereotype.Service;

@Service
public class OperationalServiceOrderPdfService {

    private final OsStandardPdfService standardPdfService;
    private final OsBombeiroCivilPdfService bombeiroCivilPdfService;

    public OperationalServiceOrderPdfService(
            OsStandardPdfService standardPdfService,
            OsBombeiroCivilPdfService bombeiroCivilPdfService) {
        this.standardPdfService = standardPdfService;
        this.bombeiroCivilPdfService = bombeiroCivilPdfService;
    }

    public byte[] generatePdf(OperationalServiceOrderRequest request) {
        // Aplica o layout oficial padronizado com cabeçalho de 3 colunas (Logo | ORDEM DE SERVIÇO | Carimbo SST) para todos os cargos
        return standardPdfService.generatePdf(request);
    }
}
