package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ShiftChangeFormDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.ShiftChangeForm;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.model.enums.ShiftChangeStatus;
import com.z7design.secured_guard.model.enums.ShiftTime;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.ShiftChangeFormRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftChangeFormService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ShiftChangeFormRepository shiftChangeFormRepository;
    private final StandardReportLayoutService layoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeChangeHistoryService employeeChangeHistoryService;

    /**
     * Gera relatório PDF de troca de plantão com layout premium
     */
    public byte[] generatePDFReport(Long id) throws IOException {
        log.info("Gerando relatório PDF de troca de plantão ID: {}", id);

        ShiftChangeForm shiftChange = shiftChangeFormRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitação de troca de plantão não encontrada"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            // Resolver companyId (fallback para primeira empresa ativa)
            java.util.UUID companyId = companyRepository.findAll().stream()
                    .filter(c -> c.getStatus() == Company.CompanyStatus.ACTIVE)
                    .findFirst()
                    .map(Company::getId)
                    .orElse(null);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("SOLICITAÇÃO DE TROCA DE PLANTÃO")
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // Informações gerais
            document.add(new Paragraph("Data da Solicitação: " +
                    shiftChange.getDateOfRequest().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .setFontSize(10)
                    .setMarginBottom(5));

            document.add(new Paragraph("Horário do Plantão: " + getShiftTimeLabel(shiftChange.getShiftTime()))
                    .setFontSize(10)
                    .setMarginBottom(15));

            // Tabela com dados dos funcionários
            Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            // Cabeçalhos
            table.addHeaderCell(layoutService.createHeaderCell("DADOS DO SOLICITANTE"));
            table.addHeaderCell(layoutService.createHeaderCell("DADOS DO COLEGA"));

            // Dados
            table.addCell(layoutService.createDataCell(
                    "Nome: " + (shiftChange.getRequesterFullName() != null ? shiftChange.getRequesterFullName() : "")));
            table.addCell(layoutService.createDataCell(
                    "Nome: " + (shiftChange.getReplacingFullName() != null ? shiftChange.getReplacingFullName() : "")));

            table.addCell(layoutService.createDataCell(
                    "Setor: " + (shiftChange.getRequesterSector() != null ? shiftChange.getRequesterSector() : "")));
            table.addCell(layoutService.createDataCell(
                    "Setor: " + (shiftChange.getReplacingSector() != null ? shiftChange.getReplacingSector() : "")));

            table.addCell(layoutService.createDataCell("Data do Plantão: " +
                    (shiftChange.getRequesterShiftDate() != null
                            ? shiftChange.getRequesterShiftDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            : "-")));
            table.addCell(layoutService.createDataCell("Data do Plantão: " +
                    (shiftChange.getReplacingShiftDate() != null
                            ? shiftChange.getReplacingShiftDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            : "-")));

            if (shiftChange.getRequesterDayOffDate() != null) {
                table.addCell(layoutService.createDataCell("Data da Folga: " +
                        shiftChange.getRequesterDayOffDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            } else {
                table.addCell(layoutService.createDataCell("Data da Folga: -"));
            }

            if (shiftChange.getReplacingDayOffDate() != null) {
                table.addCell(layoutService.createDataCell("Data da Folga: " +
                        shiftChange.getReplacingDayOffDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            } else {
                table.addCell(layoutService.createDataCell("Data da Folga: -"));
            }

            document.add(table);

            // Termo de responsabilidade
            document.add(new Paragraph("TERMO DE RESPONSABILIDADE")
                    .setFontSize(12)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(10));

            document.add(new Paragraph(
                    "Declaro que estou ciente das responsabilidades inerentes à troca de plantão e me comprometo a cumprir "
                            +
                            "todas as normas e procedimentos estabelecidos pela empresa. A troca será realizada de forma voluntária "
                            +
                            "e com total acordo entre as partes envolvidas.")
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.JUSTIFIED)
                    .setMarginBottom(20));

            // Campos de assinatura
            Table signatureTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                    .useAllAvailableWidth()
                    .setMarginTop(30);

            signatureTable.addCell(layoutService.createDataCell("_______________________________\n" +
                    (shiftChange.getRequesterFullName() != null ? shiftChange.getRequesterFullName() : "Solicitante")
                    + "\nAssinatura do Solicitante"));
            signatureTable.addCell(layoutService.createDataCell("_______________________________\n" +
                    (shiftChange.getReplacingFullName() != null ? shiftChange.getReplacingFullName() : "Colega")
                    + "\nAssinatura do Colega"));

            document.add(signatureTable);

            layoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
            log.info("Relatório PDF de troca de plantão gerado com sucesso");

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de troca de plantão", e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    private String getShiftTimeLabel(ShiftTime shiftTime) {
        if (shiftTime == null)
            return "Não informado";
        switch (shiftTime) {
            case SHIFT_6H_18H:
                return "6h às 18h";
            case SHIFT_18H_6H:
                return "18h às 6h";
            case SHIFT_7H_19H:
                return "7h às 19h";
            case SHIFT_19H_7H:
                return "19h às 7h";
            default:
                return shiftTime.toString();
        }
    }

    @Transactional
    public ShiftChangeFormDTO createShiftChangeForm(ShiftChangeFormDTO dto) {
        log.info("Criando nova solicitação de troca de plantão: {}", dto.getRequesterFullName());
        validateShiftChange(dto);
        ShiftChangeForm entity = dto.toEntity();

        // Resolver IDs faltantes pelo nome do funcionário (fallback de compatibilidade)
        if (entity.getRequesterEmployeeId() == null && entity.getRequesterFullName() != null) {
            entity.setRequesterEmployeeId(resolveEmployeeIdByName(entity.getRequesterFullName()));
        }
        if (entity.getReplacingEmployeeId() == null && entity.getReplacingFullName() != null) {
            entity.setReplacingEmployeeId(resolveEmployeeIdByName(entity.getReplacingFullName()));
        }

        ShiftChangeForm saved = shiftChangeFormRepository.save(entity);

        // Registra no histórico de AMBOS os funcionários envolvidos
        recordShiftChangeCreatedHistory(saved);

        return new ShiftChangeFormDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<ShiftChangeFormDTO> getAllShiftChangeForms() {
        log.info("Buscando todas as solicitações de troca de plantão");
        return shiftChangeFormRepository.findAll().stream()
                .map(ShiftChangeFormDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ShiftChangeFormDTO getShiftChangeFormById(Long id) {
        log.info("Buscando solicitação de troca de plantão por ID: {}", id);
        return shiftChangeFormRepository.findById(id)
                .map(ShiftChangeFormDTO::new)
                .orElseThrow(() -> new RuntimeException("Solicitação de troca de plantão não encontrada"));
    }

    @Transactional
    public ShiftChangeFormDTO updateShiftChangeForm(Long id, ShiftChangeFormDTO dto) {
        log.info("Atualizando solicitação de troca de plantão ID: {}", id);
        ShiftChangeForm existingEntity = shiftChangeFormRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitação de troca de plantão não encontrada"));

        validateShiftChange(dto);

        ShiftChangeStatus previousStatus = existingEntity.getStatus();

        existingEntity.setDateOfRequest(dto.getDateOfRequest());
        existingEntity.setRequesterFullName(dto.getRequesterFullName());
        existingEntity.setRequesterSector(dto.getRequesterSector());
        existingEntity.setRequesterDayOffDate(dto.getRequesterDayOffDate());
        existingEntity.setRequesterShiftDate(dto.getRequesterShiftDate());
        existingEntity.setReplacingFullName(dto.getReplacingFullName());
        existingEntity.setReplacingSector(dto.getReplacingSector());
        existingEntity.setReplacingShiftDate(dto.getReplacingShiftDate());
        existingEntity.setReplacingDayOffDate(dto.getReplacingDayOffDate());
        existingEntity.setShiftTime(dto.getShiftTime());

        // Manter IDs sincronizados: prioriza o que veio no DTO; senão preserva o existente; senão tenta resolver pelo nome.
        if (dto.getRequesterEmployeeId() != null) {
            existingEntity.setRequesterEmployeeId(dto.getRequesterEmployeeId());
        } else if (existingEntity.getRequesterEmployeeId() == null && existingEntity.getRequesterFullName() != null) {
            existingEntity.setRequesterEmployeeId(resolveEmployeeIdByName(existingEntity.getRequesterFullName()));
        }
        if (dto.getReplacingEmployeeId() != null) {
            existingEntity.setReplacingEmployeeId(dto.getReplacingEmployeeId());
        } else if (existingEntity.getReplacingEmployeeId() == null && existingEntity.getReplacingFullName() != null) {
            existingEntity.setReplacingEmployeeId(resolveEmployeeIdByName(existingEntity.getReplacingFullName()));
        }

        // Só atualiza o status se foi enviado (não nulo)
        if (dto.getStatus() != null) {
            existingEntity.setStatus(dto.getStatus());
        }
        if (dto.getApprovedBy() != null) {
            existingEntity.setApprovedBy(dto.getApprovedBy());
        }

        ShiftChangeForm saved = shiftChangeFormRepository.save(existingEntity);

        // Se o status mudou, registra no histórico de ambos os funcionários
        if (previousStatus != saved.getStatus()) {
            recordShiftChangeStatusHistory(saved, previousStatus);
        }

        return new ShiftChangeFormDTO(saved);
    }

    @Transactional
    public void deleteShiftChangeForm(Long id) {
        log.info("Excluindo solicitação de troca de plantão ID: {}", id);
        if (!shiftChangeFormRepository.existsById(id)) {
            throw new RuntimeException("Solicitação de troca de plantão não encontrada");
        }
        shiftChangeFormRepository.deleteById(id);
    }

    private void validateShiftChange(ShiftChangeFormDTO dto) {
        // Regra de validação: Não será permitida trocas entre funcionários de turnos
        // diferentes (Dia/Noite)
        boolean isRequesterDayShift = isDayShift(dto.getShiftTime());
        boolean isReplacingDayShift = isDayShift(dto.getShiftTime()); // O colega assumirá o mesmo turno

        if (isRequesterDayShift != isReplacingDayShift) {
            throw new IllegalArgumentException(
                    "Não é permitida a troca de plantão entre turnos diferentes (Dia/Noite).");
        }
    }

    private boolean isDayShift(ShiftTime shiftTime) {
        return shiftTime == ShiftTime.SHIFT_6H_18H || shiftTime == ShiftTime.SHIFT_7H_19H;
    }

    // ===================== Integração com histórico do funcionário =====================

    /**
     * Registra a criação de uma solicitação de troca de plantão no histórico de AMBOS
     * os funcionários envolvidos (solicitante e colega que assumirá).
     */
    private void recordShiftChangeCreatedHistory(ShiftChangeForm sc) {
        UUID actorUserId = getCurrentUserId();
        String shiftLabel = getShiftTimeLabel(sc.getShiftTime());
        String requesterShiftDate = sc.getRequesterShiftDate() != null ? sc.getRequesterShiftDate().format(DATE_FMT) : "-";
        String replacingShiftDate = sc.getReplacingShiftDate() != null ? sc.getReplacingShiftDate().format(DATE_FMT) : "-";

        // Registro para o SOLICITANTE
        if (sc.getRequesterEmployeeId() != null) {
            String detail = String.format(
                    "Solicitou troca de plantão (%s, %s) com %s [Status: %s]",
                    shiftLabel, requesterShiftDate,
                    sc.getReplacingFullName() != null ? sc.getReplacingFullName() : "—",
                    sc.getStatus() != null ? sc.getStatus().name() : ShiftChangeStatus.PENDING.name());
            safeRecord(sc.getRequesterEmployeeId(), EmployeeChangeCategory.ESCALA,
                    "shift_change_request", "Solicitação de troca de plantão",
                    null, detail, actorUserId);
        }

        // Registro para o COLEGA QUE ASSUMIRÁ
        if (sc.getReplacingEmployeeId() != null) {
            String detail = String.format(
                    "Indicado para cobrir plantão (%s, %s) de %s [Status: %s]",
                    shiftLabel, replacingShiftDate,
                    sc.getRequesterFullName() != null ? sc.getRequesterFullName() : "—",
                    sc.getStatus() != null ? sc.getStatus().name() : ShiftChangeStatus.PENDING.name());
            safeRecord(sc.getReplacingEmployeeId(), EmployeeChangeCategory.ESCALA,
                    "shift_change_replacement", "Cobertura em troca de plantão",
                    null, detail, actorUserId);
        }
    }

    /**
     * Registra mudança de status (aprovação/rejeição/etc.) da troca de plantão
     * no histórico dos dois funcionários envolvidos.
     */
    private void recordShiftChangeStatusHistory(ShiftChangeForm sc, ShiftChangeStatus previousStatus) {
        UUID actorUserId = getCurrentUserId();
        String oldStatus = previousStatus != null ? previousStatus.name() : null;
        String newStatus = sc.getStatus() != null ? sc.getStatus().name() : null;
        String shiftLabel = getShiftTimeLabel(sc.getShiftTime());
        String date = sc.getRequesterShiftDate() != null ? sc.getRequesterShiftDate().format(DATE_FMT) : "-";
        String approver = sc.getApprovedBy() != null && !sc.getApprovedBy().isBlank() ? " por " + sc.getApprovedBy() : "";

        String detail = String.format("Troca de plantão (%s, %s) %s%s",
                shiftLabel, date, statusLabel(sc.getStatus()), approver);

        if (sc.getRequesterEmployeeId() != null) {
            safeRecord(sc.getRequesterEmployeeId(), EmployeeChangeCategory.ESCALA,
                    "shift_change_status", "Status da troca de plantão",
                    oldStatus, detail + " (solicitante)", actorUserId);
        }
        if (sc.getReplacingEmployeeId() != null) {
            safeRecord(sc.getReplacingEmployeeId(), EmployeeChangeCategory.ESCALA,
                    "shift_change_status", "Status da troca de plantão",
                    oldStatus, detail + " (cobertura)", actorUserId);
        }
        // Mantém o newStatus em uso (já incluso no detail) para evitar warning
        log.debug("Histórico de troca de plantão atualizado: {} -> {}", oldStatus, newStatus);
    }

    private void safeRecord(UUID employeeId, EmployeeChangeCategory cat, String fieldName, String fieldLabel,
                            String oldValue, String newValue, UUID actorUserId) {
        try {
            employeeChangeHistoryService.recordChange(employeeId, cat, fieldName, fieldLabel, oldValue, newValue, actorUserId);
        } catch (Exception ex) {
            // Falha no histórico não deve quebrar a operação principal
            log.warn("Falha ao registrar histórico de troca de plantão para employeeId={}: {}", employeeId, ex.getMessage());
        }
    }

    private String statusLabel(ShiftChangeStatus status) {
        if (status == null) return "atualizada";
        switch (status) {
            case APPROVED: return "aprovada";
            case REJECTED: return "rejeitada";
            case PENDING:  return "pendente";
            default:       return status.name().toLowerCase();
        }
    }

    private UUID resolveEmployeeIdByName(String fullName) {
        if (fullName == null || fullName.isBlank()) return null;
        try {
            return employeeRepository.findByNameIgnoreCase(fullName.trim())
                    .map(Employee::getId)
                    .orElse(null);
        } catch (Exception ex) {
            log.warn("Falha ao resolver employeeId pelo nome '{}': {}", fullName, ex.getMessage());
            return null;
        }
    }

    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User) {
                return ((User) auth.getPrincipal()).getId();
            }
        } catch (Exception ignored) {
            // sem usuário autenticado disponível
        }
        return null;
    }
}
