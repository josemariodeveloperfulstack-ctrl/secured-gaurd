package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.model.ContractPayrollConfig;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.PayPeriod;
import com.z7design.secured_guard.model.PayrollClosure;
import com.z7design.secured_guard.model.TimeRecord;
import com.z7design.secured_guard.repository.AbsenceRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.PayrollClosureRepository;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollClosureService {

    private final PayrollClosureRepository payrollClosureRepository;
    private final EmployeeRepository employeeRepository;
    private final TimeRecordService timeRecordService;
    private final ContractPayrollConfigService contractPayrollConfigService;
    private final PayPeriodService payPeriodService;
    private final BankHoursService bankHoursService;
    private final PayrollItemService payrollItemService;
    private final AbsenceRepository absenceRepository;

    /**
     * Gera fechamento para um período mensal (compatibilidade com código existente)
     */
    @Transactional
    public PayrollClosure generateClosure(UUID employeeId, int month, int year, UUID closedById) {
        // Buscar ou criar período mensal
        PayPeriod period = payPeriodService.getOrCreateMonthlyPeriod(year, month);
        return generateClosureForPeriod(employeeId, period.getId(), closedById);
    }

    /**
     * Gera fechamento para um período específico (mensal, quinzenal, customizado)
     */
    @Transactional
    public PayrollClosure generateClosureForPeriod(UUID employeeId, UUID payPeriodId, UUID closedById) {
        log.info("📊 Gerando fechamento - Employee: {}, PayPeriod: {}", employeeId, payPeriodId);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        PayPeriod payPeriod = payPeriodService.findById(payPeriodId);

        // Verificar se já existe fechamento para este período
        payrollClosureRepository.findByEmployeeIdAndPayPeriodId(employeeId, payPeriodId)
                .ifPresent(existing -> {
                    throw new RuntimeException("Já existe fechamento para este período");
                });

        // Usar datas do período
        LocalDate startDate = payPeriod.getStartDate();
        LocalDate endDate = payPeriod.getEndDate();
        int month = payPeriod.getReferenceMonth() != null ? payPeriod.getReferenceMonth() : startDate.getMonthValue();
        int year = payPeriod.getReferenceYear() != null ? payPeriod.getReferenceYear() : startDate.getYear();

        // Buscar registros do período
        List<TimeRecord> records = timeRecordService.getRecordsByPeriod(employeeId, startDate, endDate);

        // Buscar configuração de folha para o funcionário
        ContractPayrollConfig config = contractPayrollConfigService.getConfigForEmployee(employeeId);

        // Calcular métricas usando configurações (inclui faltas justificadas/atestado e horas justificadas)
        Map<String, Object> metrics = calculateMetrics(employeeId, records, startDate, endDate, config);

        // Criar fechamento
        PayrollClosure closure = new PayrollClosure();
        closure.setEmployee(employee);
        closure.setPayPeriod(payPeriod);
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

        // Processar banco de horas se habilitado (após salvar o fechamento)
        // Por enquanto, contractId será null (será melhorado quando houver relação Employee-Contract)
        try {
            UUID contractId = null; // TODO: Buscar contrato do funcionário quando houver relação
            bankHoursService.processOvertimeForBankHours(employeeId, contractId, saved);
        } catch (Exception e) {
            log.warn("⚠️ Erro ao processar banco de horas (não crítico): {}", e.getMessage());
            // Não falha o fechamento se houver erro no banco de horas
        }

        // Gerar itens de folha (PayrollItems) a partir do fechamento
        try {
            // Calcular valor por hora: salário / divisor de horas
            BigDecimal hourlyRate = calculateHourlyRate(employee, config);
            payrollItemService.generateItemsFromClosure(saved.getId(), hourlyRate);
            log.info("✅ Itens de folha gerados para fechamento {}", saved.getId());
        } catch (Exception e) {
            log.warn("⚠️ Erro ao gerar itens de folha (não crítico): {}", e.getMessage());
            // Não falha o fechamento se houver erro na geração de itens
        }

        return saved;
    }

    private Map<String, Object> calculateMetrics(UUID employeeId, List<TimeRecord> records, LocalDate startDate, LocalDate endDate, ContractPayrollConfig config) {
        Map<String, Object> metrics = new HashMap<>();

        // Agrupar registros por dia
        Map<LocalDate, List<TimeRecord>> recordsByDay = new HashMap<>();
        for (TimeRecord record : records) {
            LocalDate date = record.getRecordedAt().toLocalDate();
            recordsByDay.computeIfAbsent(date, k -> new ArrayList<>()).add(record);
        }

        // Faltas aprovadas no período (para atestado abonado e justificação de horas)
        List<Absence> absences = absenceRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
        Map<LocalDate, Absence> absenceByDate = absences.stream()
                .filter(a -> a.getStatus() == Absence.AbsenceStatus.APPROVED)
                .collect(Collectors.toMap(Absence::getAbsenceDate, a -> a, (a1, a2) -> a1));

        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal regularHours = BigDecimal.ZERO;
        BigDecimal overtime50 = BigDecimal.ZERO;
        BigDecimal overtime100 = BigDecimal.ZERO;
        BigDecimal nightShiftHours = BigDecimal.ZERO;
        int totalDelays = 0;
        int daysWithRecords = recordsByDay.size();
        int abonadoDays = 0;

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

                // Calcular horas regulares e extras usando configuração
                BigDecimal regularDailyHours = config.getDailyHours();
                if (hoursWorked.compareTo(regularDailyHours) <= 0) {
                    regularHours = regularHours.add(hoursWorked);
                } else {
                    regularHours = regularHours.add(regularDailyHours);
                    BigDecimal extraHours = hoursWorked.subtract(regularDailyHours);
                    
                    // Primeiras 2h extras = 50%, restante = 100% (configurável)
                    BigDecimal firstTwoHours = extraHours.min(BigDecimal.valueOf(2));
                    overtime50 = overtime50.add(firstTwoHours);
                    
                    if (extraHours.compareTo(BigDecimal.valueOf(2)) > 0) {
                        BigDecimal remainingHours = extraHours.subtract(BigDecimal.valueOf(2));
                        overtime100 = overtime100.add(remainingHours);
                    }
                }

                // Calcular adicional noturno usando configuração
                BigDecimal nightHours = calculateNightShiftHours(entrada, saida, config);
                nightShiftHours = nightShiftHours.add(nightHours);

                // Calcular atrasos usando tolerância configurável
                LocalTime expectedStart = config.getDefaultEntryTime();
                LocalTime actualStart = entrada.toLocalTime();
                int toleranceMinutes = config.getDelayToleranceMinutes();
                
                if (actualStart.isAfter(expectedStart.plusMinutes(toleranceMinutes))) {
                    long delayMinutes = Duration.between(expectedStart, actualStart).toMinutes();
                    totalDelays += delayMinutes;
                }
            }
        }

        // Dias úteis esperados no período
        int expectedDays = calculateWorkingDays(startDate, endDate);
        BigDecimal dailyHours = config.getDailyHours() != null ? config.getDailyHours() : BigDecimal.valueOf(8);

        // Processar dias sem registro de ponto: atestado (abonado) ou justificação de horas
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            if (current.getDayOfWeek() == DayOfWeek.SATURDAY || current.getDayOfWeek() == DayOfWeek.SUNDAY) {
                current = current.plusDays(1);
                continue;
            }
            if (recordsByDay.containsKey(current)) {
                current = current.plusDays(1);
                continue;
            }
            Absence absence = absenceByDate.get(current);
            if (absence != null) {
                boolean isAtestado = isAbsenceWithMedicalCertificate(absence);
                if (isAtestado) {
                    // Dia abonado: entra integralmente no cálculo das horas
                    totalHours = totalHours.add(dailyHours);
                    regularHours = regularHours.add(dailyHours);
                    abonadoDays++;
                } else if (absence.getJustifiedHours() != null && absence.getJustifiedHours().compareTo(BigDecimal.ZERO) > 0) {
                    // Apenas horas justificadas entram no cálculo; as horas não justificadas do dia contam como falta
                    totalHours = totalHours.add(absence.getJustifiedHours());
                    regularHours = regularHours.add(absence.getJustifiedHours());
                }
            }
            current = current.plusDays(1);
        }

        int workedDays = daysWithRecords + abonadoDays;
        int totalAbsences = Math.max(0, expectedDays - workedDays);

        metrics.put("totalHours", totalHours);
        metrics.put("regularHours", regularHours);
        metrics.put("overtime50", overtime50);
        metrics.put("overtime100", overtime100);
        metrics.put("nightShiftHours", nightShiftHours);
        metrics.put("totalDelays", totalDelays);
        metrics.put("totalAbsences", totalAbsences);
        metrics.put("workedDays", workedDays);
        metrics.put("expectedDays", expectedDays);

        return metrics;
    }

    /** Considera atestado: tipo licença médica ou presença de documento/ dias de atestado. */
    private boolean isAbsenceWithMedicalCertificate(Absence absence) {
        if (absence.getAbsenceType() == Absence.AbsenceType.SICK_LEAVE) {
            return true;
        }
        if (absence.getMedicalCertificateDays() != null && absence.getMedicalCertificateDays() > 0) {
            return true;
        }
        if (absence.getDocumentUrl() != null && !absence.getDocumentUrl().isBlank()) {
            return true;
        }
        return false;
    }

    private BigDecimal calculateNightShiftHours(LocalDateTime start, LocalDateTime end, ContractPayrollConfig config) {
        // Período noturno configurável
        LocalTime nightStart = config.getNightShiftStart();
        LocalTime nightEnd = config.getNightShiftEnd();
        
        BigDecimal nightHours = BigDecimal.ZERO;
        LocalDateTime current = start;

        while (current.isBefore(end)) {
            LocalTime currentTime = current.toLocalTime();
            LocalDateTime nextHour = current.plusHours(1).withMinute(0).withSecond(0);
            if (nextHour.isAfter(end)) {
                nextHour = end;
            }

            // Verificar se está no período noturno (considera período que atravessa meia-noite)
            boolean isNightTime = false;
            if (nightStart.isAfter(nightEnd)) {
                // Período atravessa meia-noite (ex: 22h às 5h)
                isNightTime = currentTime.isAfter(nightStart) || currentTime.isBefore(nightEnd);
            } else {
                // Período normal (ex: 20h às 22h)
                isNightTime = currentTime.isAfter(nightStart) && currentTime.isBefore(nightEnd);
            }

            if (isNightTime) {
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

    /**
     * Calcula valor por hora baseado no salário e divisor de horas
     */
    private BigDecimal calculateHourlyRate(Employee employee, ContractPayrollConfig config) {
        // Buscar salário do funcionário (pode ser null)
        BigDecimal salary = employee.getSalario();
        if (salary == null || salary.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Salário não encontrado para funcionário {}, usando valor padrão 0", employee.getId());
            return BigDecimal.ZERO;
        }

        // Calcular valor por hora: salário / divisor de horas
        BigDecimal hourDivisor = config.getHourDivisor();
        if (hourDivisor == null || hourDivisor.compareTo(BigDecimal.ZERO) <= 0) {
            hourDivisor = BigDecimal.valueOf(220.0); // Padrão CLT
        }

        return salary.divide(hourDivisor, 4, RoundingMode.HALF_UP);
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

    public PayrollClosure getClosureById(UUID closureId) {
        return payrollClosureRepository.findById(closureId)
                .orElseThrow(() -> new RuntimeException("Fechamento não encontrado: " + closureId));
    }

    public Page<PayrollClosure> getClosuresByEmployee(UUID employeeId, Pageable pageable) {
        return payrollClosureRepository.findByEmployeeIdOrderByReferenceYearDescReferenceMonthDesc(
                employeeId, pageable);
    }

    public List<PayrollClosure> getClosuresByPeriod(int month, int year) {
        return payrollClosureRepository.findByReferenceMonthAndReferenceYearWithEmployee(month, year);
    }

    /**
     * Gera fechamentos em lote para todos os funcionários ativos no período.
     * Sem transação única: cada fechamento roda em sua própria transação (@Transactional em generateClosure),
     * para que falha em um não marque o lote como rollback-only.
     */
    public List<PayrollClosure> generateBatchClosures(int month, int year, UUID closedById) {
        log.info("📊 Gerando fechamentos em lote - Período: {}/{}", month, year);

        List<Employee> activeEmployees = employeeRepository.findAll().stream()
                .filter(employee -> EmploymentStatus.ACTIVE.equals(employee.getStatus()))
                .collect(Collectors.toList());
        List<PayrollClosure> closures = new ArrayList<>();

        for (Employee employee : activeEmployees) {
            try {
                PayrollClosure closure = generateClosure(employee.getId(), month, year, closedById);
                closures.add(closure);
                log.info("✅ Fechamento gerado para: {}", employee.getName());
            } catch (Exception e) {
                log.error("❌ Erro ao gerar fechamento para {}: {}", employee.getName(), e.getMessage());
                // Continua processando os outros funcionários; cada um usa sua própria transação
            }
        }

        log.info("✅ Fechamentos em lote concluídos: {} de {}", closures.size(), activeEmployees.size());
        return closures;
    }
}

