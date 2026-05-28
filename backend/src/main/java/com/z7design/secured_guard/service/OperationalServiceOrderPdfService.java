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
        if (request.getLayoutType() != null
                && "BOMBEIRO_CIVIL".equalsIgnoreCase(request.getLayoutType().trim())) {
            return bombeiroCivilPdfService.generatePdf(request);
        }
        return standardPdfService.generatePdf(request);
    }
}
