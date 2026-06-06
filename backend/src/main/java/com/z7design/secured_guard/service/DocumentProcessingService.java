package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.DocumentProcessingJob;
import com.z7design.secured_guard.model.ModeloDocumento;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.UnifiedDocument;
import com.z7design.secured_guard.repository.DocumentPageRepository;
import com.z7design.secured_guard.repository.DocumentProcessingJobRepository;
import com.z7design.secured_guard.repository.PaymentReceiptRepository;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.repository.UnifiedDocumentRepository;
import com.z7design.secured_guard.worker.IndexerWorker;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentProcessingService {
    
    private final DocumentProcessingJobRepository jobRepository;
    private final DocumentPageRepository documentPageRepository;
    private final PayslipRepository payslipRepository;
    private final PaymentReceiptRepository paymentReceiptRepository;
    private final UnifiedDocumentRepository unifiedDocumentRepository;
    private final StringRedisTemplate redisTemplate;

    /** Opcional no CI ({@code app.workers.enabled=false}) — injeção por campo evita falha no construtor. */
    @Autowired(required = false)
    private IndexerWorker indexerWorker;
    private static final String UPLOAD_DIR = "uploads/temp";
    private static final String STREAM_JOBS = "stream:jobs";
    
    /**
     * Obtém o diretório de upload, criando se necessário
     */
    private Path getUploadDirectory() throws IOException {
        // Tentar usar diretório temporário do sistema primeiro
        String tempDir = System.getProperty("java.io.tmpdir");
        Path uploadPath;
        
        if (tempDir != null && !tempDir.isEmpty()) {
            // Usar diretório temporário do sistema
            uploadPath = Paths.get(tempDir, UPLOAD_DIR).toAbsolutePath().normalize();
        } else {
            // Fallback para diretório de trabalho do projeto
            uploadPath = Paths.get(System.getProperty("user.dir"), UPLOAD_DIR).toAbsolutePath().normalize();
        }
        
        // Garantir que o diretório existe
        if (!Files.exists(uploadPath)) {
            try {
                Files.createDirectories(uploadPath);
                log.info("Diretório de upload criado: {}", uploadPath);
            } catch (IOException e) {
                log.error("Erro ao criar diretório de upload: {}", uploadPath, e);
                throw new IOException("Não foi possível criar o diretório de upload: " + uploadPath, e);
            }
        }
        
        // Validar que o diretório existe e é acessível
        if (!Files.isDirectory(uploadPath)) {
            throw new IOException("Caminho de upload não é um diretório: " + uploadPath);
        }
        
        if (!Files.isWritable(uploadPath)) {
            throw new IOException("Diretório de upload não é gravável: " + uploadPath);
        }
        
        return uploadPath;
    }
    
    /**
     * Calcula hash SHA-256 do arquivo
     */
    private String calculateFileHash(byte[] fileBytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(fileBytes);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Erro ao calcular hash do arquivo", e);
            return null;
        }
    }
    
    /**
     * Verifica se arquivo já foi processado (mesmo hash)
     * Retorna true se já foi processado e não precisa processar novamente
     */
    private boolean isFileAlreadyProcessed(String fileHash, String documentType) {
        if (fileHash == null || fileHash.isEmpty()) {
            return false; // Se não tem hash, processa
        }
        
        // Para HOLERITES, verificar na tabela payslips
        if ("HOLERITE".equals(documentType)) {
            List<Payslip> existing = payslipRepository.findByHashConteudo(fileHash);
            if (!existing.isEmpty()) {
                log.info("📋 Arquivo já foi processado anteriormente (hash: {}...). Encontrados {} payslip(s) com mesmo hash.", 
                    fileHash.substring(0, Math.min(16, fileHash.length())), existing.size());
                return true;
            }
        }
        // Para COMPROVANTES, verificar na tabela payment_receipts (se tiver hash)
        // TODO: Implementar quando necessário
        
        return false;
    }
    
    @Transactional
    public UUID createProcessingJob(MultipartFile file, String documentType) throws IOException {
        // Obter diretório de upload (cria se necessário)
        Path uploadPath = getUploadDirectory();
        
        // Sanitizar nome do arquivo para evitar problemas com caracteres especiais
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.trim().isEmpty()) {
            originalFileName = "documento.pdf";
        }
        // Remover caracteres inválidos do nome do arquivo (mantém apenas alfanuméricos, pontos, hífens e underscores)
        String sanitizedFileName = originalFileName.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        
        // Validar documentType
        if (documentType == null || documentType.trim().isEmpty()) {
            documentType = "HOLERITE"; // Default
        }
        documentType = documentType.toUpperCase();
        if (!documentType.equals("HOLERITE") && !documentType.equals("COMPROVANTE")) {
            throw new IllegalArgumentException("documentType deve ser 'HOLERITE' ou 'COMPROVANTE'");
        }
        
        // Calcular hash do arquivo ANTES de processar
        byte[] fileBytes = file.getBytes();
        String fileHash = calculateFileHash(fileBytes);
        log.info("🔐 Hash do arquivo calculado: {}... (tamanho: {} bytes)", 
            fileHash != null ? fileHash.substring(0, Math.min(16, fileHash.length())) : "null", fileBytes.length);
        
        // Verificar se arquivo já foi processado (mesmo hash = mesmo conteúdo)
        // IMPORTANTE: Por enquanto, vamos permitir reprocessamento para garantir que funciona
        // TODO: Reativar verificação de hash após confirmar que está funcionando corretamente
        /*
        if (isFileAlreadyProcessed(fileHash, documentType)) {
            log.info("⏭️ Arquivo '{}' já foi processado anteriormente. Não será processado novamente.", originalFileName);
            throw new IllegalArgumentException("Arquivo já foi processado anteriormente. Não há alterações para processar.");
        }
        */
        log.info("🔐 Hash do arquivo: {}... (verificação de duplicata temporariamente desabilitada para debug)", 
            fileHash != null ? fileHash.substring(0, Math.min(16, fileHash.length())) : "null");
        
        // Primeiro, criar e salvar o job no banco para obter o ID
        DocumentProcessingJob job = DocumentProcessingJob.builder()
            .fileName(file.getOriginalFilename())
            .filePath("") // Será atualizado depois
            .fileSize(file.getSize())
            .status(DocumentProcessingJob.JobStatus.QUEUED)
            .documentType(documentType)
            .build();
        
        // Salvar job no banco de dados primeiro para obter o ID gerado
        DocumentProcessingJob savedJob;
        UUID jobId;
        Path filePath;
        
        try {
            savedJob = jobRepository.saveAndFlush(job);
            jobId = savedJob.getId();
            log.info("Job {} criado no banco de dados com status: {}", jobId, savedJob.getStatus());
            
            // Agora salvar o arquivo usando o ID do job
            String fileName = jobId + "_" + sanitizedFileName;
            filePath = uploadPath.resolve(fileName);
            
            try {
                // Garantir que o arquivo não existe antes de salvar
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                }
                
                file.transferTo(filePath.toFile());
                log.info("Arquivo salvo temporariamente: {} (tamanho: {} bytes)", filePath, file.getSize());
                
                // Atualizar o job com o caminho do arquivo
                savedJob.setFilePath(filePath.toString());
                savedJob = jobRepository.saveAndFlush(savedJob);
                
            } catch (IOException e) {
                log.error("Erro ao salvar arquivo em: {}", filePath, e);
                // Marcar job como falho
                savedJob.setStatus(DocumentProcessingJob.JobStatus.FAILED);
                savedJob.setErrorMessage("Erro ao salvar arquivo: " + e.getMessage());
                jobRepository.saveAndFlush(savedJob);
                throw new IOException("Erro ao salvar arquivo: " + e.getMessage(), e);
            }
        } catch (Exception e) {
            if (e instanceof IOException) {
                throw e;
            }
            log.error("Erro ao salvar job no banco de dados", e);
            throw new IOException("Erro ao salvar job no banco de dados: " + e.getMessage(), e);
        }
        
        // Enfileirar no Redis Streams (incluindo hash para uso posterior)
        try {
            Map<String, String> fields = new HashMap<>();
            fields.put("jobId", jobId.toString());
            fields.put("filePath", filePath.toString());
            fields.put("fileName", file.getOriginalFilename());
            if (fileHash != null) {
                fields.put("fileHash", fileHash); // Incluir hash para uso nos workers
            }
            fields.put("documentType", documentType); // IMPORTANTE: Adicionar documentType
            fields.put("timestamp", String.valueOf(System.currentTimeMillis()));
            
            var messageId = redisTemplate.opsForStream().add(STREAM_JOBS, fields);
            log.info("Job {} enfileirado no Redis Streams com messageId: {} (documentType: {})", jobId, messageId, documentType);
            
            // Verificar se o Redis está funcionando
            if (messageId == null) {
                log.warn("ATENÇÃO: Redis Stream retornou null - verifique se o Redis está rodando!");
            }
        } catch (Exception e) {
            log.error("ERRO CRÍTICO ao enfileirar job {} no Redis Streams: {}", jobId, e.getMessage(), e);
            // Marcar job como falho se não conseguir enfileirar
            try {
                DocumentProcessingJob failedJob = jobRepository.findById(jobId).orElse(null);
                if (failedJob != null) {
                    failedJob.setStatus(DocumentProcessingJob.JobStatus.FAILED);
                    failedJob.setErrorMessage("Erro ao enfileirar no Redis: " + e.getMessage());
                    jobRepository.saveAndFlush(failedJob);
                }
            } catch (Exception ex) {
                log.error("Erro ao atualizar status do job após falha no Redis", ex);
            }
            throw new IOException("Erro ao enfileirar job no Redis Streams. Verifique se o Redis está rodando: " + e.getMessage(), e);
        }
        
        log.info("Job {} criado com sucesso. Arquivo: {}", jobId, filePath);
        return jobId;
    }
    
    public DocumentProcessingJob getJob(UUID jobId) {
        log.debug("Buscando job {} no banco de dados", jobId);
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.warn("Job {} não encontrado no banco de dados", jobId);
        } else {
            log.debug("Job {} encontrado: status={}, progress={}%", 
                jobId, job.getStatus(), job.getProgressPercentage());
        }
        return job;
    }
    
    public List<com.z7design.secured_guard.model.DocumentPage> getDocumentPagesByJobId(UUID jobId) {
        return documentPageRepository.findByJobId(jobId);
    }
    
    public List<com.z7design.secured_guard.model.Payslip> getPayslipsByJobId(UUID jobId) {
        // Buscar DocumentPages do job
        List<com.z7design.secured_guard.model.DocumentPage> pages = documentPageRepository.findByJobId(jobId);
        if (pages.isEmpty()) {
            return Collections.emptyList();
        }
        
        // Buscar payslips que correspondem aos DocumentPages
        List<com.z7design.secured_guard.model.Payslip> payslips = new ArrayList<>();
        for (com.z7design.secured_guard.model.DocumentPage page : pages) {
            if (page.getType() == com.z7design.secured_guard.model.DocumentPage.DocumentType.HOLERITE) {
                // Tentar encontrar payslip correspondente por CPF, mês e ano
                if (page.getCpf() != null && page.getPeriod() != null) {
                    Integer month = extractMonth(page.getPeriod());
                    Integer year = extractYear(page.getPeriod());
                    if (month != null && year != null) {
                        com.z7design.secured_guard.model.Payslip payslip = 
                            payslipRepository.findFirstByCpfAndMonthAndYear(page.getCpf(), month, year);
                        if (payslip != null && !payslips.contains(payslip)) {
                            payslips.add(payslip);
                        }
                    }
                }
            }
        }
        return payslips;
    }
    
    private Integer extractMonth(String period) {
        if (period == null || period.length() < 2) {
            return null;
        }
        try {
            String[] parts = period.split("/");
            if (parts.length >= 1) {
                return Integer.parseInt(parts[0]);
            }
        } catch (Exception e) {
            log.warn("Erro ao extrair mês do período: {}", period);
        }
        return null;
    }
    
    private Integer extractYear(String period) {
        if (period == null || period.length() < 4) {
            return null;
        }
        try {
            String[] parts = period.split("/");
            if (parts.length >= 2) {
                return Integer.parseInt(parts[1]);
            }
        } catch (Exception e) {
            log.warn("Erro ao extrair ano do período: {}", period);
        }
        return null;
    }
    
    public String getDownloadUrl(UUID unifiedDocumentId) {
        if (indexerWorker != null) {
            String cachedUrl = indexerWorker.getCachedDownloadUrl(unifiedDocumentId);
            if (cachedUrl != null) {
                return cachedUrl;
            }
        }
        
        // Se não encontrar no cache, buscar do banco
        UnifiedDocument unifiedDocument = unifiedDocumentRepository.findById(unifiedDocumentId).orElse(null);
        if (unifiedDocument != null && unifiedDocument.getFilePath() != null) {
            // Cachear para próximas requisições
            if (unifiedDocument.getFilePath().startsWith("s3://") || unifiedDocument.getFilePath().startsWith("local://")) {
                return unifiedDocument.getFilePath();
            }
        }
        
        return null;
    }
    
    /**
     * Método de compatibilidade para ModeloDocumentoService
     * Processa um arquivo e retorna o resultado da extração
     */
    public ProcessamentoResultado processarArquivo(byte[] fileBytes, String fileName) {
        ProcessamentoResultado resultado = new ProcessamentoResultado();
        
        try {
            // Determinar tipo de arquivo
            ModeloDocumento.TipoArquivo tipoArquivo = determinarTipoArquivo(fileName);
            resultado.setTipoArquivo(tipoArquivo);
            
            // Extrair conteúdo baseado no tipo
            String conteudoExtraido = "";
            if (tipoArquivo == ModeloDocumento.TipoArquivo.PDF) {
                conteudoExtraido = extrairTextoPdf(fileBytes);
            } else if (tipoArquivo == ModeloDocumento.TipoArquivo.DOCX) {
                // Para DOCX/DOC, retornar texto vazio por enquanto
                // Pode ser implementado com Apache POI se necessário
                conteudoExtraido = "";
                log.warn("Extração de texto de DOCX/DOC não implementada para: {}", fileName);
            }
            
            resultado.setConteudoExtraido(conteudoExtraido);
            resultado.setExtraivel(!conteudoExtraido.isEmpty());
            
            // Extrair placeholders do conteúdo
            List<String> placeholders = extrairPlaceholders(conteudoExtraido);
            resultado.setPlaceholders(placeholders);
            
        } catch (Exception e) {
            log.error("Erro ao processar arquivo: {}", fileName, e);
            resultado.setTipoArquivo(ModeloDocumento.TipoArquivo.PDF); // Default
            resultado.setConteudoExtraido("");
            resultado.setExtraivel(false);
            resultado.setPlaceholders(new ArrayList<>());
        }
        
        return resultado;
    }
    
    private ModeloDocumento.TipoArquivo determinarTipoArquivo(String fileName) {
        if (fileName == null) {
            return ModeloDocumento.TipoArquivo.PDF; // Default
        }
        String lowerName = fileName.toLowerCase();
        if (lowerName.endsWith(".pdf")) {
            return ModeloDocumento.TipoArquivo.PDF;
        } else if (lowerName.endsWith(".docx")) {
            return ModeloDocumento.TipoArquivo.DOCX;
        } else if (lowerName.endsWith(".doc")) {
            return ModeloDocumento.TipoArquivo.DOCX; // Tratar DOC como DOCX
        }
        return ModeloDocumento.TipoArquivo.PDF; // Default
    }
    
    private String extrairTextoPdf(byte[] pdfBytes) throws IOException {
        try (ByteArrayInputStream bis = new ByteArrayInputStream(pdfBytes);
             PDDocument document = PDDocument.load(bis)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }
    
    private List<String> extrairPlaceholders(String texto) {
        List<String> placeholders = new ArrayList<>();
        if (texto == null || texto.isEmpty()) {
            return placeholders;
        }
        
        // Padrão para encontrar placeholders como {{nome}}, {{cpf}}, etc.
        Pattern pattern = Pattern.compile("\\{\\{([^}]+)\\}\\}");
        Matcher matcher = pattern.matcher(texto);
        
        while (matcher.find()) {
            String placeholder = matcher.group(1).trim();
            if (!placeholders.contains(placeholder)) {
                placeholders.add(placeholder);
            }
        }
        
        return placeholders;
    }
    
    /**
     * Classe de resultado para processamento de arquivos
     * Usada para compatibilidade com ModeloDocumentoService
     */
    @Data
    @AllArgsConstructor
    public static class ProcessamentoResultado {
        private ModeloDocumento.TipoArquivo tipoArquivo;
        private String conteudoExtraido;
        private boolean extraivel;
        private List<String> placeholders;
        
        public ProcessamentoResultado() {
            this.tipoArquivo = ModeloDocumento.TipoArquivo.PDF;
            this.conteudoExtraido = "";
            this.extraivel = false;
            this.placeholders = new ArrayList<>();
        }
    }
    
    // Métodos de contagem para diagnóstico
    public long countAllJobs() {
        return jobRepository.count();
    }
    
    public long countJobsByStatus(String status) {
        try {
            DocumentProcessingJob.JobStatus jobStatus = DocumentProcessingJob.JobStatus.valueOf(status);
            return jobRepository.countByStatus(jobStatus);
        } catch (IllegalArgumentException e) {
            return 0;
        }
    }
    
    public long countAllDocumentPages() {
        return documentPageRepository.count();
    }
    
    public long countDocumentPagesByType(String type) {
        try {
            com.z7design.secured_guard.model.DocumentPage.DocumentType docType = 
                com.z7design.secured_guard.model.DocumentPage.DocumentType.valueOf(type);
            return documentPageRepository.countByType(docType);
        } catch (IllegalArgumentException e) {
            return 0;
        }
    }
    
    public long countDocumentPagesByStatus(String status) {
        try {
            com.z7design.secured_guard.model.DocumentPage.DocumentPageStatus pageStatus = 
                com.z7design.secured_guard.model.DocumentPage.DocumentPageStatus.valueOf(status);
            return documentPageRepository.countByStatus(pageStatus);
        } catch (IllegalArgumentException e) {
            return 0;
        }
    }
    
    public long countAllPayslips() {
        return payslipRepository.count();
    }
    
    public long countAllPaymentReceipts() {
        return paymentReceiptRepository.count();
    }
}
