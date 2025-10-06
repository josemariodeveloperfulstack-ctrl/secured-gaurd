package com.z7design.secured_guard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Serviço para unir holerites e comprovantes em um único PDF
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PdfMergeService {

    private static final String MERGE_DIR = "uploads/merged-documents/";
    private static final String DATE_FORMAT = "yyyy-MM-dd_HH-mm-ss";

    /**
     * Une um holerite e um comprovante em um único PDF
     * 
     * @param payslipFile Arquivo do holerite
     * @param receiptFile Arquivo do comprovante
     * @param employeeName Nome do funcionário
     * @param month Mês de referência
     * @param year Ano de referência
     * @return Caminho do arquivo unificado
     */
    public String mergePayslipAndReceipt(MultipartFile payslipFile, MultipartFile receiptFile, 
                                       String employeeName, Integer month, Integer year) throws IOException {
        
        log.info("🔄 Iniciando união de holerite e comprovante para: {} - {}/{}", employeeName, month, year);
        
        // Criar diretório se não existir
        Path mergePath = Paths.get(MERGE_DIR);
        if (!Files.exists(mergePath)) {
            Files.createDirectories(mergePath);
            log.info("📁 Diretório criado: {}", mergePath.toAbsolutePath());
        }

        // Gerar nome do arquivo unificado
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern(DATE_FORMAT));
        String fileName = String.format("%s_%s_%d_%d_merged.pdf", 
            employeeName.replaceAll("\\s+", "_"), timestamp, year, month);
        
        Path outputPath = mergePath.resolve(fileName);
        
        try {
            // Criar o merger
            PDFMergerUtility merger = new PDFMergerUtility();
            
            // Adicionar holerite (primeiro)
            log.info("📄 Adicionando holerite ao merge...");
            try (ByteArrayInputStream payslipStream = new ByteArrayInputStream(payslipFile.getBytes())) {
                merger.addSource(payslipStream);
            }
            
            // Adicionar comprovante (segundo)
            log.info("📄 Adicionando comprovante ao merge...");
            try (ByteArrayInputStream receiptStream = new ByteArrayInputStream(receiptFile.getBytes())) {
                merger.addSource(receiptStream);
            }
            
            // Definir destino
            merger.setDestinationFileName(outputPath.toString());
            
            // Realizar o merge
            log.info("🔄 Realizando merge dos documentos...");
            merger.mergeDocuments(null);
            
            log.info("✅ Merge concluído com sucesso! Arquivo salvo em: {}", outputPath.toString());
            
            return outputPath.toString();
            
        } catch (IOException e) {
            log.error("❌ Erro ao realizar merge dos documentos: {}", e.getMessage());
            throw new IOException("Erro ao unir holerite e comprovante: " + e.getMessage(), e);
        }
    }

    /**
     * Une múltiplos documentos em um único PDF
     * 
     * @param files Lista de arquivos para unir
     * @param employeeName Nome do funcionário
     * @param month Mês de referência
     * @param year Ano de referência
     * @return Caminho do arquivo unificado
     */
    public String mergeMultipleDocuments(MultipartFile[] files, String employeeName, 
                                       Integer month, Integer year) throws IOException {
        
        log.info("🔄 Iniciando união de {} documentos para: {} - {}/{}", 
            files.length, employeeName, month, year);
        
        if (files.length < 2) {
            throw new IllegalArgumentException("É necessário pelo menos 2 arquivos para unir");
        }
        
        // Criar diretório se não existir
        Path mergePath = Paths.get(MERGE_DIR);
        if (!Files.exists(mergePath)) {
            Files.createDirectories(mergePath);
        }

        // Gerar nome do arquivo unificado
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern(DATE_FORMAT));
        String fileName = String.format("%s_%s_%d_%d_merged.pdf", 
            employeeName.replaceAll("\\s+", "_"), timestamp, year, month);
        
        Path outputPath = mergePath.resolve(fileName);
        
        try {
            PDFMergerUtility merger = new PDFMergerUtility();
            
            // Adicionar todos os arquivos
            for (int i = 0; i < files.length; i++) {
                log.info("📄 Adicionando documento {} ao merge...", i + 1);
                try (ByteArrayInputStream fileStream = new ByteArrayInputStream(files[i].getBytes())) {
                    merger.addSource(fileStream);
                }
            }
            
            // Definir destino e realizar merge
            merger.setDestinationFileName(outputPath.toString());
            merger.mergeDocuments(null);
            
            log.info("✅ Merge de {} documentos concluído! Arquivo salvo em: {}", 
                files.length, outputPath.toString());
            
            return outputPath.toString();
            
        } catch (IOException e) {
            log.error("❌ Erro ao realizar merge dos documentos: {}", e.getMessage());
            throw new IOException("Erro ao unir documentos: " + e.getMessage(), e);
        }
    }

    /**
     * Valida se os arquivos são PDFs válidos
     */
    public void validatePdfFiles(MultipartFile[] files) throws IllegalArgumentException {
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                throw new IllegalArgumentException("Arquivo não pode estar vazio");
            }
            
            if (!"application/pdf".equals(file.getContentType())) {
                throw new IllegalArgumentException("Todos os arquivos devem ser PDFs");
            }
            
            // Validar tamanho (máximo 10MB por arquivo)
            if (file.getSize() > 10 * 1024 * 1024) {
                throw new IllegalArgumentException("Arquivo muito grande. Máximo 10MB por arquivo");
            }
        }
    }

    /**
     * Cria um PDF unificado em memória (retorna bytes)
     */
    public byte[] mergePdfToBytes(MultipartFile[] files) throws IOException {
        log.info("🔄 Criando PDF unificado em memória com {} arquivos", files.length);
        
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PDFMergerUtility merger = new PDFMergerUtility();
            
            // Adicionar todos os arquivos
            for (MultipartFile file : files) {
                try (ByteArrayInputStream fileStream = new ByteArrayInputStream(file.getBytes())) {
                    merger.addSource(fileStream);
                }
            }
            
            // Realizar merge em memória
            merger.setDestinationStream(outputStream);
            merger.mergeDocuments(null);
            
            log.info("✅ PDF unificado criado em memória com {} bytes", outputStream.size());
            return outputStream.toByteArray();
            
        } catch (IOException e) {
            log.error("❌ Erro ao criar PDF unificado em memória: {}", e.getMessage());
            throw new IOException("Erro ao unir documentos em memória: " + e.getMessage(), e);
        }
    }
}
