package com.z7design.secured_guard.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Configuração de PROTEÇÃO para testes com Baileys
 * 
 * ⚠️ TEMPORÁRIO - Apenas para desenvolvimento/testes
 * 
 * Esta classe limita o envio de mensagens WhatsApp via Baileys
 * para evitar detecção/banimento durante fase de testes.
 */
@Configuration
@Component
@Slf4j
public class WhatsAppTestConfig {

    @Value("${whatsapp.test.mode:false}")
    private boolean testMode;

    @Value("${whatsapp.max.messages.per.day:20}")
    private int maxMessagesPerDay;

    @Value("${whatsapp.test.numbers:}")
    private String testNumbersConfig;

    @Value("${baileys.enabled:false}")
    private boolean baileysEnabled;

    private final AtomicInteger messagesCount = new AtomicInteger(0);
    private LocalDate lastResetDate = LocalDate.now();
    private List<String> allowedTestNumbers;

    @PostConstruct
    public void init() {
        if (testMode && baileysEnabled) {
            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.warn("⚠️  MODO DE TESTE ATIVADO - USANDO BAILEYS (NÃO OFICIAL)");
            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.warn("🚨 ATENÇÃO:");
            log.warn("   - Baileys NÃO é aprovado pela Meta");
            log.warn("   - Use APENAS para testes locais");
            log.warn("   - Limite: {} mensagens/dia", maxMessagesPerDay);
            log.warn("   - NÃO use em produção!");
            log.warn("   - Migre para WhatsApp Cloud API antes de produção");
            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

            if (testNumbersConfig != null && !testNumbersConfig.isEmpty()) {
                allowedTestNumbers = Arrays.asList(testNumbersConfig.split(","));
                log.info("✅ Números permitidos para teste: {}", allowedTestNumbers);
            }
        } else if (baileysEnabled && !testMode) {
            log.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.error("🔴 ERRO CRÍTICO: Baileys habilitado SEM modo de teste!");
            log.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.error("⚠️  Configure whatsapp.test.mode=true no application.properties");
            log.error("⚠️  OU migre para WhatsApp Cloud API oficial");
            log.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        }
    }

    /**
     * Verifica se pode enviar mensagem (proteção contra banimento)
     */
    public boolean canSendMessage(String phoneNumber) {
        if (!testMode || !baileysEnabled) {
            return true; // Sem restrições se não estiver em modo teste com Baileys
        }

        if (maxMessagesPerDay <= 0) {
            // Modo ilimitado
            return true;
        }

        // Resetar contador diário
        if (!LocalDate.now().equals(lastResetDate)) {
            messagesCount.set(0);
            lastResetDate = LocalDate.now();
            log.info("🔄 Contador de mensagens resetado para novo dia");
        }

        // Verificar limite diário
        if (messagesCount.get() >= maxMessagesPerDay) {
            log.error("🚫 LIMITE DIÁRIO ATINGIDO: {}/{} mensagens", messagesCount.get(), maxMessagesPerDay);
            log.error("⚠️  Aguarde até amanhã OU migre para WhatsApp Cloud API");
            return false;
        }

        // Verificar se número está na lista permitida (se configurada)
        if (allowedTestNumbers != null && !allowedTestNumbers.isEmpty()) {
            String normalized = phoneNumber.replaceAll("[^0-9]", "");
            boolean allowed = allowedTestNumbers.stream()
                    .anyMatch(testNum -> testNum.replaceAll("[^0-9]", "").equals(normalized));
            
            if (!allowed) {
                log.warn("⚠️  Número {} NÃO está na lista de testes permitidos", phoneNumber);
                log.warn("📋 Números permitidos: {}", allowedTestNumbers);
                return false;
            }
        }

        return true;
    }

    /**
     * Incrementa contador de mensagens enviadas
     */
    public void incrementMessageCount() {
        if (testMode && baileysEnabled && maxMessagesPerDay > 0) {
            int count = messagesCount.incrementAndGet();
            log.info("📊 Mensagens enviadas hoje: {}/{}", count, maxMessagesPerDay);
            
            if (count >= maxMessagesPerDay * 0.8) {
                log.warn("⚠️  Você está próximo do limite diário! ({}/{})", count, maxMessagesPerDay);
            }
        }
    }

    /**
     * Verifica se está em modo de teste
     */
    public boolean isTestMode() {
        return testMode && baileysEnabled;
    }

    /**
     * Retorna quantas mensagens ainda podem ser enviadas hoje
     */
    public int getRemainingMessages() {
        if (!testMode || !baileysEnabled) {
            return Integer.MAX_VALUE;
        }
        if (maxMessagesPerDay <= 0) {
            return Integer.MAX_VALUE;
        }
        return Math.max(0, maxMessagesPerDay - messagesCount.get());
    }

    /**
     * Exibe aviso de migração
     */
    public void showMigrationWarning() {
        if (testMode && baileysEnabled) {
            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.warn("🚀 LEMBRE-SE: Migre para WhatsApp Cloud API antes de produção!");
            log.warn("📄 Guia: MIGRACAO_WHATSAPP_BUSINESS_API_OFICIAL.md");
            log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        }
    }
}

