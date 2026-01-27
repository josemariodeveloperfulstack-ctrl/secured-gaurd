package com.z7design.secured_guard.strategy;

import com.z7design.secured_guard.dto.ServiceOrderRequest;
import com.z7design.secured_guard.enums.DocumentType;

public interface ServiceOrderStrategy {

    /**
     * Determines if this strategy supports the given document type.
     */
    boolean supports(DocumentType type);

    /**
     * Generates the PDF for the service order.
     */
    byte[] generatePdf(ServiceOrderRequest request);

    /**
     * Generates the Excel for the service order.
     */
    byte[] generateExcel(ServiceOrderRequest request);
}
