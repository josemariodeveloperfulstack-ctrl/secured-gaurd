package com.z7design.secured_guard.service;

import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.PayPeriod;
import com.z7design.secured_guard.repository.PayPeriodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service para gerenciar períodos de fechamento de folha
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PayPeriodService {

    private final PayPeriodRepository payPeriodRepository;

    /**
     * Cria ou retorna período mensal para um mês/ano específico
     */
    @Transactional
    public PayPeriod getOrCreateMonthlyPeriod(int year, int month) {
        Optional<PayPeriod> existing = payPeriodRepository.findMonthlyPeriod(year, month);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Criar período mensal
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        PayPeriod period = new PayPeriod();
        period.setName(yearMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.forLanguageTag("pt-BR"))));
        period.setStartDate(startDate);
        period.setEndDate(endDate);
        period.setType(PayPeriod.PeriodType.MONTHLY);
        period.setReferenceMonth(month);
        period.setReferenceYear(year);
        period.setIsClosed(false);

        PayPeriod saved = payPeriodRepository.save(period);
        log.info("✅ Período mensal criado: {} - {} a {}", saved.getName(), startDate, endDate);
        return saved;
    }

    /**
     * Cria um período customizado
     */
    @Transactional
    public PayPeriod createCustomPeriod(String name, LocalDate startDate, LocalDate endDate, String description) {
        log.info("📅 Criando período customizado: {} - {} a {}", name, startDate, endDate);

        if (endDate.isBefore(startDate)) {
            throw new RuntimeException("Data final deve ser posterior à data inicial");
        }

        PayPeriod period = new PayPeriod();
        period.setName(name);
        period.setStartDate(startDate);
        period.setEndDate(endDate);
        period.setType(PayPeriod.PeriodType.CUSTOM);
        period.setReferenceMonth(startDate.getMonthValue());
        period.setReferenceYear(startDate.getYear());
        period.setDescription(description);
        period.setIsClosed(false);

        PayPeriod saved = payPeriodRepository.save(period);
        log.info("✅ Período customizado criado - ID: {}", saved.getId());
        return saved;
    }

    /**
     * Cria período quinzenal
     */
    @Transactional
    public PayPeriod createBiweeklyPeriod(int year, int month, int quinzena) {
        if (quinzena != 1 && quinzena != 2) {
            throw new RuntimeException("Quinzena deve ser 1 ou 2");
        }

        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate;
        LocalDate endDate;

        if (quinzena == 1) {
            startDate = yearMonth.atDay(1);
            endDate = yearMonth.atDay(15);
        } else {
            startDate = yearMonth.atDay(16);
            endDate = yearMonth.atEndOfMonth();
        }

        String name = String.format("%dª Quinzena - %s", quinzena, 
                yearMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.forLanguageTag("pt-BR"))));

        PayPeriod period = new PayPeriod();
        period.setName(name);
        period.setStartDate(startDate);
        period.setEndDate(endDate);
        period.setType(PayPeriod.PeriodType.BIWEEKLY);
        period.setReferenceMonth(month);
        period.setReferenceYear(year);
        period.setIsClosed(false);

        PayPeriod saved = payPeriodRepository.save(period);
        log.info("✅ Período quinzenal criado: {}", saved.getName());
        return saved;
    }

    @Transactional
    public PayPeriod create(PayPeriod period) {
        log.info("📅 Criando período: {}", period.getName());
        
        if (period.getEndDate().isBefore(period.getStartDate())) {
            throw new RuntimeException("Data final deve ser posterior à data inicial");
        }
        
        PayPeriod saved = payPeriodRepository.save(period);
        log.info("✅ Período criado com sucesso - ID: {}", saved.getId());
        return saved;
    }

    @Transactional
    public PayPeriod update(UUID id, PayPeriod period) {
        log.info("📅 Atualizando período: {}", id);
        
        PayPeriod existing = findById(id);
        period.setId(id);
        period.setCreatedAt(existing.getCreatedAt());
        
        if (period.getEndDate().isBefore(period.getStartDate())) {
            throw new RuntimeException("Data final deve ser posterior à data inicial");
        }
        
        PayPeriod updated = payPeriodRepository.save(period);
        log.info("✅ Período atualizado com sucesso - ID: {}", updated.getId());
        return updated;
    }

    @Transactional
    public PayPeriod closePeriod(UUID id, UUID closedById) {
        log.info("📅 Fechando período: {} por usuário: {}", id, closedById);
        
        PayPeriod period = findById(id);
        if (period.getIsClosed()) {
            throw new RuntimeException("Período já está fechado");
        }
        
        period.setIsClosed(true);
        period.setClosedAt(java.time.LocalDateTime.now());
        if (closedById != null) {
            period.setClosedById(closedById);
        }
        
        PayPeriod updated = payPeriodRepository.save(period);
        log.info("✅ Período fechado com sucesso - ID: {}", updated.getId());
        return updated;
    }

    @Transactional
    public void delete(UUID id) {
        log.info("📅 Deletando período: {}", id);
        PayPeriod period = findById(id);
        payPeriodRepository.delete(period);
        log.info("✅ Período deletado com sucesso - ID: {}", id);
    }

    public PayPeriod findById(UUID id) {
        return payPeriodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Período não encontrado: " + id));
    }

    public List<PayPeriod> findAll() {
        return payPeriodRepository.findAll();
    }

    public List<PayPeriod> findByType(PayPeriod.PeriodType type) {
        return payPeriodRepository.findByType(type);
    }

    public List<PayPeriod> findByMonthAndYear(int year, int month) {
        return payPeriodRepository.findByReferenceMonthAndYear(year, month);
    }

    public List<PayPeriod> findByYear(int year) {
        return payPeriodRepository.findByYear(year);
    }

    public List<PayPeriod> findOpenPeriods() {
        return payPeriodRepository.findOpenPeriods();
    }

    public List<PayPeriod> findClosedPeriods() {
        return payPeriodRepository.findClosedPeriods();
    }

    /**
     * Busca períodos que contêm uma data específica
     */
    public List<PayPeriod> findPeriodsContainingDate(LocalDate date) {
        return payPeriodRepository.findPeriodsContainingDate(date);
    }
}
