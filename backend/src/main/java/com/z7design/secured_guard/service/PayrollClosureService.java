package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.PayrollClosure;
import com.z7design.secured_guard.model.TimeRecord;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.PayrollClosureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollClosureService {

    private final PayrollClosureRepository payrollClosureRepository;
    private final EmployeeRepository employeeRepository;
    private final TimeRecordService timeRecordService;

    @Transactional
    public PayrollClosure generateClosure(UUID employeeId, int month, int year, UUID closedById) {
        log.info("📊 Gerando fechamento - Employee: {}, Período: {}/{}", employeeId, month, year);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Verificar se já existe fechamento
        payrollClosureRepository.findByEmployeeIdAndReferenceMonthAndReferenceYear(
                employeeId, month, year
        ).ifPresent(existing -> {
            throw new RuntimeException("Já existe fechamento para este período");
        });

        // Definir período
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.with(TemporalAdjusters.lastDayOfMonth());

        // Buscar registros do período
        List<TimeRecord> records = timeRecordService.getRecordsByPeriod(employeeId, startDate, endDate);

        // Calcular métricas
        Map<String, Object> metrics = calculateMetrics(records, startDate, endDate);

        // Criar fechamento
        PayrollClosure closure = new PayrollClosure();
        closure.setEmployee(employee);
        closure.setReferenceMonth(month);
        closure.setReferenceYear(year);
        closure.setStartDate(startDate);
        closure.setEndDate(endDate);
        
        closure.setTotalHoursWorked((BigDecimal) metrics.get("totalHours"));
        closure.setRegularHours((BigDecimal) metrics.get("regularHours"));
        closure.setOvertime50((BigDecimal) metrics.get("overtime50"));
        closure.setOvertime100((BigDecimal) metrics.get("overtime100"));
        closure.setNightShiftHours((BigDecimal) metrics.get("nightShiftHours"));
        closure.setTotalDelaysMinutes((Integer) metrics.get("totalDelays"));
        closure.setTotalAbsencesDays((Integer) metrics.get("totalAbsences"));
        closure.setWorkedDays((Integer) metrics.get("workedDays"));
        closure.setExpectedDays((Integer) metrics.get("expectedDays"));
        
        closure.setStatus(PayrollClosure.ClosureStatus.DRAFT);
        closure.setClosedById(closedById);

        PayrollClosure saved = payrollClosureRepository.save(closure);
        log.info("✅ Fechamento gerado - ID: {}", saved.getId());

        return saved;
    }

    private Map<String, Object> calculateMetrics(List<TimeRecord> records, LocalDate startDate, LocalDate endDate) {
        Map<String, Object> metrics = new HashMap<>();

        // Agrupar registros por dia
        Map<LocalDate, List<TimeRecord>> recordsByDay = new HashMap<>();
        for (TimeRecord record : records) {
            LocalDate date = record.getRecordedAt().toLocalDate();
            recordsByDay.computeIfAbsent(date, k -> new ArrayList<>()).add(record);
        }

        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal regularHours = BigDecimal.ZERO;
        BigDecimal overtime50 = BigDecimal.ZERO;
        BigDecimal overtime100 = BigDecimal.ZERO;
        BigDecimal nightShiftHours = BigDecimal.ZERO;
        int totalDelays = 0;
        int workedDays = recordsByDay.size();

        // Processar cada dia
        for (Map.Entry<LocalDate, List<TimeRecord>> entry : recordsByDay.entrySet()) {
            List<TimeRecord> dayRecords = entry.getValue();
            dayRecords.sort((a, b) -> a.getRecordedAt().compareTo(b.getRecordedAt()));

            LocalDateTime entrada = null;
            LocalDateTime saidaAlmoco = null;
            LocalDateTime retornoAlmoco = null;
            LocalDateTime saida = null;

            for (TimeRecord record : dayRecords) {
                switch (record.getRecordType()) {
                    case ENTRADA:
                        entrada = record.getRecordedAt();
                        break;
                    case SAIDA_ALMOCO:
                        saidaAlmoco = record.getRecordedAt();
                        break;
                    case RETORNO_ALMOCO:
                        retornoAlmoco = record.getRecordedAt();
                        break;
                    case SAIDA:
                        saida = record.getRecordedAt();
                        break;
                }
            }

            if (entrada != null && saida != null) {
                // Calcular horas trabalhadas
                long totalMinutes = Duration.between(entrada, saida).toMinutes();
                
                // Subtrair tempo de almoço
                if (saidaAlmoco != null && retornoAlmoco != null) {
                    long lunchMinutes = Duration.between(saidaAlmoco, retornoAlmoco).toMinutes();
                    totalMinutes -= lunchMinutes;
                }

                BigDecimal hoursWorked = BigDecimal.valueOf(totalMinutes)
                        .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
                
                totalHours = totalHours.add(hoursWorked);

                // Calcular horas regulares e extras (baseado em 8h/dia)
                BigDecimal regularDailyHours = BigDecimal.valueOf(8);
                if (hoursWorked.compareTo(regularDailyHours) <= 0) {
                    regularHours = regularHours.add(hoursWorked);
                } else {
                    regularHours = regularHours.add(regularDailyHours);
                    BigDecimal extraHours = hoursWorked.subtract(regularDailyHours);
                    
                    // Primeiras 2h extras = 50%, restante = 100%
                    BigDecimal firstTwoHours = extraHours.min(BigDecimal.valueOf(2));
                    overtime50 = overtime50.add(firstTwoHours);
                    
                    if (extraHours.compareTo(BigDecimal.valueOf(2)) > 0) {
                        BigDecimal remainingHours = extraHours.subtract(BigDecimal.valueOf(2));
                        overtime100 = overtime100.add(remainingHours);
                    }
                }

                // Calcular adicional noturno (22h às 5h)
                BigDecimal nightHours = calculateNightShiftHours(entrada, saida);
                nightShiftHours = nightShiftHours.add(nightHours);

                // Calcular atrasos (tolerância de 10 minutos)
                LocalTime expectedStart = LocalTime.of(8, 0); // Configurável
                LocalTime actualStart = entrada.toLocalTime();
                
                if (actualStart.isAfter(expectedStart.plusMinutes(10))) {
                    long delayMinutes = Duration.between(expectedStart, actualStart).toMinutes();
                    totalDelays += delayMinutes;
                }
            }
        }

        // Calcular dias úteis esperados no mês
        int expectedDays = calculateWorkingDays(startDate, endDate);
        int totalAbsences = expectedDays - workedDays;

        metrics.put("totalHours", totalHours);
        metrics.put("regularHours", regularHours);
        metrics.put("overtime50", overtime50);
        metrics.put("overtime100", overtime100);
        metrics.put("nightShiftHours", nightShiftHours);
        metrics.put("totalDelays", totalDelays);
        metrics.put("totalAbsences", Math.max(0, totalAbsences));
        metrics.put("workedDays", workedDays);
        metrics.put("expectedDays", expectedDays);

        return metrics;
    }

    private BigDecimal calculateNightShiftHours(LocalDateTime start, LocalDateTime end) {
        // Período noturno: 22h às 5h
        LocalTime nightStart = LocalTime.of(22, 0);
        LocalTime nightEnd = LocalTime.of(5, 0);
        
        BigDecimal nightHours = BigDecimal.ZERO;
        LocalDateTime current = start;

        while (current.isBefore(end)) {
            LocalTime currentTime = current.toLocalTime();
            LocalDateTime nextHour = current.plusHours(1).withMinute(0).withSecond(0);
            if (nextHour.isAfter(end)) {
                nextHour = end;
            }

            // Verificar se está no período noturno
            if (currentTime.isAfter(nightStart) || currentTime.isBefore(nightEnd)) {
                long minutes = Duration.between(current, nextHour).toMinutes();
                nightHours = nightHours.add(BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
            }

            current = nextHour;
        }

        return nightHours;
    }

    private int calculateWorkingDays(LocalDate start, LocalDate end) {
        int workingDays = 0;
        LocalDate current = start;

        while (!current.isAfter(end)) {
            DayOfWeek dayOfWeek = current.getDayOfWeek();
            if (dayOfWeek != DayOfWeek.SATURDAY && dayOfWeek != DayOfWeek.SUNDAY) {
                workingDays++;
            }
            current = current.plusDays(1);
        }

        return workingDays;
    }

    @Transactional
    public PayrollClosure closeClosure(UUID closureId, UUID closedById) {
        PayrollClosure closure = payrollClosureRepository.findById(closureId)
                .orElseThrow(() -> new RuntimeException("Fechamento não encontrado"));

        if (closure.getStatus() != PayrollClosure.ClosureStatus.DRAFT) {
            throw new RuntimeException("Fechamento já foi finalizado");
        }

        closure.setStatus(PayrollClosure.ClosureStatus.CLOSED);
        closure.setClosedAt(LocalDateTime.now());
        closure.setClosedById(closedById);

        return payrollClosureRepository.save(closure);
    }

    public Page<PayrollClosure> getClosuresByEmployee(UUID employeeId, Pageable pageable) {
        return payrollClosureRepository.findByEmployeeIdOrderByReferenceYearDescReferenceMonthDesc(
                employeeId, pageable);
    }

    public List<PayrollClosure> getClosuresByPeriod(int month, int year) {
        return payrollClosureRepository.findByReferenceMonthAndReferenceYearOrderByEmployeeNameAsc(
                month, year);
    }

    @Transactional
    public List<PayrollClosure> generateBatchClosures(int month, int year, UUID closedById) {
        log.info("📊 Gerando fechamentos em lote - Período: {}/{}", month, year);

        List<Employee> activeEmployees = employeeRepository.findByActiveTrue();
        List<PayrollClosure> closures = new ArrayList<>();

        for (Employee employee : activeEmployees) {
            try {
                PayrollClosure closure = generateClosure(employee.getId(), month, year, closedById);
                closures.add(closure);
                log.info("✅ Fechamento gerado para: {}", employee.getName());
            } catch (Exception e) {
                log.error("❌ Erro ao gerar fechamento para {}: {}", employee.getName(), e.getMessage());
            }
        }

        log.info("✅ Fechamentos em lote concluídos: {} de {}", closures.size(), activeEmployees.size());
        return closures;
    }
}

