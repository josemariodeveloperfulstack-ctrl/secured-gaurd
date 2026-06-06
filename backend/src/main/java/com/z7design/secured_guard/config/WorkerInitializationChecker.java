package com.z7design.secured_guard.config;

import com.z7design.secured_guard.worker.*;
import com.z7design.secured_guard.worker.SplitterWorker;
import com.z7design.secured_guard.worker.OcrWorker;
import com.z7design.secured_guard.worker.ParserWorker;
import com.z7design.secured_guard.worker.UnmatchedPayslipWorker;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.workers.enabled", havingValue = "true", matchIfMissing = true)
public class WorkerInitializationChecker {

    private final ApplicationContext applicationContext;

    public WorkerInitializationChecker(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void checkWorkersAfterStartup() {
        log.info("═══════════════════════════════════════════════════════════");
        log.info("🔍 VERIFICANDO WORKERS APÓS INICIALIZAÇÃO DA APLICAÇÃO");
        log.info("═══════════════════════════════════════════════════════════");

        try {
            // Verificar SplitterWorker
            try {
                SplitterWorker splitterWorker = applicationContext.getBean(SplitterWorker.class);
                log.info("✅ SplitterWorker: BEAN ENCONTRADO - {}", splitterWorker.getClass().getName());
            } catch (Exception e) {
                log.error("❌ SplitterWorker: BEAN NÃO ENCONTRADO - {}", e.getMessage());
            }

            // Verificar OcrWorker
            try {
                OcrWorker ocrWorker = applicationContext.getBean(OcrWorker.class);
                log.info("✅ OcrWorker: BEAN ENCONTRADO - {}", ocrWorker.getClass().getName());
            } catch (Exception e) {
                log.error("❌ OcrWorker: BEAN NÃO ENCONTRADO - {}", e.getMessage());
            }

            // Verificar ParserWorker
            try {
                ParserWorker parserWorker = applicationContext.getBean(ParserWorker.class);
                log.info("✅ ParserWorker: BEAN ENCONTRADO - {}", parserWorker.getClass().getName());
            } catch (Exception e) {
                log.error("❌ ParserWorker: BEAN NÃO ENCONTRADO - {}", e.getMessage());
            }

            // O MatcherWorker foi desativado conforme design atual (matching na unificação)

            // Verificar UnmatchedPayslipWorker
            try {
                UnmatchedPayslipWorker unmatchedWorker = applicationContext.getBean(UnmatchedPayslipWorker.class);
                log.info("✅ UnmatchedPayslipWorker: BEAN ENCONTRADO - {}", unmatchedWorker.getClass().getName());
            } catch (Exception e) {
                log.error("❌ UnmatchedPayslipWorker: BEAN NÃO ENCONTRADO - {}", e.getMessage());
            }

            // Listar todos os beans com "Worker" no nome
            String[] workerBeans = applicationContext.getBeanNamesForType(Object.class);
            int workerCount = 0;
            for (String beanName : workerBeans) {
                if (beanName.toLowerCase().contains("worker")) {
                    log.info("🔍 Bean encontrado: {}", beanName);
                    workerCount++;
                }
            }
            log.info("📊 Total de beans com 'worker' no nome: {}", workerCount);

        } catch (Exception e) {
            log.error("❌ Erro ao verificar workers: {}", e.getMessage(), e);
        }

        log.info("═══════════════════════════════════════════════════════════");
    }
}
