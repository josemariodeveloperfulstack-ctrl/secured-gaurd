package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EmployeeIdentificationDTO;
import com.z7design.secured_guard.dto.EmployeePresenceHistoryRow;
import com.z7design.secured_guard.dto.PostAllocationDTO;
import com.z7design.secured_guard.dto.SupervisorVisitCheckinRequest;
import com.z7design.secured_guard.dto.SupervisorVisitReportRow;
import com.z7design.secured_guard.dto.SupervisorVisitResponse;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.QRCodeWorkPost;
import com.z7design.secured_guard.model.SupervisorVisit;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.VisitSchedule;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.VisitStatus;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.QRCodeWorkPostRepository;
import com.z7design.secured_guard.repository.SupervisorVisitRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.VisitScheduleRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Orquestra a visita do supervisor ao posto: confirma o posto (via QR ou seleção),
 * identifica o funcionário (QR/CPF/matrícula), calcula o vínculo com o posto e grava o
 * check-in com geolocalização e endereço. Também monta o relatório para a Gestão Operacional.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SupervisorVisitService {

    private final SupervisorVisitRepository supervisorVisitRepository;
    private final QRCodeWorkPostRepository qrCodeWorkPostRepository;
    private final WorkPostRepository workPostRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeQrCodeService employeeQrCodeService;
    private final EmployeePostAllocationService allocationService;
    private final VisitScheduleRepository visitScheduleRepository;
    private final UserRepository userRepository;

    /**
     * Resolve posto + funcionário + vínculo SEM gravar. Usado para a confirmação na tela
     * antes do supervisor concluir o check-in.
     */
    @Transactional(readOnly = true)
    public SupervisorVisitResponse preview(SupervisorVisitCheckinRequest request) {
        ResolvedPost resolved = resolveWorkPost(request);
        WorkPost workPost = resolved.workPost();

        Employee employee = identifyEmployee(request.getEmployeeValue());
        EmployeeIdentificationDTO employeeDto = EmployeeIdentificationDTO.from(employee, lastMatchedBy(employee));
        PostAllocationDTO allocation = allocationService.resolve(employee, workPost, LocalDate.now());

        return SupervisorVisitResponse.builder()
            .workPostId(workPost.getId())
            .workPostName(workPost.getName())
            .workPostCode(workPost.getPostCode())
            .workPostAddress(workPost.getAddress())
            .clientName(clientName(workPost))
            .employee(employeeDto)
            .allocation(allocation)
            .qrCodeVerified(resolved.qrVerified())
            .build();
    }

    /**
     * Grava o check-in da visita com geolocalização, endereço e vínculo calculado.
     */
    @Transactional
    public SupervisorVisitResponse checkin(SupervisorVisitCheckinRequest request, Authentication authentication) {
        ResolvedPost resolved = resolveWorkPost(request);
        WorkPost workPost = resolved.workPost();

        Employee employee = identifyEmployee(request.getEmployeeValue());
        PostAllocationDTO allocation = allocationService.resolve(employee, workPost, LocalDate.now());

        Employee supervisor = resolveSupervisor(request.getSupervisorId(), authentication);

        LocalDateTime now = LocalDateTime.now();
        java.time.LocalTime checkoutTime = null;
        if (request.getCheckoutTime() != null && !request.getCheckoutTime().isBlank()) {
            try {
                checkoutTime = java.time.LocalTime.parse(request.getCheckoutTime());
            } catch (Exception ignored) {}
        }

        SupervisorVisit visit = SupervisorVisit.builder()
            .supervisor(supervisor)
            .workPost(workPost)
            .client(workPost.getClient())
            .checkedEmployee(employee)
            .visitDate(now.toLocalDate())
            .visitTime(now.toLocalTime())
            .checkoutTime(checkoutTime)
            .durationMinutes(request.getDurationMinutes())
            .signatureData(request.getSignatureData())
            .epiDelivered(Boolean.TRUE.equals(request.getEpiDelivered()))
            .epiDescription(request.getEpiDescription())
            .epiSignatureData(request.getEpiSignatureData())
            .status(VisitStatus.COMPLETED)
            .description(request.getDescription())
            .observations(request.getObservations())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .locationAddress(request.getLocationAddress())
            .qrCodeScanned(request.getQrCode())
            .qrCodeVerified(resolved.qrVerified())
            .allocationType(allocation.getType())
            .allocationDescription(allocation.getMessage())
            .presentEmployees(new ArrayList<>(List.of(employee.getId())))
            .photos(request.getPhotos() != null ? new ArrayList<>(request.getPhotos()) : new ArrayList<>())
            .build();

        SupervisorVisit saved = supervisorVisitRepository.save(visit);
        log.info("Check-in de visita gravado: posto={} funcionário={} vínculo={} (visitId={})",
            workPost.getName(), employee.getName(), allocation.getType(), saved.getId());

        EmployeeIdentificationDTO employeeDto = EmployeeIdentificationDTO.from(employee, lastMatchedBy(employee));
        return SupervisorVisitResponse.builder()
            .visitId(saved.getId())
            .workPostId(workPost.getId())
            .workPostName(workPost.getName())
            .workPostCode(workPost.getPostCode())
            .workPostAddress(workPost.getAddress())
            .clientName(clientName(workPost))
            .employee(employeeDto)
            .allocation(allocation)
            .latitude(saved.getLatitude())
            .longitude(saved.getLongitude())
            .locationAddress(saved.getLocationAddress())
            .qrCodeVerified(saved.getQrCodeVerified())
            .visitDate(saved.getVisitDate())
            .visitTime(saved.getVisitTime())
            .checkoutTime(saved.getCheckoutTime())
            .durationMinutes(saved.getDurationMinutes())
            .signatureData(saved.getSignatureData())
            .epiDelivered(saved.getEpiDelivered())
            .epiDescription(saved.getEpiDescription())
            .epiSignatureData(saved.getEpiSignatureData())
            .photos(saved.getPhotos())
            .createdAt(saved.getCreatedAt())
            .build();
    }

    /**
     * Relatório de visitas para a Gestão Operacional. Marca {@code visitedAsScheduled} quando
     * a data da visita coincide com uma escala de visita do supervisor.
     */
    @Transactional(readOnly = true)
    public List<SupervisorVisitReportRow> report(LocalDate startDate, LocalDate endDate,
                                                 UUID supervisorId, UUID workPostId) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<SupervisorVisit> visits =
            supervisorVisitRepository.findForReport(start, end, supervisorId, workPostId);

        List<SupervisorVisitReportRow> rows = new ArrayList<>();
        for (SupervisorVisit visit : visits) {
            UUID supId = visit.getSupervisor() != null ? visit.getSupervisor().getId() : null;
            UUID matchedScheduleId = null;
            boolean visitedAsScheduled = false;
            if (supId != null && visit.getVisitDate() != null) {
                List<VisitSchedule> schedules =
                    visitScheduleRepository.findActiveBySupervisorAndDate(supId, visit.getVisitDate());
                if (schedules != null && !schedules.isEmpty()) {
                    visitedAsScheduled = true;
                    matchedScheduleId = schedules.get(0).getId();
                }
            }

            rows.add(SupervisorVisitReportRow.builder()
                .id(visit.getId())
                .visitDate(visit.getVisitDate())
                .visitTime(visit.getVisitTime())
                .checkoutTime(visit.getCheckoutTime())
                .durationMinutes(visit.getDurationMinutes())
                .description(visit.getDescription())
                .observations(visit.getObservations())
                .signatureData(visit.getSignatureData())
                .epiDelivered(visit.getEpiDelivered())
                .epiDescription(visit.getEpiDescription())
                .epiSignatureData(visit.getEpiSignatureData())
                .photos(visit.getPhotos())
                .supervisorName(visit.getSupervisor() != null ? visit.getSupervisor().getName() : null)
                .employeeName(visit.getCheckedEmployee() != null ? visit.getCheckedEmployee().getName() : null)
                .workPostName(visit.getWorkPost() != null ? visit.getWorkPost().getName() : null)
                .clientName(visit.getClient() != null ? visit.getClient().getName() : clientName(visit.getWorkPost()))
                .allocationType(visit.getAllocationType())
                .allocationDescription(visit.getAllocationDescription())
                .latitude(visit.getLatitude())
                .longitude(visit.getLongitude())
                .locationAddress(visit.getLocationAddress())
                .qrCodeVerified(visit.getQrCodeVerified())
                .visitedAsScheduled(visitedAsScheduled)
                .matchedScheduleId(matchedScheduleId)
                .build());
        }
        return rows;
    }

    /**
     * Histórico de confirmações de presença do funcionário: todas as visitas em que o supervisor
     * confirmou a presença dele no posto (mais recentes primeiro). Usado na ficha do funcionário.
     */
    @Transactional(readOnly = true)
    public List<EmployeePresenceHistoryRow> employeePresenceHistory(UUID employeeId) {
        if (employeeId == null) {
            return new ArrayList<>();
        }
        List<SupervisorVisit> visits = supervisorVisitRepository.findByCheckedEmployee(employeeId);
        List<EmployeePresenceHistoryRow> rows = new ArrayList<>();
        for (SupervisorVisit visit : visits) {
            rows.add(EmployeePresenceHistoryRow.builder()
                .visitId(visit.getId())
                .visitDate(visit.getVisitDate())
                .visitTime(visit.getVisitTime())
                .supervisorName(visit.getSupervisor() != null ? visit.getSupervisor().getName() : null)
                .workPostName(visit.getWorkPost() != null ? visit.getWorkPost().getName() : null)
                .clientName(visit.getClient() != null ? visit.getClient().getName() : clientName(visit.getWorkPost()))
                .allocationType(visit.getAllocationType())
                .allocationDescription(visit.getAllocationDescription())
                .latitude(visit.getLatitude())
                .longitude(visit.getLongitude())
                .locationAddress(visit.getLocationAddress())
                .qrCodeVerified(visit.getQrCodeVerified())
                .createdAt(visit.getCreatedAt())
                .build());
        }
        return rows;
    }

    /* -------------------- helpers -------------------- */

    private record ResolvedPost(WorkPost workPost, boolean qrVerified) {}

    private ResolvedPost resolveWorkPost(SupervisorVisitCheckinRequest request) {
        String qr = request.getQrCode();
        if (qr != null && !qr.isBlank()) {
            Optional<QRCodeWorkPost> valid =
                qrCodeWorkPostRepository.findValidQRCode(qr.trim(), LocalDateTime.now());
            if (valid.isPresent() && valid.get().getWorkPost() != null) {
                return new ResolvedPost(valid.get().getWorkPost(), true);
            }
            Optional<QRCodeWorkPost> any = qrCodeWorkPostRepository.findByQrCode(qr.trim());
            if (any.isPresent() && any.get().getWorkPost() != null) {
                return new ResolvedPost(any.get().getWorkPost(), Boolean.TRUE.equals(any.get().getIsActive()));
            }
        }

        if (request.getWorkPostId() != null && !request.getWorkPostId().isBlank()) {
            WorkPost workPost = workPostRepository.findById(UUID.fromString(request.getWorkPostId().trim()))
                .orElseThrow(() -> new EntityNotFoundException("Posto de trabalho não encontrado."));
            return new ResolvedPost(workPost, false);
        }

        throw new IllegalArgumentException(
            "Informe o QR Code do posto ou selecione um posto de trabalho.");
    }

    private Employee identifyEmployee(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                "Informe o QR Code do crachá, CPF ou matrícula do funcionário.");
        }
        EmployeeIdentificationDTO dto = employeeQrCodeService.identify(value)
            .orElseThrow(() -> new EntityNotFoundException(
                "Funcionário não encontrado. Verifique o QR Code, CPF ou matrícula."));
        return employeeRepository.findById(dto.getId())
            .orElseThrow(() -> new EntityNotFoundException("Funcionário não encontrado."));
    }

    private Employee resolveSupervisor(String supervisorId, Authentication authentication) {
        if (supervisorId != null && !supervisorId.isBlank()) {
            return employeeRepository.findById(UUID.fromString(supervisorId.trim())).orElse(null);
        }
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        if (authentication.getPrincipal() instanceof User principal && principal.getId() != null) {
            Optional<Employee> byUser = employeeRepository.findByUserId(principal.getId());
            if (byUser.isPresent()) {
                return byUser.get();
            }
        }
        String name = authentication.getName();
        return userRepository.findByUsername(name)
            .or(() -> userRepository.findByEmail(name))
            .map(User::getId)
            .flatMap(employeeRepository::findByUserId)
            .orElse(null);
    }

    private String clientName(WorkPost workPost) {
        if (workPost == null) {
            return null;
        }
        Client client = workPost.getClient();
        return client != null ? client.getName() : null;
    }

    private String lastMatchedBy(Employee employee) {
        // matchedBy é informativo; identify() já registrou no log. Para o DTO retornamos null
        // quando não há contexto explícito (o preview/checkin não precisa do canal exato).
        return null;
    }
}
