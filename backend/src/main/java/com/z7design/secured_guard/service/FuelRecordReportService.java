package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.model.FuelRecord;
import com.z7design.secured_guard.repository.FuelRecordRepository;
import com.z7design.secured_guard.dto.FuelRecordReportDTO;
import com.z7design.secured_guard.repository.CostCenterRepository;
import com.z7design.secured_guard.model.CostCenter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.z7design.secured_guard.service.JasperReportService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuelRecordReportService {
    
    private final FuelRecordRepository fuelRecordRepository;
    private final CostCenterRepository costCenterRepository;
    private final JasperReportService jasperReportService;
    
    public byte[] generateExcelReport(LocalDate startDate, LocalDate endDate, UUID vehicleId, String posto, UUID driverId, String fuelType) throws IOException {
        log.info("Gerando relatório Excel de abastecimentos - Período: {} a {}, Veículo: {}, Posto: {}, Motorista: {}, Combustível: {}", 
                startDate, endDate, vehicleId, posto, driverId, fuelType);
        
        try {
            // Buscar dados filtrados
            List<FuelRecord> fuelRecords = getFuelRecordsFiltered(startDate, endDate, vehicleId, posto, driverId, fuelType);
            log.info("Dados obtidos: {} registros de abastecimento", fuelRecords.size());
            
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet("Relatório de Abastecimentos");
                log.debug("Planilha criada com sucesso");
                
                // Criar estilos
                CellStyle headerStyle = createHeaderStyle(workbook);
                CellStyle dateStyle = createDateStyle(workbook);
                CellStyle currencyStyle = createCurrencyStyle(workbook);
                CellStyle numberStyle = createNumberStyle(workbook);
                log.debug("Estilos criados com sucesso");
                
                // Criar cabeçalho
                createHeader(sheet, headerStyle);
                log.debug("Cabeçalho criado com sucesso");
                
                // Preencher dados
                fillData(sheet, fuelRecords, dateStyle, currencyStyle, numberStyle);
                log.debug("Dados preenchidos com sucesso");
                
                // Ajustar largura das colunas
                autoSizeColumns(sheet);
                log.debug("Colunas ajustadas com sucesso");
                
                // Criar linha de totais
                createTotalsRow(sheet, fuelRecords, currencyStyle, numberStyle);
                log.debug("Linha de totais criada com sucesso");
                
                // Converter para bytes
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                workbook.write(outputStream);
                byte[] result = outputStream.toByteArray();
                
                log.info("Relatório Excel gerado com sucesso. {} registros processados, {} bytes gerados", 
                        fuelRecords.size(), result.length);
                return result;
            }
        } catch (Exception e) {
            log.error("Erro ao gerar relatório Excel", e);
            throw new IOException("Erro ao gerar relatório Excel: " + e.getMessage(), e);
        }
    }
    
    @Transactional(readOnly = true)
    public byte[] generatePdfReport(LocalDate startDate, LocalDate endDate, UUID vehicleId, String posto, UUID driverId, String fuelType) throws IOException {
        log.info("Gerando relatório PDF de abastecimentos - Período: {} a {}, Veículo: {}, Posto: {}, Motorista: {}, Combustível: {}", 
                startDate, endDate, vehicleId, posto, driverId, fuelType);
        
        try {
            // Buscar dados filtrados
            List<FuelRecord> fuelRecords = getFuelRecordsFiltered(startDate, endDate, vehicleId, posto, driverId, fuelType);
            log.info("Dados obtidos: {} registros de abastecimento", fuelRecords.size());
            
            // Tentar usar JasperReports primeiro, se falhar usar iText como fallback
            try {
                // Converter para DTOs com nomes de centros de custo
                List<FuelRecordReportDTO> reportDTOs = fuelRecords.stream()
                        .map(this::convertToReportDTO)
                        .collect(Collectors.toList());
                
                log.info("DTOs convertidos: {} registros", reportDTOs.size());
                
                // Preparar filtros para o relatório
                String vehicleFilter = vehicleId != null ? "Veículo específico" : "Todos os veículos";
                String driverFilter = driverId != null ? "Motorista específico" : "Todos os motoristas";
                
                // Gerar PDF usando JasperReports
                byte[] result = jasperReportService.generateFuelReportPDF(
                        reportDTOs, 
                        startDate, 
                        endDate, 
                        vehicleFilter, 
                        driverFilter
                );
                
                log.info("Relatório PDF gerado com sucesso usando JasperReports. {} registros processados, {} bytes gerados", 
                        fuelRecords.size(), result.length);
                return result;
            } catch (Exception jasperException) {
                log.warn("Erro ao gerar PDF com JasperReports, usando iText como fallback: {}", jasperException.getMessage());
                // Fallback para iText
                return generatePdfReportWithIText(fuelRecords, startDate, endDate, vehicleId, posto, driverId, fuelType);
            }
            
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF", e);
            e.printStackTrace();
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }
    }
    
    private byte[] generatePdfReportWithIText(List<FuelRecord> fuelRecords, LocalDate startDate, LocalDate endDate, 
                                             UUID vehicleId, String posto, UUID driverId, String fuelType) throws IOException {
        log.info("Gerando relatório PDF de abastecimentos com iText - {} registros", fuelRecords.size());
        
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
            Paragraph title = new Paragraph("RELATÓRIO DE ABASTECIMENTOS")
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
            
            // Filtros aplicados
            if (startDate != null || endDate != null || vehicleId != null || posto != null || driverId != null || fuelType != null) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);
                
                if (startDate != null && endDate != null) {
                    document.add(new Paragraph("Período: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + 
                            " a " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10).setMarginBottom(2));
                }
                if (vehicleId != null) {
                    document.add(new Paragraph("Veículo: Específico").setFontSize(10).setMarginBottom(2));
                }
                if (posto != null && !posto.trim().isEmpty() && !"all".equals(posto)) {
                    document.add(new Paragraph("Posto: " + posto).setFontSize(10).setMarginBottom(2));
                }
                if (driverId != null) {
                    document.add(new Paragraph("Motorista: Específico").setFontSize(10).setMarginBottom(2));
                }
                if (fuelType != null && !fuelType.trim().isEmpty() && !"all".equals(fuelType)) {
                    document.add(new Paragraph("Combustível: " + getFuelTypeLabel(fuelType)).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }
            
            // Estatísticas
            BigDecimal totalCost = fuelRecords.stream()
                    .map(FuelRecord::getCost)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalQuantity = fuelRecords.stream()
                    .map(FuelRecord::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            Paragraph stats = new Paragraph(String.format(
                    "Total de registros: %d | Total de litros: %s L | Valor total: R$ %s",
                    fuelRecords.size(), 
                    totalQuantity.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ","),
                    totalCost.setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",")))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);
            
            // Tabela de abastecimentos
            if (fuelRecords.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum abastecimento encontrado com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(9).setWidth(UnitValue.createPercentValue(100));
                
                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Data"));
                table.addHeaderCell(createHeaderCell("Veículo"));
                table.addHeaderCell(createHeaderCell("Motorista"));
                table.addHeaderCell(createHeaderCell("Combustível"));
                table.addHeaderCell(createHeaderCell("Litros"));
                table.addHeaderCell(createHeaderCell("Valor/Litro"));
                table.addHeaderCell(createHeaderCell("Valor Total"));
                table.addHeaderCell(createHeaderCell("Posto"));
                table.addHeaderCell(createHeaderCell("Quilometragem"));
                
                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (FuelRecord record : fuelRecords) {
                    table.addCell(createCell(record.getDate() != null ? 
                            record.getDate().format(dateFormatter) : ""));
                    table.addCell(createCell(record.getVehicle() != null ? record.getVehicle().getPlate() : ""));
                    table.addCell(createCell(record.getDriver() != null ? record.getDriver().getName() : "Não informado"));
                    table.addCell(createCell(record.getFuelType() != null ? getFuelTypeLabel(record.getFuelType().toString()) : ""));
                    
                    // Litros
                    String quantity = record.getQuantity() != null ? 
                            record.getQuantity().setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",") + " L" : "";
                    table.addCell(createCell(quantity));
                    
                    // Valor por litro
                    String pricePerLiter = "";
                    if (record.getQuantity() != null && record.getCost() != null && 
                        record.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal price = record.getCost().divide(record.getQuantity(), 2, java.math.RoundingMode.HALF_UP);
                        pricePerLiter = "R$ " + price.toString().replace(".", ",");
                    }
                    table.addCell(createCell(pricePerLiter));
                    
                    // Valor total
                    String cost = record.getCost() != null ? 
                            "R$ " + record.getCost().setScale(2, java.math.RoundingMode.HALF_UP).toString().replace(".", ",") : "";
                    table.addCell(createCell(cost));
                    
                    table.addCell(createCell(record.getStation() != null ? record.getStation() : ""));
                    table.addCell(createCell(record.getMileage() != null ? record.getMileage().toString() + " km" : ""));
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
            log.error("Erro ao gerar PDF de abastecimentos com iText: {}", e.getMessage(), e);
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
        log.info("PDF de abastecimentos gerado com sucesso usando iText, tamanho: {} bytes", result.length);
        return result;
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
    
    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }
    
    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setTextAlignment(TextAlignment.LEFT);
    }
    
    private List<FuelRecord> getFuelRecordsFiltered(LocalDate startDate, LocalDate endDate, UUID vehicleId, String posto, UUID driverId, String fuelType) {
        log.debug("Aplicando filtros - startDate: {}, endDate: {}, vehicleId: {}, posto: {}, driverId: {}, fuelType: {}", 
                startDate, endDate, vehicleId, posto, driverId, fuelType);
        
        try {
            List<FuelRecord> records;
            
            // Aplicar filtros de data e veículo primeiro
            if (startDate != null && endDate != null) {
                if (vehicleId != null) {
                    records = fuelRecordRepository.findByVehicleIdAndDateBetween(vehicleId, startDate, endDate);
                } else {
                    records = fuelRecordRepository.findByDateBetween(startDate, endDate);
                }
            } else if (vehicleId != null) {
                records = fuelRecordRepository.findByVehicleId(vehicleId);
            } else {
                records = fuelRecordRepository.findAll();
            }
            
            // Aplicar filtros adicionais em memória (posto, motorista e combustível)
            if (posto != null && !posto.trim().isEmpty() && !"all".equals(posto)) {
                records = records.stream()
                        .filter(record -> record.getStation() != null && record.getStation().toLowerCase().contains(posto.toLowerCase()))
                        .collect(Collectors.toList());
            }
            
            if (driverId != null) {
                records = records.stream()
                        .filter(record -> record.getDriver() != null && record.getDriver().getId().equals(driverId))
                        .collect(Collectors.toList());
            }
            
            if (fuelType != null && !fuelType.trim().isEmpty() && !"all".equals(fuelType)) {
                records = records.stream()
                        .filter(record -> record.getFuelType() != null && record.getFuelType().toString().equalsIgnoreCase(fuelType))
                        .collect(Collectors.toList());
            }
            
            log.info("Filtros aplicados. {} registros encontrados", records.size());
            return records;
            
        } catch (Exception e) {
            log.error("Erro ao aplicar filtros nos registros de abastecimento", e);
            throw new RuntimeException("Erro ao buscar registros de abastecimento: " + e.getMessage(), e);
        }
    }
    
    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }
    
    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        style.setDataFormat(createHelper.createDataFormat().getFormat("dd/mm/yyyy"));
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        return style;
    }
    
    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        style.setDataFormat(createHelper.createDataFormat().getFormat("R$ #,##0.00"));
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        return style;
    }
    
    private CellStyle createNumberStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        style.setDataFormat(createHelper.createDataFormat().getFormat("#,##0.00"));
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        return style;
    }
    
    private void createHeader(Sheet sheet, CellStyle headerStyle) {
        Row headerRow = sheet.createRow(0);
        String[] headers = {
            "Data", "Veículo", "Motorista", "Posto", "Combustível", 
            "Litros", "Valor/Litro", "Valor Total", "Quilometragem", "Observações"
        };
        
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }
    
    private void fillData(Sheet sheet, List<FuelRecord> fuelRecords, CellStyle dateStyle, CellStyle currencyStyle, CellStyle numberStyle) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        int rowNum = 1;
        
        for (FuelRecord record : fuelRecords) {
            Row row = sheet.createRow(rowNum++);
            
            // Data
            Cell dateCell = row.createCell(0);
            dateCell.setCellValue(record.getDate().format(dateFormatter));
            dateCell.setCellStyle(dateStyle);
            
            // Veículo
            Cell vehicleCell = row.createCell(1);
            vehicleCell.setCellValue(record.getVehicle().getPlate() + " - " + 
                                   record.getVehicle().getBrand() + " " + 
                                   record.getVehicle().getModel());
            
            // Motorista
            Cell driverCell = row.createCell(2);
            driverCell.setCellValue(record.getDriver() != null ? record.getDriver().getName() : "N/A");
            
            // Posto
            Cell stationCell = row.createCell(3);
            stationCell.setCellValue(record.getStation());
            
            // Combustível
            Cell fuelTypeCell = row.createCell(4);
            fuelTypeCell.setCellValue(record.getFuelType().toString());
            
            // Litros
            Cell quantityCell = row.createCell(5);
            quantityCell.setCellValue(record.getQuantity().doubleValue());
            quantityCell.setCellStyle(numberStyle);
            
            // Valor por Litro
            Cell pricePerLiterCell = row.createCell(6);
            if (record.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
                double pricePerLiter = record.getCost().divide(record.getQuantity(), 2, java.math.RoundingMode.HALF_UP).doubleValue();
                pricePerLiterCell.setCellValue(pricePerLiter);
            } else {
                pricePerLiterCell.setCellValue(0.0);
            }
            pricePerLiterCell.setCellStyle(currencyStyle);
            
            // Valor Total
            Cell costCell = row.createCell(7);
            costCell.setCellValue(record.getCost().doubleValue());
            costCell.setCellStyle(currencyStyle);
            
            // Quilometragem
            Cell mileageCell = row.createCell(8);
            mileageCell.setCellValue(record.getMileage());
            mileageCell.setCellStyle(numberStyle);
            
            // Observações
            Cell notesCell = row.createCell(9);
            notesCell.setCellValue(record.getNotes() != null ? record.getNotes() : "");
        }
    }
    
    private void autoSizeColumns(Sheet sheet) {
        for (int i = 0; i < 10; i++) {
            sheet.autoSizeColumn(i);
        }
    }
    
    private void createTotalsRow(Sheet sheet, List<FuelRecord> fuelRecords, CellStyle currencyStyle, CellStyle numberStyle) {
        int lastRowNum = sheet.getLastRowNum() + 2; // Pular uma linha
        Row totalsRow = sheet.createRow(lastRowNum);
        
        // Label
        Cell labelCell = totalsRow.createCell(0);
        labelCell.setCellValue("TOTAIS:");
        
        // Total de Litros
        double totalLiters = fuelRecords.stream()
                .mapToDouble(record -> record.getQuantity().doubleValue())
                .sum();
        Cell totalLitersCell = totalsRow.createCell(5);
        totalLitersCell.setCellValue(totalLiters);
        totalLitersCell.setCellStyle(numberStyle);
        
        // Total de Custo
        double totalCost = fuelRecords.stream()
                .mapToDouble(record -> record.getCost().doubleValue())
                .sum();
        Cell totalCostCell = totalsRow.createCell(7);
        totalCostCell.setCellValue(totalCost);
        totalCostCell.setCellStyle(currencyStyle);
        
        // Quantidade de registros
        Cell countCell = totalsRow.createCell(9);
        countCell.setCellValue(fuelRecords.size() + " registros");
    }
    
    
    private FuelRecordReportDTO convertToReportDTO(FuelRecord fuelRecord) {
        String costCenterName = "-";
        
        if (fuelRecord.getCostCenter() != null && !fuelRecord.getCostCenter().trim().isEmpty()) {
            try {
                // Tentar buscar por ID primeiro
                UUID costCenterId = UUID.fromString(fuelRecord.getCostCenter());
                CostCenter costCenter = costCenterRepository.findById(costCenterId).orElse(null);
                if (costCenter != null) {
                    costCenterName = costCenter.getName();
                }
            } catch (IllegalArgumentException e) {
                // Se não for UUID, tentar buscar por código
                try {
                    CostCenter costCenter = costCenterRepository.findByCode(fuelRecord.getCostCenter()).orElse(null);
                    if (costCenter != null) {
                        costCenterName = costCenter.getName();
                    }
                } catch (Exception ex) {
                    log.warn("Não foi possível encontrar centro de custo para: {}", fuelRecord.getCostCenter());
                }
            }
        }
        
        return FuelRecordReportDTO.fromEntity(fuelRecord, costCenterName);
    }
}