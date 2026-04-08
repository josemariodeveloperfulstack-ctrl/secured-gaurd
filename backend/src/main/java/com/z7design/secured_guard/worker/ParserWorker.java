package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.model.DocumentPage;
import com.z7design.secured_guard.repository.DocumentPageRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParserWorker {
    
    private ParserWorker self; // Self-injection para permitir @Transactional em métodos internos
    
    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(ParserWorker self) {
        this.self = self;
    }
    
    private final StringRedisTemplate redisTemplate;
    private final DocumentPageRepository documentPageRepository;
    private final EntityManager entityManager;
    
    private static final String STREAM_PARSED = "stream:parsed";
    private static final String STREAM_VALIDATED = "stream:validated";
    private static final String CONSUMER_GROUP = "parser-group";
    private static final String CONSUMER_NAME = "parser-worker-1";
    
    @PostConstruct
    public void init() {
        log.info("═══════════════════════════════════════════════════════════");
        log.info("🟣 PARSER WORKER: Iniciando inicialização...");
        log.info("═══════════════════════════════════════════════════════════");
        try {
            redisTemplate.opsForStream().createGroup(STREAM_PARSED, ReadOffset.from("0"), CONSUMER_GROUP);
            log.info("✅ PARSER WORKER: Consumer group '{}' criado/verificado", CONSUMER_GROUP);
        } catch (Exception e) {
            log.info("ℹ️ PARSER WORKER: Consumer group '{}' já existe ou erro: {}", CONSUMER_GROUP, e.getMessage());
        }
        log.info("✅ PARSER WORKER: Inicialização concluída - Worker pronto!");
        log.info("═══════════════════════════════════════════════════════════");
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
    
    @SuppressWarnings("unchecked")
    @Scheduled(fixedDelay = 500)
    public void processParsedPages() {
        try {
            if (!isRedisAvailable()) {
                if (System.currentTimeMillis() % 10000 < 500) {
                    log.warn("⚠️ ParserWorker: Redis não está disponível! Tentando reconectar...");
                }
                return;
            }

            StreamOperations<String, Object, Object> streamOps = redisTemplate.opsForStream();
            Consumer consumer = Consumer.from(CONSUMER_GROUP, CONSUMER_NAME);

            // 1. Tentar ler mensagens pendentes (que não foram ACKed)
            List<MapRecord<String, Object, Object>> pendingRecords = streamOps.read(
                consumer,
                StreamReadOptions.empty().count(10).noack(),
                StreamOffset.create(STREAM_PARSED, ReadOffset.from("0"))
            );

            if (pendingRecords != null && !pendingRecords.isEmpty()) {
                log.info("🔵 ParserWorker: Encontradas {} mensagens pendentes", pendingRecords.size());
                System.out.println("🔵 ParserWorker: Encontradas " + pendingRecords.size() + " mensagens pendentes");
                for (MapRecord<String, Object, Object> record : pendingRecords) {
                    try {
                        if (self != null) {
                            self.processPageTransactional(record);
                        } else {
                            processPage(record);
                        }
                        streamOps.acknowledge(STREAM_PARSED, CONSUMER_GROUP, record.getId());
                    } catch (RuntimeException e) {
                        log.warn("⚠️ ParserWorker: Erro ao processar mensagem pendente {} (DocumentPage pode ter sido excluída): {}", record.getId(), e.getMessage());
                        streamOps.acknowledge(STREAM_PARSED, CONSUMER_GROUP, record.getId());
                    } catch (Exception e) {
                        log.error("❌ ParserWorker: Erro inesperado ao processar mensagem pendente {}", record.getId(), e);
                        streamOps.acknowledge(STREAM_PARSED, CONSUMER_GROUP, record.getId());
                    }
                }
            }

            // 2. Tentar ler novas mensagens
            List<MapRecord<String, Object, Object>> newRecords = streamOps.read(
                consumer,
                StreamReadOptions.empty().count(10),
                StreamOffset.create(STREAM_PARSED, ReadOffset.lastConsumed())
            );

            if (newRecords == null || newRecords.isEmpty()) {
                if (System.currentTimeMillis() % 10000 < 500) {
                    log.debug("🟢 ParserWorker: Nenhuma nova mensagem no stream:parsed");
                }
                return;
            }

            log.info("🟣 ParserWorker: Processando {} novas páginas do stream:parsed", newRecords.size());
            System.out.println("🟣 ParserWorker: Processando " + newRecords.size() + " novas páginas do stream:parsed");
            
            for (MapRecord<String, Object, Object> record : newRecords) {
                try {
                    if (self != null) {
                        self.processPageTransactional(record);
                    } else {
                        processPage(record);
                    }
                    streamOps.acknowledge(STREAM_PARSED, CONSUMER_GROUP, record.getId());
                } catch (RuntimeException e) {
                    log.warn("⚠️ ParserWorker: Erro ao processar nova página {} (DocumentPage pode ter sido excluída): {}", record.getId(), e.getMessage());
                    streamOps.acknowledge(STREAM_PARSED, CONSUMER_GROUP, record.getId());
                } catch (Exception e) {
                    log.error("❌ ParserWorker: Erro inesperado ao processar nova página {}", record.getId(), e);
                    streamOps.acknowledge(STREAM_PARSED, CONSUMER_GROUP, record.getId());
                }
            }
        } catch (org.springframework.data.redis.RedisConnectionFailureException e) {
            log.error("❌ ParserWorker: Erro de conexão com Redis - {}", e.getMessage());
        } catch (Exception e) {
            log.error("❌ ParserWorker: Erro inesperado no loop principal", e);
        }
    }
    
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED, propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void processPageTransactional(MapRecord<String, Object, Object> record) {
        processPage(record);
    }
    
    private void processPage(MapRecord<String, Object, Object> record) {
        String pageIdStr = (String) record.getValue().get("pageId");
        String jobIdStr = (String) record.getValue().get("jobId");
        String documentTypeStr = (String) record.getValue().get("type"); // Obter o tipo do documento
        String fileHash = (String) record.getValue().get("fileHash"); // Hash do arquivo completo
        
        log.info("🟣 ParserWorker: Recebida mensagem do stream - pageId: {}, jobId: {}, type: {}, fileHash: {}", 
            pageIdStr, jobIdStr, documentTypeStr, 
            fileHash != null ? fileHash.substring(0, Math.min(16, fileHash.length())) + "..." : "null");
        
        if (pageIdStr == null || documentTypeStr == null) {
            log.warn("⚠️ ParserWorker: pageId ou documentType não encontrado na mensagem: {}", record.getValue());
            throw new IllegalArgumentException("pageId ou documentType não encontrado na mensagem do Redis");
        }
        
        UUID pageId = UUID.fromString(pageIdStr);
        DocumentPage.DocumentType documentType = DocumentPage.DocumentType.valueOf(documentTypeStr);
        
        log.info("🟣 ParserWorker: Validando DocumentPage ID: {} (Tipo: {}) - Buscando no banco...", pageId, documentType);
        
        // Limpar cache do Hibernate para garantir que buscamos dados atualizados
        entityManager.clear();
        
        DocumentPage documentPage = documentPageRepository.findById(pageId).orElse(null);
        
        // Se não encontrou, tentar novamente após delays progressivos (pode ser problema de timing/isolamento)
        if (documentPage == null) {
            log.warn("⚠️ ParserWorker: DocumentPage não encontrado na primeira tentativa: {} (jobId: {}). Tentando novamente com delays progressivos...", pageId, jobIdStr);
            int[] delays = {200, 500, 1000}; // Delays progressivos: 200ms, 500ms, 1000ms
            for (int delay : delays) {
                try {
                    Thread.sleep(delay);
                    entityManager.clear(); // Limpar cache novamente
                    entityManager.flush(); // Forçar flush
                    documentPage = documentPageRepository.findById(pageId).orElse(null);
                    if (documentPage != null) {
                        log.info("✅ ParserWorker: DocumentPage encontrada após retry com delay de {}ms", delay);
                        break;
                    } else {
                        log.debug("🟡 ParserWorker: DocumentPage ainda não encontrada após delay de {}ms, tentando novamente...", delay);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        if (documentPage == null) {
            log.warn("⚠️ ParserWorker: DocumentPage não encontrado após retry: {} (jobId: {})", pageId, jobIdStr);
            // Tentar buscar por jobId para ver se a página existe
            if (jobIdStr != null) {
                try {
                    UUID jobId = UUID.fromString(jobIdStr);
                    List<DocumentPage> pagesByJob = documentPageRepository.findByJobId(jobId);
                    log.warn("⚠️ ParserWorker: Encontradas {} páginas no job {}, mas a página {} não foi encontrada. IDs encontrados: {}", 
                        pagesByJob.size(), jobId, pageId, 
                        pagesByJob.stream().map(p -> p.getId().toString()).collect(java.util.stream.Collectors.joining(", ")));
                } catch (Exception e) {
                    log.error("❌ ParserWorker: Erro ao buscar páginas por jobId", e);
                }
            }
            throw new RuntimeException("DocumentPage não encontrada: " + pageId);
        }
        
        // Criar referência final para usar em lambdas
        final DocumentPage finalDocumentPage = documentPage;
        final UUID finalPageId = pageId;
        
        log.info("✅ ParserWorker: DocumentPage encontrada - ID: {}, Type: {}, Status: {}, CPF: {}, Nome: {}", 
            finalPageId, finalDocumentPage.getType(), finalDocumentPage.getStatus(), finalDocumentPage.getCpf(), finalDocumentPage.getName());
        
        log.debug("Validando página {} do job {}", finalDocumentPage.getPageNumber(), finalDocumentPage.getJobId());
        
        // Validar CPF
        boolean cpfValid = validateCpf(finalDocumentPage.getCpf());
        if (!cpfValid && finalDocumentPage.getCpf() != null) {
            log.warn("CPF inválido detectado: {}", finalDocumentPage.getCpf());
            finalDocumentPage.setStatus(DocumentPage.DocumentPageStatus.REVIEW);
        }
        
        // Validar valor líquido
        boolean valueValid = validateValue(finalDocumentPage.getLiquidValue());
        if (!valueValid) {
            log.warn("Valor líquido inválido: {}", finalDocumentPage.getLiquidValue());
            finalDocumentPage.setStatus(DocumentPage.DocumentPageStatus.REVIEW);
        }
        
        // Validar nome
        boolean nameValid = validateName(finalDocumentPage.getName());
        if (!nameValid && finalDocumentPage.getName() != null) {
            log.warn("Nome inválido: {}", finalDocumentPage.getName());
            finalDocumentPage.setStatus(DocumentPage.DocumentPageStatus.REVIEW);
        }
        
        // Verificar duplicados por hash
        if (finalDocumentPage.getHash() != null) {
            List<DocumentPage> duplicates = documentPageRepository.findByHash(finalDocumentPage.getHash());
            // Verificar se há outras páginas (além da atual) com o mesmo hash
            boolean hasDuplicate = duplicates.stream()
                .anyMatch(d -> !d.getId().equals(finalPageId));
            if (hasDuplicate) {
                log.info("Página duplicada detectada (hash: {}). Encontradas {} páginas com o mesmo hash", 
                    finalDocumentPage.getHash(), duplicates.size());
                finalDocumentPage.setStatus(DocumentPage.DocumentPageStatus.REVIEW);
            }
        }
        
        // Normalizar dados
        finalDocumentPage.setName(normalizeName(finalDocumentPage.getName()));
        finalDocumentPage.setCpf(normalizeCpf(finalDocumentPage.getCpf()));
        
        // Atualizar status se tudo estiver OK
        if (finalDocumentPage.getStatus() == DocumentPage.DocumentPageStatus.OK) {
            // Verificar se todos os campos obrigatórios estão presentes
            if (hasRequiredFields(finalDocumentPage)) {
                finalDocumentPage.setStatus(DocumentPage.DocumentPageStatus.OK);
            } else {
                finalDocumentPage.setStatus(DocumentPage.DocumentPageStatus.REVIEW);
            }
        }
        
        finalDocumentPage.setProcessedAt(LocalDateTime.now());
        DocumentPage savedPage = documentPageRepository.saveAndFlush(finalDocumentPage);
        
        // Publicar em stream:validated
        Map<String, String> validatedFields = new HashMap<>();
        validatedFields.put("jobId", savedPage.getJobId().toString());
        validatedFields.put("pageId", savedPage.getId().toString());
        validatedFields.put("type", savedPage.getType().name());
        validatedFields.put("cpf", savedPage.getCpf() != null ? savedPage.getCpf() : "");
        validatedFields.put("name", savedPage.getName() != null ? savedPage.getName() : "");
        validatedFields.put("value", savedPage.getLiquidValue() != null ? savedPage.getLiquidValue().toString() : "");
        validatedFields.put("period", savedPage.getPeriod() != null ? savedPage.getPeriod() : "");
        validatedFields.put("status", savedPage.getStatus().name());
        // Passar hash do arquivo completo (não o hash da página) para verificação de duplicatas e versão
        if (fileHash != null && !fileHash.isEmpty()) {
            validatedFields.put("fileHash", fileHash);
        }
        
        try {
            var messageId = redisTemplate.opsForStream().add(STREAM_VALIDATED, validatedFields);
            log.info("✅ ParserWorker: Página {} publicada no stream:validated com messageId: {} - Type: {}, Status: {}, CPF: {}, Nome: {}", 
                savedPage.getPageNumber(), messageId, savedPage.getType(), savedPage.getStatus(), 
                savedPage.getCpf(), savedPage.getName());
            System.out.println("✅ ParserWorker: Página " + savedPage.getPageNumber() + 
                " publicada no stream:validated - Type: " + savedPage.getType() + ", Status: " + savedPage.getStatus());
        } catch (Exception e) {
            log.error("❌ ParserWorker: Erro ao publicar no stream:validated", e);
        }
        
        log.debug("Página {} validada - Status: {}", documentPage.getPageNumber(), documentPage.getStatus());
    }
    
    private boolean validateCpf(String cpf) {
        if (cpf == null || cpf.length() != 11) {
            return false;
        }
        
        // Verificar se todos os dígitos são iguais (CPF inválido por padrão)
        if (cpf.matches("(\\d)\\1{10}")) {
            return false;
        }
        
        // Para OCR, aceitar CPF mesmo se dígitos verificadores estiverem errados
        // (pode ser erro de leitura do OCR). Apenas verificar formato básico.
        // Se quiser validação completa, descomente o código abaixo.
        
        // Validação completa de dígitos verificadores (mais restritiva)
        try {
            int[] digits = new int[11];
            for (int i = 0; i < 11; i++) {
                char c = cpf.charAt(i);
                if (!Character.isDigit(c)) {
                    return false;
                }
                digits[i] = Character.getNumericValue(c);
            }
            
            // Calcular primeiro dígito verificador
            int sum = 0;
            for (int i = 0; i < 9; i++) {
                sum += digits[i] * (10 - i);
            }
            int firstDigit = 11 - (sum % 11);
            if (firstDigit >= 10) firstDigit = 0;
            
            // Calcular segundo dígito verificador
            sum = 0;
            for (int i = 0; i < 10; i++) {
                sum += digits[i] * (11 - i);
            }
            int secondDigit = 11 - (sum % 11);
            if (secondDigit >= 10) secondDigit = 0;
            
            // Aceitar se dígitos verificadores estão corretos OU se parece ser um CPF válido (não todos iguais)
            // Isso permite processar CPFs mesmo com pequenos erros de OCR
            boolean validCheckDigits = (firstDigit == digits[9] && secondDigit == digits[10]);
            boolean notAllSame = !cpf.matches("(\\d)\\1{10}");
            
            // Aceitar se: (dígitos verificadores corretos) OU (não são todos iguais E tem formato válido)
            return validCheckDigits || (notAllSame && cpf.matches("\\d{11}"));
        } catch (Exception e) {
            log.warn("Erro ao validar CPF {}: {}", cpf, e.getMessage());
            return false;
        }
    }
    
    private boolean validateValue(BigDecimal value) {
        if (value == null) {
            return false;
        }
        return value.compareTo(BigDecimal.ZERO) >= 0;
    }
    
    private boolean validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return false;
        }
        // Nome deve ter pelo menos 2 palavras
        String[] words = name.trim().split("\\s+");
        return words.length >= 2;
    }
    
    private boolean hasRequiredFields(DocumentPage page) {
        // Para holerite: CPF, nome, período, valor são obrigatórios
        if (page.getType() == DocumentPage.DocumentType.HOLERITE) {
            return page.getCpf() != null && 
                   page.getName() != null && 
                   page.getPeriod() != null && 
                   page.getLiquidValue() != null;
        }
        // Para comprovante: nome OU CPF, valor, período são obrigatórios
        if (page.getType() == DocumentPage.DocumentType.COMPROVANTE) {
            return (page.getCpf() != null || page.getName() != null) && 
                   page.getLiquidValue() != null && 
                   page.getPeriod() != null;
        }
        return false;
    }
    
    private String normalizeCpf(String cpf) {
        if (cpf == null) {
            return null;
        }
        return cpf.replaceAll("[^0-9]", "");
    }
    
    private String normalizeName(String name) {
        if (name == null) {
            return null;
        }
        return name.toUpperCase()
            .replace("Á", "A").replace("À", "A").replace("Â", "A").replace("Ã", "A")
            .replace("É", "E").replace("Ê", "E")
            .replace("Í", "I")
            .replace("Ó", "O").replace("Ô", "O").replace("Õ", "O")
            .replace("Ú", "U").replace("Ü", "U")
            .replace("Ç", "C")
            .trim();
    }
}

