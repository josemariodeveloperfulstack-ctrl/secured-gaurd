package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.remanejamento.RemanejamentoApprovalDtos.RemanejamentoSummaryDTO;
import com.z7design.secured_guard.dto.remanejamento.RemanejamentoApprovalDtos.RequestDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.AcaoHistorico;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Notification;
import com.z7design.secured_guard.model.Remanejamento;
import com.z7design.secured_guard.model.RemanejamentoTipo;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.VisitControl;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.NotificationStatus;
import com.z7design.secured_guard.model.enums.NotificationType;
import com.z7design.secured_guard.model.enums.RemanejamentoStatus;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.NotificationRepository;
import com.z7design.secured_guard.repository.RemanejamentoRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.VisitControlRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Onda 3 — Fluxo de aprovação de remanejamento.
 *
 * <p>Mantido separado do {@link RemanejamentoService} (CRUD legado) para não
 * impactar regras existentes. Responsabilidades aqui:
 * <ul>
 *   <li>Supervisor cria pedido em status PENDING.</li>
 *   <li>Gestor Operacional aprova → posto do funcionário é atualizado.</li>
 *   <li>Gestor Operacional rejeita com motivo.</li>
 *   <li>Solicitante pode cancelar enquanto estiver PENDING.</li>
 *   <li>Notificações são geradas para os gestores (na aprovação para o
 *       solicitante).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RemanejamentoApprovalService {

    private static final String MSG_NOT_FOUND = "Remanejamento não encontrado: ";

    private final RemanejamentoRepository remanejamentoRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkPostRepository workPostRepository;
    private final VisitControlRepository visitControlRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final RemanejamentoHistoricoService historicoService;
    private final EmployeeChangeHistoryService employeeChangeHistoryService;

    /* =================================================================== */
    /* Requisição (Supervisor)                                              */
    /* =================================================================== */

    public RemanejamentoSummaryDTO request(RequestDTO dto, User requester) {
        if (dto.getEmployeeId() == null) {
            throw new IllegalArgumentException("Funcionário é obrigatório");
        }
        if (dto.getDataRemanejamento() == null) {
            throw new IllegalArgumentException("Data do remanejamento é obrigatória");
        }
        if (dto.getTipo() == null) {
            throw new IllegalArgumentException("Tipo do remanejamento é obrigatório");
        }

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
            .orElseThrow(() -> new ResourceNotFoundException(
                "Funcionário não encontrado: " + dto.getEmployeeId()));

        Remanejamento r = new Remanejamento();
        r.setEmployee(employee);
        r.setTipo(dto.getTipo());
        r.setMotivo(dto.getMotivo());
        r.setDataRemanejamento(dto.getDataRemanejamento());
        r.setObservacao(dto.getObservacao());
        r.setStatus(RemanejamentoStatus.PENDING);
        r.setRequestedBy(requester);
        r.setRequestedAt(LocalDateTime.now());

        if (dto.getCoverageEmployeeId() != null) {
            Employee cover = employeeRepository.findById(dto.getCoverageEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Funcionário de cobertura não encontrado: " + dto.getCoverageEmployeeId()));
            if (Objects.equals(cover.getId(), employee.getId())) {
                throw new IllegalArgumentException(
                    "Funcionário de cobertura deve ser diferente do funcionário remanejado");
            }
            r.setCoverageEmployee(cover);
        }

        if (dto.getOriginWorkstationId() != null) {
            WorkPost origin = workPostRepository.findById(dto.getOriginWorkstationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Posto de origem não encontrado: " + dto.getOriginWorkstationId()));
            r.setOriginWorkstation(origin);
            r.setOrigem(origin.getName());
        }
        if (dto.getDestinationWorkstationId() != null) {
            WorkPost dest = workPostRepository.findById(dto.getDestinationWorkstationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Posto de destino não encontrado: " + dto.getDestinationWorkstationId()));
            r.setDestinationWorkstation(dest);
            r.setDestino(dest.getName());
        }

        if (dto.getVisitControlId() != null) {
            VisitControl vc = visitControlRepository.findById(dto.getVisitControlId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Visita não encontrada: " + dto.getVisitControlId()));
            r.setVisitControl(vc);
        }

        Remanejamento saved = remanejamentoRepository.save(r);

        try {
            historicoService.registrarAcao(saved, AcaoHistorico.CRIACAO, requester,
                "Solicitação de remanejamento criada pelo supervisor");
        } catch (Exception e) {
            log.warn("Falha ao registrar histórico de criação do remanejamento {}: {}",
                saved.getId(), e.getMessage());
        }

        notifyManagersAboutPending(saved);

        log.info("Remanejamento {} solicitado por {} para o funcionário {} (status=PENDING)",
            saved.getId(),
            requester != null ? requester.getId() : null,
            employee.getId());

        return RemanejamentoSummaryDTO.from(saved);
    }

    /* =================================================================== */
    /* Aprovação / Rejeição (Gestor Operacional)                            */
    /* =================================================================== */

    public RemanejamentoSummaryDTO approve(UUID remanejamentoId, User approver) {
        Remanejamento r = loadPending(remanejamentoId);

        r.setStatus(RemanejamentoStatus.APPROVED);
        r.setApprovedBy(approver);
        r.setApprovedAt(LocalDateTime.now());
        r.setRejectedAt(null);
        r.setRejectionReason(null);

        // Efetiva o remanejamento: atualiza posto do funcionário se houver destino.
        if (r.getDestinationWorkstation() != null && r.getEmployee() != null) {
            Employee e = r.getEmployee();
            WorkPost oldPost = e.getWorkPost();
            e.setWorkPost(r.getDestinationWorkstation());
            employeeRepository.save(e);

            try {
                employeeChangeHistoryService.recordChange(
                    e.getId(),
                    com.z7design.secured_guard.model.enums.EmployeeChangeCategory.POSTO_TRABALHO,
                    "workPost",
                    "Posto de trabalho",
                    oldPost != null ? oldPost.getName() : null,
                    r.getDestinationWorkstation().getName(),
                    approver != null ? approver.getId() : null);
            } catch (Exception ex) {
                log.warn("Falha ao registrar mudança de posto após aprovação do remanejamento {}: {}",
                    r.getId(), ex.getMessage());
            }
        }

        Remanejamento saved = remanejamentoRepository.save(r);

        try {
            historicoService.registrarAcao(saved, AcaoHistorico.EDICAO, approver,
                "Remanejamento aprovado pelo Gestor Operacional");
        } catch (Exception e) {
            log.warn("Falha ao registrar histórico de aprovação do remanejamento {}: {}",
                saved.getId(), e.getMessage());
        }

        notifyRequester(saved, "Remanejamento aprovado",
            "Sua solicitação de remanejamento foi APROVADA pelo Gestor Operacional.",
            NotificationType.INFO);

        log.info("Remanejamento {} aprovado por {}", saved.getId(),
            approver != null ? approver.getId() : null);

        return RemanejamentoSummaryDTO.from(saved);
    }

    public RemanejamentoSummaryDTO reject(UUID remanejamentoId, String reason, User approver) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Motivo da rejeição é obrigatório");
        }

        Remanejamento r = loadPending(remanejamentoId);
        r.setStatus(RemanejamentoStatus.REJECTED);
        r.setApprovedBy(approver);
        r.setApprovedAt(null);
        r.setRejectedAt(LocalDateTime.now());
        r.setRejectionReason(reason.trim());

        Remanejamento saved = remanejamentoRepository.save(r);

        try {
            historicoService.registrarAcao(saved, AcaoHistorico.EDICAO, approver,
                "Remanejamento rejeitado: " + reason.trim());
        } catch (Exception e) {
            log.warn("Falha ao registrar histórico de rejeição do remanejamento {}: {}",
                saved.getId(), e.getMessage());
        }

        notifyRequester(saved, "Remanejamento rejeitado",
            "Sua solicitação foi REJEITADA. Motivo: " + reason.trim(),
            NotificationType.WARNING);

        log.info("Remanejamento {} rejeitado por {}", saved.getId(),
            approver != null ? approver.getId() : null);

        return RemanejamentoSummaryDTO.from(saved);
    }

    /* =================================================================== */
    /* Cancelamento (Solicitante)                                           */
    /* =================================================================== */

    public RemanejamentoSummaryDTO cancel(UUID remanejamentoId, User actor) {
        Remanejamento r = remanejamentoRepository.findByIdWithRelations(remanejamentoId)
            .orElseThrow(() -> new ResourceNotFoundException(MSG_NOT_FOUND + remanejamentoId));

        if (r.getStatus() != RemanejamentoStatus.PENDING) {
            throw new IllegalStateException(
                "Apenas remanejamentos pendentes podem ser cancelados");
        }

        // Solicitante ou admin podem cancelar. (Autorização fina fica no controller.)
        r.setStatus(RemanejamentoStatus.CANCELLED);
        r.setRejectedAt(LocalDateTime.now());
        r.setRejectionReason("Cancelado pelo solicitante");

        Remanejamento saved = remanejamentoRepository.save(r);

        try {
            historicoService.registrarAcao(saved, AcaoHistorico.EDICAO, actor,
                "Remanejamento cancelado pelo solicitante");
        } catch (Exception e) {
            log.warn("Falha ao registrar histórico de cancelamento: {}", e.getMessage());
        }

        log.info("Remanejamento {} cancelado por {}", saved.getId(),
            actor != null ? actor.getId() : null);

        return RemanejamentoSummaryDTO.from(saved);
    }

    /* =================================================================== */
    /* Consultas                                                            */
    /* =================================================================== */

    @Transactional(readOnly = true)
    public List<RemanejamentoSummaryDTO> listByStatus(RemanejamentoStatus status) {
        RemanejamentoStatus target = status != null ? status : RemanejamentoStatus.PENDING;
        return remanejamentoRepository.findByStatusWithRelations(target).stream()
            .map(RemanejamentoSummaryDTO::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<RemanejamentoSummaryDTO> listMyRequests(User user) {
        if (user == null) {
            return List.of();
        }
        return remanejamentoRepository.findByRequestedByIdWithRelations(user.getId()).stream()
            .map(RemanejamentoSummaryDTO::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public long countPending() {
        return remanejamentoRepository.countByStatus(RemanejamentoStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public RemanejamentoSummaryDTO getById(UUID id) {
        Remanejamento r = remanejamentoRepository.findByIdWithRelations(id)
            .orElseThrow(() -> new ResourceNotFoundException(MSG_NOT_FOUND + id));
        return RemanejamentoSummaryDTO.from(r);
    }

    /* =================================================================== */
    /* Helpers                                                              */
    /* =================================================================== */

    private Remanejamento loadPending(UUID id) {
        Remanejamento r = remanejamentoRepository.findByIdWithRelations(id)
            .orElseThrow(() -> new ResourceNotFoundException(MSG_NOT_FOUND + id));

        if (r.getStatus() != RemanejamentoStatus.PENDING) {
            throw new IllegalStateException(
                "Remanejamento já foi finalizado (status atual: " + r.getStatus() + ")");
        }
        return r;
    }

    private void notifyManagersAboutPending(Remanejamento r) {
        try {
            List<User> managers = userRepository.findOperationalManagers();
            String employeeName = r.getEmployee() != null ? r.getEmployee().getName() : "Funcionário";
            String supervisorName = r.getRequestedBy() != null && r.getRequestedBy().getName() != null
                ? r.getRequestedBy().getName()
                : "Supervisor";

            String title = "Nova solicitação de remanejamento";
            String msg = String.format(
                "%s solicitou remanejamento para %s. Aguardando aprovação.",
                supervisorName, employeeName);

            for (User manager : managers) {
                Notification n = Notification.builder()
                    .user(manager)
                    .title(title)
                    .message(msg)
                    .type(NotificationType.INFO)
                    .status(NotificationStatus.UNREAD)
                    .build();
                notificationRepository.save(n);
            }
        } catch (Exception e) {
            log.warn("Falha ao notificar gestores sobre remanejamento pendente {}: {}",
                r.getId(), e.getMessage());
        }
    }

    private void notifyRequester(Remanejamento r, String title, String message, NotificationType type) {
        try {
            if (r.getRequestedBy() == null) {
                return;
            }
            Notification n = Notification.builder()
                .user(r.getRequestedBy())
                .title(title)
                .message(message)
                .type(type)
                .status(NotificationStatus.UNREAD)
                .build();
            notificationRepository.save(n);
        } catch (Exception e) {
            log.warn("Falha ao notificar solicitante do remanejamento {}: {}",
                r.getId(), e.getMessage());
        }
    }

    @SuppressWarnings("unused")
    private static String typeName(RemanejamentoTipo tipo) {
        return tipo != null ? tipo.name() : "—";
    }
}
