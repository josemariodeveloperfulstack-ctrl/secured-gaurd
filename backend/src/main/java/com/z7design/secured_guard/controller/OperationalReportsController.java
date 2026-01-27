package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.VehicleMaintenanceRequest;
import com.z7design.secured_guard.dto.VisitControlRequest;
import com.z7design.secured_guard.service.VehicleMaintenanceReportService;
import com.z7design.secured_guard.service.VisitControlReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Relatórios - Operacionais", description = "Geração de Relatórios Operacionais e Administrativos")
public class OperationalReportsController {

    private final VisitControlReportService visitService;
    private final VehicleMaintenanceReportService maintenanceService;

    // --- Controle de Visitas ---

    @PostMapping("/visit-control/generate-pdf")
    @Operation(summary = "Gerar PDF - Controle de Visitas")
    public ResponseEntity<byte[]> generateVisitControlPdf(@RequestBody VisitControlRequest request) {
        byte[] pdfBytes = visitService.generatePdf(request);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"controle-visitas.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/visit-control/preview-pdf")
    @Operation(summary = "Visualizar PDF - Controle de Visitas")
    public ResponseEntity<byte[]> previewVisitControlPdf(@RequestBody VisitControlRequest request) {
        byte[] pdfBytes = visitService.generatePdf(request);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"controle-visitas.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/visit-control/generate-excel")
    @Operation(summary = "Gerar Excel - Controle de Visitas")
    public ResponseEntity<byte[]> generateVisitControlExcel(@RequestBody VisitControlRequest request) {
        byte[] excelBytes = visitService.generateExcel(request);
        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"controle-visitas.xlsx\"")
                .body(excelBytes);
    }

    // --- Manutenção de Veículos ---

    @PostMapping("/vehicle-maintenance/generate-pdf")
    @Operation(summary = "Gerar PDF - Manutenção de Veículos")
    public ResponseEntity<byte[]> generateVehicleMaintenancePdf(@RequestBody VehicleMaintenanceRequest request) {
        byte[] pdfBytes = maintenanceService.generatePdf(request);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"manutencao-veiculos.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/vehicle-maintenance/preview-pdf")
    @Operation(summary = "Visualizar PDF - Manutenção de Veículos")
    public ResponseEntity<byte[]> previewVehicleMaintenancePdf(@RequestBody VehicleMaintenanceRequest request) {
        byte[] pdfBytes = maintenanceService.generatePdf(request);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"manutencao-veiculos.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/vehicle-maintenance/generate-excel")
    @Operation(summary = "Gerar Excel - Manutenção de Veículos")
    public ResponseEntity<byte[]> generateVehicleMaintenanceExcel(@RequestBody VehicleMaintenanceRequest request) {
        byte[] excelBytes = maintenanceService.generateExcel(request);
        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"manutencao-veiculos.xlsx\"")
                .body(excelBytes);
    }

    // --- Guia de Transporte ---

    @org.springframework.beans.factory.annotation.Autowired
    private com.z7design.secured_guard.service.TransportGuideReportService transportService;

    @PostMapping("/transport-guide/generate-pdf")
    @Operation(summary = "Gerar PDF - Guia de Transporte")
    public ResponseEntity<byte[]> generateTransportGuidePdf(
            @RequestBody com.z7design.secured_guard.dto.TransportGuideRequest request) {
        byte[] pdfBytes = transportService.generatePdf(request);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"guia-transporte.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/transport-guide/preview-pdf")
    @Operation(summary = "Visualizar PDF - Guia de Transporte")
    public ResponseEntity<byte[]> previewTransportGuidePdf(
            @RequestBody com.z7design.secured_guard.dto.TransportGuideRequest request) {
        byte[] pdfBytes = transportService.generatePdf(request);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"guia-transporte.pdf\"")
                .body(pdfBytes);
    }

    @PostMapping("/transport-guide/generate-excel")
    @Operation(summary = "Gerar Excel - Guia de Transporte")
    public ResponseEntity<byte[]> generateTransportGuideExcel(
            @RequestBody com.z7design.secured_guard.dto.TransportGuideRequest request) {
        byte[] excelBytes = transportService.generateExcel(request);
        return ResponseEntity.ok()
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"guia-transporte.xlsx\"")
                .body(excelBytes);
    }
}
