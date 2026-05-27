package com.z7design.secured_guard.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Overtime;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.OvertimeStatus;
import com.z7design.secured_guard.model.enums.OvertimeType;
import com.z7design.secured_guard.repository.OvertimeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.util.WorkScheduleHelper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Sincroniza horas extras aprovadas a partir do lançamento manual de folha de ponto.
 */
@Service
public class ManualTimesheetOvertimeSyncService {

    private static final Logger log = LoggerFactory.getLogger(ManualTimesheetOvertimeSyncService.class);

    public static final String MANUAL_OVERTIME_REASON = "Lançamento manual de folha de ponto - horas excedentes";

    private final OvertimeRepository overtimeRepository;
    private final UserRepository userRepository;

    public ManualTimesheetOvertimeSyncService(
            OvertimeRepository overtimeRepository,
            UserRepository userRepository) {
        this.overtimeRepository = overtimeRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void syncApprovedOvertimeForManualDay(
            Employee employee,
            LocalDate date,
            String entrada,
            String saidaAlmoco,
            String retornoAlmoco,
            String saida,
            double normalHours) {

        boolean escala12x36 = WorkScheduleHelper.isEscala12x36(employee);
        double effectiveNormalHours = normalHours > 0 ? normalHours : WorkScheduleHelper.defaultDailyHoursForEmployee(employee);
        int overtimeMinutes = calculateOvertimeMinutes(
                entrada, saidaAlmoco, retornoAlmoco, saida, effectiveNormalHours, escala12x36);
        List<Overtime> existingManual = overtimeRepository
                .findByEmployeeIdAndOvertimeDate(employee.getId(), date)
                .stream()
                .filter(o -> o.getReason() != null && o.getReason().startsWith("Lançamento manual"))
                .toList();

        if (overtimeMinutes <= 0) {
            if (!existingManual.isEmpty()) {
                existingManual.forEach(overtimeRepository::delete);
                log.info("Removidas {} hora(s) extra(s) manual(is) do dia {} — sem excedente",
                        existingManual.size(), date);
            }
            return;
        }

        LocalTime saidaTime = parseTime(saida);
        if (saidaTime == null) {
            log.warn("Não foi possível sincronizar hora extra: saída inválida para employee {} em {}", employee.getId(), date);
            return;
        }

        LocalTime startTime = resolveOvertimeStart(entrada, saida, effectiveNormalHours, overtimeMinutes, saidaTime);
        LocalTime endTime = saidaTime;
        if (!startTime.isBefore(endTime)) {
            startTime = endTime.minusMinutes(Math.min(overtimeMinutes, 60));
            if (!startTime.isBefore(endTime)) {
                startTime = LocalTime.of(0, 0);
            }
        }

        Overtime overtime = existingManual.isEmpty() ? new Overtime() : existingManual.get(0);
        for (int i = 1; i < existingManual.size(); i++) {
            overtimeRepository.delete(existingManual.get(i));
        }

        overtime.setEmployee(employee);
        overtime.setOvertimeDate(date);
        overtime.setStartTime(startTime);
        overtime.setEndTime(endTime);
        overtime.setTotalHours(overtimeMinutes / 60.0);
        overtime.setType(OvertimeType.EXTRA);
        overtime.setReason(MANUAL_OVERTIME_REASON);
        overtime.setStatus(OvertimeStatus.APPROVED);
        overtime.setApprovalDate(LocalDateTime.now());
        resolveCurrentUser().ifPresent(overtime::setApprovedBy);
        if (employee.getWorkPost() != null) {
            overtime.setWorkPost(employee.getWorkPost());
        }

        overtimeRepository.save(overtime);
        log.info("Hora extra aprovada sincronizada: employee={}, date={}, {} min",
                employee.getId(), date, overtimeMinutes);
    }

    /**
     * Mesma regra do frontend (LancamentoManualFolhaPonto).
     */
    int calculateOvertimeMinutes(
            String entrada,
            String saidaAlmoco,
            String retornoAlmoco,
            String saida,
            double normalHours) {
        return calculateOvertimeMinutes(entrada, saidaAlmoco, retornoAlmoco, saida, normalHours, false);
    }

    int calculateOvertimeMinutes(
            String entrada,
            String saidaAlmoco,
            String retornoAlmoco,
            String saida,
            double normalHours,
            boolean escala12x36) {

        int ent = timeToMinutes(entrada);
        int sai = timeToMinutes(saida);
        int interval = escala12x36 ? 0 : intervalDurationMinutes(retornoAlmoco, saidaAlmoco);
        int normalMinutesPerDay = (int) Math.round(normalHours * 60);

        int worked;
        if (ent == 0 && sai == 0) {
            worked = 0;
        } else if (sai > ent) {
            worked = Math.max(0, sai - ent - interval);
        } else {
            worked = Math.max(0, 24 * 60 - ent + sai - interval);
        }

        return Math.max(0, worked - normalMinutesPerDay);
    }

    private LocalTime resolveOvertimeStart(
            String entrada,
            String saida,
            double normalHours,
            int overtimeMinutes,
            LocalTime saidaTime) {

        LocalTime entradaTime = parseTime(entrada);
        if (entradaTime != null) {
            LocalTime normalEnd = entradaTime.plusMinutes((int) Math.round(normalHours * 60));
            if (normalEnd.isBefore(saidaTime)) {
                return normalEnd;
            }
        }
        return saidaTime.minusMinutes(overtimeMinutes);
    }

    private static int intervalDurationMinutes(String intervaloEntrada, String intervaloSaida) {
        int e = timeToMinutes(intervaloEntrada);
        int s = timeToMinutes(intervaloSaida);
        if (e == 0 && s == 0) {
            return 0;
        }
        return Math.max(0, s - e);
    }

    private static int timeToMinutes(String value) {
        if (value == null || value.isBlank() || !value.trim().matches("\\d{1,2}:\\d{2}")) {
            return 0;
        }
        String[] parts = value.trim().split(":");
        int h = Integer.parseInt(parts[0]);
        int m = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        return h * 60 + m;
    }

    private static LocalTime parseTime(String value) {
        if (value == null || value.isBlank() || !value.trim().matches("\\d{1,2}:\\d{2}")) {
            return null;
        }
        String[] parts = value.trim().split(":");
        int h = Integer.parseInt(parts[0]);
        int m = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        return LocalTime.of(h, m);
    }

    private java.util.Optional<User> resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return java.util.Optional.empty();
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) {
            return java.util.Optional.of(user);
        }
        String username = auth.getName();
        if (username != null && !username.isBlank()) {
            return userRepository.findByUsername(username);
        }
        return java.util.Optional.empty();
    }
}
