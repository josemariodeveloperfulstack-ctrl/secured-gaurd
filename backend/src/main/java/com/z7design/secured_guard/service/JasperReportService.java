package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.FuelRecordReportDTO;
import com.z7design.secured_guard.dto.VehicleReportDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class JasperReportService {
    
    public byte[] generateFuelReportPDF(List<FuelRecordReportDTO> records, 
                                       LocalDate startDate, 
                                       LocalDate endDate, 
                                       String vehicleFilter, 
                                       String driverFilter) throws IOException {
        try {
            log.info("Gerando relatório PDF com JasperReports - {} registros", records.size());
            
            // Carregar template JRXML
            ClassPathResource resource = new ClassPathResource("reports/fuel-report.jrxml");
            InputStream templateStream = resource.getInputStream();
            
            // Compilar template
            JasperReport jasperReport = JasperCompileManager.compileReport(templateStream);
            log.debug("Template JRXML compilado com sucesso");
            
            // Preparar parâmetros
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("PERIOD", formatPeriod(startDate, endDate));
            parameters.put("GENERATION_DATE", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            parameters.put("TOTAL_RECORDS", records.size());
            
            // Calcular valor total
            BigDecimal totalCost = records.stream()
                    .map(FuelRecordReportDTO::getCost)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            parameters.put("TOTAL_COST", totalCost);
            
            parameters.put("VEHICLE_FILTER", vehicleFilter != null ? vehicleFilter : "Todos os veículos");
            parameters.put("DRIVER_FILTER", driverFilter != null ? driverFilter : "Todos os motoristas");
            
            log.debug("Parâmetros preparados: {}", parameters);
            
            // Preparar dados
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(records);
            
            // Gerar relatório
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
            log.debug("Relatório preenchido com sucesso");
            
            // Exportar para PDF
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            JasperExportManager.exportReportToPdfStream(jasperPrint, outputStream);
            
            byte[] result = outputStream.toByteArray();
            log.info("Relatório PDF gerado com sucesso usando JasperReports. {} registros processados, {} bytes gerados", 
                    records.size(), result.length);
            
            return result;
            
        } catch (JRException e) {
            log.error("Erro ao gerar relatório com JasperReports", e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Erro inesperado ao gerar relatório", e);
            throw new IOException("Erro inesperado ao gerar relatório PDF: " + e.getMessage(), e);
        }
    }
    
    public byte[] generateVehicleReportPDF(List<VehicleReportDTO> vehicles, String statusFilter) throws IOException {
        try {
            log.info("Gerando relatório PDF de veículos com JasperReports - {} veículos", vehicles.size());
            
            // Carregar template JRXML
            ClassPathResource resource = new ClassPathResource("reports/vehicle-report.jrxml");
            InputStream templateStream = resource.getInputStream();
            
            // Compilar template
            JasperReport jasperReport = JasperCompileManager.compileReport(templateStream);
            log.debug("Template JRXML de veículos compilado com sucesso");
            
            // Preparar parâmetros
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("GENERATION_DATE", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            parameters.put("TOTAL_VEHICLES", vehicles.size());
            
            // Calcular estatísticas por status
            long activeVehicles = vehicles.stream().filter(v -> "ACTIVE".equals(v.getStatus())).count();
            long maintenanceVehicles = vehicles.stream().filter(v -> "MAINTENANCE".equals(v.getStatus())).count();
            long inactiveVehicles = vehicles.stream().filter(v -> "INACTIVE".equals(v.getStatus())).count();
            
            parameters.put("ACTIVE_VEHICLES", (int) activeVehicles);
            parameters.put("MAINTENANCE_VEHICLES", (int) maintenanceVehicles);
            parameters.put("INACTIVE_VEHICLES", (int) inactiveVehicles);
            
            // Definir filtro aplicado
            if (statusFilter != null && !statusFilter.isEmpty()) {
                switch (statusFilter.toUpperCase()) {
                    case "ACTIVE":
                        parameters.put("FILTER_STATUS", "Apenas veículos ativos");
                        break;
                    case "MAINTENANCE":
                        parameters.put("FILTER_STATUS", "Apenas veículos em manutenção");
                        break;
                    case "INACTIVE":
                        parameters.put("FILTER_STATUS", "Apenas veículos inativos");
                        break;
                    default:
                        parameters.put("FILTER_STATUS", "Todos os veículos");
                }
            } else {
                parameters.put("FILTER_STATUS", "Todos os veículos");
            }
            
            log.debug("Parâmetros preparados: {}", parameters);
            
            // Preparar dados
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(vehicles);
            
            // Gerar relatório
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
            log.debug("Relatório de veículos preenchido com sucesso");
            
            // Exportar para PDF
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            JasperExportManager.exportReportToPdfStream(jasperPrint, outputStream);
            
            byte[] result = outputStream.toByteArray();
            log.info("Relatório PDF de veículos gerado com sucesso usando JasperReports. {} veículos processados, {} bytes gerados", 
                    vehicles.size(), result.length);
            
            return result;
            
        } catch (JRException e) {
            log.error("Erro ao gerar relatório de veículos com JasperReports", e);
            throw new IOException("Erro ao gerar relatório PDF de veículos: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Erro inesperado ao gerar relatório de veículos", e);
            throw new IOException("Erro inesperado ao gerar relatório PDF de veículos: " + e.getMessage(), e);
        }
    }
    
    private String formatPeriod(LocalDate startDate, LocalDate endDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        
        if (startDate != null && endDate != null) {
            return startDate.format(formatter) + " a " + endDate.format(formatter);
        } else if (startDate != null) {
            return "A partir de " + startDate.format(formatter);
        } else if (endDate != null) {
            return "Até " + endDate.format(formatter);
        } else {
            return "Todos os períodos";
        }
    }
}
