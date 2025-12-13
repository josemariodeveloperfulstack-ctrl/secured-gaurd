package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.VehicleReportDTO;
import com.z7design.secured_guard.model.Vehicle;
import com.z7design.secured_guard.model.Vehicle.VehicleStatus;
import com.z7design.secured_guard.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleReportService {
    
    private final VehicleRepository vehicleRepository;
    private final JasperReportService jasperReportService;
    
    @Transactional(readOnly = true)
    public byte[] generateVehicleReportPDF(String statusFilter) throws IOException {
        log.info("Gerando relatório PDF de veículos - Filtro: {}", statusFilter);
        
        try {
            // Buscar veículos com filtro de status
            List<Vehicle> vehicles = getVehiclesFiltered(statusFilter);
            log.info("Dados obtidos: {} veículos", vehicles.size());
            
            // Tentar usar JasperReports primeiro, se falhar usar iText como fallback
            try {
                // Converter para DTOs
                List<VehicleReportDTO> reportDTOs = vehicles.stream()
                        .map(VehicleReportDTO::fromEntity)
                        .collect(Collectors.toList());
                
                log.info("DTOs convertidos: {} veículos", reportDTOs.size());
                
                // Gerar PDF usando JasperReports
                byte[] result = jasperReportService.generateVehicleReportPDF(reportDTOs, statusFilter);
                
                log.info("Relatório PDF de veículos gerado com sucesso usando JasperReports. {} veículos processados, {} bytes gerados", 
                        vehicles.size(), result.length);
                return result;
            } catch (Exception jasperException) {
                log.warn("Erro ao gerar PDF com JasperReports, usando iText como fallback: {}", jasperException.getMessage());
                // Fallback para iText
                return generateVehicleReportPDFWithIText(vehicles, statusFilter);
            }
            
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de veículos", e);
            e.printStackTrace();
            throw new IOException("Erro ao gerar relatório PDF de veículos: " + e.getMessage(), e);
        }
    }
    
    private byte[] generateVehicleReportPDFWithIText(List<Vehicle> vehicles, String statusFilter) throws IOException {
        log.info("Gerando relatório PDF de veículos com iText - {} veículos", vehicles.size());
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = null;
        PdfDocument pdfDoc = null;
        Document document = null;
        
        try {
            writer = new PdfWriter(baos);
            pdfDoc = new PdfDocument(writer);
            document = new Document(pdfDoc);
            document.setMargins(50, 50, 50, 50);
            
            // Cabeçalho da empresa
            Paragraph companyHeader = new Paragraph("PROMOVER VIGILÂNCIA PATRIMONIAL LTDA")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(16)
                    .setBold()
                    .setMarginBottom(5);
            document.add(companyHeader);
            
            Paragraph companyInfo = new Paragraph("CNPJ: 43.576.260/0001-12")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(10)
                    .setMarginBottom(20);
            document.add(companyInfo);
            
            // Título
            Paragraph title = new Paragraph("RELATÓRIO DE VEÍCULOS")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(18)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(20);
            document.add(title);
            
            // Informações do relatório
            Paragraph reportInfo = new Paragraph("Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10)
                    .setMarginBottom(10);
            document.add(reportInfo);
            
            // Filtro aplicado
            if (statusFilter != null && !statusFilter.isEmpty()) {
                String filterText = getFilterStatusText(statusFilter);
                document.add(new Paragraph("Filtro aplicado: " + filterText).setFontSize(10).setMarginBottom(10));
            }
            
            // Estatísticas
            long activeVehicles = vehicles.stream().filter(v -> v.getStatus() == VehicleStatus.ACTIVE).count();
            long maintenanceVehicles = vehicles.stream().filter(v -> v.getStatus() == VehicleStatus.MAINTENANCE).count();
            long inactiveVehicles = vehicles.stream().filter(v -> v.getStatus() == VehicleStatus.INACTIVE).count();
            
            Paragraph stats = new Paragraph(String.format(
                    "Total de veículos: %d | Ativos: %d | Em Manutenção: %d | Inativos: %d",
                    vehicles.size(), activeVehicles, maintenanceVehicles, inactiveVehicles))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);
            
            // Tabela de veículos
            if (vehicles.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum veículo encontrado com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(8).setWidth(UnitValue.createPercentValue(100));
                
                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Placa"));
                table.addHeaderCell(createHeaderCell("Marca/Modelo"));
                table.addHeaderCell(createHeaderCell("Ano"));
                table.addHeaderCell(createHeaderCell("Combustível"));
                table.addHeaderCell(createHeaderCell("Quilometragem"));
                table.addHeaderCell(createHeaderCell("Capacidade"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Data Cadastro"));
                
                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Vehicle vehicle : vehicles) {
                    table.addCell(createCell(vehicle.getPlate() != null ? vehicle.getPlate() : ""));
                    String brandModel = (vehicle.getBrand() != null ? vehicle.getBrand() : "") + 
                                      (vehicle.getModel() != null ? " / " + vehicle.getModel() : "");
                    table.addCell(createCell(brandModel));
                    table.addCell(createCell(vehicle.getYear() != null ? vehicle.getYear().toString() : ""));
                    table.addCell(createCell(vehicle.getFuelType() != null ? getFuelTypeLabel(vehicle.getFuelType().toString()) : ""));
                    
                    // Formatar quilometragem (ex: 216.000 km)
                    String mileage = vehicle.getCurrentMileage() != null ? 
                            String.format("%,d km", vehicle.getCurrentMileage()).replace(",", ".") : "";
                    table.addCell(createCell(mileage));
                    
                    table.addCell(createCell(vehicle.getCapacity() != null ? vehicle.getCapacity().toString() + " L" : ""));
                    table.addCell(createCell(vehicle.getStatus() != null ? getStatusLabel(vehicle.getStatus()) : ""));
                    table.addCell(createCell(vehicle.getCreatedAt() != null ? 
                            vehicle.getCreatedAt().format(dateFormatter) : ""));
                }
                
                document.add(table);
            }
            
            // Rodapé
            Paragraph footer = new Paragraph("Documento gerado automaticamente pelo sistema Secured Guard")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(8)
                    .setMarginTop(30);
            document.add(footer);
            
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de veículos com iText: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        } finally {
            if (document != null) {
                document.close();
            }
            if (pdfDoc != null) {
                pdfDoc.close();
            }
            if (writer != null) {
                writer.close();
            }
        }
        
        byte[] result = baos.toByteArray();
        log.info("PDF de veículos gerado com sucesso usando iText, tamanho: {} bytes", result.length);
        return result;
    }
    
    private String getFilterStatusText(String statusFilter) {
        if (statusFilter == null || statusFilter.isEmpty()) {
            return "Todos os veículos";
        }
        switch (statusFilter.toUpperCase()) {
            case "ACTIVE": return "Apenas veículos ativos";
            case "MAINTENANCE": return "Apenas veículos em manutenção";
            case "INACTIVE": return "Apenas veículos inativos";
            default: return "Todos os veículos";
        }
    }
    
    private String getStatusLabel(VehicleStatus status) {
        if (status == null) return "";
        switch (status) {
            case ACTIVE: return "Ativo";
            case MAINTENANCE: return "Em Manutenção";
            case INACTIVE: return "Inativo";
            default: return status.toString();
        }
    }
    
    private String getFuelTypeLabel(String fuelType) {
        if (fuelType == null) return "";
        switch (fuelType.toUpperCase()) {
            case "GASOLINE": return "Gasolina";
            case "ETHANOL": return "Etanol";
            case "DIESEL": return "Diesel";
            case "FLEX": return "Flex";
            default: return fuelType;
        }
    }
    
    private Cell createHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }
    
    private Cell createCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setTextAlignment(TextAlignment.LEFT);
    }
    
    private List<Vehicle> getVehiclesFiltered(String statusFilter) {
        log.debug("Aplicando filtro de status: {}", statusFilter);
        
        if (statusFilter != null && !statusFilter.isEmpty()) {
            try {
                VehicleStatus status = VehicleStatus.valueOf(statusFilter.toUpperCase());
                return vehicleRepository.findByStatus(status);
            } catch (IllegalArgumentException e) {
                log.warn("Status inválido fornecido: {}. Retornando todos os veículos.", statusFilter);
                return vehicleRepository.findAll();
            }
        } else {
            return vehicleRepository.findAll();
        }
    }
}
