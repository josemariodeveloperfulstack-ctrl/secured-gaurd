package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.MeasurementBulletin;
import com.z7design.secured_guard.repository.MeasurementBulletinRepository;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeasurementReportService {
    
    private final MeasurementBulletinRepository bulletinRepository;
    
    /**
     * Gera PDF de teste simples usando iText
     */
    public byte[] generateTestPDF() throws IOException {
        log.info("Gerando PDF de teste simples usando iText");
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = null;
        PdfDocument pdfDoc = null;
        Document document = null;
        
        try {
            writer = new PdfWriter(baos);
            pdfDoc = new PdfDocument(writer);
            document = new Document(pdfDoc);
            
            // Título
            Paragraph title = new Paragraph("TESTE DE GERAÇÃO DE PDF")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(20)
                    .setBold();
            document.add(title);
            
            // Conteúdo de teste
            Paragraph content = new Paragraph("Este é um PDF de teste gerado pelo sistema.")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20);
            document.add(content);
            
            Paragraph date = new Paragraph("Gerado em: " + java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(10)
                    .setMarginTop(10);
            document.add(date);
            
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de teste: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar PDF de teste: " + e.getMessage(), e);
        } finally {
            // Fechar recursos na ordem correta
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
        log.info("PDF de teste gerado com sucesso usando iText, tamanho: {} bytes", result.length);
        return result;
    }
    
    /**
     * Gera PDF de um boletim específico com informações completas
     */
    public byte[] generateBulletinPDF(UUID bulletinId) throws IOException {
        log.info("Gerando PDF para boletim: {} com informações completas", bulletinId);
        
        // Buscar o boletim no banco de dados
        MeasurementBulletin bulletin = bulletinRepository.findById(bulletinId)
                .orElseThrow(() -> new RuntimeException("Boletim não encontrado: " + bulletinId));
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = null;
        PdfDocument pdfDoc = null;
        Document document = null;
        
        try {
            writer = new PdfWriter(baos);
            pdfDoc = new PdfDocument(writer);
            document = new Document(pdfDoc);
            
            // Cabeçalho da empresa
            Paragraph companyHeader = new Paragraph("Promover Vigilância & Serviços")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(16)
                    .setBold();
            document.add(companyHeader);
            
            // Título
            Paragraph title = new Paragraph("BOLETIM DE MEDIÇÃO")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(18)
                    .setBold()
                    .setMarginTop(20);
            document.add(title);
            
            // Informações do contrato
            Paragraph contractInfo = new Paragraph("Nº Contrato: " + (bulletin.getContractNumber() != null ? bulletin.getContractNumber() : "N/A"))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12)
                    .setMarginTop(20);
            document.add(contractInfo);
            
            // Período
            String period = formatPeriod(bulletin.getPeriodStart(), bulletin.getPeriodEnd());
            Paragraph periodInfo = new Paragraph("Período: " + period)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12);
            document.add(periodInfo);
            
            // Empresa
            Paragraph companyInfo = new Paragraph("Empresa: " + (bulletin.getCompanyName() != null ? bulletin.getCompanyName() : "N/A"))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(12);
            document.add(companyInfo);
            
            // Tabela de itens
            if (bulletin.getItems() != null && !bulletin.getItems().isEmpty()) {
                document.add(new Paragraph("").setMarginTop(30));
                
                // Cabeçalho da tabela
                Table table = new Table(7).setWidth(UnitValue.createPercentValue(100));
                
                // Cabeçalhos
                table.addCell(createHeaderCell("Item"));
                table.addCell(createHeaderCell("Código"));
                table.addCell(createHeaderCell("Descrição"));
                table.addCell(createHeaderCell("Unidade"));
                table.addCell(createHeaderCell("Quantidade"));
                table.addCell(createHeaderCell("Preço Un."));
                table.addCell(createHeaderCell("Valor Total"));
                
                // Dados dos itens
                for (var item : bulletin.getItems()) {
                    table.addCell(createCell(String.valueOf(item.getItemNumber() != null ? item.getItemNumber() : "")));
                    table.addCell(createCell(item.getCode() != null ? item.getCode() : ""));
                    table.addCell(createCell(item.getDescription() != null ? item.getDescription() : ""));
                    table.addCell(createCell(item.getUnit() != null ? item.getUnit() : ""));
                    table.addCell(createCell(String.valueOf(item.getQuantity() != null ? item.getQuantity() : "")));
                    table.addCell(createCell(formatCurrency(item.getUnitPrice())));
                    table.addCell(createCell(formatCurrency(item.getTotalValue())));
                }
                
                document.add(table);
            }
            
            // Subtotal
            Paragraph subtotal = new Paragraph("Subtotal: " + formatCurrency(bulletin.getSubtotal()))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(14)
                    .setBold()
                    .setMarginTop(20);
            document.add(subtotal);
            
            // Seções de assinatura
            document.add(new Paragraph("").setMarginTop(40));
            
            Paragraph signature1 = new Paragraph("ELABORADO/APROVADO POR:")
                    .setFontSize(12)
                    .setBold();
            document.add(signature1);
            
            Paragraph signature1Line = new Paragraph("________________________________")
                    .setMarginTop(5);
            document.add(signature1Line);
            
            Paragraph signature1Value = new Paragraph(bulletin.getElaboratedBy() != null ? bulletin.getElaboratedBy() : "")
                    .setMarginTop(10);
            document.add(signature1Value);
            
            document.add(new Paragraph("").setMarginTop(20));
            
            Paragraph signature2 = new Paragraph("RESPONSÁVEL PELA MEDIÇÃO:")
                    .setFontSize(12)
                    .setBold();
            document.add(signature2);
            
            Paragraph signature2Line = new Paragraph("________________________________")
                    .setMarginTop(5);
            document.add(signature2Line);
            
            Paragraph signature2Value = new Paragraph(bulletin.getMeasuredBy() != null ? bulletin.getMeasuredBy() : "")
                    .setMarginTop(10);
            document.add(signature2Value);
            
            // Data de geração
            Paragraph generatedDate = new Paragraph("Gerado em: " + java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(10)
                    .setMarginTop(40);
            document.add(generatedDate);
            
        } catch (Exception e) {
            log.error("Erro ao gerar PDF para boletim {}: {}", bulletinId, e.getMessage(), e);
            throw new IOException("Erro ao gerar PDF: " + e.getMessage(), e);
        } finally {
            // Fechar recursos na ordem correta
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
        log.info("PDF gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }
    
    // Métodos auxiliares
    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text)
                        .setBold()
                        .setTextAlignment(TextAlignment.CENTER));
    }
    
    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "")
                        .setTextAlignment(TextAlignment.CENTER));
    }
    
    private String formatCurrency(BigDecimal value) {
        if (value == null) return "R$ 0,00";
        return String.format("R$ %.2f", value).replace(".", ",");
    }
    
    private String formatPeriod(LocalDate start, LocalDate end) {
        if (start == null || end == null) return "N/A";
        return start.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " a " + 
               end.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }
    
    /**
     * Gera Excel de um boletim específico (temporariamente desabilitado)
     */
    public byte[] generateBulletinExcel(UUID bulletinId) throws IOException {
        log.info("Excel não implementado ainda para boletim: {}", bulletinId);
        throw new IOException("Geração de Excel temporariamente não disponível");
    }
    
    /**
     * Gera PDFs em lote (temporariamente desabilitado)
     */
    public byte[] generateBulkBulletinsPDF(List<UUID> bulletinIds) throws IOException {
        log.info("PDF em lote não implementado ainda para {} boletins", bulletinIds.size());
        throw new IOException("Geração de PDF em lote temporariamente não disponível");
    }
    
    /**
     * Gera Excel em lote (temporariamente desabilitado)
     */
    public byte[] generateBulkBulletinsExcel(List<UUID> bulletinIds) throws IOException {
        log.info("Excel em lote não implementado ainda para {} boletins", bulletinIds.size());
        throw new IOException("Geração de Excel em lote temporariamente não disponível");
    }
}