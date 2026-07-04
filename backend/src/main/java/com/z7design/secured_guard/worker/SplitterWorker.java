package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.model.DocumentProcessingJob;
import com.z7design.secured_guard.repository.DocumentProcessingJobRepository;
import com.z7design.secured_guard.service.MinIOService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import com.z7design.secured_guard.config.WorkerComponent;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@WorkerComponent
@RequiredArgsConstructor
public class SplitterWorker {
    
    private final StringRedisTemplate redisTemplate;
    private final DocumentProcessingJobRepository jobRepository;
    private final MinIOService minIOService;
    
    private static final String STREAM_JOBS = "stream:jobs";
    private static final String STREAM_PAGES = "stream:pages";
    private static final String CONSUMER_GROUP = "splitter-group";
    private static final String CONSUMER_NAME = "splitter-worker-1";
    private static final int DPI = 150; // Reduzido de 400 para 150 para otimizar memória (suficiente para OCR do Gemini)
    
    @PostConstruct
    public void init() {
        // Log imediato para confirmar que o método foi chamado
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("🟢 SPLITTER WORKER: @PostConstruct CHAMADO!");
        System.out.println("═══════════════════════════════════════════════════════════");
        
        log.info("═══════════════════════════════════════════════════════════");
        log.info("🟢 SPLITTER WORKER: Iniciando inicialização...");
        log.info("═══════════════════════════════════════════════════════════");
        
        try {
            // Verificar se as dependências estão injetadas
            if (redisTemplate == null) {
                log.error("❌ SPLITTER WORKER: StringRedisTemplate NÃO FOI INJETADO!");
                System.out.println("❌ SPLITTER WORKER: StringRedisTemplate NÃO FOI INJETADO!");
                return;
            }
            
            if (jobRepository == null) {
                log.error("❌ SPLITTER WORKER: DocumentProcessingJobRepository NÃO FOI INJETADO!");
                System.out.println("❌ SPLITTER WORKER: DocumentProcessingJobRepository NÃO FOI INJETADO!");
                return;
            }
            
            if (minIOService == null) {
                log.error("❌ SPLITTER WORKER: MinIOService NÃO FOI INJETADO!");
                System.out.println("❌ SPLITTER WORKER: MinIOService NÃO FOI INJETADO!");
                return;
            }
            
            log.info("✅ SPLITTER WORKER: Todas as dependências foram injetadas corretamente");
            
            // Verificar conexão com Redis
            log.info("🟢 SPLITTER WORKER: Verificando conexão com Redis...");
            if (!isRedisAvailable()) {
                log.error("❌ SPLITTER WORKER: Redis não está disponível na inicialização!");
                log.error("❌ SPLITTER WORKER: Verifique se o Redis está rodando em localhost:6379");
                log.error("❌ SPLITTER WORKER: O worker continuará tentando reconectar...");
                System.out.println("❌ SPLITTER WORKER: Redis não está disponível!");
                return;
            }
            
            log.info("✅ SPLITTER WORKER: Redis está disponível!");
            System.out.println("✅ SPLITTER WORKER: Redis está disponível!");
            
            // Criar consumer group se não existir
            log.info("🟢 SPLITTER WORKER: Criando/verificando consumer group '{}'...", CONSUMER_GROUP);
            try {
                redisTemplate.opsForStream().createGroup(STREAM_JOBS, ReadOffset.from("0"), CONSUMER_GROUP);
                log.info("✅ SPLITTER WORKER: Consumer group '{}' criado com sucesso!", CONSUMER_GROUP);
                System.out.println("✅ SPLITTER WORKER: Consumer group criado!");
            } catch (Exception e) {
                log.info("ℹ️ SPLITTER WORKER: Consumer group '{}' já existe ou erro: {}", CONSUMER_GROUP, e.getMessage());
            }
        } catch (Exception e) {
            log.error("❌ SPLITTER WORKER: Erro durante inicialização: {}", e.getMessage(), e);
            System.out.println("❌ SPLITTER WORKER: ERRO - " + e.getMessage());
            e.printStackTrace();
        }
        
        log.info("✅ SPLITTER WORKER: Inicialização concluída - Worker pronto para processar jobs!");
        System.out.println("✅ SPLITTER WORKER: Inicialização concluída!");
        System.out.println("═══════════════════════════════════════════════════════════");
    }
    
    private boolean isRedisAvailable() {
        try {
            String result = redisTemplate.getConnectionFactory().getConnection().ping();
            log.debug("🟢 Redis ping retornou: {}", result);
            return true;
        } catch (Exception e) {
            log.warn("⚠️ Redis ping falhou: {}", e.getMessage());
            return false;
        }
    }
    
    @Scheduled(fixedDelay = 500) // Processa a cada 500ms (mais rápido)
    public void processJobs() {
        try {
            // Verificar conexão com Redis
            if (!isRedisAvailable()) {
                // Log apenas a cada 10 segundos para não poluir os logs
                if (System.currentTimeMillis() % 10000 < 500) {
                    log.warn("⚠️ SplitterWorker: Redis não está disponível! Tentando reconectar...");
                }
                return;
            }
            
            // Log periódico para debug (a cada 5 segundos)
            long currentTime = System.currentTimeMillis();
            boolean shouldLog = (currentTime % 5000 < 500);
            
            if (shouldLog) {
                try {
                    Long streamLength = redisTemplate.opsForStream().size(STREAM_JOBS);
                    log.debug("🔵 SplitterWorker: Verificando stream:jobs (tamanho: {})", streamLength);
                } catch (Exception e) {
                    log.debug("🔵 SplitterWorker: Erro ao verificar tamanho do stream: {}", e.getMessage());
                }
            }
            
            // Tentar ler mensagens do stream
            @SuppressWarnings("unchecked")
            List<MapRecord<String, String, String>> records = (List<MapRecord<String, String, String>>) (List<?>) redisTemplate.opsForStream().read(
                org.springframework.data.redis.connection.stream.Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                StreamOffset.create(STREAM_JOBS, ReadOffset.lastConsumed())
            );
            
            if (records == null || records.isEmpty()) {
                // Se não houver mensagens novas, tentar ler do início (pode haver mensagens não processadas)
                if (shouldLog) {
                    log.debug("🔵 SplitterWorker: Nenhuma mensagem nova encontrada, tentando ler do início...");
                }
                try {
                    @SuppressWarnings("unchecked")
                    List<MapRecord<String, String, String>> allRecords = (List<MapRecord<String, String, String>>) (List<?>) redisTemplate.opsForStream().read(
                        org.springframework.data.redis.connection.stream.Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                        StreamOffset.create(STREAM_JOBS, ReadOffset.from("0"))
                    );
                    if (allRecords != null && !allRecords.isEmpty()) {
                        records = allRecords;
                        log.info("🔵 SplitterWorker: Encontradas {} mensagens não processadas", records.size());
                    }
                } catch (Exception e) {
                    // Ignorar erro - pode ser que não haja mensagens mesmo
                    if (shouldLog) {
                        log.debug("🔵 SplitterWorker: Nenhuma mensagem encontrada no stream");
                    }
                }
            }
            
            if (records == null || records.isEmpty()) {
                return;
            }
            
            log.info("🔵 SplitterWorker: Processando {} jobs", records.size());
            System.out.println("🔵 SplitterWorker: Processando " + records.size() + " jobs");
            
            for (MapRecord<String, String, String> record : records) {
                try {
                    processJob(record);
                    // ACK da mensagem após processar com sucesso
                    redisTemplate.opsForStream().acknowledge(STREAM_JOBS, CONSUMER_GROUP, record.getId());
                } catch (IllegalArgumentException e) {
                    // Erro de validação - fazer ACK para não reprocessar
                    log.warn("⚠️ SplitterWorker: Erro de validação na mensagem {}: {}. Fazendo ACK para ignorar.", record.getId(), e.getMessage());
                    redisTemplate.opsForStream().acknowledge(STREAM_JOBS, CONSUMER_GROUP, record.getId());
                } catch (Exception e) {
                    log.error("Erro ao processar job {}", record.getId(), e);
                    // Tentar marcar job como falho (pode não existir)
                    String jobIdStr = record.getValue().get("jobId");
                    if (jobIdStr != null) {
                        try {
                            markJobAsFailed(jobIdStr, e.getMessage());
                        } catch (Exception ex) {
                            log.warn("Não foi possível marcar job {} como falho: {}", jobIdStr, ex.getMessage());
                        }
                    }
                    // Fazer ACK mesmo em caso de erro para não ficar reprocessando infinitamente
                    try {
                        redisTemplate.opsForStream().acknowledge(STREAM_JOBS, CONSUMER_GROUP, record.getId());
                    } catch (Exception ackEx) {
                        log.error("Erro ao fazer ACK da mensagem {}", record.getId(), ackEx);
                    }
                }
            }
        } catch (org.springframework.data.redis.RedisConnectionFailureException e) {
            log.error("❌ SplitterWorker: Erro de conexão com Redis - {}", e.getMessage());
        } catch (Exception e) {
            log.error("❌ SplitterWorker: Erro inesperado", e);
        }
    }
    
    private void processJob(MapRecord<String, String, String> record) throws Exception {
        String jobIdStr = record.getValue().get("jobId");
        String filePath = record.getValue().get("filePath");
        String fileHash = record.getValue().get("fileHash"); // Hash do arquivo completo
        
        if (jobIdStr == null || filePath == null) {
            throw new IllegalArgumentException("jobId ou filePath não encontrado na mensagem");
        }
        
        UUID jobId = UUID.fromString(jobIdStr);
        log.info("🟢 SplitterWorker: Iniciando processamento do job {} - arquivo: {}", jobId, filePath);
        
        // Atualizar status do job
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);
        
        // Se o job não existe mais no banco, provavelmente foi deletado ou é uma mensagem antiga
        // Nesse caso, apenas logamos e retornamos (não lançamos exceção para não bloquear outras mensagens)
        if (job == null) {
            log.warn("⚠️ SplitterWorker: Job {} não encontrado no banco de dados. Pode ser uma mensagem antiga. Ignorando...", jobId);
            // Verificar se o arquivo existe - se não existir, é definitivamente uma mensagem antiga
            File pdfFile = new File(filePath);
            if (!pdfFile.exists()) {
                log.warn("⚠️ SplitterWorker: Arquivo {} também não existe. Esta é uma mensagem antiga que pode ser ignorada.", filePath);
            }
            return; // Retorna sem lançar exceção para não bloquear outras mensagens
        }
        
        log.info("🟢 SplitterWorker: Job encontrado - Status atual: {}, Total páginas: {}", 
            job.getStatus(), job.getTotalPages());
        
        job.setStatus(DocumentProcessingJob.JobStatus.PROCESSING);
        job.setStartedAt(java.time.LocalDateTime.now());
        jobRepository.saveAndFlush(job);
        log.info("🟢 SplitterWorker: Status do job {} atualizado para PROCESSING", jobId);
        
        // Processar PDF
        File pdfFile = new File(filePath);
        if (!pdfFile.exists()) {
            throw new RuntimeException("Arquivo não encontrado: " + filePath);
        }
        
        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFRenderer renderer = new PDFRenderer(document);
            int totalPages = document.getNumberOfPages();
            
            job.setTotalPages(totalPages);
            jobRepository.saveAndFlush(job);
            
            log.info("🟢 SplitterWorker: PDF tem {} páginas - iniciando processamento", totalPages);
            
            // Processar cada página
            for (int pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                try {
                    // Renderizar página como imagem
                    BufferedImage image = renderer.renderImageWithDPI(pageIndex, DPI);
                    
                    // Converter para PNG
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(image, "PNG", baos);
                    byte[] imageBytes = baos.toByteArray();
                    
                    // Upload para MinIO/S3
                    String s3Url = minIOService.uploadPage(imageBytes, jobId.toString(), pageIndex);
                    
                    // Publicar em stream:pages com o tipo de documento do job
                    String pageId = UUID.randomUUID().toString();
                    Map<String, String> pageFields = new HashMap<>();
                    pageFields.put("jobId", jobId.toString());
                    pageFields.put("pageId", pageId);
                    pageFields.put("pageIndex", String.valueOf(pageIndex));
                    pageFields.put("s3Url", s3Url);
                    pageFields.put("totalPages", String.valueOf(totalPages));
                    // Adicionar documentType do job para que os workers saibam o tipo
                    if (job.getDocumentType() != null) {
                        pageFields.put("documentType", job.getDocumentType());
                    }
                    // Adicionar hash do arquivo completo para verificação de duplicatas e versão
                    if (fileHash != null && !fileHash.isEmpty()) {
                        pageFields.put("fileHash", fileHash);
                    }
                    
                    redisTemplate.opsForStream().add(STREAM_PAGES, pageFields);
                    
                    // Atualizar progresso
                    job.setProcessedPages(pageIndex + 1);
                    job.updateProgress();
                    jobRepository.save(job);
                    
                    log.info("🟢 SplitterWorker: Página {}/{} processada e publicada no stream:pages", pageIndex + 1, totalPages);
                } catch (Exception e) {
                    log.error("Erro ao processar página {} do job {}", pageIndex, jobId, e);
                }
            }
            
            // Marcar job como concluído
            job.setStatus(DocumentProcessingJob.JobStatus.COMPLETED);
            job.setCompletedAt(java.time.LocalDateTime.now());
            jobRepository.save(job);
            
            log.info("✅ SplitterWorker: Job {} CONCLUÍDO - {} páginas processadas e publicadas", jobId, totalPages);
        }
    }
    
    private void markJobAsFailed(String jobIdStr, String errorMessage) {
        try {
            if (jobIdStr != null) {
                UUID jobId = UUID.fromString(jobIdStr);
                DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);
                if (job != null) {
                    job.setStatus(DocumentProcessingJob.JobStatus.FAILED);
                    job.setErrorMessage(errorMessage);
                    job.setCompletedAt(java.time.LocalDateTime.now());
                    jobRepository.save(job);
                }
            }
        } catch (Exception e) {
            log.error("Erro ao marcar job como falho", e);
        }
    }
    
    @PreDestroy
    public void cleanup() {
        log.info("SplitterWorker sendo finalizado");
    }
}

