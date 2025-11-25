package com.z7design.secured_guard.worker;

import com.z7design.secured_guard.model.DocumentPage;
import com.z7design.secured_guard.repository.DocumentPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
// @Component // DESABILITADO: Matching agora é feito apenas no processo de unificação separado
@RequiredArgsConstructor
public class MatcherWorker {
    
    private final StringRedisTemplate redisTemplate;
    private final DocumentPageRepository documentPageRepository;
    private final JaroWinklerSimilarity jaroWinkler = new JaroWinklerSimilarity();
    
    private static final String STREAM_VALIDATED = "stream:validated";
    private static final String STREAM_MATCHED = "stream:matched";
    private static final String STREAM_REVIEW = "stream:review";
    private static final String CONSUMER_GROUP = "matcher-group";
    private static final String CONSUMER_NAME = "matcher-worker-1";
    
    // Thresholds conforme PRD
    private static final double SIMILARITY_THRESHOLD_HIGH = 0.92;
    private static final double SIMILARITY_THRESHOLD_MEDIUM = 0.80;
    
    @PostConstruct
    public void init() {
        log.info("═══════════════════════════════════════════════════════════");
        log.info("🔵 MATCHER WORKER: Iniciando inicialização...");
        log.info("═══════════════════════════════════════════════════════════");
        try {
            redisTemplate.opsForStream().createGroup(STREAM_VALIDATED, ReadOffset.from("0"), CONSUMER_GROUP);
            log.info("✅ MATCHER WORKER: Consumer group '{}' criado/verificado", CONSUMER_GROUP);
        } catch (Exception e) {
            log.info("ℹ️ MATCHER WORKER: Consumer group '{}' já existe ou erro: {}", CONSUMER_GROUP, e.getMessage());
        }
        log.info("✅ MATCHER WORKER: Inicialização concluída - Worker pronto!");
        log.info("═══════════════════════════════════════════════════════════");
    }
    
    @Scheduled(fixedDelay = 2000) // Processa a cada 2 segundos (permite acumular páginas do mesmo job)
    public void processValidatedPages() {
        try {
            @SuppressWarnings("unchecked")
            List<MapRecord<String, String, String>> records = (List<MapRecord<String, String, String>>) (List<?>) redisTemplate.opsForStream().read(
                org.springframework.data.redis.connection.stream.Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                StreamOffset.create(STREAM_VALIDATED, ReadOffset.lastConsumed())
            );
            
            if (records == null || records.isEmpty()) {
                return;
            }
            
            log.debug("Processando {} páginas no MatcherWorker", records.size());
            
            // Agrupar por jobId para processar todos os documentos do mesmo job juntos
            Map<UUID, List<MapRecord<String, String, String>>> recordsByJob = records.stream()
                .collect(Collectors.groupingBy(r -> UUID.fromString(r.getValue().get("jobId"))));
            
            for (Map.Entry<UUID, List<MapRecord<String, String, String>>> entry : recordsByJob.entrySet()) {
                try {
                    processJob(entry.getKey(), entry.getValue());
                    // ACK todas as mensagens do job
                    for (MapRecord<String, String, String> record : entry.getValue()) {
                        redisTemplate.opsForStream().acknowledge(STREAM_VALIDATED, CONSUMER_GROUP, record.getId());
                    }
                } catch (Exception e) {
                    log.error("Erro ao processar job {} no MatcherWorker", entry.getKey(), e);
                }
            }
        } catch (Exception e) {
            log.error("Erro no MatcherWorker", e);
        }
    }
    
    private void processJob(UUID jobId, List<MapRecord<String, String, String>> records) {
        log.info("🟢 MatcherWorker: Processando matching para job {} com {} mensagens do stream", jobId, records.size());
        
        // Buscar todas as páginas do job
        List<DocumentPage> allPages = documentPageRepository.findByJobId(jobId);
        log.info("🟢 MatcherWorker: Encontradas {} páginas no banco para o job {}", allPages.size(), jobId);
        
        // Separar holerites e comprovantes
        // Processar tanto páginas OK quanto REVIEW (páginas REVIEW podem ter dados válidos mas baixa confiança)
        List<DocumentPage> holerites = allPages.stream()
            .filter(p -> p.getType() == DocumentPage.DocumentType.HOLERITE)
            .filter(p -> p.getStatus() == DocumentPage.DocumentPageStatus.OK || 
                        p.getStatus() == DocumentPage.DocumentPageStatus.REVIEW)
            .collect(Collectors.toList());
        
        List<DocumentPage> comprovantes = allPages.stream()
            .filter(p -> p.getType() == DocumentPage.DocumentType.COMPROVANTE)
            .filter(p -> p.getStatus() == DocumentPage.DocumentPageStatus.OK || 
                        p.getStatus() == DocumentPage.DocumentPageStatus.REVIEW)
            .collect(Collectors.toList());
        
        log.info("🟢 MatcherWorker: Job {} - {} holerites e {} comprovantes para matching", jobId, holerites.size(), comprovantes.size());
        
        // Se não houver páginas, logar um aviso
        if (allPages.isEmpty()) {
            log.warn("⚠️ MatcherWorker: Nenhuma página encontrada no banco para o job {}. Verifique se o OcrWorker salvou as páginas corretamente.", jobId);
        }
        
        // Processar cada holerite
        for (DocumentPage holerite : holerites) {
            try {
                matchHoleriteWithComprovante(holerite, comprovantes);
            } catch (Exception e) {
                log.error("Erro ao fazer matching do holerite {}", holerite.getId(), e);
            }
        }
    }
    
    private void matchHoleriteWithComprovante(DocumentPage holerite, List<DocumentPage> comprovantes) {
        log.debug("Fazendo matching para holerite {} - CPF: {}, Valor: {}, Período: {}", 
            holerite.getId(), holerite.getCpf(), holerite.getLiquidValue(), holerite.getPeriod());
        
        List<DocumentPage> candidates = new ArrayList<>();
        
        // REGRA A: Match perfeito (CPF + Valor + Período)
        if (holerite.getCpf() != null && holerite.getLiquidValue() != null && holerite.getPeriod() != null) {
            candidates = documentPageRepository.findByCpfAndValueAndPeriod(
                holerite.getCpf(),
                holerite.getLiquidValue(),
                holerite.getPeriod()
            );
            
            // Filtrar apenas comprovantes
            candidates = candidates.stream()
                .filter(c -> c.getType() == DocumentPage.DocumentType.COMPROVANTE)
                .filter(c -> !c.getId().equals(holerite.getId()))
                .collect(Collectors.toList());
            
            if (candidates.size() == 1) {
                // Match perfeito encontrado
                createUnifiedDocument(holerite, candidates.get(0), "CPF_VALUE_PERIOD");
                return;
            } else if (candidates.size() > 1) {
                // Múltiplos candidatos - escolher por similaridade de nome
                DocumentPage best = chooseBestByNameSimilarity(holerite, candidates);
                if (best != null) {
                    createUnifiedDocument(holerite, best, "CPF_VALUE_PERIOD_BEST_SIMILARITY");
                    return;
                }
            }
        }
        
        // REGRA B: Match por CPF + Período + Similaridade de nome
        if (holerite.getCpf() != null && holerite.getPeriod() != null && holerite.getName() != null) {
            candidates = comprovantes.stream()
                .filter(c -> holerite.getCpf().equals(c.getCpf()))
                .filter(c -> holerite.getPeriod().equals(c.getPeriod()))
                .collect(Collectors.toList());
            
            if (!candidates.isEmpty()) {
                DocumentPage best = chooseBestByNameSimilarity(holerite, candidates);
                if (best != null && calculateSimilarity(holerite.getName(), best.getName()) >= SIMILARITY_THRESHOLD_HIGH) {
                    createUnifiedDocument(holerite, best, "CPF_PERIOD_NAME_SIMILARITY");
                    return;
                }
            }
        }
        
        // REGRA C: Match por Valor + Período + Similaridade de nome (quando comprovante não tem CPF)
        if (holerite.getLiquidValue() != null && holerite.getPeriod() != null && holerite.getName() != null) {
            candidates = comprovantes.stream()
                .filter(c -> holerite.getLiquidValue().equals(c.getLiquidValue()))
                .filter(c -> holerite.getPeriod().equals(c.getPeriod()))
                .filter(c -> c.getCpf() == null || c.getCpf().isEmpty()) // Comprovante sem CPF
                .collect(Collectors.toList());
            
            if (!candidates.isEmpty()) {
                DocumentPage best = chooseBestByNameSimilarity(holerite, candidates);
                double similarity = calculateSimilarity(holerite.getName(), best.getName());
                
                if (similarity >= SIMILARITY_THRESHOLD_HIGH) {
                    createUnifiedDocument(holerite, best, "VALUE_PERIOD_NAME_SIMILARITY");
                    return;
                } else if (similarity >= SIMILARITY_THRESHOLD_MEDIUM) {
                    // Marcar como ambíguo
                    markAsAmbiguous(holerite, best, similarity);
                    return;
                }
            }
        }
        
        // REGRA D: Nenhum match encontrado
        log.info("🟡 MatcherWorker: Nenhum comprovante encontrado para holerite {} - CPF: {}, Nome: {}, Período: {}, Valor: {}", 
            holerite.getId(), holerite.getCpf(), holerite.getName(), holerite.getPeriod(), holerite.getLiquidValue());
        markAsUnmatched(holerite);
    }
    
    private DocumentPage chooseBestByNameSimilarity(DocumentPage holerite, List<DocumentPage> candidates) {
        if (candidates.isEmpty() || holerite.getName() == null) {
            return null;
        }
        
        DocumentPage best = null;
        double bestSimilarity = 0.0;
        
        for (DocumentPage candidate : candidates) {
            if (candidate.getName() == null) {
                continue;
            }
            
            double similarity = calculateSimilarity(holerite.getName(), candidate.getName());
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                best = candidate;
            }
        }
        
        return best;
    }
    
    private double calculateSimilarity(String name1, String name2) {
        if (name1 == null || name2 == null) {
            return 0.0;
        }
        return jaroWinkler.apply(name1, name2);
    }
    
    private void createUnifiedDocument(DocumentPage holerite, DocumentPage comprovante, String method) {
        log.info("Match encontrado - Holerite: {}, Comprovante: {}, Método: {}", 
            holerite.getId(), comprovante.getId(), method);
        
        try {
            // Publicar em stream:matched para processamento posterior
            // Um worker final (PdfMergeWorker) vai criar Payslip, PaymentReceipt e UnifiedDocument
            Map<String, String> matchedFields = new HashMap<>();
            matchedFields.put("holeritePageId", holerite.getId().toString());
            matchedFields.put("comprovantePageId", comprovante.getId().toString());
            matchedFields.put("jobId", holerite.getJobId().toString());
            matchedFields.put("method", method);
            matchedFields.put("cpf", holerite.getCpf() != null ? holerite.getCpf() : "");
            matchedFields.put("name", holerite.getName() != null ? holerite.getName() : "");
            matchedFields.put("value", holerite.getLiquidValue() != null ? holerite.getLiquidValue().toString() : "");
            matchedFields.put("period", holerite.getPeriod() != null ? holerite.getPeriod() : "");
            matchedFields.put("month", extractMonth(holerite.getPeriod()) != null ? extractMonth(holerite.getPeriod()).toString() : "");
            matchedFields.put("year", extractYear(holerite.getPeriod()) != null ? extractYear(holerite.getPeriod()).toString() : "");
            matchedFields.put("confidence", "1.0");
            
            redisTemplate.opsForStream().add(STREAM_MATCHED, matchedFields);
            
            log.info("Match publicado para processamento: Holerite {} ↔ Comprovante {}", 
                holerite.getId(), comprovante.getId());
        } catch (Exception e) {
            log.error("Erro ao publicar match", e);
        }
    }
    
    private void markAsAmbiguous(DocumentPage holerite, DocumentPage comprovante, double similarity) {
        log.warn("Match ambíguo detectado - Holerite: {}, Comprovante: {}, Similaridade: {}", 
            holerite.getId(), comprovante.getId(), similarity);
        
        Map<String, String> reviewFields = new HashMap<>();
        reviewFields.put("holeriteId", holerite.getId().toString());
        reviewFields.put("comprovanteId", comprovante.getId().toString());
        reviewFields.put("similarity", String.valueOf(similarity));
        reviewFields.put("reason", "AMBIGUOUS_MATCH");
        
        redisTemplate.opsForStream().add(STREAM_REVIEW, reviewFields);
    }
    
    private void markAsUnmatched(DocumentPage holerite) {
        log.info("🟡 MatcherWorker: Holerite sem match - ID: {}, CPF: {}, Nome: {}, Período: {}", 
            holerite.getId(), holerite.getCpf(), holerite.getName(), holerite.getPeriod());
        
        try {
            Map<String, String> reviewFields = new HashMap<>();
            reviewFields.put("holeriteId", holerite.getId().toString());
            reviewFields.put("reason", "NO_MATCH");
            reviewFields.put("jobId", holerite.getJobId().toString());
            
            redisTemplate.opsForStream().add(STREAM_REVIEW, reviewFields);
            log.info("✅ MatcherWorker: Holerite sem match publicado no stream:review - ID: {}", holerite.getId());
        } catch (Exception e) {
            log.error("❌ MatcherWorker: Erro ao publicar holerite sem match no stream:review", e);
        }
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
}

