package com.z7design.secured_guard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountingFormService {

    private final AccountingFormStandardPdfService accountingFormStandardPdfService;

    /**
     * Gera HTML da ficha de contabilidade para um funcionário (mesmo layout do PDF).
     */
    public String generateAccountingFormHtml(UUID employeeId) {
        log.info("📄 Gerando ficha de contabilidade para funcionário: {}", employeeId);
        return accountingFormStandardPdfService.generateAccountingFormHtml(employeeId);
    }
}
