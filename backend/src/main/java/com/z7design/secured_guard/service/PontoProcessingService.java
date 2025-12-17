package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.repository.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service para processar batidas brutas do REP em registros estruturados de ponto
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PontoProcessingService {

    private final PontoRawRepository pontoRawRepository;
    private final TimeRecordRepository timeRecordRepository;
    private final TimeRecordService timeRecordService;
    private final EmployeeRepository employeeRepository;

    /**
     * Processa batidas brutas não processadas de um funcionário e converte em TimeRecord
     */
    @Transactional
    public ProcessingResult processBatidasForEmployee(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        log.info("🔄 Processando batidas para funcionário {} - Período: {} a {}", 
                 employeeId, startDate, endDate);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Buscar batidas brutas não processadas do período
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        List<PontoRaw> rawBatidas = pontoRawRepository.findByEmployeeIdAndTimestampBetweenOrderByTimestampAsc(
                employeeId, startDateTime, endDateTime);

        // Filtrar apenas não processadas
        rawBatidas = rawBatidas.stream()
                .filter(b -> !b.getProcessed())
                .collect(Collectors.toList());

        if (rawBatidas.isEmpty()) {
            log.info("ℹ️ Nenhuma batida não processada encontrada");
            return new ProcessingResult(0, 0, 0, new ArrayList<>());
        }

        // Agrupar batidas por dia
        Map<LocalDate, List<PontoRaw>> batidasByDay = rawBatidas.stream()
                .collect(Collectors.groupingBy(b -> b.getTimestamp().toLocalDate()));

        int processedCount = 0;
        int errorCount = 0;
        List<ProcessingError> errors = new ArrayList<>();

        // Processar cada dia
        for (Map.Entry<LocalDate, List<PontoRaw>> entry : batidasByDay.entrySet()) {
            LocalDate date = entry.getKey();
            List<PontoRaw> dayBatidas = entry.getValue();

            try {
                processDayBatidas(employee, date, dayBatidas);
                processedCount += dayBatidas.size();
            } catch (Exception e) {
                errorCount += dayBatidas.size();
                errors.add(new ProcessingError(date, e.getMessage(), dayBatidas.size()));
                log.error("❌ Erro ao processar batidas do dia {}: {}", date, e.getMessage(), e);
            }
        }

        log.info("✅ Processamento concluído - Processadas: {}, Erros: {}", processedCount, errorCount);
        return new ProcessingResult(processedCount, errorCount, 0, errors);
    }

    /**
     * Processa batidas de um dia específico, formando pares Entrada→Saída
     */
    private void processDayBatidas(Employee employee, LocalDate date, List<PontoRaw> dayBatidas) {
        // Ordenar batidas por timestamp
        dayBatidas.sort(Comparator.comparing(PontoRaw::getTimestamp));

        // Normalizar e formar pares
        List<TimeRecordPair> pairs = buildPairs(dayBatidas);

        // Se houver batidas ímpares, tratar
        if (hasOddBatidas(dayBatidas)) {
            log.warn("⚠️ Detectadas batidas ímpares para {} em {}", employee.getName(), date);
            // Aplicar regra configurável (por enquanto, apenas logar)
            handleOddBatidas(employee, date, dayBatidas);
        }

        // Criar TimeRecord para cada par válido
        for (TimeRecordPair pair : pairs) {
            if (pair.isValid()) {
                createTimeRecordFromPair(employee, pair);
                // Marcar batidas como processadas
                pair.getEntrada().setProcessed(true);
                pair.getEntrada().setProcessedAt(LocalDateTime.now());
                if (pair.getSaida() != null) {
                    pair.getSaida().setProcessed(true);
                    pair.getSaida().setProcessedAt(LocalDateTime.now());
                }
                pontoRawRepository.save(pair.getEntrada());
                if (pair.getSaida() != null) {
                    pontoRawRepository.save(pair.getSaida());
                }
            }
        }
    }

    /**
     * Forma pares Entrada→Saída a partir das batidas do dia
     */
    private List<TimeRecordPair> buildPairs(List<PontoRaw> dayBatidas) {
        List<TimeRecordPair> pairs = new ArrayList<>();
        PontoRaw entrada = null;

        for (PontoRaw batida : dayBatidas) {
            if (batida.getTipo() == PontoRaw.BatidaTipo.ENTRADA) {
                // Se já havia uma entrada sem saída, criar par incompleto
                if (entrada != null) {
                    pairs.add(new TimeRecordPair(entrada, null));
                }
                entrada = batida;
            } else if (batida.getTipo() == PontoRaw.BatidaTipo.SAIDA) {
                if (entrada != null) {
                    pairs.add(new TimeRecordPair(entrada, batida));
                    entrada = null;
                } else {
                    // Saída sem entrada - pode ser continuação do dia anterior ou erro
                    log.warn("⚠️ Saída sem entrada correspondente em {}", batida.getTimestamp());
                    pairs.add(new TimeRecordPair(null, batida));
                }
            }
        }

        // Se sobrou uma entrada sem saída, criar par incompleto
        if (entrada != null) {
            pairs.add(new TimeRecordPair(entrada, null));
        }

        return pairs;
    }

    /**
     * Verifica se há batidas ímpares (número ímpar ou desbalanceamento)
     */
    private boolean hasOddBatidas(List<PontoRaw> dayBatidas) {
        long entradaCount = dayBatidas.stream()
                .filter(b -> b.getTipo() == PontoRaw.BatidaTipo.ENTRADA)
                .count();
        long saidaCount = dayBatidas.stream()
                .filter(b -> b.getTipo() == PontoRaw.BatidaTipo.SAIDA)
                .count();

        return entradaCount != saidaCount;
    }

    /**
     * Trata batidas ímpares (ex: entrada sem saída, saída sem entrada)
     */
    private void handleOddBatidas(Employee employee, LocalDate date, List<PontoRaw> dayBatidas) {
        long entradaCount = dayBatidas.stream()
                .filter(b -> b.getTipo() == PontoRaw.BatidaTipo.ENTRADA)
                .count();
        long saidaCount = dayBatidas.stream()
                .filter(b -> b.getTipo() == PontoRaw.BatidaTipo.SAIDA)
                .count();

        if (entradaCount > saidaCount) {
            log.warn("⚠️ {} entradas sem saída para {} em {}", 
                     entradaCount - saidaCount, employee.getName(), date);
            // Regra configurável: assumir saída padrão (ex: 17:00) ou deixar pendente
        } else if (saidaCount > entradaCount) {
            log.warn("⚠️ {} saídas sem entrada para {} em {}", 
                     saidaCount - entradaCount, employee.getName(), date);
            // Regra configurável: assumir entrada padrão (ex: 08:00) ou deixar pendente
        }
    }

    /**
     * Cria um TimeRecord a partir de um par de batidas
     * Para batidas do REP, criamos apenas ENTRADA e SAIDA (almoço será inferido se necessário)
     */
    private void createTimeRecordFromPair(Employee employee, TimeRecordPair pair) {
        if (!pair.isValid() || pair.getEntrada() == null) {
            return; // Par inválido, não criar registro
        }

        // Verificar se já existe registro para esta batida (evitar duplicatas)
        if (timeRecordRepository.findByEmployeeIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                employee.getId(), 
                pair.getEntrada().getTimestamp().minusSeconds(1), 
                pair.getEntrada().getTimestamp().plusSeconds(1))
                .stream().anyMatch(tr -> tr.getRecordType() == TimeRecord.RecordType.ENTRADA)) {
            log.debug("Registro de entrada já existe, pulando");
            return;
        }

        // Criar registro de entrada
        TimeRecord entradaRecord = new TimeRecord();
        entradaRecord.setEmployee(employee);
        entradaRecord.setRecordType(TimeRecord.RecordType.ENTRADA);
        entradaRecord.setRecordedAt(pair.getEntrada().getTimestamp());
        entradaRecord.setIsManual(false); // Importado do REP
        entradaRecord.setStatus(TimeRecord.RecordStatus.APPROVED); // Pré-aprovado
        entradaRecord.setJustification("Importado do REP - " + pair.getEntrada().getImportHash());
        timeRecordRepository.save(entradaRecord);

        // Se houver saída, criar registro de saída
        if (pair.getSaida() != null) {
            // Verificar se há intervalo de almoço (heurística: mais de 8h entre entrada e saída)
            long minutesBetween = java.time.Duration.between(
                    pair.getEntrada().getTimestamp(), 
                    pair.getSaida().getTimestamp()).toMinutes();

            if (minutesBetween > 480) { // Mais de 8h trabalhadas (provavelmente tem almoço)
                // Criar registros de saída e retorno do almoço (assumindo 1h de almoço às 12:00)
                LocalDateTime saidaAlmoco = pair.getEntrada().getTimestamp().toLocalDate()
                        .atTime(12, 0); // 12:00
                LocalDateTime retornoAlmoco = saidaAlmoco.plusHours(1); // 13:00

                // Garantir que está entre entrada e saída
                if (saidaAlmoco.isAfter(pair.getEntrada().getTimestamp()) && 
                    retornoAlmoco.isBefore(pair.getSaida().getTimestamp())) {
                    
                    TimeRecord saidaAlmocoRecord = new TimeRecord();
                    saidaAlmocoRecord.setEmployee(employee);
                    saidaAlmocoRecord.setRecordType(TimeRecord.RecordType.SAIDA_ALMOCO);
                    saidaAlmocoRecord.setRecordedAt(saidaAlmoco);
                    saidaAlmocoRecord.setIsManual(false);
                    saidaAlmocoRecord.setStatus(TimeRecord.RecordStatus.APPROVED);
                    saidaAlmocoRecord.setJustification("Inferido do REP - intervalo estimado");
                    timeRecordRepository.save(saidaAlmocoRecord);

                    TimeRecord retornoAlmocoRecord = new TimeRecord();
                    retornoAlmocoRecord.setEmployee(employee);
                    retornoAlmocoRecord.setRecordType(TimeRecord.RecordType.RETORNO_ALMOCO);
                    retornoAlmocoRecord.setRecordedAt(retornoAlmoco);
                    retornoAlmocoRecord.setIsManual(false);
                    retornoAlmocoRecord.setStatus(TimeRecord.RecordStatus.APPROVED);
                    retornoAlmocoRecord.setJustification("Inferido do REP - intervalo estimado");
                    retornoAlmocoRecord.setProcessingNotes("Inferido automaticamente");
                    timeRecordRepository.save(retornoAlmocoRecord);
                }
            }

            // Criar registro de saída
            TimeRecord saidaRecord = new TimeRecord();
            saidaRecord.setEmployee(employee);
            saidaRecord.setRecordType(TimeRecord.RecordType.SAIDA);
            saidaRecord.setRecordedAt(pair.getSaida().getTimestamp());
            saidaRecord.setIsManual(false);
            saidaRecord.setStatus(TimeRecord.RecordStatus.APPROVED);
            saidaRecord.setJustification("Importado do REP - " + pair.getSaida().getImportHash());
            timeRecordRepository.save(saidaRecord);
        }
    }

    /**
     * Classe interna para representar um par Entrada→Saída
     */
    @Data
    public static class TimeRecordPair {
        private PontoRaw entrada;
        private PontoRaw saida;

        public TimeRecordPair(PontoRaw entrada, PontoRaw saida) {
            this.entrada = entrada;
            this.saida = saida;
        }

        public boolean isValid() {
            return entrada != null; // Mínimo: ter entrada
        }
    }

    /**
     * Resultado do processamento
     */
    @Data
    public static class ProcessingResult {
        private int processedCount;
        private int errorCount;
        private int warningCount;
        private List<ProcessingError> errors;

        public ProcessingResult(int processedCount, int errorCount, int warningCount, List<ProcessingError> errors) {
            this.processedCount = processedCount;
            this.errorCount = errorCount;
            this.warningCount = warningCount;
            this.errors = errors;
        }
    }

    /**
     * Erro de processamento
     */
    @Data
    public static class ProcessingError {
        private LocalDate date;
        private String message;
        private int batidaCount;

        public ProcessingError(LocalDate date, String message, int batidaCount) {
            this.date = date;
            this.message = message;
            this.batidaCount = batidaCount;
        }
    }
}

