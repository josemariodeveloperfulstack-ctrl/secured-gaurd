package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.VehicleCriticalityPdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vehicle-criticality")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class VehicleCriticalityController {

    private final VehicleCriticalityPdfService pdfService;

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> generatePdf() {
        byte[] pdfBytes = pdfService.generatePdf();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "matriz-criticidade-viaturas.pdf");
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
