package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.repository.*;
import com.z7design.secured_guard.util.AuthenticatedCpfResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeRecordService {

    private final TimeRecordRepository timeRecordRepository;
    private final QRCodeWorkPostRepository qrCodeWorkPostRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkPostRepository workPostRepository;
    private final AuthenticatedCpfResolver authenticatedCpfResolver;

    @Transactional
    public TimeRecord registerTimeRecord(UUID employeeId, TimeRecord.RecordType recordType,
            String qrCode, String location, Double latitude,
            Double longitude, String ipAddress, String userAgent) {

        log.info("📍 Registrando ponto - Employee: {}, Tipo: {}, QRCode: {}",
                employeeId, recordType, qrCode);

        // Buscar funcionário:
        // 1) Pelo ID enviado
        // 2) Se não encontrar, tentar resolver pelo CPF autenticado
        Employee employee = employeeRepository.findById(employeeId).orElseGet(() -> {
            log.warn("⚠️ Funcionário não encontrado pelo ID {}. Tentando resolver pelo CPF autenticado...", employeeId);
            return authenticatedCpfResolver.resolve(
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication())
                    .flatMap(cpf -> {
                        log.info("🔎 Resolvendo funcionário pelo CPF autenticado: {}", cpf);
                        return employeeRepository.findByCpf(cpf)
                                .or(() -> employeeRepository.findByDocument(cpf));
                    })
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));
        });

        // Se houver QR Code, tenta identificar o posto.
        // Caso contrário, usa o posto atual do funcionário como padrão.
        WorkPost workPost = null;
        if (qrCode != null && !qrCode.isEmpty()) {
            QRCodeWorkPost qrCodeWorkPost = qrCodeWorkPostRepository
                    .findValidQRCode(qrCode, LocalDateTime.now())
                    .orElseThrow(() -> new RuntimeException("QR Code inválido ou expirado"));

            workPost = qrCodeWorkPost.getWorkPost();
            log.info("✅ QR Code válido para posto: {}", workPost.getName());

            // Validar geolocalização se configurado
            if (qrCodeWorkPost.getLatitude() != null && qrCodeWorkPost.getLongitude() != null) {
                if (latitude == null || longitude == null) {
                    throw new RuntimeException("Geolocalização obrigatória para este posto");
                }

                double distance = calculateDistance(
                        qrCodeWorkPost.getLatitude(), qrCodeWorkPost.getLongitude(),
                        latitude, longitude);

                if (distance > qrCodeWorkPost.getRadiusMeters()) {
                    log.warn("⚠️ Distância excedida: {} metros (limite: {})",
                            distance, qrCodeWorkPost.getRadiusMeters());
                    throw new RuntimeException("Você está fora da área permitida para registro");
                }
            }
        } else {
            // Fallback para o posto atual do funcionário
            workPost = employee.getWorkPost();
            if (workPost != null) {
                log.info("ℹ️ Usando posto atual do funcionário: {}", workPost.getName());
            }
        }

        // Validar sequência usando o ID real do Employee (não o user.id)
        validateRecordSequence(employee.getId(), recordType);

        // Criar registro
        TimeRecord record = new TimeRecord();
        record.setEmployee(employee);
        record.setWorkPost(workPost);
        record.setRecordType(recordType);
        record.setRecordedAt(LocalDateTime.now());
        record.setLocation(location);
        record.setLatitude(latitude);
        record.setLongitude(longitude);
        record.setIpAddress(ipAddress);
        record.setUserAgent(userAgent);
        record.setQrCodeUsed(qrCode);
        record.setIsManual(false);
        record.setStatus(TimeRecord.RecordStatus.APPROVED);

        TimeRecord saved = timeRecordRepository.save(record);
        log.info("✅ Ponto registrado com sucesso - ID: {}", saved.getId());

        return saved;
    }

    private void validateRecordSequence(UUID employeeId, TimeRecord.RecordType newRecordType) {
        LocalDate today = LocalDate.now();
        List<TimeRecord> todayRecords = timeRecordRepository.findTodayRecordsByEmployeeIdAndDate(employeeId, today);

        if (todayRecords.isEmpty() && newRecordType != TimeRecord.RecordType.ENTRADA) {
            throw new RuntimeException("Primeiro registro do dia deve ser ENTRADA");
        }

        if (!todayRecords.isEmpty()) {
            TimeRecord lastRecord = todayRecords.get(0);

            // Validar sequência lógica
            switch (lastRecord.getRecordType()) {
                case ENTRADA:
                    if (newRecordType == TimeRecord.RecordType.ENTRADA) {
                        throw new RuntimeException("Já existe uma entrada registrada");
                    }
                    break;
                case SAIDA_ALMOCO:
                    if (newRecordType != TimeRecord.RecordType.RETORNO_ALMOCO) {
                        throw new RuntimeException("Após saída para almoço, deve registrar retorno");
                    }
                    break;
                case RETORNO_ALMOCO:
                    if (newRecordType == TimeRecord.RecordType.RETORNO_ALMOCO) {
                        throw new RuntimeException("Retorno do almoço já registrado");
                    }
                    break;
                case SAIDA:
                    throw new RuntimeException("Jornada já foi encerrada hoje");
            }
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Raio da Terra em metros
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Resolve o Employee pelo ID enviado (pode ser user.id ou employee.id).
     * Se não encontrar como Employee, tenta resolver pelo CPF do usuário
     * autenticado.
     * Exposto para outros serviços (ex.: folha de ponto PDF/Excel).
     */
    public Employee resolveEmployeeForReport(UUID employeeIdOrUserId) {
        return resolveEmployee(employeeIdOrUserId);
    }

    private Employee resolveEmployee(UUID employeeIdOrUserId) {
        return employeeRepository.findById(employeeIdOrUserId).orElseGet(() -> {
            log.warn("⚠️ Funcionário não encontrado pelo ID {}. Tentando resolver pelo CPF autenticado...",
                    employeeIdOrUserId);
            return authenticatedCpfResolver.resolve(
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication())
                    .flatMap(cpf -> {
                        log.info("🔎 Resolvendo funcionário pelo CPF autenticado: {}", cpf);
                        return employeeRepository.findByCpf(cpf)
                                .or(() -> employeeRepository.findByDocument(cpf));
                    })
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));
        });
    }

    public List<TimeRecord> getTodayRecords(UUID employeeId) {
        Employee employee = resolveEmployee(employeeId);
        LocalDate today = LocalDate.now();
        return timeRecordRepository.findTodayRecordsByEmployeeIdAndDate(employee.getId(), today);
    }

    public List<TimeRecord> getRecordsByPeriod(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        Employee employee = resolveEmployee(employeeId);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        return timeRecordRepository.findByEmployeeIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                employee.getId(), start, end);
    }

    public Page<TimeRecord> getRecordsByEmployee(UUID employeeId, Pageable pageable) {
        Employee employee = resolveEmployee(employeeId);
        return timeRecordRepository.findByEmployeeIdOrderByRecordedAtDesc(employee.getId(), pageable);
    }

    public Page<TimeRecord> getPendingRecords(Pageable pageable) {
        return timeRecordRepository.findByStatusOrderByRecordedAtDesc(
                TimeRecord.RecordStatus.PENDING, pageable);
    }

    @Transactional
    public TimeRecord approveRecord(UUID recordId, UUID approverId) {
        TimeRecord record = timeRecordRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Registro não encontrado"));

        record.setStatus(TimeRecord.RecordStatus.APPROVED);
        record.setApprovedById(approverId);
        record.setApprovedAt(LocalDateTime.now());

        return timeRecordRepository.save(record);
    }

    @Transactional
    public TimeRecord rejectRecord(UUID recordId, UUID approverId, String reason) {
        TimeRecord record = timeRecordRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Registro não encontrado"));

        record.setStatus(TimeRecord.RecordStatus.REJECTED);
        record.setApprovedById(approverId);
        record.setApprovedAt(LocalDateTime.now());
        record.setJustification(reason);

        return timeRecordRepository.save(record);
    }

    public TimeRecord.RecordType getNextRecordType(UUID employeeId) {
        Employee employee = resolveEmployee(employeeId);
        LocalDate today = LocalDate.now();
        List<TimeRecord> todayRecords = timeRecordRepository.findTodayRecordsByEmployeeIdAndDate(employee.getId(),
                today);

        if (todayRecords.isEmpty()) {
            return TimeRecord.RecordType.ENTRADA;
        }

        TimeRecord lastRecord = todayRecords.get(0);

        switch (lastRecord.getRecordType()) {
            case ENTRADA:
                return TimeRecord.RecordType.SAIDA_ALMOCO;
            case SAIDA_ALMOCO:
                return TimeRecord.RecordType.RETORNO_ALMOCO;
            case RETORNO_ALMOCO:
                return TimeRecord.RecordType.SAIDA;
            case SAIDA:
                return TimeRecord.RecordType.ENTRADA; // Próximo dia
            default:
                return TimeRecord.RecordType.ENTRADA;
        }
    }

    /**
     * Salva os horários de um dia para lançamento manual. Remove registros manuais
     * existentes
     * do dia e persiste os novos (conforme vai registrando no frontend).
     */
    @Transactional
    public List<TimeRecord> saveManualDay(UUID employeeId, LocalDate date,
            String entrada, String saidaAlmoco, String retornoAlmoco, String saida) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        timeRecordRepository.deleteManualRecordsByEmployeeIdAndDate(employeeId, date);

        List<TimeRecord> saved = new ArrayList<>();

        if (isValidTime(entrada)) {
            saved.add(saveManualRecord(employee, date, entrada, TimeRecord.RecordType.ENTRADA));
        }
        if (isValidTime(saidaAlmoco)) {
            saved.add(saveManualRecord(employee, date, saidaAlmoco, TimeRecord.RecordType.SAIDA_ALMOCO));
        }
        if (isValidTime(retornoAlmoco)) {
            saved.add(saveManualRecord(employee, date, retornoAlmoco, TimeRecord.RecordType.RETORNO_ALMOCO));
        }
        if (isValidTime(saida)) {
            saved.add(saveManualRecord(employee, date, saida, TimeRecord.RecordType.SAIDA));
        }

        log.info("✅ Lançamento manual do dia {} para employee {}: {} registro(s) salvos",
                date, employeeId, saved.size());
        return saved;
    }

    private static boolean isValidTime(String time) {
        if (time == null || time.isBlank())
            return false;
        return time.matches("\\d{1,2}:\\d{2}");
    }

    private TimeRecord saveManualRecord(Employee employee, LocalDate date, String timeStr,
            TimeRecord.RecordType recordType) {
        String[] parts = timeStr.trim().split(":");
        int h = Integer.parseInt(parts[0]);
        int m = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        LocalTime time = LocalTime.of(h, m);
        LocalDateTime recordedAt = date.atTime(time);

        TimeRecord record = new TimeRecord();
        record.setEmployee(employee);
        record.setRecordType(recordType);
        record.setRecordedAt(recordedAt);
        record.setIsManual(true);
        record.setStatus(TimeRecord.RecordStatus.APPROVED);
        record.setLocation("Lançamento manual");
        // Associar ao posto atual do funcionário se disponível
        if (employee.getWorkPost() != null) {
            record.setWorkPost(employee.getWorkPost());
        }
        return timeRecordRepository.save(record);
    }
}
