package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

    @Transactional
    public TimeRecord registerTimeRecord(UUID employeeId, TimeRecord.RecordType recordType,
                                         String qrCode, String location, Double latitude,
                                         Double longitude, String ipAddress, String userAgent) {
        
        log.info("📍 Registrando ponto - Employee: {}, Tipo: {}, QRCode: {}", 
                 employeeId, recordType, qrCode);

        // Buscar funcionário
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar QR Code se fornecido
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
        }

        // Validar sequência de registros
        validateRecordSequence(employeeId, recordType);

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
        List<TimeRecord> todayRecords = timeRecordRepository.findTodayRecordsByEmployeeId(employeeId);
        
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

    public List<TimeRecord> getTodayRecords(UUID employeeId) {
        return timeRecordRepository.findTodayRecordsByEmployeeId(employeeId);
    }

    public List<TimeRecord> getRecordsByPeriod(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        return timeRecordRepository.findByEmployeeIdAndRecordedAtBetweenOrderByRecordedAtAsc(
                employeeId, start, end);
    }

    public Page<TimeRecord> getRecordsByEmployee(UUID employeeId, Pageable pageable) {
        return timeRecordRepository.findByEmployeeIdOrderByRecordedAtDesc(employeeId, pageable);
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
        List<TimeRecord> todayRecords = timeRecordRepository.findTodayRecordsByEmployeeId(employeeId);
        
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
}
